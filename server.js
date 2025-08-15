import express from "express"
import dotenv from "dotenv"
import axios from "axios"
import cors from "cors"
import crypto from "crypto"
import cookieParser from "cookie-parser"
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

// Add cookie-parser middleware before routes
app.use(cookieParser())
app.use(express.json())
app.use(
  cors({
    origin: [
      "https://brezmarketingdashboard.com",
      "https://www.brezmarketingdashboard.com",
      "http://localhost:3000",
      "https://api.brezmarketingdashboard.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
  }),
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

app.get("/test", (req, res) => {
  res.json({ message: "Server is running" })
})

const stores = {}
function getStoreCredentials(shop) {
  if (!process.env.SHOPIFY_API_URL) {
    console.error("SHOPIFY_API_URL is not defined in the environment variables")
    return null
  }

  // Remove https:// and trailing slash if present
  const cleanShopUrl = shop.replace("https://", "").replace(/\/$/, "")
  const envShopUrl = process.env.SHOPIFY_API_URL.replace("https://", "").replace(/\/$/, "")

  if (cleanShopUrl === envShopUrl) {
    return {
      clientId: process.env.SHOPIFY_CLIENT_ID,
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
    }
  }

  console.log("No matching credentials found for shop:", shop)
  return null
}

app.get("/shopify/auth", (req, res) => {
  const { shop, brandId } = req.query
  if (!shop) {
    return res.status(400).send("Missing shop parameter")
  }

  console.log("Auth request for shop:", shop, "brandId:", brandId)
  const credentials = getStoreCredentials(shop)

  if (!credentials) {
    console.log("No credentials found for shop:", shop)
    return res.status(400).send("No credentials found for this shop")
  }

  const redirectUri = `${process.env.BACKEND_URL}/shopify/callback`
  const scopes = "read_orders,read_products,read_customers,read_discounts,read_inventory"
  const state = brandId // Use brandId as state instead of random nonce
  const shopifyAuthUrl = `https://${shop}/admin/oauth/authorize?client_id=${credentials.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  console.log("Redirecting to Shopify auth URL:", shopifyAuthUrl)
  res.redirect(shopifyAuthUrl)
})

app.get("/", (req, res) => {
  res.send("Backend server is running")
})

// Shopify OAuth callback
app.get("/shopify/callback", async (req, res) => {
  const { code, shop, state: brandId } = req.query // state is our brandId

  if (!code || !shop || !brandId) {
    return res.status(400).send("Missing required parameters")
  }

  const credentials = getStoreCredentials(shop)
  if (!credentials) {
    return res.status(400).send("No credentials found for this shop")
  }

  try {
    console.log("Exchanging code for access token for shop:", shop)
    const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
    })

    // Store the access token
    stores[shop] = {
      accessToken: tokenResponse.data.access_token,
      lastTokenRefresh: new Date(),
    }

    // Save to Supabase with the brandId
    const { error: supabaseError } = await supabase
      .from('platform_connections')
      .insert({
        brand_id: brandId,
        platform_type: 'shopify',
        store_url: shop,
        access_token: tokenResponse.data.access_token
      })

    if (supabaseError) {
      console.error("Error saving to Supabase:", supabaseError)
    } else {
      console.log("Successfully saved connection to Supabase")
    }

    // Clear the nonce cookie
    res.clearCookie("shopify_nonce")

    // Check if store requires password
    try {
      await axios.get(`https://${shop}/admin/api/2023-04/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": stores[shop].accessToken,
        },
      })
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("Store requires password authentication")
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth-error?shop=${encodeURIComponent(shop)}&error=password_required`,
        )
      }
    }

    console.log("Authentication successful for shop:", shop)
    res.redirect(`${process.env.FRONTEND_URL}?shop=${encodeURIComponent(shop)}`)
  } catch (error) {
    console.error("Error in callback:", error.message)
    if (error.response) {
      console.error("Error response:", error.response.data)
    }
    res.status(500).send("Authentication failed")
  }
})

// List connected stores
app.get("/api/stores", (req, res) => {
  res.json(Object.keys(stores))
})

// Add this new route near the other API routes:
app.get("/api/clear-token", (req, res) => {
  const { shop } = req.query
  if (shop && stores[shop]) {
    delete stores[shop]
    console.log(`Cleared token for shop: ${shop}`)
    res.json({ message: "Token cleared successfully" })
  } else {
    res.status(400).json({ error: "Invalid shop or no token found" })
  }
})

// Add this new route near the other API routes:
app.post("/api/disconnect-store", (req, res) => {
  const { shop } = req.body
  if (shop && stores[shop]) {
    delete stores[shop]
    console.log(`Disconnected store: ${shop}`)
    res.json({ message: "Store disconnected successfully" })
  } else {
    res.status(400).json({ error: "Invalid shop or no connection found" })
  }
})

// Helper function to get yesterday's date in ISO format
function getYesterdayDate() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  return yesterday.toISOString()
}

// Shopify API route
app.get("/api/shopify/sales", async (req, res) => {
  const { shop } = req.query

  if (!shop || !stores[shop]) {
    return res.status(400).json({ error: "Missing shop parameter or invalid shop" })
  }

  const storeData = stores[shop]

  try {
    console.log("Fetching data from shop:", shop)
    const ordersResponse = await axios.get(`https://${shop}/admin/api/2023-04/orders.json`, {
      headers: {
        "X-Shopify-Access-Token": storeData.accessToken,
      },
      params: {
        status: "any",
        limit: 250,
        // Remove the created_at_min parameter to include all data
      },
    })

    const refundsResponse = await axios.get(`https://${shop}/admin/api/2023-04/orders.json`, {
      headers: {
        "X-Shopify-Access-Token": storeData.accessToken,
      },
      params: {
        status: "any",
        financial_status: "refunded,partially_refunded",
        limit: 250,
        fields: "id,created_at,total_price,line_items,refunds",
      },
    })

    const productsResponse = await axios.get(`https://${shop}/admin/api/2023-04/products.json`, {
      headers: {
        "X-Shopify-Access-Token": storeData.accessToken,
      },
      params: {
        limit: 250,
        fields: "id,title,variants",
      },
    })

    const orders = ordersResponse.data.orders
    const refunds = refundsResponse.data.orders.flatMap((order) =>
      order.refunds.map((refund) => ({
        ...refund,
        order_id: order.id,
        created_at: refund.created_at || order.created_at,
      })),
    )
    const products = productsResponse.data.products

    // Calculate customer segments
    const customersByID = new Map()
    orders.forEach((order) => {
      if (order.customer && order.customer.id) {
        if (!customersByID.has(order.customer.id)) {
          customersByID.set(order.customer.id, [])
        }
        customersByID.get(order.customer.id).push(order)
      }
    })

    const customerSegments = {
      newCustomers: Array.from(customersByID.values()).filter((orders) => orders.length === 1).length,
      returningCustomers: Array.from(customersByID.values()).filter((orders) => orders.length > 1).length,
    }

    // Calculate total sales exactly as Shopify does
    const totalSales = orders.reduce((sum, order) => {
      // Only include orders that are not fully refunded
      const isFullyRefunded = refunds.some(
        (refund) => refund.order_id === order.id && Number(refund.total_price) >= Number(order.total_price),
      )

      if (!isFullyRefunded) {
        // Calculate refunds for this order
        const orderRefunds = refunds
          .filter((refund) => refund.order_id === order.id)
          .reduce((refundSum, refund) => refundSum + Number(refund.total_price || 0), 0)

        // Use total_price directly as Shopify does
        const orderTotal = Number(order.total_price || 0)

        return sum + orderTotal - orderRefunds
      }

      return sum
    }, 0)

    console.log("Calculated total sales:", totalSales)
    console.log("Total orders:", orders.length)
    console.log("Total refunds:", refunds.length)
    console.log("Sample order:", orders[0])
    console.log("Sample refund:", refunds[0])
    console.log("Customer segments:", customerSegments)

    res.json({
      orders,
      products: productsResponse.data.products,
      refunds,
      customerSegments,
      totalSales,
    })
  } catch (error) {
    console.error("Error fetching Shopify data:", error.message)
    if (error.response?.status === 401) {
      delete stores[shop]
      return res.status(401).json({
        error: "Authentication expired or store requires password",
        needsReauth: true,
      })
    }
    res.status(500).json({ error: "Failed to fetch Shopify data" })
  }
})

