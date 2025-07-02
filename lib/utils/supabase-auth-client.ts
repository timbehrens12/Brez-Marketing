"use client"

import { SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useCallback, useState } from 'react'
import { getGlobalClient, upgradeGlobalClient } from './supabase-global-client'

// Re-export for compatibility
export { getGlobalClient }

/**
 * Hook to create a Supabase client with authentication from Clerk
 * This should be used in client components
 */
export function useAuthenticatedSupabase() {
  const { getToken } = useAuth()
  const [isReady, setIsReady] = useState(false)
  
  // Function to decode JWT and get expiry time
  const getTokenExpiry = (token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp ? payload.exp * 1000 : null // Convert to milliseconds
    } catch {
      return null
    }
  }
  
  // Function to check if token is expired or will expire soon (within 1 minute)
  const isTokenExpiredOrExpiringSoon = (expiry: number | null): boolean => {
    if (!expiry) return true
    const oneMinuteFromNow = Date.now() + (10 * 60 * 1000) // 10 minutes to reduce frequent refreshes
    return expiry < oneMinuteFromNow
    }
    
  // Upgrade to authenticated client
  const upgradeToAuthenticatedClient = async (): Promise<SupabaseClient> => {
    try {
      const token = await getToken({ template: 'supabase' })
      
      // Only upgrade if we got a token
      if (token) {
        console.log('🔄 Upgrading to authenticated Supabase client (singleton)')
        const client = upgradeGlobalClient(token)
        return client
      } else {
        console.log('⚠️ No token available, keeping basic client')
        return getGlobalClient()!
      }
    } catch (error) {
      console.error('❌ Error upgrading Supabase client:', error)
      return getGlobalClient()!
    }
  }
  
  // Initialize on mount
  useEffect(() => {
    let isMounted = true
    
    const initialize = async () => {
      try {
        await upgradeToAuthenticatedClient()
        if (isMounted) {
          setIsReady(true)
        }
      } catch (error) {
        console.error('❌ Failed to upgrade Supabase client:', error)
        if (isMounted) {
          setIsReady(true) // Set ready even on error so app doesn't hang
        }
            }
          }
    
    initialize()
    
    return () => {
      isMounted = false
    }
  }, [])
        
  // Main function to get the client - simplified to always refresh auth
  const getSupabaseClient = useCallback(async (): Promise<SupabaseClient | null> => {
    try {
      // This is the most robust way to ensure we have a valid token for every operation.
      // It will attempt to get a fresh token from Clerk and apply it to our global client.
      console.log('🚀 Ensuring Supabase client has fresh authentication...')
      const authedClient = await upgradeToAuthenticatedClient()
      console.log('✅ Authentication refreshed.')
      return authedClient
    } catch (error) {
      console.error('❌ Error getting Supabase client:', error)
      return getGlobalClient() // Fallback to non-authed client
    }
  }, [getToken]) // Include getToken in the dependency array
  
  return { getSupabaseClient, isReady }
} 