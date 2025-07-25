"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from '@/lib/context/BrandContext'
import { DateRange } from "react-day-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { startOfDay, endOfDay, format, startOfMonth, endOfMonth, subMonths, parse, isAfter, isBefore, addMonths } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, BarChart4, RefreshCw, Zap, Download } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip } from "recharts"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { useAgency } from "@/contexts/AgencyContext"

interface DailyReport {
  content: string
  createdAt: string
  snapshotTime: string
  data: any
}

export default function BrandReportPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const { selectedBrandId, brands } = useBrandContext()
  const { agencySettings } = useAgency()
  
  // Use undefined for initial state to avoid hydration issues
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  })
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today")
  const [mounted, setMounted] = useState(false)
  const [greeting, setGreeting] = useState("")
  const [userFirstName, setUserFirstName] = useState("")
  
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([])
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null)
  const [lastManualGeneration, setLastManualGeneration] = useState<string | null>(null)
  const [devModeActive, setDevModeActive] = useState(false)

  // Check if user has permission to generate reports for the selected brand
  const canGenerateReports = () => {
    if (!selectedBrandId) return false
    
    const selectedBrand = brands.find(brand => brand.id === selectedBrandId)
    if (!selectedBrand) return false
    
    // If the user owns the brand, they can always generate reports
    if (selectedBrand.user_id === user?.id) return true
    
    // If it's a shared brand, check the permission
    if (selectedBrand.shared_access) {
      return selectedBrand.shared_access.can_generate_reports !== false
    }
    
    // Default to true for owned brands
    return true
  }

  // Check refresh availability based on period type
  const getRefreshAvailability = () => {
    // Check permissions first
    if (!canGenerateReports()) {
      const selectedBrand = brands.find(brand => brand.id === selectedBrandId)
      const agencyName = selectedBrand?.agency_info?.name || "the brand owner"
      return {
        available: false,
        reason: `You do not have permission to generate reports for this brand. Contact ${agencyName} to request report generation access.`,
        nextAvailable: null,
        buttonText: "No Permission"
      }
    }
    
    // Dev mode bypass - unlimited refreshes
    if (devModeActive) {
      return {
        available: true,
        reason: "DEV MODE: Unlimited refreshes",
        nextAvailable: null,
        buttonText: "Generate Report (DEV)"
      }
    }
    
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const currentHour = now.getHours()
    const currentMinutes = now.getMinutes()
    
    if (selectedPeriod === "today") {
      // Check for daily cooldown - don't allow refreshes too early in the day
      const isInCooldownPeriod = currentHour < 6 || (currentHour === 6 && currentMinutes < 30)
      
      if (isInCooldownPeriod) {
        const cooldownEndTime = currentHour < 6 ? "6:30 AM" : "6:30 AM"
        return {
          available: false,
                      reason: "Reports can only be generated after 6 AM to ensure sufficient data is available for analysis.",
            nextAvailable: `Available after ${cooldownEndTime}`,
            buttonText: "Too Early"
        }
      }
      
      // Daily reports: once per day (after cooldown period)
      const hasManualReportToday = dailyReports.some(report => 
        report.snapshotTime === "manual" && 
        format(new Date(report.createdAt), 'yyyy-MM-dd') === today
      )
      const isRateLimited = lastManualGeneration === today || hasManualReportToday
      
      return {
        available: !isRateLimited,
        reason: isRateLimited ? "Daily limit reached" : "Available now",
        nextAvailable: isRateLimited ? "Tomorrow" : null,
        buttonText: isRateLimited ? "Used Today" : "Generate Report"
      }
    } else if (selectedPeriod === "last-month") {
      // Monthly reports: only available on the 1st of the month for previous month's data
      const currentDay = now.getDate()
      const reportMonth = format(dateRange.from!, 'yyyy-MM')
      const currentMonth = format(now, 'yyyy-MM')
      const currentMonthFirst = format(startOfMonth(now), 'yyyy-MM-dd')
      
      // Check if we're trying to generate a report for the current month (not allowed)
      if (reportMonth === currentMonth) {
        return {
          available: false,
          reason: "Report not yet available",
          nextAvailable: `Available ${format(startOfMonth(addMonths(now, 1)), 'MMM d')}`,
          buttonText: "Not Available"
        }
      }
      
      // Check if monthly report already exists for this month (when refresh was used)
      const hasUsedMonthlyRefreshThisMonth = dailyReports.some(report => 
        report.snapshotTime === "manual" && 
        format(new Date(report.createdAt), 'yyyy-MM-dd') >= currentMonthFirst
      )
      
      if (hasUsedMonthlyRefreshThisMonth) {
        const nextFirst = startOfMonth(addMonths(now, 1))
        return {
          available: false,
          reason: "Monthly refresh already used this month",
          nextAvailable: `Available ${format(nextFirst, 'MMM d')}`,
          buttonText: "Used This Month"
        }
      }
      
      // Only allow on the 1st of the month
      if (currentDay !== 1) {
        const nextFirst = startOfMonth(addMonths(now, 1))
        return {
          available: false,
          reason: "Monthly refresh only available on 1st",
          nextAvailable: `Available ${format(nextFirst, 'MMM d')}`,
          buttonText: "Available on 1st"
        }
      }
      
      return {
        available: true,
        reason: "Available now",
        nextAvailable: null,
        buttonText: "Generate Report"
      }
    }
    
    return {
      available: false,
      reason: "Unknown period",
      nextAvailable: null,
      buttonText: "Unavailable"
    }
  }

  // Initialize client-side only values after mount
  useEffect(() => {
    setMounted(true)
    
    // Set date range
    const now = new Date()
    setDateRange({
      from: startOfDay(now),
      to: endOfDay(now),
    })
    
    // Set greeting based on time of day
    const hour = now.getHours()
    if (hour < 12) {
      setGreeting("Good morning")
    } else if (hour < 18) {
      setGreeting("Good afternoon")
    } else {
      setGreeting("Good evening")
    }
    
    // Set user's first name
    if (user) {
      setUserFirstName(user.firstName || user.fullName?.split(' ')[0] || "")
    }
    
    // Only set loading to false after we have the required dependencies
    const timer = setTimeout(() => {
      // Check if we have the required data before stopping loading
      if (user && selectedBrandId && mounted) {
        setIsLoadingPage(false)
      } else if (!user) {
        // If no user, still show the page (auth will handle redirect)
        setIsLoadingPage(false)
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [user, selectedBrandId, mounted])

  // Handle case where user exists but no brand is selected (prevent infinite loading)
  useEffect(() => {
    if (user && mounted && !selectedBrandId) {
      // If user exists but no brand is selected, still show the page
      const timer = setTimeout(() => {
        setIsLoadingPage(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [user, mounted, selectedBrandId])

  // Check brand-specific last generation date on brand change
  useEffect(() => {
    if (selectedBrandId && mounted) {
      const brandSpecificKey = `lastManualGeneration_${selectedBrandId}`
      const globalKey = 'lastManualGeneration'
      
      // Check brand-specific key first, then fall back to global
      const storedLastGeneration = localStorage.getItem(brandSpecificKey) || localStorage.getItem(globalKey)
      if (storedLastGeneration) {
        setLastManualGeneration(storedLastGeneration)
      } else {
        setLastManualGeneration(null)
      }
    }
  }, [selectedBrandId, mounted])

  // Get greeting based on time of day (for use in API calls only)
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  // Get user's first name (for use in API calls only)
  const getUserFirstName = () => {
    if (!user) return ""
    return user.firstName || user.fullName?.split(' ')[0] || ""
  }



  // Check for insufficient data (too early in the day)
  const hasInsufficientData = (snapshotTime: string) => {
    const now = new Date()
    const currentHour = now.getHours()
    const snapshotHour = parseInt(snapshotTime.split(':')[0])
    
    // If trying to generate a report for a time very early in the day (before 6 AM)
    // and there's not much data accumulated yet, return true
    if (snapshotHour < 6 && currentHour < 6) {
      const minutesIntoDay = now.getHours() * 60 + now.getMinutes()
      return minutesIntoDay < 30 // Less than 30 minutes into the day
    }
    
    return false
  }

  // Load all daily reports for the selected day
  const loadDailyReports = async (brandId: string, fromDate: string, toDate: string, periodName: string) => {
    if (!user?.id) {
      console.error('No user ID available')
      return []
    }

    try {
      console.log(`🔍 Loading all daily reports for brand ${brandId}, period ${periodName}`)
      
      const params = new URLSearchParams({
        brandId,
        userId: user.id,
        fromDate,
        toDate,
        periodName,
        getAllSnapshots: 'true',
        includeSharedBrands: 'true' // Include reports for shared brands
      })
      
      const response = await fetch(`/api/brand-reports?${params.toString()}`)
      
      if (!response.ok) {
        console.error('API response error:', response.status)
        return []
      }
      
      const result = await response.json()
      
      if (result.success && result.reports) {
        console.log(`✅ Found ${result.reports.length} reports`)
        return result.reports
      }
      
      console.log('ℹ️ No reports found')
      return []
    } catch (error) {
      console.error('❌ Exception loading daily reports:', error)
      return []
    }
  }

  // Save report to database with optional snapshot time
  const saveReportToDatabase = async (brandId: string, fromDate: string, toDate: string, periodName: string, reportContent: string, rawResponse: string, snapshotTime: string | null) => {
    if (!user?.id) {
      console.error('No user ID available for saving')
      return false
    }

    try {
      console.log('💾 Saving report to database with snapshot time:', snapshotTime)
      
      const response = await fetch('/api/brand-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          userId: user.id,
          fromDate,
          toDate,
          periodName,
          reportContent,
          rawResponse,
          snapshotTime
        })
      })
      
      if (!response.ok) {
        console.error('❌ API save error:', response.status)
        return false
      }
      
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Successfully saved report to database')
        return true
        } else {
        console.error('❌ Save failed:', result.error)
        return false
        }
    } catch (error) {
      console.error('❌ Exception saving report:', error)
      return false
    }
  }

  // Handle period selection
  const handlePeriodSelect = (value: string) => {
    console.log(`🔄 Period changed from ${selectedPeriod} to ${value}`)
    setSelectedPeriod(value)
    setDailyReports([])
    setSelectedReport(null)
    
    const now = new Date()
    let from: Date
    let to: Date
    
    switch (value) {
      case "today":
        from = startOfDay(now)
        to = endOfDay(now)
        break
      case "last-month":
        const lastMonth = subMonths(now, 1)
        from = startOfMonth(lastMonth)
        to = endOfMonth(lastMonth)
        break
      default:
        from = startOfDay(now)
        to = endOfDay(now)
        break
    }
    
    setDateRange({ from, to })
  }
    
    // Generate new AI report with optional snapshot time
  const generateAiReport = async (snapshotTime: string | null, forceRefresh = false, isAutoGenerated = false) => {
    if (!selectedBrandId || !user?.id) {
      if (!isAutoGenerated) {
        toast({
          title: "Error",
          description: "Please select a brand first",
          variant: "destructive"
        })
      }
      return
    }

    // Check permission to generate reports for this brand
    const selectedBrand = brands.find(brand => brand.id === selectedBrandId)
    if (selectedBrand?.shared_access && selectedBrand.shared_access.can_generate_reports === false) {
      if (!isAutoGenerated) {
        toast({
          title: "Permission Denied",
          description: "You do not have permission to generate reports for this brand. Contact the brand owner to request report generation access.",
          variant: "destructive"
        })
      }
      return
    }

    // Check for insufficient data (only for scheduled snapshots, not manual refresh)
    if (snapshotTime && hasInsufficientData(snapshotTime)) {
      if (!isAutoGenerated) {
        toast({
          title: "Not enough data yet",
          description: "There isn't enough data accumulated today yet. Try again in a few hours when there's more activity to analyze.",
          variant: "destructive"
        })
      }
      return
    }

    try {
      setIsLoadingReport(true)

      const fromDate = format(dateRange.from!, 'yyyy-MM-dd')
      const toDate = format(dateRange.to!, 'yyyy-MM-dd')

      console.log(`🎯 Generating AI report for brand ${selectedBrandId}, snapshot: ${snapshotTime}${isAutoGenerated ? ' (auto-generated)' : ''}`)

      // Always run fresh data sync before generating reports to ensure accuracy
      console.log('🔄 Running fresh data sync before generating report...')
      try {
        // Sync Meta data
        const metaSyncDays = selectedPeriod === "last-month" ? 45 : 7; // More days for monthly, recent for daily
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/meta/sync`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            brandId: selectedBrandId,
            days: metaSyncDays,
            automated: true,
            force_refresh: true
          })
        })
        
        // Sync Shopify data
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/cron/shopify-sync`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            brandId: selectedBrandId,
            force_refresh: true
          })
        })
        
        console.log('✅ Fresh data sync completed')
      } catch (syncError) {
        console.error('❌ Sync failed, but continuing with report generation:', syncError)
      }

      // If not forcing refresh, check if report already exists for this snapshot time
      if (!forceRefresh) {
        const existingReports = await loadDailyReports(selectedBrandId, fromDate, toDate, selectedPeriod)
        const existingReport = existingReports.find((r: DailyReport) => r.snapshotTime === snapshotTime)
        if (existingReport) {
          console.log('✅ Found existing report for this snapshot time')
          setDailyReports(existingReports)
          setSelectedReport(existingReport)
          setIsLoadingReport(false)
          return
        }
      }

      const params = new URLSearchParams({
        brandId: selectedBrandId,
        from: fromDate,
        to: toDate,
        t: Date.now().toString()
      })

      const selectedBrand = brands.find(brand => brand.id === selectedBrandId)

      // Fetch all the data needed for the report
      const [shopifyResponse, metaResponse] = await Promise.all([
        fetch(`/api/metrics?${params.toString()}`),
        fetch(`/api/metrics/meta?${params.toString()}`)
      ])

      if (!shopifyResponse.ok || !metaResponse.ok) {
        throw new Error("Failed to fetch metrics data")
      }

      const shopifyData = await shopifyResponse.json()
      const metaData = await metaResponse.json()

      // Fetch previous reports for comparison and improvement tracking
      let historicalReports = []
      try {
        const historicalParams = new URLSearchParams({
          brandId: selectedBrandId,
          userId: user.id,
          limit: '3', // Get last 3 reports for context
          exclude_current: 'true'
        })
        
        const historicalResponse = await fetch(`/api/brand-reports/historical?${historicalParams.toString()}`)
        if (historicalResponse.ok) {
          const historicalResult = await historicalResponse.json()
          if (historicalResult.success && historicalResult.reports) {
            historicalReports = historicalResult.reports
            console.log(`📚 Found ${historicalReports.length} historical reports for comparison`)
          }
        }
      } catch (historicalError) {
        console.error('❌ Error fetching historical reports:', historicalError)
      }

      // Fetch detailed breakdown data for charts
      let detailedData = null
      try {
        if (selectedPeriod === "last-month") {
          // Get daily breakdown for the month
          const detailedParams = new URLSearchParams({
            brandId: selectedBrandId,
            from: fromDate,
            to: toDate,
            breakdown: 'daily'
          })
          
          const [detailedShopifyResponse, detailedMetaResponse] = await Promise.all([
            fetch(`/api/analytics?${detailedParams.toString()}`),
            fetch(`/api/analytics/meta?${detailedParams.toString()}`)
          ])
          
          if (detailedShopifyResponse.ok && detailedMetaResponse.ok) {
            const detailedShopify = await detailedShopifyResponse.json()
            const detailedMeta = await detailedMetaResponse.json()
            detailedData = { shopify: detailedShopify, meta: detailedMeta, type: 'daily' }
          }
        } else if (selectedPeriod === "today") {
          // Get hourly breakdown for today
          const detailedParams = new URLSearchParams({
            brandId: selectedBrandId,
            from: fromDate,
            to: toDate,
            breakdown: 'hourly'
          })
          
          const [detailedShopifyResponse, detailedMetaResponse] = await Promise.all([
            fetch(`/api/analytics?${detailedParams.toString()}`),
            fetch(`/api/analytics/meta?${detailedParams.toString()}`)
          ])
          
          if (detailedShopifyResponse.ok && detailedMetaResponse.ok) {
            const detailedShopify = await detailedShopifyResponse.json()
            const detailedMeta = await detailedMetaResponse.json()
            detailedData = { shopify: detailedShopify, meta: detailedMeta, type: 'hourly' }
          }
        }
      } catch (detailedError) {
        console.error('❌ Error fetching detailed data for charts:', detailedError)
      }

      const greeting = `${getGreeting()}, ${getUserFirstName()}`

      const dataForAi = {
        date_range: {
          from: fromDate,
          to: toDate,
          period_days: Math.round((dateRange.to!.getTime() - dateRange.from!.getTime()) / (1000 * 60 * 60 * 24)),
          period_name: selectedPeriod,
          snapshot_time: snapshotTime
        },
        brand: {
          id: selectedBrandId,
          name: selectedBrand?.name || "Unknown Brand",
          industry: "E-commerce"
        },
        platforms: {
          shopify: shopifyData,
          meta: metaData
        },
        detailed_breakdown: detailedData,
        user: {
          greeting
        },
        historical_context: {
          previous_reports: historicalReports,
          count: historicalReports.length,
          note: "Use this historical data to identify trends, track improvements, evaluate recommendation effectiveness, and provide comparative analysis."
        },
        formatting_instructions: {
          style: "Create a comprehensive, detailed marketing report with HISTORICAL COMPARISON and IMPROVEMENT TRACKING. Be verbose and educational - even with limited data, provide thorough analysis and context. Structure: 1. Executive Summary (detailed overview with context and period-over-period changes), 2. Performance Overview (analyze all available metrics with explanations and historical comparison), 3. Historical Performance Analysis (compare current metrics to previous periods, identify trends, track improvement/decline), 4. Shopify E-commerce Analysis (detailed store performance, customer behavior, conversion insights with historical context), 5. Meta/Facebook Ads Analysis (campaign performance, targeting effectiveness, creative analysis with trend analysis), 6. Performance Trends Analysis (analyze patterns from detailed breakdown data and historical reports), 7. Recommendation Effectiveness Review (evaluate previous recommendations and their outcomes), 8. Customer & Market Insights (demographic analysis, behavioral patterns, changes over time), 9. Competitive Positioning & Opportunities, 10. Technical & Strategic Issues Identified, 11. Detailed Actionable Recommendations (specific, step-by-step strategies based on what has/hasn't worked historically). For each section: provide context, explain metrics significance, include industry benchmarks when relevant, compare to historical performance, track recommendation implementation success, suggest improvements based on historical data, and educate on best practices. Use professional marketing terminology and make recommendations specific and actionable. When historical data is available, always compare current performance to previous periods and explain what changes mean for the business."
        }
      }

      // Send data to AI for analysis
      const aiResponse = await fetch('/api/ai/analyze-marketing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataForAi)
      })

      if (!aiResponse.ok) {
        throw new Error(`AI API request failed: ${aiResponse.status}`)
      }

      const aiResult = await aiResponse.json()
      console.log('🔍 Full AI response:', aiResult)

            // Handle different response formats from the backend API
      const analysis = aiResult.report || aiResult.analysis || aiResult.result || 
        (aiResult.message && aiResult.message !== "Successfully generated AI report" ? aiResult.message : null) || 
        (typeof aiResult === 'string' ? aiResult : null);
      console.log('🎯 Extracted analysis:', analysis);

      if (!analysis) {
        console.error('AI result structure:', aiResult);
        console.error('AI result structure:', aiResult);
        console.error('Available fields:', Object.keys(aiResult));
        throw new Error("No analysis returned from AI")
      }

      // Generate performance charts based on detailed data
      const generatePerformanceChart = () => {
        if (!detailedData) return ''

        if (detailedData.type === 'daily') {
          // Monthly calendar view
          return `
            <div class="performance-chart-section">
              <h3>Daily Performance Calendar - ${format(dateRange.from!, 'MMMM yyyy')}</h3>
              <div class="calendar-chart">
                ${generateMonthlyCalendarChart(detailedData, dateRange.from!)}
              </div>
            </div>
          `
        } else if (detailedData.type === 'hourly') {
          // Daily hourly timeline
          return `
            <div class="performance-chart-section">
              <h3>Hourly Performance Timeline - ${format(dateRange.from!, 'MMMM d, yyyy')}</h3>
              <div class="hourly-chart">
                ${generateHourlyTimelineChart(detailedData)}
              </div>
            </div>
          `
        }
        return ''
      }

      const generateMonthlyCalendarChart = (data: any, startDate: Date) => {
        const daysInMonth = endOfMonth(startDate).getDate()
        const firstDayOfWeek = startDate.getDay()
        
        let calendarHTML = `
          <div class="calendar-grid">
            <div class="calendar-header">
              <div class="day-label">Sun</div>
              <div class="day-label">Mon</div>
              <div class="day-label">Tue</div>
              <div class="day-label">Wed</div>
              <div class="day-label">Thu</div>
              <div class="day-label">Fri</div>
              <div class="day-label">Sat</div>
            </div>
            <div class="calendar-body">
        `
        
        // Add empty cells for days before month starts
        for (let i = 0; i < firstDayOfWeek; i++) {
          calendarHTML += '<div class="calendar-day empty"></div>'
        }
        
        // Add days of the month with data
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = format(new Date(startDate.getFullYear(), startDate.getMonth(), day), 'yyyy-MM-dd')
          const dayData = data.shopify?.find((d: any) => d.date === dateStr) || {}
          const adData = data.meta?.find((d: any) => d.date === dateStr) || {}
          
          const revenue = dayData.total_revenue || 0
          const adSpend = adData.spend || 0
          const roas = adSpend > 0 ? revenue / adSpend : 0
          
          const intensity = Math.min(revenue / 100, 1) // Normalize for color intensity
          
          calendarHTML += `
            <div class="calendar-day" style="background-color: rgba(34, 197, 94, ${intensity * 0.7});">
              <div class="day-number">${day}</div>
              <div class="day-metrics">
                <div class="metric">$${revenue.toFixed(0)}</div>
                <div class="metric-small">ROAS: ${roas.toFixed(1)}</div>
              </div>
            </div>
          `
        }
        
        calendarHTML += `
            </div>
          </div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="legend-color" style="background: rgba(34, 197, 94, 0.7);"></div>
              <span>Higher Revenue</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: rgba(34, 197, 94, 0.2);"></div>
              <span>Lower Revenue</span>
            </div>
          </div>
        `
        
        return calendarHTML
      }

      const generateHourlyTimelineChart = (data: any) => {
        const hours = Array.from({length: 24}, (_, i) => i)
        
        let timelineHTML = `
          <div class="hourly-timeline">
        `
        
        const maxRevenue = Math.max(...(data.shopify?.map((d: any) => d.total_revenue || 0) || [1]))
        
        hours.forEach(hour => {
          const hourData = data.shopify?.find((d: any) => new Date(d.datetime).getHours() === hour) || {}
          const adData = data.meta?.find((d: any) => new Date(d.datetime).getHours() === hour) || {}
          
          const revenue = hourData.total_revenue || 0
          const adSpend = adData.spend || 0
          const height = (revenue / maxRevenue) * 100
          
          timelineHTML += `
            <div class="timeline-hour">
              <div class="hour-bar" style="height: ${height}%; background: linear-gradient(to top, #22c55e, #16a34a);"></div>
              <div class="hour-label">${hour}:00</div>
              <div class="hour-tooltip">
                <div>Revenue: $${revenue.toFixed(2)}</div>
                <div>Ad Spend: $${adSpend.toFixed(2)}</div>
              </div>
            </div>
          `
        })
        
        timelineHTML += `
          </div>
          <div class="timeline-legend">
            <div class="legend-title">Revenue by Hour</div>
            <div class="legend-subtitle">Hover over bars for details</div>
          </div>
        `
        
        return timelineHTML
      }

      const performanceChartHTML = generatePerformanceChart()

      // Create formatted report with optional snapshot time info
      const brandName = selectedBrand?.name || "Unknown Brand"
      const currentDate = format(new Date(), 'MMMM d, yyyy')
      const snapshotLabel = snapshotTime ? format(parse(snapshotTime, 'HH:mm', new Date()), 'h:mm a') : null
      
      // Generate unique report ID using timestamp to avoid hydration issues
      const reportId = `${selectedBrand?.name?.slice(0, 3).toUpperCase() || 'UNK'}${Date.now().toString(36).slice(-6).toUpperCase()}`
      
      const formattedReport = `
        <style>
          /* Reset and isolation styles */
          .report-wrapper {
            all: initial;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #000000 !important;
            min-height: auto;
            height: auto;
            margin: 0;
            padding: 0;
            display: block !important;
          }
          
          .report-wrapper * {
            all: unset;
            display: revert;
            box-sizing: border-box;
          }
          
          /* Container styles */
          .report-wrapper .report-container {
            background: transparent !important;
            color: #ffffff !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            margin-bottom: 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
          }
          
          /* Header styles */
          .report-wrapper .report-header {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%) !important;
            color: #ffffff !important;
            padding: 2rem !important;
            border-bottom: 1px solid #333333 !important;
            position: relative !important;
            overflow: hidden !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            gap: 2rem !important;
            margin: 0 !important;
            width: 100% !important;
          }
          
          /* Remove header gradient line for cleaner PDF */
          .report-wrapper .report-header::before {
            display: none !important;
          }
          
          .report-wrapper .report-header-left {
            position: relative !important;
            z-index: 2 !important;
            flex: 1 !important;
          }
          
          .report-wrapper .report-header h1 {
            color: #ffffff !important;
            font-size: 2.5rem !important;
            font-weight: 800 !important;
            margin: 0 0 1rem 0 !important;
            display: block !important;
            letter-spacing: -0.02em !important;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
          }
          
          .report-wrapper .report-subtitle {
            color: #cccccc !important;
            font-size: 1.1rem !important;
            margin: 0 0 2rem 0 !important;
            font-weight: 500 !important;
            display: block !important;
            line-height: 1.4 !important;
          }
          
          /* Header Right - Brand Section */
          .report-wrapper .header-brand-section {
            position: relative !important;
            background: #2a2a2a !important;
            border: 1px solid #444444 !important;
            border-radius: 12px !important;
            padding: 1.5rem !important;
            display: flex !important;
            align-items: center !important;
            gap: 1rem !important;
            min-width: 250px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            margin-top: 0.5rem !important;
            flex-shrink: 0 !important;
          }
          
          /* Remove white accent bar in PDF to avoid clutter */
          .report-wrapper .header-brand-section::before {
            display: none !important;
          }
          
          .report-wrapper .brand-logo {
            width: 50px !important;
            height: 50px !important;
            background: #1a1a1a !important;
            border: 1px solid #333 !important;
            border-radius: 8px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 8px !important;
            overflow: hidden !important;
            flex-shrink: 0 !important;
          }
          
          .report-wrapper .brand-logo img {
            max-width: 100% !important;
            max-height: 100% !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
            border-radius: 4px !important;
          }
          
          .report-wrapper .brand-logo span {
            color: #ffffff !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            letter-spacing: 0.05em !important;
          }
          
          .report-wrapper .brand-info {
            flex: 1 !important;
            min-width: 0 !important;
          }
          
          .report-wrapper .brand-label {
            color: #9ca3af !important;
            font-size: 0.75rem !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            margin-bottom: 0.25rem !important;
          }
          
          .report-wrapper .brand-name {
            color: #ffffff !important;
            font-size: 1.1rem !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
            word-break: break-word !important;
          }
          
          /* Hamburger-style stacked info items */
          .report-wrapper .info-stack {
            background: rgba(42, 42, 42, 0.6) !important;
            border: 1px solid #333333 !important;
            border-radius: 8px !important;
            padding: 1rem !important;
            margin-top: 1.5rem !important;
            backdrop-filter: blur(10px) !important;
            max-width: 280px !important;
          }
          
          .report-wrapper .info-item {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 0.75rem 0 !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          }
          
          .report-wrapper .info-item:last-child {
            border-bottom: none !important;
            padding-bottom: 0 !important;
          }
          
          .report-wrapper .info-item:first-child {
            padding-top: 0 !important;
          }
          
          .report-wrapper .info-label {
            color: #9ca3af !important;
            font-size: 0.75rem !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
          }
          
          .report-wrapper .info-value {
            color: #ffffff !important;
            font-size: 0.875rem !important;
            font-weight: 700 !important;
            text-align: right !important;
          }
          
          .report-wrapper .info-value.monospace {
            font-family: 'Courier New', monospace !important;
            font-size: 0.8rem !important;
          }
          

          
          /* Content styles */
          .report-wrapper .report-content {
            padding: 2rem !important;
            background: transparent !important;
            min-height: 500px !important;
            position: relative !important;
            width: 100% !important;
          }
          
          /* Remove content gradient line for cleaner PDF */
          .report-wrapper .report-content::before {
            display: none !important;
          }
          
          .report-wrapper .content-section {
            background: #1a1a1a !important;
            border: 1px solid #2a2a2a !important;
            border-radius: 12px !important;
            padding: 2rem !important;
            margin: 2rem 0 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
          }
          
          .report-wrapper .report-content h2 {
            color: #ffffff !important;
            font-size: 1.75rem !important;
            font-weight: 700 !important;
            margin: 0 0 1.5rem 0 !important;
            padding: 0 0 1rem 0 !important;
            border-bottom: 2px solid #444444 !important;
            display: block !important;
            position: relative !important;
          }
          
          .report-wrapper .report-content h2::before {
            content: '' !important;
            position: absolute !important;
            bottom: -2px !important;
            left: 0 !important;
            width: 60px !important;
            height: 2px !important;
            background: #ffffff !important;
          }
          
          .report-wrapper .report-content h2:first-child {
            margin-top: 0 !important;
          }
          
          .report-wrapper .report-content h3 {
            color: #f3f4f6 !important;
            font-size: 1.35rem !important;
            font-weight: 600 !important;
            margin: 2rem 0 1rem 0 !important;
            display: block !important;
            padding-left: 1rem !important;
            border-left: 3px solid #666666 !important;
          }
          
          .report-wrapper .report-content p {
            color: #d1d5db !important;
            margin-bottom: 1.25rem !important;
            line-height: 1.8 !important;
            font-size: 1.05rem !important;
            display: block !important;
            background: none !important;
            padding: 0 !important;
            border: none !important;
          }
          
          .report-wrapper .report-content ul {
            margin: 0 0 1.5rem 1.5rem !important;
            list-style: none !important;
            display: block !important;
          }
          
          .report-wrapper .report-content li {
            color: #d1d5db !important;
            margin-bottom: 0.75rem !important;
            line-height: 1.7 !important;
            font-size: 1.05rem !important;
            display: list-item !important;
            position: relative !important;
            padding-left: 1.5rem !important;
          }
          
          .report-wrapper .report-content li::before {
            content: '▸' !important;
            color: #666666 !important;
            font-weight: bold !important;
            position: absolute !important;
            left: 0 !important;
          }
          
          .report-wrapper .report-content strong {
            color: #ffffff !important;
            font-weight: 700 !important;
            background: transparent !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
          
          /* Footer styles */
          .report-wrapper .report-footer {
            background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%) !important;
            padding: 2rem !important;
            border-top: 1px solid #333333 !important;
            position: relative !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-end !important;
            margin: 0 !important;
            border-bottom: none !important;
            margin-bottom: 0 !important;
            width: 100% !important;
          }
          
          /* Remove any decorative lines that might show in PDF */
          .report-wrapper .report-footer::before,
          .report-wrapper .report-footer::after {
            display: none !important;
          }
          
          /* Footer Left - Agency Logo and Info */
          .report-wrapper .footer-left {
            display: flex !important;
            align-items: center !important;
            gap: 1rem !important;
          }
          
          .report-wrapper .footer-agency-logo {
            width: 60px !important;
            height: 60px !important;
            background: #2a2a2a !important;
            border: 2px solid #444444 !important;
            border-radius: 12px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-shrink: 0 !important;
            position: relative !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
          }
          
          /* Remove white accent bar in PDF to avoid clutter */
          .report-wrapper .footer-agency-logo::before {
            display: none !important;
          }
          
          /* Performance Chart Styles */
          .report-wrapper .performance-chart-section {
            margin: 2rem 0 !important;
            background: #1a1a1a !important;
            border: 1px solid #2a2a2a !important;
            border-radius: 8px !important;
            padding: 1.5rem !important;
          }
          
          .report-wrapper .performance-chart-section h3 {
            color: #ffffff !important;
            font-size: 1.2rem !important;
            margin-bottom: 1rem !important;
            border-bottom: 1px solid #333 !important;
            padding-bottom: 0.5rem !important;
          }
          
          /* Calendar Chart Styles */
          .report-wrapper .calendar-grid {
            display: grid !important;
            grid-template-rows: auto 1fr !important;
            gap: 1rem !important;
            max-width: 700px !important;
          }
          
          .report-wrapper .calendar-header {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 2px !important;
          }
          
          .report-wrapper .day-label {
            text-align: center !important;
            font-weight: 600 !important;
            color: #9ca3af !important;
            font-size: 0.75rem !important;
            padding: 0.5rem !important;
          }
          
          .report-wrapper .calendar-body {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 2px !important;
          }
          
          .report-wrapper .calendar-day {
            aspect-ratio: 1 !important;
            border: 1px solid #333 !important;
            border-radius: 4px !important;
            padding: 0.25rem !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: relative !important;
            min-height: 60px !important;
          }
          
          .report-wrapper .calendar-day.empty {
            border: none !important;
            background: transparent !important;
          }
          
          .report-wrapper .day-number {
            font-weight: 600 !important;
            color: #ffffff !important;
            font-size: 0.8rem !important;
          }
          
          .report-wrapper .day-metrics {
            font-size: 0.6rem !important;
            color: #ffffff !important;
            text-align: center !important;
          }
          
          .report-wrapper .metric {
            font-weight: 600 !important;
            margin-bottom: 1px !important;
          }
          
          .report-wrapper .metric-small {
            font-size: 0.5rem !important;
            opacity: 0.8 !important;
          }
          
          /* Hourly Timeline Styles */
          .report-wrapper .hourly-timeline {
            display: flex !important;
            align-items: flex-end !important;
            height: 200px !important;
            gap: 3px !important;
            padding: 1rem 0 !important;
            position: relative !important;
          }
          
          .report-wrapper .timeline-hour {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            position: relative !important;
          }
          
          .report-wrapper .hour-bar {
            width: 100% !important;
            border-radius: 2px 2px 0 0 !important;
            transition: all 0.3s ease !important;
            min-height: 2px !important;
          }
          
          .report-wrapper .hour-label {
            font-size: 0.6rem !important;
            color: #9ca3af !important;
            margin-top: 0.25rem !important;
            writing-mode: vertical-rl !important;
            text-orientation: mixed !important;
          }
          
          .report-wrapper .hour-tooltip {
            position: absolute !important;
            bottom: 100% !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: #2a2a2a !important;
            color: #ffffff !important;
            padding: 0.25rem 0.5rem !important;
            border-radius: 4px !important;
            font-size: 0.6rem !important;
            white-space: nowrap !important;
            opacity: 0 !important;
            pointer-events: none !important;
            border: 1px solid #444 !important;
          }
          
          .report-wrapper .timeline-hour:hover .hour-tooltip {
            opacity: 1 !important;
          }
          
          /* Chart Legend Styles */
          .report-wrapper .chart-legend,
          .report-wrapper .timeline-legend {
            display: flex !important;
            align-items: center !important;
            gap: 1rem !important;
            margin-top: 1rem !important;
            font-size: 0.8rem !important;
          }
          
          .report-wrapper .legend-item {
            display: flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
          }
          
          .report-wrapper .legend-color {
            width: 12px !important;
            height: 12px !important;
            border-radius: 2px !important;
          }
          
          .report-wrapper .legend-title {
            color: #ffffff !important;
            font-weight: 600 !important;
          }
          
          .report-wrapper .legend-subtitle {
            color: #9ca3af !important;
          }
          
          .report-wrapper .footer-agency-logo img {
            max-width: 52px !important;
            max-height: 52px !important;
            width: auto !important;
            height: auto !important;
            border-radius: 8px !important;
            object-fit: contain !important;
          }
          
          .report-wrapper .footer-agency-logo span {
            color: #ffffff !important;
            font-size: 18px !important;
            font-weight: 700 !important;
            letter-spacing: 0.05em !important;
          }
          
          .report-wrapper .footer-agency-info {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.25rem !important;
          }
          
          .report-wrapper .footer-agency-name {
            color: #ffffff !important;
            font-size: 1.1rem !important;
            font-weight: 700 !important;
            line-height: 1.2 !important;
          }
          
          .report-wrapper .footer-agency-tagline {
            color: #9ca3af !important;
            font-size: 0.875rem !important;
            font-weight: 500 !important;
          }
          
          /* Footer Right - Document Info */
          .report-wrapper .footer-right {
            text-align: right !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 0.5rem !important;
            align-items: flex-end !important;
          }
          
          .report-wrapper .document-status {
            background: rgba(239, 68, 68, 0.1) !important;
            border: 1px solid #ef4444 !important;
            color: #ef4444 !important;
            padding: 0.375rem 0.75rem !important;
            border-radius: 6px !important;
            font-size: 0.75rem !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
          }
          
          .report-wrapper .footer-metadata {
            display: flex !important;
            flex-direction: column !important;
            gap: 0.25rem !important;
            align-items: flex-end !important;
          }
          
          .report-wrapper .timestamp {
            color: #9ca3af !important;
            font-size: 0.75rem !important;
            font-family: 'Courier New', monospace !important;
            background: #2a2a2a !important;
            padding: 0.25rem 0.5rem !important;
            border-radius: 4px !important;
            border: 1px solid #333333 !important;
          }
          
          .report-wrapper .report-id {
            color: #cccccc !important;
            font-size: 0.75rem !important;
            font-family: 'Courier New', monospace !important;
          }
          
          /* Mobile Responsive */
          @media (max-width: 768px) {
            .report-wrapper .report-container {
              margin: 0 !important;
              max-width: 100% !important;
            }
            
            .report-wrapper .report-header {
              padding: 2rem 1.5rem !important;
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 2rem !important;
            }
            
            .report-wrapper .header-brand-section {
              min-width: 100% !important;
              order: -1 !important;
            }
            
            .report-wrapper .info-stack {
              max-width: 100% !important;
            }
            
            .report-wrapper .report-content {
              padding: 2rem 1.5rem 0 1.5rem !important;
              margin-bottom: 0 !important;
            }
            
            .report-wrapper .content-section {
              padding: 1.5rem 1.5rem 0 1.5rem !important;
            }
            
            .report-wrapper .report-footer {
              padding: 2rem 1.5rem 0 1.5rem !important;
              flex-direction: column !important;
              gap: 1.5rem !important;
              align-items: flex-start !important;
              min-height: 100px !important;
            }
            
            .report-wrapper .footer-right {
              align-items: flex-start !important;
              text-align: left !important;
            }
          }
          
          /* Print styles */
          @media print {
            body { 
              background: #000000 !important; 
              margin: 0 !important;
              padding: 0 !important;
            }
            
            .report-wrapper {
              background: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            .report-wrapper .report-container {
              background: #000000 !important;
              box-shadow: none !important;
              max-width: none !important;
              margin: 0 !important;
            }
            
            .report-wrapper .report-header::before,
            .report-wrapper .report-content::before,
            .report-wrapper .report-footer::before,
            .report-wrapper .report-footer::after {
              display: none !important;
            }
            
            .report-wrapper strong {
              background: transparent !important;
              padding: 0 !important;
            }
          }
        </style>
        
        <div class="report-wrapper">
          <div class="report-container">
            <!-- Enhanced Header -->
            <div class="report-header">
              <div class="report-header-left">
                <h1>MARKETING PERFORMANCE REPORT</h1>
                <div class="report-subtitle">Comprehensive marketing analysis and performance insights for ${brandName}</div>
                
                <!-- Hamburger-style Stacked Info -->
                <div class="info-stack">
                  <div class="info-item">
                    <span class="info-label">Period</span>
                    <span class="info-value">${selectedPeriod === "today" ? format(dateRange.from!, 'MMM d, yyyy') : format(dateRange.from!, 'MMMM yyyy')}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Generated</span>
                    <span class="info-value">${format(new Date(), 'MMM d, yyyy')}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Report ID</span>
                    <span class="info-value monospace">${reportId}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Generated by</span>
                    <span class="info-value">${user?.fullName || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'Unknown User'}</span>
                  </div>
                </div>
              </div>
              
              <!-- Brand Section - Top Right -->
              <div class="header-brand-section">
                <div class="brand-logo">
                  ${selectedBrand?.image_url 
                    ? `<img src="${selectedBrand.image_url}" alt="${brandName} Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" />`
                    : `<span>${brandName.slice(0, 2).toUpperCase()}</span>`
                  }
                </div>
                <div class="brand-info">
                  <div class="brand-label">Brand</div>
                  <div class="brand-name">${brandName}</div>
                </div>
              </div>
            </div>
            
            <!-- Enhanced Report content -->
            <div class="report-content">
              <div class="content-section">
                ${analysis}
              </div>
              
              ${performanceChartHTML ? `
                <div class="content-section">
                  ${performanceChartHTML}
                </div>
              ` : ''}
            </div>
            
            <!-- Enhanced Footer with Agency Logo on Left -->
            <div class="report-footer">
              <div class="footer-left">
                <div class="footer-agency-logo">
                  ${agencySettings.agency_logo_url 
                    ? `<img src="${agencySettings.agency_logo_url}" alt="Agency Logo" />`
                    : `<span>${agencySettings.agency_name.slice(0, 2).toUpperCase()}</span>`
                  }
                </div>
                <div class="footer-agency-info">
                  <div class="footer-agency-name">
                    ${agencySettings.agency_name && agencySettings.agency_name.trim() !== 'Brez Marketing Assistant' 
                      ? agencySettings.agency_name 
                      : "Marketing Intelligence"
                    }
                  </div>
                  <div class="footer-agency-tagline">
                    Professional Marketing Analytics
                  </div>
                </div>
              </div>
              
              <div class="footer-right">
                <div class="document-status">CONFIDENTIAL & PROPRIETARY</div>
                <div class="footer-metadata">
                  <div class="timestamp">${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</div>
                  <div class="report-id">ID: ${reportId}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `

      // Save to database with snapshot time
      await saveReportToDatabase(selectedBrandId, fromDate, toDate, selectedPeriod, formattedReport, JSON.stringify(aiResult), snapshotTime)

      // Update state
      const newReport: DailyReport = {
        content: formattedReport,
        createdAt: new Date().toISOString(),
        snapshotTime: snapshotTime || "manual",
        data: aiResult
      }

      // Reload all daily reports to get the updated list
      const allReports = await loadDailyReports(selectedBrandId, fromDate, toDate, selectedPeriod)
      setDailyReports(allReports)
      setSelectedReport(newReport)

          toast({
        title: "Report generated successfully",
        description: snapshotLabel 
          ? `Your ${snapshotLabel} marketing snapshot is ready to view.`
          : "Your manual refresh report is ready to view.",
        variant: "default"
        })

    } catch (error) {
      console.error("Error generating AI report:", error)
      toast({
        title: "Failed to generate report",
        description: "An error occurred while creating your marketing report.",
        variant: "destructive"
      })
    } finally {
      setIsLoadingReport(false)
    }
  }



  // Export the report to PDF
  const exportToPdf = async () => {
    if (!selectedReport) {
        toast({
        title: "No report available",
        description: "Generate a report first before exporting to PDF.",
        variant: "destructive"
        });
        return;
    }
    
    try {
      setIsExportingPdf(true)
      
      toast({
        title: "Preparing PDF export...",
        description: "Please wait while we generate your PDF."
      });
      
      // Dynamically import the libraries only when needed
      const jspdfPromise = import('jspdf');
      const html2canvasPromise = import('html2canvas');
      
      // Create a temporary container for the report
      const container = document.createElement('div');
      container.className = 'pdf-export-container';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '800px'; // Fixed width for PDF
      container.style.backgroundColor = '#000000'; // Match background color
      container.style.color = '#ffffff'; // Ensure text is visible
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      container.style.margin = '0';
      container.style.padding = '0';
      container.style.overflow = 'hidden';
      document.body.appendChild(container);
      
      // Get the current report content and parse it
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(selectedReport.content, 'text/html');
      
      // Find the report wrapper/container
      const reportWrapper = htmlDoc.querySelector('.report-wrapper');
      const reportElement = htmlDoc.querySelector('.report-container');
      
      // Use the report wrapper if available, otherwise use container
      const reportContent = reportWrapper ? reportWrapper.outerHTML : 
                           reportElement ? reportElement.outerHTML : 
                           selectedReport.content;
      
      // Insert the content to our container
      container.innerHTML = reportContent;
      
      // Wait for dynamic imports
      const [jspdfModule, html2canvasModule] = await Promise.all([
        jspdfPromise,
        html2canvasPromise
      ]);
      
      // Get the actual height of the report content
      const reportContainer = container.querySelector('.report-container');
      if (!reportContainer) {
        throw new Error("Could not find report container element");
      }
      
      // Ensure the container and all its children are visible for height calculation
      const allElements = container.querySelectorAll('*');
      allElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.visibility = 'visible';
          el.style.display = el.tagName.toLowerCase() === 'div' ? 'block' : '';
        }
      });
      
      // Extract the default exports
      const jsPDF = jspdfModule.default;
      const html2canvas = html2canvasModule.default;
      
      // Get the target element to render
      const targetElement = container.querySelector('.report-wrapper') || 
                           container.querySelector('.report-container') || 
                           container;
      
      // Render the canvas with proper dimensions for a single long PDF
      const canvas = await html2canvas(targetElement as HTMLElement, {
        scale: 1.5, // Good balance of quality and performance
        useCORS: true,
        logging: false,
        backgroundColor: '#000000', // Match the dark theme background
        windowWidth: 800,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          // Set body background to prevent white space
          if (clonedDoc.body) {
            clonedDoc.body.style.backgroundColor = '#000000';
            clonedDoc.body.style.margin = '0';
            clonedDoc.body.style.padding = '0';
          }
          
          // Ensure all elements are visible and properly styled
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.visibility = 'visible';
              el.style.opacity = '1';
            }
          });
          
          // Remove any UI elements that shouldn't be in the PDF
          const excludedSelectors = [
            '.export-exclude',
            'button',
            '.controls-section',
            '.loading-spinner',
            '.toast',
            '.tooltip'
          ];
          
          excludedSelectors.forEach(selector => {
            const elements = clonedDoc.querySelectorAll(selector);
            elements.forEach((el: Element) => el.remove());
          });
          
          // Ensure consistent styling for PDF
          const reportWrapper = clonedDoc.querySelector('.report-wrapper');
          if (reportWrapper instanceof HTMLElement) {
            reportWrapper.style.backgroundColor = '#000000';
            reportWrapper.style.padding = '0';
            reportWrapper.style.margin = '0';
            reportWrapper.style.minHeight = 'auto';
            reportWrapper.style.height = 'auto';
          }
          
          const reportContainer = clonedDoc.querySelector('.report-container');
          if (reportContainer instanceof HTMLElement) {
            reportContainer.style.maxWidth = 'none';
            reportContainer.style.width = '800px';
            reportContainer.style.margin = '0';
            reportContainer.style.backgroundColor = '#000000';
            reportContainer.style.color = '#ffffff';
            reportContainer.style.boxShadow = 'none';
            reportContainer.style.minHeight = 'auto';
            reportContainer.style.height = 'auto';
          }
          
          // Fix any highlighted text
          const allStrong = clonedDoc.querySelectorAll('strong');
          allStrong.forEach(el => {
            if (el instanceof HTMLElement) {
              el.style.background = 'transparent';
              el.style.padding = '0';
            }
          });
          
          // Fix logo aspect ratios to prevent stretching
          const logoImages = clonedDoc.querySelectorAll('.footer-agency-logo img, .brand-logo img');
          logoImages.forEach(img => {
            if (img instanceof HTMLImageElement) {
              img.style.width = 'auto';
              img.style.height = 'auto';
              img.style.maxWidth = '100%';
              img.style.maxHeight = '100%';
              img.style.objectFit = 'contain';
            }
          });
          
          // Ensure footer has no extra margins or padding that could cause white space
          const footer = clonedDoc.querySelector('.report-footer');
          if (footer instanceof HTMLElement) {
            footer.style.marginBottom = '0';
            footer.style.paddingBottom = '0';
            footer.style.borderBottom = 'none';
            footer.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%)';
            footer.style.minHeight = '120px';
          }
        }
      });
      
      // Get canvas dimensions and trim any white space
      const imgWidth = 210; // A4 width in mm
      let imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create canvas context to analyze for white space
      const canvasContext = canvas.getContext('2d');
      const imageData = canvasContext?.getImageData(0, 0, canvas.width, canvas.height);
      
      // Find the last non-white row to trim white space
      if (imageData) {
        let lastContentRow = canvas.height;
        for (let y = canvas.height - 1; y >= 0; y--) {
          let hasContent = false;
          for (let x = 0; x < canvas.width; x++) {
            const pixelIndex = (y * canvas.width + x) * 4;
            const r = imageData.data[pixelIndex];
            const g = imageData.data[pixelIndex + 1];
            const b = imageData.data[pixelIndex + 2];
            
            // Check if pixel is not white/transparent (allowing for slight variations)
            if (r < 250 || g < 250 || b < 250) {
              hasContent = true;
              break;
            }
          }
          if (hasContent) {
            lastContentRow = y + 10; // Add small buffer
            break;
          }
        }
        
        // Adjust height if white space was found
        if (lastContentRow < canvas.height - 50) { // Only trim if significant white space
          imgHeight = (lastContentRow * imgWidth) / canvas.width;
        }
      }
      
      // Create new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight],
        hotfixes: ['px_scaling']
      });
      
      // Convert canvas to image with high quality
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      
      // Save PDF with descriptive filename
      const brandName = brands.find(brand => brand.id === selectedBrandId)?.name || "Brand";
      const reportPeriod = selectedPeriod === "today" 
        ? format(new Date(), 'yyyy-MM-dd')
        : format(dateRange.from!, 'yyyy-MM');
      const snapshotLabel = selectedReport.snapshotTime === "manual" 
        ? "manual" 
        : (selectedReport.snapshotTime || "unknown").replace(':', '-');
      
      // Clean brand name for filename
      const cleanBrandName = brandName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      
      pdf.save(`${cleanBrandName}-performance-report-${reportPeriod}-${snapshotLabel}.pdf`);
      
      // Remove the temporary container
      document.body.removeChild(container);
      
      toast({
        title: "PDF export successful",
        description: "The marketing report has been downloaded.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Failed to export PDF",
        description: "An error occurred while creating the PDF.",
        variant: "destructive"
      });
    } finally {
      setIsExportingPdf(false)
    }
  };



  // Handle manual refresh with dynamic availability checking
  const handleManualRefresh = () => {
    if (!selectedBrandId) {
      toast({
        title: "Error",
        description: "Please select a brand first",
        variant: "destructive"
      })
      return
    }
    
    // Check permission to generate reports for this brand
    if (!canGenerateReports()) {
      const selectedBrand = brands.find(brand => brand.id === selectedBrandId)
      const agencyName = selectedBrand?.agency_info?.name || "the brand owner"
      toast({
        title: "Permission Denied",
        description: `You do not have permission to generate reports for this brand. Contact ${agencyName} to request report generation access.`,
        variant: "destructive"
      })
      return
    }
    
    const availability = getRefreshAvailability()
    
    if (!availability.available) {
      toast({
        title: "Report not available",
        description: `${availability.reason}${availability.nextAvailable ? ` - ${availability.nextAvailable}` : ''}`,
        variant: "destructive"
      })
      return
    }
    
    console.log('🔄 Manual refresh triggered')
    
    // Set the last generation date for daily reports
    if (selectedPeriod === "today") {
      const today = format(new Date(), 'yyyy-MM-dd')
      setLastManualGeneration(today)
      // Store both brand-specific and global for backward compatibility
      if (selectedBrandId) {
        localStorage.setItem(`lastManualGeneration_${selectedBrandId}`, today)
      }
      localStorage.setItem('lastManualGeneration', today)
    }
    
    // Generate report without snapshot time (null will be saved to database)
    generateAiReport(null, true)
  }







  // Effect to load reports when brand or period changes
  useEffect(() => {
    console.log('🔄 useEffect triggered:', { selectedBrandId, selectedPeriod, dateRange })
      
    if (selectedBrandId && dateRange.from && dateRange.to && user?.id && mounted) {
      console.log(`📊 Loading reports for brand: ${selectedBrandId}, period: ${selectedPeriod}`)
      setIsLoadingReport(true)
      
      const fromDate = format(dateRange.from, 'yyyy-MM-dd')
      const toDate = format(dateRange.to, 'yyyy-MM-dd')
      
      // Load all daily reports
      loadDailyReports(selectedBrandId, fromDate, toDate, selectedPeriod)
        .then(reports => {
          setDailyReports(reports)
          
          // Check if there's a manual report from today to set rate limiting
          const today = format(new Date(), 'yyyy-MM-dd')
          const todayManualReport = reports.find((report: DailyReport) => 
            report.snapshotTime === "manual" && 
            format(new Date(report.createdAt), 'yyyy-MM-dd') === today
          )
          
          if (todayManualReport) {
            setLastManualGeneration(today)
            // Also update localStorage for persistence
            if (selectedBrandId) {
              localStorage.setItem(`lastManualGeneration_${selectedBrandId}`, today)
            }
          }
          
          if (reports.length > 0) {
            // Select the most recent report by default
            const latest = reports.sort((a: DailyReport, b: DailyReport) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            setSelectedReport(latest)
            
            console.log('✅ Loaded existing reports')
          } else {
            console.log('ℹ️ No existing reports found')
            setSelectedReport(null)
          }
          
          setIsLoadingReport(false)
        })
        .catch(error => {
          console.error('❌ Error loading reports:', error)
          setDailyReports([])
          setSelectedReport(null)
          setIsLoadingReport(false)
        })
    } else {
      console.log('⏳ Waiting for brand selection or user authentication')
    }
  }, [selectedBrandId, selectedPeriod, dateRange.from, dateRange.to, user?.id, mounted])

  // Show loading state with enhanced progress display
  if (isLoadingPage) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden" style={{ paddingBottom: '15vh' }}>
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
            <div className="absolute inset-0 rounded-full border-4 border-t-white/60 animate-spin"></div>
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
          
          {/* Loading title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Brand Report
          </h1>
          
          {/* Dynamic loading phase */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            Analyzing your brand performance
          </p>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Building your personalized brand insights dashboard...
          </div>
        </div>
      </div>
    )
  }

  // Show no brand selected state - return directly without wrapper to match loading state
  if (!selectedBrandId) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden" style={{ paddingBottom: '15vh' }}>
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Main logo - exact same structure as loading state */}
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
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
          
          {/* Title - exact same styling as loading state */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Brand Report
          </h1>
          
          {/* Subtitle - same positioning as loading phase */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            No brand selected
          </p>
          
          {/* Message - same max-width and positioning */}
          <div className="w-full max-w-md mx-auto mb-6">
            <p className="text-gray-400 text-base">
              Choose a brand from the sidebar to access AI-powered brand performance reports, analytics, and insights.
            </p>
          </div>
          
          {/* Footer text - exact same styling as loading state */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Select a brand to unlock your brand insights dashboard...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-6">
      {/* Full-Width Header Widget */}
      <div className="w-full px-6 mb-8">
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] border border-[#2A2A2A] shadow-2xl rounded-3xl p-8 max-w-none">
          {/* Greeting Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/20">
                <BarChart4 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {mounted ? `${greeting}, ${userFirstName}! 👋` : "Loading..."}
                </h1>
                <p className="text-lg text-gray-300">
                  Brand Performance Reports
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-400 max-w-4xl">
              {selectedBrandId && brands.find(b => b.id === selectedBrandId) 
                ? (() => {
                    const brandName = brands.find(b => b.id === selectedBrandId)?.name
                    const availability = getRefreshAvailability()
                    
                    if (selectedPeriod === "today") {
                      return `Daily performance insights for ${brandName}`
                    } else if (selectedPeriod === "last-month") {
                      const monthName = format(dateRange.from!, 'MMMM yyyy')
                      return `Comprehensive ${monthName} performance analysis for ${brandName}`
                    }
                    return `Performance insights for ${brandName}`
                  })()
                : "Select a brand to view comprehensive marketing performance reports and insights"
              }
            </p>
          </div>
          
          {/* Controls Section */}
          <div className="flex items-center justify-between bg-[#0f0f0f]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#333]">
            <div className="flex items-center space-x-6">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-300">Time Period</label>
                <Select value={selectedPeriod} onValueChange={handlePeriodSelect}>
                  <SelectTrigger className="w-[200px] bg-[#1a1a1a] border-[#333] text-white hover:bg-[#252525] rounded-xl h-11">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-[#333] text-white rounded-xl">
                    <SelectItem value="today" className="rounded-lg">Today's Performance</SelectItem>
                    <SelectItem value="last-month" className="rounded-lg">Last Month Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Badge variant="outline" className="text-sm bg-gradient-to-r from-white/10 to-white/5 border-white/20 text-white px-4 py-2 rounded-xl">
                {selectedPeriod === "today" 
                    ? "Daily Report" 
                  : `${format(dateRange.from!, 'MMMM yyyy')} Report`}
              </Badge>
            </div>
              
            <div className="flex items-center space-x-4">
              {(() => {
                const availability = getRefreshAvailability()
                const hasPermission = canGenerateReports()
                
                if (!hasPermission) {
                  // Show tooltip for permission denied
                  const selectedBrand = brands.find(brand => brand.id === selectedBrandId)
                  const agencyName = selectedBrand?.agency_info?.name || "the brand owner"
                  
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-not-allowed">
                            <Button 
                              variant="outline" 
                              size="lg"
                              className="opacity-50 bg-gray-500 text-white rounded-xl pointer-events-none"
                              disabled={true}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              No Permission
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="text-center">
                            <p className="font-medium mb-1">Permission Required</p>
                            <p className="text-xs text-gray-300">
                              You do not have permission to generate reports for this brand.
                            </p>
                            <p className="text-xs text-white font-medium mt-1">
                              Contact {agencyName} to request access.
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                }
                
                return (
                  <Button 
                    variant="outline" 
                    size="lg"
                    className={cn(
                      "bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300",
                      (!selectedBrandId || isLoadingReport || !availability.available) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={handleManualRefresh}
                    disabled={isLoadingReport || !selectedBrandId || !availability.available}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {availability.buttonText === "Too Early" ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{availability.buttonText}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="text-center">
                              <p className="font-medium mb-1">Not enough data available</p>
                              <p className="text-xs text-gray-300">{availability.reason}</p>
                              {availability.nextAvailable && (
                                <p className="text-xs text-white font-medium mt-1">{availability.nextAvailable}</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      availability.buttonText
                    )}
                  </Button>
                )
              })()}

              
              <Button 
                variant="outline" 
                size="lg"
                className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#252525] hover:text-white rounded-xl transition-all duration-300"
                onClick={exportToPdf}
                disabled={isLoadingReport || !selectedReport || isExportingPdf || !canGenerateReports()}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExportingPdf ? "Exporting..." : "Export PDF"}
              </Button>
              
              {selectedReport && (
                <div className="flex items-center text-sm">
                  <span className="text-gray-400">
                    Last updated: {format(new Date(selectedReport.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Container - Portrait Style with Full-Width Background */}
      <div className="w-full px-6">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333] shadow-2xl rounded-3xl overflow-hidden">
          <Card className="bg-transparent border-0 shadow-none">
          
          <CardContent className={cn("p-8", isLoadingReport && "report-loading")}>
            {isLoadingReport ? (
              <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
                <div className="text-white text-center space-y-2">
                  <p className="text-lg font-semibold">
                    {selectedReport ? "Refreshing your snapshot" : "Generating your marketing snapshot"}
                  </p>
                  <p className="text-gray-400">
                    {selectedReport ? "Loading latest performance data..." : "Analyzing your marketing data across all platforms..."}
                  </p>
                </div>
              </div>
            ) : selectedReport ? (
              <div className="flex justify-center">
                <div className="w-full max-w-4xl mx-auto bg-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden border border-[#333]">
                  <div 
                    className="p-8"
                    dangerouslySetInnerHTML={{ __html: selectedReport.content }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-24 space-y-6">
                <div className="relative">
                  <BarChart4 className="h-16 w-16 text-gray-600" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 rounded-full flex items-center justify-center">
                    <Zap className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-white font-semibold text-lg">
                    {!selectedBrandId 
                      ? "Select a brand to get started"
                      : "Ready to analyze performance"
                    }
                  </p>
                  <p className="text-gray-400 max-w-md">
                    {!selectedBrandId 
                      ? "Choose a brand from the dropdown to view and generate marketing performance reports"
                      : selectedPeriod === "today" 
                        ? "Click 'Generate Report' to analyze today's marketing performance"
                        : "Generate a comprehensive report for last month's marketing performance"
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          </Card>
        </div>
      </div>
        
      {/* Secret Dev Panel Activator */}
      <div 
        className="fixed bottom-4 right-4 w-8 h-8 cursor-pointer opacity-0 hover:opacity-10 transition-opacity"
        onClick={() => {
          setDevModeActive(!devModeActive)
          toast({
            title: devModeActive ? "Dev Mode Disabled" : "Dev Mode Enabled",
            description: devModeActive ? "Rate limiting restored" : "Unlimited refreshes activated",
            variant: "default"
          })
        }}
        title="Secret Dev Panel"
      />
      
      {/* Dev Mode Indicator */}
      {devModeActive && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse z-50">
          DEV MODE
        </div>
      )}
    </div>
  )
} 