"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { useAgency } from '@/contexts/AgencyContext'
import { useAuth } from '@clerk/nextjs'
import { GridOverlay } from '@/components/GridOverlay'
import { UniversalLoadingScreen } from '@/components/UniversalLoadingScreen'
import { Brain, ArrowLeft, Bot, Sparkles, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AIDashboardPage() {
  const router = useRouter()
  const { agencySettings } = useAgency()
  const { userId } = useAuth()
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingPhase, setLoadingPhase] = useState('Initializing AI dashboard...')

  // Simulate loading with progress phases
  useEffect(() => {
    if (!userId) return

    const phases = [
      { progress: 20, phase: 'Loading your agency data...', duration: 800 },
      { progress: 40, phase: 'Analyzing AI capabilities...', duration: 1000 },
      { progress: 60, phase: 'Preparing dashboard insights...', duration: 900 },
      { progress: 80, phase: 'Configuring AI tools...', duration: 700 },
      { progress: 95, phase: 'Almost ready...', duration: 500 },
      { progress: 100, phase: 'Welcome to your AI Dashboard!', duration: 300 }
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
      <UniversalLoadingScreen 
        title="AI Dashboard"
        loadingPhase={loadingPhase}
        loadingProgress={loadingProgress}
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
        loadingPhases={[
          { phase: 'Connecting to AI systems...', progressThreshold: 30 },
          { phase: 'Loading marketing insights...', progressThreshold: 50 },
          { phase: 'Analyzing campaign data...', progressThreshold: 70 },
          { phase: 'Preparing AI tools...', progressThreshold: 85 },
          { phase: 'Finalizing dashboard...', progressThreshold: 95 }
        ]}
      />
    )
  }

  // Show the main AI Dashboard interface
  return (
    <div className="w-full min-h-screen bg-[#0B0B0B] animate-in fade-in duration-300 relative">
      <GridOverlay />
      <div className="relative z-10">
        {/* Header */}
        <div className="border-b border-white/10 bg-[#0B0B0B]/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-white">AI Dashboard</h1>
                    <p className="text-sm text-gray-400">Intelligent insights and automation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* AI Insights Card */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Brain className="w-5 h-5 text-blue-400" />
                  AI Insights
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Get intelligent recommendations for your campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Performance Analysis</h4>
                    <p className="text-xs text-gray-400">AI-powered analysis of your campaign performance with actionable insights.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Optimization Suggestions</h4>
                    <p className="text-xs text-gray-400">Automated recommendations to improve your ad spend efficiency.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Automation Tools Card */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Automation Tools
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Streamline your marketing workflows with AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Smart Bidding</h4>
                    <p className="text-xs text-gray-400">AI-powered bid optimization to maximize ROI across all platforms.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Content Generation</h4>
                    <p className="text-xs text-gray-400">Automated ad copy and creative generation based on performance data.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analytics Dashboard Card */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bot className="w-5 h-5 text-green-400" />
                  Predictive Analytics
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Forecast trends and optimize campaigns proactively
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Trend Forecasting</h4>
                    <p className="text-xs text-gray-400">AI-powered predictions for campaign performance and market trends.</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Anomaly Detection</h4>
                    <p className="text-xs text-gray-400">Automatic detection of unusual patterns and performance changes.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coming Soon Section */}
          <div className="mt-8">
            <Card className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border-blue-500/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">🚀 Coming Soon</CardTitle>
                <CardDescription className="text-gray-300">
                  Advanced AI features currently in development
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Real-time Optimization</h4>
                    <p className="text-xs text-gray-400">Live campaign adjustments based on AI analysis</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Competitor Intelligence</h4>
                    <p className="text-xs text-gray-400">AI-powered competitive analysis and insights</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2">Automated Reporting</h4>
                    <p className="text-xs text-gray-400">Custom AI-generated performance reports</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
