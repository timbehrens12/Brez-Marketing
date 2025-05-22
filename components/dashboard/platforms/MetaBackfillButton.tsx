"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { RefreshCw, Calendar } from "lucide-react"
import { toast } from "sonner"
import { format, subDays } from "date-fns"

interface MetaBackfillButtonProps {
  brandId: string
  onComplete?: () => void
  className?: string
  showIcon?: boolean
  showLabel?: boolean
  variant?: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive"
}

export function MetaBackfillButton({
  brandId,
  onComplete,
  className = "",
  showIcon = true,
  showLabel = true,
  variant = "outline"
}: MetaBackfillButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleBackfill = async () => {
    if (!brandId) {
      toast.error("No brand selected")
      return
    }

    setIsLoading(true)
    
    try {
      // Calculate yesterday's date
      const yesterday = subDays(new Date(), 1)
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
      
      // Show initial toast
      toast.loading(`Backfilling Meta data for ${yesterdayStr}...`, {
        id: "meta-backfill",
      })
      
      // Call the backfill API
      const response = await fetch('/api/meta/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          dateFrom: yesterdayStr,
          dateTo: yesterdayStr
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to backfill data')
      }
      
      toast.success(`Successfully backfilled Meta data (${data.count} records)`, {
        id: "meta-backfill",
      })
      
      // Refresh campaigns data to reflect the changes
      const campaignsResponse = await fetch(`/api/meta/campaigns?brandId=${brandId}&refresh=true&t=${Date.now()}`)
      
      if (!campaignsResponse.ok) {
        console.warn("Could not refresh campaigns data after backfill")
      }
      
      // Trigger parent completion handler if provided
      if (onComplete) {
        onComplete()
      }
      
      // Dispatch an event to notify the dashboard to refresh
      window.dispatchEvent(new CustomEvent('metaDataRefreshed', { 
        detail: { 
          brandId, 
          timestamp: Date.now(),
          forceRefresh: true,
          backfilled: true
        }
      }))
    } catch (error) {
      console.error("Error backfilling Meta data:", error)
      toast.error("Failed to backfill Meta data", {
        id: "meta-backfill",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleBackfill}
      disabled={isLoading || !brandId}
      variant={variant}
      size="sm"
      className={`${className} whitespace-nowrap flex items-center gap-2`}
    >
      {showIcon && <Calendar className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
      {showLabel && (
        <span>{isLoading ? "Backfilling..." : "Fix Yesterday's Data"}</span>
      )}
    </Button>
  )
} 