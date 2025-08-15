// lib/supabase/client.ts - LEGACY FILE - NOW REDIRECTS TO UNIFIED CLIENT  
import { getStandardSupabaseClient, getServerSupabaseClient } from '@/lib/utils/unified-supabase'

// console.log('📦 Using unified Supabase client system')

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // Server-side: return server client
    return getServerSupabaseClient()
  }
  
  // Client-side: use unified standard client
  return getStandardSupabaseClient()
}

export function getSupabaseServiceClient() {
  // Always use server client for service operations
  return getServerSupabaseClient()
}

// Export singleton for backwards compatibility
export const supabase = getSupabaseClient() 