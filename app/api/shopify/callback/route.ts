import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { registerShopifyWebhooks } from '@/lib/services/shopify-service'

// Force dynamic rendering to ensure the route is not cached
export const dynamic = 'force-dynamic'

// Add CORS headers to the response
function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

export async function OPTIONS() {
  return addCorsHeaders(
    new Response(null, {
      status: 204,
    })
  )
}

export async function GET(request: Request) {
  console.log('Shopify callback route hit', request.url)
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const stateParam = searchParams.get('state') // This could be a JSON string or just brandId
  
  let brandId: string | null = null
  let connectionId: string | null = null
  
  console.log('Received params:', { code, shop, stateParam })
  
  // Parse state parameter
  try {
    // Check if state is a JSON string
    if (stateParam && stateParam.includes('{')) {
      const stateObj = JSON.parse(stateParam)
      brandId = stateObj.brandId
      connectionId = stateObj.connectionId
      console.log('Parsed state object:', stateObj)
    } else {
      // Otherwise, assume it's just the brandId
      brandId = stateParam
      console.log('Using state as brandId:', brandId)
    }
  } catch (e) {
    console.error('Error parsing state parameter:', e)
    brandId = stateParam // Fallback to using the raw state as brandId
  }

  console.log('Shopify callback received:', { shop, code, brandId, connectionId })

  if (!shop || !code || !brandId) {
    console.error('Missing required params:', { shop, code, brandId })
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
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
            <p>Missing required parameters. Please try again.</p>
            <button onclick="window.close()">Close</button>
            <script>
              // If window doesn't close (e.g., not opened as popup), redirect
              setTimeout(() => {
                window.location.href = '/settings?error=missing_params';
              }, 3000);
            </script>
          </div>
        </body>
      </html>
    `;

    return addCorsHeaders(
      new Response(errorHtml, {
        status: 400,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    );
  }

  try {
    console.log('Exchanging code for access token...')
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
      const errorText = await tokenResponse.text()
      console.error('Token response not OK:', tokenResponse.status, errorText)
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('Received access token')
    const { access_token } = tokenData

    // If we have a connectionId, update the existing connection
    if (connectionId) {
      console.log('Updating existing connection:', connectionId)
      const { error } = await supabase
        .from('platform_connections')
        .update({
          shop: shop,
          access_token: access_token,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)
      
      if (error) {
        console.error('Error updating connection:', error)
        throw error
      }
      console.log('Connection updated successfully')
    } else {
      // Otherwise, create a new connection
      console.log('Creating new connection for brand:', brandId)
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

      if (error) {
        console.error('Error creating connection:', error)
        throw error
      }
      console.log('New connection created successfully')
    }

    // Register the webhook
    try {
      console.log('Registering webhooks...')
      await registerShopifyWebhooks(shop, access_token)
      console.log('Webhooks registered successfully')
    } catch (webhookError) {
      console.error('Error registering webhooks:', webhookError)
      // Continue anyway, as this shouldn't block the connection process
    }

    // Prepare the HTML content for success page
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
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
              // Try to notify the parent window
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage({ 
                    type: 'SHOPIFY_CONNECTION_SUCCESS',
                    connectionId: '${connectionId}',
                    shop: '${shop}'
                  }, '*');
                }
              } catch (e) {
                console.error('Error posting message to parent:', e);
              }
              
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
    `;

    console.log('Returning success HTML response')
    // Return the HTML content with proper content type
    return addCorsHeaders(
      new Response(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    );
  } catch (error) {
    console.error('Error in Shopify callback:', error)
    
    // Prepare error HTML
    const errorHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
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
              // Try to notify the parent window about the error
              try {
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage({ 
                    type: 'SHOPIFY_CONNECTION_ERROR',
                    connectionId: '${connectionId}',
                    error: 'Connection failed'
                  }, '*');
                }
              } catch (e) {
                console.error('Error posting message to parent:', e);
              }
              
              // If window doesn't close (e.g., not opened as popup), redirect
              setTimeout(() => {
                window.location.href = '/settings?error=connection_failed';
              }, 3000);
            </script>
          </div>
        </body>
      </html>
    `;

    console.log('Returning error HTML response')
    return addCorsHeaders(
      new Response(errorHtml, {
        status: 500,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    );
  }
} 