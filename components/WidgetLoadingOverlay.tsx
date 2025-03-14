"use client"

import { Loader2 } from "lucide-react"

interface WidgetLoadingOverlayProps {
  isLoading: boolean
}

export function WidgetLoadingOverlay({ isLoading }: WidgetLoadingOverlayProps) {
  if (!isLoading) return null
  
  return (
    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
      <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
    </div>
  )
} 