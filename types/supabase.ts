export type Database = {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          name: string
          user_id: string
          created_at: string
          updated_at: string
          status: string
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          created_at?: string
          updated_at?: string
          status?: string
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          status?: string
        }
      }
      ai_marketing_reports: {
        Row: {
          id: string
          brand_id: string
          date_range_from: string
          date_range_to: string
          period_name: string
          raw_response: string
          formatted_report: string
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          date_range_from: string
          date_range_to: string
          period_name: string
          raw_response: string
          formatted_report: string
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          date_range_from?: string
          date_range_to?: string
          period_name?: string
          raw_response?: string
          formatted_report?: string
          metadata?: any
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 