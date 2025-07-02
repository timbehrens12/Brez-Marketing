// lib/supabase/client.ts - LEGACY FILE - REDIRECTS TO AUTHENTICATED CLIENT  
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Always use the global authenticated client to eliminate multiple instances
console.log('🚫 Legacy client access - redirecting to authenticated client')

function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side: return basic client
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  // Client-side: ALWAYS use the global singleton
  const globalClient = (window as any).__supabase_global_client
  if (globalClient) {
    console.log('♻️ Using global authenticated client from singleton')
    return globalClient
  }
  
  // Fallback: create basic client but warn
  console.warn('⚠️ No global singleton found - creating fallback client')
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  })
}

const supabase = getSupabaseClient()

export { supabase }
export default supabase 