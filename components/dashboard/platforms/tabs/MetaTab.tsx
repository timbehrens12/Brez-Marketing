"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Metrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts'
import { 
  DollarSign, 
  TrendingUp, 
  MousePointer, 
  Activity, 
  Users, 
  BarChart2, 
  ArrowRight, 
  CalendarRange, 
  Percent, 
  BrainCircuit, 
  Info, 
  Loader2
} from "lucide-react"
import { MetricCard } from "@/components/metrics/MetricCard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrencyCompact, formatNumberCompact, formatPercentage } from "@/lib/formatters"
import Image from "next/image"
import { AlertBox } from "@/components/ui/alert-box"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MetaTabProps {
  dateRange: DateRange | undefined
  metrics: any
  isLoading: boolean
  isRefreshingData?: boolean
  initialDataLoad?: boolean
  brandId: string
}

interface DailyDataItem {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  roas: number;
  value?: number;
  [key: string]: string | number | undefined;
}

export function MetaTab({ 
  dateRange, 
  metrics, 
  isLoading, 
  isRefreshingData = false, 
  initialDataLoad = false, 
  brandId 
}: MetaTabProps) {
  const [metaData, setMetaData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiInsights, setAiInsights] = useState<string | null>(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<string>("7d")
  const [topCampaigns, setTopCampaigns] = useState<any[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true)
  const [useTestData, setUseTestData] = useState<boolean>(true)

  useEffect(() => {
    async function fetchMetaData() {
      if (!brandId) return
      
      setLoading(true)
      setError(null)
      
      try {
        console.log(`Fetching Meta ${useTestData ? 'test' : ''} data for brand: ${brandId}`)
        const endpoint = useTestData ? `/api/metrics/meta-test?brandId=${brandId}` : `/api/metrics/meta?brandId=${brandId}`
        
        const response = await fetch(endpoint)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to fetch Meta data: Status ${response.status}, Response: ${errorText}`)
          throw new Error(`Failed to fetch Meta data: ${response.status} ${errorText}`)
        }
        
        const data = await response.json()
        console.log(`Successfully fetched Meta ${useTestData ? 'test' : ''} data:`, data)
        
        if (!data || Object.keys(data).length === 0) {
          console.warn('Empty data response from API')
          setMetaData(null)
        } else {
          // Make sure dailyData is always an array
          if (!data.dailyData || !Array.isArray(data.dailyData)) {
            console.warn('dailyData is missing or not an array, setting default empty array')
            data.dailyData = []
          }
          
          // Ensure all metrics have at least default values
          const processedData = {
            adSpend: data.adSpend ?? 0,
            adSpendGrowth: data.adSpendGrowth ?? 0,
            impressions: data.impressions ?? 0,
            impressionGrowth: data.impressionGrowth ?? 0,
            clicks: data.clicks ?? 0,
            clickGrowth: data.clickGrowth ?? 0,
            conversions: data.conversions ?? 0,
            conversionGrowth: data.conversionGrowth ?? 0,
            ctr: data.ctr ?? 0,
            ctrGrowth: data.ctrGrowth ?? 0,
            cpc: data.cpc ?? 0,
            cpcLink: data.cpcLink ?? 0,
            costPerResult: data.costPerResult ?? 0,
            cprGrowth: data.cprGrowth ?? 0,
            roas: data.roas ?? 2.5,
            roasGrowth: data.roasGrowth ?? 0,
            frequency: data.frequency ?? 0,
            budget: data.budget ?? 0,
            reach: data.reach ?? 0,
            dailyData: data.dailyData
          }
          
          console.log('Processed Meta data:', processedData)
          setMetaData(processedData)
        }
      } catch (err) {
        console.error("Error fetching Meta data:", err)
        setError(err instanceof Error ? err.message : "Failed to load Meta data")
      } finally {
        setLoading(false)
      }
    }
    
    async function fetchCampaigns() {
      if (!brandId) return
      
      setIsLoadingCampaigns(true)
      try {
        console.log(`Fetching Meta ${useTestData ? 'test' : ''} campaigns for brand: ${brandId}`)
        const endpoint = useTestData 
          ? `/api/analytics/meta-test/campaigns?brandId=${brandId}` 
          : `/api/analytics/meta/campaigns?brandId=${brandId}`
          
        const response = await fetch(endpoint)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to fetch campaigns: Status ${response.status}, Response: ${errorText}`)
          throw new Error(`Failed to fetch campaigns: ${response.status} ${errorText}`)
        }
        
        const data = await response.json()
        console.log(`Successfully fetched Meta ${useTestData ? 'test' : ''} campaigns:`, data)
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        if (data.campaigns && data.campaigns.length > 0) {
          // Sort by ROAS and get top 5
          const sortedCampaigns = [...data.campaigns].sort((a, b) => b.roas - a.roas).slice(0, 5)
          setTopCampaigns(sortedCampaigns)
        } else {
          console.warn('No campaigns found in API response')
          setTopCampaigns([])
        }
      } catch (err) {
        console.error("Error fetching Meta campaigns:", err)
      } finally {
        setIsLoadingCampaigns(false)
      }
    }
    
    fetchMetaData()
    fetchCampaigns()
  }, [brandId, dateRange, useTestData])

  const generateAiInsights = async () => {
    setIsLoadingInsights(true)
    try {
      const data = metrics || metaData || {}
      
      // We would call an AI endpoint here
      // This is a simulated response for now
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const spendTrend = (data.adSpendGrowth || 0) > 0 ? "increased" : "decreased"
      const roasTrend = (data.roasGrowth || 0) > 0 ? "improved" : "declined"
      
      setAiInsights(`Your Meta ad spend has ${spendTrend} by ${Math.abs(data.adSpendGrowth || 0).toFixed(1)}% while your ROAS has ${roasTrend} by ${Math.abs(data.roasGrowth || 0).toFixed(1)}%. Based on your campaign performance, you could improve results by optimizing your targeting for the audiences that generate the highest conversion rates. Consider testing different creative formats, especially video content which is currently performing well on the platform.`)
    } catch (error) {
      console.error("Error generating AI insights:", error)
      setAiInsights("Unable to generate insights at this time. Please try again later.")
    } finally {
      setIsLoadingInsights(false)
    }
  }

  // Use either the passed metrics or the fetched data
  const data = metrics || metaData || {}
  const hasData = data && Object.keys(data).length > 0 && data.adSpend > 0

  // Show a loading spinner when initialDataLoad is true
  if (initialDataLoad) {
    return (
      <div className="flex items-center justify-center p-12">
        <Activity className="h-8 w-8 animate-spin text-blue-500 mr-3" />
        <span className="text-gray-300">Loading Meta Ads data...</span>
      </div>
    )
  }

  // Transform daily data for the line chart
  const getDailyTrendData = () => {
    const dailyData = data?.dailyData || [];
    
    if (!dailyData || dailyData.length === 0) {
      console.warn('No daily data available for trend chart')
      return []
    }
    
    console.log(`Processing ${dailyData.length} daily data items for trend chart`)
    
    // Filter based on selected time frame
    let filteredData = [...dailyData]
    
    if (selectedTimeFrame === "7d") {
      filteredData = filteredData.slice(0, 7)
    } else if (selectedTimeFrame === "30d") {
      filteredData = filteredData.slice(0, 30)
    } else if (selectedTimeFrame === "90d") {
      filteredData = filteredData.slice(0, 90)
    }
    
    const result = filteredData.map((item: DailyDataItem) => {
      // Make sure date is a string
      const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown';
      
      return {
        date: dateStr,
        spend: Number(item.spend || 0),
        roas: Number(item.roas || 0)
      }
    }).reverse(); // Reverse to show oldest to newest
    
    console.log('Processed trend data:', result)
    return result
  }

  return (
    <div className="space-y-6">
      {/* Test Mode Switch */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Real Data</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={useTestData}
              onChange={() => setUseTestData(!useTestData)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-sm text-gray-400">Test Data</span>
        </div>
      </div>

      {/* Meta Connection Status Banner */}
      {hasData ? (
        <AlertBox
          type="info"
          title="Meta Ads Connected"
          icon={<Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={18} 
                  height={18} 
                  className="object-contain"
          />}
          className="bg-blue-950/20 border-blue-800/30"
        >
          <p className="text-sm">
            {useTestData 
              ? "Using test data for Meta Ads. This data is simulated for demonstration purposes."
              : "Your Meta advertising account is connected and data is being synchronized daily."}
          </p>
        </AlertBox>
      ) : (
        <AlertBox
          type="warning"
          title="Limited Meta Ads Data"
          icon={<Info className="h-4 w-4 text-amber-400" />}
          className="bg-amber-950/20 border-amber-800/30"
        >
          <p className="text-sm">
            {useTestData 
              ? "No test data available. Please make sure you've set up the test tables in Supabase." 
              : "We're not seeing much Meta Ads data for your account. Make sure your account is correctly connected and that you have active ad campaigns."}
          </p>
          {!useTestData && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-amber-900/30 border-amber-700/30 hover:bg-amber-800/30"
                onClick={() => setUseTestData(true)}
              >
                Switch to Test Data
              </Button>
            </div>
          )}
        </AlertBox>
      )}

      {/* Key Performance Metrics */}
      <div>
        <h2 className="text-lg font-medium mb-3 flex items-center">
          <Activity className="mr-2 h-5 w-5 text-blue-400" />
          Key Performance Metrics
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-blue-400" />
              <span className="ml-0.5">Ad Spend</span>
            </div>
          }
          value={data.adSpend || 0}
          change={data.adSpendGrowth || 0}
          prefix="$"
          valueFormat="currency"
            data={data.dailyData?.map((d: DailyDataItem) => ({ ...d, value: d.spend })) || []}
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
          dateRange={dateRange}
          infoTooltip="Total amount spent on Meta ads in the selected period"
          brandId={brandId}
        />
        <MetricCard
          title={
            <div className="flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="ml-0.5">ROAS</span>
              </div>
            }
            value={data.roas || 0}
            change={data.roasGrowth || 0}
            suffix="x"
            data={data.dailyData?.map((d: DailyDataItem) => ({ ...d, value: d.roas })) || []}
            loading={loading}
            refreshing={isRefreshingData}
            platform="meta"
            dateRange={dateRange}
            infoTooltip="Return on Ad Spend - revenue generated per dollar spent on ads"
            brandId={brandId}
          />
          <MetricCard
            title={
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-400" />
              <span className="ml-0.5">Impressions</span>
            </div>
          }
          value={data.impressions || 0}
          change={data.impressionGrowth || 0}
          data={data.dailyData?.map((d: DailyDataItem) => ({ ...d, value: d.impressions })) || []}
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
          dateRange={dateRange}
          infoTooltip="Number of times your ads were displayed to users"
          brandId={brandId}
        />
        <MetricCard
          title={
            <div className="flex items-center gap-1.5">
                <MousePointer className="h-4 w-4 text-blue-400" />
              <span className="ml-0.5">Clicks</span>
            </div>
          }
          value={data.clicks || 0}
          change={data.clickGrowth || 0}
          data={data.dailyData?.map((d: DailyDataItem) => ({ ...d, value: d.clicks })) || []}
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
          dateRange={dateRange}
          infoTooltip="Number of clicks on your ads"
          brandId={brandId}
        />
        </div>
      </div>
      
      {/* Detailed Performance Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Spend & ROAS Trends */}
        <Card className="bg-[#111] border-[#333] shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Spend & ROAS Trends
              </CardTitle>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-6 text-xs px-2 ${selectedTimeFrame === '7d' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400'}`}
                  onClick={() => setSelectedTimeFrame('7d')}
                >
                  7D
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-6 text-xs px-2 ${selectedTimeFrame === '30d' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400'}`}
                  onClick={() => setSelectedTimeFrame('30d')}
                >
                  30D
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-6 text-xs px-2 ${selectedTimeFrame === '90d' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400'}`}
                  onClick={() => setSelectedTimeFrame('90d')}
                >
                  90D
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[240px] w-full">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : hasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getDailyTrendData()} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis yAxisId="left" stroke="#8884d8" tickFormatter={(value) => `$${value}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: '#222', 
                        border: '1px solid #444',
                        borderRadius: '4px',
                        color: '#fff'
                      }} 
                      formatter={(value: any, name: string) => {
                        if (name === 'spend') return [`$${(value || 0).toFixed(2)}`, 'Spend'];
                        if (name === 'roas') return [`${(value || 0).toFixed(2)}x`, 'ROAS'];
                        return [value || 0, name];
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="spend" 
                      stroke="#8884d8" 
                      name="Spend" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5, stroke: '#8884d8', strokeWidth: 2 }}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="roas" 
                      stroke="#82ca9d" 
                      name="ROAS" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5, stroke: '#82ca9d', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No trend data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Performance Metrics */}
        <Card className="bg-[#111] border-[#333] shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-400" />
              Additional Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">CTR</span>
                    <span className="text-xs flex items-center">
                      {(data.ctrGrowth || 0) > 0 ? (
                        <span className="text-green-400 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{(data.ctrGrowth || 0).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1 transform rotate-180" />
                          {(data.ctrGrowth || 0).toFixed(1)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-baseline mt-1">
                    <span className="text-xl font-semibold">{((data.ctr || 0)).toFixed(2)}</span>
                    <span className="text-gray-400 ml-1">%</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">CPC</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <Info className="h-3 w-3 text-gray-500" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#222] border-[#444] text-xs">
                          Average Cost Per Click
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-baseline mt-1">
                    <span className="text-xl font-semibold">${((data.cpc || 0)).toFixed(2)}</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Conversions</span>
                  </div>
                  <div className="flex items-baseline mt-1">
                    <span className="text-xl font-semibold">{data.conversions || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Frequency</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <Info className="h-3 w-3 text-gray-500" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="bg-[#222] border-[#444] text-xs">
                          Average number of times each person saw your ad
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-baseline mt-1">
                    <span className="text-xl font-semibold">{((data.frequency || 0)).toFixed(1)}</span>
                    <span className="text-gray-400 ml-1">times</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Reach</span>
                  </div>
                  <div className="flex items-baseline mt-1">
                    <span className="text-xl font-semibold">{formatNumberCompact(data.reach || 0)}</span>
                    <span className="text-gray-400 ml-1">people</span>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Cost Per Result</span>
                  </div>
                  <div className="flex items-baseline mt-1">
                    <span className="text-xl font-semibold">${((data.costPerResult || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Top Campaigns & AI Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Campaigns */}
        <Card className="bg-[#111] border-[#333] shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-400" />
              Top Performing Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCampaigns ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : topCampaigns.length > 0 ? (
              <div className="space-y-3">
                {topCampaigns.map((campaign, index) => (
                  <div key={campaign.id} className="flex items-center justify-between py-2 border-b border-[#222] last:border-0">
                    <div className="flex items-center">
                      <div className="bg-blue-500/20 text-blue-400 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[180px]">{campaign.campaign_name}</p>
                        <p className="text-xs text-gray-400">${(campaign.spend || 0).toFixed(2)} spent</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{(campaign.roas || 0).toFixed(1)}x</p>
                      <p className="text-xs text-gray-400">ROAS</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className="text-gray-500 text-sm">No campaign data available</p>
              </div>
            )}
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full bg-[#1a1a1a] hover:bg-[#222] border-[#333]"
                onClick={() => window.location.href = "/analytics"}
              >
                View All Campaigns
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* AI Insights */}
        <Card className="bg-[#111] border-[#333] shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-indigo-400" />
              AI Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingInsights ? (
              <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                <p className="text-sm text-gray-400">Generating insights...</p>
              </div>
            ) : aiInsights ? (
              <div className="space-y-4">
                <p className="text-sm">{aiInsights}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-[#1a1a1a] hover:bg-[#222] border-[#333]"
                  onClick={generateAiInsights}
                >
                  Refresh Insights
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                <BrainCircuit className="h-6 w-6 text-indigo-400" />
                <p className="text-sm text-gray-400">Generate AI insights about your Meta Ads performance</p>
                <Button 
                  variant="outline" 
                  className="bg-indigo-900/30 border-indigo-600/30 hover:bg-indigo-900/50 text-indigo-300"
                  onClick={generateAiInsights}
                >
                  Generate Insights
                  <BrainCircuit className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Actionable Recommendations */}
      <Card className="bg-[#111] border-[#333] shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            Optimize Your Meta Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-full bg-blue-900/40 p-1.5">
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <h3 className="font-medium text-sm">Audience Targeting</h3>
              </div>
              <p className="text-xs text-gray-400">Create lookalike audiences based on your high-value customers to improve conversion rates.</p>
            </div>
            
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-full bg-green-900/40 p-1.5">
                  <DollarSign className="h-4 w-4 text-green-400" />
                </div>
                <h3 className="font-medium text-sm">Budget Optimization</h3>
              </div>
              <p className="text-xs text-gray-400">Shift budget from underperforming campaigns to your top performers to maximize ROAS.</p>
            </div>
            
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="rounded-full bg-amber-900/40 p-1.5">
                  <BarChart2 className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="font-medium text-sm">Ad Creative</h3>
              </div>
              <p className="text-xs text-gray-400">Test different ad formats, including video content which typically outperforms static images.</p>
            </div>
      </div>
        </CardContent>
      </Card>
    </div>
  )
}
