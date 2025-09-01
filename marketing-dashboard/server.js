import express from "express"
import dotenv from "dotenv"
import axios from "axios"
import cors from "cors"
import crypto from "crypto"
import cookieParser from "cookie-parser"

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
  const shop = req.query.shop
  if (!shop) {
    return res.status(400).send("Missing shop parameter")
  }

  console.log("Auth request for shop:", shop)
  const credentials = getStoreCredentials(shop)

  if (!credentials) {
    console.log("No credentials found for shop:", shop)
    return res.status(400).send("No credentials found for this shop")
  }

  console.log("Initiating OAuth flow for shop:", shop)
  const redirectUri = `${process.env.BACKEND_URL}/shopify/callback`
  const scopes = "read_orders,read_products,read_customers,read_discounts,read_inventory"
  const nonce = crypto.randomBytes(16).toString("hex")
  const shopifyAuthUrl = `https://${shop}/admin/oauth/authorize?client_id=${credentials.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${nonce}`

  // Set cookie with proper options
  res.cookie("shopify_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 1000, // 1 hour
  })

  console.log("Redirecting to Shopify auth URL:", shopifyAuthUrl)
  res.redirect(shopifyAuthUrl)
})

app.get("/", (req, res) => {
  res.send("Backend server is running")
})

// Shopify OAuth callback
app.get("/shopify/callback", async (req, res) => {
  const { code, shop, state } = req.query
  const storedNonce = req.cookies.shopify_nonce

  console.log("Callback received:", { shop, state, hasNonce: !!storedNonce })

  // Verify the state matches the stored nonce
  if (!storedNonce || state !== storedNonce) {
    console.error("Nonce verification failed:", {
      receivedState: state,
      storedNonce: storedNonce,
    })
    return res.status(403).send("Invalid state parameter")
  }

  if (!code || !shop) {
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

app.get("/api/meta/auth", (req, res) => {
  console.log("Meta auth route hit")
  const redirectUri = `${process.env.BACKEND_URL}/api/meta/callback`
  const scopes = "ads_read,ads_management,read_insights"
  const state = crypto.randomBytes(16).toString("hex")

  res.cookie("meta_auth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60 * 1000, // 10 minutes
  })

  const authUrl = new URL("https://www.facebook.com/v17.0/dialog/oauth")
  authUrl.searchParams.append("client_id", process.env.META_APP_ID)
  authUrl.searchParams.append("redirect_uri", redirectUri)
  authUrl.searchParams.append("scope", scopes)
  authUrl.searchParams.append("state", state)
  authUrl.searchParams.append("response_type", "code")

  console.log("Initiating Meta Ads authentication. Redirect URL:", redirectUri)
  console.log("Full Auth URL:", authUrl.toString())
  res.redirect(authUrl.toString())
})

// Meta Ads Authentication Callback
app.get("/api/meta/callback", async (req, res) => {
  const { code, state } = req.query
  const storedState = req.cookies.meta_auth_state
  const redirectUri = `${process.env.BACKEND_URL}/api/meta/callback`

  if (state !== storedState) {
    return res.status(400).send("Invalid state parameter")
  }

  try {
    const tokenResponse = await axios.get("https://graph.facebook.com/v17.0/oauth/access_token", {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: redirectUri,
        code: code,
      },
    })

    const accessToken = tokenResponse.data.access_token

    // In a real app, store this token securely
    console.log("Access Token received:", accessToken)

    res.cookie("meta_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
      domain: process.env.NODE_ENV === "production" ? ".brezmarketingdashboard.com" : "localhost"
    })

    res.redirect(`${process.env.FRONTEND_URL}/settings?meta_connected=true`)
  } catch (error) {
    console.error("Error in Meta callback:", error.response ? error.response.data : error.message)
    res.redirect(
      `${process.env.FRONTEND_URL}/settings?meta_connected=false&error=${encodeURIComponent(error.message)}`
    )
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
  console.log("Environment variables loaded:")
  console.log("First store URL:", process.env.SHOPIFY_API_URL)
  console.log("Second store URL:", process.env.SECOND_SHOPIFY_API_URL)
  console.log("First store client ID:", process.env.SHOPIFY_CLIENT_ID ? "[REDACTED]" : "Not set")
  console.log("Second store client ID:", process.env.SECOND_SHOPIFY_CLIENT_ID ? "[REDACTED]" : "Not set")
  console.log("Meta Ads API authentication process added")
})

