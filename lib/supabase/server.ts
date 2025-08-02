import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton instance for server-side Supabase client
let supabaseServerInstance: SupabaseClient | null = null

/**
 * Creates a Supabase client for server components and API routes
 * using the service role key for admin privileges.
 * Uses singleton pattern to prevent multiple GoTrueClient instances.
 */
export function createClient(): SupabaseClient {
  // Return existing instance if it exists
  if (supabaseServerInstance) {
    return supabaseServerInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  // Create new instance and store it
  supabaseServerInstance = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })
  
  return supabaseServerInstance
} 