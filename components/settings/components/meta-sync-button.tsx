'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCcw, Database } from 'lucide-react'

export default function MetaSyncButton({ brandId }: { brandId: string }) {
  const [loading, setLoading] = useState(false)
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setStatus('Syncing Meta data...')
    
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const response = await fetch('/api/meta/sync/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId, startDate, endDate }),
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setStatus('Sync completed successfully!')
      setTimeout(() => setStatus(null), 3000)
    } catch (error: any) {
      setStatus(`Error: ${error.message || 'Unknown error'}`)
      setTimeout(() => setStatus(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  async function handleBackfill() {
    setBackfillLoading(true)
    setStatus('Running data backfill...')
    
    try {
      const response = await fetch('/api/meta/backfill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setStatus('Backfill completed successfully! All tables are now in sync.')
      setTimeout(() => setStatus(null), 5000)
    } catch (error: any) {
      setStatus(`Error during backfill: ${error.message || 'Unknown error'}`)
      setTimeout(() => setStatus(null), 5000)
    } finally {
      setBackfillLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-row space-x-3">
        <Button 
          onClick={handleSync} 
          disabled={loading || backfillLoading}
          variant="outline"
          className="flex items-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {!loading && <RefreshCcw className="h-4 w-4" />}
          Sync Meta Data
        </Button>
        
        <Button 
          onClick={handleBackfill} 
          disabled={loading || backfillLoading}
          variant="secondary"
          className="flex items-center gap-2"
        >
          {backfillLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {!backfillLoading && <Database className="h-4 w-4" />}
          Fix Data Sync
        </Button>
      </div>
      
      {status && (
        <p className="text-sm mt-2 text-gray-600">{status}</p>
      )}
    </div>
  )
} 