import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase'

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

// Create a fallback client type that logs errors
const createFallbackClient = () => {
  console.error('Using fallback Supabase client - database operations will fail')
  
  // Create a self-referencing object
  const fallbackObj: any = {
    from: () => {
      console.error('Using fallback Supabase client - database operations will fail')
      return {
        select: () => fallbackObj,
        insert: () => Promise.reject(new Error('Supabase client initialization failed')),
        update: () => Promise.reject(new Error('Supabase client initialization failed')),
        delete: () => Promise.reject(new Error('Supabase client initialization failed')),
        eq: () => fallbackObj,
        neq: () => fallbackObj,
        gt: () => fallbackObj,
        gte: () => fallbackObj,
        lt: () => fallbackObj,
        lte: () => fallbackObj,
        order: () => fallbackObj,
        limit: () => fallbackObj,
        single: () => Promise.reject(new Error('Supabase client initialization failed')),
        then: () => Promise.reject(new Error('Supabase client initialization failed'))
      }
    },
    auth: {
      getSession: () => Promise.reject(new Error('Supabase client initialization failed')),
      signOut: () => Promise.reject(new Error('Supabase client initialization failed'))
    }
  }
  
  return fallbackObj
}

// Initialize the client with error handling
let supabase: any;

// Check if Supabase is properly configured
const isSupabaseConfigured = checkSupabaseConfig()

if (!isSupabaseConfigured) {
  console.error('Supabase is not properly configured - using fallback client')
  supabase = createFallbackClient()
} else {
  try {
    console.log('Initializing Supabase client...')
    supabase = createClientComponentClient<Database>()
    console.log('Supabase client initialized successfully')
  } catch (error) {
    console.error('Error initializing Supabase client:', error)
    supabase = createFallbackClient()
  }
}

// Export the client
export { supabase } 