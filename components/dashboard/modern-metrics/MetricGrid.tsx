"use client"

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { 
  DollarSign, 
  TrendingUp, 
  Eye, 
  Users,
  MousePointer, 
  ShoppingCart, 
  Target, 
  MousePointerClick,
  Percent, 
  Wallet
} from 'lucide-react'
import { FuturisticMetricCard } from './FuturisticMetricCard'

interface MetricGridProps {
  className?: string
  metrics: any
  loading?: boolean
  columns?: 2 | 3 | 4 | 6
  isRefreshing?: boolean
  showGraphs?: boolean
  previousPeriodLabel?: string
}

export function MetricGrid({
  className,
  metrics,
  loading = false,
  columns = 4,
  isRefreshing = false,
  showGraphs = true,
  previousPeriodLabel = "Previous period"
}: MetricGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Effect for the animated background
  useEffect(() => {
    if (!containerRef.current) return
    
    const container = containerRef.current
    
    // Create animated gradient background
    const handleMouseMove = (e: MouseEvent) => {
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      // Convert to percentage
      const xPercent = Math.round((x / rect.width) * 100)
      const yPercent = Math.round((y / rect.height) * 100)
      
      // Update the radial gradient position
      container.style.backgroundPosition = `${xPercent}% ${yPercent}%`
    }
    
    container.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])
  
  // Process metrics data to ensure it's safe to use
  const safeMetrics = {
    adSpend: typeof metrics?.adSpend === 'number' ? metrics.adSpend : 0,
    adSpendGrowth: typeof metrics?.adSpendGrowth === 'number' ? metrics.adSpendGrowth : 0,
    roas: typeof metrics?.roas === 'number' ? metrics.roas : 0,
    roasGrowth: typeof metrics?.roasGrowth === 'number' ? metrics.roasGrowth : 0,
    impressions: typeof metrics?.impressions === 'number' ? metrics.impressions : 0,
    impressionGrowth: typeof metrics?.impressionGrowth === 'number' ? metrics.impressionGrowth : 0,
    reach: typeof metrics?.reach === 'number' ? metrics.reach : 0,
    clicks: typeof metrics?.clicks === 'number' ? metrics.clicks : 0,
    clickGrowth: typeof metrics?.clickGrowth === 'number' ? metrics.clickGrowth : 0,
    purchaseValue: typeof metrics?.purchaseValue === 'number' ? metrics.purchaseValue : 0,
    conversions: typeof metrics?.conversions === 'number' ? metrics.conversions : 0,
    conversionGrowth: typeof metrics?.conversionGrowth === 'number' ? metrics.conversionGrowth : 0,
    cpc: typeof metrics?.cpc === 'number' ? metrics.cpc : 0,
    ctr: typeof metrics?.ctr === 'number' ? metrics.ctr : 0,
    ctrGrowth: typeof metrics?.ctrGrowth === 'number' ? metrics.ctrGrowth : 0,
    linkClicks: typeof metrics?.linkClicks === 'number' ? metrics.linkClicks : 0,
    budget: typeof metrics?.budget === 'number' ? metrics.budget : 0,
    dailyData: Array.isArray(metrics?.dailyData) ? metrics.dailyData : []
  }
  
  // Extract daily values for sparkline graphs
  const getSparklineData = (metric: string) => {
    if (!safeMetrics.dailyData?.length) return []
    
    return safeMetrics.dailyData
      .slice(-14) // last 14 days
      .map((day: any) => Number(day[metric]) || 0)
      .filter((val: number) => !isNaN(val))
  }
  
  // Grid columns class based on the columns prop
  const gridColsClass = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
  }[columns]
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "p-6 rounded-xl relative overflow-hidden border border-[#333]",
        "bg-gradient-radial from-[#111] to-[#080808]",
        "transition-all duration-300",
        className
      )}
      style={{
        backgroundSize: '400% 400%',
        backgroundPosition: '50% 50%'
      }}
    >
      {/* Animated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
      
      {/* Grid dots */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{ 
          backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          backgroundPosition: '0 0',
        }}
      />
      
      {/* Glowing orbs */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-10 w-60 h-60 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      
      {/* Grid container */}
      <div className={cn(
        "grid gap-4 relative z-10",
        gridColsClass
      )}>
        {/* Ad Spend */}
        <FuturisticMetricCard
          title="Ad Spend"
          icon={<DollarSign className="h-4 w-4" />}
          value={safeMetrics.adSpend}
          change={safeMetrics.adSpendGrowth}
          valueFormat="currency"
          variant="success"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={showGraphs}
          dataPoints={getSparklineData('spend')}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Total amount spent on Meta advertising during the selected period"
        />
        
        {/* ROAS */}
        <FuturisticMetricCard
          title="ROAS"
          icon={<TrendingUp className="h-4 w-4" />}
          value={safeMetrics.roas}
          change={safeMetrics.roasGrowth}
          suffix="x"
          valueFormat="number"
          decimals={2}
          variant="primary"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={showGraphs}
          dataPoints={getSparklineData('roas')}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Return On Ad Spend - revenue generated for every $1 spent on ads"
        />
        
        {/* Impressions */}
        <FuturisticMetricCard
          title="Impressions"
          icon={<Eye className="h-4 w-4" />}
          value={safeMetrics.impressions}
          change={safeMetrics.impressionGrowth}
          valueFormat="number"
          variant="warning"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={showGraphs}
          dataPoints={getSparklineData('impressions')}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Number of times your ads were shown on screen"
        />
        
        {/* Reach */}
        <FuturisticMetricCard
          title="Reach"
          icon={<Users className="h-4 w-4" />}
          value={safeMetrics.reach}
          valueFormat="number"
          variant="secondary"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={showGraphs}
          dataPoints={getSparklineData('reach')}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Number of unique people who saw your ads"
        />
        
        {/* Clicks */}
        <FuturisticMetricCard
          title="Clicks"
          icon={<MousePointer className="h-4 w-4" />}
          value={safeMetrics.clicks}
          change={safeMetrics.clickGrowth}
          valueFormat="number"
          variant="info"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={showGraphs}
          dataPoints={getSparklineData('clicks')}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Number of clicks on your ads"
        />
        
        {/* Purchase Value */}
        <FuturisticMetricCard
          title="Avg. Purchase Value"
          icon={<ShoppingCart className="h-4 w-4" />}
          value={safeMetrics.purchaseValue}
          valueFormat="currency"
          variant="secondary"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={false}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Average value of purchases made through your ads"
        />
        
        {/* Conversions */}
        <FuturisticMetricCard
          title="Conversions"
          icon={<Target className="h-4 w-4" />}
          value={safeMetrics.conversions}
          change={safeMetrics.conversionGrowth}
          valueFormat="number"
          variant="success"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={showGraphs}
          dataPoints={getSparklineData('conversions')}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Number of times people took the desired action after seeing your ads"
        />
        
        {/* Cost Per Click */}
        <FuturisticMetricCard
          title="Cost Per Click"
          icon={<DollarSign className="h-4 w-4" />}
          value={safeMetrics.cpc}
          prefix="$"
          valueFormat="number"
          decimals={2}
          variant="danger"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={false}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Average cost per click on your ads"
        />
        
        {/* CTR */}
        <FuturisticMetricCard
          title="CTR"
          icon={<Percent className="h-4 w-4" />}
          value={safeMetrics.ctr}
          change={safeMetrics.ctrGrowth}
          valueFormat="percentage"
          variant="warning"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={showGraphs}
          dataPoints={getSparklineData('ctr')}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Click-Through Rate - percentage of impressions that resulted in clicks"
        />
        
        {/* Link Clicks */}
        <FuturisticMetricCard
          title="Link Clicks"
          icon={<MousePointerClick className="h-4 w-4" />}
          value={safeMetrics.linkClicks}
          valueFormat="number"
          variant="info"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={false}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Number of clicks on links within your ads that led to destinations or experiences"
        />
        
        {/* Budget */}
        <FuturisticMetricCard
          title="Budget"
          icon={<Wallet className="h-4 w-4" />}
          value={safeMetrics.budget}
          valueFormat="currency"
          variant="secondary"
          loading={loading}
          refreshing={isRefreshing}
          showGraph={false}
          showPreviousPeriod={false}
          previousPeriodLabel={previousPeriodLabel}
          infoTooltip="Allocated daily budget for your Meta ad campaigns"
        />
      </div>
    </div>
  )
} 