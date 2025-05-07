"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, HelpCircle } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'

interface MetricExplanationProps {
  brandId: string
  metricName: string
  metricValue: number
  metricChange: number
  historicalData?: any[]
}

export function MetricExplanation({ 
  brandId, 
  metricName, 
  metricValue, 
  metricChange,
  historicalData
}: MetricExplanationProps) {
  const [explanation, setExplanation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  const fetchExplanation = async () => {
    if (!brandId) return
    
    setIsLoading(true)
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          metric: {
            name: metricName,
            value: metricValue,
            change: metricChange
          },
          historicalData
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch explanation')
      }
      
      const data = await response.json()
      setExplanation(data.explanation)
    } catch (error) {
      console.error('Error fetching metric explanation:', error)
      
      // Check if it's an abort error (timeout)
      if (error instanceof DOMException && error.name === 'AbortError') {
        setExplanation(`${metricName} is ${metricValue} with a ${metricChange}% change. Analysis timed out.`)
      } else {
        setExplanation(`Unable to analyze ${metricName} at this time. Please try again later.`)
        toast.error('Failed to generate explanation. Please try again later.')
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    
    if (open && !explanation && !isLoading) {
      fetchExplanation()
    }
  }
  
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 rounded-full p-0 text-gray-400 hover:bg-gray-800 hover:text-gray-300"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Explain {metricName}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 bg-gray-900 border-gray-800 text-gray-200">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">About {metricName}</h4>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-gray-400" />
              <p className="text-xs text-gray-400">Analyzing...</p>
            </div>
          ) : explanation ? (
            <p className="text-xs text-gray-300">{explanation}</p>
          ) : (
            <p className="text-xs text-gray-400">Unable to generate explanation.</p>
          )}
          
          <div className="pt-2 flex justify-end">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 px-2"
              onClick={() => {
                setExplanation(null)
                fetchExplanation()
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Refreshing...
                </>
              ) : (
                'Refresh'
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 