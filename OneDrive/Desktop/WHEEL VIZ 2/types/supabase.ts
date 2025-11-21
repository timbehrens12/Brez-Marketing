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
      products: {
        Row: {
          id: string
          created_at: string
          name: string
          brand: string
          category: 'wheel' | 'suspension' | 'tire'
          specs: Json
          image_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          brand: string
          category: 'wheel' | 'suspension' | 'tire'
          specs: Json
          image_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          brand?: string
          category?: 'wheel' | 'suspension' | 'tire'
          specs?: Json
          image_url?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          created_at: string
          user_session_id: string
          current_image_url: string | null
          original_image_url: string | null
          history: Json
        }
        Insert: {
          id?: string
          created_at?: string
          user_session_id: string
          current_image_url?: string | null
          original_image_url?: string | null
          history?: Json
        }
        Update: {
          id?: string
          created_at?: string
          user_session_id?: string
          current_image_url?: string | null
          original_image_url?: string | null
          history?: Json
        }
      }
      generations: {
        Row: {
          id: string
          created_at: string
          project_id: string
          prompt_payload: Json
          result_image_url: string | null
          status: 'pending' | 'completed' | 'failed'
        }
        Insert: {
          id?: string
          created_at?: string
          project_id: string
          prompt_payload: Json
          result_image_url?: string | null
          status?: 'pending' | 'completed' | 'failed'
        }
        Update: {
          id?: string
          created_at?: string
          project_id?: string
          prompt_payload?: Json
          result_image_url?: string | null
          status?: 'pending' | 'completed' | 'failed'
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

