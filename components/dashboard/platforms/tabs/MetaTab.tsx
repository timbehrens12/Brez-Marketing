"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Metrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { useState, useEffect } from "react"
import { DollarSign, TrendingUp, Target, MousePointer, BarChart2, Activity, Users } from "lucide-react"
import Image from "next/image"
import { MetricCard } from "@/components/metrics/MetricCard"

interface MetaTabProps {
  dateRange: DateRange | undefined
  metrics: any
  isLoading: boolean
  isRefreshingData?: boolean
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

export function MetaTab({ dateRange, metrics, isLoading, isRefreshingData = false, brandId }: MetaTabProps) {
  const [metaData, setMetaData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetaData() {
      if (!brandId) return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/metrics/meta?brandId=${brandId}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch Meta data: ${response.status}`)
        }
        
        const data = await response.json()
        setMetaData(data)
      } catch (err) {
        console.error("Error fetching Meta data:", err)
        setError(err instanceof Error ? err.message : "Failed to load Meta data")
      } finally {
        setLoading(false)
      }
    }
    
    fetchMetaData()
  }, [brandId, dateRange])

  // Use either the passed metrics or the fetched data
  const data = metrics || metaData || {}
  const hasData = data && Object.keys(data).length > 0

  return (
    <div className="space-y-8">
      {/* Meta Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Ad Spend"
          value={data.adSpend || 0}
          change={data.adSpendGrowth || 0}
          prefix="$"
          valueFormat="currency"
          data={data.dailyData || []}
          icon={
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
            </div>
          }
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
        />
        <MetricCard
          title="Impressions"
          value={data.impressions || 0}
          change={data.impressionGrowth || 0}
          data={data.dailyData?.map((d: DailyDataItem) => ({ ...d, value: d.impressions })) || []}
          icon={
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
            </div>
          }
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
        />
        <MetricCard
          title="Clicks"
          value={data.clicks || 0}
          change={data.clickGrowth || 0}
          data={data.dailyData?.map((d: DailyDataItem) => ({ ...d, value: d.clicks })) || []}
          icon={
            <div className="flex items-center gap-1">
              <MousePointer className="h-4 w-4" />
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
            </div>
          }
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
        />
        <MetricCard
          title="ROAS"
          value={data.roas || 0}
          change={data.roasGrowth || 0}
          suffix="x"
          data={data.dailyData?.map((d: DailyDataItem) => ({ ...d, value: d.roas })) || []}
          icon={
            <div className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <div className="relative w-4 h-4">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={16} 
                  height={16} 
                  className="object-contain"
                />
              </div>
            </div>
          }
          loading={loading}
          refreshing={isRefreshingData}
          platform="meta"
        />
      </div>

      <Card className="bg-[#111111] border-[#222222]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <BarChart2 className="h-5 w-5 text-blue-400" />
              <div className="relative w-5 h-5">
                <Image 
                  src="https://i.imgur.com/6hyyRrs.png" 
                  alt="Meta logo" 
                  width={20} 
                  height={20} 
                  className="object-contain"
                />
              </div>
            </div>
            Baseline Column Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || isRefreshingData ? (
            <div className="animate-pulse space-y-4">
              {Array(10).fill(0).map((_, i) => (
                <div key={i} className="h-6 bg-gray-800 rounded w-full"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="bg-blue-500 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Budget</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${data.budget?.toFixed(2) || "N/A"}` : "N/A"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-blue-500 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Amount Spent</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${data.adSpend?.toFixed(2) || "0.00"}` : "$0.00"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-blue-500 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Purchase ROAS</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `${data.roas?.toFixed(2) || "0.00"}x` : "0.00x"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-blue-500 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Purchase Conversion Value</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${(data.roas * data.adSpend)?.toFixed(2) || "0.00"}` : "$0.00"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-blue-500 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Results</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? data.conversions || "0" : "0"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-blue-500 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Cost Per Result</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${data.costPerResult?.toFixed(2) || "0.00"}` : "$0.00"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-blue-500 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">CPC (all)</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${data.cpc?.toFixed(2) || "0.00"}` : "$0.00"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-blue-500 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">CPC (link click)</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${data.cpcLink?.toFixed(2) || data.cpc?.toFixed(2) || "0.00"}` : "$0.00"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-blue-500 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">CTR</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `${data.ctr?.toFixed(2) || "0.00"}%` : "0.00%"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-blue-500 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Frequency</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? data.frequency?.toFixed(2) || "N/A" : "N/A"}
                  </div>
                </div>
              </li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}