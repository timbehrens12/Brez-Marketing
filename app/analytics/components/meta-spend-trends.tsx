'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Area, AreaChart, ComposedChart, Bar } from 'recharts'
import { TrendingUp, DollarSign, PieChart, Info, BarChart, ArrowRightLeft } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Badge } from '@/components/ui/badge'

export default function MetaSpendTrends({ brandId }: { brandId: string }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState({
    spendChange: 0,
    roasChange: 0,
    currentSpend: 0,
    previousSpend: 0,
    currentRoas: 0,
    previousRoas: 0,
    totalSpend: 0,
    averageRoas: 0,
    profitableSpend: 0,
    unprofitableSpend: 0,
    profitability: 0,
    trendDirection: 'neutral',
    totalRevenue: 0,
    profit: 0
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/metrics/meta?brandId=${brandId}`)
        const result = await response.json()
        
        if (result.error) {
          throw new Error(result.error)
        }
        
        // Format the data for the chart
        const formattedData = (result.dailyData || []).map((item: any) => ({
          ...item,
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: item.spend > 0 ? item.roas * item.spend : 0,
          profit: item.spend > 0 ? (item.roas * item.spend) - item.spend : 0
        }));
        
        setData(formattedData)
        
        // Calculate advanced metrics if we have enough data
        if (result.dailyData && result.dailyData.length >= 2) {
          const currentData = result.dailyData.slice(-1)[0];
          const previousData = result.dailyData.slice(-2)[0];
          
          // Calculate total spend and average ROAS
          const totalSpend = result.dailyData.reduce((total: number, day: any) => total + (day.spend || 0), 0);
          const weightedRoasSum = result.dailyData.reduce((total: number, day: any) => 
            total + ((day.roas || 0) * (day.spend || 0)), 0);
          const averageRoas = totalSpend > 0 ? weightedRoasSum / totalSpend : 0;
          const totalRevenue = totalSpend * averageRoas;
          const profit = totalRevenue - totalSpend;
          
          // Calculate profitable vs unprofitable spend
          const profitableSpend = result.dailyData
            .filter((day: any) => day.roas >= 1)
            .reduce((total: number, day: any) => total + (day.spend || 0), 0);
          
          const unprofitableSpend = totalSpend - profitableSpend;
          const profitability = totalSpend > 0 ? (profitableSpend / totalSpend) * 100 : 0;
          
          // Calculate trend direction based on the last 3 days
          let trendDirection = 'neutral';
          if (result.dailyData.length >= 3) {
            const last3Days = result.dailyData.slice(-3);
            const roasTrend = last3Days[2].roas - last3Days[0].roas;
            trendDirection = roasTrend > 0.2 ? 'improving' : roasTrend < -0.2 ? 'declining' : 'stable';
          }
          
          if (currentData && previousData) {
            const spendChange = previousData.spend > 0 
              ? ((currentData.spend - previousData.spend) / previousData.spend) * 100 
              : 0;
              
            const roasChange = previousData.roas > 0 
              ? ((currentData.roas - previousData.roas) / previousData.roas) * 100 
              : 0;
              
            setMetrics({
              spendChange,
              roasChange,
              currentSpend: currentData.spend,
              previousSpend: previousData.spend,
              currentRoas: currentData.roas,
              previousRoas: previousData.roas,
              totalSpend,
              averageRoas,
              profitableSpend,
              unprofitableSpend,
              profitability,
              trendDirection,
              totalRevenue,
              profit
            });
          }
        }
      } catch (err) {
        console.error('Error fetching Meta trends:', err)
        setError('Failed to load Meta spend trends data')
      } finally {
        setLoading(false)
      }
    }

    if (brandId) {
      fetchData()
    }
  }, [brandId])

  const renderAlertBadge = () => {
    if (metrics.trendDirection === 'improving') {
      return <Badge className="bg-green-500/20 hover:bg-green-500/20 text-green-400 border-green-500/30">ROAS Improving</Badge>
    } else if (metrics.trendDirection === 'declining') {
      return <Badge className="bg-red-500/20 hover:bg-red-500/20 text-red-400 border-red-500/30">ROAS Declining</Badge>
    } else {
      return <Badge className="bg-blue-500/20 hover:bg-blue-500/20 text-blue-400 border-blue-500/30">ROAS Stable</Badge>
    }
  }

  if (loading) {
    return (
      <Card className="bg-[#111] border-[#333] shadow-lg">
        <CardContent className="pt-6 flex items-center justify-center h-[350px]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-6 w-32 bg-[#222] rounded mb-4"></div>
            <div className="h-40 w-full bg-[#222] rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-[#111] border-[#333] shadow-lg">
        <CardContent className="pt-6 text-red-500 flex items-center justify-center h-[350px]">
          {error}
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="bg-[#111] border-[#333] shadow-lg">
        <CardContent className="pt-6 text-gray-400 flex items-center justify-center h-[350px]">
          No Meta spend trends data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#111] border-[#333] shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <BarChart className="h-5 w-5 text-blue-400" />
            Ad Performance Metrics
          </CardTitle>
          <div className="flex items-center gap-2">
            {renderAlertBadge()}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-gray-400 cursor-help">
                    <Info className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#1a1a1a] border-[#333] p-3 max-w-xs">
                  <p className="text-xs">
                    <span className="font-medium text-white">Spend Efficiency:</span> {metrics.profitability.toFixed(1)}% of your ad spend is profitable (ROAS ≥ 1.0)
                  </p>
                  <div className="h-1.5 bg-[#333] w-full mt-1.5 mb-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${metrics.profitability}%` }}
                    ></div>
                  </div>
                  <p className="text-xs mt-2">
                    <span className="text-green-400">Profitable spend:</span> ${Math.round(metrics.profitableSpend)}
                    <br />
                    <span className="text-red-400">Unprofitable spend:</span> ${Math.round(metrics.unprofitableSpend)}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-3 mt-3 mb-1">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-3 border border-[#333] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1.5">
              <DollarSign className="h-3.5 w-3.5 text-purple-400" />
              <h3 className="text-xs font-medium text-gray-300">Ad Spend</h3>
            </div>
            <p className="text-xl font-semibold">${metrics.totalSpend.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <div className={`text-xs mt-1 ${metrics.spendChange >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {metrics.spendChange >= 0 ? '+' : ''}{metrics.spendChange.toFixed(1)}% vs prev.
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-3 border border-[#333] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1.5">
              <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" />
              <h3 className="text-xs font-medium text-gray-300">ROAS</h3>
            </div>
            <p className={`text-xl font-semibold ${metrics.averageRoas >= 1 ? 'text-blue-400' : 'text-red-400'}`}>
              {metrics.averageRoas.toFixed(2)}x
            </p>
            <div className={`text-xs mt-1 ${metrics.roasChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.roasChange >= 0 ? '+' : ''}{metrics.roasChange.toFixed(1)}% vs prev.
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-3 border border-[#333] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-green-400" />
              <h3 className="text-xs font-medium text-gray-300">Revenue</h3>
            </div>
            <p className="text-xl font-semibold">${metrics.totalRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <div className="text-xs mt-1 text-gray-400">From ad-driven sales</div>
          </div>
          
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-3 border border-[#333] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1.5">
              <PieChart className="h-3.5 w-3.5 text-amber-400" />
              <h3 className="text-xs font-medium text-gray-300">Efficiency</h3>
            </div>
            <p className="text-xl font-semibold">{metrics.profitability.toFixed(1)}%</p>
            <div className={`text-xs mt-1 ${metrics.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {metrics.profit >= 0 ? 'Profit' : 'Loss'}: ${Math.abs(metrics.profit).toLocaleString(undefined, {maximumFractionDigits: 0})}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 mb-3">
          <div className="text-xs text-gray-300 mb-2 font-medium">Daily Performance Trends</div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#7B61FF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#52A9FF" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#52A9FF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1EE0AC" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#1EE0AC" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#444' }}
              />
              <YAxis 
                yAxisId="left" 
                stroke="#7B61FF" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#444' }}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#1EE0AC"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#444' }}
                tickFormatter={(value) => `${value}x`}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a1a', 
                  border: '1px solid #333',
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  color: '#fff'
                }}
                formatter={(value, name) => {
                  if (name === 'Spend') return [`$${Number(value).toFixed(2)}`, name];
                  if (name === 'ROAS') return [`${Number(value).toFixed(2)}x`, name];
                  if (name === 'Revenue') return [`$${Number(value).toFixed(2)}`, name];
                  if (name === 'Profit/Loss') return [`$${Number(value).toFixed(2)}`, name];
                  return [value, name];
                }}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="spend" 
                name="Spend"
                stroke="#7B61FF" 
                strokeWidth={2}
                fill="url(#colorSpend)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="revenue" 
                name="Revenue"
                stroke="#52A9FF" 
                strokeWidth={2}
                fill="url(#colorRevenue)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="roas" 
                name="ROAS" 
                stroke="#1EE0AC" 
                strokeWidth={2}
                dot={{ r: 0 }}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#1EE0AC' }}
              />
              <Bar
                yAxisId="left"
                dataKey="profit"
                name="Profit/Loss"
                fill="rgba(30, 224, 172, 0.4)"
                stroke="#1EE0AC"
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
              />
              <Legend 
                wrapperStyle={{ 
                  paddingTop: '10px',
                  fontSize: '12px' 
                }}
                iconType="circle"
                iconSize={8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 