"use client"

import { useState } from "react"

const ShopifyConnect = () => {
  const [shopUrl, setShopUrl] = useState("")
  const [error, setError] = useState("")

  const handleShopUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShopUrl(e.target.value)
    setError("")
  }

  const handleConnect = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!shopUrl) {
      setError("Please enter a shop URL")
      return
    }

    try {
      // Instead of fetching and expecting JSON, we'll redirect directly
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/shopify/auth?shop=${shopUrl}`
    } catch (error) {
      setError("An error occurred while connecting to Shopify")
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Connect your Shopify store</h2>
          <p className="mt-2 text-gray-600">Enter your Shopify store URL to get started</p>
        </div>
        <form onSubmit={handleConnect} className="mt-8 space-y-6">
          <div className="space-y-2">
            <label htmlFor="shopUrl" className="block text-sm font-medium text-gray-700">
              Shop URL
            </label>
            <div className="mt-1">
              <input
                type="text"
                id="shopUrl"
                value={shopUrl}
                onChange={handleShopUrlChange}
                placeholder="yourstore.myshopify.com"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Connect to Shopify
          </button>
        </form>
      </div>
    </div>
  )
}

export default ShopifyConnect

