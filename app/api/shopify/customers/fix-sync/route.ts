import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { connectionId, shopUrl } = await request.json();
    
    if (!connectionId) {
      console.error('Missing connectionId in request');
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }
    
    console.log('Starting customer sync fix for connection:', connectionId);
    
    // Step 1: Check if the connection exists and has valid data
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform_type', 'shopify')
      .single();
    
    if (connectionError || !connection) {
      console.error('Error fetching connection:', connectionError);
      return NextResponse.json({ 
        error: 'Connection not found', 
        details: connectionError?.message || 'Could not find a Shopify connection with the provided ID'
      }, { status: 404 });
    }
    
    // Check if the connection has a shop URL
    let needsUpdate = false;
    const updates: any = {};
    
    if (!connection.shop && shopUrl) {
      updates.shop = shopUrl;
      updates.metadata = {
        ...connection.metadata,
        shop_url: `https://${shopUrl}`
      };
      needsUpdate = true;
    }
    
    // If the connection status is not active, update it
    if (connection.status !== 'active') {
      updates.status = 'active';
      needsUpdate = true;
    }
    
    // Update the connection if needed
    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('platform_connections')
        .update(updates)
        .eq('id', connectionId);
      
      if (updateError) {
        console.error('Error updating connection:', updateError);
        return NextResponse.json({ 
          error: 'Failed to update connection', 
          details: updateError.message 
        }, { status: 500 });
      }
      
      console.log('Updated connection with shop URL and active status');
    }
    
    // Step 2: Check if the shopify_customers table exists
    const { data: tableExists, error: tableCheckError } = await supabase
      .rpc('check_table_exists', { table_name: 'shopify_customers' });
    
    if (tableCheckError) {
      console.error('Error checking if table exists:', tableCheckError);
      return NextResponse.json({ 
        error: 'Failed to check if table exists', 
        details: tableCheckError.message 
      }, { status: 500 });
    }
    
    // If the table doesn't exist, create it
    if (!tableExists) {
      console.log('shopify_customers table does not exist, creating it...');
      
      // Create the table using SQL
      const { error: createTableError } = await supabase.rpc('create_shopify_customers_table');
      
      if (createTableError) {
        console.error('Error creating shopify_customers table:', createTableError);
        return NextResponse.json({ 
          error: 'Failed to create shopify_customers table', 
          details: createTableError.message 
        }, { status: 500 });
      }
      
      console.log('Created shopify_customers table successfully');
    }
    
    // Step 3: Trigger a customer sync
    try {
      const syncResponse = await fetch(new URL('/api/shopify/customers/sync', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId })
      });
      
      if (!syncResponse.ok) {
        const errorText = await syncResponse.text();
        console.error('Failed to trigger customer sync:', errorText);
        return NextResponse.json({ 
          error: 'Failed to trigger customer sync', 
          details: errorText 
        }, { status: 500 });
      }
      
      const syncData = await syncResponse.json();
      console.log('Customer sync triggered successfully');
      
      return NextResponse.json({ 
        message: 'Customer sync fix completed successfully',
        connection: {
          id: connection.id,
          shop: connection.shop || updates.shop,
          status: connection.status || updates.status
        },
        syncResult: syncData
      });
    } catch (syncError) {
      console.error('Error triggering customer sync:', syncError);
      return NextResponse.json({ 
        error: 'Failed to trigger customer sync', 
        details: syncError instanceof Error ? syncError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in customer sync fix:', error);
    return NextResponse.json({ 
      error: 'Failed to fix customer sync', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 