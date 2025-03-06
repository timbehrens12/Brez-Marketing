"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface SessionsSyncButtonProps {
  connectionId: string
  className?: string
}

export function SessionsSyncButton({ connectionId, className }: SessionsSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    if (isSyncing) return
    
    if (!connectionId) {
      toast.error('Connection ID is required')
      return
    }
    
    setIsSyncing(true)
    try {
      console.log(`Syncing sessions for connection ID: ${connectionId}`)
      
      const response = await fetch('/api/shopify/sessions/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to sync sessions data: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Sessions sync response:', data)
      
      toast.success('Sessions data synced successfully')
      
      // Dispatch a custom event to refresh the sessions data
      window.dispatchEvent(new CustomEvent('refreshSessions', { 
        detail: { connectionId } 
      }))
      
    } catch (error) {
      console.error('Error syncing sessions data:', error)
      toast.error(`Error syncing sessions data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
      className={`text-xs h-7 px-2 ${className || ''}`}
    >
      {isSyncing ? (
        <>
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="h-3 w-3 mr-1" />
          Sync Sessions
        </>
      )}
    </Button>
  )
} 