import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadIds } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'No leads selected' }, { status: 400 });
    }

    const supabase = createClient();

    // First, get the leads to ensure they belong to the user
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds)
      .eq('user_id', userId);

    if (leadsError || !leads || leads.length === 0) {
      return NextResponse.json({ error: 'Leads not found' }, { status: 404 });
    }

    // Create outreach campaigns for each lead
    const campaignsToInsert = leads.map(lead => ({
      lead_id: lead.id,
      user_id: userId,
      brand_id: lead.brand_id,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: campaigns, error: campaignsError } = await supabase
      .from('outreach_campaigns')
      .insert(campaignsToInsert)
      .select();

    if (campaignsError) {
      console.error('Error creating campaigns:', campaignsError);
      return NextResponse.json({ error: 'Failed to create outreach campaigns' }, { status: 500 });
    }

    // Update leads to mark them as being in outreach
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        outreach_status: 'active',
        updated_at: new Date().toISOString()
      })
      .in('id', leadIds)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating leads:', updateError);
    }

    // Create initial follow-up tasks for high-priority leads
    const highPriorityLeads = leads.filter(lead => lead.lead_score >= 80);
    const tasksToInsert = campaigns
      .filter(campaign => highPriorityLeads.some(lead => lead.id === campaign.lead_id))
      .map(campaign => ({
        campaign_id: campaign.id,
        user_id: userId,
        title: `Initial outreach to ${leads.find(l => l.id === campaign.lead_id)?.business_name}`,
        description: `Send personalized introduction message to establish contact`,
        task_type: 'follow_up',
        priority: 'high',
        status: 'pending',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due in 24 hours
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

    if (tasksToInsert.length > 0) {
      const { error: tasksError } = await supabase
        .from('outreach_tasks')
        .insert(tasksToInsert);

      if (tasksError) {
        console.error('Error creating tasks:', tasksError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${campaigns.length} leads to outreach`,
      campaignsCreated: campaigns.length,
      tasksCreated: tasksToInsert.length
    });

  } catch (error) {
    console.error('Error sending leads to outreach:', error);
    return NextResponse.json({ error: 'Failed to send leads to outreach' }, { status: 500 });
  }
} 