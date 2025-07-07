import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

// Singleton pattern for Supabase clients
let standardClient: SupabaseClient | null = null
let authenticatedClients = new Map<string, SupabaseClient>()

/**
 * Get a standard Supabase client (no authentication)
 * This replaces @/lib/supabase and @/lib/supabaseClient imports
 */
export function getStandardSupabaseClient(): SupabaseClient {
  if (!standardClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    standardClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Prevent conflicts
      },
    })
  }
  return standardClient
}

/**
 * Get an authenticated Supabase client with Clerk token
 * This replaces useAuthenticatedSupabase usage
 */
export function getAuthenticatedSupabaseClient(token: string): SupabaseClient {
  // Reuse client if we have the same token
  if (authenticatedClients.has(token)) {
    return authenticatedClients.get(token)!
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  const client = createClient(supabaseUrl as string, supabaseKey as string, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false, // Don't persist for authenticated clients
      autoRefreshToken: false,
      detectSessionInUrl: false, // Prevent conflicts
    }
  })
  
  // Store client (but limit cache size to prevent memory leaks)
  if (authenticatedClients.size > 10) {
      const firstKey = authenticatedClients.keys().next().value
  if (firstKey) {
    authenticatedClients.delete(firstKey)
  }
  }
  authenticatedClients.set(token, client)
  
  return client
}

/**
 * Hook for React components to get authenticated Supabase client
 * Replaces useAuthenticatedSupabase
 */
export async function useUnifiedSupabase(getToken: (options?: any) => Promise<string | null>) {
  try {
    const token = await getToken({ template: 'supabase' })
    
    if (token) {
      return getAuthenticatedSupabaseClient(token)
    } else {
      return getStandardSupabaseClient()
    }
  } catch (error) {
    console.error('Error getting Supabase client:', error)
    return getStandardSupabaseClient()
  }
}

/**
 * Unified hook that returns both the client and a loading state
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

/**
 * Server-side Supabase client with service role
 */
export function getServerSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Legacy exports for backward compatibility
export const supabase = getStandardSupabaseClient()
export { getStandardSupabaseClient as createClient } 