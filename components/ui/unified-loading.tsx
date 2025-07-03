"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnifiedLoadingProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "minimal" | "card" | "fullscreen" | "page"
  message?: string
  subMessage?: string
  className?: string
  page?: "dashboard" | "marketing-assistant" | "brand-report" | "lead-generator" | "outreach" | "settings" | "analytics"
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
    message: "Loading Dashboard",
    subMessage: "Setting up your workspace"
  },
  "marketing-assistant": {
    message: "Loading Marketing Assistant",
    subMessage: "Preparing AI-powered insights"
  },
  "brand-report": {
    message: "Loading Brand Report",
    subMessage: "Analyzing your marketing performance"
  },
  "lead-generator": {
    message: "Loading Lead Generator",
    subMessage: "Setting up lead discovery tools"
  },
  outreach: {
    message: "Loading Outreach Tool",
    subMessage: "Preparing your outreach campaigns"
  },
  settings: {
    message: "Loading Settings",
    subMessage: "Configuring your preferences"
  },
  analytics: {
    message: "Loading Analytics",
    subMessage: "Gathering performance data"
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
  
  // Use page-specific messages if page is provided and no custom messages
  const finalMessage = message || (page ? pageMessages[page]?.message : undefined)
  const finalSubMessage = subMessage || (page ? pageMessages[page]?.subMessage : undefined)
  
  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Loader2 className={cn("animate-spin text-white", sizeClasses[size])} />
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
          {finalMessage && (
            <p className={cn("text-white font-medium mb-2", messageTextClasses[size])}>
              {finalMessage}
            </p>
          )}
          {finalSubMessage && (
            <p className={cn("text-gray-400", messageTextClasses[size === "xl" ? "md" : "sm"])}>
              {finalSubMessage}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (variant === "page") {
    return (
      <div className={cn(
        "min-h-[60vh] flex items-center justify-center",
        className
      )}>
        <div className="text-center">
          <Loader2 className={cn("animate-spin text-white mx-auto mb-4", sizeClasses[size])} />
          {finalMessage && (
            <p className={cn("text-white font-medium mb-2", messageTextClasses[size])}>
              {finalMessage}
            </p>
          )}
          {finalSubMessage && (
            <p className={cn("text-gray-400", messageTextClasses[size === "xl" ? "md" : "sm"])}>
              {finalSubMessage}
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
        {finalMessage && (
          <p className={cn("text-white font-medium text-center mb-2", messageTextClasses[size])}>
            {finalMessage}
          </p>
        )}
        {finalSubMessage && (
          <p className={cn("text-gray-400 text-center", messageTextClasses[size === "xl" ? "md" : "sm"])}>
            {finalSubMessage}
          </p>
        )}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <Loader2 className={cn("animate-spin text-white mb-4", sizeClasses[size])} />
      {finalMessage && (
        <p className={cn("text-white font-medium text-center mb-2", messageTextClasses[size])}>
          {finalMessage}
        </p>
      )}
      {finalSubMessage && (
        <p className={cn("text-gray-400 text-center", messageTextClasses[size === "xl" ? "md" : "sm"])}>
          {finalSubMessage}
        </p>
      )}
    </div>
  )
} 