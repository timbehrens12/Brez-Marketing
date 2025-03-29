'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCcw, Info } from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

interface MetaResyncButtonProps {
  brandId: string
  days?: number
  onSuccess?: () => void
}

export default function MetaResyncButton({ 
  brandId, 
  days = 60,
  onSuccess 
}: MetaResyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  async function handleResync() {
    if (!brandId) return
    
    setIsSyncing(true)
    const toastId = toast.loading("Starting complete Meta data resync...", {
      description: "This will clear existing data and pull fresh data from Meta API."
    })
    
    try {
      // Show informative message about what's happening
      setTimeout(() => {
        toast.loading("Clearing existing Meta data...", {
          id: toastId,
          description: "Removing cached data to prepare for fresh data"
        })
      }, 1000)
      
      const response = await fetch('/api/meta/resync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ brandId, days })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to resync Meta data: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Update toast with success message
      toast.success(`Full data resync complete!`, {
        id: toastId,
        description: `Successfully pulled ${data.count || 0} records from Meta for the last ${days} days.`
      })
      
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
        detail: { brandId, timestamp: Date.now() }
      }))
      
      // Call onSuccess callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess()
      }
      
    } catch (err) {
      console.error("Error resyncing Meta data:", err)
      toast.error("Failed to resync Meta data", {
        id: toastId,
        description: err instanceof Error ? err.message : "Please try again later."
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={handleResync} 
            disabled={isSyncing}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Full Resync
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">Complete Meta Data Resync</p>
            <p className="text-xs text-gray-400">
              This will clear all your existing Meta data for the last {days} days and pull 
              fresh data directly from the Meta API to your database. Use this if you notice 
              discrepancies between your Meta dashboard and our metrics.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 