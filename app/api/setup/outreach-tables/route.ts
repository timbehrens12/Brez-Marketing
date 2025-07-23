import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/client';

const supabase = getSupabaseServiceClient();

export async function POST() {
  try {
    console.log('🔧 Setting up outreach tables...');

    // First, check if tables already exist by trying to query them
    const { error: campaignsExistError } = await supabase
      .from('outreach_campaigns')
      .select('id')
      .limit(1);

    if (!campaignsExistError) {
      console.log('✅ Outreach tables already exist');
      return NextResponse.json({
        success: true,
        message: 'Outreach tables already exist and are working properly!',
        alreadyExists: true
      });
    }

    console.log('Creating outreach tables - they do not exist yet');

    // Return instructions for manual setup since we can't execute raw SQL directly
    const setupInstructions = {
      message: 'Outreach tables need to be created manually in Supabase',
      instructions: [
        '1. Go to your Supabase project dashboard',
        '2. Navigate to the SQL Editor',
        '3. Run the following SQL commands in order:'
      ],
      sql: [
        `-- Create outreach_campaigns table
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  brand_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL DEFAULT 'lead_generation',
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',
  max_leads INTEGER DEFAULT 100,
  leads_contacted INTEGER DEFAULT 0,
  response_rate TEXT DEFAULT '0%',
  conversion_rate TEXT DEFAULT '0%',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`,
        
        `-- Create outreach_campaign_leads junction table
CREATE TABLE IF NOT EXISTS outreach_campaign_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'contacted', 'responded', 'qualified', 'signed', 'rejected')) DEFAULT 'pending',
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  outreach_method TEXT CHECK (outreach_method IN ('email', 'phone', 'linkedin', 'instagram', 'facebook')),
  notes TEXT,
  dm_sent INTEGER DEFAULT 0,
  dm_responded INTEGER DEFAULT 0,
  email_sent INTEGER DEFAULT 0,
  email_responded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, lead_id)
);`,

        `-- Create outreach_messages table
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
);`,

        `-- Create outreach_message_usage table for rate limiting
CREATE TABLE IF NOT EXISTS outreach_message_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  estimated_cost DECIMAL(10,4) DEFAULT 0.02
);`,

        `-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_user_id ON outreach_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_status ON outreach_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_brand_id ON outreach_campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaign_leads_campaign_id ON outreach_campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaign_leads_lead_id ON outreach_campaign_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_campaign_leads_status ON outreach_campaign_leads(status);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_campaign_id ON outreach_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_outreach_message_usage_user_id ON outreach_message_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_message_usage_generated_at ON outreach_message_usage(generated_at);`
      ]
    };

    return NextResponse.json({
      success: false,
      setupRequired: true,
      ...setupInstructions
    });

  } catch (error) {
    console.error('❌ Error in outreach setup:', error);
    return NextResponse.json({ 
      error: 'Failed to check outreach setup', 
      details: error 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check if outreach tables exist and are working
    const { error: campaignsError } = await supabase
      .from('outreach_campaigns')
      .select('id')
      .limit(1);

    const { error: campaignLeadsError } = await supabase
      .from('outreach_campaign_leads')
      .select('id')
      .limit(1);

    const { error: messagesError } = await supabase
      .from('outreach_messages')
      .select('id')
      .limit(1);

    const { error: usageError } = await supabase
      .from('outreach_message_usage')
      .select('id')
      .limit(1);

    const tablesExist = {
      outreach_campaigns: !campaignsError,
      outreach_campaign_leads: !campaignLeadsError,
      outreach_messages: !messagesError,
      outreach_message_usage: !usageError
    };

    const allTablesExist = Object.values(tablesExist).every(exists => exists);

    return NextResponse.json({
      success: allTablesExist,
      tablesExist,
      message: allTablesExist 
        ? 'All outreach tables exist and are working properly!'
        : 'Some outreach tables are missing. Please run the setup process.',
      setupRequired: !allTablesExist
    });

  } catch (error) {
    console.error('❌ Error checking outreach tables:', error);
    return NextResponse.json({ 
      error: 'Failed to check outreach tables', 
      details: error 
    }, { status: 500 });
  }
} 