-- Fix platform_connection_invitations table to use TEXT for created_by instead of UUID
-- This aligns with the rest of the system which uses Clerk user IDs in TEXT format

-- Issue: The original migration created the created_by column as UUID, but the system
-- uses Clerk user IDs which are in TEXT format (e.g., "user_2tHp6PPuKFIUImeafbZ8JeIAIVK")
-- This caused "invalid input syntax for type uuid" errors when trying to create invitations

-- First, drop the existing policies that reference the column
DROP POLICY IF EXISTS "Users can view invitations they created" ON platform_connection_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their brands" ON platform_connection_invitations;
DROP POLICY IF EXISTS "Users can update invitations they created" ON platform_connection_invitations;

-- Change the created_by column from UUID to TEXT
ALTER TABLE platform_connection_invitations 
ALTER COLUMN created_by TYPE TEXT USING created_by::text;

-- Recreate the policies with the correct TEXT comparison
CREATE POLICY "Users can view invitations they created"
  ON platform_connection_invitations
  FOR SELECT
  USING (created_by = auth.uid()::text);

CREATE POLICY "Users can create invitations for their brands"
  ON platform_connection_invitations
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()::text AND 
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()::text
      UNION
      SELECT brand_id FROM brand_access 
      WHERE user_id = auth.uid()::text AND can_manage_platforms = true AND revoked_at IS NULL
    )
  );

CREATE POLICY "Users can update invitations they created"
  ON platform_connection_invitations
  FOR UPDATE
  USING (created_by = auth.uid()::text);

-- Verify the fix
COMMENT ON COLUMN platform_connection_invitations.created_by IS 'Clerk user ID of the operator who created the invitation (TEXT format)'; 