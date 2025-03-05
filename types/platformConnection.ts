export interface PlatformConnection {
  id: string
  brand_id: string | null
  platform_type: string
  status: string
  access_token: string | null
  refresh_token?: string | null
  shop?: string | null
  created_at: string | null
  updated_at: string | null
  expires_at?: string | null
  user_id?: string
  metadata?: any
  sync_status?: string
  last_synced_at?: string
} 