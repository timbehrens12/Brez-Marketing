-- Create outreach_campaigns table
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  brand_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'responded', 'interested', 'negotiating', 'signed', 'lost')),
  last_contact_date TIMESTAMP WITH TIME ZONE,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  deal_value DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outreach_messages table
CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms', 'linkedin', 'call', 'other')),
  subject TEXT,
  content TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'delivered', 'read', 'replied', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create outreach_tasks table
CREATE TABLE IF NOT EXISTS outreach_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('follow_up', 'call', 'research', 'meeting', 'proposal', 'other')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_outreach_campaigns_user_id ON outreach_campaigns(user_id);
CREATE INDEX idx_outreach_campaigns_status ON outreach_campaigns(status);
CREATE INDEX idx_outreach_campaigns_next_follow_up ON outreach_campaigns(next_follow_up_date);
CREATE INDEX idx_outreach_messages_campaign_id ON outreach_messages(campaign_id);
CREATE INDEX idx_outreach_tasks_user_id ON outreach_tasks(user_id);
CREATE INDEX idx_outreach_tasks_due_date ON outreach_tasks(due_date);
CREATE INDEX idx_outreach_tasks_status ON outreach_tasks(status);

-- Add outreach_status column to leads table if it doesn't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS outreach_status TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE; 