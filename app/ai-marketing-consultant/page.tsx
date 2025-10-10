"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAgency } from '@/contexts/AgencyContext'
import { useAuth } from '@clerk/nextjs'
import { GridOverlay } from '@/components/GridOverlay'
import { Brain, ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AIMarketingConsultant from '@/components/campaign-management/AIMarketingConsultant'
import { UnifiedLoading } from '@/components/ui/unified-loading'

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
      <UnifiedLoading
        variant="fullscreen"
        title="AI Marketing Consultant"
        message={loadingPhase}
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
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
