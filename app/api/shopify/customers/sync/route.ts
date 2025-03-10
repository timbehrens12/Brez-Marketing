import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { differenceInDays } from 'date-fns';

export async function POST(request: Request) {
  try {
    const { connectionId } = await request.json();
    
    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }
    
    console.log('Starting customer sync for connection:', connectionId);
    
    // Get connection details from Supabase
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('platform_type', 'shopify')
      .single();
    
    if (connectionError || !connection) {
      console.error('Error fetching connection:', connectionError);
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }
    
    // Get the shop and access token
    const { shop, access_token } = connection;
    
    if (!shop || !access_token) {
      return NextResponse.json({ error: 'Invalid connection data' }, { status: 400 });
    }
    
    // Fetch customers from Shopify API
    let url = `https://${shop}/admin/api/2023-04/customers.json?limit=250`;
    let allCustomers: any[] = [];
    let hasNextPage = true;
    
    while (hasNextPage) {
      console.log('Fetching customers from:', url);
      
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching customers from Shopify:', errorText);
        return NextResponse.json({ error: 'Failed to fetch customers from Shopify' }, { status: response.status });
      }
      
      const data = await response.json();
      const customers = data.customers || [];
      
      allCustomers = [...allCustomers, ...customers];
      
      // Check if there's a next page
      const linkHeader = response.headers.get('Link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextLink = linkHeader.split(',').find(link => link.includes('rel="next"'));
        if (nextLink) {
          const match = nextLink.match(/<(.*?)>/);
          if (match && match[1]) {
            url = match[1];
          } else {
            hasNextPage = false;
          }
        } else {
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
      
      // Avoid rate limiting
      if (hasNextPage) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`Fetched ${allCustomers.length} customers from Shopify`);
    
    // Fetch orders to calculate additional metrics
    const { data: orders, error: ordersError } = await supabase
      .from('shopify_orders')
      .select('id, customer_id, created_at, total_price, line_items')
      .eq('connection_id', connectionId);
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      // Continue with customer sync even if orders fetch fails
    }
    
    // Process customers and calculate additional metrics
    const processedCustomers = allCustomers.map(customer => {
      // Get all orders for this customer
      const customerOrders = orders?.filter(order => order.customer_id === customer.id.toString()) || [];
      
      // Calculate lifetime value
      const lifetimeValue = customerOrders.reduce((sum, order) => {
        return sum + parseFloat(order.total_price);
      }, 0);
      
      // Calculate average order value
      const averageOrderValue = customerOrders.length > 0 
        ? lifetimeValue / customerOrders.length 
        : 0;
      
      // Calculate purchase frequency (orders per year)
      let purchaseFrequency = 0;
      if (customerOrders.length > 0 && customer.created_at) {
        const firstOrderDate = new Date(customerOrders.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0].created_at);
        
        const lastOrderDate = new Date(customerOrders.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0].created_at);
        
        const daysSinceFirstOrder = differenceInDays(new Date(), firstOrderDate);
        
        if (daysSinceFirstOrder > 0) {
          // Calculate orders per year
          purchaseFrequency = (customerOrders.length / daysSinceFirstOrder) * 365;
        }
      }
      
      // Calculate days since last order
      let daysSinceLastOrder = null;
      let lastOrderDate = null;
      if (customerOrders.length > 0) {
        const sortedOrders = customerOrders.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        lastOrderDate = new Date(sortedOrders[0].created_at);
        daysSinceLastOrder = differenceInDays(new Date(), lastOrderDate);
      }
      
      // Determine if returning customer
      const isReturningCustomer = customerOrders.length > 1;
      
      // Extract geographic region from default address
      let geographicRegion = null;
      if (customer.default_address) {
        if (customer.default_address.country) {
          geographicRegion = customer.default_address.country;
          
          // Add state/province for more granularity for US/Canada customers
          if (customer.default_address.province && 
              (customer.default_address.country === 'United States' || 
               customer.default_address.country === 'Canada')) {
            geographicRegion += ` - ${customer.default_address.province}`;
          }
        }
      }
      
      // Determine customer segment based on lifetime value and order frequency
      let customerSegment = 'New';
      if (isReturningCustomer) {
        if (lifetimeValue > 500 && purchaseFrequency > 3) {
          customerSegment = 'VIP';
        } else if (lifetimeValue > 200 || purchaseFrequency > 2) {
          customerSegment = 'Loyal';
        } else {
          customerSegment = 'Returning';
        }
      }
      
      // Prepare the customer record for Supabase
      return {
        connection_id: connectionId,
        customer_id: customer.id.toString(),
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        orders_count: customer.orders_count,
        total_spent: parseFloat(customer.total_spent || '0'),
        currency: customer.currency,
        state: customer.state,
        tags: customer.tags ? customer.tags.split(',').map((tag: string) => tag.trim()) : [],
        tax_exempt: customer.tax_exempt,
        phone: customer.phone,
        addresses: customer.addresses,
        default_address: customer.default_address,
        accepts_marketing: customer.accepts_marketing,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        last_order_id: customer.last_order_id,
        last_order_date: lastOrderDate?.toISOString() || customer.last_order_date,
        note: customer.note,
        verified_email: customer.verified_email,
        multipass_identifier: customer.multipass_identifier,
        tax_exemptions: customer.tax_exemptions,
        lifetime_value: lifetimeValue,
        average_order_value: averageOrderValue,
        purchase_frequency: purchaseFrequency,
        days_since_last_order: daysSinceLastOrder,
        is_returning_customer: isReturningCustomer,
        acquisition_source: customer.source_name || null,
        geographic_region: geographicRegion,
        customer_segment: customerSegment,
        last_synced_at: new Date().toISOString()
      };
    });
    
    // Batch insert/update customers in Supabase
    const batchSize = 100;
    for (let i = 0; i < processedCustomers.length; i += batchSize) {
      const batch = processedCustomers.slice(i, i + batchSize);
      
      // For each customer in the batch, upsert (insert or update)
      for (const customer of batch) {
        // Check if customer already exists
        const { data: existingCustomer, error: lookupError } = await supabase
          .from('shopify_customers')
          .select('id')
          .eq('connection_id', connectionId)
          .eq('customer_id', customer.customer_id)
          .single();
        
        if (lookupError && lookupError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          console.error('Error looking up customer:', lookupError);
          continue;
        }
        
        if (existingCustomer) {
          // Update existing customer
          const { error: updateError } = await supabase
            .from('shopify_customers')
            .update(customer)
            .eq('id', existingCustomer.id);
          
          if (updateError) {
            console.error('Error updating customer:', updateError);
          }
        } else {
          // Insert new customer
          const { error: insertError } = await supabase
            .from('shopify_customers')
            .insert(customer);
          
          if (insertError) {
            console.error('Error inserting customer:', insertError);
          }
        }
      }
      
      console.log(`Processed batch ${i/batchSize + 1} of ${Math.ceil(processedCustomers.length/batchSize)}`);
    }
    
    console.log('Customer sync completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Customer sync completed successfully',
      count: processedCustomers.length
    });
    
  } catch (error) {
    console.error('Error in customer sync:', error);
    return NextResponse.json({ 
      error: 'Failed to sync customers', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 