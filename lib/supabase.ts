import { getSupabaseClient } from '@/lib/supabase/client'

// Check if Supabase environment variables are configured
const checkSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not configured')
    return false
  }
  
  if (!supabaseAnonKey) {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured')
    return false
  }
  
  return true
}

// Check if Supabase is properly configured
const isSupabaseConfigured = checkSupabaseConfig()

if (!isSupabaseConfigured) {
  console.error('Supabase is not properly configured')
}

// Export the singleton client
export const supabase = getSupabaseClient() 