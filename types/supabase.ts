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
          is_critical?: boolean
        }
        Insert: {
          id?: string
          name: string
          user_id: string
          created_at?: string
          updated_at?: string
          status?: string
          is_critical?: boolean
        }
        Update: {
          id?: string
          name?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          status?: string
          is_critical?: boolean
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
      creative_generations: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          style_id: string
          style_name: string
          original_image_url: string
          generated_image_url: string
          prompt_used: string
          text_overlays: any
          status: string
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          style_id: string
          style_name: string
          original_image_url: string
          generated_image_url: string
          prompt_used: string
          text_overlays?: any
          status?: string
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          style_id?: string
          style_name?: string
          original_image_url?: string
          generated_image_url?: string
          prompt_used?: string
          text_overlays?: any
          status?: string
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
      copy_creatives: {
        Row: {
          id: string
          brand_id: string
          user_id: string
          reference_image_url: string
          product_image_url: string
          generated_image_url: string
          style_analysis: string
          custom_modifications: string
          status: 'analyzing' | 'generating' | 'completed' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          user_id: string
          reference_image_url: string
          product_image_url: string
          generated_image_url?: string
          style_analysis?: string
          custom_modifications?: string
          status?: 'analyzing' | 'generating' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          user_id?: string
          reference_image_url?: string
          product_image_url?: string
          generated_image_url?: string
          style_analysis?: string
          custom_modifications?: string
          status?: 'analyzing' | 'generating' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
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