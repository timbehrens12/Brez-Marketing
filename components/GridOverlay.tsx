"use client"

import { cn } from "@/lib/utils"

interface GridOverlayProps {
  className?: string
  gridSize?: number
  opacity?: number
  color?: string
}

export function GridOverlay({
  className,
  gridSize = 40,
  opacity = 0.1,
  color = "#ffffff"
}: GridOverlayProps) {
  const gridPattern = `
    <svg width="${gridSize}" height="${gridSize}" viewBox="0 0 ${gridSize} ${gridSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
          <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="${color}" stroke-width="0.5" opacity="${opacity}"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  `

  return (
    <div
      className={cn(
        "fixed inset-0 pointer-events-none z-0",
        className
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(gridPattern)}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${gridSize}px ${gridSize}px`
      }}
    />
  )
}
