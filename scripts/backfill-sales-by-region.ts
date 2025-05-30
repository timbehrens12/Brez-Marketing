import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function backfillSalesByRegion() {
  console.log('Starting backfill of sales by region data...')
  
  try {
    // Get all platform connections
    console.log('Fetching Shopify connections...')
    const { data: connections, error: connectionsError } = await supabase
      .from('platform_connections')
      .select('id, brand_id, user_id')
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
    
    if (connectionsError) {
      throw new Error(`Error fetching connections: ${connectionsError.message}`)
    }
    
    console.log(`Found ${connections?.length || 0} active Shopify connections`)
    
    if (!connections || connections.length === 0) {
      console.log('No active Shopify connections found. Exiting.')
      return
    }
    
    // Process each connection
    for (const connection of connections) {
      console.log(`Processing connection ${connection.id} for brand ${connection.brand_id}...`)
      
      // Check if shopify_orders table exists and has data
      const { count: ordersCount, error: ordersCountError } = await supabase
        .from('shopify_orders')
        .select('*', { count: 'exact', head: true })
        .eq('connection_id', connection.id)
      
      if (ordersCountError) {
        console.error(`Error checking orders for connection ${connection.id}: ${ordersCountError.message}`)
        continue
      }
      
      console.log(`Found ${ordersCount || 0} orders for connection ${connection.id}`)
      
      if (!ordersCount || ordersCount === 0) {
        console.log(`No orders found for connection ${connection.id}. Skipping.`)
        continue
      }
      
      // Fetch orders in batches to avoid memory issues
      const batchSize = 100
      let processedOrders = 0
      let hasMoreOrders = true
      let lastId = null
      
      while (hasMoreOrders) {
        // Build query for batch of orders
        let query = supabase
          .from('shopify_orders')
          .select('*')
          .eq('connection_id', connection.id)
          .order('id', { ascending: true })
          .limit(batchSize)
        
        if (lastId) {
          query = query.gt('id', lastId)
        }
        
        const { data: orders, error: ordersError } = await query
        
        if (ordersError) {
          console.error(`Error fetching orders batch: ${ordersError.message}`)
          break
        }
        
        if (!orders || orders.length === 0) {
          console.log('No more orders to process.')
          hasMoreOrders = false
          break
        }
        
        console.log(`Processing batch of ${orders.length} orders...`)
        
        // Extract regional data from orders
        const regionData = []
        
        for (const order of orders) {
          // Get the last ID for pagination
          lastId = order.id
          
          // Extract shipping address from customer data
          const customer = order.customer || {}
          const shippingAddress = customer.default_address || {}
          
          // Skip if no city data
          if (!shippingAddress.city) {
            continue
          }
          
          regionData.push({
            connection_id: connection.id.toString(),
            brand_id: connection.brand_id.toString(),
            user_id: connection.user_id.toString(),
            order_id: order.order_id,
            created_at: order.created_at,
            city: shippingAddress.city,
            province: shippingAddress.province,
            province_code: shippingAddress.province_code,
            country: shippingAddress.country,
            country_code: shippingAddress.country_code,
            total_price: order.total_price,
            order_count: 1
          })
        }
        
        // Insert regional data in batches
        if (regionData.length > 0) {
          console.log(`Inserting ${regionData.length} regional data records...`)
          
          const { error: insertError } = await supabase
            .from('shopify_sales_by_region')
            .upsert(regionData, { onConflict: 'connection_id,order_id' })
          
          if (insertError) {
            console.error(`Error inserting regional data: ${insertError.message}`)
          } else {
            console.log(`Successfully inserted ${regionData.length} regional data records`)
          }
        } else {
          console.log('No regional data found in this batch of orders')
        }
        
        processedOrders += orders.length
        console.log(`Processed ${processedOrders}/${ordersCount} orders`)
        
        // Check if we've processed all orders
        if (orders.length < batchSize) {
          hasMoreOrders = false
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      console.log(`Completed processing for connection ${connection.id}`)
    }
    
    console.log('Backfill of sales by region data completed successfully')
  } catch (error) {
    console.error('Error during backfill:', error)
  }
}

// Run the backfill function
backfillSalesByRegion()
  .then(() => {
    console.log('Script completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('Script failed:', error)
    process.exit(1)
  }) 