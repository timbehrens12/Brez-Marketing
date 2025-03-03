import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { registerShopifyWebhooks } from '@/lib/services/shopify-service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const stateParam = searchParams.get('state') // This could be a JSON string or just brandId
  
  let brandId: string | null = null
  let connectionId: string | null = null
  
  // Parse state parameter
  try {
    // Check if state is a JSON string
    if (stateParam && stateParam.includes('{')) {
      const stateObj = JSON.parse(stateParam)
      brandId = stateObj.brandId
      connectionId = stateObj.connectionId
    } else {
      // Otherwise, assume it's just the brandId
      brandId = stateParam
    }
  } catch (e) {
    console.error('Error parsing state parameter:', e)
    brandId = stateParam // Fallback to using the raw state as brandId
  }

  console.log('Shopify callback received:', { shop, code, brandId, connectionId })

  if (!shop || !code || !brandId) {
    console.error('Missing required params:', { shop, code, brandId })
    return NextResponse.redirect('/settings?error=missing_params')
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token')
    }

    const { access_token } = await tokenResponse.json()

    // If we have a connectionId, update the existing connection
    if (connectionId) {
      const { error } = await supabase
        .from('platform_connections')
        .update({
          shop: shop,
          access_token: access_token,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)
      
      if (error) throw error
    } else {
      // Otherwise, create a new connection
      const { error } = await supabase
        .from('platform_connections')
        .insert([{
          brand_id: brandId,
          platform_type: 'shopify',
          shop: shop,
          access_token: access_token,
          status: 'active',
          created_at: new Date().toISOString()
        }])

      if (error) throw error
    }

    // Register the webhook
    try {
      await registerShopifyWebhooks(shop, access_token)
    } catch (webhookError) {
      console.error('Error registering webhooks:', webhookError)
      // Continue anyway, as this shouldn't block the connection process
    }

    // Return a success page that will close the popup window
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Successful</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #1A1A1A;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .success {
              background-color: #2A2A2A;
              border-radius: 8px;
              padding: 2rem;
              max-width: 400px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #4ade80;
              margin-bottom: 1rem;
            }
            p {
              margin-bottom: 2rem;
              color: #d1d5db;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>Connection Successful!</h1>
            <p>Your Shopify store has been connected successfully. This window will close automatically.</p>
            <script>
              // Close the window after a short delay
              setTimeout(() => {
                window.close();
                // If window doesn't close (e.g., not opened as popup), redirect
                setTimeout(() => {
                  window.location.href = '/settings?success=true';
                }, 1000);
              }, 2000);
            </script>
          </div>
        </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error in Shopify callback:', error)
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #1A1A1A;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .error {
              background-color: #2A2A2A;
              border-radius: 8px;
              padding: 2rem;
              max-width: 400px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            h1 {
              color: #ef4444;
              margin-bottom: 1rem;
            }
            p {
              margin-bottom: 2rem;
              color: #d1d5db;
            }
            button {
              background-color: #3b82f6;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 0.25rem;
              cursor: pointer;
            }
            button:hover {
              background-color: #2563eb;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Connection Failed</h1>
            <p>There was an error connecting your Shopify store. Please try again.</p>
            <button onclick="window.close()">Close</button>
            <script>
              // If window doesn't close (e.g., not opened as popup), redirect
              setTimeout(() => {
                window.location.href = '/settings?error=connection_failed';
              }, 3000);
            </script>
          </div>
        </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  }
} 