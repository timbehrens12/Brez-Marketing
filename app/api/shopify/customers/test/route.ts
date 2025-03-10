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
    
    // Try to insert a test record
    const testCustomer = {
      connection_id: '00000000-0000-0000-0000-000000000000', // This is a placeholder UUID
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
    
    const { data: insertedCustomer, error: insertError } = await supabase
      .from('shopify_customers')
      .insert(testCustomer)
      .select()
      .single();
    
    if (insertError) {
      console.error('Error inserting test customer:', insertError);
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