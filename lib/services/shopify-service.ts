// Add this function to register webhooks
export async function registerShopifyWebhooks(shop: string, accessToken: string) {
  try {
    // Register order creation webhook
    const response = await fetch(`https://${shop}/admin/api/2023-04/webhooks.json`, {
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
      throw new Error(`Failed to register webhook: ${JSON.stringify(error)}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error registering webhook:', error)
    throw error
  }
} 