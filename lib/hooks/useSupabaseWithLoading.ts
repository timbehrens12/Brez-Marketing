"use client"

import { useState, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { useUnifiedSupabase, getStandardSupabaseClient } from '@/lib/utils/unified-supabase'

/**
 * Client-side hook that returns Supabase client with loading state
 * Use this in React components that need loading indicators
 */
export function useSupabaseWithLoading(getToken: (options?: any) => Promise<string | null>) {
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    let isMounted = true
    
    const initializeClient = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const supabaseClient = await useUnifiedSupabase(getToken)
        
        if (isMounted) {
          setClient(supabaseClient)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize Supabase client')
          setClient(getStandardSupabaseClient()) // Fallback
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    initializeClient()
    
    return () => {
      isMounted = false
    }
  }, [getToken])
  
  return { client, loading, error }
} 