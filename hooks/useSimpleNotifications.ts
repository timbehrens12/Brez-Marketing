"use client"

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { calculateNotificationCounts, refreshNotificationCounts, debugNotificationCounts } from '@/lib/notifications/calculateCounts'
import '@/lib/notifications/debug' // Load debugging utilities

/**
 * Simple, reliable notification hook to replace the complex useActionCenter
 */
export function useSimpleNotifications() {
  const { userId } = useAuth()
  
  // Get state from store
  const {
    todoCount,
    brandHealthCount,
    toolsCount,
    totalCount,
    isLoading,
    lastUpdated,
    incrementTodo,
    decrementTodo,
    markBrandHealthRead
  } = useNotificationStore()
  
  // Initialize counts on mount (only once) - removed delay for immediate updates
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (userId && !hasInitialized.current) {
      hasInitialized.current = true
      // Setup debug function
      debugNotificationCounts(userId)
      // Immediate calculation with force refresh on initial load
      calculateNotificationCounts(userId, 0, true)
    }
  }, [userId])
  
  // Set up refresh interval (every 30 seconds - more reasonable frequency)
  useEffect(() => {
    if (!userId) return
    
    const interval = setInterval(() => {
      console.log('[NotificationHook] 🔄 Auto-refreshing notifications...')
      calculateNotificationCounts(userId) // Will be throttled automatically
    }, 30000) // Reduced frequency to avoid excessive calls
    
    return () => clearInterval(interval)
  }, [userId])
  
  // Listen for manual refresh events and page visibility changes
  useEffect(() => {
    const handleRefresh = () => {
      if (userId) {
        console.log('[NotificationHook] 🔄 Manual refresh triggered')
        calculateNotificationCounts(userId, 0, true) // Force refresh for manual triggers
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && userId) {
        console.log('[NotificationHook] 🔄 Page became visible, refreshing notifications')
        calculateNotificationCounts(userId) // Normal refresh (will be throttled)
      }
    }
    
    window.addEventListener('refresh-notifications', handleRefresh)
    window.addEventListener('global-refresh-all', handleRefresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('refresh-notifications', handleRefresh)
      window.removeEventListener('global-refresh-all', handleRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId])
  
  // Public API - same interface as the old useActionCenter for easy replacement
  return {
    // Counts (compatible with old format)
    actionCenterCounts: {
      totalItems: totalCount,
      urgentItems: 0, // Simplified - no urgent tracking for now
      breakdown: {
        outreachTodos: todoCount,
        urgentOutreach: 0,
        brandReports: brandHealthCount,
        availableTools: toolsCount
      }
    },
    
    // Simple API
    counts: {
      todo: todoCount,
      brandHealth: brandHealthCount,
      tools: toolsCount,
      total: totalCount
    },
    
    // State
    isLoading,
    lastUpdated,
    
    // Actions
    incrementTodo,
    decrementTodo,
    markBrandHealthRead,
    refresh: () => {
      if (userId) {
        console.log('[NotificationHook] 🔄 Force refresh requested')
        calculateNotificationCounts(userId, 0, true) // Force refresh bypasses throttling
      }
    },
    forceRefresh: () => {
      if (userId) {
        console.log('[NotificationHook] 💥 Force refresh with cache clear')
        // Clear any cached data and force immediate refresh
        useNotificationStore.getState().setLoading(true)
        calculateNotificationCounts(userId, 0, true) // Force refresh bypasses throttling
      }
    }
  }
}

/**
 * Lightweight hook for components that only need the total count
 */
export function useNotificationCount() {
  const totalCount = useNotificationStore(state => state.totalCount)
  return totalCount
}

/**
 * Manual refresh function for external use
 */
export function triggerNotificationRefresh() {
  window.dispatchEvent(new CustomEvent('refresh-notifications'))
}

/**
 * Force refresh function for critical updates
 */
export function forceNotificationRefresh() {
  window.dispatchEvent(new CustomEvent('global-refresh-all'))
}

/**
 * Debounced refresh to prevent excessive API calls
 */
let refreshTimeout: NodeJS.Timeout | null = null
export function debouncedNotificationRefresh(delay = 1000) {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout)
  }
  refreshTimeout = setTimeout(() => {
    triggerNotificationRefresh()
  }, delay)
}