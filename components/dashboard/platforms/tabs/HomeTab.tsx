"use client"

import React, { useState, useEffect } from 'react'
import { Metrics } from '@/types/metrics'
import { PlatformConnection } from '@/types/platformConnection'
import { DateRange } from 'react-day-picker'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronUp, ChevronDown, RefreshCw, Loader2, FileText, Maximize2, Minimize2, RotateCw, ChevronRight } from "lucide-react"
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { useUser } from "@clerk/nextjs"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Period selector component for switching between daily and monthly views
function PeriodSelector({ period, setPeriod }: { period: 'daily' | 'monthly', setPeriod: (value: 'daily' | 'monthly') => void }) {
  return (
    <Tabs value={period} className="w-[200px]">
      <TabsList>
        <TabsTrigger value="daily" onClick={() => setPeriod('daily')}>Today</TabsTrigger>
        <TabsTrigger value="monthly" onClick={() => setPeriod('monthly')}>Monthly</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

interface HomeTabProps {
  brandId: string
  brandName: string
  dateRange: DateRange
  metrics: Metrics
  isLoading: boolean
  isRefreshingData?: boolean
  platformStatus: {
    shopify: boolean
    meta: boolean
  }
  connections: PlatformConnection[]
  brands?: Array<{ id: string, name: string }>
}

export function HomeTab({
  brandId,
  brandName,
  dateRange,
  metrics,
  isLoading,
  isRefreshingData = false,
  platformStatus,
  connections,
  brands = []
}: HomeTabProps) {
  const { user } = useUser()
  const [greeting, setGreeting] = useState("")
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'monthly'>('daily')
  const [isReportMinimized, setIsReportMinimized] = useState(true)
  const [reportContent, setReportContent] = useState("Generating report...")
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' })
  const supabase = createClientComponentClient()
  
  // Storage keys for caching reports
  const DAILY_REPORT_KEY = `${brandId}_daily_report`
  const MONTHLY_REPORT_KEY = `${brandId}_monthly_report` 
  const DAILY_REPORT_TIMESTAMP_KEY = `${brandId}_daily_report_timestamp`
  const MONTHLY_REPORT_TIMESTAMP_KEY = `${brandId}_monthly_report_timestamp`

  // Create a function to get a fresh Supabase client
  const getFreshSupabaseClient = () => {
    // Create a new client with caching disabled
    return createClientComponentClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      options: {
        global: {
          headers: {
            'Cache-Control': 'no-cache'
          }
        }
      }
    })
  }

  // Set greeting based on time of day
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
  }, [])

  // Check if report needs refresh
  const shouldRefreshReport = (period: 'daily' | 'monthly') => {
    try {
      const now = new Date()
      const timestampKey = period === 'daily' ? DAILY_REPORT_TIMESTAMP_KEY : MONTHLY_REPORT_TIMESTAMP_KEY
      const lastRefreshStr = localStorage.getItem(timestampKey)
      
      if (!lastRefreshStr) return true
      
      const lastRefresh = new Date(lastRefreshStr)
      
      if (period === 'daily') {
        // Refresh every 3 hours
        const threeHoursMs = 3 * 60 * 60 * 1000
        return now.getTime() - lastRefresh.getTime() > threeHoursMs
      } else {
        // Refresh on the 1st of the month
        return now.getDate() === 1 && now.getMonth() !== lastRefresh.getMonth()
      }
    } catch (e) {
      console.error("Error checking refresh status:", e)
      return true // Refresh on error
    }
  }

  // Get cached report or generate a new one
  const getReport = async (period: 'daily' | 'monthly') => {
    try {
      setIsGeneratingReport(true)
      
      // First try to get the report from Supabase (server-generated)
      const { data: serverReport, error: serverReportError } = await supabase
        .from('brand_reports')
        .select('report_content, date_range_start, date_range_end, last_updated')
        .eq('brand_id', brandId)
        .eq('period', period)
        .single()
      
      // Check for errors *other than* the expected "no rows" error
      if (serverReportError && serverReportError.code !== 'PGRST116') { 
        console.error("Error fetching server report:", serverReportError)
        // Display a generic error, the 406 might be logged above
        toast.error("Failed to load report data. Please try refreshing.")
        // Set report content to indicate failure
        setReportContent("Error loading report. Please try again.") 
      }
      
      if (serverReport) {
        console.log(`Found server-generated ${period} report for brand ${brandId}`)
        
        // Set the report content and date range from the server
        setReportContent(serverReport.report_content)
        setReportDateRange({ 
          start: serverReport.date_range_start, 
          end: serverReport.date_range_end 
        })
        
        // Cache the report locally as well
        const reportKey = period === 'daily' ? DAILY_REPORT_KEY : MONTHLY_REPORT_KEY
        const timestampKey = period === 'daily' ? DAILY_REPORT_TIMESTAMP_KEY : MONTHLY_REPORT_TIMESTAMP_KEY
        const dateRangeKey = `${reportKey}_date_range`
        
        localStorage.setItem(reportKey, serverReport.report_content)
        localStorage.setItem(timestampKey, new Date(serverReport.last_updated).toISOString())
        localStorage.setItem(dateRangeKey, JSON.stringify({ 
          start: serverReport.date_range_start, 
          end: serverReport.date_range_end 
        }))
        
        setIsGeneratingReport(false)
        return
      }
      
      // If no server report, fall back to local cache or generation
      const reportKey = period === 'daily' ? DAILY_REPORT_KEY : MONTHLY_REPORT_KEY
      const timestampKey = period === 'daily' ? DAILY_REPORT_TIMESTAMP_KEY : MONTHLY_REPORT_TIMESTAMP_KEY
      
      // Load date range from cache
      const dateRangeKey = `${reportKey}_date_range`
      const cachedDateRange = localStorage.getItem(dateRangeKey)
      
      if (cachedDateRange) {
        setReportDateRange(JSON.parse(cachedDateRange))
      }
      
      // Try to get the cached report
      const cachedReport = localStorage.getItem(reportKey)
      
      if (cachedReport && !shouldRefreshReport(period)) {
        setReportContent(cachedReport)
        setIsGeneratingReport(false)
        return
      }
      
      // No valid cache or needs refresh, generate a new report
      const reportData = await generateReportContent(period)
      
      if (reportData) {
        // Cache the new report
        localStorage.setItem(reportKey, reportData.report)
        localStorage.setItem(timestampKey, new Date().toISOString())
        localStorage.setItem(dateRangeKey, JSON.stringify(reportData.dateRange))
        
        setReportContent(reportData.report)
        setReportDateRange(reportData.dateRange)
      }
      
      setIsGeneratingReport(false)
    } catch (e) {
      console.error("Error getting report:", e)
      setIsGeneratingReport(false)
      setReportContent("Error loading report. Please try again later.")
    }
  }

  // Calculate date ranges based on the selected period
  const calculateDateRanges = (selectedPeriod: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let startDate, endDate, prevStartDate, prevEndDate
    
    if (selectedPeriod === 'daily') {
      startDate = format(today, 'yyyy-MM-dd')
      endDate = format(today, 'yyyy-MM-dd')
      prevStartDate = format(subDays(today, 1), 'yyyy-MM-dd')
      prevEndDate = format(subDays(today, 1), 'yyyy-MM-dd')
    } else { // monthly
      startDate = format(startOfMonth(today), 'yyyy-MM-dd')
      endDate = format(today, 'yyyy-MM-dd')
      prevStartDate = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd')
      prevEndDate = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd')
    }
    
    return { 
      dateRange: { start: startDate, end: endDate },
      startDate, 
      endDate, 
      prevStartDate, 
      prevEndDate 
    }
  }

  // Fetch enriched data with current and previous period metrics
  const fetchEnrichedData = async (selectedPeriod: string) => {
    try {
      // Add a timestamp to force fresh data
      const timestamp = new Date().getTime()
      console.log(`Fetching fresh data at ${new Date().toISOString()} (timestamp: ${timestamp})`)
      
      // Get current and previous period date ranges
      const { startDate, endDate, prevStartDate, prevEndDate, dateRange } = calculateDateRanges(selectedPeriod)
      
      // First, find the connections for this brand
      const shopifyConnection = connections.find(c => c.platform_type === 'shopify' && c.status === 'active')
      const metaConnection = connections.find(c => c.platform_type === 'meta' && c.status === 'active')
      
      if (!shopifyConnection && !metaConnection) {
        throw new Error('No active connections found for this brand')
      }
      
      let orders: any[] = []
      let adInsights: any[] = []
      let inventory: any[] = []
      
      // Query Supabase for Shopify data if connection exists
      if (shopifyConnection) {
        // LOG IMPORTANT INFO
        console.log('==================== DEBUG SHOPIFY QUERY ====================')
        console.log(`Selected period: ${selectedPeriod}`)
        console.log(`Date range for query:`, { prevStartDate, endDate })
        console.log(`Connection ID: ${shopifyConnection.id}`)
        
        // IMPORTANT: For daily reports, use a full 24-hour range to account for timezone issues
        // This ensures we catch all orders for today regardless of timezone differences
        let queryStartDate = prevStartDate
        let queryEndDate = endDate

        if (selectedPeriod === 'daily') {
          // For daily reports, create a wider window to ensure we get today's data
          const today = new Date()
          
          // Set the start time to beginning of today (00:00:00)
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
          
          // Set the end time to end of today (23:59:59) 
          const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
          
          // Format as ISO strings
          queryStartDate = todayStart.toISOString()
          queryEndDate = todayEnd.toISOString()
          
          console.log('Using precise time range for today:', { 
            queryStartDate, 
            queryEndDate,
            humanReadableStart: format(todayStart, 'yyyy-MM-dd HH:mm:ss'),
            humanReadableEnd: format(todayEnd, 'yyyy-MM-dd HH:mm:ss')
          })
        }
        
        // Use a fresh client to bypass any Supabase caching
        const freshClient = getFreshSupabaseClient()
        
        // FIRST, just get ALL recent orders for debugging
        console.log('Fetching all recent orders first for debugging...')
        const { data: allRecentOrders, error: allOrdersError } = await freshClient
          .from('shopify_orders')
          .select('id, order_id, created_at, total_price, connection_id')
          .eq('connection_id', shopifyConnection.id)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (allRecentOrders && allRecentOrders.length > 0) {
          console.log('Most recent orders regardless of date:')
          allRecentOrders.forEach(order => {
            console.log(`Order: ${order.id || order.order_id}, Created: ${order.created_at}, Price: ${order.total_price}`)
          })
        } else {
          console.log('No recent orders found at all')
        }
        
        // Now, get orders for our specific date range
        console.log(`Now fetching orders with date range: ${queryStartDate} to ${queryEndDate}`)
        
        const { data: shopifyOrders, error: ordersError } = await freshClient
          .from('shopify_orders')
          .select('*')
          .eq('connection_id', shopifyConnection.id)
          .gte('created_at', queryStartDate)
          .lte('created_at', queryEndDate)
          .order('created_at', { ascending: false })
        
        if (ordersError) {
          console.error("Error fetching orders:", ordersError)
          throw new Error(`Error fetching orders: ${ordersError.message}`)
        }
        
        console.log(`Fetched ${shopifyOrders?.length || 0} Shopify orders for period`)
        
        if (shopifyOrders && shopifyOrders.length > 0) {
          console.log('Found these orders for the period:')
          shopifyOrders.forEach(order => {
            const orderDate = new Date(order.created_at)
            console.log(`Order: ${order.id || order.order_id}, Created: ${order.created_at}, Price: ${order.total_price}, Today: ${isToday(orderDate)}`)
          })
        } else {
          console.log('No orders found for the specified date range')
        }
        
        orders = shopifyOrders || []
        
        const { data: shopifyInventory, error: inventoryError } = await freshClient
          .from('shopify_inventory')
          .select('*')
          .eq('connection_id', shopifyConnection.id)
        
        if (inventoryError) throw new Error(`Error fetching inventory: ${inventoryError.message}`)
        inventory = shopifyInventory || []
      }
      
      // Get Meta ad data if connection exists
      if (metaConnection) {
        const freshClient = getFreshSupabaseClient()
        const { data: metaInsights, error: adError } = await freshClient
          .from('meta_ad_insights')
          .select('*')
          .eq('connection_id', metaConnection.id)
          .gte('date', prevStartDate)
          .lte('date', endDate)
        
        if (adError) throw new Error(`Error fetching ad insights: ${adError.message}`)
        adInsights = metaInsights || []
      }
      
      // Helper function to check if a date is today
      function isToday(date: Date) {
        const today = new Date()
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear()
      }
      
      // Filter data into current and previous periods - using proper date comparison
      console.log(`Filtering orders for current period: ${startDate} to ${endDate}`)
      let currentOrders = []
      
      if (selectedPeriod === 'daily') {
        // For daily reports, directly filter orders from today
        const today = new Date().toISOString().split('T')[0] // Get YYYY-MM-DD
        console.log(`Looking for orders with created_at containing: ${today}`)
        
        currentOrders = orders.filter(order => {
          // For daily reports, use a simpler date check
          const orderDate = new Date(order.created_at)
          const isOrderToday = isToday(orderDate)
          console.log(`Order ${order.id || order.order_id}: ${order.created_at} is today? ${isOrderToday}`)
          return isOrderToday
        })
      } else {
        // For monthly reports, use the standard date range
        currentOrders = orders.filter(o => {
          const orderDate = new Date(o.created_at)
          const startDt = new Date(startDate)
          const endDt = new Date(endDate)
          // Set all dates to midnight for proper comparison
          startDt.setHours(0, 0, 0, 0)
          endDt.setHours(23, 59, 59, 999)
          return orderDate >= startDt && orderDate <= endDt
        })
      }
      
      console.log(`Filtered to ${currentOrders.length} current period orders`)
      currentOrders.forEach(order => {
        console.log(`Current period order: ${order.id}, total: ${order.total_price}`)
      })
      
      const previousOrders = orders.filter(o => {
        // Only include in previous period if not in current period
        if (currentOrders.some(co => co.id === o.id)) return false
        
        const orderDate = new Date(o.created_at)
        const prevStartDt = new Date(prevStartDate)
        const prevEndDt = new Date(prevEndDate)
        // Set all dates to midnight for proper comparison
        prevStartDt.setHours(0, 0, 0, 0)
        prevEndDt.setHours(23, 59, 59, 999)
        return orderDate >= prevStartDt && orderDate <= prevEndDt
      })
      
      console.log(`Filtered to ${previousOrders.length} previous period orders`)
      
      const currentAdInsights = adInsights.filter(a => {
        const insightDate = new Date(a.date)
        const startDt = new Date(startDate)
        const endDt = new Date(endDate)
        return insightDate >= startDt && insightDate <= endDt
      })
      
      const previousAdInsights = adInsights.filter(a => {
        const insightDate = new Date(a.date)
        const prevStartDt = new Date(prevStartDate)
        const prevEndDt = new Date(prevEndDate)
        return insightDate >= prevStartDt && insightDate <= prevEndDt
      })
      
      // Calculate metrics
      const currentTotalSales = currentOrders.reduce((sum, order) => {
        const price = parseFloat(order.total_price) || 0
        console.log(`Adding to sales: ${price} from order ${order.id}`)
        return sum + price
      }, 0)
      console.log(`Total sales calculated: ${currentTotalSales}`)
      
      const currentOrderCount = currentOrders.length
      const currentAdSpend = currentAdInsights.reduce((sum, insight) => sum + (parseFloat(insight.spend) || 0), 0)
      const currentAOV = currentOrderCount > 0 ? currentTotalSales / currentOrderCount : 0
      
      const previousTotalSales = previousOrders.reduce((sum, order) => sum + (parseFloat(order.total_price) || 0), 0)
      const previousOrderCount = previousOrders.length
      const previousAdSpend = previousAdInsights.reduce((sum, insight) => sum + (parseFloat(insight.spend) || 0), 0)
      const previousAOV = previousOrderCount > 0 ? previousTotalSales / previousOrderCount : 0
      
      // Calculate growth rates
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
      }
      
      const salesGrowth = calculateGrowth(currentTotalSales, previousTotalSales)
      const orderGrowth = calculateGrowth(currentOrderCount, previousOrderCount)
      const adSpendGrowth = calculateGrowth(currentAdSpend, previousAdSpend)
      const aovGrowth = calculateGrowth(currentAOV, previousAOV)
      
      // Get inventory levels
      const inventoryLevels = inventory.reduce((total, item) => {
        return total + (parseInt(item.inventory_quantity) || 0)
      }, 0)
      
      // Calculate ROAS
      const roas = currentAdSpend > 0 ? currentTotalSales / currentAdSpend : 0
      const previousRoas = previousAdSpend > 0 ? previousTotalSales / previousAdSpend : 0
      const roasGrowth = calculateGrowth(roas, previousRoas)
      
      return {
        period: selectedPeriod,
        dateRange,
        currentPeriod: {
          startDate,
          endDate,
          totalSales: currentTotalSales,
          orderCount: currentOrderCount,
          adSpend: currentAdSpend,
          aov: currentAOV,
          roas: roas
        },
        previousPeriod: {
          startDate: prevStartDate,
          endDate: prevEndDate,
          totalSales: previousTotalSales,
          orderCount: previousOrderCount,
          adSpend: previousAdSpend,
          aov: previousAOV,
          roas: previousRoas
        },
        growth: {
          sales: salesGrowth,
          orders: orderGrowth,
          adSpend: adSpendGrowth,
          aov: aovGrowth,
          roas: roasGrowth
        },
        inventoryLevels: inventoryLevels,
        platformStatus: {
          shopify: platformStatus.shopify,
          meta: platformStatus.meta
        }
      }
    } catch (error) {
      console.error("Error fetching enriched data:", error)
      return null
    }
  }

  // Generate report content using the OpenAI API
  const generateReportContent = async (selectedPeriod: string) => {
    try {
      // Fetch the enriched data
      const enrichedData = await fetchEnrichedData(selectedPeriod)
      
      if (!enrichedData) {
        return {
          report: "Unable to generate a report due to data retrieval issues. Please try again later.",
          dateRange: { start: '', end: '' }
        }
      }
      
      // Create a prompt for the AI
      const periodName = selectedPeriod === 'daily' ? "today" : "this month"
      const customPrompt = `
        Generate a concise business report for ${brandName} for ${periodName} (${enrichedData.currentPeriod.startDate} to ${enrichedData.currentPeriod.endDate}).

        Structure the report with these sections, but use flowing paragraphs rather than bullet points:
        
        ## Business Summary
        A brief executive summary in 2-3 sentences that captures the overall performance.
        
        ## Performance Analysis
        A paragraph covering key metrics including:
        - Sales: $${enrichedData.currentPeriod.totalSales.toFixed(2)} (${enrichedData.growth.sales.toFixed(1)}% change)
        - Orders: ${enrichedData.currentPeriod.orderCount} (${enrichedData.growth.orders.toFixed(1)}% change)
        - AOV: $${enrichedData.currentPeriod.aov.toFixed(2)} (${enrichedData.growth.aov.toFixed(1)}% change)
        - ROAS: ${enrichedData.currentPeriod.roas.toFixed(2)}x (${enrichedData.growth.roas.toFixed(1)}% change)
        
        Mention these specific numbers in the flowing text, don't list them as bullet points.
        
        ## Inventory & Operations
        A short paragraph about inventory status (${enrichedData.inventoryLevels} units) and operational insights.
        
        Keep paragraphs concise but informative. Use markdown headers to separate sections.
        Bold important numbers and insights within the paragraphs.
        The entire report should be under 250 words.
        If metrics are $0 or 0%, acknowledge data limitations but provide analysis when possible.
      `
      
      // Call the API to generate the report
      try {
        const response = await fetch('/api/ai/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customPrompt,
            enrichedData,
            period: selectedPeriod
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('API error:', response.status, errorData)
          throw new Error(`API error: ${errorData.error || response.statusText}`)
        }
        
        const data = await response.json()
        return {
          report: data.report,
          dateRange: enrichedData.dateRange
        }
      } catch (apiError) {
        console.error("API call error:", apiError)
        return {
          report: "We encountered an error generating your report. Our AI service is temporarily unavailable. Please try again later.",
          dateRange: enrichedData.dateRange
        }
      }
    } catch (error) {
      console.error("Error generating report:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        report: `We encountered an error: ${errorMessage}. Please check your connections and try again.`,
        dateRange: { start: '', end: '' }
      }
    }
  }

  // Generate report when period changes or on mount
  useEffect(() => {
    if (brandId) {
      getReport(reportPeriod)
    }
  }, [reportPeriod, brandId])

  // Handle manual report refresh
  const handleRefresh = async () => {
    try {
      console.log('===================== MANUAL REFRESH =====================')
      console.log('Refresh button clicked, starting complete refresh process')
      
      // Show loading state
      setIsGeneratingReport(true)
      
      // Force refresh by clearing all caches
      const reportKey = reportPeriod === 'daily' ? DAILY_REPORT_KEY : MONTHLY_REPORT_KEY
      const timestampKey = reportPeriod === 'daily' ? DAILY_REPORT_TIMESTAMP_KEY : MONTHLY_REPORT_TIMESTAMP_KEY
      const dateRangeKey = `${reportKey}_date_range`
      
      // Clear all cached data
      localStorage.removeItem(reportKey)
      localStorage.removeItem(timestampKey)
      localStorage.removeItem(dateRangeKey)
      console.log('Cleared all cached report data from localStorage')
      
      // Force a direct API call to check if there are any recent orders at all (for debugging)
      console.log('Checking for recent orders (debugging step)...')
      const freshClient = getFreshSupabaseClient()
      const { data: debugOrders } = await freshClient
        .from('shopify_orders')
        .select('id, order_id, created_at, total_price')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (debugOrders && debugOrders.length > 0) {
        console.log('5 most recent orders in the database:')
        debugOrders.forEach(order => {
          console.log(`Order ${order.id || order.order_id}: ${order.created_at}, Price: ${order.total_price}`)
        })
      } else {
        console.log('WARNING: No recent orders found in database!')
      }
      
      // Force a new API call and skip any caching
      console.log(`Fetching fresh data for period: ${reportPeriod}`)
      const freshEnrichedData = await fetchEnrichedData(reportPeriod)
      
      if (!freshEnrichedData) {
        console.error('Failed to get fresh data')
        toast.error("Unable to fetch fresh data")
        setIsGeneratingReport(false)
        return
      }
      
      console.log('Got fresh data with these metrics:')
      console.log(`- Total Sales: $${freshEnrichedData.currentPeriod.totalSales.toFixed(2)}`)
      console.log(`- Order Count: ${freshEnrichedData.currentPeriod.orderCount}`)
      console.log(`- AOV: $${freshEnrichedData.currentPeriod.aov.toFixed(2)}`)
      
      // Generate a fresh report with the latest data
      const customPrompt = `
        Generate a concise business report for ${brandName} for ${reportPeriod === 'daily' ? 'today' : 'this month'} 
        (${freshEnrichedData.currentPeriod.startDate} to ${freshEnrichedData.currentPeriod.endDate}).

        Structure the report with these sections, but use flowing paragraphs rather than bullet points:
        
        ## Business Summary
        A brief executive summary in 2-3 sentences that captures the overall performance.
        
        ## Performance Analysis
        A paragraph covering key metrics including:
        - Sales: $${freshEnrichedData.currentPeriod.totalSales.toFixed(2)} (${freshEnrichedData.growth.sales.toFixed(1)}% change)
        - Orders: ${freshEnrichedData.currentPeriod.orderCount} (${freshEnrichedData.growth.orders.toFixed(1)}% change)
        - AOV: $${freshEnrichedData.currentPeriod.aov.toFixed(2)} (${freshEnrichedData.growth.aov.toFixed(1)}% change)
        - ROAS: ${freshEnrichedData.currentPeriod.roas.toFixed(2)}x (${freshEnrichedData.growth.roas.toFixed(1)}% change)
        
        Mention these specific numbers in the flowing text, don't list them as bullet points.
        
        ## Inventory & Operations
        A short paragraph about inventory status (${freshEnrichedData.inventoryLevels} units) and operational insights.
        
        Keep paragraphs concise but informative. Use markdown headers to separate sections.
        Bold important numbers and insights within the paragraphs.
        The entire report should be under 250 words.
        If metrics are $0 or 0%, acknowledge data limitations but provide analysis when possible.
      `
      
      try {
        // Make a direct API call instead of using getReport
        const response = await fetch('/api/ai/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customPrompt,
            enrichedData: freshEnrichedData,
            period: reportPeriod,
            forceRefresh: true // Signal this is a manual refresh
          }),
        })
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Update state with fresh data
        setReportContent(data.report)
        setReportDateRange(freshEnrichedData.dateRange)
        
        // Cache the new report
        localStorage.setItem(reportKey, data.report)
        localStorage.setItem(timestampKey, new Date().toISOString())
        localStorage.setItem(dateRangeKey, JSON.stringify(freshEnrichedData.dateRange))
        
        toast.success("Report refreshed with latest data")
      } catch (error) {
        console.error("Error refreshing report:", error)
        toast.error("Failed to refresh report")
      }
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // Handler for period change
  const handlePeriodChange = (value: 'daily' | 'monthly') => {
    setReportPeriod(value)
  }

  // Helper function to calculate when the report will next update
  const getNextUpdateTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const nextUpdate = new Date(now);
    
    // Find the next 3-hour interval (0, 3, 6, 9, 12, 15, 18, 21)
    const nextInterval = Math.ceil(hours / 3) * 3;
    
    if (nextInterval === hours) {
      // If we're exactly at an update time, show the next one
      nextUpdate.setHours(hours + 3, 0, 0, 0);
    } else {
      nextUpdate.setHours(nextInterval, 0, 0, 0);
    }
    
    // Format the date to show time
    return format(nextUpdate, 'h:mm a');
  };

  // Helper function to calculate the next monthly update
  const getNextMonthlyUpdateTime = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return format(nextMonth, 'MMM d, yyyy');
  };

  return (
    <div className="space-y-6">
      {/* Report Widget */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Quick Report</CardTitle>
              <CardDescription>
                {reportPeriod === 'daily' ? 'Today' : 'This Month'}'s performance summary
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={reportPeriod}
              onValueChange={(value) => handlePeriodChange(value as 'daily' | 'monthly')}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsReportMinimized(!isReportMinimized)}
            >
              {isReportMinimized ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isGeneratingReport}
            >
              <RotateCw className={cn("h-4 w-4", isGeneratingReport && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        {!isReportMinimized && (
          <CardContent>
            {reportDateRange.start && reportDateRange.end && (
              <div className="mb-3 text-xs text-muted-foreground">
                Report for {format(new Date(reportDateRange.start), 'MMM d, yyyy')}
                {reportDateRange.start !== reportDateRange.end && ` - ${format(new Date(reportDateRange.end), 'MMM d, yyyy')}`}
                <div className="mt-1">
                  {reportPeriod === 'daily' ? (
                    <>
                      Updates every 3 hours. Next update: {getNextUpdateTime()}
                    </>
                  ) : (
                    <>
                      Updates on the 1st of each month. Next update: {getNextMonthlyUpdateTime()}
                    </>
                  )}
                </div>
              </div>
            )}
            {isGeneratingReport ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating your report...</p>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-4 mb-2 text-primary" {...props} />,
                    ul: ({ node, ...props }) => <ul className="my-2 space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="ml-5" {...props} />,
                    p: ({ node, ...props }) => <p className="my-2" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-primary" {...props} />
                  }}
                >
                  {reportContent}
                </ReactMarkdown>
                
                <div className="mt-4 text-xs text-left">
                  <a 
                    href="/recommendations" 
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View AI Recommendations & Guidance
                    <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
      
      {/* Customizable widgets area will go here in the next implementation */}
    </div>
  )
} 