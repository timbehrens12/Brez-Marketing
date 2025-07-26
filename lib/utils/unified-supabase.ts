import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton pattern for Supabase clients with better caching
let standardClient: SupabaseClient | null = null
let authenticatedClients = new Map<string, SupabaseClient>()
let clientInstances = 0

// Cleanup function to remove old authenticated clients
const cleanupAuthenticatedClients = () => {
  if (authenticatedClients.size > 10) {
    // Keep only the 5 most recent clients
    const entries = Array.from(authenticatedClients.entries())
    const toKeep = entries.slice(-5)
    authenticatedClients.clear()
    toKeep.forEach(([key, client]) => {
      authenticatedClients.set(key, client)
    })
  }
}

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
        persistSession: false, // Don't persist sessions for standard client
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
    
    console.log('📦 Using unified Supabase client system')
  }
  
  return standardClient
}

/**
 * Get an authenticated Supabase client with Clerk token
 * This replaces useAuthenticatedSupabase usage
 */
export function getAuthenticatedSupabaseClient(token: string): SupabaseClient {
  // Create a short hash of the token for caching (use first 16 chars)
  const tokenHash = token.substring(0, 16)
  
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
  
  const client = createClient(supabaseUrl as string, supabaseKey as string, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false, // Don't persist sessions to avoid conflicts
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
  
  // Cache the client
  authenticatedClients.set(tokenHash, client)
  
  // Cleanup old clients if needed
  cleanupAuthenticatedClients()
  
  // Only log on first creation or every 5th instance to reduce noise
  if (clientInstances === 1 || clientInstances % 5 === 0) {
    console.log(`📦 Creating authenticated Supabase client (instance #${clientInstances})`)
  }
  
  return client
}

/**
 * Clear all cached clients (useful for cleanup)
 */
export function clearSupabaseClients() {
  standardClient = null
  authenticatedClients.clear()
  clientInstances = 0
  console.log('📦 Cleared all Supabase clients')
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