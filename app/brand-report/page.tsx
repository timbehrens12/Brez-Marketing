"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from '@/lib/context/BrandContext'
import { DateRange } from "react-day-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { startOfDay, endOfDay, format, startOfMonth, endOfMonth, subMonths, parse, isAfter, isBefore } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, BarChart4, Calendar, RefreshCw, Clock, Zap, MoreHorizontal, Filter, ChevronRight, CircleIcon, ArrowUpRight, Download, Settings, ToggleLeft, ToggleRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { useUser } from "@clerk/nextjs"
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as ReTooltip } from "recharts"
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
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  })
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today")
  
  // New state for snapshot system
  const [snapshotTime1, setSnapshotTime1] = useState<string>("12:00") // Default noon
  const [snapshotTime2, setSnapshotTime2] = useState<string>("18:00") // Default 6 PM
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([])
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null)
  const [activeSnapshotIndex, setActiveSnapshotIndex] = useState<0 | 1>(0)
  const [canGenerateSnapshot1, setCanGenerateSnapshot1] = useState(false)
  const [canGenerateSnapshot2, setCanGenerateSnapshot2] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [lastManualRefresh, setLastManualRefresh] = useState<Date | null>(null)
  const [canManualRefresh, setCanManualRefresh] = useState(true)
  const [manualRefreshCooldown, setManualRefreshCooldown] = useState<number>(0) // in seconds

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

  // Check if current time allows for snapshot generation
  const checkSnapshotAvailability = () => {
    const now = new Date()
    const currentTime = format(now, 'HH:mm')
    
    // Parse snapshot times
    const snapshot1Time = parse(snapshotTime1, 'HH:mm', new Date())
    const snapshot2Time = parse(snapshotTime2, 'HH:mm', new Date())
    const currentDateTime = parse(currentTime, 'HH:mm', new Date())
    
    // Can generate snapshot if current time is at or past the snapshot time
    setCanGenerateSnapshot1(isAfter(currentDateTime, snapshot1Time) || currentTime === snapshotTime1)
    setCanGenerateSnapshot2(isAfter(currentDateTime, snapshot2Time) || currentTime === snapshotTime2)
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
        getAllSnapshots: 'true'
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
  const generateAiReport = async (snapshotTime: string | null, forceRefresh = false) => {
    if (!selectedBrandId || !user?.id) {
      toast({
        title: "Error",
        description: "Please select a brand first",
        variant: "destructive"
      })
      return
    }

    // Check for insufficient data (only for scheduled snapshots, not manual refresh)
    if (snapshotTime && hasInsufficientData(snapshotTime)) {
      toast({
        title: "Not enough data yet",
        description: "There isn't enough data accumulated today yet. Try again in a few hours when there's more activity to analyze.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoadingReport(true)

      const fromDate = format(dateRange.from!, 'yyyy-MM-dd')
      const toDate = format(dateRange.to!, 'yyyy-MM-dd')

      console.log(`🎯 Generating AI report for brand ${selectedBrandId}, snapshot: ${snapshotTime}`)

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
        user: {
          greeting
        },
        formatting_instructions: {
          style: "Use proper HTML structure with clear sections and headings. Format the report with: 1. Executive Summary section, 2. Performance Overview section with specific metrics, 3. Channel Analysis sections (Shopify Performance, Meta/Facebook Ads Performance), 4. Strengths & Opportunities section, 5. What's Not Working section, 6. Actionable Recommendations section. Use <h2> for main sections, <h3> for subsections, <p> for paragraphs, <ul> and <li> for lists. Make it structured and readable, not one big paragraph."
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

      if (!aiResult.analysis) {
        throw new Error("No analysis returned from AI")
      }

      // Create formatted report with optional snapshot time info
      const brandName = selectedBrand?.name || "Unknown Brand"
      const currentDate = format(new Date(), 'MMMM d, yyyy')
      const snapshotLabel = snapshotTime ? format(parse(snapshotTime, 'HH:mm', new Date()), 'h:mm a') : null
      
      // Generate unique report ID
      const reportId = `${selectedBrand?.name?.slice(0, 3).toUpperCase() || 'UNK'}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      
      const formattedReport = `
        <div class="report-container" style="background: #0a0a0a; color: white; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; position: relative;">
          <!-- Header with brand info and logo -->
          <div class="report-header" style="background: #0a0a0a; padding: 2rem; border-bottom: 1px solid #333; position: relative; padding-right: 120px;">
            <div class="report-logo-container" style="position: absolute; top: 1.5rem; right: 2rem; width: 80px; height: 80px; background: #1a1a1a; border: 2px solid #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10;">
              ${agencySettings.agency_logo_url 
                ? `<img src="${agencySettings.agency_logo_url}" alt="Agency Logo" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover;" />`
                : `<span style="color: #666; font-size: 12px; text-align: center; font-weight: 600;">${agencySettings.agency_name.slice(0, 2).toUpperCase()}</span>`
              }
              </div>
            <h1 style="color: white; font-size: 2.5rem; font-weight: 700; margin: 0 0 0.5rem 0; letter-spacing: -0.025em;">MARKETING INSIGHTS</h1>
            <p style="color: #888; font-size: 0.875rem; margin: 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">${snapshotLabel ? `SNAPSHOT REPORT - ${snapshotLabel}` : 'MANUAL REFRESH REPORT'}</p>
            <div style="margin-top: 2rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; color: #ccc; font-size: 0.875rem;">
              <div><strong style="color: white;">Brand:</strong> ${brandName}</div>
              <div><strong style="color: white;">Period:</strong> ${selectedPeriod === "today" ? "Today's Performance" : `${format(dateRange.from!, 'MMMM yyyy')}`}</div>
                              <div><strong style="color: white;">Generated:</strong> ${currentDate}${snapshotLabel ? ` at ${snapshotLabel}` : ' (Manual Refresh)'}</div>
              <div><strong style="color: white;">ID:</strong> ${reportId}</div>
            </div>
          </div>
          
          <!-- Report content with proper spacing -->
          <div class="report-content" style="padding: 2rem; color: #e5e5e5;">
            ${aiResult.analysis}
          </div>
          
          <!-- Footer -->
          <div class="report-footer" style="background: #0a0a0a; padding: 1.5rem 2rem; border-top: 1px solid #333; text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; color: #666; font-size: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${agencySettings.agency_logo_url 
                  ? `<img src="${agencySettings.agency_logo_url}" alt="Agency Logo" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover;" />`
                  : `<span style="display: inline-block; width: 16px; height: 16px; background: #1a1a1a; border: 1px solid #333; border-radius: 50%; text-align: center; line-height: 14px; font-size: 10px; color: #666;">${agencySettings.agency_name.slice(0, 2).toUpperCase()}</span>`
                }
                <span>Powered by ${agencySettings.agency_name}</span>
            </div>
              <div style="text-align: right;">
                <div style="font-weight: 500;">CONFIDENTIAL & PROPRIETARY</div>
                <div>${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</div>
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

  // Handle snapshot generation
  const handleGenerateSnapshot = (snapshotIndex: 0 | 1) => {
    const snapshotTime = snapshotIndex === 0 ? snapshotTime1 : snapshotTime2
    const canGenerate = snapshotIndex === 0 ? canGenerateSnapshot1 : canGenerateSnapshot2
    
    if (!canGenerate) {
      const snapshotLabel = format(parse(snapshotTime, 'HH:mm', new Date()), 'h:mm a')
        toast({
        title: "Snapshot not available yet",
        description: `The ${snapshotLabel} snapshot will be available at ${snapshotLabel} today.`,
        variant: "destructive"
      })
      return
      }
    
    console.log('🔄 Manual snapshot generation triggered for:', snapshotTime)
    generateAiReport(snapshotTime, true)
    }
    
  // Toggle between reports
  const handleToggleReport = (snapshotIndex: 0 | 1) => {
    const snapshotTime = snapshotIndex === 0 ? snapshotTime1 : snapshotTime2
    const report = dailyReports.find((r: DailyReport) => r.snapshotTime === snapshotTime)
    
    if (report) {
      setSelectedReport(report)
      setActiveSnapshotIndex(snapshotIndex)
    } else {
      // No report exists for this snapshot time yet
      setSelectedReport(null)
      setActiveSnapshotIndex(snapshotIndex)
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
      container.style.backgroundColor = '#0a0a0a'; // Match background color
      document.body.appendChild(container);
      
      // Get the selected brand name
      const brandName = brands.find(brand => brand.id === selectedBrandId)?.name || "Your Brand";
      
      // Get the current report content
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(selectedReport.content, 'text/html');
      
      // Remove any export-exclude elements (like greetings)
      const excludedElements = htmlDoc.querySelectorAll('.export-exclude');
      excludedElements.forEach(el => el.remove());
      
      // Get the modified report content
      const reportElement = htmlDoc.querySelector('.report-container');
      const reportContent = reportElement ? reportElement.outerHTML : selectedReport.content;
      
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
      
      // Render the canvas with proper dimensions
      const canvas = await html2canvas(reportContainer as HTMLElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#0a0a0a', // Match the dark theme background
        windowWidth: 800,
        onclone: (clonedDoc) => {
          // Make sure the footer background extends to the bottom
          const footer = clonedDoc.querySelector('.report-footer');
          if (footer instanceof HTMLElement) {
            footer.style.backgroundColor = '#0a0a0a';
            footer.style.minHeight = '60px';
            footer.style.padding = '1.5rem 2rem';
          }
          
          // Ensure header logo is properly positioned and sized for PDF
          const headerLogo = clonedDoc.querySelector('.report-logo-container');
          if (headerLogo instanceof HTMLElement) {
            headerLogo.style.position = 'absolute';
            headerLogo.style.top = '1.5rem';
            headerLogo.style.right = '2rem';
            headerLogo.style.width = '80px';
            headerLogo.style.height = '80px';
            headerLogo.style.background = '#1a1a1a';
            headerLogo.style.border = '2px solid #333';
            headerLogo.style.borderRadius = '50%';
            headerLogo.style.display = 'flex';
            headerLogo.style.alignItems = 'center';
            headerLogo.style.justifyContent = 'center';
            headerLogo.style.zIndex = '10';
          }
          
          // Ensure header has proper spacing for logo and text doesn't overlap
          const header = clonedDoc.querySelector('.report-header');
          if (header instanceof HTMLElement) {
            header.style.paddingRight = '120px'; // Extra space for logo
            header.style.position = 'relative';
          }
          
          // Ensure the title and subtitle don't overlap with logo
          const title = clonedDoc.querySelector('.report-header h1');
          if (title instanceof HTMLElement) {
            title.style.maxWidth = 'calc(100% - 100px)';
            title.style.lineHeight = '1.1';
          }
          
          // Final cleanup of any excluded elements
          const excludedElements = clonedDoc.querySelectorAll('.export-exclude');
          excludedElements.forEach(el => el.remove());
        }
      });
      
      // Get canvas dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create new jsPDF instance with dimensions that match content
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight + 1], // Add a small buffer
        hotfixes: ['px_scaling']
      });
      
      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png');
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Save PDF with snapshot time in filename
      const reportPeriod = selectedPeriod === "today" 
        ? format(new Date(), 'yyyy-MM-dd')
        : format(dateRange.from!, 'yyyy-MM');
      const snapshotLabel = selectedReport.snapshotTime.replace(':', '-')
      pdf.save(`brand-report-${reportPeriod}-${snapshotLabel}.pdf`);
      
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

  // Manual refresh cooldown management (3 hour cooldown)
  const MANUAL_REFRESH_COOLDOWN = 3 * 60 * 60 // 3 hours in seconds
  
  const checkManualRefreshAvailability = () => {
    if (!lastManualRefresh) {
      setCanManualRefresh(true)
      setManualRefreshCooldown(0)
      return
    }
    
    const now = new Date()
    const timeSinceLastRefresh = Math.floor((now.getTime() - lastManualRefresh.getTime()) / 1000)
    const remaining = MANUAL_REFRESH_COOLDOWN - timeSinceLastRefresh
    
    if (remaining <= 0) {
      setCanManualRefresh(true)
      setManualRefreshCooldown(0)
      } else {
      setCanManualRefresh(false)
      setManualRefreshCooldown(remaining)
    }
  }

  // Format cooldown time display
  const formatCooldownTime = () => {
    if (manualRefreshCooldown <= 0) return ""
    
    const hours = Math.floor(manualRefreshCooldown / 3600)
    const minutes = Math.floor((manualRefreshCooldown % 3600) / 60)
    const seconds = manualRefreshCooldown % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  // Handle manual refresh with cooldown
  const handleManualRefresh = () => {
    if (!canManualRefresh) {
      toast({
        title: "Please wait",
        description: `Manual refresh available in ${formatCooldownTime()}`,
        variant: "destructive"
      })
      return
    }
    
    if (!selectedBrandId) {
      toast({
        title: "Error",
        description: "Please select a brand first",
        variant: "destructive"
      })
      return
    }
    
    console.log('🔄 Manual refresh triggered')
    setLastManualRefresh(new Date())
    
    // Generate report without snapshot time (null will be saved to database)
    generateAiReport(null, true)
  }

  // Check snapshot availability every minute
  useEffect(() => {
    checkSnapshotAvailability()
    const interval = setInterval(checkSnapshotAvailability, 60000)
    return () => clearInterval(interval)
  }, [snapshotTime1, snapshotTime2])

  // Check manual refresh availability every second during cooldown
  useEffect(() => {
    checkManualRefreshAvailability()
    
    let interval: NodeJS.Timeout | null = null
    if (manualRefreshCooldown > 0) {
      interval = setInterval(checkManualRefreshAvailability, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [lastManualRefresh, manualRefreshCooldown])

  // Effect to load reports when brand or period changes
  useEffect(() => {
    console.log('🔄 useEffect triggered:', { selectedBrandId, selectedPeriod, dateRange })
      
    if (selectedBrandId && dateRange.from && dateRange.to && user?.id) {
      console.log(`📊 Loading reports for brand: ${selectedBrandId}, period: ${selectedPeriod}`)
      setIsLoadingReport(true)
      
      const fromDate = format(dateRange.from, 'yyyy-MM-dd')
      const toDate = format(dateRange.to, 'yyyy-MM-dd')
      
      // Load all daily reports
      loadDailyReports(selectedBrandId, fromDate, toDate, selectedPeriod)
        .then(reports => {
          setDailyReports(reports)
          
          if (reports.length > 0) {
            // Select the most recent report by default
                         const latest = reports.sort((a: DailyReport, b: DailyReport) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            setSelectedReport(latest)
            
            // Set active snapshot index based on the latest report
            if (latest.snapshotTime === snapshotTime1) {
              setActiveSnapshotIndex(0)
            } else if (latest.snapshotTime === snapshotTime2) {
              setActiveSnapshotIndex(1)
            }
            
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
  }, [selectedBrandId, selectedPeriod, dateRange.from, dateRange.to, user?.id])

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <Card className="bg-[#111] border-[#333]">
          <CardHeader className="border-b border-[#333] pb-6">
            <div className="flex flex-col space-y-4">
              {/* Top row - Title and Controls */}
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-2xl font-bold text-white">
                      {getGreeting()}, {getUserFirstName()}! 👋
                    </CardTitle>
                  </div>
                  <CardDescription className="text-gray-400 text-base">
                    {selectedBrandId && brands.find(b => b.id === selectedBrandId) 
                      ? `Performance reports for ${brands.find(b => b.id === selectedBrandId)?.name} - use scheduled snapshots or manual refresh (3hr cooldown)`
                      : "Select a brand to view comprehensive marketing performance reports with scheduled snapshots or manual refresh"
                    }
                  </CardDescription>
                </div>
                
                <div className="flex items-center space-x-3">
            <Select value={selectedPeriod} onValueChange={handlePeriodSelect}>
                    <SelectTrigger className="w-[140px] bg-[#1a1a1a] border-[#333] text-white hover:bg-[#222]">
                      <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                    </SelectContent>
                  </Select>
            
                <Button 
                  variant="outline" 
                    size="sm"
                    className="text-gray-200 bg-[#1a1a1a] border-[#333] hover:bg-[#222] hover:text-white"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Times
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={cn(
                      "text-gray-200 bg-[#1a1a1a] border-[#333] hover:bg-[#222] hover:text-white",
                      (!selectedBrandId || !canManualRefresh || isLoadingReport) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={handleManualRefresh}
                    disabled={isLoadingReport || !selectedBrandId || !canManualRefresh}
                >
                  {isLoadingReport ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                    {canManualRefresh ? "Manual Refresh" : `Wait ${formatCooldownTime()}`}
                </Button>
                
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-gray-200 bg-[#1a1a1a] border-[#333] hover:bg-[#222] hover:text-white"
                    onClick={exportToPdf}
                    disabled={isLoadingReport || !selectedReport || isExportingPdf}
                  >
                    {isExportingPdf ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Export PDF
                  </Button>
              </div>
            </div>
            
              {/* Snapshot Time Settings */}
              {showSettings && (
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-white">Configure Snapshot Times</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowSettings(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      ×
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                      <label className="text-xs text-gray-400">Snapshot 1 Time</label>
                      <Input
                        type="time"
                        value={snapshotTime1}
                        onChange={(e) => setSnapshotTime1(e.target.value)}
                        className="bg-[#0a0a0a] border-[#333] text-white"
                      />
          </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400">Snapshot 2 Time</label>
                      <Input
                        type="time"
                        value={snapshotTime2}
                        onChange={(e) => setSnapshotTime2(e.target.value)}
                        className="bg-[#0a0a0a] border-[#333] text-white"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Set your preferred times for daily snapshots. You can generate up to 2 snapshots per day at these configured times.
                  </p>
                </div>
              )}
              
              {/* Snapshot Controls (only show for today) */}
              {selectedPeriod === "today" && (
                <div className="flex items-center justify-between pt-2 border-t border-[#333]">
                  <div className="flex items-center space-x-4">
                    {/* Snapshot Time Buttons */}
                    {[0, 1].map((snapshotIndex) => {
                      const snapshotTime = snapshotIndex === 0 ? snapshotTime1 : snapshotTime2
                      const canGenerate = snapshotIndex === 0 ? canGenerateSnapshot1 : canGenerateSnapshot2
                                             const hasReport = dailyReports.find((r: DailyReport) => r.snapshotTime === snapshotTime)
                      const isActive = activeSnapshotIndex === snapshotIndex
                      const snapshotLabel = format(parse(snapshotTime, 'HH:mm', new Date()), 'h:mm a')
                      
                      return (
                        <div key={snapshotIndex} className="flex items-center space-x-2">
                          <Button
                            variant={isActive && hasReport ? "default" : "outline"}
                            size="sm"
                            className={cn(
                              "text-xs",
                              isActive && hasReport
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "text-gray-200 bg-[#1a1a1a] border-[#333] hover:bg-[#222] hover:text-white",
                              (!selectedBrandId || isLoadingReport) && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => hasReport ? handleToggleReport(snapshotIndex as 0 | 1) : handleGenerateSnapshot(snapshotIndex as 0 | 1)}
                            disabled={isLoadingReport || !selectedBrandId}
                          >
                            {hasReport ? (
                              <>
                                {isActive ? <ToggleRight className="h-3 w-3 mr-1" /> : <ToggleLeft className="h-3 w-3 mr-1" />}
                                {snapshotLabel}
                              </>
                            ) : (
                              <>
                                {isLoadingReport ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Clock className="h-3 w-3 mr-1" />
                                )}
                                Generate {snapshotLabel}
                              </>
                            )}
                          </Button>
                          
                          {hasReport && (
                            <Badge variant="outline" className="text-xs bg-green-900/20 border-green-700 text-green-400">
                              Ready
                            </Badge>
                          )}
                          
                          {!hasReport && !canGenerate && (
                            <span className="text-xs text-gray-500">
                              Available at {snapshotLabel}
                            </span>
                          )}
                </div>
                      )
                    })}
                    </div>
                  
                  {/* Status Info */}
                  <div className="flex items-center space-x-4 text-xs">
                    {selectedReport && (
                      <span className="text-gray-500">
                        Generated: {format(new Date(selectedReport.createdAt), 'MMM d, h:mm a')}
                      </span>
                    )}
                    
                    {selectedPeriod === "today" && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-gray-500">
                          {dailyReports.filter(r => r.snapshotTime !== "manual").length} of 2 snapshots + {dailyReports.filter(r => r.snapshotTime === "manual").length} manual
                        </span>
                        </div>
                  )}
                  </div>
                      </div>
                    )}
              
              {/* Period Badge */}
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="text-xs bg-[#1a1a1a] border-[#333] text-gray-300">
                  {selectedPeriod === "today" 
                    ? "Daily Reports & Snapshots" 
                    : `${format(dateRange.from!, 'MMMM yyyy')} Report`}
                </Badge>
                {isLoadingReport && (
                  <div className="flex items-center space-x-2 text-xs text-blue-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>
                      {selectedReport ? "Refreshing data..." : "Analyzing performance..."}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className={cn("p-0", isLoadingReport && "report-loading")}>
            {isLoadingReport ? (
              <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <div className="text-white text-center space-y-2">
                  <p className="text-lg font-semibold">
                    {selectedReport ? "Refreshing your snapshot" : "Generating your marketing snapshot"}
                  </p>
                  <p className="text-gray-400">
                    {selectedReport ? "Loading latest performance data..." : "Analyzing your marketing data across all platforms..."}
                  </p>
                </div>
                {selectedReport && (
                  <div 
                    className="w-full p-6 opacity-20 mt-8"
                    dangerouslySetInnerHTML={{ __html: selectedReport.content }}
                  />
                )}
              </div>
            ) : selectedReport ? (
              <div 
                className="p-6"
                dangerouslySetInnerHTML={{ __html: selectedReport.content }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-24 space-y-6">
                <div className="relative">
                <BarChart4 className="h-16 w-16 text-gray-700" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Zap className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-white font-semibold text-lg">Generate your first report</p>
                  <p className="text-gray-400 max-w-md">
                    {selectedPeriod === "today" 
                      ? "Use scheduled snapshot times or click Manual Refresh to generate your first daily performance report"
                      : "Select a brand and time period to access comprehensive marketing insights and performance data"
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 