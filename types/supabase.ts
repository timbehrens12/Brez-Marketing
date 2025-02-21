export type Database = {
  public: {
    Tables: {
      platform_connections: {
        Row: {
          id: string
          brand_id: string
          platform_type: string
          status: string
          shop?: string
        }
      }
      shopify_data: {
        Row: any
      }
      meta_data: {
        Row: any
      }
    }
  }
} 