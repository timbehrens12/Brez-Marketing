export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_data_tracking: {
        Row: {
          account_id: string
          account_name: string | null
          brand_id: string
          campaign_id: string | null
          campaign_name: string | null
          clicks: number | null
          cpc: string | null
          cpm: string | null
          created_at: string | null
          ctr: string | null
          data_type: string | null
          date_end: string | null
          date_start: string | null
          id: string
          impressions: number | null
          reach: number | null
          spend: string | null
        }
        Insert: {
          account_id: string
          account_name?: string | null
          brand_id: string
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          cpc?: string | null
          cpm?: string | null
          created_at?: string | null
          ctr?: string | null
          data_type?: string | null
          date_end?: string | null
          date_start?: string | null
          id?: string
          impressions?: number | null
          reach?: number | null
          spend?: string | null
        }
        Update: {
          account_id?: string
          account_name?: string | null
          brand_id?: string
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number | null
          cpc?: string | null
          cpm?: string | null
          created_at?: string | null
          ctr?: string | null
          data_type?: string | null
          date_end?: string | null
          date_start?: string | null
          id?: string
          impressions?: number | null
          reach?: number | null
          spend?: string | null
        }
        Relationships: []
      }
      metrics: {
        Row: {
          average_order_value: number | null
          brand_id: string | null
          conversion_rate: number | null
          created_at: string | null
          customer_count: number | null
          id: string
          orders_count: number | null
          platform_type: string
          total_sales: number | null
        }
        Insert: {
          average_order_value?: number | null
          brand_id?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          customer_count?: number | null
          id?: string
          orders_count?: number | null
          platform_type: string
          total_sales?: number | null
        }
        Update: {
          average_order_value?: number | null
          brand_id?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          customer_count?: number | null
          id?: string
          orders_count?: number | null
          platform_type?: string
          total_sales?: number | null
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          access_token: string | null
          brand_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          platform_type: string
          refresh_token: string | null
          shop: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          brand_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          platform_type: string
          refresh_token?: string | null
          shop?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          brand_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          platform_type?: string
          refresh_token?: string | null
          shop?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_orders: {
        Row: {
          connection_id: string | null
          created_at: string | null
          created_at_timestamp: string | null
          customer_id: number | null
          id: number
          line_items: Json | null
          total_price: number | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string | null
          created_at_timestamp?: string | null
          customer_id?: number | null
          id: number
          line_items?: Json | null
          total_price?: number | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string | null
          created_at_timestamp?: string | null
          customer_id?: number | null
          id?: number
          line_items?: Json | null
          total_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_orders_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mappings: {
        Row: {
          clerk_id: string
          created_at: string
          id: string
          supabase_id: string
        }
        Insert: {
          clerk_id: string
          created_at?: string
          id?: string
          supabase_id: string
        }
        Update: {
          clerk_id?: string
          created_at?: string
          id?: string
          supabase_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_meta_tracking_table: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_foreign_key_constraints: {
        Args: {
          target_table: string
        }
        Returns: {
          constraint_name: string
          table_name: string
          column_name: string
          foreign_table_name: string
          foreign_column_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
