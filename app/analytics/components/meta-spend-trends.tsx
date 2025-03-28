'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Area, AreaChart, ComposedChart, Bar } from 'recharts'
import { ArrowUpRight, TrendingUp, DollarSign, PieChart, Info, ArrowDownRight, AlertCircle } from 'lucide-react'
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
    trendDirection: 'neutral'
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
              trendDirection
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
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Spend & ROAS Performance
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
        <div className="flex justify-between mt-2">
          <div className="grid grid-cols-3 gap-4 w-full">
            <div className="flex flex-col justify-center items-center p-2 rounded-md bg-[#1a1a1a] border border-[#333]">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3 w-3 text-green-400" />
                <span className="text-xs text-gray-400">Total Spend</span>
              </div>
              <span className="text-sm font-semibold">${Math.round(metrics.totalSpend)}</span>
            </div>
            <div className="flex flex-col justify-center items-center p-2 rounded-md bg-[#1a1a1a] border border-[#333]">
              <div className="flex items-center gap-1.5 mb-1">
                <PieChart className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-gray-400">Avg ROAS</span>
              </div>
              <div className="flex items-center">
                <span className={`text-sm font-semibold ${metrics.averageRoas >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                  {metrics.averageRoas.toFixed(2)}x
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-center items-center p-2 rounded-md bg-[#1a1a1a] border border-[#333]">
              <div className="flex items-center gap-1.5 mb-1">
                {metrics.roasChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-400" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-400" />
                )}
                <span className="text-xs text-gray-400">ROAS Change</span>
              </div>
              <span className={`text-sm font-semibold ${metrics.roasChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.roasChange >= 0 ? '+' : ''}{metrics.roasChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
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
              stroke="#8884d8" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#444' }}
              tickFormatter={(value) => `$${value}`}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke="#4ade80"
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
              stroke="#8884d8" 
              strokeWidth={2}
              fill="url(#colorSpend)"
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="roas" 
              name="ROAS" 
              stroke="#4ade80" 
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#4ade80' }}
            />
            <Bar
              yAxisId="left"
              dataKey="profit"
              name="Profit/Loss"
              fill="rgba(74, 222, 128, 0.4)"
              stroke="#4ade80"
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
      </CardContent>
    </Card>
  )
} 