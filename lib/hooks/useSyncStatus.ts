import { useState, useEffect } from 'react'
import { useSupabase } from '@/lib/hooks/useSupabase'

export interface SyncStatus {
  isLoading: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | null
  lastSynced: string | null
  hasRecentConnection: boolean
  hasAnyData: boolean
  shouldHideData: boolean // Hide data while syncing for new connections
}

export function useSyncStatus(brandId: string | null) {
  const supabase = useSupabase()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: true,
    status: null,
    lastSynced: null,
    hasRecentConnection: false,
    hasAnyData: false,
    shouldHideData: false
  })

  useEffect(() => {
    if (!brandId) {
      setSyncStatus({
        isLoading: false,
        status: null,
        lastSynced: null,
        hasRecentConnection: false,
        hasAnyData: false,
        shouldHideData: false
      })
      return
    }

    const checkSyncStatus = async () => {
      try {
        
        // Get platform connections and their sync status
        const { data: connections, error } = await supabase
          .from('platform_connections')
          .select('sync_status, last_synced_at, created_at')
          .eq('brand_id', brandId)
          .eq('status', 'active')

        if (error) {
          console.error('Error checking sync status:', error)
          setSyncStatus(prev => ({ ...prev, isLoading: false }))
          return
        }

        if (!connections || connections.length === 0) {
          setSyncStatus({
            isLoading: false,
            status: null,
            lastSynced: null,
            hasRecentConnection: false,
            hasAnyData: false,
            shouldHideData: false
          })
          return
        }

        // Check if any connection was created in the last 10 minutes
        const now = new Date()
        const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)
        
        const hasRecentConnection = connections.some(conn => {
          const createdAt = new Date(conn.created_at)
          return createdAt > tenMinutesAgo
        })

        // Get the most recent sync status
        const activeSync = connections.find(conn => 
          conn.sync_status === 'pending' || conn.sync_status === 'in_progress'
        )

        const lastCompleted = connections
          .filter(conn => conn.sync_status === 'completed' && conn.last_synced_at)
          .sort((a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime())[0]

        // Check if brand has any actual data
        const [metaData, shopifyData] = await Promise.all([
          supabase
            .from('meta_campaigns')
            .select('id')
            .eq('brand_id', brandId)
            .limit(1),
          supabase
            .from('shopify_orders')
            .select('id')
            .eq('brand_id', brandId)
            .limit(1)
        ])

        const hasAnyData = (metaData.data && metaData.data.length > 0) || 
                          (shopifyData.data && shopifyData.data.length > 0)

        // Should hide data if:
        // 1. Recent connection (< 10 min) AND
        // 2. (Sync is pending/in_progress OR no data exists yet)
        const shouldHideData = hasRecentConnection && 
                              (activeSync?.sync_status === 'pending' || 
                               activeSync?.sync_status === 'in_progress' || 
                               !hasAnyData)

        setSyncStatus({
          isLoading: false,
          status: activeSync?.sync_status || lastCompleted?.sync_status || null,
          lastSynced: lastCompleted?.last_synced_at || null,
          hasRecentConnection,
          hasAnyData,
          shouldHideData
        })

      } catch (error) {
        console.error('Error in sync status check:', error)
        setSyncStatus(prev => ({ ...prev, isLoading: false }))
      }
    }

    checkSyncStatus()

    // Poll for updates if sync is in progress
    const interval = setInterval(checkSyncStatus, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [brandId])

  return syncStatus
}
