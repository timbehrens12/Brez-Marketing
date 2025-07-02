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
      // Get fresh token but avoid creating clients too frequently
      const token = await getToken({ template: 'supabase' })
      
      // If we have the same token and a working client, reuse it
      if (token && token === lastTokenRef.current && clientRef.current) {
        return clientRef.current
      }
      
      // Only create a new client if the token has actually changed
      if (token && token !== lastTokenRef.current) {
        console.log('Creating new Supabase client with fresh token')
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
      
      // If we have an existing client with the same token, reuse it
      if (token && clientRef.current) {
        return clientRef.current
      }
    } catch (error) {
      console.error('Error getting Supabase token:', error)
      // Don't reset client immediately - may be a temporary error
    }
    
    // Only create unauthenticated client if we don't have any client
    if (!clientRef.current) {
      console.log('Creating unauthenticated Supabase client')
      clientRef.current = createClient(supabaseUrl, supabaseKey)
      lastTokenRef.current = null
    }
    
    return clientRef.current
  }, [getToken])
  
  return { getSupabaseClient }
} 