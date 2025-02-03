import express from "express"
import dotenv from "dotenv"
import axios from "axios"
import cors from "cors"

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

app.use(express.json())
app.use(cors())

// In-memory store for simplicity. In a production app, use a database.
const stores = {}

function getStoreCredentials(shop) {
  // Remove https:// and trailing slash if present
  const cleanShopUrl = shop.replace("https://", "").replace(/\/$/, "")

  // First store check
  const firstStoreUrl = process.env.SHOPIFY_API_URL.replace("https://", "").replace(/\/$/, "")
  if (cleanShopUrl === firstStoreUrl) {
    return {
      clientId: process.env.SHOPIFY_CLIENT_ID,
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
    }
  }

  // Second store check
  const secondStoreUrl = process.env.SECOND_SHOPIFY_API_URL.replace("https://", "").replace(/\/$/, "")
  if (cleanShopUrl === secondStoreUrl) {
    return {
      clientId: process.env.SECOND_SHOPIFY_CLIENT_ID,
      clientSecret: process.env.SECOND_SHOPIFY_CLIENT_SECRET,
    }
  }

  console.log("Store URL comparison:", {
    requested: cleanShopUrl,
    firstStore: firstStoreUrl,
    secondStore: secondStoreUrl,
  })

  return null
}

// Shopify OAuth initiation endpoint
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
  // Update these scopes based on what you see in the API access section
  const scopes = "read_orders,read_products"
  const shopifyAuthUrl = `https://${shop}/admin/oauth/authorize?client_id=${
    credentials.clientId
  }&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(shop)}`

  console.log("Redirecting to Shopify auth URL:", shopifyAuthUrl)
  res.redirect(shopifyAuthUrl)
})

// Shopify OAuth callback
app.get("/shopify/callback", async (req, res) => {
  const { code, shop, state } = req.query

  if (!code || !shop || shop !== state) {
    return res.status(400).send("Invalid parameters")
  }

  const credentials = getStoreCredentials(shop)
  if (!credentials) {
    return res.status(400).send("No credentials found for this shop")
  }

  try {
    console.log("Receiving callback for shop:", shop)
    const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code,
    })

    stores[shop] = {
      accessToken: tokenResponse.data.access_token,
      lastTokenRefresh: new Date(),
    }

    console.log("New access token received for shop:", shop)
    res.redirect(`${process.env.FRONTEND_URL}?shop=${encodeURIComponent(shop)}`)
  } catch (error) {
    console.error("Error getting access token:", error.message)
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

// Shopify API route
app.get("/api/shopify/sales", async (req, res) => {
  const { shop } = req.query

  if (!shop || !stores[shop]) {
    return res.status(400).json({ error: "Invalid or missing shop parameter" })
  }

  const storeData = stores[shop]

  console.log("\n--- New Order Request ---")
  console.log("Time:", new Date().toISOString())
  console.log("Shop:", shop)
  console.log("Access Token Status:", storeData.accessToken ? "Present" : "Missing")
  console.log("Token Age:", Math.round((new Date() - storeData.lastTokenRefresh) / 1000 / 60), "minutes")

  try {
    console.log("Fetching orders from shop:", shop)

    const response = await axios.get(`https://${shop}/admin/api/2023-04/orders.json`, {
      headers: {
        "X-Shopify-Access-Token": storeData.accessToken,
      },
      params: {
        status: "any",
        limit: 50,
      },
    })

    console.log("Orders fetched successfully")
    console.log("Number of orders:", response.data.orders.length)
    res.json(response.data)
  } catch (error) {
    console.error("Error fetching Shopify data:", error.message)
    console.error("Full error object:", JSON.stringify(error, null, 2))
    if (error.response) {
      console.error("Error response data:", error.response.data)
      console.error("Error response status:", error.response.status)
      console.error("Error response headers:", error.response.headers)
    }
    if (error.response?.status === 403) {
      console.log("403 Forbidden error. Current scopes might be insufficient.")
      return res.status(403).json({
        error: "Insufficient permissions. Please re-authenticate.",
        needsReauth: true,
      })
    }
    if (error.response?.status === 401) {
      console.log("Token expired or invalid for shop:", shop)
      delete stores[shop]
      return res.status(401).json({
        error: "Authentication expired. Please re-authenticate.",
        needsReauth: true,
      })
    }
    res.status(500).json({
      error: "Failed to fetch Shopify data",
      details: error.message,
    })
  }
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
  console.log("Environment variables loaded:")
  console.log("First store URL:", process.env.SHOPIFY_API_URL)
  console.log("Second store URL:", process.env.SECOND_SHOPIFY_API_URL)
  console.log("First store client ID:", process.env.SHOPIFY_CLIENT_ID ? "[REDACTED]" : "Not set")
  console.log("Second store client ID:", process.env.SECOND_SHOPIFY_CLIENT_ID ? "[REDACTED]" : "Not set")
})

