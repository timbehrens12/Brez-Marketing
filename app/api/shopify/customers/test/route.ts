import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    console.log('Testing shopify_customers table access');
    
    // Check if the table exists
    try {
      const { count, error: tableCheckError } = await supabase
        .from('shopify_customers')
        .select('*', { count: 'exact', head: true });
      
      if (tableCheckError) {
        console.error('Error checking shopify_customers table:', tableCheckError);
        return NextResponse.json({ 
          error: 'Error checking shopify_customers table', 
          details: tableCheckError 
        }, { status: 500 });
      }
      
      console.log('shopify_customers table exists, current count:', count);
    } catch (tableError) {
      console.error('Error checking table existence:', tableError);
      return NextResponse.json({ 
        error: 'Error checking table existence', 
        details: tableError instanceof Error ? tableError.message : String(tableError) 
      }, { status: 500 });
    }
    
    // Get a valid connection_id from the platform_connections table
    let connectionId = '00000000-0000-0000-0000-000000000000'; // Default placeholder
    
    try {
      const { data: connections, error: connectionsError } = await supabase
        .from('platform_connections')
        .select('id')
        .eq('platform_type', 'shopify')
        .limit(1);
      
      if (connectionsError) {
        console.error('Error fetching connections:', connectionsError);
      } else if (connections && connections.length > 0) {
        connectionId = connections[0].id;
        console.log('Using existing connection ID:', connectionId);
      }
    } catch (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
    }
    
    // Try to insert a test record
    const testCustomer = {
      connection_id: connectionId,
      customer_id: 'test-customer-' + Date.now(),
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'Customer',
      orders_count: 0,
      total_spent: 0,
      lifetime_value: 0,
      average_order_value: 0,
      purchase_frequency: 0,
      is_returning_customer: false,
      customer_segment: 'Test',
      last_synced_at: new Date().toISOString()
    };
    
    console.log('Attempting to insert test customer:', testCustomer);
    
    // First, check if we can access the table with RLS bypassed
    const { data: rlsCheckData, error: rlsCheckError } = await supabase.rpc('check_rls_enabled', {
      table_name: 'shopify_customers'
    });
    
    if (rlsCheckError) {
      console.log('RLS check failed (function may not exist):', rlsCheckError);
    } else {
      console.log('RLS check result:', rlsCheckData);
    }
    
    // Try inserting with regular client first
    const { data: insertedCustomer, error: insertError } = await supabase
      .from('shopify_customers')
      .insert(testCustomer)
      .select()
      .single();
    
    if (insertError) {
      console.error('Error inserting test customer:', insertError);
      
      // If there's an RLS error, try with service role client if available
      if (insertError.message && insertError.message.includes('violates row-level security policy')) {
        console.log('RLS policy violation detected. You need to add RLS policies to the shopify_customers table.');
        
        return NextResponse.json({ 
          error: 'Error inserting test customer: RLS policy violation', 
          details: insertError,
          solution: `
            Run the following SQL in your Supabase SQL Editor:
            
            -- Enable Row Level Security on the shopify_customers table
            ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;
            
            -- Create a policy to allow all operations for authenticated users
            CREATE POLICY "Allow all operations for authenticated users"
              ON shopify_customers
              USING (auth.role() = 'authenticated');
            
            -- Create a policy for all operations (as a fallback)
            CREATE POLICY "Allow all operations"
              ON shopify_customers
              FOR ALL
              USING (true);
            
            -- Grant all privileges on the table to authenticated users
            GRANT ALL ON shopify_customers TO authenticated;
            GRANT ALL ON shopify_customers TO anon;
            GRANT ALL ON shopify_customers TO service_role;
          `
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Error inserting test customer', 
        details: insertError 
      }, { status: 500 });
    }
    
    console.log('Successfully inserted test customer:', insertedCustomer);
    
    // Try to retrieve the test record
    const { data: retrievedCustomer, error: retrieveError } = await supabase
      .from('shopify_customers')
      .select('*')
      .eq('customer_id', testCustomer.customer_id)
      .single();
    
    if (retrieveError) {
      console.error('Error retrieving test customer:', retrieveError);
      return NextResponse.json({ 
        error: 'Error retrieving test customer', 
        details: retrieveError 
      }, { status: 500 });
    }
    
    console.log('Successfully retrieved test customer:', retrievedCustomer);
    
    // Try to delete the test record
    const { error: deleteError } = await supabase
      .from('shopify_customers')
      .delete()
      .eq('customer_id', testCustomer.customer_id);
    
    if (deleteError) {
      console.error('Error deleting test customer:', deleteError);
      return NextResponse.json({ 
        error: 'Error deleting test customer', 
        details: deleteError 
      }, { status: 500 });
    }
    
    console.log('Successfully deleted test customer');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully tested shopify_customers table access',
      insertedCustomer,
      retrievedCustomer
    });
    
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to test shopify_customers table access', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 