-- ============================================
-- WHEEL VIZ 2 - Supabase Database Schema
-- ============================================
-- This file contains the complete database schema for the Wheel Viz 2 application.
-- Run this in your Supabase SQL Editor to set up the database.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE product_type AS ENUM ('wheel', 'tire', 'suspension', 'spacer', 'accessory');
CREATE TYPE generation_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- ============================================
-- TABLES
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT UNIQUE,
  credits INTEGER DEFAULT 10, -- Free tier starts with 10 credits
  subscription_tier subscription_tier DEFAULT 'free',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  type product_type NOT NULL,
  meta_specs JSONB NOT NULL DEFAULT '{}', -- Flexible spec storage
  image_url TEXT,
  price NUMERIC(10, 2),
  rating NUMERIC(3, 2) CHECK (rating >= 0 AND rating <= 5),
  reviews INTEGER DEFAULT 0,
  product_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_string TEXT NOT NULL, -- e.g., "2020 Ford F-150 XLT"
  current_image_url TEXT,
  original_image_url TEXT,
  history JSONB DEFAULT '[]', -- Array of generation IDs
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generations Table
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  base_image_url TEXT NOT NULL,
  generated_image_url TEXT,
  vehicle_string TEXT NOT NULL,
  mechanic_instructions JSONB NOT NULL, -- Output from Virtual Mechanic
  generation_metadata JSONB NOT NULL, -- Output from Renderer
  status generation_status DEFAULT 'pending',
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_product_id ON generations(product_id);
CREATE INDEX IF NOT EXISTS idx_generations_project_id ON generations(project_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to deduct credits atomically
CREATE OR REPLACE FUNCTION deduct_credits(
  user_id UUID,
  amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET credits = credits - amount,
      updated_at = NOW()
  WHERE id = user_id
    AND credits >= amount;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits or user not found';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generations_updated_at
  BEFORE UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Products are readable by everyone
CREATE POLICY "Products are publicly readable"
  ON products FOR SELECT
  TO authenticated, anon
  USING (true);

-- Projects are readable by owner
CREATE POLICY "Users can read own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

-- Projects are insertable by owner
CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Projects are updatable by owner
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Generations are readable by owner
CREATE POLICY "Users can read own generations"
  ON generations FOR SELECT
  USING (auth.uid() = user_id);

-- Generations are insertable by owner
CREATE POLICY "Users can create own generations"
  ON generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SEED DATA (Optional - for development)
-- ============================================

-- Insert sample products (uncomment to use)
/*
INSERT INTO products (name, brand, type, meta_specs, image_url, price, rating, reviews, product_url) VALUES
  (
    'Kinetic',
    'Anovia',
    'wheel',
    '{"diameter": 18, "width": 9.5, "offset": 35, "boltPattern": "5x114.3", "finish": "Deco Directional"}',
    'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Anovia+Kinetic',
    270.00,
    4.5,
    342,
    'https://www.fitmentindustries.com/buy-wheels/anovia-kinetic'
  ),
  (
    'BR Series Coilovers',
    'BC Racing',
    'suspension',
    '{"type": "Coilovers", "frontLowering": "1.0-3.0\"", "rearLowering": "1.0-3.0\"", "springRate": "10K/8K", "adjustable": "30-Way Damping", "warranty": "1 Year"}',
    'https://placehold.co/400x400/1a1a1a/8B5CF6?text=BC+Racing+BR',
    1195.00,
    4.7,
    892,
    'https://www.fitmentindustries.com/brands/bc-racing'
  );
*/

-- Create a test user (uncomment to use)
/*
INSERT INTO users (email, credits, subscription_tier) VALUES
  ('test@wheelvisualize.com', 100, 'pro');
*/

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. Make sure to set up your Supabase environment variables in .env.local:
--    - NEXT_PUBLIC_SUPABASE_URL
--    - NEXT_PUBLIC_SUPABASE_ANON_KEY
--    - SUPABASE_SERVICE_ROLE_KEY
--
-- 2. The deduct_credits function ensures atomic credit deduction
--    to prevent race conditions.
--
-- 3. RLS policies ensure users can only access their own data.
--
-- 4. The meta_specs JSONB field allows flexible storage of product
--    specifications without schema changes.
--
-- 5. For production, consider adding:
--    - Backup policies
--    - Audit logging
--    - Rate limiting
--    - Credit purchase history table
--    - User authentication integration

