"use client"

import { useNotificationStore } from '@/stores/useNotificationStore'
import { calculateNotificationCounts } from './calculateCounts'

/**
 * Debugging utilities for the notification system
 */
export const NotificationDebug = {
  /**
   * Log current notification state
   */
  logState: () => {
    const state = useNotificationStore.getState()
    console.log('=== NOTIFICATION STATE ===')
    console.log('Todo Count:', state.todoCount)
    console.log('Brand Health Count:', state.brandHealthCount)
    console.log('Tools Count:', state.toolsCount)
    console.log('Total Count:', state.totalCount)
    console.log('Is Loading:', state.isLoading)
    console.log('Last Updated:', state.lastUpdated)
    console.log('========================')
  },

  /**
   * Force refresh notifications with logging
   */
  forceRefresh: async (userId: string) => {
    console.log('🐛 DEBUG: Force refreshing notifications...')
    NotificationDebug.logState()
    await calculateNotificationCounts(userId)
    console.log('🐛 DEBUG: After refresh:')
    NotificationDebug.logState()
  },

  /**
   * Test the notification system
   */
  test: (userId: string) => {
    console.log('🧪 TESTING NOTIFICATION SYSTEM')
    console.log('Current URL:', window.location.href)
    console.log('User ID:', userId)
    
    // Test state
    NotificationDebug.logState()
    
    // Test refresh
    console.log('Testing manual refresh...')
    window.dispatchEvent(new CustomEvent('refresh-notifications'))
    
    // Test visibility change
    console.log('Testing visibility change...')
    document.dispatchEvent(new Event('visibilitychange'))
    
    // Test force refresh
    setTimeout(() => {
      console.log('Testing force refresh after 2 seconds...')
      NotificationDebug.forceRefresh(userId)
    }, 2000)
  },

  /**
   * Check database connectivity
   */
  checkDb: async (userId: string) => {
    console.log('🔍 CHECKING DATABASE CONNECTIVITY')
    try {
      const { getAuthenticatedSupabaseClient } = await import('@/lib/utils/unified-supabase')
      const supabase = await getAuthenticatedSupabaseClient()
      
      // Test brands query
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('id, name')
        .eq('user_id', userId)
        .limit(5)
      
      console.log('Brands query result:', { 
        brands: brands?.map(b => ({ id: b.id, name: b.name })) || 'null/undefined', 
        count: brands?.length || 0,
        error: brandsError 
      })
      
      if (brands && brands.length > 0) {
        // Test lead_gen_results query
        const { data: leads, error: leadsError } = await supabase
          .from('lead_gen_results')
          .select('id')
          .eq('brand_id', brands[0].id)
          .limit(5)
        
        console.log('Leads query result:', { 
          leads: leads?.length || 0, 
          sample: leads?.slice(0, 3) || 'none',
          error: leadsError 
        })
        
        // Test brand_connections query
        const { data: connections, error: connectionsError } = await supabase
          .from('brand_connections')
          .select('platform')
          .eq('brand_id', brands[0].id)
          .limit(5)
        
        console.log('Connections query result:', { 
          connections: connections?.map(c => c.platform) || 'none',
          count: connections?.length || 0,
          error: connectionsError 
        })
      }
      
    } catch (error) {
      console.error('Database connectivity test failed:', error)
    }
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).NotificationDebug = NotificationDebug
}