export interface PlatformConnection {
  id: string
  platform_type: 'shopify' | 'meta'
  brand_id: string
  shop?: string  // For Shopify stores
  status: 'active' | 'inactive' | 'disconnected'
  created_at: string
  updated_at: string
  access_token?: string
  refresh_token?: string
  expires_at?: string
  metadata?: {
    [key: string]: any
  }
} 