'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

// Helper function to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

interface TotalBudgetWidgetProps {
  brandId: string
}

export function TotalBudgetWidget({ brandId }: TotalBudgetWidgetProps) {
  const [totalBudget, setTotalBudget] = useState<number | null>(null)
  const [dailyBudget, setDailyBudget] = useState<number | null>(null)
  const [lifetimeBudget, setLifetimeBudget] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [adSetCount, setAdSetCount] = useState(0)

  const fetchTotalBudget = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/meta/total-budget?brandId=${brandId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch total budget')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setTotalBudget(data.totalBudget)
        setDailyBudget(data.totalDailyBudget)
        setLifetimeBudget(data.totalLifetimeBudget)
        setAdSetCount(data.adSetCount)
        setLastUpdated(new Date())
      } else {
        throw new Error(data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error fetching total budget:', error)
      toast.error('Failed to fetch total budget')
    } finally {
      setIsLoading(false)
    }
  }
  
  // Fetch on initial load
  useEffect(() => {
    if (brandId) {
      fetchTotalBudget()
      
      // Set up auto-refresh every 5 minutes
      const intervalId = setInterval(() => {
        fetchTotalBudget()
      }, 5 * 60 * 1000)
      
      // Clean up on unmount
      return () => clearInterval(intervalId)
    }
  }, [brandId])
  
  const handleRefresh = () => {
    fetchTotalBudget()
  }
  
  // Format time ago for last updated timestamp
  const getTimeAgo = () => {
    if (!lastUpdated) return 'Never'
    
    const now = new Date()
    const diffMs = now.getTime() - lastUpdated.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    
    if (diffSec < 60) return `${diffSec} sec ago`
    if (diffMin < 60) return `${diffMin} min ago`
    return `${diffHour} hr ago`
  }
  
  return (
    <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#222] overflow-hidden border border-[#333]">
      <CardHeader className="space-y-0 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-white">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-5 w-5 text-green-500" />
            <span>Total Meta Ads Budget</span>
          </div>
        </CardTitle>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh budget data (Last updated: {getTimeAgo()})</p>
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className="text-3xl font-bold text-white">
              {isLoading ? 
                <div className="h-9 w-32 animate-pulse bg-gray-700/30 rounded"></div> :
                formatCurrency(totalBudget || 0)
              }
            </span>
          </div>
          
          <div className="text-xs text-gray-400 mt-1 space-y-1">
            {!isLoading && (
              <>
                <div>
                  <span className="font-medium text-gray-300">{formatCurrency(dailyBudget || 0)}</span> daily budget
                  {dailyBudget && dailyBudget > 0 && <span className="text-gray-500"> · {dailyBudget > 0 ? Math.round(dailyBudget / totalBudget! * 100) : 0}%</span>}
                </div>
                {lifetimeBudget && lifetimeBudget > 0 && (
                  <div>
                    <span className="font-medium text-gray-300">{formatCurrency(lifetimeBudget)}</span> lifetime budget
                    <span className="text-gray-500"> · {lifetimeBudget > 0 ? Math.round(lifetimeBudget / totalBudget! * 100) : 0}%</span>
                  </div>
                )}
                <div>
                  Across {adSetCount} active ad sets
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 