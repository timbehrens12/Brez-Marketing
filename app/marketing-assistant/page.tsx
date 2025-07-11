"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { MetricCard } from "@/components/metrics/MetricCard"
import { DateRange } from "react-day-picker"
import { DateRangePicker } from "@/components/DateRangePicker"
import { subDays, format } from "date-fns"
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"

interface MetaMetrics {
  adSpend: number
  adSpendGrowth: number
  impressions: number
  impressionGrowth: number
  clicks: number
  clickGrowth: number
  conversions: number
  conversionGrowth: number
  ctr: number
  ctrGrowth: number
  cpc: number
  cpcGrowth: number
  costPerResult: number
  cprGrowth: number
  roas: number
  roasGrowth: number
  frequency: number
  budget: number
  reach: number
  dailyData: any[]
  previousAdSpend: number
  previousImpressions: number
  previousClicks: number
  previousConversions: number
  previousCtr: number
  previousCpc: number
  previousRoas: number
}

const defaultMetrics: MetaMetrics = {
  adSpend: 0,
  adSpendGrowth: 0,
  impressions: 0,
  impressionGrowth: 0,
  clicks: 0,
  clickGrowth: 0,
  conversions: 0,
  conversionGrowth: 0,
  ctr: 0,
  ctrGrowth: 0,
  cpc: 0,
  cpcGrowth: 0,
  costPerResult: 0,
  cprGrowth: 0,
  roas: 0,
  roasGrowth: 0,
  frequency: 0,
  budget: 0,
  reach: 0,
  dailyData: [],
  previousAdSpend: 0,
  previousImpressions: 0,
  previousClicks: 0,
  previousConversions: 0,
  previousCtr: 0,
  previousCpc: 0,
  previousRoas: 0
}

