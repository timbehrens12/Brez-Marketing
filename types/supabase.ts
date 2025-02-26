export type Database = {
  public: {
    Tables: {
      platform_connections: {
        Row: PlatformConnection;
        Insert: Omit<PlatformConnection, 'id'>;
        Update: Partial<PlatformConnection>;
      };
      shopify_orders: {
        Row: ShopifyOrder;
        Insert: Omit<ShopifyOrder, 'id'>;
        Update: Partial<ShopifyOrder>;
      };
      shopify_data: {
        Row: any
      }
      meta_data: {
        Row: any
      }
    }
  }
} 