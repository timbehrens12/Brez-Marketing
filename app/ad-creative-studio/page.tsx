"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette, Zap, Sparkles } from 'lucide-react'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"

export default function AdCreativeStudioPage() {
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const { agencySettings } = useAgency()
  const pathname = usePathname()

  useEffect(() => {
    // Page loading simulation
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Show loading state
  if (isLoadingPage) {
    const loadingConfig = getPageLoadingConfig(pathname)
    
    return (
      <UnifiedLoading
        variant="page"
        size="lg"
        message="Loading Ad Creative Studio"
        subMessage="Setting up your creative workspace"
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
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