export default function MarketingAssistantPage() {
  const { selectedBrandId } = useBrandContext()
  const { agencySettings } = useAgency()
  const pathname = usePathname()
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [metaMetrics, setMetaMetrics] = useState<MetaMetrics>(defaultMetrics)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date()
  })

  // Page loading simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Fetch Meta metrics
  useEffect(() => {
    if (!selectedBrandId || !dateRange?.from || !dateRange?.to) return

    const fetchMetaMetrics = async () => {
      setIsLoadingMetrics(true)
      try {
        const fromDate = format(dateRange.from!, 'yyyy-MM-dd')
        const toDate = format(dateRange.to!, 'yyyy-MM-dd')
        
        const response = await fetch(
          `/api/metrics/meta?brandId=${selectedBrandId}&from=${fromDate}&to=${toDate}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch Meta metrics')
        }
        
        const data = await response.json()
        
        // Calculate previous period values for comparison
        const periodLength = Math.ceil((dateRange.to!.getTime() - dateRange.from!.getTime()) / (1000 * 60 * 60 * 24))
        const previousFromDate = format(subDays(dateRange.from!, periodLength), 'yyyy-MM-dd')
        const previousToDate = format(subDays(dateRange.to!, periodLength), 'yyyy-MM-dd')
        
        const previousResponse = await fetch(
          `/api/metrics/meta?brandId=${selectedBrandId}&from=${previousFromDate}&to=${previousToDate}`
        )
        
        let previousData = defaultMetrics
        if (previousResponse.ok) {
          previousData = await previousResponse.json()
        }
        
        setMetaMetrics({
          ...data,
          previousAdSpend: previousData.adSpend || 0,
          previousImpressions: previousData.impressions || 0,
          previousClicks: previousData.clicks || 0,
          previousConversions: previousData.conversions || 0,
          previousCtr: previousData.ctr || 0,
          previousCpc: previousData.cpc || 0,
          previousRoas: previousData.roas || 0
        })
      } catch (error) {
        console.error('Error fetching Meta metrics:', error)
        setMetaMetrics(defaultMetrics)
      } finally {
        setIsLoadingMetrics(false)
      }
    }

    fetchMetaMetrics()
  }, [selectedBrandId, dateRange])

  // Show loading state
  if (isLoadingPage) {
    const loadingConfig = getPageLoadingConfig(pathname)
    
    return (
      <UnifiedLoading
        variant="page"
        size="lg"
        message="Loading Marketing Assistant"
        subMessage="Preparing your marketing insights"
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketing Assistant</h1>
          <p className="text-gray-400 mt-1">Monitor your Meta advertising performance</p>
        </div>
        <DateRangePicker 
          dateRange={{
            from: dateRange?.from || subDays(new Date(), 7),
            to: dateRange?.to || new Date()
          }} 
          setDateRange={(range) => setDateRange(range)}
        />
      </div>

      {!selectedBrandId ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Please select a brand to view marketing metrics</p>
        </div>
      ) : (
        <>
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {/* Ad Spend */}
            <MetricCard 
              title="Ad Spend"
              value={metaMetrics.adSpend}
              change={metaMetrics.adSpendGrowth}
              previousValue={metaMetrics.previousAdSpend}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="currency"
              previousValueDecimals={2}
              previousValuePrefix="$"
              infoTooltip="Total amount spent on Meta ads"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />

            {/* ROAS */}
            <MetricCard 
              title="ROAS"
              value={metaMetrics.roas}
              change={metaMetrics.roasGrowth}
              previousValue={metaMetrics.previousRoas}
              suffix="x"
              valueFormat="number"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={2}
              previousValueSuffix="x"
              infoTooltip="Return on ad spend (revenue / ad spend)"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />

            {/* Conversions */}
            <MetricCard 
              title="Conversions"
              value={metaMetrics.conversions}
              change={metaMetrics.conversionGrowth}
              previousValue={metaMetrics.previousConversions}
              hideGraph={true}
              valueFormat="number"
              decimals={0}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={0}
              infoTooltip="Total number of conversions from your ads"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />

            {/* CPC */}
            <MetricCard 
              title="CPC"
              value={metaMetrics.cpc}
              change={metaMetrics.cpcGrowth}
              previousValue={metaMetrics.previousCpc}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="currency"
              previousValueDecimals={2}
              previousValuePrefix="$"
              infoTooltip="Average cost per click (spend ÷ clicks)"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />

            {/* Impressions */}
            <MetricCard 
              title="Impressions"
              value={metaMetrics.impressions}
              change={metaMetrics.impressionGrowth}
              previousValue={metaMetrics.previousImpressions}
              hideGraph={true}
              valueFormat="number"
              decimals={0}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={0}
              infoTooltip="Total number of times your ads were viewed"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />

            {/* Clicks */}
            <MetricCard 
              title="Clicks"
              value={metaMetrics.clicks}
              change={metaMetrics.clickGrowth}
              previousValue={metaMetrics.previousClicks}
              hideGraph={true}
              valueFormat="number"
              decimals={0}
              showPreviousPeriod={true}
              previousValueFormat="number"
              previousValueDecimals={0}
              infoTooltip="Total number of clicks on your ads"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />

            {/* CTR */}
            <MetricCard 
              title="CTR"
              value={metaMetrics.ctr / 100} // Convert percentage to decimal for proper formatting
              change={metaMetrics.ctrGrowth}
              previousValue={metaMetrics.previousCtr / 100}
              valueFormat="percentage"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="percentage"
              previousValueDecimals={2}
              infoTooltip="Click-through rate (clicks ÷ impressions)"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />

            {/* Cost Per Result */}
            <MetricCard 
              title="Cost Per Result"
              value={metaMetrics.costPerResult}
              change={metaMetrics.cprGrowth}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              showPreviousPeriod={true}
              previousValueFormat="currency"
              previousValueDecimals={2}
              previousValuePrefix="$"
              infoTooltip="Average cost per conversion"
              nullChangeText="N/A"
              nullChangeTooltip="No data for previous period"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Reach */}
            <MetricCard 
              title="Reach"
              value={metaMetrics.reach}
              hideGraph={true}
              valueFormat="number"
              decimals={0}
              hideChange={true}
              infoTooltip="Total number of unique people who saw your ads"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />

            {/* Frequency */}
            <MetricCard 
              title="Frequency"
              value={metaMetrics.frequency}
              hideGraph={true}
              valueFormat="number"
              decimals={2}
              hideChange={true}
              infoTooltip="Average number of times each person saw your ads"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />

            {/* Daily Budget */}
            <MetricCard 
              title="Daily Budget"
              value={metaMetrics.budget}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              hideChange={true}
              infoTooltip="Average daily budget across all campaigns"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />

            {/* Purchase Value */}
            <MetricCard 
              title="Purchase Value"
              value={metaMetrics.roas * metaMetrics.adSpend}
              prefix="$"
              valueFormat="currency"
              decimals={2}
              hideGraph={true}
              hideChange={true}
              infoTooltip="Total purchase value from ads (ROAS × Ad Spend)"
              data={[]}
              loading={isLoadingMetrics}
              className="min-h-[120px]"
            />
          </div>

          {/* Placeholder for future marketing assistant features */}
          <div className="mt-8 p-8 bg-[#111] border border-[#333] rounded-lg text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Marketing Assistant Features</h2>
            <p className="text-gray-400">Additional marketing insights and AI-powered recommendations will be available here soon.</p>
          </div>
        </>
      )}
    </div>
  )
} 