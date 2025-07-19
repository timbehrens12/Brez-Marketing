"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette, Zap, Sparkles, Brain, Brush, Image, Target, Wand2 } from 'lucide-react'
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"

export default function AdCreativeStudioPage() {
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState<string>('Initializing Creative Studio')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const { agencySettings } = useAgency()
  const pathname = usePathname()

  useEffect(() => {
    // Progressive loading simulation for creative studio
    const loadCreativeStudio = async () => {
      // Phase 1: Initialize Creative Studio
      setLoadingPhase('Initializing Creative Studio')
      setLoadingProgress(15)
      await new Promise(resolve => setTimeout(resolve, 600))

      // Phase 2: Loading AI Models
      setLoadingPhase('Loading AI creative models')
      setLoadingProgress(35)
      await new Promise(resolve => setTimeout(resolve, 800))

      // Phase 3: Setting up Templates
      setLoadingPhase('Setting up creative templates')
      setLoadingProgress(55)
      await new Promise(resolve => setTimeout(resolve, 700))

      // Phase 4: Preparing Asset Library
      setLoadingPhase('Preparing asset library')
      setLoadingProgress(75)
      await new Promise(resolve => setTimeout(resolve, 600))

      // Phase 5: Finalizing Workspace
      setLoadingPhase('Finalizing creative workspace')
      setLoadingProgress(95)
      await new Promise(resolve => setTimeout(resolve, 500))

      setLoadingProgress(100)
      setLoadingPhase('Creative Studio ready!')
      
      // Brief pause to show completion
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setIsLoadingPage(false)
    }

    loadCreativeStudio()
  }, [])

  // Show progressive loading state
  if (isLoadingPage) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A] flex items-center justify-center z-50">
        <div className="text-center space-y-8 max-w-md mx-auto px-6">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            {agencySettings?.agency_logo_url ? (
              <img 
                src={agencySettings.agency_logo_url} 
                alt={agencySettings.agency_name || 'Agency'}
                className="h-12 w-auto"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center">
                <Palette className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          {/* Main Loading Animation */}
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
              <div className="absolute inset-2 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-full flex items-center justify-center">
                <Brain className="w-8 h-8 text-white animate-pulse" />
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            
            {/* Loading Phase */}
            <h2 className="text-xl font-semibold text-white mb-2 animate-pulse">
              {loadingPhase}
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {loadingProgress}% complete
            </p>
          </div>

          {/* Loading Steps */}
          <div className="text-left space-y-2 text-sm text-gray-400">
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 15 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 15 ? 'bg-green-400' : 'bg-white/20'}`}></div>
              <Brain className="w-4 h-4" />
              <span>Loading AI creative models</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 35 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 35 ? 'bg-green-400' : 'bg-white/20'}`}></div>
              <Brush className="w-4 h-4" />
              <span>Setting up creative templates</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 55 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 55 ? 'bg-green-400' : 'bg-white/20'}`}></div>
              <Image className="w-4 h-4" />
              <span>Preparing asset library</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 75 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 75 ? 'bg-green-400' : 'bg-white/20'}`}></div>
              <Target className="w-4 h-4" />
              <span>Finalizing creative workspace</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 95 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 95 ? 'bg-green-400' : 'bg-white/20'}`}></div>
              <Wand2 className="w-4 h-4" />
              <span>Studio ready for creativity</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Palette className="h-8 w-8 text-purple-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Ad Creative Studio</h1>
          <p className="text-gray-400">AI-powered creative generation for your campaigns</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Coming Soon
          </CardTitle>
          <CardDescription className="text-gray-400">
            The Ad Creative Studio is currently under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-gray-300">
              <h3 className="font-semibold text-lg mb-2">What's Coming:</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  AI-generated ad copy and headlines
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  Creative asset generation and optimization
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  A/B testing recommendations
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  Platform-specific creative templates
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 