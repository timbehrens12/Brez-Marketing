"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { UnifiedMetaSyncStatus } from "@/components/dashboard/meta/UnifiedMetaSyncStatus"

interface MetaConnectButtonProps {
  onConnect: (data: any) => Promise<void>
  isConnected: boolean
  brandId: string
  onDisconnect?: () => Promise<void>
}

export function MetaConnectButton({ onConnect, isConnected, brandId, onDisconnect }: MetaConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [showSyncStatus, setShowSyncStatus] = useState(false)
  const [syncInProgress, setSyncInProgress] = useState(false)

  // Check for sync status when connected
  useEffect(() => {
    if (isConnected && brandId) {
      checkSyncStatus()
    }
  }, [isConnected, brandId])

  const checkSyncStatus = async () => {
    try {
      const response = await fetch(`/api/platforms/sync-status?brandId=${brandId}&platformType=meta`)
      const data = await response.json()
      
      if (data.success) {
        const isCurrentlySyncing = data.sync_status === 'in_progress' || data.sync_status === 'syncing'
        setSyncInProgress(isCurrentlySyncing)
        setShowSyncStatus(isCurrentlySyncing)
      }
    } catch (error) {
      console.error('Error checking sync status:', error)
    }
  }

  const handleSyncComplete = () => {
    setSyncInProgress(false)
    setShowSyncStatus(false)
    toast.success("Sync Complete", {
      description: "All Meta data has been successfully synced."
    })
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://brezmarketingdashboard.com'
      const authUrl = `${baseUrl}/api/auth/meta?brandId=${brandId}`
      const finalUrl = `${authUrl}&t=${Date.now()}`

      window.location.href = finalUrl
    } catch (error) {

      toast.error("Connection Failed", {
        description: "Failed to connect Meta Ads. Please try again."
      })
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (confirm("Are you sure you want to disconnect Meta Ads? This will remove all access.")) {
      setIsConnecting(true)
      try {
        // Make a call to disconnect Meta using the correct endpoint
        const response = await fetch(`/api/platforms/disconnect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            brandId: brandId,
            platformType: 'meta'
          })
        })

        if (!response.ok) {
          throw new Error("Failed to disconnect")
        }

        if (onDisconnect) {
          onDisconnect()
        }
        toast.success("Disconnected", {
          description: "Successfully disconnected Meta Ads."
        })
      } catch (error) {

        toast.error("Disconnection Failed", {
          description: "Failed to disconnect Meta Ads. Please try again."
        })
      } finally {
        setIsConnecting(false)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {isConnected ? (
          <>
            <Button 
              variant="outline"
              className="bg-transparent text-red-500 hover:bg-red-500/10"
              onClick={handleDisconnect}
              disabled={isConnecting || syncInProgress}
            >
              {syncInProgress ? 'Syncing...' : 'Disconnect'}
            </Button>
          </>
        ) : (
          <Button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                Connect Meta Ads
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Unified Sync Status */}
      {isConnected && (showSyncStatus || syncInProgress) && (
        <UnifiedMetaSyncStatus
          brandId={brandId}
          isVisible={true}
          onSyncComplete={handleSyncComplete}
        />
      )}
    </div>
  )
}
