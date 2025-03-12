import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let connectionId: string | null = null;
  
  try {
    // Read the request body only once and store it
    const body = await request.json();
    connectionId = body.connectionId;
    
    console.log('Shopify inventory sync route hit:', { connectionId });
    
    if (!connectionId) {
      console.error('Missing connectionId');
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
    }

    // Get connection details
    console.log('Fetching connection details');
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connectionError || !connection) {
      console.error('Error fetching connection:', connectionError);
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    console.log('Found connection:', {
      id: connection.id,
      platform_type: connection.platform_type,
      status: connection.status,
      shop: connection.shop,
      brand_id: connection.brand_id
    });

    // Validate connection data
    if (!connection.access_token || !connection.shop) {
      console.error('Invalid connection:', {
        has_token: !!connection.access_token,
        has_shop: !!connection.shop
      });
      return NextResponse.json({ 
        error: 'Invalid connection: missing access token or shop' 
      }, { status: 400 });
    }

    // Update sync status to in_progress
    console.log('Updating sync status to in_progress');
    await supabase
      .from('platform_connections')
      .update({ sync_status: 'in_progress' })
      .eq('id', connectionId);

    // Start sync process
    console.log('Starting inventory sync process');
    
    // Fetch products from Shopify
    const products = await fetchShopifyProducts(connection);
    console.log(`Fetched ${products.length} products from Shopify`);
    
    // Process products and store inventory data
    const inventoryData = await processInventoryData(products, connection, connectionId);
    console.log(`Processed inventory data for ${inventoryData.length} products`);
    
    // Store inventory data in database
    await storeInventoryData(inventoryData, connection.brand_id, connectionId);
    
    // Update sync status to completed
    console.log('Inventory sync completed, updating status');
    await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    console.log('Inventory sync process completed successfully');
    return NextResponse.json({ 
      success: true, 
      totalProducts: products.length
    });

  } catch (error) {
    console.error('Inventory sync error:', error);
    
    // Update sync status to failed
    if (connectionId) {
      try {
        console.log('Updating sync status to failed');
        await supabase
          .from('platform_connections')
          .update({ sync_status: 'failed' })
          .eq('id', connectionId);
      } catch (updateError) {
        console.error('Error updating sync status:', updateError);
      }
    }

    return NextResponse.json({ 
      error: 'Inventory sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to fetch products from Shopify
async function fetchShopifyProducts(connection: any) {
  let allProducts: any[] = [];
  let nextCursor = null;

  try {
    do {
      // Build the URL with cursor-based pagination
      let url = `https://${connection.shop}/admin/api/2023-04/products.json?limit=250&fields=id,title,variants`;
      if (nextCursor) {
        url += `&page_info=${nextCursor}`;
      }

      console.log('Fetching products from Shopify:', { url: url.substring(0, 100) + '...' });
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': connection.access_token,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shopify API error response:', errorText);
        throw new Error(`Shopify API error: ${response.statusText} - ${errorText}`);
      }

      // Get the next page cursor from the Link header
      const linkHeader = response.headers.get('Link');
      nextCursor = null;
      if (linkHeader) {
        const match = linkHeader.match(/<[^>]*page_info=([^>&"]*)[^>]*>; rel="next"/);
        if (match) {
          nextCursor = match[1];
        }
      }

      const data = await response.json();
      const products = data.products || [];
      allProducts = [...allProducts, ...products];

      // Respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } while (nextCursor);

    return allProducts;
  } catch (error) {
    console.error('Error fetching products from Shopify:', error);
    return [];
  }
}

// Helper function to process inventory data
async function processInventoryData(products: any[], connection: any, connectionId: string) {
  const inventoryItems: any[] = [];
  
  try {
    for (const product of products) {
      console.log(`Processing product: ${product.id} - ${product.title}`);
      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          console.log(`  Variant: ${variant.id} - ${variant.title}, Inventory: ${variant.inventory_quantity}`);
          inventoryItems.push({
            brand_id: connection.brand_id,
            connection_id: connectionId,
            product_id: product.id.toString(),
            variant_id: variant.id.toString(),
            inventory_item_id: variant.inventory_item_id?.toString() || '',
            sku: variant.sku || '',
            product_title: product.title,
            variant_title: variant.title,
            inventory_quantity: variant.inventory_quantity || 0,
            last_updated: new Date().toISOString()
          });
        }
      } else {
        console.log(`  No variants found for product: ${product.id}`);
      }
    }
    
    return inventoryItems;
  } catch (error) {
    console.error('Error processing inventory data:', error);
    return [];
  }
}

// Helper function to store inventory data in database
async function storeInventoryData(inventoryItems: any[], brandId: string, connectionId: string) {
  try {
    if (inventoryItems.length === 0) {
      console.log('No inventory items to insert');
      return;
    }
    
    console.log(`Inserting ${inventoryItems.length} inventory items into database`);
    
    // First, let's try to clear existing inventory for this connection to avoid conflicts
    const { error: deleteError } = await supabase
      .from('shopify_inventory')
      .delete()
      .eq('connection_id', connectionId.toString());
    
    if (deleteError) {
      console.error('Error deleting existing inventory items:', deleteError);
      // Continue anyway, as this is not a critical error
    }
    
    // Ensure all inventory items have string connection_id and brand_id
    const processedItems = inventoryItems.map(item => ({
      ...item,
      connection_id: item.connection_id.toString(),
      brand_id: item.brand_id.toString()
    }));
    
    // Now insert the new inventory items
    const { error: insertError } = await supabase
      .from('shopify_inventory')
      .insert(processedItems);

    if (insertError) {
      console.error('Error inserting inventory items:', insertError);
      throw insertError;
    } else {
      console.log(`Successfully inserted ${inventoryItems.length} inventory items`);
    }
  } catch (error) {
    console.error('Error storing inventory data:', error);
    throw error;
  }
} 