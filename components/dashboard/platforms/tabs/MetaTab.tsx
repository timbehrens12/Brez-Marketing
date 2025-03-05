"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Metrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { useState, useEffect } from "react"
import { DollarSign, TrendingUp, Target, MousePointer, BarChart2 } from "lucide-react"

interface MetaTabProps {
  dateRange: DateRange | undefined
  metrics: any
  isLoading: boolean
  isRefreshingData?: boolean
  brandId: string
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
      <Card className="bg-[#111111] border-[#222222]">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-400" />
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
                <div className="bg-gray-800 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Budget</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${data.budget?.toFixed(2) || "N/A"}` : "N/A"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-gray-800 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Amount Spent</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${data.adSpend?.toFixed(2) || "0.00"}` : "$0.00"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-gray-800 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Purchase ROAS</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `${data.roas?.toFixed(2) || "0.00"}x` : "0.00x"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-gray-800 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Purchase Conversion Value</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${(data.roas * data.adSpend)?.toFixed(2) || "0.00"}` : "$0.00"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-gray-800 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Results</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? data.conversions || "0" : "0"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-gray-800 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">Cost Per Result</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${data.costPerResult?.toFixed(2) || "0.00"}` : "$0.00"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-gray-800 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">CPC (all)</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${data.cpc?.toFixed(2) || "0.00"}` : "$0.00"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-gray-800 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">CPC (link click)</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `$${data.cpcLink?.toFixed(2) || data.cpc?.toFixed(2) || "0.00"}` : "$0.00"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-gray-800 w-2 h-2 rounded-full mt-2 mr-2"></div>
                <div>
                  <div className="text-white font-medium">CTR</div>
                  <div className="text-gray-400 text-sm">
                    {hasData ? `${data.ctr?.toFixed(2) || "0.00"}%` : "0.00%"}
                  </div>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-gray-800 w-2 h-2 rounded-full mt-2 mr-2"></div>
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