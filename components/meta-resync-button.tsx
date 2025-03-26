'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
    toast.info("Starting Meta data resync...")
    
    try {
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
      
      toast.success(`Meta data resynced successfully. Found ${data.count || 0} records.`)
      
      // Call onSuccess callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess()
      }
      
    } catch (err) {
      console.error("Error resyncing Meta data:", err)
      toast.error(err instanceof Error ? err.message : "Failed to resync Meta data. Please try again.")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button 
      onClick={handleResync} 
      disabled={isSyncing}
      variant="outline"
      className="flex items-center gap-2"
    >
      {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
      Resync Meta Data
    </Button>
  )
} 