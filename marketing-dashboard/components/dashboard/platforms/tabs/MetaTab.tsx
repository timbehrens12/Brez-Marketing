"use client"

import { MetricCard } from "@/components/metrics/MetricCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { MetaMetrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { DollarSign, Target, TrendingUp, MousePointer, Share2, Zap } from "lucide-react"

interface MetaTabProps {
  metrics: MetaMetrics
  dateRange: DateRange | undefined
  isLoading: boolean
}

export function MetaTab({ metrics, dateRange, isLoading }: MetaTabProps) {
  const hasData = metrics && Object.keys(metrics).length > 0

  return (
    <div className="space-y-8">
      {/* Main metrics grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Ad Spend"
          value={hasData ? metrics.adSpend : 0}
          change={hasData ? metrics.adSpendGrowth : 0}
          icon={<DollarSign className="h-4 w-4" />}
          prefix="$"
          valueFormat="currency"
          platform="meta"
          data={hasData ? metrics.dailyData : []}
        />
        <MetricCard
          title="ROAS"
          value={hasData ? metrics.roas : 0}
          change={hasData ? metrics.roasGrowth : 0}
          icon={<TrendingUp className="h-4 w-4" />}
          suffix="x"
          valueFormat="number"
          platform="meta"
          data={hasData ? metrics.dailyData : []}
        />
        <MetricCard
          title="Impressions"
          value={hasData ? metrics.impressions : 0}
          change={hasData ? metrics.impressionGrowth : 0}
          icon={<Share2 className="h-4 w-4" />}
          valueFormat="number"
          platform="meta"
          data={hasData ? metrics.dailyData : []}
        />
        <MetricCard
          title="CTR"
          value={hasData ? metrics.ctr : 0}
          change={hasData ? metrics.ctrGrowth : 0}
          icon={<MousePointer className="h-4 w-4" />}
          suffix="%"
          valueFormat="number"
          platform="meta"
          data={hasData ? metrics.dailyData : []}
        />
      </div>

      {/* Performance charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-[#111111] border-[#222222]">
          <CardHeader>
            <CardTitle className="text-white">Spend & ROAS Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hasData ? metrics.dailyData : []}>
                  <XAxis dataKey="date" stroke="#888888" />
                  <YAxis stroke="#888888" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="spend"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="roas"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111111] border-[#222222]">
          <CardHeader>
            <CardTitle className="text-white">Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hasData ? metrics.dailyData : []}>
                  <XAxis dataKey="date" stroke="#888888" />
                  <YAxis stroke="#888888" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversions"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Clicks"
          value={hasData ? metrics.clicks : 0}
          change={hasData ? metrics.clickGrowth : 0}
          icon={<MousePointer className="h-4 w-4" />}
          valueFormat="number"
          platform="meta"
          data={hasData ? metrics.dailyData : []}
        />
        <MetricCard
          title="Conversions"
          value={hasData ? metrics.conversions : 0}
          change={hasData ? metrics.conversionGrowth : 0}
          icon={<Target className="h-4 w-4" />}
          valueFormat="number"
          platform="meta"
          data={hasData ? metrics.dailyData : []}
        />
        <MetricCard
          title="Cost Per Result"
          value={hasData ? metrics.costPerResult : 0}
          change={hasData ? metrics.cprGrowth : 0}
          icon={<Zap className="h-4 w-4" />}
          prefix="$"
          valueFormat="currency"
          platform="meta"
          data={hasData ? metrics.dailyData : []}
        />
      </div>
    </div>
  )
}