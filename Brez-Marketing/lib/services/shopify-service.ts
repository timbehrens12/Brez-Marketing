// Test webhook registration function
export async function testWebhookRegistration(shop: string, accessToken: string) {
  try {
    console.log(`[Test] Testing webhook registration for shop: ${shop}`)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'

    // Test with a single webhook first
    const testWebhook = {
      topic: 'orders/create',
      address: `${baseUrl}/api/webhooks/shopify/orders`
    }

    console.log(`[Test] Attempting to register:`, testWebhook)

    const response = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        webhook: {
          topic: testWebhook.topic,
          address: testWebhook.address,
          format: 'json',
          fields: [
            'id',
            'created_at',
            'updated_at',
            'email',
            'total_price',
            'subtotal_price',
            'total_tax',
            'total_discounts',
            'financial_status',
            'fulfillment_status',
            'currency',
            'customer',
            'line_items',
            'shipping_address',
            'billing_address'
          ]
        }
      })
    })

    const responseText = await response.text()
    console.log(`[Test] Response status: ${response.status}`)
    console.log(`[Test] Response body:`, responseText)

    if (!response.ok) {
      try {
        const error = JSON.parse(responseText)
        console.error(`[Test] Failed to register webhook:`, error)
        return { success: false, error }
      } catch (e) {
        console.error(`[Test] Failed to register webhook (non-JSON response):`, responseText)
        return { success: false, error: responseText }
      }
    }

    const result = JSON.parse(responseText)
    console.log(`[Test] Successfully registered webhook:`, result)
    return { success: true, result }
  } catch (error) {
    console.error('[Test] Error testing webhook registration:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// DISABLE WEBHOOKS TEMPORARILY - FOCUS ON GETTING SYNC WORKING FIRST
export async function registerShopifyWebhooks(shop: string, accessToken: string) {
  console.log(`[Webhooks] 🚫 Webhook registration DISABLED temporarily - focus on sync first`)
  return []
} 