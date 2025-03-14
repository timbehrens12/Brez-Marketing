"use client"

import { Loader2 } from "lucide-react"

export function FullPageLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full py-20">
      <img 
        src="/brand/logo.png" 
        alt="Brez Logo" 
        className="h-20 w-auto object-contain mb-8" 
      />
      <div className="flex flex-col items-center">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400 text-sm">Loading your dashboard...</p>
      </div>
    </div>
  )
} 