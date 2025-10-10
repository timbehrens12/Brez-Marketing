"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnifiedLoadingProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "minimal" | "card" | "fullscreen" | "page"
  message?: string
  subMessage?: string
  className?: string
  agencyLogo?: string | null
  agencyName?: string
  showLogo?: boolean
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
  xl: "h-12 w-12"
}

const messageTextClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg"
}

// Page-specific loading configurations
export const pageLoadingConfig = {
  dashboard: {
    message: "Loading Dashboard",
    subMessage: "Setting up your workspace"
  },
  "marketing-assistant": {
    message: "Loading Marketing Assistant", 
    subMessage: "Preparing AI insights"
  },
  "brand-report": {
    message: "Loading Brand Report",
    subMessage: "Analyzing your brand performance"
  },
  "lead-generator": {
    message: "Loading Lead Generator",
    subMessage: "Setting up lead discovery tools"
  },
  "outreach-tool": {
    message: "Loading Outreach Tool",
    subMessage: "Preparing outreach campaigns"
  },
  analytics: {
    message: "Loading Analytics",
    subMessage: "Preparing your performance insights"
  },
  "ad-creative-studio": {
    message: "Loading Ad Creative Studio",
    subMessage: "Setting up your creative workspace"
  },

  orders: {
    message: "Loading Orders",
    subMessage: "Preparing your order data"
  },
  review: {
    message: "Loading Review Demo",
    subMessage: "Setting up Meta integration demo"
  },
  settings: {
    message: "Loading Settings",
    subMessage: "Configuring your preferences"
  }
}

export function UnifiedLoading({ 
  size = "md", 
  variant = "default", 
  message, 
  subMessage,
  className,
  agencyLogo,
  agencyName,
  showLogo = true
}: UnifiedLoadingProps) {
  
  // Render agency logo or initials
  const renderLogo = () => {
    if (!showLogo) return null
    
    if (agencyLogo) {
      return (
        <div className="h-24 w-24 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center p-3 overflow-hidden mb-6 mx-auto">
          <img 
            src={agencyLogo} 
            alt={`${agencyName || 'Agency'} Logo`} 
            className="max-w-full max-h-full object-contain rounded" 
          />
        </div>
      )
    } else if (agencyName && agencyName.trim() !== 'Brez Marketing Assistant') {
      return (
        <div className="h-24 w-24 bg-[#2A2A2A] border border-[#333] rounded-lg flex items-center justify-center mb-6 mx-auto">
          <span className="text-white font-bold text-2xl">
            {agencyName.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )
    }
    
    return null
  }
  
  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Loader2 className={cn("animate-spin text-[#FF2A2A]", sizeClasses[size])} />
      </div>
    )
  }

  if (variant === "fullscreen" || variant === "page") {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center bg-[#0B0B0B]",
        className
      )}>
        {/* Glassmorphic card with red aura */}
        <div className="relative z-10 w-full max-w-lg mx-4">
          <div className="relative border border-white/10 rounded-2xl p-12 shadow-2xl shadow-[#FF2A2A]/20 bg-[#1f1f1f]">
            {/* Red aura glow around the card */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#FF2A2A]/20 via-[#FF2A2A]/30 to-[#FF2A2A]/20 blur-xl -z-10"></div>
            
            <div className="relative z-10 text-center">
              {renderLogo()}
              <Loader2 className={cn("animate-spin text-[#FF2A2A] mx-auto mb-4", sizeClasses[size])} />
              {message && (
                <p className={cn("text-white mb-2 font-medium", messageTextClasses[size])}>
                  {message}
                </p>
              )}
              {subMessage && (
                <p className={cn("text-gray-400", messageTextClasses[size === "xl" ? "md" : "sm"])}>
                  {subMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-12 px-6 bg-[#1A1A1A] rounded-lg border border-[#333]",
        className
      )}>
        {showLogo && renderLogo()}
        <Loader2 className={cn("animate-spin text-[#FF2A2A] mb-4", sizeClasses[size])} />
        {message && (
          <p className={cn("text-white text-center mb-2 font-medium", messageTextClasses[size])}>
            {message}
          </p>
        )}
        {subMessage && (
          <p className={cn("text-gray-400 text-center", messageTextClasses[size === "xl" ? "md" : "sm"])}>
            {subMessage}
          </p>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      {showLogo && renderLogo()}
      <Loader2 className={cn("animate-spin text-[#FF2A2A] mb-4", sizeClasses[size])} />
      {message && (
        <p className={cn("text-white text-center mb-2 font-medium", messageTextClasses[size])}>
          {message}
        </p>
      )}
      {subMessage && (
        <p className={cn("text-gray-400 text-center", messageTextClasses[size === "xl" ? "md" : "sm"])}>
          {subMessage}
        </p>
      )}
    </div>
  )
}

// Helper function to get page loading config from pathname
export function getPageLoadingConfig(pathname: string) {
  const pageName = pathname.split('/')[1] || 'dashboard'
  return pageLoadingConfig[pageName as keyof typeof pageLoadingConfig] || pageLoadingConfig.dashboard
} 