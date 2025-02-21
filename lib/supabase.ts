import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

// Create a single instance
export const supabase = createClientComponentClient<Database>() 