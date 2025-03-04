import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Create a single instance outside of the hook
const supabaseClient = createClientComponentClient<Database>()

export function useSupabase() {
  // We don't need to do anything here anymore since the AuthProvider
  // is handling the Supabase authentication
  const { isSupabaseAuthenticated } = useAuth()
  
  // Log authentication status for debugging
  if (!isSupabaseAuthenticated) {
    console.warn('Using Supabase client without authentication - some operations may fail')
  }
  
  return supabaseClient
} 