import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { ShopifyQueueService } from '@/lib/services/shopifyQueueService'

/**
 * POST /api/shopify/connected/{brandId}
 * 
 * Called after successful Shopify OAuth connection
 * Starts the new queue-based sync process
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    // Check for internal server call (from callback) vs external user call
    const { userId } = auth()
    const internalCall = request.headers.get('x-internal-call') === 'true'

    if (!userId && !internalCall) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fix for Next.js 15: await params before using properties
    const { brandId } = await params
    const { shop, accessToken, connectionId } = await request.json()

    if (!brandId || !shop || !accessToken || !connectionId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: brandId, shop, accessToken, connectionId' 
      }, { status: 400 })
    }

    // Starting queue-based sync

    const supabase = createClient()

    // Verify the connection exists and is active
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('brand_id', brandId)
      .eq('platform_type', 'shopify')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      // Connection not found
      return NextResponse.json({ 
        error: 'Shopify connection not found or inactive' 
      }, { status: 404 })
    }

    // Update connection status to indicate sync starting
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'starting',
        metadata: {
          ...connection.metadata,
          v2_sync_started: true,
          sync_started_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    // 🚀 DIRECT SHOPIFY API CALLS - BYPASS OUR API ENDPOINTS ENTIRELY
    console.log('[Connected] Starting direct Shopify API sync...')

    // Step 1: Direct orders sync from Shopify
    try {
      console.log('[Connected] Syncing orders from Shopify...')
      const ordersResponse = await fetch(`https://${shop}/admin/api/2024-01/orders.json?limit=250&status=any`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        const ordersCount = ordersData.orders?.length || 0
        console.log(`[Connected] ✅ Found ${ordersCount} orders in Shopify`)

        // Save orders directly to database
        if (ordersCount > 0) {
          const { error: ordersError } = await supabase
            .from('shopify_orders')
            .upsert(
              ordersData.orders.map(order => ({
                brand_id: brandId,
                connection_id: connectionId,
                order_id: order.id.toString(),
                order_number: order.order_number,
                email: order.email || order.customer?.email,
                created_at: order.created_at,
                updated_at: order.updated_at,
                total_price: parseFloat(order.total_price),
                subtotal_price: parseFloat(order.subtotal_price),
                total_tax: parseFloat(order.total_tax),
                total_discounts: parseFloat(order.total_discounts || 0),
                total_line_items_price: parseFloat(order.total_line_items_price),
                fulfillment_status: order.fulfillment_status,
                financial_status: order.financial_status,
                currency: order.currency,
                customer_id: order.customer?.id?.toString(),
                raw_data: order
              })),
              { onConflict: 'order_id' }
            )

          if (ordersError) {
            console.error('[Connected] Failed to save orders:', ordersError)
          } else {
            console.log(`[Connected] ✅ Saved ${ordersCount} orders to database`)
          }
        }
      } else {
        console.error('[Connected] ❌ Orders API failed:', ordersResponse.status, await ordersResponse.text())
      }
    } catch (error) {
      console.error('[Connected] Orders sync error:', error)
    }

    // Step 2: Direct customers sync from Shopify
    try {
      console.log('[Connected] Syncing customers from Shopify...')
      const customersResponse = await fetch(`https://${shop}/admin/api/2024-01/customers.json?limit=250`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        const customersCount = customersData.customers?.length || 0
        console.log(`[Connected] ✅ Found ${customersCount} customers in Shopify`)

        // Save customers directly to database
        if (customersCount > 0) {
          const { error: customersError } = await supabase
            .from('shopify_customers')
            .upsert(
              customersData.customers.map(customer => ({
                brand_id: brandId,
                connection_id: connectionId,
                customer_id: customer.id.toString(),
                email: customer.email,
                first_name: customer.first_name,
                last_name: customer.last_name,
                phone: customer.phone,
                created_at: customer.created_at,
                updated_at: customer.updated_at,
                orders_count: customer.orders_count || 0,
                total_spent: parseFloat(customer.total_spent || 0),
                tags: customer.tags,
                raw_data: customer
              })),
              { onConflict: 'customer_id' }
            )

          if (customersError) {
            console.error('[Connected] Failed to save customers:', customersError)
          } else {
            console.log(`[Connected] ✅ Saved ${customersCount} customers to database`)
          }
        }
      } else {
        console.error('[Connected] ❌ Customers API failed:', customersResponse.status, await customersResponse.text())
      }
    } catch (error) {
      console.error('[Connected] Customers sync error:', error)
    }

    // Step 3: Direct products sync from Shopify (for inventory)
    try {
      console.log('[Connected] Syncing products from Shopify...')
      const productsResponse = await fetch(`https://${shop}/admin/api/2024-01/products.json?limit=250`, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        const productsCount = productsData.products?.length || 0
        console.log(`[Connected] ✅ Found ${productsCount} products in Shopify`)

        // Save products and inventory directly to database
        if (productsCount > 0) {
          // Save products
          const { error: productsError } = await supabase
            .from('shopify_products')
            .upsert(
              productsData.products.map(product => ({
                brand_id: brandId,
                connection_id: connectionId,
                product_id: product.id.toString(),
                title: product.title,
                handle: product.handle,
                product_type: product.product_type,
                vendor: product.vendor,
                status: product.status,
                created_at: product.created_at,
                updated_at: product.updated_at,
                published_at: product.published_at,
                tags: product.tags,
                raw_data: product
              })),
              { onConflict: 'product_id' }
            )

          if (productsError) {
            console.error('[Connected] Failed to save products:', productsError)
          } else {
            console.log(`[Connected] ✅ Saved ${productsCount} products to database`)
          }

          // Save inventory items
          const inventoryItems = []
          for (const product of productsData.products) {
            if (product.variants && product.variants.length > 0) {
              for (const variant of product.variants) {
                inventoryItems.push({
                  brand_id: brandId,
                  connection_id: connectionId,
                  product_id: product.id.toString(),
                  variant_id: variant.id.toString(),
                  inventory_item_id: variant.inventory_item_id?.toString() || '',
                  sku: variant.sku || '',
                  product_title: product.title,
                  variant_title: variant.title,
                  inventory_quantity: variant.inventory_quantity || 0,
                  last_updated: new Date().toISOString()
                })
              }
            }
          }

          if (inventoryItems.length > 0) {
            const { error: inventoryError } = await supabase
              .from('shopify_inventory')
              .upsert(inventoryItems, { onConflict: 'variant_id' })

            if (inventoryError) {
              console.error('[Connected] Failed to save inventory:', inventoryError)
            } else {
              console.log(`[Connected] ✅ Saved ${inventoryItems.length} inventory items to database`)
            }
          }
        }
      } else {
        console.error('[Connected] ❌ Products API failed:', productsResponse.status, await productsResponse.text())
      }
    } catch (error) {
      console.error('[Connected] Products sync error:', error)
    }

    // Step 3: Register webhooks (if not already registered)
    await registerShopifyWebhooks(shop, accessToken, brandId)

    // Step 4: Update connection status
    await supabase
      .from('platform_connections')
      .update({
        sync_status: 'completed', // Mark as completed since sync is done
        metadata: {
          ...connection.metadata,
          direct_sync_completed: true,
          webhooks_registered: true,
          sync_completed_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    console.log('[Connected] 🎉 DIRECT SYNC COMPLETED - Data should be visible in dashboard!')

    return NextResponse.json({
      success: true,
      message: 'Shopify connected and data synced successfully!',
      sync_completed: true,
      webhooks_registered: true
    })

  } catch (error) {
    console.error('[Shopify Connected] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to initiate Shopify sync'
    }, { status: 500 })
  }
}

/**
 * Register Shopify webhooks for real-time updates
 */
