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
        setTimeout(() => setIsLoadingPage(false), 300)
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
      <div className="w-full min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center relative overflow-hidden py-8 animate-in fade-in duration-300">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Main loading icon */}
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-[#FF2A2A] animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              {agencySettings.agency_logo_url && (
                <img 
                  src={agencySettings.agency_logo_url} 
                  alt={`${agencySettings.agency_name} Logo`} 
                  className="w-12 h-12 object-contain rounded" 
                />
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">
            AI Agency Assistant
          </h1>

          {/* Current phase */}
          <p className="text-gray-400 text-lg mb-6">
            {loadingPhase}
          </p>

          {/* Progress bar */}
          <div className="w-full max-w-md mx-auto mb-6">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>{loadingProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-white/60 to-white/80 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
          </div>

          {/* Loading phases checklist */}
          <div className="text-left space-y-2 text-sm text-gray-400">
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 20 ? 'text-gray-300' : ''}`}>
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 40 ? 'bg-[#FF2A2A]' : loadingProgress >= 20 ? 'bg-white/60' : 'bg-white/20'}`}>
                {loadingProgress >= 40 && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span>Loading agency data</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 40 ? 'text-gray-300' : ''}`}>
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 60 ? 'bg-[#FF2A2A]' : loadingProgress >= 40 ? 'bg-white/60' : 'bg-white/20'}`}>
                {loadingProgress >= 60 && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span>Analyzing your portfolio</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 60 ? 'text-gray-300' : ''}`}>
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 80 ? 'bg-[#FF2A2A]' : loadingProgress >= 60 ? 'bg-white/60' : 'bg-white/20'}`}>
                {loadingProgress >= 80 && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span>Preparing AI insights</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 80 ? 'text-gray-300' : ''}`}>
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 95 ? 'bg-[#FF2A2A]' : loadingProgress >= 80 ? 'bg-white/60' : 'bg-white/20'}`}>
                {loadingProgress >= 95 && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span>Configuring agency assistant</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 95 ? 'text-gray-300' : ''}`}>
              <div className={`w-4 h-4 rounded-full transition-colors duration-300 flex items-center justify-center ${loadingProgress >= 100 ? 'bg-[#FF2A2A]' : loadingProgress >= 95 ? 'bg-white/60' : 'bg-white/20'}`}>
                {loadingProgress >= 100 && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span>Finalizing setup</span>
            </div>
          </div>

          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Preparing your AI agency assistant...
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