// Meta OAuth routes - match Shopify pattern exactly
app.get("/meta/auth", (req, res) => {
  const { brandId } = req.query
  if (!brandId) {
    return res.status(400).send("Missing brandId parameter")
  }

  console.log("Auth request for Meta, brandId:", brandId)

  const redirectUri = `${process.env.BACKEND_URL}/meta/callback`
  const scopes = "ads_read,ads_management,business_management,pages_read_engagement"
  const state = brandId

  const metaAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${process.env.META_APP_ID}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`

  console.log("Redirecting to Meta auth URL:", metaAuthUrl)
  res.redirect(metaAuthUrl)
})

app.get("/meta/callback", async (req, res) => {
  const { code, state: brandId } = req.query

  if (!code || !brandId) {
    return res.status(400).send("Missing required parameters")
  }

  try {
    console.log("Exchanging code for access token")
    const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        code: code,
        redirect_uri: `${process.env.BACKEND_URL}/meta/callback`
      }
    })

    // Save to Supabase
    const { error: supabaseError } = await supabase
      .from('platform_connections')
      .insert({
        brand_id: brandId,
        platform_type: 'meta',
        access_token: tokenResponse.data.access_token,
        connected_at: new Date().toISOString()
      })

    if (supabaseError) {
      console.error("Error saving to Supabase:", supabaseError)
      return res.status(500).send("Failed to save connection")
    }

    console.log("Successfully saved Meta connection to Supabase")
    res.redirect(`${process.env.FRONTEND_URL}/settings?success=true`)
  } catch (error) {
    console.error("Error in Meta callback:", error.message)
    if (error.response) {
      console.error("Error response:", error.response.data)
    }
    res.redirect(`${process.env.FRONTEND_URL}/settings?error=connection_failed`)
  }
})

app.get("/api/meta/ads", async (req, res) => {
  const accessToken = req.cookies.meta_access_token;

  if (!accessToken) {
    return res.status(401).json({ error: "No access token found" });
  }

  try {
    // Fetch user's ad accounts
    const accountsResponse = await axios.get("https://graph.facebook.com/v17.0/me/adaccounts", {
      params: {
        access_token: accessToken,
        fields: "account_id,name,account_status,amount_spent,balance,currency",
      },
    });

    const adAccounts = accountsResponse.data.data;

    if (adAccounts.length === 0) {
      return res.status(404).json({ error: "No ad accounts found" });
    }

    // Use the first ad account
    const accountId = adAccounts[0].account_id;

    // Get date range for daily data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateRange = `${thirtyDaysAgo.toISOString().split('T')[0]},${new Date().toISOString().split('T')[0]}`;

    const [campaignsResponse, adSetsResponse, insightsResponse, dailyInsightsResponse] = await Promise.all([
      // Fetch campaigns with performance data
      axios.get(`https://graph.facebook.com/v17.0/act_${accountId}/campaigns`, {
        params: {
          access_token: accessToken,
          fields: "name,objective,status,budget_remaining,insights{spend,impressions,clicks,ctr}",
          limit: 10,
        },
      }),
      // Fetch ad sets with performance data
      axios.get(`https://graph.facebook.com/v17.0/act_${accountId}/adsets`, {
        params: {
          access_token: accessToken,
          fields: "name,daily_budget,insights{impressions,clicks,ctr,spend}",
          limit: 10,
        },
      }),
      // Fetch account insights
      axios.get(`https://graph.facebook.com/v17.0/act_${accountId}/insights`, {
        params: {
          access_token: accessToken,
          fields: "spend,impressions,clicks,ctr,cpc,reach,frequency",
          date_preset: "last_30d",
          level: "account",
        },
      }),
      // Fetch daily data for trends
      axios.get(`https://graph.facebook.com/v17.0/act_${accountId}/insights`, {
        params: {
          access_token: accessToken,
          fields: "spend,impressions,clicks",
          level: "account",
          time_increment: 1,
          time_range: `{"since":"${thirtyDaysAgo.toISOString().split('T')[0]}","until":"${new Date().toISOString().split('T')[0]}"}`,
        },
      }),
    ]);

    // Process campaign data to include performance metrics
    const campaigns = campaignsResponse.data.data.map(campaign => ({
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      budget_remaining: campaign.budget_remaining,
      performance: campaign.insights?.data[0] || {
        spend: "0",
        impressions: "0",
        clicks: "0",
        ctr: "0"
      }
    }));

    // Process ad set data
    const adsets = adSetsResponse.data.data.map(adset => ({
      name: adset.name,
      daily_budget: adset.daily_budget,
      ...adset.insights?.data[0] || {
        impressions: "0",
        clicks: "0",
        ctr: "0",
        spend: "0"
      }
    }));

    // Format daily data for charts
    const daily_data = dailyInsightsResponse.data.data.map(day => ({
      date: day.date_start,
      spend: parseFloat(day.spend || 0),
      impressions: parseInt(day.impressions || 0),
      clicks: parseInt(day.clicks || 0)
    }));

    res.json({
      account: adAccounts[0],
      campaigns,
      adsets,
      insights: {
        ...insightsResponse.data.data[0],
        daily_data
      }
    });
  } catch (error) {
    console.error("Error fetching Meta Ads data:", error.response ? error.response.data : error.message);
    res.status(500).json({
      error: "Failed to fetch Meta Ads data",
      details: error.response ? error.response.data : error.message,
    });
  }
});

