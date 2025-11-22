export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Products table - stores all automotive products
      products: {
        Row: {
          id: string
          created_at: string
          name: string
          brand: string
          type: 'wheel' | 'tire' | 'suspension' | 'spacer' | 'accessory'
          meta_specs: Json // JSONB field for flexible spec storage
          image_url: string | null
          price: number | null
          rating: number | null
          reviews: number | null
          product_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          brand: string
          type: 'wheel' | 'tire' | 'suspension' | 'spacer' | 'accessory'
          meta_specs: Json
          image_url?: string | null
          price?: number | null
          rating?: number | null
          reviews?: number | null
          product_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          brand?: string
          type?: 'wheel' | 'tire' | 'suspension' | 'spacer' | 'accessory'
          meta_specs?: Json
          image_url?: string | null
          price?: number | null
          rating?: number | null
          reviews?: number | null
          product_url?: string | null
        }
      }
      // Users table - stores user accounts and credits
      users: {
        Row: {
          id: string
          created_at: string
          email: string | null
          credits: number
          subscription_tier: 'free' | 'pro' | 'enterprise' | null
        }
        Insert: {
          id?: string
          created_at?: string
          email?: string | null
          credits?: number
          subscription_tier?: 'free' | 'pro' | 'enterprise' | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string | null
          credits?: number
          subscription_tier?: 'free' | 'pro' | 'enterprise' | null
        }
      }
      // Projects table - stores user visualization projects
      projects: {
        Row: {
          id: string
          created_at: string
          user_id: string
          vehicle_string: string
          current_image_url: string | null
          original_image_url: string | null
          history: Json
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          vehicle_string: string
          current_image_url?: string | null
          original_image_url?: string | null
          history?: Json
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          vehicle_string?: string
          current_image_url?: string | null
          original_image_url?: string | null
          history?: Json
        }
      }
      // Generations table - stores individual generation records
      generations: {
        Row: {
          id: string
          created_at: string
          user_id: string
          product_id: string
          project_id: string | null
          base_image_url: string
          generated_image_url: string | null
          vehicle_string: string
          mechanic_instructions: Json
          generation_metadata: Json
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          product_id: string
          project_id?: string | null
          base_image_url: string
          generated_image_url?: string | null
          vehicle_string: string
          mechanic_instructions: Json
          generation_metadata: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          product_id?: string
          project_id?: string | null
          base_image_url?: string
          generated_image_url?: string | null
          vehicle_string?: string
          mechanic_instructions?: Json
          generation_metadata?: Json
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // Custom function to deduct credits atomically
      deduct_credits: {
        Args: {
          user_id: string
          amount: number
        }
        Returns: void
      }
    }
    Enums: {
      product_type: 'wheel' | 'tire' | 'suspension' | 'spacer' | 'accessory'
      generation_status: 'pending' | 'processing' | 'completed' | 'failed'
      subscription_tier: 'free' | 'pro' | 'enterprise'
    }
  }
}
