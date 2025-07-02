import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Global singleton client instance
let globalClient: SupabaseClient | null = null
let globalToken: string | null = null

// Export getter for direct access by other modules
export const getGlobalClient = () => globalClient

// Expose global client for other systems to access
function exposeGlobalClient() {
  if (typeof window !== 'undefined') {
    (window as any).__supabase_global_client = globalClient
    console.log('🌐 Global Supabase client exposed for cross-system access')
  }
}

// Initialize basic client immediately if on client-side
function initializeBasicClient() {
  if (typeof window !== 'undefined' && !globalClient) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      
      console.log('🚀 Pre-initializing global Supabase client (basic)')
      globalClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      })
      exposeGlobalClient()
    } catch (error) {
      console.error('❌ Failed to pre-initialize Supabase client:', error)
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
      }
    })
    globalToken = token
    console.log('✅ Global client upgraded with authentication')
    exposeGlobalClient()
  }
  
  return globalClient!
}

// Only initialize on client-side after DOM is ready to avoid hydration mismatches
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure this runs after initial hydration
  setTimeout(() => {
    initializeBasicClient()
  }, 0)
} 