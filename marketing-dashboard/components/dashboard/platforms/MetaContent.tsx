"use client"

import { useEffect, useState } from "react"
import { MetaConnectButton } from "./MetaConnectButton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, ArrowRight, Loader2, TrendingUp, Users, Target, DollarSign, BarChart2, LineChart, Megaphone, ArrowUp, ArrowDown } from "lucide-react"
import { MetricCard } from "@/components/metrics/MetricCard"
import { TabsContent } from "@/components/ui/tabs"
import Link from "next/link"
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

interface AdSetData {
  name: string
  daily_budget: string
  impressions: string
  clicks: string
  ctr: string
  spend: string
}

interface MetaAdsData {
  account: {
    amount_spent: string
    balance: string
    currency: string
  }
  insights: {
    spend: string
    impressions: string
    clicks: string
    ctr: string
    cpc: string
    reach: string
    frequency: string
    daily_data: Array<{
      date: string
      spend: number
      impressions: number
      clicks: number
    }>
  }
  campaigns: Array<{
    name: string
    objective: string
    status: string
    budget_remaining: string
    performance: {
      spend: string
      impressions: string
      clicks: string
      ctr: string
    }
  }>
  adsets: Array<AdSetData>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

// Add this className for consistent dark styling
const darkCardClass = "bg-black text-white"

function MetricSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-8 w-[200px]" />
    </div>
  )
}

export function MetaContent() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [metaData, setMetaData] = useState<MetaAdsData | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_URL}/api/meta/status`, {
          credentials: 'include' // Important for cookies
        })
        const data = await response.json()
        setIsConnected(data.isConnected)
        
        if (data.isConnected) {
          // Fetch Meta Ads data if connected
          const adsResponse = await fetch(`${API_URL}/api/meta/ads`, {
            credentials: 'include'
          })
          const adsData = await adsResponse.json()
          setMetaData(adsData)
        }
      } catch (error) {
        console.error('Error checking Meta connection:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkConnection()
  }, [])

  const getPerformanceColor = (value: number, threshold: number) => {
    return value >= threshold ? "text-green-500" : "text-red-500"
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <MetricSkeleton />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Meta Ads is not connected.{" "}
            <Link href="/settings" className="font-medium underline">
              Go to settings
            </Link>
            {" "}to connect your Meta Ads account.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!metaData) return <div className="text-center py-8">No Meta Ads data available</div>

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Ad Spend"
          value={parseFloat(metaData.insights?.spend || "0")}
          change={10}
          prefix="$"
          valueFormat="currency"
          platform="meta"
          data={metaData.insights?.daily_data.map(day => ({
            date: day.date,
            value: day.spend,
            comparisonValue: day.clicks
          })) || []}
          className={darkCardClass}
        />
        <MetricCard
          title="Total Impressions"
          value={parseFloat(metaData.insights?.impressions || "0")}
          change={0}
          valueFormat="number"
          platform="meta"
          data={[]}
          className={darkCardClass}
        />
        <MetricCard
          title="Total Clicks"
          value={parseFloat(metaData.insights?.clicks || "0")}
          change={0}
          valueFormat="number"
          platform="meta"
          data={[]}
          className={darkCardClass}
        />
        <MetricCard
          title="Click-Through Rate"
          value={parseFloat(metaData.insights?.ctr || "0") * 100}
          change={0}
          suffix="%"
          valueFormat="percentage"
          platform="meta"
          data={[]}
          className={darkCardClass}
        />
      </div>

      {/* Performance Trends */}
      <Card className={darkCardClass}>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
          <CardDescription className="text-gray-400">30-day performance metrics</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={metaData.insights?.daily_data || []}>
              <XAxis dataKey="date" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip contentStyle={{ backgroundColor: 'black', border: '1px solid white' }} />
              <Line type="monotone" dataKey="spend" stroke="#8884d8" />
              <Line type="monotone" dataKey="clicks" stroke="#82ca9d" />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Performance */}
      <Card className={darkCardClass}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {metaData.campaigns?.map((campaign, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-gray-500">
                      Objective: {campaign.objective}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-sm ${
                    campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status}
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Spend</div>
                    <div className="font-medium">
                      ${parseFloat(campaign.performance?.spend || "0").toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Impressions</div>
                    <div className="font-medium">
                      {parseInt(campaign.performance?.impressions || "0").toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Clicks</div>
                    <div className="font-medium">
                      {parseInt(campaign.performance?.clicks || "0").toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">CTR</div>
                    <div className="font-medium">
                      {parseFloat(campaign.performance?.ctr || "0").toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                <Progress 
                  value={parseFloat(campaign.performance?.ctr || "0")} 
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ad Set Performance */}
      <Card className={darkCardClass}>
        <CardHeader>
          <CardTitle>Ad Set Performance</CardTitle>
          <CardDescription className="text-gray-400">Performance metrics by ad set</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metaData.adsets?.map((adset, index) => (
              <div key={index} className="flex items-center justify-between border-b pb-4">
                <div className="space-y-1">
                  <div className="font-medium">{adset.name}</div>
                  <div className="text-sm text-gray-500">
                    Daily Budget: ${parseFloat(adset.daily_budget || "0").toFixed(2)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-right">
                    <div className="text-gray-500">Impressions</div>
                    <div className="font-medium">
                      {parseInt(adset.impressions || "0").toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">Clicks</div>
                    <div className="font-medium">
                      {parseInt(adset.clicks || "0").toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500">CTR</div>
                    <div className="font-medium">
                      {parseFloat(adset.ctr || "0").toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

