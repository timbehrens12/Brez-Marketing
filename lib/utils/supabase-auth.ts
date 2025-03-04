import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

/**
 * Creates a Supabase client with authentication from Clerk
 * This should be used in server components and API routes
 */
export async function createAuthenticatedSupabaseClient() {
  // Get the Supabase URL and key from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  // Get the authentication helper from Clerk
  const { getToken } = auth()
  
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
  
  // If we don't have a token, create a regular Supabase client
  return createClient(supabaseUrl, supabaseKey)
} 