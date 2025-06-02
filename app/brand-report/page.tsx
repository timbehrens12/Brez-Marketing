"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from '@/lib/context/BrandContext'
import { DateRange } from "react-day-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { startOfDay, endOfDay, format, startOfMonth, endOfMonth, subMonths, differenceInHours, addHours, isFirstDayOfMonth, addMonths } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, BarChart4, Calendar, RefreshCw, Clock, Zap, MoreHorizontal, Filter, ChevronRight, CircleIcon, ArrowUpRight, Download } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from '@/lib/supabase'
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"

export default function BrandReportPage() {
  const { toast } = useToast()
  const { user } = useUser()
  const { selectedBrandId, brands } = useBrandContext()
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  })
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [aiReport, setAiReport] = useState<string>("")
  const [reportData, setReportData] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today")
  const [forceRefresh, setForceRefresh] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null)

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  // Get user's first name
  const getUserFirstName = () => {
    if (!user) return ""
    return user.firstName || user.fullName?.split(' ')[0] || ""
  }

  // Handle period selection
  const handlePeriodSelect = (value: string) => {
    // Reset refresh time first to prevent stale values when switching periods
    setNextRefreshTime(null)
    console.log(`[BrandReport] Reset nextRefreshTime due to period change from ${selectedPeriod} to ${value}`)
    setSelectedPeriod(value)
    
    const now = new Date()
    let from: Date
    let to: Date
    
    switch (value) {
      case "today":
        from = startOfDay(now)
        to = endOfDay(now)
        break
      case "last-month": {
        // Get the first and last day of previous month with proper year handling
        const lastMonth = subMonths(now, 1)
        from = startOfMonth(lastMonth)
        to = endOfMonth(lastMonth)
        console.log(`Setting date range to last month: ${format(from, 'MMMM yyyy')}`) // Debug log
        break
      }
      default:
        from = startOfDay(now)
        to = endOfDay(now)
    }
    
    const newDateRangeObj = { from, to };
    // Update state and localStorage to ensure persistence
    setDateRange(newDateRangeObj)
    
    // Store the currently selected period and date range in localStorage
    try {
      localStorage.setItem('selectedPeriod', value);
      localStorage.setItem('dateRangeFrom', from.toISOString());
      localStorage.setItem('dateRangeTo', to.toISOString());
      console.log(`Saved period ${value} and date range to localStorage`);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
    
    // Generate a new report with the updated date range and period
    if (selectedBrandId) {
      generateAiReport(false, newDateRangeObj, value); // Pass the new date range and period directly
    }
  }

  // Check if a report exists in the database
  const checkExistingReport = async (brandId: string, fromDate: string, toDate: string, periodName: string) => {
    try {
      console.log('Checking for existing report in database...')
      console.log(`Parameters: brandId=${brandId}, fromDate=${fromDate}, toDate=${toDate}, periodName=${periodName}`)
      
      const { data, error } = await supabase
        .from('ai_marketing_reports')
        .select('*')
        .eq('brand_id', brandId)
        .eq('date_range_from', fromDate)
        .eq('date_range_to', toDate)
        .eq('period_name', periodName)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error) {
        console.error('Error checking for existing report:', error)
        // Reset next refresh time to prevent showing stale refresh times
        setNextRefreshTime(null)
        return null
      }
      
      if (data && data.length > 0) {
        console.log('Found existing report from:', new Date(data[0].created_at))
        return data[0]
      } else {
        console.log('No existing report found in database')
        // Reset next refresh time to prevent showing stale refresh times
        setNextRefreshTime(null)
        return null
      }
    } catch (error) {
      console.error('Exception checking for existing report:', error)
      // Reset next refresh time to prevent showing stale refresh times
      setNextRefreshTime(null)
      return null
    }
  }

  // Apply current styling to an existing report content
  const applyCurrentStyling = (existingReport: any, relevantFromDate: Date) => {
    if (!existingReport || !existingReport.raw_response) {
      return null
    }
    
    console.log('Applying current styling to existing report content')
    
    // Get the current report style version
    const REPORT_STYLE_VERSION = 4
    
    // Extract the raw AI content generated by OpenAI
    const rawContent = existingReport.raw_response
    
    // Apply the current styling to the content (similar to what the API does)
    let enhancedMarkdown = rawContent
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3 text-white">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-white">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-white">$1</span>')
    
    // Convert to HTML using simple regex replacements
    const contentHtml = enhancedMarkdown
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
      
    // Create a professional report with current styling
    const brandName = brands.find(brand => brand.id === selectedBrandId)?.name || "Your Brand"
    const reportDate = format(new Date(existingReport.created_at), 'MMMM d, yyyy')
    
    // Always use the relevantFromDate to ensure we show the correct selected month
    let reportPeriod;
    if (existingReport.period_name === "today") {
      reportPeriod = "Today's Performance";
    } else if (existingReport.period_name === "last-month") {
      reportPeriod = `Performance for ${format(relevantFromDate, 'MMMM yyyy')}`;
    } else {
      // Fallback
      reportPeriod = "Monthly Performance";
    }
    
    console.log(`Report period: ${reportPeriod} (using current dateRange)`);
    
    const greeting = `${getGreeting()}, ${getUserFirstName()}`
    
    // Use current professional report template with existing content
    return `
      <div class="report-container" data-style-version="${REPORT_STYLE_VERSION}">
        <!-- Official Report Header -->
        <div class="report-header-wrapper">
          <div class="report-logo-container">
            <div class="report-logo-stamp">
              <img src="/brand/favicon-96x96.png" alt="Brez Logo" width="64" height="64" />
            </div>
          </div>
          
          <div class="report-header">
            <div class="report-title-section">
              <h1 class="report-title">MARKETING INSIGHTS REPORT</h1>
              <p class="report-official">OFFICIAL DOCUMENT</p>
            </div>
            
            <div class="report-meta">
              <table class="report-info-table">
                <tr>
                  <td class="report-info-label">Brand:</td>
                  <td class="report-info-value">${brandName}</td>
                </tr>
                <tr>
                  <td class="report-info-label">Period:</td>
                  <td class="report-info-value">${reportPeriod}</td>
                </tr>
                <tr>
                  <td class="report-info-label">Generated:</td>
                  <td class="report-info-value">${reportDate}</td>
                </tr>
                <tr>
                  <td class="report-info-label">Report ID:</td>
                  <td class="report-info-value font-mono">${existingReport.id}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Report Content -->
        <div class="report-content">
          <div class="space-y-4">
            ${contentHtml}
          </div>
        </div>
        
        <!-- Report Footer -->
        <div class="report-footer">
          <div class="footer-brand">
            <img src="/brand/favicon-96x96.png" alt="Brez Logo" width="24" height="24" />
            <span>Powered by Brez Marketing Assistant</span>
          </div>
          <div class="footer-legal">
            <p>CONFIDENTIAL &amp; PROPRIETARY</p>
            <p class="report-timestamp">${format(new Date(existingReport.created_at), 'yyyy-MM-dd HH:mm:ss')}</p>
          </div>
        </div>
      </div>
      
      <style>
        .report-container {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #e2e8f0;
          margin: 0;
          padding: 0;
          background-color: #121212;
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        }
        
        .report-header-wrapper {
          position: relative;
          background: linear-gradient(135deg, #1a1a1a 0%, #222 100%);
          padding: 2rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .report-logo-container {
          position: absolute;
          top: 1.5rem;
          right: 2rem;
        }
        
        .report-logo-stamp {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .report-header {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: calc(100% - 100px);
        }
        
        .report-title-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .report-title {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin: 0;
          color: white;
          text-transform: uppercase;
        }
        
        .report-official {
          font-size: 0.825rem;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.1em;
          margin: 0;
          font-weight: 500;
        }
        
        .report-info-table {
          margin-top: 1rem;
          border-collapse: collapse;
        }
        
        .report-info-table td {
          padding: 0.35rem 0;
        }
        
        .report-info-label {
          color: rgba(255, 255, 255, 0.6);
          padding-right: 1rem;
          font-size: 0.8125rem;
          font-weight: 500;
          text-align: right;
          white-space: nowrap;
        }
        
        .report-info-value {
          color: white;
          font-size: 0.8125rem;
          font-weight: 500;
        }
        
        .report-content {
          padding: 2rem;
          font-size: 0.9375rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
        }
        
        .report-content h2, .report-content h3 {
          color: white;
        }
        
        .report-content p {
          margin-bottom: 1.25rem;
        }
        
        .report-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: rgba(0, 0, 0, 0.2);
          padding: 1rem 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .footer-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .footer-legal {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }
        
        .footer-legal p {
          margin: 0;
        }
        
        .report-timestamp {
          font-family: monospace;
          font-size: 0.7rem;
        }
      </style>
    `
  }

  // Calculate when the report should be refreshed
  const calculateNextRefreshTime = (createdAt: Date, periodOverride?: string) => {
    // Use the explicit period override if provided, otherwise use the state
    const periodToUse = periodOverride || selectedPeriod;
    console.log(`[BrandReport] Calculating next refresh time for period: ${periodToUse}`)
    
    if (periodToUse === "today") {
      // For today's reports, refresh at fixed times: 12am, 6am, 12pm, 6pm
      const now = new Date();
      const hours = now.getHours();
      
      if (hours < 6) {
        // Next refresh at 6am
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
      } else if (hours < 12) {
        // Next refresh at 12pm
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
      } else if (hours < 18) {
        // Next refresh at 6pm
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0);
      } else {
        // Next refresh at 12am tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0);
      }
    } else if (periodToUse === "last-month") {
      // For last month's report, refresh on the 1st of the next month
      return startOfMonth(addMonths(new Date(), 1));
    }
    
    // Default: don't set a refresh time
    return null;
  }

  // Check if we're at a valid refresh time for today's reports
  const isValidRefreshTime = () => {
    if (selectedPeriod !== "today") return true;
    
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Check if current time is within 5 minutes of a refresh window
    // (12am, 6am, 12pm, 6pm)
    return (
      (hours === 0 && minutes < 5) || 
      (hours === 6 && minutes < 5) || 
      (hours === 12 && minutes < 5) || 
      (hours === 18 && minutes < 5)
    );
  }

  // Get a human-readable message about when the next refresh will happen
  const getNextRefreshMessage = () => {
    if (!nextRefreshTime) return null
    
    const now = new Date()
    if (nextRefreshTime <= now) {
      return "Ready to refresh now"
    }
    
    const hours = Math.round(differenceInHours(nextRefreshTime, now))
    
    if (hours < 1) {
      return "Refresh available in less than an hour"
    } else if (hours === 1) {
      return "Refresh available in 1 hour"
    } else if (hours < 24) {
      return `Refresh available in ${hours} hours`
    } else {
      return `Refresh available on ${format(nextRefreshTime, 'MMM d')}`
    }
  }

  // Generate report
  const generateAiReport = async (forceRefreshReport = false, newDateRange?: DateRange, newPeriod?: string) => {
    if (!selectedBrandId) {
      toast({
        title: "No brand selected",
        description: "Please select a brand to generate a report",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoadingReport(true)
      setAiReport("")

      const currentRange = newDateRange || dateRange; // Use passed dateRange if available
      const currentPeriod = newPeriod || selectedPeriod; // Use passed period if available

      const fromDate = format(currentRange.from!, 'yyyy-MM-dd')
      const toDate = format(currentRange.to!, 'yyyy-MM-dd')

      console.log(`Generating report for brand ${selectedBrandId} from ${fromDate} to ${toDate}, force refresh: ${forceRefreshReport}, period: ${currentPeriod}`)

      // Completely bypass cache when style version changes to ensure new styles are applied
      // This version number should be incremented whenever the report style changes
      const REPORT_STYLE_VERSION = 4
      
      // Check if we have a cached report
      if (!forceRefreshReport) {
        const existingReport = await checkExistingReport(
          selectedBrandId,
          fromDate,
          toDate,
          currentPeriod
        )
        
        if (existingReport) {
          // Only use the existing report if it doesn't need to be refreshed based on time
          const createdAt = new Date(existingReport.created_at)
          const now = new Date()
          let shouldUseExisting = false
          
          if (currentPeriod === "today") {
            // For today's data, use existing report unless we're at a refresh window
            shouldUseExisting = !isValidRefreshTime();
          } else if (currentPeriod === "last-month") {
            // For last month, only refresh on the 1st of the new month
            shouldUseExisting = !isFirstDayOfMonth(now)
          }
          
          // Important: Instead of checking version and regenerating from OpenAI,
          // just apply current styling to the existing report content
          if (shouldUseExisting) {
            console.log('Using existing report with updated styling')
            
            // Apply current styling to existing report content
            const styledReport = applyCurrentStyling(existingReport, currentRange.from!)
            
            if (styledReport) {
              setAiReport(styledReport)
              setLastRefreshed(createdAt)
              const newRefreshTime = calculateNextRefreshTime(createdAt, currentPeriod)
              setNextRefreshTime(newRefreshTime)
              console.log(`[BrandReport] Set nextRefreshTime to ${newRefreshTime?.toISOString() || 'null'} for period: ${currentPeriod}`)
              setIsLoadingReport(false)
              return
            } else {
              console.log('Failed to apply styling, will generate new report')
            }
          } else {
            console.log('Existing report found but needs time-based refresh')
          }
        } else {
          console.log('No existing report found in database')
        }
      } else {
        console.log('Force refresh requested, generating new report')
      }

      const params = new URLSearchParams({
        brandId: selectedBrandId,
        from: fromDate,
        to: toDate,
        t: Date.now().toString() // Cache buster
      })

      // Get brand info
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

      // Add greeting to the report metadata
      const greeting = `${getGreeting()}, ${getUserFirstName()}`

      // Prepare data object for AI analysis
      const dataForAi = {
        date_range: {
          from: fromDate,
          to: toDate,
          period_days: Math.round((currentRange.to!.getTime() - currentRange.from!.getTime()) / (1000 * 60 * 60 * 24)),
          period_name: currentPeriod
        },
        brand: {
          id: selectedBrandId,
          name: selectedBrand?.name || "Unknown Brand",
          industry: "E-commerce" // Default to E-commerce industry
        },
        platforms: {
          shopify: shopifyData,
          meta: metaData
        },
        user: {
          greeting
        }
      }

      // Store data for debug/display purposes
      setReportData(dataForAi)

      // Send data to AI for analysis
      const aiResponse = await fetch('/api/ai/analyze-marketing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataForAi)
      })

      if (!aiResponse.ok) {
        console.error('API response error:', await aiResponse.text())
        throw new Error("Failed to generate AI report")
      }

      const aiResult = await aiResponse.json()
      console.log('Successfully received AI report')
      
      // Create a professional report with proper design elements, branding, and the greeting at the top
      const brandName = selectedBrand?.name || "Your Brand"
      const reportDate = format(new Date(), 'MMMM d, yyyy')
      const reportPeriodString = currentPeriod === "today"
        ? "Today's Performance"
        : `Performance for ${formatMonthYear(currentRange.from!)}`
      
      const professionalReport = `
        <div class="report-container" data-style-version="${REPORT_STYLE_VERSION}">
          <!-- Official Report Header -->
          <div class="report-header-wrapper">
            <div class="report-logo-container">
              <div class="report-logo-stamp">
                <img src="/brand/favicon-96x96.png" alt="Brez Logo" width="64" height="64" />
              </div>
            </div>
            
            <div class="report-header">
              <div class="report-title-section">
                <h1 class="report-title">MARKETING INSIGHTS REPORT</h1>
                <p class="report-official">OFFICIAL DOCUMENT</p>
              </div>
              
              <div class="report-meta">
                <table class="report-info-table">
                  <tr>
                    <td class="report-info-label">Brand:</td>
                    <td class="report-info-value">${brandName}</td>
                  </tr>
                  <tr>
                    <td class="report-info-label">Period:</td>
                    <td class="report-info-value">${reportPeriodString}</td>
                  </tr>
                  <tr>
                    <td class="report-info-label">Generated:</td>
                    <td class="report-info-value">${reportDate}</td>
                  </tr>
                  <tr>
                    <td class="report-info-label">Report ID:</td>
                    <td class="report-info-value font-mono">${Date.now().toString(36).toUpperCase()}</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
          
          <!-- Report Content -->
          <div class="report-content">
            ${aiResult.report}
          </div>
          
          <!-- Report Footer -->
          <div class="report-footer">
            <div class="footer-brand">
              <img src="/brand/favicon-96x96.png" alt="Brez Logo" width="24" height="24" />
              <span>Powered by Brez Marketing Assistant</span>
            </div>
            <div class="footer-legal">
              <p>CONFIDENTIAL &amp; PROPRIETARY</p>
              <p class="report-timestamp">${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
            </div>
          </div>
        </div>
        
        <style>
          .report-container {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #e2e8f0;
            margin: 0;
            padding: 0;
            background-color: #121212;
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
          }
          
          .report-header-wrapper {
            position: relative;
            background: linear-gradient(135deg, #1a1a1a 0%, #222 100%);
            padding: 2rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .report-logo-container {
            position: absolute;
            top: 1.5rem;
            right: 2rem;
          }
          
          .report-logo-stamp {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .report-header {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            max-width: calc(100% - 100px);
          }
          
          .report-title-section {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .report-title {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: 0.05em;
            margin: 0;
            color: white;
            text-transform: uppercase;
          }
          
          .report-official {
            font-size: 0.825rem;
            color: rgba(255, 255, 255, 0.6);
            letter-spacing: 0.1em;
            margin: 0;
            font-weight: 500;
          }
          
          .report-info-table {
            margin-top: 1rem;
            border-collapse: collapse;
          }
          
          .report-info-table td {
            padding: 0.35rem 0;
          }
          
          .report-info-label {
            color: rgba(255, 255, 255, 0.6);
            padding-right: 1rem;
            font-size: 0.8125rem;
            font-weight: 500;
            text-align: right;
            white-space: nowrap;
          }
          
          .report-info-value {
            color: white;
            font-size: 0.8125rem;
            font-weight: 500;
          }
          
          .report-content {
            padding: 2rem;
            font-size: 0.9375rem;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.8);
          }
          
          .report-content h2, .report-content h3 {
            color: white;
          }
          
          .report-content p {
            margin-bottom: 1.25rem;
          }
          
          .report-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: rgba(0, 0, 0, 0.2);
            padding: 1rem 2rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .footer-brand {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.6);
          }
          
          .footer-legal {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0.25rem;
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.5);
          }
          
          .footer-legal p {
            margin: 0;
          }
          
          .report-timestamp {
            font-family: monospace;
            font-size: 0.7rem;
          }
        </style>
      `
      
      setAiReport(professionalReport)
      setLastRefreshed(new Date())
      const newRefreshTime = calculateNextRefreshTime(new Date(), currentPeriod)
      setNextRefreshTime(newRefreshTime)
      console.log(`[BrandReport] Set nextRefreshTime to ${newRefreshTime?.toISOString() || 'null'} for period: ${currentPeriod}`)
      
      // Save the report to the database
      await supabase
        .from('ai_marketing_reports')
        .insert({
          brand_id: selectedBrandId,
          date_range_from: fromDate,
          date_range_to: toDate,
          period_name: currentPeriod,
          raw_response: aiResult.rawResponse,
          formatted_report: professionalReport,
          metadata: {
            brand_name: selectedBrand?.name,
            report_period: reportPeriodString,
            current_date_range: JSON.stringify(currentRange),
          }
        })
        
      console.log('Successfully saved report to database')

    } catch (error) {
      console.error('Error generating report:', error)
      toast({
        title: "Error generating report",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoadingReport(false)
    }
  }

  // Handle manual refresh
  const handleRefresh = () => {
    // Allow forced refresh at the fixed refresh windows
    if (selectedPeriod === "today" && !isValidRefreshTime()) {
      const now = new Date();
      const hours = now.getHours();
      let nextWindow;
      
      if (hours < 6) nextWindow = "6:00 AM";
      else if (hours < 12) nextWindow = "12:00 PM";
      else if (hours < 18) nextWindow = "6:00 PM";
      else nextWindow = "12:00 AM tomorrow";
      
      toast({
        title: "Refresh not available yet",
        description: `Daily reports can only be refreshed at 12AM, 6AM, 12PM, and 6PM. Next window: ${nextWindow}`,
        variant: "destructive",
      });
      return;
    }
    
    // For monthly reports, only allow refresh on 1st of month
    if (selectedPeriod === "last-month" && !isFirstDayOfMonth(new Date())) {
      toast({
        title: "Refresh not available yet",
        description: `Monthly reports can only be refreshed on the 1st of each month.`,
        variant: "destructive",
      });
      return;
    }
    
    generateAiReport(true)
  }

  // Format the last refreshed time
  const formatLastRefreshed = () => {
    if (!lastRefreshed) return "Never"
    return format(lastRefreshed, "MMM d, h:mm a")
  }

  // Get the total performance status
  const getTotalStatus = () => {
    if (!reportData?.platforms?.shopify?.salesGrowth) return "neutral"
    const growth = reportData.platforms.shopify.salesGrowth
    return growth > 0 ? "positive" : growth < 0 ? "negative" : "neutral"
  }

  // Get the badge text for overall performance
  const getTotalBadgeText = () => {
    if (!reportData?.platforms?.shopify?.salesGrowth) return "N/A"
    const growth = reportData.platforms.shopify.salesGrowth
    return growth > 0 ? `+${growth.toFixed(1)}%` : growth < 0 ? `${growth.toFixed(1)}%` : "0%"
  }

  // Get forecasting data for the chart
  const getForecastingData = () => {
    if (!reportData?.platforms?.shopify?.forecastingData) {
      // Generate mock data if none exists
      return Array.from({ length: 7 }).map((_, i) => ({
        date: format(addDays(new Date(), i), 'MMM d'),
        value: 100 + i * 10 + Math.random() * 20
      }))
    }
    
    return reportData.platforms.shopify.forecastingData
  }

  // Format Y-axis values
  const formatYAxis = (value: any) => {
    return `$${value}`
  }

  // Format tooltip values
  const formatTooltipValue = (value: any) => {
    return `$${value.toFixed(2)}`
  }

  // Export the report to PDF
  const exportToPdf = async () => {
    try {
      // Check if we have a report to export
      if (!aiReport) {
        toast({
          title: "No report available",
          description: "Please generate a report first before exporting",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Preparing PDF",
        description: "Your report is being prepared for download...",
      });
      
      // Dynamically import the libraries we need to avoid SSR issues
      const [jsPDFModule, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);
      
      const jsPDF = jsPDFModule.default;
      const html2canvas = html2canvasModule.default;
      
      // Find the report container in the DOM
      const reportElement = document.querySelector('.report-container');
      
      if (!reportElement) {
        throw new Error('Report element not found in the DOM');
      }
      
      // Create a clone of the report to avoid modifying the original
      const clonedReport = reportElement.cloneNode(true) as HTMLElement;
      clonedReport.style.width = '794px'; // Standard A4 width in pixels (roughly)
      clonedReport.style.margin = '0';
      clonedReport.style.padding = '0';
      clonedReport.style.position = 'absolute';
      clonedReport.style.left = '-9999px';
      document.body.appendChild(clonedReport);
      
      // Render the report to a canvas with better settings
      const canvas = await html2canvas(clonedReport, {
        scale: 1.5, // Better scaling for readability
        useCORS: true, // Allow cross-origin images
        logging: false,
        backgroundColor: '#121212', // Match the report background
        width: 794, // A4 width in pixels
        height: clonedReport.scrollHeight,
        windowWidth: 794, // Force consistent rendering width
      });
      
      // Remove the clone after rendering
      document.body.removeChild(clonedReport);
      
      // Create a custom-sized PDF with the exact dimensions needed for a single page
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create a single-page PDF with custom dimensions to fit the entire content
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight], // Custom size for a single continuous page
      });
      
      // Add the rendered report to the PDF as a single image
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // Save the PDF
      pdf.save(`brand-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      
      toast({
        title: "Download complete",
        description: "Your report has been downloaded successfully",
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      
      // Show a more detailed error message
      toast({
        title: "Error exporting to PDF",
        description: error instanceof Error 
          ? `${error.message}. Check browser console for details.` 
          : "An unknown error occurred while generating the PDF",
        variant: "destructive",
      });
    }
  }

  // Use date-fns to format dates consistently
  const formatMonthYear = (date: Date) => {
    return format(date, 'MMMM yyyy')
  }

  // Effect to generate report when brand or period changes
  useEffect(() => {
    if (selectedBrandId) {
      // When selectedPeriod changes, dateRange state should have been updated by handlePeriodSelect
      // or by the initial localStorage load.
      // generateAiReport will use selectedPeriod and dateRange from state if newPeriod/newDateRange are not passed.
      console.log(`useEffect for period change: ${selectedPeriod}, current dateRange: ${dateRange.from?.toISOString()} - ${dateRange.to?.toISOString()}`);
      
      // Make sure nextRefreshTime is cleared before generating a new report
      // This prevents stale nextRefreshTime from being displayed
      if (nextRefreshTime) {
        console.log(`[BrandReport] Clearing nextRefreshTime on brand/period change`);
        setNextRefreshTime(null);
      }
      
      generateAiReport();
    }
  }, [selectedBrandId, selectedPeriod]);

  // Effect to restore saved period and dateRange on component initialization
  useEffect(() => {
    // Restore period and date range from localStorage when the component mounts
    try {
      const savedPeriod = localStorage.getItem('selectedPeriod');
      const savedDateRangeFrom = localStorage.getItem('dateRangeFrom');
      const savedDateRangeTo = localStorage.getItem('dateRangeTo');
      
      if (savedPeriod) {
        console.log(`Restored saved period: ${savedPeriod}`);
        setSelectedPeriod(savedPeriod);
      }
      
      if (savedDateRangeFrom && savedDateRangeTo) {
        const from = new Date(savedDateRangeFrom);
        const to = new Date(savedDateRangeTo);
        
        // Ensure dates are valid before setting them
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          console.log(`Restored saved date range: ${format(from, 'MMMM yyyy')}`);
          setDateRange({ from, to });
        }
      }
    } catch (e) {
      console.error('Error restoring from localStorage:', e);
    }
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Select 
              value={selectedPeriod} 
              onValueChange={handlePeriodSelect}
            >
              <SelectTrigger className="w-[180px] bg-[#222] border-[#333] text-white">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="bg-[#222] border-[#333] text-white">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              className="flex items-center space-x-2 text-gray-200 bg-[#222] border-[#333] hover:bg-[#2a2a2a]"
              onClick={handleRefresh}
              disabled={isLoadingReport || 
                (selectedPeriod === "today" && !isValidRefreshTime()) || 
                (selectedPeriod === "last-month" && !isFirstDayOfMonth(new Date()))}
              title={
                selectedPeriod === "today" && !isValidRefreshTime() ? 
                  "Reports refresh at 12AM, 6AM, 12PM, and 6PM" :
                selectedPeriod === "last-month" && !isFirstDayOfMonth(new Date()) ?
                  "Monthly reports refresh on the 1st of each month" :
                  "Refresh report"
              }
            >
              {isLoadingReport ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>Refresh</span>
            </Button>
            
            {aiReport && (
              <Button 
                variant="outline" 
                className="flex items-center space-x-2 text-gray-200 bg-[#222] border-[#333] hover:bg-[#2a2a2a]"
                onClick={exportToPdf}
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-2xl font-bold text-white">
            <span>{getGreeting()}, {getUserFirstName()}!</span>
          </div>
          <div className="text-gray-400">
            Here's your brand report with the latest marketing analytics and insights. Use this information to optimize your campaigns and track performance.
          </div>
        </div>
        
        <Card className="bg-[#111] border-[#333]">
          <CardHeader className="border-b border-[#333] pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white">Performance Report</CardTitle>
                <CardDescription className="text-gray-400">
                  {selectedPeriod === "today" 
                    ? "Today's marketing performance" 
                    : `Marketing performance for ${formatMonthYear(dateRange.from!)}`}
                </CardDescription>
              </div>
              
              <div className="flex items-center text-gray-400 text-sm space-x-4">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Last updated: {formatLastRefreshed()}</span>
                </div>
                
                {nextRefreshTime && (
                  <div className="flex items-center space-x-1">
                    <Zap className="h-4 w-4" />
                    <span>{getNextRefreshMessage()}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoadingReport ? (
              <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <div className="text-white text-center">
                  <p className="font-semibold">Generating your report</p>
                  <p className="text-gray-400">Analyzing your marketing data to create insights...</p>
                </div>
              </div>
            ) : aiReport ? (
              <div 
                className="p-6"
                dangerouslySetInnerHTML={{ __html: aiReport }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <BarChart4 className="h-16 w-16 text-gray-700" />
                <div className="text-center">
                  <p className="text-white font-semibold">No report available</p>
                  <p className="text-gray-400">Select a brand and time period to generate a report</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper function for dates
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
} 