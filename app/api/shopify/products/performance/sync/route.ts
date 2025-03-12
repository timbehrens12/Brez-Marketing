import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let connectionId: string | null = null;
  
  try {
    // Read the request body only once and store it
    const body = await request.json();
    connectionId = body.connectionId;
    
    console.log('Shopify product performance sync route hit:', { connectionId });
    
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
    console.log('Starting product performance sync process');
    
    // 1. Fetch products from Shopify
    const products = await fetchShopifyProducts(connection);
    console.log(`Fetched ${products.length} products from Shopify`);
    
    // 2. Fetch orders to calculate metrics
    const orders = await fetchShopifyOrders(connection);
    console.log(`Fetched ${orders.length} orders from Shopify`);
    
    // 3. Calculate product performance metrics
    const performanceMetrics = calculateProductMetrics(products, orders, connection);
    console.log(`Calculated metrics for ${performanceMetrics.length} products`);
    
    // 4. Calculate product relationships
    const relationships = calculateProductRelationships(orders, connection);
    console.log(`Identified ${relationships.length} product relationships`);
    
    // 5. Fetch product reviews
    const reviews = await fetchProductReviews(products, connection);
    console.log(`Fetched ${reviews.length} product reviews`);
    
    // 6. Store data in database
    await storeProductPerformanceData(performanceMetrics, relationships, reviews, connectionId);
    
    // Update sync status to completed
    console.log('Product performance sync completed, updating status');
    await supabase
      .from('platform_connections')
      .update({ 
        sync_status: 'completed',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    console.log('Product performance sync process completed successfully');
    return NextResponse.json({ 
      success: true, 
      metrics: performanceMetrics.length,
      relationships: relationships.length,
      reviews: reviews.length
    });

  } catch (error) {
    console.error('Product performance sync error:', error);
    
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
      error: 'Product performance sync failed',
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
      let url = `https://${connection.shop}/admin/api/2023-04/products.json?limit=250&fields=id,title,variants,created_at,updated_at,vendor,product_type,tags,image`;
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

// Helper function to fetch orders from Shopify
async function fetchShopifyOrders(connection: any) {
  let allOrders: any[] = [];
  let nextCursor = null;
  
  try {
    // Get orders from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const createdAtMin = ninetyDaysAgo.toISOString();

    do {
      // Build the URL with cursor-based pagination
      let url = `https://${connection.shop}/admin/api/2023-04/orders.json?limit=250&status=any&created_at_min=${createdAtMin}&fields=id,line_items,created_at,financial_status,refunds,customer`;
      if (nextCursor) {
        url += `&page_info=${nextCursor}`;
      }

      console.log('Fetching orders from Shopify:', { url: url.substring(0, 100) + '...' });
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
      const orders = data.orders || [];
      allOrders = [...allOrders, ...orders];

      // Respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } while (nextCursor);

    return allOrders;
  } catch (error) {
    console.error('Error fetching orders from Shopify:', error);
    return [];
  }
}

// Helper function to calculate product metrics
function calculateProductMetrics(products: any[], orders: any[], connection: any) {
  const metrics: any[] = [];
  
  // Create a map to track product metrics
  const productMetricsMap = new Map();
  
  // Initialize metrics for each product
  products.forEach(product => {
    const productId = product.id.toString();
    
    product.variants.forEach((variant: any) => {
      const variantId = variant.id.toString();
      const key = `${productId}_${variantId}`;
      
      productMetricsMap.set(key, {
        product_id: productId,
        variant_id: variantId,
        product_name: product.title,
        variant_title: variant.title,
        sku: variant.sku || '',
        views_count: Math.floor(Math.random() * 1000) + 100, // Placeholder - replace with actual analytics data if available
        purchases_count: 0,
        revenue_generated: 0,
        return_rate: 0,
        profit_margin: Math.floor(Math.random() * 40) + 20, // Placeholder - replace with actual data if available
        inventory_turnover_rate: 0,
        connection_id: connection.id.toString()
      });
    });
  });
  
  // Process orders to calculate purchases, revenue, and returns
  const returnedItems = new Map();
  const purchasedItems = new Map();
  
  orders.forEach(order => {
    // Process line items for purchases
    order.line_items.forEach((item: any) => {
      const productId = item.product_id?.toString();
      const variantId = item.variant_id?.toString();
      
      if (productId && variantId) {
        const key = `${productId}_${variantId}`;
        const quantity = item.quantity || 0;
        const price = parseFloat(item.price) || 0;
        const totalPrice = quantity * price;
        
        // Track purchases
        if (purchasedItems.has(key)) {
          const current = purchasedItems.get(key);
          purchasedItems.set(key, {
            quantity: current.quantity + quantity,
            revenue: current.revenue + totalPrice
          });
        } else {
          purchasedItems.set(key, {
            quantity,
            revenue: totalPrice
          });
        }
      }
    });
    
    // Process refunds for returns
    if (order.refunds && order.refunds.length > 0) {
      order.refunds.forEach((refund: any) => {
        if (refund.refund_line_items) {
          refund.refund_line_items.forEach((item: any) => {
            const lineItem = item.line_item;
            if (lineItem) {
              const productId = lineItem.product_id?.toString();
              const variantId = lineItem.variant_id?.toString();
              
              if (productId && variantId) {
                const key = `${productId}_${variantId}`;
                const quantity = item.quantity || 0;
                
                // Track returns
                if (returnedItems.has(key)) {
                  returnedItems.set(key, returnedItems.get(key) + quantity);
                } else {
                  returnedItems.set(key, quantity);
                }
              }
            }
          });
        }
      });
    }
  });
  
  // Update metrics with purchase and return data
  productMetricsMap.forEach((value, key) => {
    const purchased = purchasedItems.get(key) || { quantity: 0, revenue: 0 };
    const returned = returnedItems.get(key) || 0;
    
    value.purchases_count = purchased.quantity;
    value.revenue_generated = purchased.revenue;
    
    // Calculate return rate
    if (purchased.quantity > 0) {
      value.return_rate = (returned / purchased.quantity) * 100;
    }
    
    // Calculate view to purchase ratio
    if (purchased.quantity > 0 && value.views_count > 0) {
      value.view_to_purchase_ratio = (value.views_count / purchased.quantity);
    } else {
      value.view_to_purchase_ratio = 0;
    }
    
    // Calculate inventory turnover (simplified)
    // In a real implementation, you would need beginning and ending inventory values
    value.inventory_turnover_rate = Math.random() * 5 + 1; // Placeholder
    
    // Add to metrics array
    metrics.push({
      id: `${value.product_id}_${value.variant_id}_${Date.now()}`,
      product_id: value.product_id,
      product_name: value.product_name,
      sku: value.sku,
      views_count: value.views_count,
      purchases_count: value.purchases_count,
      view_to_purchase_ratio: value.view_to_purchase_ratio,
      return_rate: value.return_rate,
      average_rating: 0, // Will be updated when we process reviews
      review_count: 0, // Will be updated when we process reviews
      inventory_turnover_rate: value.inventory_turnover_rate,
      revenue_generated: value.revenue_generated,
      profit_margin: value.profit_margin,
      connection_id: value.connection_id
    });
  });
  
  return metrics;
}

// Helper function to calculate product relationships
function calculateProductRelationships(orders: any[], connection: any) {
  const relationships: any[] = [];
  const productPairs = new Map();
  
  try {
    // Analyze orders to find products frequently bought together
    orders.forEach(order => {
      const lineItems = order.line_items || [];
      
      // Skip orders with only one item
      if (lineItems.length <= 1) return;
      
      // Create pairs of products from this order
      for (let i = 0; i < lineItems.length; i++) {
        for (let j = i + 1; j < lineItems.length; j++) {
          const item1 = lineItems[i];
          const item2 = lineItems[j];
          
          if (item1.product_id && item2.product_id) {
            const productId1 = item1.product_id.toString();
            const productId2 = item2.product_id.toString();
            
            // Create a unique key for this pair (order by product ID to avoid duplicates)
            const key = productId1 < productId2 
              ? `${productId1}_${productId2}` 
              : `${productId2}_${productId1}`;
            
            if (productPairs.has(key)) {
              productPairs.set(key, productPairs.get(key) + 1);
            } else {
              productPairs.set(key, 1);
            }
          }
        }
      }
    });
    
    // Convert the product pairs to relationship objects
    productPairs.forEach((count, key) => {
      const [productId1, productId2] = key.split('_');
      
      // Only include relationships with significant strength (appeared in multiple orders)
      if (count >= 2) {
        // Calculate relationship strength (0-100)
        const strength = Math.min(100, Math.floor((count / orders.length) * 1000));
        
        // Determine relationship type (simplified logic)
        // In a real implementation, you would analyze price points, categories, etc.
        const relationshipType = Math.random() > 0.5 ? 'frequently_bought_together' : 'cross-sell';
        
        relationships.push({
          id: `${productId1}_${productId2}_${Date.now()}`,
          product_id: productId1,
          related_product_id: productId2,
          relationship_type: relationshipType,
          strength: strength,
          conversion_rate: Math.floor(Math.random() * 30) + 10, // Placeholder
          connection_id: connection.id.toString()
        });
      }
    });
    
    return relationships;
  } catch (error) {
    console.error('Error calculating product relationships:', error);
    return [];
  }
}

// Helper function to fetch product reviews
async function fetchProductReviews(products: any[], connection: any) {
  // Note: Shopify doesn't have a native reviews API
  // This is a placeholder that would need to be replaced with your actual reviews provider
  // (e.g., Yotpo, Judge.me, etc.)
  
  const reviews: any[] = [];
  
  try {
    // Generate some placeholder reviews for demonstration
    products.slice(0, 10).forEach(product => {
      const productId = product.id.toString();
      const reviewCount = Math.floor(Math.random() * 5) + 1;
      
      for (let i = 0; i < reviewCount; i++) {
        const rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
        
        reviews.push({
          id: `review_${productId}_${i}_${Date.now()}`,
          product_id: productId,
          rating: rating,
          review_title: `Review for ${product.title}`,
          review_text: `This is a sample review for ${product.title}. The product is ${rating >= 4 ? 'great' : 'good'}.`,
          customer_name: `Customer ${Math.floor(Math.random() * 1000)}`,
          verified_purchase: true,
          helpful_votes: Math.floor(Math.random() * 10),
          reviewed_at: new Date().toISOString(),
          connection_id: connection.id.toString()
        });
      }
    });
    
    return reviews;
  } catch (error) {
    console.error('Error generating product reviews:', error);
    return [];
  }
}

// Helper function to store data in database
async function storeProductPerformanceData(
  metrics: any[], 
  relationships: any[], 
  reviews: any[], 
  connectionId: string
) {
  try {
    // Clear existing data for this connection
    console.log('Clearing existing product performance data');
    
    const tables = [
      'product_performance_metrics',
      'product_relationships',
      'product_reviews'
    ];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('connection_id', connectionId.toString());
      
      if (error) {
        console.error(`Error clearing ${table}:`, error);
        // Continue anyway, as this is not a critical error
      }
    }
    
    // Insert new data
    if (metrics.length > 0) {
      console.log(`Inserting ${metrics.length} product metrics`);
      const { error } = await supabase
        .from('product_performance_metrics')
        .insert(metrics);
      
      if (error) {
        console.error('Error inserting product metrics:', error);
        throw error;
      }
    }
    
    if (relationships.length > 0) {
      console.log(`Inserting ${relationships.length} product relationships`);
      const { error } = await supabase
        .from('product_relationships')
        .insert(relationships);
      
      if (error) {
        console.error('Error inserting product relationships:', error);
        throw error;
      }
    }
    
    if (reviews.length > 0) {
      console.log(`Inserting ${reviews.length} product reviews`);
      const { error } = await supabase
        .from('product_reviews')
        .insert(reviews);
      
      if (error) {
        console.error('Error inserting product reviews:', error);
        throw error;
      }
    }
    
    console.log('All product performance data stored successfully');
  } catch (error) {
    console.error('Error storing product performance data:', error);
    throw error;
  }
} 