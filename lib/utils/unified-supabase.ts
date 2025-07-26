import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton pattern for Supabase clients
let standardClient: SupabaseClient | null = null
let authenticatedClients = new Map<string, SupabaseClient>()
let clientInstances = 0

/**
 * Get a standard Supabase client (no authentication)
 * This replaces @/lib/supabase and @/lib/supabaseClient imports
 */
export function getStandardSupabaseClient(): SupabaseClient {
  if (!standardClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    clientInstances++
    console.log(`📦 Creating standard Supabase client (instance #${clientInstances})`)
    
    standardClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false, // Prevent conflicts
      },
    })
  }
  return standardClient
}

/**
 * Get an authenticated Supabase client with Clerk token
 * This replaces useAuthenticatedSupabase usage
 */
export function getAuthenticatedSupabaseClient(token: string): SupabaseClient {
  // Create a hash of the token to use as key (avoid storing full token)
  const tokenHash = btoa(token.substring(0, 20) + token.substring(token.length - 20))
  
  // Reuse client if we have the same token hash
  if (authenticatedClients.has(tokenHash)) {
    return authenticatedClients.get(tokenHash)!
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  clientInstances++
  console.log(`📦 Creating authenticated Supabase client (instance #${clientInstances})`)
  
  const client = createClient(supabaseUrl as string, supabaseKey as string, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false, // Don't persist for authenticated clients
      autoRefreshToken: false,
      detectSessionInUrl: false, // Prevent conflicts
    }
  })
  
  // Store client (but limit cache size to prevent memory leaks)
  if (authenticatedClients.size > 5) {
    const firstKey = authenticatedClients.keys().next().value
    if (firstKey) {
      console.log('📦 Removing old authenticated client from cache')
      authenticatedClients.delete(firstKey)
    }
  }
  authenticatedClients.set(tokenHash, client)
  
  return client
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
  console.log(`📦 Total Supabase client instances created: ${clientInstances}`)
  console.log(`📦 Standard client exists: ${!!standardClient}`)
  console.log(`📦 Authenticated clients in cache: ${authenticatedClients.size}`)
}

// Legacy exports for backward compatibility
export const supabase = getStandardSupabaseClient()
export { getStandardSupabaseClient as createClient } 