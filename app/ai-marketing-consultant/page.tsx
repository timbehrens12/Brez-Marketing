"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAgency } from '@/contexts/AgencyContext'
import { useAuth } from '@clerk/nextjs'
import { GridOverlay } from '@/components/GridOverlay'
import { Brain, ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AIMarketingConsultant from '@/components/campaign-management/AIMarketingConsultant'

export default function AIMarketingConsultantPage() {
  const router = useRouter()
  const { agencySettings } = useAgency()
  const { userId } = useAuth()
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingPhase, setLoadingPhase] = useState('Initializing AI assistant...')

  // Simulate loading with progress phases
  useEffect(() => {
    if (!userId) return

    const phases = [
      { progress: 20, phase: 'Loading your agency data...', duration: 800 },
      { progress: 40, phase: 'Analyzing your portfolio...', duration: 1000 },
      { progress: 60, phase: 'Preparing AI insights...', duration: 900 },
      { progress: 80, phase: 'Configuring agency assistant...', duration: 700 },
      { progress: 95, phase: 'Almost ready...', duration: 500 },
      { progress: 100, phase: 'Welcome to your AI Agency Assistant!', duration: 300 }
    ]

    let currentPhaseIndex = 0

    const runPhase = () => {
      if (currentPhaseIndex >= phases.length) {
        setIsLoadingPage(false)
        return
      }

      const currentPhase = phases[currentPhaseIndex]
      setLoadingProgress(currentPhase.progress)
      setLoadingPhase(currentPhase.phase)

      setTimeout(() => {
        currentPhaseIndex++
        runPhase()
      }, currentPhase.duration)
    }

    // Start the loading sequence after a brief moment
    setTimeout(runPhase, 500)
  }, [userId])



  // Show loading screen while initializing
  if (isLoadingPage) {
    return (
      <div className="w-full min-h-screen bg-[#0B0B0B] flex items-center justify-center relative overflow-hidden">
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
                    {agencySettings.agency_logo_url && (
                      <img 
                        src={agencySettings.agency_logo_url} 
                        alt={`${agencySettings.agency_name} Logo`} 
                        className="w-14 h-14 object-contain" 
                      />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Title with gradient */}
              <h1 className="text-4xl font-bold bg-gradient-to-br from-white via-white to-gray-400 bg-clip-text text-transparent mb-4 tracking-tight">
                AI Agency Assistant
              </h1>
              
              {/* Subtitle */}
              <p className="text-lg text-gray-300 mb-8 font-medium">
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
                <div className={`flex items-center gap-3 transition-all duration-300 ${loadingProgress >= 20 ? 'text-gray-200 scale-105' : 'text-gray-500'}`}>
                  <div className={`relative w-5 h-5 rounded-full transition-all duration-300 ${loadingProgress >= 40 ? 'bg-gradient-to-br from-[#FF2A2A] to-[#ff4444] scale-110' : loadingProgress >= 20 ? 'bg-white/20 scale-105' : 'bg-white/5'}`}>
                    {loadingProgress >= 40 && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-[#FF2A2A]/30 blur-md animate-pulse"></div>
                        <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                      </>
                    )}
                  </div>
                  <span className="text-sm">Loading agency data</span>
                </div>
                <div className={`flex items-center gap-3 transition-all duration-300 ${loadingProgress >= 40 ? 'text-gray-200 scale-105' : 'text-gray-500'}`}>
                  <div className={`relative w-5 h-5 rounded-full transition-all duration-300 ${loadingProgress >= 60 ? 'bg-gradient-to-br from-[#FF2A2A] to-[#ff4444] scale-110' : loadingProgress >= 40 ? 'bg-white/20 scale-105' : 'bg-white/5'}`}>
                    {loadingProgress >= 60 && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-[#FF2A2A]/30 blur-md animate-pulse"></div>
                        <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                      </>
                    )}
                  </div>
                  <span className="text-sm">Analyzing your portfolio</span>
                </div>
                <div className={`flex items-center gap-3 transition-all duration-300 ${loadingProgress >= 60 ? 'text-gray-200 scale-105' : 'text-gray-500'}`}>
                  <div className={`relative w-5 h-5 rounded-full transition-all duration-300 ${loadingProgress >= 80 ? 'bg-gradient-to-br from-[#FF2A2A] to-[#ff4444] scale-110' : loadingProgress >= 60 ? 'bg-white/20 scale-105' : 'bg-white/5'}`}>
                    {loadingProgress >= 80 && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-[#FF2A2A]/30 blur-md animate-pulse"></div>
                        <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                      </>
                    )}
                  </div>
                  <span className="text-sm">Preparing AI insights</span>
                </div>
                <div className={`flex items-center gap-3 transition-all duration-300 ${loadingProgress >= 80 ? 'text-gray-200 scale-105' : 'text-gray-500'}`}>
                  <div className={`relative w-5 h-5 rounded-full transition-all duration-300 ${loadingProgress >= 95 ? 'bg-gradient-to-br from-[#FF2A2A] to-[#ff4444] scale-110' : loadingProgress >= 80 ? 'bg-white/20 scale-105' : 'bg-white/5'}`}>
                    {loadingProgress >= 95 && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-[#FF2A2A]/30 blur-md animate-pulse"></div>
                        <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                      </>
                    )}
                  </div>
                  <span className="text-sm">Configuring agency assistant</span>
                </div>
                <div className={`flex items-center gap-3 transition-all duration-300 ${loadingProgress >= 95 ? 'text-gray-200 scale-105' : 'text-gray-500'}`}>
                  <div className={`relative w-5 h-5 rounded-full transition-all duration-300 ${loadingProgress >= 100 ? 'bg-gradient-to-br from-[#FF2A2A] to-[#ff4444] scale-110' : loadingProgress >= 95 ? 'bg-white/20 scale-105' : 'bg-white/5'}`}>
                    {loadingProgress >= 100 && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-[#FF2A2A]/30 blur-md animate-pulse"></div>
                        <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                      </>
                    )}
                  </div>
                  <span className="text-sm">Finalizing setup</span>
                </div>
              </div>
              
              {/* Bottom text */}
              <div className="mt-8 text-sm text-gray-400 italic">
                Preparing your AI agency assistant...
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show the main AI Marketing Consultant interface
  return (
    <div className="w-full min-h-screen bg-[#0B0B0B] animate-in fade-in duration-300 relative">
      <GridOverlay />
      <div className="relative z-10">
        <AIMarketingConsultant />
      </div>
    </div>
  )
}
