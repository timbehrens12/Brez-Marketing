import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  console.log('Shopify callback route hit')
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')

  console.log('Callback params:', { code: code?.substring(0, 5) + '...', shop, state })

  // Create a base HTML response that will handle the redirect client-side
  let redirectUrl = '/settings?error=missing_params';
  let statusMessage = 'Error: Missing parameters';
  let statusColor = 'red';
  let autoRedirect = true;

  if (!code || !shop || !state) {
    console.error('Missing required params:', { code: !!code, shop: !!shop, state: !!state })
  } else {
    try {
      // Parse state to get brandId and connectionId
      let brandId, connectionId;
      try {
        const stateObj = JSON.parse(state);
        brandId = stateObj.brandId;
        connectionId = stateObj.connectionId;
        console.log('Parsed state:', { brandId, connectionId })
      } catch (parseError) {
        console.error('Error parsing state:', parseError)
        redirectUrl = '/settings?error=invalid_state';
        statusMessage = 'Error: Invalid state parameter';
        return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect);
      }

      // Exchange code for access token
      console.log('Exchanging code for access token')
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
        console.error('Token exchange failed:', errorText)
        redirectUrl = '/settings?error=token_exchange_failed';
        statusMessage = 'Error: Failed to get access token';
        return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect);
      }

      const tokenData = await tokenResponse.json()
      console.log('Got access token')

      // Update connection in database
      console.log('Updating connection in database')
      const { data: connection, error: updateError } = await supabase
        .from('platform_connections')
        .update({
          status: 'active',
          shop,
          access_token: tokenData.access_token,
          metadata: {
            shop_url: `https://${shop}`
          }
        })
        .eq('id', connectionId)
        .select()
        .single()

      if (updateError || !connection) {
        console.error('Failed to update connection:', updateError)
        redirectUrl = '/settings?error=database_update_failed';
        statusMessage = 'Error: Failed to update connection';
        return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect);
      }

      console.log('Connection updated successfully')

      // Trigger initial sync
      console.log('Triggering initial sync')
      const syncResponse = await fetch(new URL('/api/shopify/sync', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId: connection.id })
      })

      if (!syncResponse.ok) {
        console.error('Failed to trigger initial sync')
        // Continue anyway, this is not critical
      } else {
        console.log('Initial sync triggered successfully')
      }

      // Set success redirect
      redirectUrl = '/settings?success=true';
      statusMessage = 'Success! Shopify store connected successfully.';
      statusColor = 'green';

    } catch (error) {
      console.error('Shopify callback error:', error)
      redirectUrl = '/settings?error=callback_failed';
      statusMessage = 'Error: Callback process failed';
      statusColor = 'red';
    }
  }

  return createHtmlResponse(redirectUrl, statusMessage, statusColor, autoRedirect);
}

function createHtmlResponse(redirectUrl: string, statusMessage: string, statusColor: string, autoRedirect: boolean) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Connecting Shopify Store</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background-color: #000;
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
          }
          .status {
            color: ${statusColor === 'green' ? '#10b981' : '#ef4444'};
            font-weight: bold;
            margin-bottom: 20px;
          }
          .spinner {
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top: 4px solid #3498db;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .button {
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.3s;
            text-decoration: none;
            display: inline-block;
            margin-top: 20px;
          }
          .button:hover {
            background-color: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="status">${statusMessage}</div>
        ${autoRedirect ? '<div class="spinner"></div>' : ''}
        <div>
          ${autoRedirect 
            ? 'Redirecting to dashboard...' 
            : 'Please click the button below to continue.'}
        </div>
        <a href="${redirectUrl}" class="button">
          Continue to Dashboard
        </a>
        ${autoRedirect ? `
        <script>
          // Store connection data in localStorage to ensure it persists
          localStorage.setItem('shopifyConnectionComplete', 'true');
          localStorage.setItem('shopifyConnectionTimestamp', Date.now().toString());
          
          // Redirect after a short delay
          setTimeout(function() {
            window.location.href = "${redirectUrl}";
          }, 2000);
        </script>
        ` : ''}
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 