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
  // Server-side: return simple client
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  
  // Client-side: ALWAYS use the global singleton when available
  const globalClient = (window as any).__supabase_global_client
  if (globalClient) {
    console.log('♻️ Using global authenticated Supabase client (from old system)')
    return globalClient
  }
  
      // Also check if our singleton module has initialized the client
    try {
      const { getGlobalClient } = require('../utils/supabase-global-client')
      const moduleClient = getGlobalClient()
      if (moduleClient) {
        console.log('♻️ Using module-level global client')
        return moduleClient
      }
    } catch (e) {
      console.warn('⚠️ Could not load singleton client module:', e)
    }
  
  // If no singleton exists, return a basic client but warn about it
  console.warn('⚠️ No authenticated singleton found - returning basic client (may cause auth issues)')
  
  // Create a basic client as absolute last resort
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  })
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

// Lazy getter to avoid creating client at module load time
let _supabaseInstance: any = null
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!_supabaseInstance) {
      _supabaseInstance = getSupabaseClient()
    }
    return _supabaseInstance[prop]
  }
}) 