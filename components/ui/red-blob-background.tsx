"use client"

import { cn } from "@/lib/utils"

interface RedBlobBackgroundProps {
  className?: string
  opacity?: number
}

export function RedBlobBackground({ 
  className,
  opacity = 0.12 
}: RedBlobBackgroundProps) {
  return (
    <div className={cn("pointer-events-none fixed inset-0 z-0", className)}>
      {/* Red radial glow - matching landing page */}
      <div 
        className="absolute left-1/2 top-[-20%] -translate-x-1/2 w-[1000px] h-[1000px] rounded-full"
        style={{
          background: `radial-gradient(circle at center, rgba(255,42,42,${opacity}), transparent 60%)`
        }}
      />
    </div>
  )
}
