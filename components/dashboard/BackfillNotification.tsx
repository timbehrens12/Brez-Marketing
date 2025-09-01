import React from 'react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Download, CheckCircle, Loader2, RefreshCw } from "lucide-react"
import { BackfillStatus } from "@/lib/hooks/useDataBackfill"

interface BackfillNotificationProps {
  status: BackfillStatus
  onBackfillTrigger: () => void
  className?: string
}

export function BackfillNotification({ 
  status, 
  onBackfillTrigger, 
  className 
}: BackfillNotificationProps) {
  // Don't show anything if we haven't checked for gaps yet
  if (!status.lastBackfillCheck && !status.isChecking) {
    return null
  }

  // Show checking state
  if (status.isChecking) {
    return (
      <Alert className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking Data Coverage</AlertTitle>
        <AlertDescription>
          Scanning for missing data in your dashboard...
        </AlertDescription>
      </Alert>
    )
  }

  // Show backfilling state
  if (status.isBackfilling) {
    return (
      <Alert className={className}>
        <Download className="h-4 w-4 animate-pulse" />
        <AlertTitle>Backfilling Data</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-1">
            <span>Fetching missing historical data. This may take a few minutes...</span>
            <span className="text-sm text-muted-foreground">
              Please wait while we sync your data from Meta and Shopify to fill the gaps.
            </span>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Show gaps detected - action needed
  if (status.hasGaps && status.gapsDetected > 0) {
    return (
      <Alert className={className} variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Data Gaps Detected</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Found {status.gapsDetected} data gaps totaling {status.totalMissingDays} missing days. 
            This can affect your analytics and comparisons.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onBackfillTrigger}
            className="ml-4 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Fill Missing Data
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Show successful backfill result
  if (status.backfillResults && status.backfillResults.totalRecordsBackfilled > 0) {
    return (
      <Alert className={className} variant="default">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>Backfill Complete</AlertTitle>
        <AlertDescription>
          <div className="flex items-center gap-2">
            <span>
              Successfully added {status.backfillResults.totalRecordsBackfilled} records
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {status.backfillResults.successfulOperations} operations completed
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  // Show data coverage is complete
  if (status.lastBackfillCheck) {
    return (
      <Alert className={className} variant="default">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>Data Coverage Complete</AlertTitle>
        <AlertDescription>
          Your dashboard data is up to date with no missing gaps.
        </AlertDescription>
      </Alert>
    )
  }

  return null
} 