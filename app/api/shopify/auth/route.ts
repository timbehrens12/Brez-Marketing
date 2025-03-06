import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { randomBytes } from 'crypto'

export async function GET(request: Request) {
  console.log('Shopify auth route hit')
  const { searchParams } = new URL(request.url)
  const brandId = searchParams.get('brandId')
  const connectionId = searchParams.get('connectionId')
  const shop = searchParams.get('shop')

  console.log('Params:', { brandId, connectionId, shop })

  if (!shop || !brandId || !connectionId) {
    console.log('Missing parameters')
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  try {
    // Verify the connection exists
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .single()

    if (connectionError || !connection) {
      console.error('Connection not found:', connectionError)
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    console.log('Found connection:', connection)

    // Use a more limited set of scopes to reduce permission requirements
    const scopes = [
      'read_products',
      'read_orders',
      'read_customers',
      'read_inventory'
    ].join(',')

    // Get the host from the request to build the callback URL
    const host = request.headers.get('host') || 'www.brezmarketingdashboard.com'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    
    // IMPORTANT: Use a direct page route instead of an API route for the callback
    // This ensures the callback is handled as a page render, not an API call
    const callbackUrl = `${protocol}://${host}/shopify-callback`
    
    console.log('Using callback URL:', callbackUrl)
    
    // Generate a unique nonce for this connection attempt
    const nonce = randomBytes(16).toString('hex')
    
    // Create state with nonce and timestamp to prevent caching
    const stateObj = {
      brandId,
      connectionId,
      nonce,
      timestamp: Date.now()
    }
    
    // Create an HTML page that will:
    // 1. Clear cookies for the Shopify domain
    // 2. Open a new window for authentication
    // This approach forces a fresh authentication flow
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Redirecting to Shopify...</title>
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
          <div class="spinner"></div>
          <h2>Preparing Shopify Authentication...</h2>
          <p>Please wait while we redirect you to Shopify.</p>
          <p>If you're not redirected automatically, click the button below.</p>
          
          <a href="#" id="authButton" class="button">Connect to Shopify</a>
          
          <script>
            // Construct the Shopify auth URL
            const shopDomain = "${shop}";
            const clientId = "${process.env.SHOPIFY_CLIENT_ID}";
            const scopes = "${scopes}";
            const redirectUri = "${callbackUrl}";
            const state = ${JSON.stringify(JSON.stringify(stateObj))};
            
            // Build the auth URL
            const authUrl = \`https://\${shopDomain}/admin/oauth/authorize?client_id=\${clientId}&scope=\${scopes}&redirect_uri=\${redirectUri}&state=\${state}&auth_mode=per_user_oauth&grant_options[]=per_user&_=\${Date.now()}\`;
            
            // Function to clear cookies for a domain
            function clearCookiesForDomain(domain) {
              const cookies = document.cookie.split(";");
              
              for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
                
                // Try to delete the cookie with various domain options
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;";
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + domain;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + domain;
              }
              
              console.log("Attempted to clear cookies for domain:", domain);
            }
            
            // Set up the auth button
            document.getElementById('authButton').href = authUrl;
            
            // Clear cookies for the Shopify domain
            clearCookiesForDomain(shopDomain);
            
            // Function to open a new window for authentication
            function openAuthWindow() {
              // Clear any localStorage items that might be related to Shopify
              try {
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && (key.includes('shopify') || key.includes('Shopify'))) {
                    localStorage.removeItem(key);
                    console.log('Removed localStorage item:', key);
                  }
                }
              } catch (e) {
                console.error('Error clearing localStorage:', e);
              }
              
              // Open the auth URL in a new window
              const authWindow = window.open(authUrl, '_blank');
              
              if (!authWindow) {
                alert('Please allow pop-ups for this site to connect to Shopify.');
              }
            }
            
            // Redirect after a short delay
            setTimeout(openAuthWindow, 1500);
          </script>
        </body>
      </html>
    `;
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Shopify auth error:', error)
    return NextResponse.json({ error: 'Failed to start OAuth' }, { status: 500 })
  }
}