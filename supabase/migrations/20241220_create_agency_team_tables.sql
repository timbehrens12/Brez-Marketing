-- Agency Team Management Tables
-- This creates the structure for adding team members to entire agencies

-- Agency roles definition table
CREATE TABLE IF NOT EXISTS agency_roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default roles
INSERT INTO agency_roles (name, description, permissions, is_default) VALUES 
('owner', 'Full access to everything including team management', '{"all": true}', false),
('admin', 'Full access except team management', '{"brands": "all", "analytics": true, "reports": true, "campaigns": true, "settings": true}', false),
('media_buyer', 'Access to campaigns and analytics, limited brand management', '{"brands": "view", "analytics": true, "reports": true, "campaigns": true, "settings": false}', true),
('analyst', 'View-only access to analytics and reports', '{"brands": "view", "analytics": true, "reports": true, "campaigns": false, "settings": false}', false),
('viewer', 'Basic view access', '{"brands": "view", "analytics": false, "reports": true, "campaigns": false, "settings": false}', false);

-- Agency team members table
CREATE TABLE IF NOT EXISTS agency_team_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agency_owner_id TEXT NOT NULL, -- The user who owns the agency
  member_user_id TEXT, -- Clerk user ID of the team member (null if invitation pending)
  member_email TEXT NOT NULL, -- Email address for invitation
  role_id TEXT NOT NULL REFERENCES agency_roles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  invitation_token TEXT UNIQUE, -- Token for accepting invitation
  invitation_expires_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one record per agency-member combination
  UNIQUE(agency_owner_id, member_email)
);

-- Agency settings update to include team features
ALTER TABLE agency_settings 
ADD COLUMN IF NOT EXISTS team_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_team_members INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS team_created_at TIMESTAMPTZ DEFAULT now();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agency_team_members_owner ON agency_team_members(agency_owner_id);
CREATE INDEX IF NOT EXISTS idx_agency_team_members_user ON agency_team_members(member_user_id);
CREATE INDEX IF NOT EXISTS idx_agency_team_members_email ON agency_team_members(member_email);
CREATE INDEX IF NOT EXISTS idx_agency_team_members_token ON agency_team_members(invitation_token);
CREATE INDEX IF NOT EXISTS idx_agency_team_members_status ON agency_team_members(status);

-- RLS Policies
ALTER TABLE agency_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_roles ENABLE ROW LEVEL SECURITY;

-- Agency team members policies
CREATE POLICY "Users can view their agency team" ON agency_team_members
  FOR SELECT USING (
    agency_owner_id = auth.uid() 
    OR member_user_id = auth.uid()
  );

CREATE POLICY "Agency owners can manage their team" ON agency_team_members
  FOR ALL USING (agency_owner_id = auth.uid());

CREATE POLICY "Team members can view their own record" ON agency_team_members
  FOR SELECT USING (member_user_id = auth.uid());

-- Agency roles policies (read-only for most users)
CREATE POLICY "Anyone can view agency roles" ON agency_roles
  FOR SELECT USING (true);

-- Function to get user's agency role
CREATE OR REPLACE FUNCTION get_user_agency_role(user_id TEXT, owner_id TEXT)
RETURNS TEXT AS $$
BEGIN
  -- If user is the owner, return owner role
  IF user_id = owner_id THEN
    RETURN 'owner';
  END IF;
  
  -- Otherwise check team membership
  RETURN (
    SELECT ar.name 
    FROM agency_team_members atm
    JOIN agency_roles ar ON atm.role_id = ar.id
    WHERE atm.agency_owner_id = owner_id 
    AND atm.member_user_id = user_id 
    AND atm.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has agency permission
CREATE OR REPLACE FUNCTION check_agency_permission(user_id TEXT, owner_id TEXT, permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_permissions JSONB;
BEGIN
  -- Get user's role
  user_role := get_user_agency_role(user_id, owner_id);
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Owner has all permissions
  IF user_role = 'owner' THEN
    RETURN true;
  END IF;
  
  -- Get role permissions
  SELECT permissions INTO role_permissions
  FROM agency_roles 
  WHERE name = user_role;
  
  -- Check if user has the specific permission
  RETURN (
    role_permissions->>'all' = 'true' OR
    role_permissions->>permission = 'true' OR
    role_permissions->>permission = 'all'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agency_team_members_updated_at 
  BEFORE UPDATE ON agency_team_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_roles_updated_at 
  BEFORE UPDATE ON agency_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 