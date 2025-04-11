"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useUser } from "@clerk/nextjs"
import { Sparkles, ChevronUp, ChevronDown, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info, Loader2, ShoppingBag, BarChart3, RefreshCw, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { format, subDays, subMonths, startOfMonth, endOfMonth, getDaysInMonth, parseISO, isSameDay, isAfter, isBefore, differenceInDays, differenceInHours, getHours, isToday } from "date-fns"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { formatCurrencyCompact, formatNumberCompact } from '@/lib/formatters'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'

// Define types locally
type ReportPeriod = 'daily' | 'monthly'

// Local type definitions
interface Metrics {
  totalSales: number
  conversionRate: number
  averagePurchaseValue: number
  roas: number
  adSpend: number
  salesGrowth?: number
  aovGrowth?: number
  ordersPlaced?: number
  averageOrderValue?: number
  previousOrdersPlaced?: number
  unitsSold?: number
  previousUnitsSold?: number
  sessionCount?: number
  sessionGrowth?: number
  conversionRateGrowth?: number
  customerRetentionRate?: number
  retentionRateGrowth?: number
  salesData?: any[]
  sessionData?: any[]
  conversionData?: any[]
  retentionData?: any[]
  topProducts?: any[]
  currentWeekRevenue?: any[]
  orderCount?: number
  previousOrderCount?: number
  revenueByDay?: any[]
  inventoryLevels?: any[]
  customerLifetimeValue?: number
  productPerformance?: any[]
  categoryPerformance?: any[]
  customerSegments?: any[]
  acquisitionChannels?: any[]
  customerJourney?: any[]
  marketingRoi?: any[]
  inventoryTurnover?: number
  inventoryTurnoverGrowth?: number
  topCampaigns?: any[]
}

interface PlatformConnection {
  id: string
  platform_type: string
  status: string
}

// Define minimal interfaces for the components we need
interface AlertBoxProps {
  title?: string
  type?: 'info' | 'warning' | 'success' | 'error'
  icon?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function AlertBox({ title, type = 'info', icon, className, children }: AlertBoxProps) {
  return (
    <div className={`rounded-md p-3 bg-blue-950/30 border border-blue-900/50 ${className}`}>
      <div className="flex items-start">
        {icon && <div className="mr-3 mt-0.5">{icon}</div>}
        <div>
          {title && <div className="font-medium text-sm mb-1">{title}</div>}
          <div>{children}</div>
        </div>
      </div>
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-1/3 bg-gray-800 rounded mb-4"></div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 h-24 rounded-lg"></div>
        ))}
      </div>
      <div className="h-32 bg-gray-800 rounded-lg mb-6"></div>
    </div>
  )
}

interface GreetingWidgetProps {
  brandId: string
  brandName: string
  metrics: Metrics
  connections: PlatformConnection[]
}

interface PeriodMetrics {
  totalSales: number
  ordersCount: number
  averageOrderValue: number
  conversionRate: number
  customerCount: number
  newCustomers: number
  returningCustomers: number
  adSpend: number
  roas: number
  ctr: number
  cpc: number
  topProducts?: Array<{ title?: string; name?: string; quantity?: number; orders?: number; revenue?: number }>
}

interface PerformanceReport {
  dateRange: string
  totalPurchases: number
  totalAdSpend: number
  averageRoas: number
  revenueGenerated: number
  bestCampaign: {
    name: string
    roas: number
    cpa: number
    ctr?: number
    conversions?: number
  }
  underperformingCampaign: {
    name: string
    roas: number
    cpa: number
    ctr?: number
    conversions?: number
  }
  bestAudience: {
    name: string
    roas: number
    cpa: number
    ctr?: number
    conversions?: number
  }
  ctr: number
  cpc: number
  conversionRate: number
  newCustomersAcquired: number
  recommendations: string[]
  takeaways: string[]
  periodComparison: {
    salesGrowth: number
    orderGrowth: number
    customerGrowth: number
    roasGrowth: number
    conversionGrowth: number
    adSpendGrowth: number
  }
  bestSellingProducts?: Array<{
    name: string
    revenue: number
    orders: number
  }>
  historicalData?: Array<{
    name: string
    revenue: number
    orders: number
    adSpend: number
    roas: number
  }>
  aiAnalysis?: string
}

