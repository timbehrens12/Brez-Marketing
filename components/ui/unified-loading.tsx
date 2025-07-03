"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnifiedLoadingProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "minimal" | "card" | "fullscreen" | "page"
  message?: string
  subMessage?: string
  className?: string
  page?: "dashboard" | "marketing-assistant" | "brand-report" | "lead-generator" | "outreach" | "settings"
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

const pageMessages = {
  dashboard: {
    title: "Loading Dashboard",
    subtitle: "Setting up your workspace"
  },
  "marketing-assistant": {
    title: "Loading Marketing Assistant",
    subtitle: "Preparing AI-powered marketing tools"
  },
  "brand-report": {
    title: "Loading Brand Report",
    subtitle: "Compiling your performance insights"
  },
  "lead-generator": {
    title: "Loading Lead Generator",
    subtitle: "Initializing prospecting tools"
  },
  outreach: {
    title: "Loading Outreach Tool",
    subtitle: "Setting up your campaign management"
  },
  settings: {
    title: "Loading Settings",
    subtitle: "Configuring your account preferences"
  }
}

export function UnifiedLoading({ 
  size = "md", 
  variant = "default", 
  message, 
  subMessage,
  className,
  page 
}: UnifiedLoadingProps) {
  
  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Loader2 className={cn("animate-spin text-white", sizeClasses[size])} />
      </div>
    )
  }

  if (variant === "page") {
    const pageData = page ? pageMessages[page] : null
    const displayTitle = message || pageData?.title || "Loading"
    const displaySubtitle = subMessage || pageData?.subtitle || "Please wait..."

    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center bg-[#0A0A0A]",
        className
      )}>
        <div className="text-center">
          <img 
            src="https://i.imgur.com/PZCtbwG.png" 
            alt="Brez Logo" 
            className="h-16 w-auto object-contain mx-auto mb-8" 
          />
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-white mb-3">
            {displayTitle}
          </h2>
          <p className="text-gray-400 text-sm">
            {displaySubtitle}
          </p>
        </div>
      </div>
    )
  }

  if (variant === "fullscreen") {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center bg-[#0A0A0A]",
        className
      )}>
        <div className="text-center">
          <img 
            src="https://i.imgur.com/PZCtbwG.png" 
            alt="Brez Logo" 
            className="h-16 w-auto object-contain mx-auto mb-6" 
          />
          <Loader2 className={cn("animate-spin text-white mx-auto mb-4", sizeClasses[size])} />
          {message && (
            <p className={cn("text-white mb-2", messageTextClasses[size])}>
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
    )
  }

  if (variant === "card") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center py-12 px-6 bg-[#1A1A1A] rounded-lg border border-[#333]",
        className
      )}>
        <Loader2 className={cn("animate-spin text-white mb-4", sizeClasses[size])} />
        {message && (
          <p className={cn("text-gray-300 text-center mb-2", messageTextClasses[size])}>
            {message}
          </p>
        )}
        {subMessage && (
          <p className={cn("text-gray-500 text-center", messageTextClasses[size === "xl" ? "md" : "sm"])}>
            {subMessage}
          </p>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <Loader2 className={cn("animate-spin text-white mb-4", sizeClasses[size])} />
      {message && (
        <p className={cn("text-gray-300 text-center mb-2", messageTextClasses[size])}>
          {message}
        </p>
      )}
      {subMessage && (
        <p className={cn("text-gray-500 text-center", messageTextClasses[size === "xl" ? "md" : "sm"])}>
          {subMessage}
        </p>
      )}
    </div>
  )
} 