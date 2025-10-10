"use client"

import { Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnifiedLoadingProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "minimal" | "card" | "fullscreen" | "page"
  title?: string
  message?: string
  progress?: number
  loadingPhase?: string
  className?: string
  agencyLogo?: string | null
  agencyName?: string
  showLogo?: boolean
  showProgress?: boolean
  phases?: string[]
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
    title: "Dashboard",
    message: "Setting up your workspace"
  },
  "marketing-assistant": {
    title: "Marketing Assistant", 
    message: "Preparing AI insights"
  },
  "ai-marketing-consultant": {
    title: "AI Marketing Consultant",
    message: "Initializing AI consultant"
  },
  "brand-report": {
    title: "Brand Report",
    message: "Analyzing your brand performance"
  },
  "lead-generator": {
    title: "Lead Generator",
    message: "Setting up lead discovery tools"
  },
  "outreach-tool": {
    title: "Outreach Tool",
    message: "Preparing outreach campaigns"
  },
  "action-center": {
    title: "Action Center",
    message: "Loading action items"
  },
  "ai-dashboard": {
    title: "AI Dashboard",
    message: "Connecting to AI services"
  },
  analytics: {
    title: "Analytics",
    message: "Preparing your performance insights"
  },
  "ad-creative-studio": {
    title: "Ad Creative Studio",
    message: "Setting up your creative workspace"
  },
  orders: {
    title: "Orders",
    message: "Preparing your order data"
  },
  review: {
    title: "Review Demo",
    message: "Setting up Meta integration demo"
  },
  settings: {
    title: "Settings",
    message: "Configuring your preferences"
  }
}

export function UnifiedLoading({ 
  size = "md", 
  variant = "default", 
  title,
  message, 
  progress,
  loadingPhase,
  className,
  agencyLogo,
  agencyName,
  showLogo = true,
  showProgress = false,
  phases = []
}: UnifiedLoadingProps) {
  
  // Render agency logo or initials
  const renderLogo = () => {
    if (!showLogo) return null
    
    if (agencyLogo) {
      return (
        <img 
          src={agencyLogo} 
          alt={`${agencyName || 'Agency'} Logo`} 
          className="w-14 h-14 object-contain" 
        />
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
      <div 
        className={cn("min-h-screen flex items-center justify-center bg-[#0B0B0B] relative overflow-hidden", className)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
        }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        {/* Loading card */}
        <div className="relative z-10 w-full max-w-lg mx-4">
          <div className="relative border border-white/10 rounded-2xl p-12 shadow-2xl shadow-[#FF2A2A]/20 bg-[#1f1f1f]">
            {/* Red aura glow around the card */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#FF2A2A]/20 via-[#FF2A2A]/30 to-[#FF2A2A]/20 blur-xl -z-10"></div>
            
            <div className="relative z-10 text-center">
              {/* Enhanced spinner with glow */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                {/* Pulsing glow ring */}
                <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl animate-pulse"></div>
                
                {/* Spinner */}
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white/60 border-r-white/30 animate-spin"></div>
                  
                  {/* Logo container */}
                  <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm flex items-center justify-center">
                    {renderLogo()}
                  </div>
                </div>
              </div>
              
              {/* Title with gradient */}
              <h1 className="text-4xl font-bold bg-gradient-to-br from-white via-white to-gray-400 bg-clip-text text-transparent mb-4 tracking-tight">
                {title || "Loading"}
              </h1>
              
              {/* Subtitle */}
              <p className="text-lg text-gray-300 mb-8 font-medium min-h-[28px]">
                {loadingPhase || message || "Please wait..."}
              </p>
              
              {/* Progress bar (if enabled) */}
              {showProgress && progress !== undefined && (
                <div className="mb-8">
                  <div className="flex justify-between text-sm text-gray-400 mb-3">
                    <span>Progress</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                  <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    <div 
                      className="h-full bg-gradient-to-r from-[#FF2A2A] via-[#ff4444] to-[#FF2A2A] rounded-full transition-all duration-500 ease-out shadow-lg shadow-[#FF2A2A]/50"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Phase indicators (if provided) */}
              {phases.length > 0 && progress !== undefined && (
                <div className="space-y-3 text-left">
                  {phases.map((phase, index) => {
                    const threshold = ((index + 1) / phases.length) * 100
                    const isActive = progress >= threshold - 20
                    const isComplete = progress >= threshold
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex items-center gap-3 transition-all duration-300 ${isActive ? 'text-gray-200 scale-105' : 'text-gray-500'}`}
                      >
                        <div className={`relative w-5 h-5 rounded-full transition-all duration-300 ${isComplete ? 'bg-gradient-to-br from-[#FF2A2A] to-[#ff4444] scale-110' : isActive ? 'bg-white/20 scale-105' : 'bg-white/5'}`}>
                          {isComplete && (
                            <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                          )}
                        </div>
                        <span className="text-sm">{phase}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              
              {/* Bottom text (if no phases) */}
              {phases.length === 0 && (
                <div className="mt-8 text-xs text-gray-500 italic">
                  {message || "Initializing your workspace..."}
                </div>
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
    </div>
  )
}

// Helper function to get page loading config from pathname
export function getPageLoadingConfig(pathname: string) {
  const pageName = pathname.split('/')[1] || 'dashboard'
  return pageLoadingConfig[pageName as keyof typeof pageLoadingConfig] || pageLoadingConfig.dashboard
}
