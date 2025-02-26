export type Database = {
  public: {
    Tables: {
      platform_connections: {
        Row: PlatformConnection;
        Insert: Omit<PlatformConnection, 'id'>;
        Update: Partial<PlatformConnection>;
      };
      shopify_orders: {
        Row: {
          id: string;
          connection_id: string;
          created_at: string;
          total_price: string;
          customer_id: string;
          line_items: any[];
        };
        Insert: Omit<Row, 'id'>;
        Update: Partial<Row>;
      };
      shopify_data: {
        Row: any;
      };
      meta_data: {
        Row: any;
      };
    };
  };
}; 