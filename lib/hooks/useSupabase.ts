import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

// Create a single instance outside of the hook
const supabaseClient = createClientComponentClient<Database>()

export function useSupabase() {
  return supabaseClient
} 