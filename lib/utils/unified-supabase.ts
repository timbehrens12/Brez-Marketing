import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Global singleton instances
let standardClient: SupabaseClient | null = null
let currentAuthenticatedClient: SupabaseClient | null = null
let currentTokenHash: string | null = null

// Simple hash function for tokens
const hashToken = (token: string): string => {
  let hash = 0
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString()
}

/**
 * Get a standard Supabase client (no authentication)
 * This replaces @/lib/supabase and @/lib/supabaseClient imports
 */
export function getStandardSupabaseClient(): SupabaseClient {
  if (!standardClient) {
    // Get environment variables with fallbacks for build time
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    
    // Only validate in production/runtime, not during build
    if (process.env.NODE_ENV === 'production' && (supabaseUrl === 'https://placeholder.supabase.co' || supabaseKey === 'placeholder-key')) {
      throw new Error('Missing Supabase environment variables')
    }
    
    // console.log('📦 Creating standard Supabase client')
    standardClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
    // console.log('📦 Standard Supabase client ready')
  }
  
  return standardClient
}

/**
 * Get an authenticated Supabase client with Clerk token
 * This replaces useAuthenticatedSupabase usage
 */
export function getAuthenticatedSupabaseClient(token: string): SupabaseClient {
  const tokenHash = hashToken(token)
  
  // Reuse client if we have the same token
  if (currentAuthenticatedClient && currentTokenHash === tokenHash) {
    return currentAuthenticatedClient
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  // console.log('📦 Creating authenticated Supabase client')
  
  // Clean up previous client
  if (currentAuthenticatedClient) {
    currentAuthenticatedClient = null
  }
  
  currentAuthenticatedClient = createClient(supabaseUrl as string, supabaseKey as string, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
  
  currentTokenHash = tokenHash
  // console.log('📦 Authenticated Supabase client ready')
  
  return currentAuthenticatedClient
}

/**
 * Clear all cached clients (useful for logout)
 */
export function clearSupabaseClients() {
  standardClient = null
  currentAuthenticatedClient = null
  currentTokenHash = null
  // console.log('📦 Cleared all Supabase clients')
}

/**
 * Async function for React components to get authenticated Supabase client
 * Replaces useAuthenticatedSupabase
 */
export async function useUnifiedSupabase(getToken: (options?: any) => Promise<string | null>) {
  try {
    const token = await getToken({ template: 'supabase' })
    
    if (token) {
      return getAuthenticatedSupabaseClient(token)
    } else {
      return getStandardSupabaseClient()
    }
  } catch (error) {
    console.error('Error getting Supabase client:', error)
    return getStandardSupabaseClient()
  }
}

/**
 * Server-side Supabase client with service role
 */
export function getServerSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Add debug function to check client instances
export function debugClientInstances() {
  // console.log(`📦 Standard client exists: ${!!standardClient}`)
  // console.log(`📦 Authenticated client exists: ${!!currentAuthenticatedClient}`)
  // console.log(`📦 Current token hash: ${currentTokenHash ? 'Set' : 'None'}`)
}

// Legacy exports for backward compatibility
export const supabase = getStandardSupabaseClient()
export { getStandardSupabaseClient as createClient } 