async function registerShopifyWebhooks(
  shop: string,
  accessToken: string,
  brandId: string
): Promise<void> {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify`
  
  const webhooks = [
    {
      topic: 'orders/create',
      address: `${webhookUrl}/orders/create`,
      format: 'json'
    },
    {
      topic: 'orders/updated',
      address: `${webhookUrl}/orders/updated`,
      format: 'json'
    },
    {
      topic: 'orders/cancelled',
      address: `${webhookUrl}/orders/cancelled`,
      format: 'json'
    },
    {
      topic: 'customers/create',
      address: `${webhookUrl}/customers/create`,
      format: 'json'
    },
    {
      topic: 'customers/update',
      address: `${webhookUrl}/customers/update`,
      format: 'json'
    },
    {
      topic: 'products/create',
      address: `${webhookUrl}/products/create`,
      format: 'json'
    },
    {
      topic: 'products/update',
      address: `${webhookUrl}/products/update`,
      format: 'json'
    }
  ]

  for (const webhook of webhooks) {
    try {
      const response = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhook: {
            ...webhook,
            fields: webhook.topic.startsWith('orders') ? 
              ['id', 'name', 'email', 'created_at', 'updated_at', 'total_price', 'line_items'] :
              webhook.topic.startsWith('customers') ?
              ['id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at'] :
              ['id', 'title', 'created_at', 'updated_at']
          }
        })
      })

      if (response.ok) {
        console.log(`[Webhooks] Registered ${webhook.topic} webhook for ${shop}`)
      } else {
        const errorText = await response.text()
        console.error(`[Webhooks] Failed to register ${webhook.topic} webhook:`, errorText)
      }
    } catch (error) {
      console.error(`[Webhooks] Error registering ${webhook.topic} webhook:`, error)
    }
  }
}
