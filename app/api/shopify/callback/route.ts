import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a direct admin client that doesn't require authentication
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: Request) {
  console.log('Shopify callback route hit')
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const shop = searchParams.get('shop')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('Callback params:', { 
    code: code?.substring(0, 5) + '...',
    shop, 
    state,
    error,
    errorDescription
  })

  // Create a base HTML response that will handle the redirect client-side
  let redirectUrl = '/settings?error=missing_params';
  let statusMessage = 'Error: Missing parameters';
  let statusColor = 'red';
  let autoRedirect = true;
  let debugInfo = '';

  // If Shopify returned an error, handle it
  if (error) {
    console.error('Shopify returned an error:', error, errorDescription)
    debugInfo = `Shopify error: ${error}\nDescription: ${errorDescription || 'No description provided'}\n`;
    redirectUrl = `/settings?error=shopify_error&description=${encodeURIComponent(errorDescription || '')}`;
    statusMessage = `Error from Shopify: ${error}`;
    return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
  }

  if (!code || !shop || !state) {
    console.error('Missing required params:', { code: !!code, shop: !!shop, state: !!state })
    debugInfo = `Missing params: code=${!!code}, shop=${!!shop}, state=${!!state}`;
  } else {
    try {
      // Parse state to get brandId and connectionId
      let brandId, connectionId;
      try {
        const stateObj = JSON.parse(state);
        brandId = stateObj.brandId;
        connectionId = stateObj.connectionId;
        console.log('Parsed state:', { brandId, connectionId })
        debugInfo += `Parsed state: brandId=${brandId}, connectionId=${connectionId}\n`;
      } catch (parseError: any) {
        console.error('Error parsing state:', parseError)
        redirectUrl = '/settings?error=invalid_state';
        statusMessage = 'Error: Invalid state parameter';
        debugInfo += `State parse error: ${parseError.message}\n`;
        return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
      }

      // Exchange code for access token
      console.log('Exchanging code for access token')
      debugInfo += 'Attempting to exchange code for access token...\n';
      
      try {
        // Log the full token exchange request for debugging
        const tokenUrl = `https://${shop}/admin/oauth/access_token`;
        const tokenBody = {
          client_id: process.env.SHOPIFY_CLIENT_ID,
          client_secret: process.env.SHOPIFY_CLIENT_SECRET,
          code
        };
        
        console.log('Token exchange request:', {
          url: tokenUrl,
          body: {
            ...tokenBody,
            client_secret: '[REDACTED]'
          }
        });
        
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tokenBody),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          console.error('Token exchange failed:', {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            body: errorText
          })
          debugInfo += `Token exchange failed: ${tokenResponse.status} - ${errorText}\n`;
          redirectUrl = '/settings?error=token_exchange_failed';
          statusMessage = 'Error: Failed to get access token';
          return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
        }

        const tokenData = await tokenResponse.json()
        console.log('Got access token')
        debugInfo += 'Successfully obtained access token\n';
        
        // Check if connection exists before updating
        console.log('Checking if connection exists')
        debugInfo += `Checking if connection exists with ID: ${connectionId}\n`;
        
        const { data: existingConnection, error: checkError } = await supabaseAdmin
          .from('platform_connections')
          .select('*')
          .eq('id', connectionId)
          .single();
          
        if (checkError) {
          console.error('Error checking connection:', checkError)
          debugInfo += `Error checking connection: ${checkError.message}\n`;
          
          // If the connection doesn't exist, try to create it
          if (checkError.code === 'PGRST116') {
            debugInfo += `Connection not found, attempting to create a new one\n`;
            
            try {
              // First, get the user_id from the brand
              const { data: brand, error: brandError } = await supabaseAdmin
                .from('brands')
                .select('user_id')
                .eq('id', brandId)
                .single();
                
              if (brandError || !brand) {
                console.error('Failed to get brand:', brandError)
                debugInfo += `Brand error: ${brandError?.message || 'Brand not found'}\n`;
                redirectUrl = '/settings?error=brand_not_found';
                statusMessage = 'Error: Brand not found';
                return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
              }
              
              const { data: newConnection, error: insertError } = await supabaseAdmin
                .from('platform_connections')
                .insert({
                  id: connectionId,
                  user_id: brand.user_id,
                  brand_id: brandId,
                  platform_type: 'shopify',
                  status: 'active',
                  shop: shop,
                  access_token: tokenData.access_token,
                  metadata: {
                    shop_url: `https://${shop}`
                  },
                  created_at: new Date().toISOString()
                })
                .select()
                .single();
                
              if (insertError) {
                console.error('Failed to create connection:', insertError)
                debugInfo += `Insert error: ${insertError.message}\n`;
                redirectUrl = '/settings?error=connection_create_failed';
                statusMessage = 'Error: Failed to create connection';
                return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
              }
              
              debugInfo += `Successfully created new connection\n`;
              
              // Continue with the newly created connection
              const connection = newConnection;
              
              // Trigger initial sync
              console.log('Triggering initial sync')
              debugInfo += 'Attempting to trigger initial sync...\n';
              
              try {
                const syncResponse = await fetch(new URL('/api/shopify/sync', request.url).toString(), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ connectionId: connection.id })
                });

                if (!syncResponse.ok) {
                  console.error('Failed to trigger initial sync')
                  debugInfo += `Sync error: ${syncResponse.status}\n`;
                  // Continue anyway, this is not critical
                } else {
                  console.log('Initial sync triggered successfully')
                  debugInfo += 'Initial sync triggered successfully\n';
                }
              } catch (syncError: any) {
                console.error('Error triggering sync:', syncError)
                debugInfo += `Sync error: ${syncError.message}\n`;
                // Continue anyway, this is not critical
              }

              // Trigger initial data syncs
              try {
                console.log('Triggering initial order sync')
                debugInfo += 'Triggering initial order sync\n';
                
                // Sync orders
                const orderSyncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/shopify/sync`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ connectionId: connection.id })
                });
                
                if (!orderSyncResponse.ok) {
                  console.warn('Initial order sync failed, but continuing with connection process')
                  debugInfo += 'Initial order sync failed, but continuing with connection process\n';
                } else {
                  console.log('Initial order sync triggered successfully')
                  debugInfo += 'Initial order sync triggered successfully\n';
                }
                
                // Sync customers
                console.log('Triggering initial customer sync')
                debugInfo += 'Triggering initial customer sync\n';
                
                const customerSyncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/shopify/customers/sync`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ connectionId: connection.id })
                });
                
                if (!customerSyncResponse.ok) {
                  console.warn('Initial customer sync failed, but continuing with connection process')
                  debugInfo += 'Initial customer sync failed, but continuing with connection process\n';
                } else {
                  console.log('Initial customer sync triggered successfully')
                  debugInfo += 'Initial customer sync triggered successfully\n';
                }
                
                // Sync inventory if available
                console.log('Triggering initial inventory sync')
                debugInfo += 'Triggering initial inventory sync\n';
                
                const inventorySyncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/shopify/inventory/sync`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ connectionId: connection.id })
                });
                
                if (!inventorySyncResponse.ok) {
                  console.warn('Initial inventory sync failed, but continuing with connection process')
                  debugInfo += 'Initial inventory sync failed, but continuing with connection process\n';
                } else {
                  console.log('Initial inventory sync triggered successfully')
                  debugInfo += 'Initial inventory sync triggered successfully\n';
                }
                
              } catch (syncError) {
                console.error('Error triggering initial data syncs:', syncError)
                debugInfo += `Error triggering initial data syncs: ${syncError}\n`;
                // Continue with the connection process even if syncs fail
              }

              // Set success redirect
              redirectUrl = `/settings?success=true&connectionId=${connection.id}`;
              statusMessage = 'Success! Shopify store connected successfully.';
              statusColor = 'green';
              
              return createHtmlResponse(redirectUrl, statusMessage, statusColor, autoRedirect, debugInfo);
            } catch (createError: any) {
              console.error('Error creating connection:', createError)
              debugInfo += `Create error: ${createError.message}\n`;
              redirectUrl = '/settings?error=connection_create_error';
              statusMessage = 'Error: Failed to create connection';
              return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
            }
          }
          
          redirectUrl = '/settings?error=connection_check_failed';
          statusMessage = 'Error: Failed to check connection';
          return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
        }
        
        if (!existingConnection) {
          console.error('Connection not found')
          debugInfo += `Connection with ID ${connectionId} not found\n`;
          redirectUrl = '/settings?error=connection_not_found';
          statusMessage = 'Error: Connection not found';
          return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
        }
        
        debugInfo += `Found existing connection: ${JSON.stringify(existingConnection)}\n`;

        // Update connection in database
        console.log('Updating connection in database')
        debugInfo += 'Attempting to update connection in database...\n';
        
        try {
          const { data: connection, error: updateError } = await supabaseAdmin
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
            .single();

          if (updateError) {
            console.error('Failed to update connection:', updateError)
            debugInfo += `Update error: ${updateError.message}\n`;
            redirectUrl = '/settings?error=database_update_failed';
            statusMessage = 'Error: Failed to update connection';
            return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
          }

          if (!connection) {
            console.error('No connection returned after update')
            debugInfo += 'No connection returned after update\n';
            redirectUrl = '/settings?error=no_connection_returned';
            statusMessage = 'Error: No connection returned after update';
            return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
          }

          console.log('Connection updated successfully')
          debugInfo += 'Connection updated successfully\n';
          
          // Trigger initial data syncs
          try {
            console.log('Triggering initial order sync')
            debugInfo += 'Triggering initial order sync\n';
            
            // Sync orders
            const orderSyncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/shopify/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ connectionId: connection.id })
            });
            
            if (!orderSyncResponse.ok) {
              console.warn('Initial order sync failed, but continuing with connection process')
              debugInfo += 'Initial order sync failed, but continuing with connection process\n';
            } else {
              console.log('Initial order sync triggered successfully')
              debugInfo += 'Initial order sync triggered successfully\n';
            }
            
            // Sync customers
            console.log('Triggering initial customer sync')
            debugInfo += 'Triggering initial customer sync\n';
            
            const customerSyncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/shopify/customers/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ connectionId: connection.id })
            });
            
            if (!customerSyncResponse.ok) {
              console.warn('Initial customer sync failed, but continuing with connection process')
              debugInfo += 'Initial customer sync failed, but continuing with connection process\n';
            } else {
              console.log('Initial customer sync triggered successfully')
              debugInfo += 'Initial customer sync triggered successfully\n';
            }
            
            // Sync inventory if available
            console.log('Triggering initial inventory sync')
            debugInfo += 'Triggering initial inventory sync\n';
            
            const inventorySyncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/shopify/inventory/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ connectionId: connection.id })
            });
            
            if (!inventorySyncResponse.ok) {
              console.warn('Initial inventory sync failed, but continuing with connection process')
              debugInfo += 'Initial inventory sync failed, but continuing with connection process\n';
            } else {
              console.log('Initial inventory sync triggered successfully')
              debugInfo += 'Initial inventory sync triggered successfully\n';
            }
            
          } catch (syncError) {
            console.error('Error triggering initial data syncs:', syncError)
            debugInfo += `Error triggering initial data syncs: ${syncError}\n`;
            // Continue with the connection process even if syncs fail
          }

          // Set success redirect
          redirectUrl = `/settings?success=true&connectionId=${connection.id}`;
          statusMessage = 'Success! Shopify store connected successfully.';
          statusColor = 'green';
          
        } catch (dbError: any) {
          console.error('Database operation error:', dbError)
          debugInfo += `Database operation error: ${dbError.message}\n`;
          redirectUrl = '/settings?error=database_operation_failed';
          statusMessage = 'Error: Database operation failed';
          return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
        }
      } catch (tokenError: any) {
        console.error('Token exchange error:', tokenError)
        debugInfo += `Token exchange error: ${tokenError.message}\n`;
        redirectUrl = '/settings?error=token_exchange_error';
        statusMessage = 'Error: Token exchange error';
        return createHtmlResponse(redirectUrl, statusMessage, 'red', autoRedirect, debugInfo);
      }
    } catch (error: any) {
      console.error('Shopify callback error:', error)
      debugInfo += `General error: ${error.message}\n`;
      redirectUrl = '/settings?error=callback_failed';
      statusMessage = 'Error: Callback process failed';
      statusColor = 'red';
    }
  }

  return createHtmlResponse(redirectUrl, statusMessage, statusColor, autoRedirect, debugInfo);
}

function createHtmlResponse(redirectUrl: string, statusMessage: string, statusColor: string, autoRedirect: boolean, debugInfo: string = '') {
  const showDebug = process.env.NODE_ENV === 'development' || debugInfo.includes('error');
  const isError = statusColor === 'red';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Shopify Connection Status</title>
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
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
          }
          .status {
            color: ${statusColor === 'green' ? '#10b981' : '#ef4444'};
            font-weight: bold;
            margin-bottom: 20px;
            font-size: 18px;
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
          .button.secondary {
            background-color: #4b5563;
            margin-left: 10px;
          }
          .button.secondary:hover {
            background-color: #374151;
          }
          .debug-info {
            margin-top: 30px;
            text-align: left;
            background-color: #111;
            padding: 15px;
            border-radius: 4px;
            max-width: 800px;
            width: 100%;
            overflow-x: auto;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 12px;
            color: #ddd;
          }
          .debug-toggle {
            background: none;
            border: 1px solid #444;
            color: #888;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 20px;
            font-size: 12px;
          }
          .info-box {
            background-color: ${isError ? '#7f1d1d' : '#064e3b'};
            border: 1px solid ${isError ? '#ef4444' : '#10b981'};
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
            max-width: 600px;
          }
        </style>
      </head>
      <body>
        <div class="status">${statusMessage}</div>
        
        <div class="info-box">
          ${isError ? 
            `<p>There was a problem connecting your Shopify store. This could be due to:</p>
             <ul style="text-align: left;">
               <li>Session timeout or authentication issue</li>
               <li>Database connection problem</li>
               <li>Invalid Shopify credentials</li>
             </ul>
             <p>You can try again or contact support if the issue persists.</p>` 
            : 
            `<p>Your Shopify store has been successfully connected!</p>
             <p>You'll now be able to see your store's data in the dashboard.</p>`
          }
        </div>
        
        ${autoRedirect && !isError ? '<div class="spinner"></div>' : ''}
        
        <div>
          ${autoRedirect && !isError
            ? 'Redirecting to dashboard...' 
            : 'Please click one of the buttons below to continue.'}
        </div>
        
        <div>
          <a href="${redirectUrl}" class="button">
            Continue to Dashboard
          </a>
          
          ${isError ? 
            `<a href="/login" class="button secondary">
              Log In Again
            </a>` 
            : ''
          }
        </div>
        
        ${showDebug ? `
        <div class="debug-info">
          <strong>Debug Information:</strong>
          ${debugInfo || 'No debug information available.'}
        </div>
        ` : `
        <button class="debug-toggle" onclick="document.querySelector('.debug-container').style.display = 'block';">
          Show Debug Info
        </button>
        <div class="debug-container" style="display: none;">
          <div class="debug-info">
            <strong>Debug Information:</strong>
            ${debugInfo || 'No debug information available.'}
          </div>
        </div>
        `}
        
        ${autoRedirect && !isError ? `
        <script>
          // Function to safely store data in localStorage
          function safelyStoreData() {
            try {
              // Store connection data in localStorage to ensure it persists
              localStorage.setItem('shopifyConnectionComplete', 'true');
              localStorage.setItem('shopifyConnectionTimestamp', Date.now().toString());
              console.log('Connection data stored in localStorage');
              return true;
            } catch (e) {
              console.error('Failed to store data in localStorage:', e);
              return false;
            }
          }
          
          // Try to store the data
          const dataStored = safelyStoreData();
          
          // Only redirect if not showing debug info in production
          ${!showDebug ? `
          // Redirect after a short delay
          setTimeout(function() {
            try {
              window.location.href = "${redirectUrl}";
            } catch (e) {
              console.error('Failed to redirect:', e);
              // Fallback - try to reload the page
              document.location.href = "${redirectUrl}";
            }
          }, 2000);
          ` : '// Not redirecting automatically due to errors'}
        </script>
        ` : ''}
      </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
} 