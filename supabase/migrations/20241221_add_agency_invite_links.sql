-- Agency Invite Links Table
-- This creates shareable invitation links for agency team management (no email required)

CREATE TABLE IF NOT EXISTS agency_invite_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agency_owner_id TEXT NOT NULL, -- The user who owns the agency
  role_id TEXT NOT NULL REFERENCES agency_roles(id),
  token TEXT NOT NULL UNIQUE, -- Unique token for the invitation link
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agency_invite_links_owner ON agency_invite_links(agency_owner_id);
CREATE INDEX IF NOT EXISTS idx_agency_invite_links_token ON agency_invite_links(token);
CREATE INDEX IF NOT EXISTS idx_agency_invite_links_active ON agency_invite_links(is_active);
CREATE INDEX IF NOT EXISTS idx_agency_invite_links_expires ON agency_invite_links(expires_at);

-- RLS Policies
ALTER TABLE agency_invite_links ENABLE ROW LEVEL SECURITY;

-- Agency invite links policies
CREATE POLICY "Users can manage their agency invite links" ON agency_invite_links
  FOR ALL USING (agency_owner_id = auth.uid());

-- Allow public read access to valid invite links (for join flow)
CREATE POLICY "Public can read valid invite links" ON agency_invite_links
  FOR SELECT USING (
    is_active = true 
    AND expires_at > now() 
    AND current_uses < max_uses
  );

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_agency_invite_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_agency_invite_links_updated_at
  BEFORE UPDATE ON agency_invite_links
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_invite_links_updated_at(); 