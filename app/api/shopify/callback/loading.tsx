import React from 'react'

export default function ShopifyCallbackLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <h1 className="text-xl font-semibold text-white">Connecting your Shopify store...</h1>
      <p className="text-gray-400 mt-2">Please wait while we complete the connection process.</p>
    </div>
  )
} 