"use client"

import { Loader2 } from "lucide-react"

interface WidgetLoadingOverlayProps {
  isLoading: boolean
}

export function WidgetLoadingOverlay({ isLoading }: WidgetLoadingOverlayProps) {
  if (!isLoading) return null
  
  return (
    <div className="absolute top-2 right-2 z-10">
      <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    </div>
  )
} 