// Add this function to register webhooks
export async function registerShopifyWebhooks(shop: string, accessToken: string) {
  try {
    console.log(`[Webhooks] Registering webhooks for shop: ${shop}`)

    // Register order creation webhook
    const response = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        webhook: {
          topic: 'orders/create',
          address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify/orders`,
          format: 'json'
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Webhooks] Failed to register webhook:', error)

      // Don't throw error for webhook registration - it's not critical for sync
      // Just log it and continue
      return null
    }

    const result = await response.json()
    console.log(`[Webhooks] Successfully registered webhook:`, result)
    return result
  } catch (error) {
    console.error('[Webhooks] Error registering webhook:', error)
    // Don't throw error for webhook registration - it's not critical for sync
    return null
  }
} 