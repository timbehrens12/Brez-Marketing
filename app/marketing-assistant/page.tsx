"use client"

import { useState, useEffect } from "react"
import { UnifiedLoading } from "@/components/ui/unified-loading"

export default function MarketingAssistantPage() {
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])
  
  if (isLoading) {
    return (
      <UnifiedLoading
        size="lg"
        variant="page"
        page="marketing-assistant"
      />
    )
  }
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white">Marketing Assistant</h1>
        <p className="text-gray-400 mt-2">Ready to build something amazing.</p>
      </div>
    </div>
  )
} 