"use client"

import { useState, useEffect, useCallback } from "react"
import { useBrandContext } from '@/lib/context/BrandContext'
import { DateRange } from "react-day-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { startOfDay, endOfDay, format, startOfMonth, endOfMonth, subMonths, parse, isAfter, isBefore, addMonths } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, BarChart4, RefreshCw, Zap, Download, CheckSquare, Clock, AlertTriangle, Edit3, Save, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useUser, useAuth } from "@clerk/nextjs"
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip } from "recharts"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { useAgency } from "@/contexts/AgencyContext"

import { getAuthenticatedSupabaseClient, getStandardSupabaseClient } from "@/lib/utils/unified-supabase"
import { GridOverlay } from "@/components/GridOverlay"

interface PlatformConnection {
  id: string
  brand_id: string
  platform_type: string
  status: string
}

interface DailyReport {
  content: string
  createdAt: string
  snapshotTime: string
  data: any
}

export default function BrandReportPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const { getToken } = useAuth()
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
  const [secretMenuVisible, setSecretMenuVisible] = useState(false)
  const [keySequence, setKeySequence] = useState<string[]>([])
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)
  const [hasMonthlyReportThisMonth, setHasMonthlyReportThisMonth] = useState(false)
  const [hasDailyReportToday, setHasDailyReportToday] = useState(false)
  const [userTimezone, setUserTimezone] = useState<string>('America/Chicago') // Default fallback
  const [isEditingReport, setIsEditingReport] = useState(false)
  const [editedReportContent, setEditedReportContent] = useState<string>("")
  const [reportSections, setReportSections] = useState<Array<{
    title: string
    content: string
    id: string
  }>>([])
  const [editMode, setEditMode] = useState<'visual' | 'html'>('visual')

  // Detect user's timezone on mount
  useEffect(() => {
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      setUserTimezone(detectedTimezone)
    } catch (error) {
      setUserTimezone('America/Chicago') // Fallback
    }
  }, [])

  // Secret menu activation - listen for key sequence: R-E-S-E-T
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      
      setKeySequence(prev => {
        const newSequence = [...prev, key].slice(-5) // Keep only last 5 keys
        
        // Check for "reset" sequence
        if (newSequence.join('') === 'reset') {
          setSecretMenuVisible(true)
          return []
        }
        
        return newSequence
      })
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [])

  // Stable Supabase client function with proper authentication
  const getSupabaseClient = useCallback(async () => {
    try {
      const token = await getToken({ template: 'supabase' })
      if (token) {
        return getAuthenticatedSupabaseClient(token)
      } else {
        return getStandardSupabaseClient()
      }
    } catch (error) {

      return getStandardSupabaseClient()
    }
  }, [getToken])

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

  // Check if brand has required platforms connected
  const brandHasRequiredPlatforms = (brandId: string) => {
    if (!brandId) return false
    
    // Check if brand has at least one platform connection (Meta, Shopify, etc.)
    const brandConnections = connections.filter(conn => conn.brand_id === brandId && conn.status === 'active')
    const hasValidPlatform = brandConnections.some(conn => 
      ['meta', 'shopify', 'facebook', 'instagram', 'google', 'tiktok'].includes(conn.platform_type?.toLowerCase())
    )
    


    
    return hasValidPlatform
  }

  // Check refresh availability based on period type - FIXED LOGIC ORDER
  const getRefreshAvailability = (periodOverride?: string, brandIdOverride?: string) => {
    const checkPeriod = periodOverride || selectedPeriod
    const checkBrandId = brandIdOverride || selectedBrandId
    
    // STEP 1: Check if we're still loading connections (prevent premature "no platforms" errors)
    if (isLoadingConnections) {
      return {
        available: false,
        reason: "Loading platform connections...",
        nextAvailable: null,
        buttonText: "Loading...",
        type: "loading"
      }
    }
    
    // STEP 2: Check if brand is selected
    if (!checkBrandId) {
      return {
        available: false,
        reason: "No brand selected",
        nextAvailable: null,
        buttonText: "Select Brand",
        type: "no-brand"
      }
    }
    
    // STEP 3: Check permissions
    if (!canGenerateReports()) {
      const selectedBrand = brands.find(brand => brand.id === checkBrandId)
      const agencyName = selectedBrand?.agency_info?.name || "the brand owner"
      return {
        available: false,
        reason: `You do not have permission to generate reports for this brand. Contact ${agencyName} to request report generation access.`,
        nextAvailable: null,
        buttonText: "No Permission",
        type: "no-permission"
      }
    }
    
    // STEP 4: Dev mode bypass (skip all other checks)
    if (devModeActive) {
      return {
        available: true,
        reason: "DEV MODE: Unlimited refreshes",
        nextAvailable: null,
        buttonText: "Generate Report (DEV)",
        type: "available"
      }
    }
    
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    const currentHour = now.getHours()
    const currentMinutes = now.getMinutes()
    
    if (checkPeriod === "today") {
      // STEP 5A: Check time-based restrictions FIRST (before usage limits)
      const isInCooldownPeriod = currentHour < 6 || (currentHour === 6 && currentMinutes < 30)
      
      if (isInCooldownPeriod) {
        const cooldownEndTime = currentHour < 6 ? "6:30 AM" : "6:30 AM"
        return {
          available: false,
          reason: "Reports can only be generated after 6 AM to ensure sufficient data is available for analysis.",
          nextAvailable: `Available after ${cooldownEndTime}`,
          buttonText: "Too Early",
          type: "too-early"
        }
      }
      
      // STEP 6A: Check if already used today (brand-specific)
      const brandSpecificKey = `lastManualGeneration_${checkBrandId}`
      const brandLastGeneration = localStorage.getItem(brandSpecificKey)
      
      // Also check database reports for this brand today
      const brandDailyReports = dailyReports.filter(report => {
        const dbReport = report.data || report
        const snapshotTime = dbReport.snapshot_time || report.snapshotTime
        const isManual = snapshotTime === "manual"
        const isToday = format(new Date(report.createdAt), 'yyyy-MM-dd') === today
        

        
        return isManual && isToday
      })
      
      // Check localStorage, database reports, and state for daily report availability
      const hasUsedToday = brandLastGeneration === today || brandDailyReports.length > 0 || hasDailyReportToday
      
              if (hasUsedToday) {
          return {
            available: false,
            reason: "Daily report already generated for this brand today",
            nextAvailable: "Available tomorrow",
            buttonText: "Used Today",
            type: "rate-limited"
          }
        }
      
      // STEP 7A: FINALLY check platforms (only after confirming no usage limits)
      if (!brandHasRequiredPlatforms(checkBrandId)) {
        return {
          available: false,
          reason: "Brand needs at least one platform (Meta or Shopify) connected to generate reports",
          nextAvailable: "Connect a platform first",
          buttonText: "No Platforms",
          type: "no-platforms"
        }
      }
      
      // All checks passed for daily
      return {
        available: true,
        reason: "Available now",
        nextAvailable: null,
        buttonText: "Generate Report",
        type: "available"
      }
      
    } else if (checkPeriod === "last-month") {
      const currentDay = now.getDate()
      const reportMonth = format(dateRange.from!, 'yyyy-MM')
      const currentMonth = format(now, 'yyyy-MM')
      
      // STEP 5B: Check if trying to generate report for current month
      if (reportMonth === currentMonth) {
        return {
          available: false,
          reason: "Report not yet available",
          nextAvailable: `Available ${format(startOfMonth(addMonths(now, 1)), 'MMM d')}`,
          buttonText: "Not Available",
          type: "not-ready"
        }
      }
      
      // STEP 6B: Monthly reports are available throughout the month (not just on the 1st)
      // The report becomes available starting the 1st of the following month and remains available
      
      // STEP 7B: Check if monthly report already exists (localStorage and database state)
      const currentMonthKey = format(now, 'yyyy-MM')
      const brandSpecificKey = `lastMonthlyGeneration_${checkBrandId}`
      const brandLastMonthlyGeneration = localStorage.getItem(brandSpecificKey)
      
      // Check both localStorage and database state for monthly report availability
      // hasMonthlyReportThisMonth now includes both period-specific and month-specific checks
      const hasUsedMonthlyThisMonth = brandLastMonthlyGeneration === currentMonthKey || hasMonthlyReportThisMonth
      
      if (hasUsedMonthlyThisMonth) {
        const nextFirst = startOfMonth(addMonths(now, 1))
        return {
          available: false,
          reason: "Monthly report already generated for this brand for this period",
          nextAvailable: `Available ${format(nextFirst, 'MMM d')}`,
          buttonText: "Used This Month",
          type: "rate-limited"
        }
      }
      
      // STEP 8B: FINALLY check platforms (only after confirming no usage limits)
      if (!brandHasRequiredPlatforms(checkBrandId)) {
        return {
          available: false,
          reason: "Brand needs at least one platform (Meta or Shopify) connected to generate reports",
          nextAvailable: "Connect a platform first",
          buttonText: "No Platforms",
          type: "no-platforms"
        }
      }
      
      // All checks passed for monthly
      return {
        available: true,
        reason: "Available now",
        nextAvailable: null,
        buttonText: "Generate Report",
        type: "available"
      }
    }
    
    return {
      available: false,
      reason: "Unknown period",
      nextAvailable: null,
      buttonText: "Unavailable",
      type: "error"
    }
  }

  // Load platform connections for current brand
  const loadConnections = useCallback(async () => {
    if (!user?.id || !selectedBrandId) {
      setConnections([])
      setIsLoadingConnections(false)
      return
    }

    try {
      setIsLoadingConnections(true)
      
      const supabase = await getSupabaseClient()
      
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', selectedBrandId)
        .eq('status', 'active')

      if (connectionsError) {

        setConnections([])
      } else {
        // Ensure connectionsData is an array
        const safeConnectionsData = Array.isArray(connectionsData) ? connectionsData : []

        setConnections(safeConnectionsData)
      }
    } catch (error) {

      setConnections([])
    } finally {
      setIsLoadingConnections(false)
    }
  }, [user?.id, selectedBrandId, getSupabaseClient])

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

  // Load connections when selectedBrandId changes
  useEffect(() => {
    if (selectedBrandId && user?.id && mounted) {
      // Small delay to ensure authentication is fully ready
      const timer = setTimeout(() => {
        loadConnections()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [selectedBrandId, user?.id, loadConnections, mounted])

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

      return []
    }

    try {

      
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

        return []
      }
      
      const result = await response.json()
      
      if (result.success && result.reports) {

        
        // Sync localStorage with database reports for shared brands
        syncLocalStorageWithReports(brandId, result.reports)
        
        return result.reports
      }
      

      return []
    } catch (error) {

      return []
    }
  }

  // Sync localStorage with database reports to fix shared brand availability
  const syncLocalStorageWithReports = (brandId: string, reports: any[]) => {
    try {
      const now = new Date()
      const currentMonthKey = format(now, 'yyyy-MM')
      const today = format(now, 'yyyy-MM-dd')
      
      // Check for monthly reports generated this month (for rate limiting)
      // This should check for ANY monthly report created this month, regardless of which period is currently selected
      const hasMonthlyReportThisMonth = reports.some((report: any) => {
        const dbReport = report.data || report
        if (dbReport.period_name !== 'last-month') return false
        const reportDate = new Date(report.createdAt)
        return format(reportDate, 'yyyy-MM') === currentMonthKey
      })
      
      // Check for daily reports generated today
      const hasDailyReportToday = reports.some((report: any) => {
        const dbReport = report.data || report
        if (dbReport.period_name !== 'today') return false
        const reportDate = new Date(report.createdAt)
        return format(reportDate, 'yyyy-MM-dd') === today
      })
      
      // Update state to reflect database state
      setHasMonthlyReportThisMonth(hasMonthlyReportThisMonth)
      setHasDailyReportToday(hasDailyReportToday)
      
      // Update localStorage to reflect database state
      const monthlyKey = `lastMonthlyGeneration_${brandId}`
      const dailyKey = `lastDailyGeneration_${brandId}`
      
      if (hasMonthlyReportThisMonth) {
        localStorage.setItem(monthlyKey, currentMonthKey)

      }
      
      if (hasDailyReportToday) {
        localStorage.setItem(dailyKey, today)

      }
      

      
    } catch (error) {

    }
  }

  // Save report to database with optional snapshot time
  const saveReportToDatabase = async (brandId: string, fromDate: string, toDate: string, periodName: string, reportContent: string, rawResponse: string, snapshotTime: string | null) => {
    if (!user?.id) {

      return false
    }

    try {

      
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

        return false
      }
      
      const result = await response.json()
      
      if (result.success) {

        return true
        } else {

        return false
        }
    } catch (error) {

      return false
    }
  }

  // Handle period selection
  const handlePeriodSelect = (value: string) => {

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



      // Run data sync in background - don't block report generation
      try {
        // Sync Meta data with extended timeout for fresh data
        const metaSyncDays = selectedPeriod === "last-month" ? 45 : 7
        const metaSyncController = new AbortController()
        const metaSyncTimeout = setTimeout(() => metaSyncController.abort(), 90000) // 90 second timeout for Meta
        
        const metaSyncPromise = fetch('/api/meta/sync', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            brandId: selectedBrandId,
            days: metaSyncDays,
            automated: true,
            force_refresh: true
          }),
          signal: metaSyncController.signal
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Meta sync failed: ${response.status}`)
          }
          return response.json()
        }).finally(() => clearTimeout(metaSyncTimeout))
        
        // Sync Shopify data with extended timeout for fresh data
        const shopifySyncController = new AbortController()
        const shopifySyncTimeout = setTimeout(() => shopifySyncController.abort(), 60000) // 60 second timeout
        
        const shopifySyncPromise = fetch('/api/cron/shopify-sync', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            brandId: selectedBrandId,
            force_refresh: true
          }),
          signal: shopifySyncController.signal
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Shopify sync failed: ${response.status}`)
          }
          return response.json()
        }).finally(() => clearTimeout(shopifySyncTimeout))
        
        // Sync Meta demographics with extended timeout for fresh data
        const demoSyncController = new AbortController()
        const demoSyncTimeout = setTimeout(() => demoSyncController.abort(), 45000) // 45 second timeout for demographics
        
        const demoSyncPromise = fetch('/api/meta/sync-demographics', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            brandId: selectedBrandId
          }),
          signal: demoSyncController.signal
        }).then(response => {
          if (!response.ok) {
            throw new Error(`Demographics sync failed: ${response.status}`)
          }
          return response.json()
        }).finally(() => clearTimeout(demoSyncTimeout))
        
        // Wait for sync operations to complete before proceeding with fresh data
        console.log('🔄 Waiting for data sync to complete...')
        
        // Show user that fresh data is being pulled
        toast({
          title: "Syncing fresh data...",
          description: "Pulling latest Meta ads, Shopify sales, and demographic data. This may take up to 2 minutes.",
        })
        
        const syncResults = await Promise.allSettled([metaSyncPromise, shopifySyncPromise, demoSyncPromise])
        
        const syncStatus = syncResults.map((result, index) => {
          const names = ['Meta', 'Shopify', 'Demographics']
          if (result.status === 'fulfilled') {
            console.log(`✅ ${names[index]} sync completed`)
            return `${names[index]}: ✓`
          } else {
            console.log(`⚠️ ${names[index]} sync failed/timeout:`, result.reason)
            return `${names[index]}: ⚠️ ${result.reason?.message || 'Timeout/Error'}`
          }
        })
        
        // Count successful syncs
        const successfulSyncs = syncResults.filter(result => result.status === 'fulfilled').length
        
        if (successfulSyncs > 0) {
          toast({
            title: `${successfulSyncs}/3 data sources synced`,
            description: `Successfully updated ${syncStatus.filter(s => s.includes('✓')).map(s => s.split(':')[0]).join(', ')} data.`,
          })
          
          // Wait for data to propagate in database
          console.log('⏳ Waiting for data propagation...')
          await new Promise(resolve => setTimeout(resolve, 5000)) // Reduced wait since some syncs failed
        } else {
          toast({
            title: "Sync incomplete",
            description: "Some data sources couldn't sync. Using existing data for report.",
            variant: "destructive"
          })
        }
        
        console.log('📊 Proceeding with data fetch...')

      } catch (syncError) {
        console.log('⚠️ Failed to trigger sync operations, continuing with existing data:', syncError)
      }

      // If not forcing refresh, check if report already exists for this snapshot time
      // TEMPORARY: Force refresh for monthly reports to ensure new format
      const shouldSkipCache = forceRefresh || selectedPeriod === "last-month"
      
      if (!shouldSkipCache) {
        const existingReports = await loadDailyReports(selectedBrandId, fromDate, toDate, selectedPeriod)
        const existingReport = existingReports.find((r: DailyReport) => r.snapshotTime === snapshotTime)
        if (existingReport) {

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
        timezone: userTimezone,
        t: Date.now().toString()
      })

      const selectedBrand = brands.find(brand => brand.id === selectedBrandId)

      // Fetch all the data needed for the report including additional insights
      const [shopifyResponse, metaResponse, demographicsResponse, locationResponse, repeatCustomersResponse] = await Promise.all([
        fetch(`/api/metrics?${params.toString()}`),
        fetch(`/api/metrics/meta?${params.toString()}`),
        // Fetch Meta demographics and device data (comprehensive format)
        fetch(`/api/meta/demographics?brandId=${selectedBrandId}&from=${fromDate}&to=${toDate}&timezone=${userTimezone}&t=${Date.now()}`).catch(() => null),
        // Fetch Shopify location data with date filtering
        fetch(`/api/shopify/customers/geographic?brandId=${selectedBrandId}&from=${fromDate}&to=${toDate}&timezone=${userTimezone}`).catch(() => null),
        // Fetch repeat customer analysis with date filtering
        fetch(`/api/shopify/analytics/repeat-customers?brandId=${selectedBrandId}&from=${fromDate}&to=${toDate}&timezone=${userTimezone}`).catch(() => null)
      ])

      if (!shopifyResponse.ok || !metaResponse.ok) {
        throw new Error("Failed to fetch metrics data")
      }

      const shopifyData = await shopifyResponse.json()
      const metaData = await metaResponse.json()
      
      // Parse additional data sources
      let demographicsData = null
      let locationData = null
      let repeatCustomersData = null
      
      try {
        if (demographicsResponse && demographicsResponse.ok) {
          demographicsData = await demographicsResponse.json()

        } else {

        }
      } catch (error) {

      }
      
      try {
        if (locationResponse && locationResponse.ok) {
          locationData = await locationResponse.json()
        }
      } catch (error) {

      }
      
      try {
        if (repeatCustomersResponse && repeatCustomersResponse.ok) {
          repeatCustomersData = await repeatCustomersResponse.json()
        }
      } catch (error) {

      }

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

          }
        }
      } catch (historicalError) {

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
        additional_insights: {
          demographics: demographicsData,
          customer_location: locationData,
          repeat_customers: repeatCustomersData
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
          style: "Generate a marketing report using this EXACT structure regardless of time period. You MUST include ALL sections listed below in this exact order with these exact headers and subsections:\n\n📊 EXECUTIVE SUMMARY\n(Overview paragraph)\n\n📈 KEY PERFORMANCE METRICS\n(Metrics paragraph)\n\n🎯 TOP PERFORMING ADS & CREATIVES\n(Ads analysis paragraph)\n\n👥 AUDIENCE PERFORMANCE INSIGHTS\nDemographics Analysis\n(Demographics paragraph in colored subsection)\nGeographic Performance\n(Geography paragraph in colored subsection)\nCustomer Retention\n(Retention paragraph in colored subsection)\n\n💰 BUDGET ALLOCATION & SCALING INSIGHTS\n(Budget paragraph)\n\n📊 OVERALL CLIENT IMPACT & ROI\n(ROI paragraph)\n\n🎯 NEXT STEPS & RECOMMENDATIONS\n(Recommendations paragraph)\n\nCRITICAL REQUIREMENTS:\n- Use these EXACT section headers with emojis\n- Include ALL 7 main sections listed above\n- Include ALL 3 subsections under Audience Performance Insights\n- Use the same HTML structure and styling for colored subsection tabs\n- Generate identical structure for daily and monthly reports\n- Only the data and time references should differ, never the structure\n- Include specific numbers and data points throughout"
        }
      }



      // Send data to AI for analysis with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 240000) // 4 minute client timeout
      
      const aiResponse = await fetch('/api/ai/analyze-marketing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataForAi),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!aiResponse.ok) {
        if (aiResponse.status === 504) {
          throw new Error(`Report generation timed out. Please try again or use a shorter date range.`)
        }
        throw new Error(`AI API request failed: ${aiResponse.status}`)
      }

      const aiResult = await aiResponse.json()


      // Handle different response formats from the backend API
      const analysis = aiResult.report || aiResult.analysis || aiResult.result || 
        (aiResult.message && aiResult.message !== "Successfully generated AI report" ? aiResult.message : null) || 
        (typeof aiResult === 'string' ? aiResult : null);



      if (!analysis) {

        throw new Error("No analysis returned from AI")
      }



      // Generate performance charts based on detailed data
      const generatePerformanceChart = () => {
        // Skip all charts for consistent clean report format
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
          const dayData = (Array.isArray(data.shopify) ? data.shopify.find((d: any) => d.date === dateStr) : null) || {}
          const adData = (Array.isArray(data.meta) ? data.meta.find((d: any) => d.date === dateStr) : null) || {}
          
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
        
        const shopifyData = Array.isArray(data.shopify) ? data.shopify : []
        const maxRevenue = Math.max(...(shopifyData.map((d: any) => d.total_revenue || 0).concat([1])))
        
        hours.forEach(hour => {
          const hourData = shopifyData.length > 0 ? shopifyData.find((d: any) => d.datetime && new Date(d.datetime).getHours() === hour) || {} : {}
          const metaData = Array.isArray(data.meta) ? data.meta : []
          const adData = metaData.length > 0 ? metaData.find((d: any) => d.datetime && new Date(d.datetime).getHours() === hour) || {} : {}
          
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


      let performanceChartHTML = ''
      try {
        performanceChartHTML = generatePerformanceChart()

      } catch (chartError) {

        performanceChartHTML = '' // Continue without charts
      }


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
      let errorMessage = "An error occurred while creating your marketing report."
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Report generation was cancelled due to timeout. Please try again."
        } else if (error.message.includes('timeout')) {
          errorMessage = error.message
        } else if (error.message.includes('504')) {
          errorMessage = "Server timeout. Please try generating a shorter period report."
        }
      }

      toast({
        title: "Failed to generate report",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoadingReport(false)
    }
  }

  // Reset usage functions for secret menu
  const resetTodayUsage = async () => {
    if (!selectedBrandId || !user?.id) {
      toast({
        title: "Reset Error",
        description: "Missing brand or user information",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoadingReport(true)
      
      // Clear today's reports for this brand
      const clearResponse = await fetch(`/api/brand-reports/clear?brandId=${selectedBrandId}&userId=${user.id}&type=today`, {
        method: 'DELETE',
      })
      
      if (!clearResponse.ok) {
        throw new Error('Failed to clear today reports')
      }

      // Reset today's rate limiting
      const today = format(new Date(), 'yyyy-MM-dd')
      localStorage.removeItem(`lastManualGeneration_${selectedBrandId}`)
      localStorage.removeItem(`lastDailyGeneration_${selectedBrandId}`)
      setLastManualGeneration(null)
      
      // Clear current state for today
      const todayReports = dailyReports.filter(r => {
        const reportDate = format(new Date(r.createdAt), 'yyyy-MM-dd')
        return reportDate !== today
      })
      setDailyReports(todayReports)
      
      if (selectedReport && format(new Date(selectedReport.createdAt), 'yyyy-MM-dd') === today) {
        setSelectedReport(null)
      }
      
      setHasDailyReportToday(false)
      
      toast({
        title: "Today Usage Reset",
        description: "Today's reports cleared and usage reset successfully",
        variant: "default",
      })
      
    } catch (error) {
      toast({
        title: "Reset Error",
        description: "Failed to reset today's usage. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingReport(false)
    }
  }

  const resetMonthUsage = async () => {
    if (!selectedBrandId || !user?.id) {
      toast({
        title: "Reset Error",
        description: "Missing brand or user information",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoadingReport(true)
      
      // Clear this month's reports for this brand
      const clearResponse = await fetch(`/api/brand-reports/clear?brandId=${selectedBrandId}&userId=${user.id}&type=month`, {
        method: 'DELETE',
      })
      
      if (!clearResponse.ok) {
        throw new Error('Failed to clear month reports')
      }

      // Reset month's rate limiting
      const currentMonthKey = format(new Date(), 'yyyy-MM')
      localStorage.removeItem(`lastMonthlyGeneration_${selectedBrandId}`)
      setHasMonthlyReportThisMonth(false)
      
      // Clear current state for this month
      const currentMonth = format(new Date(), 'yyyy-MM')
      const nonMonthReports = dailyReports.filter(r => {
        const reportMonth = format(new Date(r.createdAt), 'yyyy-MM')
        return reportMonth !== currentMonth
      })
      setDailyReports(nonMonthReports)
      
      if (selectedReport && format(new Date(selectedReport.createdAt), 'yyyy-MM') === currentMonth) {
        setSelectedReport(null)
      }
      
      toast({
        title: "Month Usage Reset",
        description: "This month's reports cleared and usage reset successfully",
        variant: "default",
      })
      
    } catch (error) {
      toast({
        title: "Reset Error",
        description: "Failed to reset month's usage. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingReport(false)
    }
  }

  const resetAllUsage = async () => {
    if (!selectedBrandId || !user?.id) {
      toast({
        title: "Reset Error",
        description: "Missing brand or user information",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoadingReport(true)
      
      // Clear all reports for this brand
      const clearResponse = await fetch(`/api/brand-reports/clear?brandId=${selectedBrandId}&userId=${user.id}`, {
        method: 'DELETE',
      })
      
      if (!clearResponse.ok) {
        throw new Error('Failed to clear all reports')
      }

      // Reset all rate limiting
      localStorage.removeItem(`lastManualGeneration_${selectedBrandId}`)
      localStorage.removeItem(`lastDailyGeneration_${selectedBrandId}`)
      localStorage.removeItem(`lastMonthlyGeneration_${selectedBrandId}`)
      setLastManualGeneration(null)
      
      // Clear all current state
      setDailyReports([])
      setSelectedReport(null)
      setHasDailyReportToday(false)
      setHasMonthlyReportThisMonth(false)
      
      toast({
        title: "All Usage Reset",
        description: "All reports cleared and usage reset successfully",
        variant: "default",
      })
      
    } catch (error) {
      toast({
        title: "Reset Error",
        description: "Failed to reset all usage. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingReport(false)
    }
  }

  // Parse HTML report into editable sections
  const parseReportSections = (htmlContent: string) => {
    const sections = []
    
    // Extract sections using regex to find h2 headers and their content
    const sectionRegex = /<h2[^>]*?>(.*?)<\/h2>\s*<p[^>]*?>(.*?)<\/p>/gs
    let match
    let sectionId = 1
    
    while ((match = sectionRegex.exec(htmlContent)) !== null) {
      const title = match[1].replace(/<[^>]*>/g, '').trim() // Remove HTML tags from title
      const content = match[2].trim()
      
      sections.push({
        id: `section-${sectionId++}`,
        title,
        content
      })
    }
    
    // If no sections found, create a default one
    if (sections.length === 0) {
      sections.push({
        id: 'section-1',
        title: 'Report Content',
        content: htmlContent.replace(/<[^>]*>/g, '').trim()
      })
    }
    
    return sections
  }

  // Reconstruct HTML from sections
  const reconstructReportFromSections = (sections: typeof reportSections) => {
    let reconstructedHtml = `<div style="padding: 2rem; color: #ffffff; font-family: system-ui, sans-serif; max-width: 100%; overflow: hidden; word-wrap: break-word;">`
    
    sections.forEach((section, index) => {
      // Add appropriate icon based on section title
      let icon = ''
      if (section.title.includes('EXECUTIVE') || section.title.includes('SUMMARY')) {
        icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M3 3v18h18V3H3zm16 16H5V5h14v14z" fill="currentColor"/>
          <path d="M7 7h2v2H7V7zm4 0h6v2h-6V7zm-4 4h2v2H7v-2zm4 0h6v2h-6v-2zm-4 4h2v2H7v-2zm4 0h6v2h-6v-2z" fill="currentColor"/>
        </svg>`
      } else if (section.title.includes('PERFORMANCE') || section.title.includes('METRICS')) {
        icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M3 13h8L9 9l4-6 4 6-2 4h8l-2 4H3v-4z" fill="currentColor"/>
          <path d="M3 17h18v2H3v-2z" fill="currentColor"/>
        </svg>`
      } else if (section.title.includes('ADS') || section.title.includes('CREATIVE')) {
        icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
          <path d="M12 1l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6l3-6z" fill="currentColor"/>
        </svg>`
      } else if (section.title.includes('AUDIENCE')) {
        icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M17 7c0-2.76-2.24-5-5-5S7 4.24 7 7c0 2.76 2.24 5 5 5s5-2.24 5-5zM12 2c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zm0 2c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
          <path d="M3 18c0-3.87 3.13-7 7-7h4c3.87 0 7 3.13 7 7v3H3v-3z" fill="currentColor"/>
        </svg>`
      } else if (section.title.includes('BUDGET')) {
        icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
          <circle cx="12" cy="7" r="1.5" fill="currentColor"/>
          <circle cx="7" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="17" cy="12" r="1.5" fill="currentColor"/>
        </svg>`
      } else if (section.title.includes('ROI') || section.title.includes('IMPACT')) {
        icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M14 12l-2 2-2-2V7l2-2 2 2v5z" fill="currentColor"/>
          <path d="M12 3L3 12l9 9 9-9-9-9zm0 2.41L19.59 12 12 19.59 4.41 12 12 5.41z" fill="currentColor"/>
        </svg>`
      } else {
        icon = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
          <path d="M9 11H7l5-8 5 8h-2l-3 8-3-8z" fill="currentColor"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>`
      }
      
      reconstructedHtml += `
        <h2 style="color: #ffffff; font-size: 2.25rem; font-weight: 900; margin: 2rem 0; padding: 1.5rem 0; border-bottom: 4px solid #ffffff; text-transform: uppercase; display: flex; align-items: center; gap: 0.75rem;">
          ${icon}
          ${section.title}
        </h2>
        <p style="color: #d1d5db; line-height: 1.8; margin-bottom: 2rem;">${section.content}</p>
      `
    })
    
    reconstructedHtml += `</div>`
    return reconstructedHtml
  }

  // Start editing the report
  const startEditingReport = () => {
    if (!selectedReport) return
    setEditedReportContent(selectedReport.content)
    
    // Parse the report into sections for visual editing
    const sections = parseReportSections(selectedReport.content)
    setReportSections(sections)
    
    setIsEditingReport(true)
  }

  // Update section content
  const updateSectionContent = (sectionId: string, newContent: string) => {
    setReportSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, content: newContent }
          : section
      )
    )
  }

  // Save the edited report
  const saveEditedReport = () => {
    if (!selectedReport) return
    
    let finalContent
    if (editMode === 'visual') {
      // Reconstruct HTML from sections
      finalContent = reconstructReportFromSections(reportSections)
    } else {
      // Use direct HTML content
      finalContent = editedReportContent
    }
    
    // Update the selected report with edited content
    const updatedReport = {
      ...selectedReport,
      content: finalContent
    }
    
    setSelectedReport(updatedReport)
    
    // Update the report in the dailyReports array
    setDailyReports(prev => 
      prev.map(report => 
        report.snapshotTime === selectedReport.snapshotTime 
          ? updatedReport 
          : report
      )
    )
    
    setIsEditingReport(false)
    toast({
      title: "Report updated",
      description: "Your changes have been saved successfully.",
    })
  }

  // Cancel editing
  const cancelEditingReport = () => {
    setIsEditingReport(false)
    setEditedReportContent("")
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
  const handleManualRefresh = async () => {
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
    

    
    // Set the brand-specific last generation date
    if (selectedPeriod === "today") {
      const today = format(new Date(), 'yyyy-MM-dd')
      setLastManualGeneration(today)
      // Store brand-specific key
      localStorage.setItem(`lastManualGeneration_${selectedBrandId}`, today)
    } else if (selectedPeriod === "last-month") {
      const currentMonthKey = format(new Date(), 'yyyy-MM')
      // Store brand-specific monthly generation
      localStorage.setItem(`lastMonthlyGeneration_${selectedBrandId}`, currentMonthKey)
    }
    
    // Generate report without snapshot time (null will be saved to database)
    generateAiReport(null, true)
  }







  // Effect to load reports when brand or period changes
  useEffect(() => {

    
    // DON'T reset hasMonthlyReportThisMonth/hasDailyReportToday here
    // Let them be updated by loadDailyReports -> checkReportAvailability
    // Resetting causes the MONTHLY button to show "Unavailable" briefly on load
      
    if (selectedBrandId && dateRange.from && dateRange.to && user?.id && mounted) {

      setIsLoadingReport(true)
      
      const fromDate = format(dateRange.from, 'yyyy-MM-dd')
      const toDate = format(dateRange.to, 'yyyy-MM-dd')
      
      // Load all daily reports
      loadDailyReports(selectedBrandId, fromDate, toDate, selectedPeriod)
        .then(reports => {
          setDailyReports(reports)
          
          // Check if there's a manual report from today to set rate limiting
          const today = format(new Date(), 'yyyy-MM-dd')
          const todayManualReport = reports.find((report: DailyReport) => {
            const dbReport = report.data || report
            const snapshotTime = dbReport.snapshot_time || report.snapshotTime
            return snapshotTime === "manual" && 
                   format(new Date(report.createdAt), 'yyyy-MM-dd') === today
          })
          
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
            

          } else {

            setSelectedReport(null)
          }
          
          setIsLoadingReport(false)
        })
        .catch(error => {

          setDailyReports([])
          setSelectedReport(null)
          setIsLoadingReport(false)
        })
    } else {

    }
  }, [selectedBrandId, selectedPeriod, dateRange.from, dateRange.to, user?.id, mounted])

  // Show loading state with enhanced progress display
  if (isLoadingPage) {
    return (
      <div className="w-full min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center relative overflow-hidden py-8">
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
      <div className="w-full min-h-screen bg-[#0B0B0B] flex flex-col items-center justify-center relative overflow-hidden py-8">
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
    <div className="w-full min-h-screen bg-[#0B0B0B] animate-in fade-in duration-300 relative">
      <GridOverlay />
      <div className="relative z-10 flex flex-col min-h-screen">
      <div className="flex-1 p-4 pb-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                            flex items-center justify-center border border-white/10">
                <BarChart4 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {mounted ? `${greeting}, ${userFirstName}!` : "Loading..."}
                </h1>
                <p className="text-lg text-gray-300">
                  Brand Performance Reports
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Modern Report Availability Cards */}
              {selectedBrandId && brands.find(b => b.id === selectedBrandId) && (
                <div className="flex gap-3">
                  {(() => {
                    const todayAvailability = getRefreshAvailability("today")
                    const monthlyAvailability = getRefreshAvailability("last-month")
                    
                    const getAvailabilityStyle = (availability: any) => {
                      // Use the same dark gradient and light text color for all states
                      const baseStyle = 'bg-gradient-to-br from-[#1e1e1e] via-[#222222] to-[#1a1a1a] border-[#333333] shadow-lg text-gray-300'
                      
                      // Add animation for loading state
                      if (availability.type === 'loading') {
                        return `${baseStyle} animate-pulse`
                      }
                      
                      return baseStyle
                    }
                    
                    const getStatusIcon = (availability: any) => {
                      switch (availability.type) {
                        case 'available':
                          return <CheckSquare className="w-3 h-3" />
                        case 'rate-limited':
                          return <Clock className="w-3 h-3" />
                        case 'no-platforms':
                          return <AlertTriangle className="w-3 h-3" />
                        case 'too-early':
                          return <Clock className="w-3 h-3" />
                        case 'not-ready':
                          return <Clock className="w-3 h-3" />
                        case 'loading':
                          return <RefreshCw className="w-3 h-3 animate-spin" />
                        case 'no-permission':
                          return <AlertTriangle className="w-3 h-3" />
                        case 'no-brand':
                          return <AlertTriangle className="w-3 h-3" />
                        default:
                          return <AlertTriangle className="w-3 h-3" />
                      }
                    }
                    
                    return (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                                                         <TooltipTrigger asChild>
                               <div className={cn(
                                 "px-4 py-3 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer",
                                 getAvailabilityStyle(todayAvailability)
                               )}>
                                 <div className="flex items-center gap-2">
                                   {getStatusIcon(todayAvailability)}
                                   <div className="text-xs font-semibold tracking-wide">DAILY</div>
                                 </div>
                                 <div className="text-xs opacity-90 mt-1 font-medium">
                                   {todayAvailability.available ? 'Ready' : 'Unavailable'}
                                 </div>
                               </div>
                             </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-center">
                                <p className="font-medium">Today's Report</p>
                                <p className="text-xs text-gray-300">{todayAvailability.reason}</p>
                                {todayAvailability.nextAvailable && (
                                  <p className="text-xs text-white font-medium">{todayAvailability.nextAvailable}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                                                         <TooltipTrigger asChild>
                               <div className={cn(
                                 "px-4 py-3 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer",
                                 getAvailabilityStyle(monthlyAvailability)
                               )}>
                                 <div className="flex items-center gap-2">
                                   {getStatusIcon(monthlyAvailability)}
                                   <div className="text-xs font-semibold tracking-wide">MONTHLY</div>
                                 </div>
                                 <div className="text-xs opacity-90 mt-1 font-medium">
                                   {monthlyAvailability.available ? 'Ready' : 'Unavailable'}
                                 </div>
                               </div>
                             </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-center">
                                <p className="font-medium">Monthly Report</p>
                                <p className="text-xs text-gray-300">{monthlyAvailability.reason}</p>
                                {monthlyAvailability.nextAvailable && (
                                  <p className="text-xs text-white font-medium">{monthlyAvailability.nextAvailable}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )
                  })()}
                </div>
              )}
              
              {/* Current time */}
              <div className="text-right border-l border-[#333] pl-6">
                <div className="text-sm text-gray-400">Current Time</div>
                <div className="text-lg font-medium text-white">
                  {mounted ? format(new Date(), 'h:mm a') : "--:--"}
                </div>
                <div className="text-xs text-gray-500">
                  {mounted ? format(new Date(), 'MMM d, yyyy') : "Loading..."}
                </div>
              </div>
            </div>
          </div>
          
          {/* Description and Status */}
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-400 max-w-4xl">
              {selectedBrandId && brands.find(b => b.id === selectedBrandId) 
                ? (() => {
                    const brandName = brands.find(b => b.id === selectedBrandId)?.name
                    const availability = getRefreshAvailability()
                    
                    if (selectedPeriod === "today") {
                      return `Daily performance insights for ${brandName} • ${availability.available ? 'Ready to generate new report' : availability.reason}`
                    } else if (selectedPeriod === "last-month") {
                      const monthName = format(dateRange.from!, 'MMMM yyyy')
                      return `Comprehensive ${monthName} performance analysis for ${brandName} • ${availability.available ? 'Ready to generate new report' : availability.reason}`
                    }
                    return `Performance insights for ${brandName}`
                  })()
                : "Select a brand to view comprehensive marketing performance reports and insights"
              }
            </p>
            
            {selectedReport && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-[#FF2A2A] rounded-full animate-pulse"></div>
                <span className="text-gray-400">
                  Generated on: {format(new Date(selectedReport.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Controls Section */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-300">Time Period</label>
                <Select value={selectedPeriod} onValueChange={handlePeriodSelect}>
                  <SelectTrigger className="w-[240px] bg-[#2A2A2A] border-[#444] text-white hover:bg-[#333] rounded-xl h-11 transition-colors">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2A2A2A] border-[#444] text-white rounded-xl">
                    <SelectItem value="today" className="rounded-lg hover:bg-[#333]">Today's Performance</SelectItem>
                    <SelectItem value="last-month" className="rounded-lg hover:bg-[#333]">Last Month Analysis</SelectItem>
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
                              className="opacity-50 bg-gray-500 text-white rounded-xl pointer-events-none h-11"
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
                      "bg-[#FF2A2A] hover:bg-[#E02424] text-black font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 h-11",
                      (!selectedBrandId || isLoadingReport || !availability.available) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={handleManualRefresh}
                    disabled={isLoadingReport || !selectedBrandId || !availability.available}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingReport && "animate-spin")} />
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
                className="bg-[#2A2A2A] border-[#444] text-white hover:bg-[#333] hover:text-white rounded-xl transition-all duration-300 h-11"
                onClick={startEditingReport}
                disabled={isLoadingReport || !selectedReport}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Report
              </Button>

              <Button 
                variant="outline" 
                size="lg"
                className="bg-[#2A2A2A] border-[#444] text-white hover:bg-[#333] hover:text-white rounded-xl transition-all duration-300 h-11"
                onClick={exportToPdf}
                disabled={isLoadingReport || !selectedReport || isExportingPdf || !canGenerateReports()}
              >
                <Download className={cn("h-4 w-4 mr-2", isExportingPdf && "animate-bounce")} />
                {isExportingPdf ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Report Content */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] shadow-xl overflow-hidden">
          {isLoadingReport ? (
            <div className="flex flex-col items-center justify-center p-24 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-white/10"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-[#FF2A2A] animate-spin"></div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
                  <BarChart4 className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="text-white text-center space-y-3">
                <h3 className="text-xl font-bold">
                  {selectedReport ? "Refreshing your snapshot" : "Generating your marketing snapshot"}
                </h3>
                <p className="text-gray-400 max-w-md">
                  {selectedReport ? "Loading latest performance data..." : "Analyzing your marketing data across all platforms..."}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <span>This may take a moment</span>
                </div>
              </div>
            </div>
          ) : selectedReport ? (
            <div className="p-8 flex justify-center">
              <div className="w-full max-w-4xl bg-[#0f0f0f] rounded-xl border border-[#2A2A2A] overflow-hidden shadow-2xl">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: selectedReport.content
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-24 space-y-8">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                  <BarChart4 className="h-12 w-12 text-gray-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-white/10 to-white/5 rounded-full flex items-center justify-center">
                  <Zap className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-white">
                  {!selectedBrandId 
                    ? "Select a brand to get started"
                    : "Ready to analyze performance"
                  }
                </h3>
                <p className="text-gray-400 max-w-md leading-relaxed">
                  {!selectedBrandId 
                    ? "Choose a brand from the sidebar to view and generate comprehensive marketing performance reports with AI-powered insights."
                    : selectedPeriod === "today" 
                      ? "Click 'Generate Report' to create an AI-powered analysis of today's marketing performance across all your connected platforms."
                      : "Generate a comprehensive AI report analyzing last month's marketing performance, trends, and actionable recommendations."
                  }
                </p>
                {selectedBrandId && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-[#FF2A2A] rounded-full"></div>
                      <span>AI-Powered Analysis</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-[#FF2A2A] rounded-full"></div>
                      <span>Multi-Platform Data</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-2 h-2 bg-[#FF2A2A] rounded-full"></div>
                      <span>Actionable Insights</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
      
      {/* Secret Menu Overlay */}
      {secretMenuVisible && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-red-500/50 p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                🔓 Secret Menu
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSecretMenuVisible(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-400 text-sm mb-6">
                Reset usage limits for report generation
              </p>
              
              <Button
                onClick={resetTodayUsage}
                disabled={isLoadingReport || !selectedBrandId}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingReport && "animate-spin")} />
                Reset Today's Usage
              </Button>
              
              <Button
                onClick={resetMonthUsage}
                disabled={isLoadingReport || !selectedBrandId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingReport && "animate-spin")} />
                Reset Month's Usage
              </Button>
              
              <Button
                onClick={resetAllUsage}
                disabled={isLoadingReport || !selectedBrandId}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingReport && "animate-spin")} />
                Reset All Usage
              </Button>
              
              <div className="pt-4 border-t border-gray-600">
                <p className="text-xs text-gray-500 text-center">
                  Type "reset" to show this menu again
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Report Modal */}
      {isEditingReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[#333]">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Edit Report
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={saveEditedReport}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={cancelEditingReport}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <Tabs value={editMode} onValueChange={(value) => setEditMode(value as 'visual' | 'html')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#0f0f0f] border border-[#333]">
                  <TabsTrigger value="visual" className="text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Visual Editor
                  </TabsTrigger>
                  <TabsTrigger value="html" className="text-white flex items-center gap-2">
                    <span className="text-sm">{"</>"}</span>
                    HTML Code
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="visual" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400 mb-4">
                      Edit each section of your report below. No HTML knowledge required!
                    </p>
                    
                    {reportSections.map((section, index) => (
                      <div key={section.id} className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <h4 className="text-sm font-medium text-white">{section.title}</h4>
                        </div>
                        <Textarea
                          value={section.content}
                          onChange={(e) => updateSectionContent(section.id, e.target.value)}
                          className="w-full min-h-32 p-3 bg-[#0f0f0f] border border-[#333] rounded-lg text-white resize-none focus:outline-none focus:border-[#555]"
                          placeholder={`Write content for ${section.title} section...`}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Plain text only - formatting will be applied automatically
                        </p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="html" className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Report Content (HTML) - Advanced Users Only
                    </label>
                    <textarea
                      value={editedReportContent}
                      onChange={(e) => setEditedReportContent(e.target.value)}
                      className="w-full h-96 p-4 bg-[#0f0f0f] border border-[#333] rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:border-[#555]"
                      placeholder="Edit your report HTML content here..."
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      ⚠️ Advanced mode: Direct HTML editing. Use Visual Editor for easier editing.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex items-center justify-between pt-4 border-t border-[#333] mt-6">
                <p className="text-sm text-gray-400">
                  {editMode === 'visual' 
                    ? "Edit each section above to customize your report." 
                    : "Edit the HTML content above for advanced customization."
                  }
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={cancelEditingReport}
                    className="border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEditedReport}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dev Mode Indicator */}
      {devModeActive && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse z-50">
          DEV MODE
        </div>
      )}
      </div>
    </div>
  )
} 