// Add this new route to disconnect the Meta account
app.post("/api/meta/disconnect", (req, res) => {
  // Clear the Meta access token cookie
  res.clearCookie("meta_access_token");

  console.log("Meta account disconnected");

  res.json({ message: "Meta account disconnected successfully" });
});

// Add this new endpoint to check Meta connection status
app.get("/api/meta/status", (req, res) => {
  const accessToken = req.cookies.meta_access_token
  res.json({ isConnected: !!accessToken })
})

// Meta insights route
app.get("/meta/insights", async (req, res) => {
  const { brandId } = req.query

  if (!brandId) {
    return res.status(400).json({ error: 'Brand ID is required' })
  }

  try {
    // Get Meta access token from Supabase
    const { data: connection, error } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .single()

    if (error || !connection) {
      console.error('Error fetching Meta connection:', error)
      return res.status(404).json({ error: 'Meta connection not found' })
    }

    // Test API call to get ad accounts
    const accountsResponse = await axios.get('https://graph.facebook.com/v18.0/me/adaccounts', {
      params: {
        access_token: connection.access_token,
        fields: 'account_id,name,account_status,amount_spent,balance,currency'
      }
    })

    console.log('Meta Ads API Response:', accountsResponse.data)

    return res.json(accountsResponse.data)
  } catch (error) {
    console.error('Error fetching Meta ads data:', error)
    return res.status(500).json({ error: 'Failed to fetch Meta ads data' })
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
  console.log("Environment variables loaded:")
  console.log("First store URL:", process.env.SHOPIFY_API_URL)
  console.log("Second store URL:", process.env.SECOND_SHOPIFY_API_URL)
  console.log("First store client ID:", process.env.SHOPIFY_CLIENT_ID ? "[REDACTED]" : "Not set")
  console.log("Second store client ID:", process.env.SECOND_SHOPIFY_CLIENT_ID ? "[REDACTED]" : "Not set")
  console.log("Meta Ads API authentication process added")
})

