export interface PlatformConnection {
  id: string
  brand_id: string
  platform_type: 'shopify' | 'meta'
  status: 'active' | 'inactive'
  access_token: string
  shop?: string
  created_at: string
  updated_at: string
  sync_status?: 'pending' | 'in_progress' | 'completed' | 'failed'
  last_synced_at?: string
} 