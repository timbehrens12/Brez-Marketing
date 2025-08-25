import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Global singleton client instance
let globalClient: SupabaseClient | null = null
let globalToken: string | null = null
let isInitializing = false

// Export getter for direct access by other modules
export const getGlobalClient = () => {
  if (!globalClient && typeof window !== 'undefined') {
    console.log('⚠️ No global singleton found - creating fallback client')
    initializeBasicClient()
  }
  return globalClient
}

// Expose global client for other systems to access
function exposeGlobalClient() {
  if (typeof window !== 'undefined') {
    (window as any).__supabase_global_client = globalClient
    console.log('🌐 Global Supabase client exposed for cross-system access')
  }
}

// Initialize basic client immediately if on client-side
function initializeBasicClient() {
  if (typeof window !== 'undefined' && !globalClient && !isInitializing) {
    isInitializing = true
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      
      console.log('🚀 Pre-initializing global Supabase client (basic)')
      globalClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false // Prevent URL-based session detection conflicts
        }
      })
      exposeGlobalClient()
    } catch (error) {
      console.error('❌ Failed to pre-initialize Supabase client:', error)
    } finally {
      isInitializing = false
    }
  }
}

// Function to upgrade client with authentication token
export function upgradeGlobalClient(token: string): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (token && token !== globalToken) {
    console.log('🔄 Upgrading global client with new token')
    globalClient = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false // Prevent URL-based session detection conflicts
      }
    })
    globalToken = token
    console.log('✅ Global client upgraded with authentication')
    exposeGlobalClient()
  }
  
  return globalClient!
}

// Force initialization on client-side
if (typeof window !== 'undefined') {
  // Initialize immediately but safely
  initializeBasicClient()
} 