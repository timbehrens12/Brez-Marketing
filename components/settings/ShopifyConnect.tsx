"use client"

const handleConnect = (brandId: string) => {
  const shopifyAuthUrl = `https://accounts.shopify.com/oauth/authorize?` +
    `client_id=${process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID}` +
    `&scope=read_products,read_orders` +
    `&redirect_uri=${encodeURIComponent('https://brezmarketingdashboard.com/api/auth/callback/shopify')}` +
    `&state=${brandId}`

  window.location.href = shopifyAuthUrl
} 