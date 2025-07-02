import { getSupabaseClient } from '@/lib/supabase/client'

// Use the singleton client instead of creating a new one
export function useSupabase() {
  return getSupabaseClient()
} 