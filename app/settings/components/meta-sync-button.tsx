'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function MetaSyncButton({ brandId }: { brandId: string }) {
  const [loading, setLoading] = useState(false)
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
    } catch (error) {
      setStatus(`Error: ${error.message || 'Unknown error'}`)
      setTimeout(() => setStatus(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button 
        onClick={handleSync} 
        disabled={loading}
        variant="outline"
        className="flex items-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Sync Meta Data
      </Button>
      
      {status && (
        <p className="text-sm mt-2 text-gray-600">{status}</p>
      )}
    </div>
  )
} 