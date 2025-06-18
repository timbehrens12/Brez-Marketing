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

    // Get the brand_id from the first lead (assuming all leads are for the same brand)
    const brandId = leads[0].brand_id;

    // Create a single outreach campaign for these leads
    const campaignName = `Outreach Campaign - ${new Date().toLocaleDateString()}`;
    const { data: campaign, error: campaignError } = await supabase
      .from('outreach_campaigns')
      .insert({
        user_id: userId,
        brand_id: brandId,
        name: campaignName,
        description: `Automated outreach campaign for ${leads.length} leads`,
        campaign_type: 'lead_generation',
        status: 'active',
        max_leads: leads.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      console.error('Error creating campaign:', campaignError);
      return NextResponse.json({ error: 'Failed to create outreach campaign' }, { status: 500 });
    }

    // Link leads to the campaign through the junction table
    const campaignLeadsToInsert = leads.map(lead => ({
      campaign_id: campaign.id,
      lead_id: lead.id,
      status: 'pending',
      added_at: new Date().toISOString(),
      next_follow_up_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error: campaignLeadsError } = await supabase
      .from('outreach_campaign_leads')
      .insert(campaignLeadsToInsert);

    if (campaignLeadsError) {
      console.error('Error linking leads to campaign:', campaignLeadsError);
      return NextResponse.json({ error: 'Failed to link leads to campaign' }, { status: 500 });
    }

    // Update leads to mark them as being in outreach
    const { error: updateError } = await supabase
      .from('leads')
      .update({ 
        outreach_status: 'contacted',
        last_contacted_at: new Date().toISOString(),
        next_follow_up_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', leadIds)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating leads:', updateError);
    }

    // Create initial follow-up tasks for high-priority leads
    const highPriorityLeads = leads.filter(lead => lead.lead_score >= 80);
    const tasksToInsert = highPriorityLeads.map(lead => ({
      user_id: userId,
      brand_id: brandId,
      campaign_id: campaign.id,
      lead_id: lead.id,
      title: `Initial outreach to ${lead.business_name}`,
      description: `Send personalized introduction message to establish contact with ${lead.business_name}`,
      task_type: 'outreach',
      priority: 'high',
      status: 'pending',
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due in 24 hours
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    if (tasksToInsert.length > 0) {
      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(tasksToInsert);

      if (tasksError) {
        console.error('Error creating tasks:', tasksError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${leads.length} leads to outreach campaign "${campaignName}"`,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        leadsCount: leads.length
      },
      leadsProcessed: leads.length,
      tasksCreated: tasksToInsert.length
    });

  } catch (error) {
    console.error('Error sending leads to outreach:', error);
    return NextResponse.json({ error: 'Failed to send leads to outreach' }, { status: 500 });
  }
} 