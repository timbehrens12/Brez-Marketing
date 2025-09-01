import { createClient } from '@/lib/supabase/server'

export class ShopifyAnalyticsService {
  
  // Process customer segmentation data from existing orders
  static async processCustomerSegmentation(brandId: string, connectionId: string) {
    const supabase = createClient()
    
    try {
      console.log(`[Analytics] Processing customer segmentation for brand ${brandId}`)
      
      // Get all orders with customer and shipping address data
      const { data: orders, error: ordersError } = await supabase
        .from('shopify_orders')
        .select(`
          id, customer_id, customer_email, customer_first_name, customer_last_name,
          total_price, created_at, line_items
        `)
        .eq('brand_id', brandId)
        .not('customer_id', 'is', null)

      if (ordersError || !orders) {
        console.error('[Analytics] Error fetching orders:', ordersError)
        return
      }

      // Group by customer and calculate metrics
      const customerStats = orders.reduce((acc, order) => {
        const customerId = order.customer_id
        if (!customerId) return acc

        if (!acc[customerId]) {
          acc[customerId] = {
            customer_id: customerId,
            customer_email: order.customer_email,
            customer_name: `${order.customer_first_name || ''} ${order.customer_last_name || ''}`.trim(),
            total_orders: 0,
            total_spent: 0,
            first_order_date: null,
            last_order_date: null,
            orders: []
          }
        }

        acc[customerId].total_orders += 1
        acc[customerId].total_spent += parseFloat(order.total_price || '0')
        acc[customerId].orders.push(order)

        const orderDate = new Date(order.created_at)
        if (!acc[customerId].first_order_date || orderDate < new Date(acc[customerId].first_order_date)) {
          acc[customerId].first_order_date = order.created_at
        }
        if (!acc[customerId].last_order_date || orderDate > new Date(acc[customerId].last_order_date)) {
          acc[customerId].last_order_date = order.created_at
        }

        return acc
      }, {} as Record<string, any>)

      // Calculate CLV and insert/update records
      for (const [customerId, stats] of Object.entries(customerStats)) {
        const avgOrderValue = stats.total_orders > 0 ? stats.total_spent / stats.total_orders : 0
        const daysSinceFirst = stats.first_order_date ? 
          Math.floor((Date.now() - new Date(stats.first_order_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
        const daysSinceLast = stats.last_order_date ?
          Math.floor((Date.now() - new Date(stats.last_order_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
        
        const orderFrequency = daysSinceFirst > 0 ? stats.total_orders / (daysSinceFirst / 30) : 0 // orders per month
        const predictedClv = avgOrderValue * orderFrequency * 24 // 2 year prediction
        
        // Calculate churn risk (higher if hasn't ordered recently)
        let churnRisk = 0
        if (daysSinceLast > 90) churnRisk = 80
        else if (daysSinceLast > 60) churnRisk = 60
        else if (daysSinceLast > 30) churnRisk = 40
        else churnRisk = 20

        // Determine engagement level
        let engagementLevel = 'low'
        if (orderFrequency >= 2) engagementLevel = 'high'
        else if (orderFrequency >= 0.5) engagementLevel = 'medium'

        // Determine customer status
        let customerStatus = 'active'
        if (daysSinceLast > 180) customerStatus = 'churned'
        else if (daysSinceLast > 90) customerStatus = 'at_risk'
        else if (stats.total_orders === 1 && daysSinceLast < 30) customerStatus = 'new'

        // Upsert CLV analytics record
        await supabase
          .from('shopify_clv_analytics')
          .upsert({
            brand_id: brandId,
            user_id: 'system', // System-generated
            connection_id: connectionId,
            customer_id: parseInt(customerId),
            customer_email: stats.customer_email,
            customer_name: stats.customer_name,
            current_clv: stats.total_spent,
            predicted_clv: predictedClv,
            total_orders: stats.total_orders,
            total_spent: stats.total_spent,
            average_order_value: avgOrderValue,
            purchase_frequency: orderFrequency,
            days_since_first_order: daysSinceFirst,
            days_since_last_order: daysSinceLast,
            is_repeat_customer: stats.total_orders > 1,
            churn_risk_score: churnRisk,
            engagement_level: engagementLevel,
            first_order_date: stats.first_order_date,
            last_order_date: stats.last_order_date,
            calculated_at: new Date().toISOString()
          }, { 
            onConflict: 'customer_id,brand_id',
            ignoreDuplicates: false 
          })
      }

      console.log(`[Analytics] Processed CLV data for ${Object.keys(customerStats).length} customers`)

    } catch (error) {
      console.error('[Analytics] Error processing customer segmentation:', error)
    }
  }

  // Process repeat customer analysis
  static async processRepeatCustomers(brandId: string, connectionId: string) {
    const supabase = createClient()
    
    try {
      console.log(`[Analytics] Processing repeat customers for brand ${brandId}`)
      
      // Get customer data with order history
      const { data: customers, error } = await supabase
        .from('shopify_orders')
        .select('customer_id, customer_email, customer_first_name, customer_last_name, total_price, created_at')
        .eq('brand_id', brandId)
        .not('customer_id', 'is', null)
        .order('created_at', { ascending: true })

      if (error || !customers) {
        console.error('[Analytics] Error fetching customer orders:', error)
        return
      }

      // Group by customer
      const customerOrders = customers.reduce((acc, order) => {
        const customerId = order.customer_id
        if (!acc[customerId]) {
          acc[customerId] = []
        }
        acc[customerId].push(order)
        return acc
      }, {} as Record<string, any[]>)

      // Process each customer
      for (const [customerId, orders] of Object.entries(customerOrders)) {
        if (orders.length < 2) continue // Only process customers with multiple orders

        const sortedOrders = orders.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        const firstOrder = sortedOrders[0]
        const lastOrder = sortedOrders[sortedOrders.length - 1]
        
        // Calculate time between orders
        const daysBetweenOrders: number[] = []
        for (let i = 1; i < sortedOrders.length; i++) {
          const prevDate = new Date(sortedOrders[i - 1].created_at)
          const currentDate = new Date(sortedOrders[i].created_at)
          const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
          daysBetweenOrders.push(daysDiff)
        }

        const avgDaysBetween = daysBetweenOrders.length > 0 ? 
          daysBetweenOrders.reduce((sum, days) => sum + days, 0) / daysBetweenOrders.length : 0
        const minDaysBetween = Math.min(...daysBetweenOrders)
        const maxDaysBetween = Math.max(...daysBetweenOrders)

        const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0)
        const avgOrderValue = totalSpent / orders.length
        const repeatOrders = orders.length - 1 // Exclude first order
        const repeatRate = (repeatOrders / orders.length) * 100
        const repeatOrderValue = orders.slice(1).reduce((sum, order) => sum + parseFloat(order.total_price || '0'), 0)

        // Predict next purchase (simple prediction based on average)
        const nextPurchaseDate = new Date(lastOrder.created_at)
        nextPurchaseDate.setDate(nextPurchaseDate.getDate() + Math.round(avgDaysBetween))

        // Calculate churn probability based on time since last order
        const daysSinceLastOrder = Math.floor((Date.now() - new Date(lastOrder.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const churnProbability = Math.min(100, (daysSinceLastOrder / avgDaysBetween) * 50)

        // Upsert repeat customer record
        await supabase
          .from('shopify_repeat_customers')
          .upsert({
            brand_id: brandId,
            user_id: 'system',
            connection_id: connectionId,
            customer_id: parseInt(customerId),
            customer_email: firstOrder.customer_email,
            customer_name: `${firstOrder.customer_first_name || ''} ${firstOrder.customer_last_name || ''}`.trim(),
            total_orders: orders.length,
            repeat_orders: repeatOrders,
            repeat_rate: repeatRate,
            avg_days_between_orders: avgDaysBetween,
            min_days_between_orders: minDaysBetween,
            max_days_between_orders: maxDaysBetween,
            total_spent: totalSpent,
            average_order_value: avgOrderValue,
            repeat_order_value: repeatOrderValue,
            churn_probability: churnProbability,
            next_purchase_prediction: nextPurchaseDate.toISOString().split('T')[0],
            first_order_date: firstOrder.created_at,
            last_order_date: lastOrder.created_at
          }, { 
            onConflict: 'customer_id,brand_id',
            ignoreDuplicates: false 
          })
      }

      console.log(`[Analytics] Processed repeat customer data for ${Object.keys(customerOrders).length} customers`)

    } catch (error) {
      console.error('[Analytics] Error processing repeat customers:', error)
    }
  }

  // Process regional sales data by extracting addresses from order data
  static async processRegionalSales(brandId: string, connectionId: string) {
    const supabase = createClient()
    
    try {
      console.log(`[Analytics] Processing regional sales for brand ${brandId}`)
      
      // Get all orders for this brand
      const { data: orders, error: ordersError } = await supabase
        .from('shopify_orders')
        .select('id, total_price, created_at, line_items')
        .eq('brand_id', brandId)

      if (ordersError || !orders) {
        console.error('[Analytics] Error fetching orders:', ordersError)
        return
      }

      console.log(`[Analytics] Found ${orders.length} orders to process for regional data`)

      // Process each order and extract shipping address from line_items or other fields
      for (const order of orders) {
        try {
          // Check if we already have regional data for this order
          const { data: existingRegional } = await supabase
            .from('shopify_sales_by_region')
            .select('order_id')
            .eq('order_id', order.id.toString())
            .single()

          if (existingRegional) {
            continue // Skip if already processed
          }

          // Extract address from line_items or other order data
          let address = null
          
          // Try to extract from line_items if it contains address info
          if (order.line_items && Array.isArray(order.line_items)) {
            // Look for shipping address in line items or order metadata
            const lineItem = order.line_items[0]
            if (lineItem && typeof lineItem === 'object') {
              // Some Shopify orders store address in line item properties
              address = lineItem.shipping_address || lineItem.address
            }
          }

          // If no address found, we can't create regional data for this order
          if (!address || !address.city) {
            console.log(`[Analytics] No address found for order ${order.id}, skipping`)
            continue
          }

          // Insert regional sales data
          const { error: insertError } = await supabase
            .from('shopify_sales_by_region')
            .insert({
              connection_id: connectionId,
              brand_id: brandId,
              user_id: 'system',
              order_id: order.id.toString(),
              created_at: order.created_at,
              city: address.city,
              province: address.province || address.state,
              province_code: address.province_code || address.state_code,
              country: address.country,
              country_code: address.country_code,
              total_price: parseFloat(order.total_price || '0'),
              order_count: 1
            })

          if (insertError) {
            console.error(`[Analytics] Error inserting regional data for order ${order.id}:`, insertError)
          } else {
            console.log(`[Analytics] ✅ Created regional data for order ${order.id} in ${address.city}, ${address.country}`)
          }

        } catch (orderError) {
          console.error(`[Analytics] Error processing order ${order.id}:`, orderError)
        }
      }
      
      console.log(`[Analytics] Regional sales processing completed for brand ${brandId}`)

    } catch (error) {
      console.error('[Analytics] Error processing regional sales:', error)
    }
  }

  // Process shipping analytics
  static async processShippingAnalytics(brandId: string, connectionId: string) {
    const supabase = createClient()
    
    try {
      console.log(`[Analytics] Processing shipping analytics for brand ${brandId}`)
      
      // Get orders with shipping data
      const { data: orders, error } = await supabase
        .from('shopify_orders')
        .select('id, total_price, shipping_lines, created_at, customer_id')
        .eq('brand_id', brandId)
        .not('shipping_lines', 'is', null)

      if (error || !orders) {
        console.error('[Analytics] Error fetching orders for shipping analysis:', error)
        return
      }

      // Group by date and location
      const dailyShippingStats = orders.reduce((acc, order) => {
        const date = order.created_at.split('T')[0]
        const shippingLines = order.shipping_lines || []
        
        if (!Array.isArray(shippingLines) || shippingLines.length === 0) return acc

        if (!acc[date]) {
          acc[date] = {
            date_period: date,
            total_orders: 0,
            total_shipping_cost: 0,
            total_order_value: 0,
            shipping_zones: new Set()
          }
        }

        acc[date].total_orders += 1
        acc[date].total_order_value += parseFloat(order.total_price || '0')

        // Process shipping lines
        shippingLines.forEach((line: any) => {
          acc[date].total_shipping_cost += parseFloat(line.price || '0')
          if (line.title) {
            acc[date].shipping_zones.add(line.title)
          }
        })

        return acc
      }, {} as Record<string, any>)

      // Insert/update shipping analytics records
      for (const [date, stats] of Object.entries(dailyShippingStats)) {
        const avgShippingCost = stats.total_orders > 0 ? stats.total_shipping_cost / stats.total_orders : 0
        const shippingPercentage = stats.total_order_value > 0 ? (stats.total_shipping_cost / stats.total_order_value) * 100 : 0

        await supabase
          .from('shopify_shipping_analytics')
          .upsert({
            brand_id: brandId,
            user_id: 'system',
            connection_id: connectionId,
            segment_name: 'Daily Shipping Summary',
            segment_type: 'daily',
            date_period: date,
            total_orders: stats.total_orders,
            total_shipping_cost: stats.total_shipping_cost,
            average_shipping_cost: avgShippingCost,
            total_order_value: stats.total_order_value,
            shipping_cost_percentage: shippingPercentage,
            shipping_zone: Array.from(stats.shipping_zones).join(', ')
          }, { 
            onConflict: 'brand_id,date_period,segment_name',
            ignoreDuplicates: false 
          })
      }

      console.log(`[Analytics] Processed shipping analytics for ${Object.keys(dailyShippingStats).length} days`)

    } catch (error) {
      console.error('[Analytics] Error processing shipping analytics:', error)
    }
  }

  // Process customer segmentation by location
  static async processLocationSegmentation(brandId: string, connectionId: string) {
    const supabase = createClient()
    
    try {
      console.log(`[Analytics] Processing location segmentation for brand ${brandId}`)
      
      // This would require shipping address data from orders
      // For now, we'll create placeholder segments based on available data
      
      const { data: regionalSales, error } = await supabase
        .from('shopify_sales_by_region')
        .select('*')
        .eq('brand_id', brandId)

      if (error || !regionalSales) {
        console.error('[Analytics] Error fetching regional sales:', error)
        return
      }

      // Group by location
      const locationSegments = regionalSales.reduce((acc, sale) => {
        const key = `${sale.country || 'Unknown'}-${sale.province || 'Unknown'}-${sale.city || 'Unknown'}`
        
        if (!acc[key]) {
          acc[key] = {
            country: sale.country,
            province: sale.province,
            city: sale.city,
            customer_count: 0,
            total_orders: 0,
            total_revenue: 0
          }
        }

        acc[key].customer_count += 1 // Assuming each sale is from a different customer (simplified)
        acc[key].total_orders += sale.order_count || 1
        acc[key].total_revenue += parseFloat(sale.total_price || '0')

        return acc
      }, {} as Record<string, any>)

      // Insert/update customer segment records
      for (const [key, segment] of Object.entries(locationSegments)) {
        const avgOrderValue = segment.total_orders > 0 ? segment.total_revenue / segment.total_orders : 0
        
        // Determine segment tier based on revenue
        let segmentTier = 'low'
        if (segment.total_revenue >= 10000) segmentTier = 'high'
        else if (segment.total_revenue >= 2000) segmentTier = 'medium'

        await supabase
          .from('shopify_customer_segments')
          .upsert({
            brand_id: brandId,
            user_id: 'system',
            connection_id: connectionId,
            segment_name: `${segment.city || 'Unknown'}, ${segment.province || 'Unknown'}, ${segment.country || 'Unknown'}`,
            segment_type: 'location',
            country: segment.country,
            province: segment.province,
            city: segment.city,
            customer_count: segment.customer_count,
            total_orders: segment.total_orders,
            total_revenue: segment.total_revenue,
            average_order_value: avgOrderValue,
            clv_tier: segmentTier
          }, { 
            onConflict: 'brand_id,segment_name,segment_type',
            ignoreDuplicates: false 
          })
      }

      console.log(`[Analytics] Processed location segmentation for ${Object.keys(locationSegments).length} locations`)

    } catch (error) {
      console.error('[Analytics] Error processing location segmentation:', error)
    }
  }

  // Main function to process all analytics
  static async processAllAnalytics(brandId: string, connectionId: string) {
    console.log(`[Analytics] Starting comprehensive analytics processing for brand ${brandId}`)
    
    try {
      await Promise.all([
        this.processCustomerSegmentation(brandId, connectionId),
        this.processRepeatCustomers(brandId, connectionId),
        this.processRegionalSales(brandId, connectionId),
        this.processShippingAnalytics(brandId, connectionId),
        this.processLocationSegmentation(brandId, connectionId)
      ])
      
      console.log(`[Analytics] Completed all analytics processing for brand ${brandId}`)
    } catch (error) {
      console.error('[Analytics] Error in comprehensive analytics processing:', error)
    }
  }
}
