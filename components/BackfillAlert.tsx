import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Database, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BackfillAlertProps {
  hasGaps: boolean
  totalMissingDays: number
  gapsDetected: number
  isBackfilling: boolean
  onManualBackfill: () => Promise<void>
}

export function BackfillAlert({ 
  hasGaps, 
  totalMissingDays, 
  gapsDetected, 
  isBackfilling,
  onManualBackfill 
}: BackfillAlertProps) {
  const [manualBackfillStatus, setManualBackfillStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleManualBackfill = async () => {
    setManualBackfillStatus('loading')
    try {
      await onManualBackfill()
      setManualBackfillStatus('success')
      toast.success('Data backfill completed successfully!')
      setTimeout(() => setManualBackfillStatus('idle'), 3000)
    } catch (error) {
      setManualBackfillStatus('error')
      toast.error('Backfill failed. Please try again.')
      setTimeout(() => setManualBackfillStatus('idle'), 3000)
    }
  }

  if (!hasGaps && !isBackfilling) {
    return null
  }

  return (
    <Card className="bg-orange-500/10 border-orange-500/20 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-orange-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Data Gaps Detected
        </CardTitle>
        <CardDescription className="text-orange-300">
          Found {gapsDetected} gaps totaling {totalMissingDays} missing days of data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-300">
            {isBackfilling ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Backfilling missing data...
              </div>
            ) : (
              'Missing data may cause incomplete comparisons and charts'
            )}
          </div>
          
          {!isBackfilling && (
            <Button
              onClick={handleManualBackfill}
              disabled={manualBackfillStatus === 'loading'}
              variant="outline"
              size="sm"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
            >
              {manualBackfillStatus === 'loading' && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {manualBackfillStatus === 'success' && (
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
              )}
              {manualBackfillStatus === 'error' && (
                <XCircle className="h-4 w-4 mr-2 text-red-400" />
              )}
              <Database className="h-4 w-4 mr-2" />
              {manualBackfillStatus === 'loading' ? 'Backfilling...' : 
               manualBackfillStatus === 'success' ? 'Completed' :
               manualBackfillStatus === 'error' ? 'Failed' : 'Fill Missing Data'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 