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
      // Always try to get a fresh token to handle tab switching scenarios
      const token = await getToken({ template: 'supabase' })
      
      // Check if the token has changed or if we need a new client
      const needsNewClient = !clientRef.current || 
                            token !== lastTokenRef.current ||
                            (token && !lastTokenRef.current) ||
                            (!token && lastTokenRef.current)
      
      // If we have a token and need a new client
      if (token && needsNewClient) {
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
      
      // If we have a token and existing client with same token, reuse it
      if (token && !needsNewClient && clientRef.current) {
        return clientRef.current
      }
    } catch (error) {
      console.error('Error getting Supabase token:', error)
      // Reset client to force recreation on next call
      clientRef.current = null
      lastTokenRef.current = null
    }
    
    // If we don't have a token, create a regular Supabase client
    if (!clientRef.current || lastTokenRef.current !== null) {
      console.log('Creating unauthenticated Supabase client')
      clientRef.current = createClient(supabaseUrl, supabaseKey)
      lastTokenRef.current = null
    }
    
    return clientRef.current
  }, [getToken])
  
  return { getSupabaseClient }
} 