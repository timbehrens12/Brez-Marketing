import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Import our singleton client system
let globalClient: any = null

// Function to get the global authenticated client from our singleton
async function getGlobalAuthenticatedClient() {
  if (typeof window === 'undefined') {
    // Server-side: create unauthenticated client
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  // Client-side: try to get the global singleton client
  if (globalClient) {
    return globalClient
  }
  
  // Fallback: create basic client
  console.log('⚠️ Falling back to basic Supabase client (no global singleton found)')
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  })
}

export function getSupabaseClient() {
  // On client-side, try to use the global singleton
  if (typeof window !== 'undefined') {
    // Access the global client if available
    const globalClientFromWindow = (window as any).__supabase_global_client
    if (globalClientFromWindow) {
      console.log('♻️ Using global authenticated Supabase client')
      return globalClientFromWindow
    }
  }
  
  console.log('🔄 Creating new Supabase client instance...')
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'sb-auth-token',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
  console.log('✅ Supabase client instance created successfully')
  return client
}

// For server-side operations
export function getSupabaseServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Legacy exports for backward compatibility - all point to the same singleton
export default getSupabaseClient 
export const supabase = getSupabaseClient() 