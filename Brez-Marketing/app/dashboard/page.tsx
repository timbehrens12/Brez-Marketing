"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardPage() {
  const { isLoaded, userId } = useAuth()
  const router = useRouter()

  // If not authenticated, redirect to sign-in (middleware should handle this, but just in case)
  useEffect(() => {
    if (isLoaded && !userId) {
      router.push('/sign-in')
    }
  }, [isLoaded, userId, router])

  // Show loading while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
            </div>
      </div>
    )
  }

    // Main dashboard content
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Total Sales</h3>
            <p className="text-3xl font-bold">$0</p>
                </div>
                
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Orders</h3>
            <p className="text-3xl font-bold">0</p>
                </div>
                
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">Customers</h3>
            <p className="text-3xl font-bold">0</p>
                  </div>
                </div>
                
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Welcome to Your Dashboard</h2>
          <p className="text-gray-400">
            Connect your platforms to see analytics and insights here.
          </p>
                </div>
              </div>
            </div>
  )
}
