"use client"

import { Check } from "lucide-react"

interface LoadingPhase {
  phase: string
  progressThreshold: number
}

interface UniversalLoadingScreenProps {
  title: string
  loadingPhase: string
  loadingProgress: number
  agencyLogo?: string | null
  agencyName?: string
  sidebarWidth?: number
  loadingPhases?: LoadingPhase[]
}

export function UniversalLoadingScreen({
  title,
  loadingPhase,
  loadingProgress,
  agencyLogo,
  agencyName,
  sidebarWidth = 0,
  loadingPhases = [
    { phase: 'Loading workspace data...', progressThreshold: 25 },
    { phase: 'Generating action items...', progressThreshold: 45 },
    { phase: 'Analyzing brand performance...', progressThreshold: 65 },
    { phase: 'Processing automation tools...', progressThreshold: 80 },
    { phase: 'Finalizing dashboard...', progressThreshold: 85 }
  ]
}: UniversalLoadingScreenProps) {
  return (
    <div 
      className="fixed inset-0 bg-[#0B0B0B] flex items-center justify-center z-[9999] animate-in fade-in duration-300"
      style={{
        width: `calc(100vw - ${sidebarWidth}px)`,
        left: `${sidebarWidth}px`,
      }}>
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }}></div>
      </div>
      
      {/* Glassmorphic card */}
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
                  {agencyLogo && (
                    <img 
                      src={agencyLogo} 
                      alt={`${agencyName} Logo`} 
                      className="w-14 h-14 object-contain" 
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* Title with gradient */}
            <h1 className="text-4xl font-bold bg-gradient-to-br from-white via-white to-gray-400 bg-clip-text text-transparent mb-4 tracking-tight">
              {title}
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg text-gray-300 mb-8 font-medium min-h-[28px]">
              {loadingPhase}
            </p>
            
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-400 mb-3">
                <span>Progress</span>
                <span className="font-mono">{loadingProgress}%</span>
              </div>
              <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                <div 
                  className="h-full bg-gradient-to-r from-[#FF2A2A] via-[#ff4444] to-[#FF2A2A] rounded-full transition-all duration-500 ease-out shadow-lg shadow-[#FF2A2A]/50"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
            </div>
            
            {/* Phase indicators */}
            <div className="space-y-3 text-left">
              {loadingPhases.map((phase, index) => {
                const thresholdReached = loadingProgress >= phase.progressThreshold
                const isActive = loadingProgress >= (index > 0 ? loadingPhases[index - 1].progressThreshold : 0)
                
                return (
                  <div key={index} className={`flex items-center gap-3 transition-all duration-300 ${isActive ? 'text-gray-200 scale-105' : 'text-gray-500'}`}>
                    <div className={`relative w-5 h-5 rounded-full transition-all duration-300 ${thresholdReached ? 'bg-gradient-to-br from-[#FF2A2A] to-[#ff4444] scale-110' : isActive ? 'bg-white/20 scale-105' : 'bg-white/5'}`}>
                      {thresholdReached && (
                        <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                      )}
                    </div>
                    <span className="text-sm">{phase.phase}</span>
                  </div>
                )
              })}
            </div>
            
            {/* Bottom text */}
            <div className="mt-8 text-xs text-gray-500 italic">
              Initializing your comprehensive agency management dashboard...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

