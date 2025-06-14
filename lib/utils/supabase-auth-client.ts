import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { useRef, useCallback } from 'react'

/**
 * Hook to create a Supabase client with authentication from Clerk
 * This should be used in client components
 */
export function useAuthenticatedSupabase() {
  const { getToken } = useAuth()
  const clientRef = useRef<SupabaseClient | null>(null)
  const lastTokenRef = useRef<string | null>(null)
  
  // Function to create a Supabase client with the Clerk token
  const getSupabaseClient = useCallback(async () => {
    // Get the Supabase URL and key from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    try {
      // Get the JWT token from Clerk for Supabase
      const token = await getToken({ template: 'supabase' })
      
      // If we have the same token and already have a client, reuse it
      if (token && token === lastTokenRef.current && clientRef.current) {
        return clientRef.current
      }
      
      // If we have a token, create a new Supabase client with it
      if (token) {
        const client = createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        })
        
        // Store the client and token for reuse
        clientRef.current = client
        lastTokenRef.current = token
        return client
      }
    } catch (error) {
      console.error('Error getting Supabase token:', error)
    }
    
    // If we don't have a token, create a regular Supabase client (only if we don't have one)
    if (!clientRef.current || lastTokenRef.current !== null) {
      clientRef.current = createClient(supabaseUrl, supabaseKey)
      lastTokenRef.current = null
    }
    
    return clientRef.current
  }, [getToken])
  
  return { getSupabaseClient }
} 