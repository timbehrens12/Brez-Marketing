"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAgency } from '@/contexts/AgencyContext'
import { useDataBackfill } from '@/lib/hooks/useDataBackfill'
import { usePathname } from 'next/navigation'
import { UnifiedLoading, getPageLoadingConfig } from '@/components/ui/unified-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle2, RefreshCw, Database, TrendingUp, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'

// Placeholder dashboard widgets - replace with your actual widgets
import { AIInsightsWidget } from '@/components/dashboard/AIInsightsWidget'
import { AIRecommendationsWidget } from '@/components/dashboard/AIRecommendationsWidget'
import { MetricCard } from '@/components/metrics/MetricCard'
import { MetricLineChart } from '@/components/metrics/MetricLineChart'

interface DashboardData {
  metrics: any[]
  insights: any[]
  recommendations: any[]
  loaded: boolean
}

export default function DashboardPage() {
  const { userId } = useAuth()
  const { selectedBrand } = useBrandContext()
  const { agencySettings } = useAgency()
  const pathname = usePathname()
  const backfill = useDataBackfill()
  
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    metrics: [],
    insights: [],
    recommendations: [],
    loaded: false
  })
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Loading dashboard...')
  const [backfillTriggered, setBackfillTriggered] = useState(false)

  // Load initial dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!userId || !selectedBrand) return

    try {
      setIsLoadingData(true)
      setLoadingMessage('Loading dashboard data...')

      // Simulate loading dashboard data - replace with your actual API calls
      const [metricsRes, insightsRes, recommendationsRes] = await Promise.all([
        fetch(`/api/metrics?brandId=${selectedBrand}`),
        fetch(`/api/ai/insights?brandId=${selectedBrand}`),
        fetch(`/api/ai/recommendations?brandId=${selectedBrand}`)
      ])

      const metrics = metricsRes.ok ? await metricsRes.json() : []
      const insights = insightsRes.ok ? await insightsRes.json() : []
      const recommendations = recommendationsRes.ok ? await recommendationsRes.json() : []

      setDashboardData({
        metrics,
        insights,
        recommendations,
        loaded: true
      })

      console.log('✅ Dashboard data loaded successfully')
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoadingData(false)
    }
  }, [userId, selectedBrand])

  // Check for data gaps after initial load
  const checkAndHandleBackfill = useCallback(async () => {
    if (!dashboardData.loaded || backfillTriggered) return

    try {
      setLoadingMessage('Checking data coverage...')
      console.log('🔍 Checking for data gaps after dashboard load')
      
      const gapResult = await backfill.checkForGaps()
      
      if (gapResult.hasGaps && gapResult.totalDaysMissing >= 2) {
        console.log(`📊 Found ${gapResult.totalDaysMissing} missing days across ${gapResult.gaps.length} gaps`)
        setLoadingMessage(`Found ${gapResult.totalDaysMissing} days of missing data. Backfilling...`)
        setBackfillTriggered(true)
        
        // Automatically trigger backfill for significant gaps
        const backfillResult = await backfill.performBackfill()
        
        if (backfillResult.success && backfillResult.gaps_filled.length > 0) {
          console.log('✅ Backfill completed, reloading dashboard data')
          setLoadingMessage('Backfill completed. Refreshing dashboard...')
          
          // Reload dashboard data after successful backfill
          await loadDashboardData()
        }
      } else {
        console.log('✅ No significant data gaps found')
      }
    } catch (error) {
      console.error('❌ Error during gap check/backfill:', error)
      // Don't show error to user as this is background process
    }
  }, [dashboardData.loaded, backfillTriggered, backfill, loadDashboardData])

  // Initial load effect
  useEffect(() => {
    if (userId && selectedBrand) {
      console.log('🚀 Starting dashboard load for brand:', selectedBrand)
      loadDashboardData()
    }
  }, [userId, selectedBrand, loadDashboardData])

  // Backfill check effect - runs after data is loaded
  useEffect(() => {
    if (dashboardData.loaded && !backfillTriggered) {
      console.log('🔄 Data loaded, checking for gaps...')
      checkAndHandleBackfill()
    }
  }, [dashboardData.loaded, backfillTriggered, checkAndHandleBackfill])

  // Show loading state
  if (isLoadingData || backfill.isLoading) {
    const loadingConfig = getPageLoadingConfig(pathname)
    
    return (
      <div className="relative">
        <UnifiedLoading
          variant="page"
          size="lg"
          message={loadingConfig.message}
          subMessage={loadingConfig.subMessage}
          agencyLogo={agencySettings.agency_logo_url}
          agencyName={agencySettings.agency_name}
        />
        
        {/* Backfill status overlay */}
        {(backfill.isChecking || backfill.isBackfilling) && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-4 min-w-[300px] text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
                <span className="text-white font-medium">
                  {backfill.isChecking ? 'Checking data coverage...' : 'Backfilling missing data...'}
                </span>
              </div>
              
              {backfill.hasGaps && backfill.totalDaysMissing > 0 && (
                <div className="text-sm text-gray-400">
                  Found {backfill.totalDaysMissing} days of missing data across {backfill.gaps.length} gaps
                </div>
              )}
              
              {backfill.isBackfilling && (
                <div className="text-xs text-gray-500 mt-2">
                  This may take a few moments to complete...
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Custom loading message for backfill */}
        {loadingMessage !== 'Loading dashboard...' && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-[#2A2A2A] border border-[#444] rounded-lg px-4 py-2">
              <span className="text-gray-300 text-sm">{loadingMessage}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!selectedBrand) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Brand Selected</h2>
          <p className="text-gray-400">Please select a brand to view the dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 mt-1">Brand: {selectedBrand || 'None'}</p>
          </div>
          
          {/* Manual backfill button */}
          <div className="flex items-center gap-3">
            {backfill.hasGaps && (
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{backfill.totalDaysMissing} days missing</span>
              </div>
            )}
            
            <Button
              onClick={() => {
                setBackfillTriggered(false)
                checkAndHandleBackfill()
              }}
              disabled={backfill.isLoading}
              variant="outline"
              size="sm"
              className="bg-[#1A1A1A] border-[#333] text-gray-300 hover:bg-[#333] hover:text-white"
            >
              {backfill.isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {backfill.isChecking ? 'Checking...' : 'Backfilling...'}
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Check Data
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Backfill Status Card (only show if there are issues or recent activity) */}
        {(backfill.error || backfill.status.backfillResult) && (
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="pt-4">
              {backfill.error ? (
                <div className="flex items-center gap-3 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Data Check Error</div>
                    <div className="text-sm text-gray-400">{backfill.error}</div>
                  </div>
                </div>
              ) : backfill.status.backfillResult ? (
                <div className="flex items-center gap-3 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <div className="font-medium">
                      Backfill Completed
                    </div>
                    <div className="text-sm text-gray-400">
                      {backfill.status.backfillResult.gaps_filled.length > 0 
                        ? `Added ${backfill.status.backfillResult.total_records_created} records across ${backfill.status.backfillResult.gaps_filled.length} gaps`
                        : 'No data gaps found - your data is up to date'
                      }
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

                 {/* Metrics Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <MetricCard
             title="Total Revenue"
             value={12345}
             change="+12.5%"
             icon={<TrendingUp className="h-5 w-5" />}
             trend="up"
           />
           <MetricCard
             title="Conversions"
             value={1234}
             change="+8.3%"
             icon={<TrendingUp className="h-5 w-5" />}
             trend="up"
           />
           <MetricCard
             title="ROAS"
             value={4.2}
             change="+15.2%"
             icon={<TrendingUp className="h-5 w-5" />}
             trend="up"
           />
           <MetricCard
             title="Data Coverage"
             value={backfill.hasGaps ? Math.round((1 - backfill.totalDaysMissing / 30) * 100) : 100}
             change={backfill.hasGaps ? `-${backfill.totalDaysMissing} days` : "Complete"}
             icon={backfill.hasGaps ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
             trend={backfill.hasGaps ? "down" : "up"}
           />
         </div>

                 {/* Charts Row */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="bg-[#1A1A1A] border-[#333]">
             <CardHeader>
               <CardTitle className="text-white">Revenue Trend</CardTitle>
               <CardDescription className="text-gray-400">Daily revenue over time</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-[200px] flex items-center justify-center text-gray-400">
                 <span>Revenue chart placeholder</span>
               </div>
             </CardContent>
           </Card>
           
           <Card className="bg-[#1A1A1A] border-[#333]">
             <CardHeader>
               <CardTitle className="text-white">Conversion Trend</CardTitle>
               <CardDescription className="text-gray-400">Daily conversions over time</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-[200px] flex items-center justify-center text-gray-400">
                 <span>Conversions chart placeholder</span>
               </div>
             </CardContent>
           </Card>
         </div>

         {/* AI Widgets Row */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="bg-[#1A1A1A] border-[#333]">
             <CardHeader>
               <CardTitle className="text-white">AI Insights</CardTitle>
               <CardDescription className="text-gray-400">Generated insights from your data</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-[200px] flex items-center justify-center text-gray-400">
                 <span>AI insights placeholder</span>
               </div>
             </CardContent>
           </Card>
           
           <Card className="bg-[#1A1A1A] border-[#333]">
             <CardHeader>
               <CardTitle className="text-white">AI Recommendations</CardTitle>
               <CardDescription className="text-gray-400">Smart recommendations for optimization</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-[200px] flex items-center justify-center text-gray-400">
                 <span>AI recommendations placeholder</span>
               </div>
             </CardContent>
           </Card>
         </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <CardTitle className="text-white text-sm">Debug: Backfill Status</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-gray-400 overflow-auto">
                {JSON.stringify(backfill.status, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
