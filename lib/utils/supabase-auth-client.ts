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
  const isCreatingRef = useRef<boolean>(false)
  
  // Function to create a Supabase client with the Clerk token
  const getSupabaseClient = useCallback(async () => {
    // Prevent concurrent client creation
    if (isCreatingRef.current) {
      // Wait for ongoing creation to complete
      while (isCreatingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      if (clientRef.current) return clientRef.current
    }
    
    // Get the Supabase URL and key from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    try {
      isCreatingRef.current = true
      
      // Get fresh token
      const token = await getToken({ template: 'supabase' })
      
      // If we have the same token and a working client, reuse it
      if (token && token === lastTokenRef.current && clientRef.current) {
        return clientRef.current
      }
      
      // Create new client only when absolutely necessary
      if (token && (!clientRef.current || token !== lastTokenRef.current)) {
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
      
      // Fallback to existing client if available
      if (clientRef.current) {
        return clientRef.current
      }
      
      // Last resort: create unauthenticated client
      clientRef.current = createClient(supabaseUrl, supabaseKey)
      lastTokenRef.current = null
      return clientRef.current
      
    } catch (error) {
      console.error('Error getting Supabase token:', error)
    
      // Fallback to existing client or create unauthenticated one
      if (!clientRef.current) {
      clientRef.current = createClient(supabaseUrl, supabaseKey)
      lastTokenRef.current = null
    }
    return clientRef.current
    } finally {
      isCreatingRef.current = false
    }
  }, [getToken])
  
  return { getSupabaseClient }
} 