import { createClient } from '@supabase/supabase-js'

// Use the actual environment variable or a placeholder for local development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

console.log('Initializing Supabase client...')

// Create a standard Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey)

// This function can be used to create a client with a custom auth token
// when needed in components that have access to the Clerk session
export const createSupabaseClientWithToken = async (clerkToken: string) => {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`
      }
    }
  })
} 