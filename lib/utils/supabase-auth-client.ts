import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'

/**
 * Hook to create a Supabase client with authentication from Clerk
 * This should be used in client components
 */
export function useAuthenticatedSupabase() {
  const { getToken } = useAuth()
  
  // Function to create a Supabase client with the Clerk token
  const getSupabaseClient = async () => {
    // Get the Supabase URL and key from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    try {
      // Get the JWT token from Clerk for Supabase
      const token = await getToken({ template: 'supabase' })
      
      // If we have a token, create a Supabase client with it
      if (token) {
        return createClient(supabaseUrl, supabaseKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        })
      }
    } catch (error) {
      console.error('Error getting Supabase token:', error)
    }
    
    // If we don't have a token, create a regular Supabase client
    return createClient(supabaseUrl, supabaseKey)
  }
  
  return { getSupabaseClient }
} 