"use client"

import { Loader2 } from "lucide-react"

export function FullPageLoading() {
  return (
    <div className="absolute inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center z-10">
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