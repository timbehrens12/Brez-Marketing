-- Fix RLS Issues for Brand Access and Share Links Tables
-- This script addresses the Supabase security errors for tables without RLS enabled

-- 1. Enable RLS on brand_access table
ALTER TABLE public.brand_access ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on brand_share_links table  
ALTER TABLE public.brand_share_links ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for brand_access table

-- Policy for users to view brand access where they are the user being granted access
CREATE POLICY "Users can view their own brand access"
  ON public.brand_access
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- Policy for users to view brand access for brands they own
CREATE POLICY "Brand owners can view access to their brands"
  ON public.brand_access
  FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()::text
    )
  );

-- Policy for users to insert brand access for brands they own or have admin access to
CREATE POLICY "Brand owners and admins can grant access"
  ON public.brand_access
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()::text
    )
    OR 
    brand_id IN (
      SELECT brand_id FROM public.brand_access 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin' 
      AND revoked_at IS NULL
    )
  );

-- Policy for users to update brand access for brands they own or have admin access to
CREATE POLICY "Brand owners and admins can update access"
  ON public.brand_access
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()::text
    )
    OR 
    brand_id IN (
      SELECT brand_id FROM public.brand_access 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin' 
      AND revoked_at IS NULL
    )
  );

-- Policy for users to delete brand access for brands they own or have admin access to
CREATE POLICY "Brand owners and admins can revoke access"
  ON public.brand_access
  FOR DELETE
  USING (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()::text
    )
    OR 
    brand_id IN (
      SELECT brand_id FROM public.brand_access 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin' 
      AND revoked_at IS NULL
    )
  );

-- 4. Create RLS policies for brand_share_links table

-- Policy for users to view share links for brands they own or have admin access to
CREATE POLICY "Brand owners and admins can view share links"
  ON public.brand_share_links
  FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()::text
    )
    OR 
    brand_id IN (
      SELECT brand_id FROM public.brand_access 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin' 
      AND revoked_at IS NULL
    )
  );

-- Policy for users to create share links for brands they own or have admin access to
CREATE POLICY "Brand owners and admins can create share links"
  ON public.brand_share_links
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()::text
    )
    OR 
    brand_id IN (
      SELECT brand_id FROM public.brand_access 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin' 
      AND revoked_at IS NULL
    )
  );

-- Policy for users to update share links for brands they own or have admin access to
CREATE POLICY "Brand owners and admins can update share links"
  ON public.brand_share_links
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()::text
    )
    OR 
    brand_id IN (
      SELECT brand_id FROM public.brand_access 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin' 
      AND revoked_at IS NULL
    )
  );

-- Policy for users to delete share links for brands they own or have admin access to
CREATE POLICY "Brand owners and admins can delete share links"
  ON public.brand_share_links
  FOR DELETE
  USING (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()::text
    )
    OR 
    brand_id IN (
      SELECT brand_id FROM public.brand_access 
      WHERE user_id = auth.uid()::text 
      AND role = 'admin' 
      AND revoked_at IS NULL
    )
  );

-- 5. Create service role policies to ensure server-side operations work

-- Service role policies for brand_access
CREATE POLICY "Service role can access all brand_access"
  ON public.brand_access
  FOR ALL
  USING (auth.role() = 'service_role');

-- Service role policies for brand_share_links  
CREATE POLICY "Service role can access all brand_share_links"
  ON public.brand_share_links
  FOR ALL
  USING (auth.role() = 'service_role');

-- 6. Create anonymous access policies for specific operations (like joining via share links)

-- Allow anonymous users to read share links (needed for join functionality)
CREATE POLICY "Anonymous can read active share links"
  ON public.brand_share_links
  FOR SELECT
  TO anon
  USING (is_active = true AND expires_at > NOW());

-- 7. Verify RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM 
  pg_tables 
WHERE 
  schemaname = 'public' AND 
  tablename IN ('brand_access', 'brand_share_links');

-- Add comments for documentation
COMMENT ON TABLE public.brand_access IS 'Stores user access permissions to brands with RLS enabled';
COMMENT ON TABLE public.brand_share_links IS 'Stores brand sharing invitation links with RLS enabled'; 