// Add new interface for the OpenAI response
interface AIReportResponse {
  dailyReport: string
  monthlyReport: string
  recommendations: string[]
  keyInsights: string[]
}

export function GreetingWidget({ 
  brandId, 
  brandName, 
  metrics, 
  connections 
}: GreetingWidgetProps) {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [greeting, setGreeting] = useState("")
  const [synopsis, setSynopsis] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isReportLoading, setIsReportLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiReports, setAIReports] = useState<{
    daily: {
      report: string
      lastUpdated: Date | null
      recommendations: string[]
      needsUpdate: boolean
    },
    monthly: {
      report: string
      lastUpdated: Date | null
      recommendations: string[]
      needsUpdate: boolean
    }
  }>({
    daily: {
      report: "",
      lastUpdated: null,
      recommendations: [],
      needsUpdate: true
    },
    monthly: {
      report: "",
      lastUpdated: null,
      recommendations: [],
      needsUpdate: true
    }
  })
  const [currentPeriod, setCurrentPeriod] = useState<'daily' | 'monthly'>('daily')
  const [userName, setUserName] = useState<string>("")
  const supabaseClient = createClientComponentClient()
  
  // Set the time-based greeting
  useEffect(() => {
    const hour = new Date().getHours()
    let greetingText = ""
    
    if (hour >= 5 && hour < 12) {
      greetingText = "Good morning"
    } else if (hour >= 12 && hour < 18) {
      greetingText = "Good afternoon"
    } else {
      greetingText = "Good evening"
    }
    
    setGreeting(greetingText)
    
    // Get the user's first name
    if (user?.firstName) {
      setUserName(user.firstName)
    } else if (user?.fullName) {
      const firstName = user.fullName.split(' ')[0]
      setUserName(firstName)
    }
  }, [user])
  
  // Check if reports need updating
  useEffect(() => {
    const checkReportUpdateStatus = async () => {
      if (!brandId) return
      
      try {
        // Check if saved reports exist in database
        const { data: reportsData, error: reportsError } = await supabaseClient
          .from('ai_reports')
          .select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (reportsError) throw reportsError
        
        if (reportsData && reportsData.length > 0) {
          const lastReport = reportsData[0]
          
          // Update state with existing reports
          setAIReports(prev => ({
            daily: {
              report: lastReport.daily_report || "",
              lastUpdated: lastReport.daily_updated_at ? new Date(lastReport.daily_updated_at) : null,
              recommendations: lastReport.daily_recommendations || [],
              needsUpdate: shouldUpdateDailyReport(lastReport.daily_updated_at ? new Date(lastReport.daily_updated_at) : null)
            },
            monthly: {
              report: lastReport.monthly_report || "",
              lastUpdated: lastReport.monthly_updated_at ? new Date(lastReport.monthly_updated_at) : null,
              recommendations: lastReport.monthly_recommendations || [],
              needsUpdate: shouldUpdateMonthlyReport(lastReport.monthly_updated_at ? new Date(lastReport.monthly_updated_at) : null)
            }
          }))
          
          // Set lastRefreshed to most recent update time
          const mostRecentUpdate = Math.max(
            lastReport.daily_updated_at ? new Date(lastReport.daily_updated_at).getTime() : 0,
            lastReport.monthly_updated_at ? new Date(lastReport.monthly_updated_at).getTime() : 0
          )
          
          if (mostRecentUpdate > 0) {
            setLastRefreshed(new Date(mostRecentUpdate))
          }
          
          setIsLoading(false)
        } else {
          // No reports exist yet, need to generate both
          setAIReports(prev => ({
            daily: {
              ...prev.daily,
              needsUpdate: true
            },
            monthly: {
              ...prev.monthly,
              needsUpdate: true
            }
          }))
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error checking report status:', error)
        setError('Failed to check report status')
        setIsLoading(false)
      }
    }
    
    checkReportUpdateStatus()
  }, [brandId])
  
  // Auto-generate reports if needed on initial load
  useEffect(() => {
    if (isLoading || isReportLoading || isRefreshing) return
    
    if (aiReports.daily.needsUpdate || aiReports.monthly.needsUpdate) {
      generateReports()
    }
  }, [isLoading, aiReports.daily.needsUpdate, aiReports.monthly.needsUpdate])
  
  // Determine if daily report needs an update
  const shouldUpdateDailyReport = (lastUpdate: Date | null): boolean => {
    if (!lastUpdate) return true
    
    // Update if last update was more than 3 hours ago
    const hoursSinceUpdate = differenceInHours(new Date(), lastUpdate)
    return hoursSinceUpdate >= 3 || !isToday(lastUpdate)
  }
  
  // Determine if monthly report needs an update
  const shouldUpdateMonthlyReport = (lastUpdate: Date | null): boolean => {
    if (!lastUpdate) return true
    
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    // Update if we're on the first day of a new month and haven't updated yet
    return isAfter(firstDayOfMonth, lastUpdate)
  }
  
  // Format time for last update display
  const formatLastUpdated = (date: Date | null, reportType: 'daily' | 'monthly'): string => {
    if (!date) return 'Never updated'
    
    if (reportType === 'daily') {
      return `Updated today at ${format(date, 'h:mm a')}`
    } else {
      // For monthly, show the month
      return `Updated on ${format(date, 'MMMM d, yyyy')}`
    }
  }
  
  // Generate AI-powered reports
  const generateReports = async () => {
    if (!brandId || isReportLoading) return
    
    setIsReportLoading(true)
    setError(null)
    
    try {
      // Fetch data needed for reports
      const token = await getToken()
      
      // Call our backend API that uses OpenAI
      const response = await fetch('/api/ai-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          brandId,
          metrics,
          needsDaily: aiReports.daily.needsUpdate,
          needsMonthly: aiReports.monthly.needsUpdate
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to generate reports: ${response.statusText}`)
      }
      
      const reportData: AIReportResponse = await response.json()
      
      // Update the reports in state
      const now = new Date()
      
      setAIReports(prev => ({
        daily: {
          report: reportData.dailyReport || prev.daily.report,
          lastUpdated: aiReports.daily.needsUpdate ? now : prev.daily.lastUpdated,
          recommendations: reportData.recommendations || [],
          needsUpdate: false
        },
        monthly: {
          report: reportData.monthlyReport || prev.monthly.report,
          lastUpdated: aiReports.monthly.needsUpdate ? now : prev.monthly.lastUpdated,
          recommendations: reportData.keyInsights || [],
          needsUpdate: false
        }
      }))
      
      // Save to database
      const { error: saveError } = await supabaseClient
        .from('ai_reports')
        .upsert({
          brand_id: brandId,
          user_id: user?.id || 'anonymous',
          report_type: 'ai_assistant',
          period: 'combined',
          daily_report: reportData.dailyReport || aiReports.daily.report,
          daily_updated_at: aiReports.daily.needsUpdate ? now.toISOString() : aiReports.daily.lastUpdated?.toISOString(),
          daily_recommendations: reportData.recommendations || [],
          monthly_report: reportData.monthlyReport || aiReports.monthly.report,
          monthly_updated_at: aiReports.monthly.needsUpdate ? now.toISOString() : aiReports.monthly.lastUpdated?.toISOString(),
          monthly_recommendations: reportData.keyInsights || [],
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
      
      if (saveError) {
        console.error('Error saving reports to database:', saveError)
      }
      
      setLastRefreshed(now)
      
      if (aiReports.daily.needsUpdate && aiReports.monthly.needsUpdate) {
        toast.success('Daily and monthly reports updated')
      } else if (aiReports.daily.needsUpdate) {
        toast.success('Daily report updated')
      } else if (aiReports.monthly.needsUpdate) {
        toast.success('Monthly report updated')
      }
      
    } catch (error) {
      console.error('Error generating reports:', error)
      setError('Failed to generate AI reports')
      toast.error('Failed to generate reports')
    } finally {
      setIsReportLoading(false)
      setIsRefreshing(false)
    }
  }
  
  // Manual refresh of reports
  const handleRefresh = () => {
    setIsRefreshing(true)
    
    setAIReports(prev => ({
      daily: {
        ...prev.daily,
        needsUpdate: true
      },
      monthly: {
        ...prev.monthly,
        needsUpdate: true
      }
    }))
    
    generateReports()
  }
  
  // Handle switching between daily and monthly reports
  const handlePeriodChange = (period: 'daily' | 'monthly') => {
    setCurrentPeriod(period)
  }
  
  return (
    <div className="text-white">
      <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-medium flex items-center">
                {greeting}, {userName}
                {isMinimized ? (
                  <ChevronUp 
                    className="h-5 w-5 ml-2 text-gray-400 cursor-pointer hover:text-white transition-colors" 
                    onClick={() => setIsMinimized(false)} 
                  />
                ) : (
                  <ChevronDown 
                    className="h-5 w-5 ml-2 text-gray-400 cursor-pointer hover:text-white transition-colors" 
                    onClick={() => setIsMinimized(true)} 
                  />
                )}
              </h3>
              {isMinimized && (
                <p className="text-sm text-gray-400 mt-1">
                  Click the arrow above to view your detailed {currentPeriod} report
                </p>
              )}
            </div>
            
            {!isMinimized && (
              <div className="flex items-center space-x-3">
                <div className="bg-[#1E1E1E] rounded-md p-0.5 flex">
                  <button 
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${currentPeriod === 'daily' ? 'bg-[#3A3A3A] text-white' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => handlePeriodChange('daily')}
                  >
                    Today
                  </button>
                  <button 
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${currentPeriod === 'monthly' ? 'bg-[#3A3A3A] text-white' : 'text-gray-400 hover:text-white'}`}
                    onClick={() => handlePeriodChange('monthly')}
                  >
                    Monthly
                  </button>
                </div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 bg-[#2A2A2A] hover:bg-[#333] border-[#444]"
                        onClick={handleRefresh}
                        disabled={isReportLoading || isRefreshing}
                      >
                        {isReportLoading || isRefreshing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Refresh reports</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          
          {!isMinimized && (
            <>
              {isLoading ? (
                <div className="py-8">
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                  <p className="text-center text-gray-500 mt-2">Loading reports...</p>
                </div>
              ) : isReportLoading ? (
                <div className="py-8">
                  <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                  <p className="text-center text-gray-500 mt-2">
                    Generating your {currentPeriod === 'daily' ? 'daily' : 'monthly'} report...
                  </p>
                </div>
              ) : error ? (
                <div className="py-4">
                  <AlertBox
                    type="error"
                    icon={<AlertTriangle className="h-4 w-4 text-red-400" />}
                  >
                    <p>{error}</p>
                    <Button 
                      variant="link" 
                      className="px-0 text-sm text-blue-400 h-auto" 
                      onClick={handleRefresh}
                    >
                      Try again
                    </Button>
                  </AlertBox>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Report content */}
                  <div className="relative">
                    <div className="absolute right-0 top-0 flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-transparent border-gray-700 text-gray-400 flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        {currentPeriod === 'daily' 
                          ? formatLastUpdated(aiReports.daily.lastUpdated, 'daily')
                          : formatLastUpdated(aiReports.monthly.lastUpdated, 'monthly')
                        }
                      </Badge>
                    </div>
                    
                    <div className="mt-8">
                      <div className="flex items-center mb-2">
                        <Sparkles className="h-4 w-4 text-blue-400 mr-2" />
                        <h4 className="text-md font-medium">
                          {currentPeriod === 'daily' ? 'Today\'s Performance' : 'Monthly Performance'}
                        </h4>
                      </div>
                      
                      <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                        {currentPeriod === 'daily' 
                          ? aiReports.daily.report || "No daily report available yet."
                          : aiReports.monthly.report || "No monthly report available yet."
                        }
                      </div>
                    </div>
                    
                    {((currentPeriod === 'daily' && aiReports.daily.recommendations.length > 0) || 
                      (currentPeriod === 'monthly' && aiReports.monthly.recommendations.length > 0)) && (
                      <div className="mt-6">
                        <div className="flex items-center mb-2">
                          <BarChart3 className="h-4 w-4 text-purple-400 mr-2" />
                          <h4 className="text-md font-medium">
                            Key Insights & Recommendations
                          </h4>
                        </div>
                        
                        <ul className="space-y-2 text-gray-300">
                          {(currentPeriod === 'daily' 
                            ? aiReports.daily.recommendations 
                            : aiReports.monthly.recommendations
                          ).map((rec, index) => (
                            <li key={index} className="flex items-start">
                              <div className="mr-2 mt-1">•</div>
                              <div>{rec}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-4">
                    <div className="flex items-center">
                      <Info className="h-3 w-3 mr-1.5" />
                      {currentPeriod === 'daily' 
                        ? 'Daily reports update every 3 hours based on the latest data.' 
                        : 'Monthly reports are generated on the 1st of each month, summarizing the previous month.'
                      }
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
