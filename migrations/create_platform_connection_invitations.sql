-- Create platform_connection_invitations table for self-service platform connections
CREATE TABLE IF NOT EXISTS platform_connection_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform_type TEXT NOT NULL CHECK (platform_type IN ('shopify', 'meta')),
  created_by UUID NOT NULL, -- The operator who created the invitation
  brand_owner_email TEXT, -- Optional: email of the brand owner
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'revoked')),
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_platform_connection_invitations_token ON platform_connection_invitations(token);
CREATE INDEX IF NOT EXISTS idx_platform_connection_invitations_brand_id ON platform_connection_invitations(brand_id);
CREATE INDEX IF NOT EXISTS idx_platform_connection_invitations_platform_type ON platform_connection_invitations(platform_type);
CREATE INDEX IF NOT EXISTS idx_platform_connection_invitations_created_by ON platform_connection_invitations(created_by);
CREATE INDEX IF NOT EXISTS idx_platform_connection_invitations_status ON platform_connection_invitations(status);

-- Add comment to the table
COMMENT ON TABLE platform_connection_invitations IS 'Stores invitations for brand owners to self-connect their platforms';

-- Enable RLS
ALTER TABLE platform_connection_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
CREATE POLICY "Users can view invitations they created"
  ON platform_connection_invitations
  FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Users can create invitations for their brands"
  ON platform_connection_invitations
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND 
    brand_id IN (
      SELECT id FROM brands WHERE user_id = auth.uid()
      UNION
      SELECT brand_id FROM brand_access 
      WHERE user_id = auth.uid() AND can_manage_platforms = true AND revoked_at IS NULL
    )
  );

CREATE POLICY "Users can update invitations they created"
  ON platform_connection_invitations
  FOR UPDATE
  USING (created_by = auth.uid());

-- Allow public access to active invitations by token (for brand owners to use)
CREATE POLICY "Public can view active invitations by token"
  ON platform_connection_invitations
  FOR SELECT
  USING (is_active = true AND expires_at > NOW() AND token IS NOT NULL);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_platform_connection_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_platform_connection_invitations_updated_at
  BEFORE UPDATE ON platform_connection_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_connection_invitations_updated_at(); 