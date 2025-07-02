import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/client';

const supabase = getSupabaseServiceClient();

// Lead management constants
const MAX_PENDING_LEADS = 75; // Maximum pending leads allowed
const MAX_TOTAL_LEADS = 200;  // Maximum total leads in outreach

// Test endpoint to verify route is accessible
export async function GET() {
  return NextResponse.json({ message: 'Send to outreach endpoint is working' });
}

export async function POST(request: NextRequest) {
  try {
    const { leadIds, userId } = await request.json();

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'No leads selected' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    console.log('Processing leads for outreach:', { leadIds: leadIds.length, userId });

    // Get the leads data
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds)
      .eq('user_id', userId);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No valid leads found' }, { status: 404 });
    }

    // ANTI-DUPLICATION CHECK: Check if any of these leads are already in outreach
    const { data: existingOutreachLeads, error: duplicateCheckError } = await supabase
      .from('outreach_campaign_leads')
      .select('lead_id, campaign:outreach_campaigns(name, status)')
      .in('lead_id', leadIds);

    if (duplicateCheckError) {
      console.error('Error checking for duplicates:', duplicateCheckError);
      
      // Check if it's a table doesn't exist error
      if (duplicateCheckError.message?.includes('relation "outreach_campaign_leads" does not exist') ||
          duplicateCheckError.message?.includes('relation "outreach_campaigns" does not exist')) {
        return NextResponse.json({ 
          error: 'Outreach system not set up. Please contact support to initialize the outreach tables.',
          setupRequired: true
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: 'Failed to check for duplicate leads' }, { status: 500 });
    }

    if (existingOutreachLeads && existingOutreachLeads.length > 0) {
      const duplicateLeadIds = existingOutreachLeads.map(ol => ol.lead_id);
      const duplicateCount = duplicateLeadIds.length;
      
      // Get business names for better error message
      const duplicateLeads = leads.filter(lead => duplicateLeadIds.includes(lead.id));
      const duplicateNames = duplicateLeads.map(lead => lead.business_name).slice(0, 3);
      
      const errorMessage = duplicateCount === 1 
        ? `${duplicateNames[0]} is already in your outreach pipeline.`
        : duplicateCount <= 3
        ? `${duplicateNames.join(', ')} are already in your outreach pipeline.`
        : `${duplicateCount} leads are already in your outreach pipeline (including ${duplicateNames.slice(0, 2).join(', ')}).`;

      return NextResponse.json({ 
        error: `${errorMessage} Please select different leads.`,
        duplicateCount,
        duplicateLeads: duplicateNames,
        totalSelected: leadIds.length
      }, { status: 409 }); // 409 Conflict for duplicates
    }

    // Check current outreach limits
    const { data: existingCampaigns, error: campaignsError } = await supabase
      .from('outreach_campaigns')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['active', 'paused']);

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      
      // Check if it's a table doesn't exist error
      if (campaignsError.message?.includes('relation "outreach_campaigns" does not exist')) {
        return NextResponse.json({ 
          error: 'Outreach system not set up. Please contact support to initialize the outreach tables.',
          setupRequired: true
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: 'Failed to check campaign limits' }, { status: 500 });
    }

    if (existingCampaigns && existingCampaigns.length > 0) {
      const campaignIds = existingCampaigns.map((c: any) => c.id);
      
      const { data: existingCampaignLeads } = await supabase
        .from('outreach_campaign_leads')
        .select('status')
        .in('campaign_id', campaignIds);

      if (existingCampaignLeads) {
        const currentTotal = existingCampaignLeads.length;
        const currentPending = existingCampaignLeads.filter((cl: any) => cl.status === 'pending').length;
        
        // Check if adding new leads would exceed limits
        if (currentTotal + leads.length > MAX_TOTAL_LEADS) {
          return NextResponse.json({ 
            error: `Cannot add ${leads.length} leads. You have ${currentTotal} leads in outreach (max: ${MAX_TOTAL_LEADS}). Please complete outreach to existing leads first.`,
            currentTotal,
            maxTotal: MAX_TOTAL_LEADS,
            remainingSlots: MAX_TOTAL_LEADS - currentTotal
          }, { status: 400 });
        }
        
        if (currentPending + leads.length > MAX_PENDING_LEADS) {
          return NextResponse.json({ 
            error: `Cannot add ${leads.length} leads. You have ${currentPending} pending leads (max: ${MAX_PENDING_LEADS}). Please contact existing pending leads first.`,
            currentPending,
            maxPending: MAX_PENDING_LEADS,
            remainingPendingSlots: MAX_PENDING_LEADS - currentPending
          }, { status: 400 });
        }
      }
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
        description: `Campaign for ${leads.length} leads`,
        campaign_type: 'lead_generation',
        status: 'active',
        max_leads: leads.length,
        leads_contacted: 0,
        response_rate: '0%',
        conversion_rate: '0%'
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      
      // Check if it's a table doesn't exist error
      if (campaignError.message?.includes('relation "outreach_campaigns" does not exist')) {
        return NextResponse.json({ 
          error: 'Outreach system not set up. Please contact support to initialize the outreach tables.',
          setupRequired: true
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: 'Failed to create outreach campaign' }, { status: 500 });
    }

    console.log('Created campaign:', campaign.id);

    // Add leads to the campaign
    const campaignLeads = leads.map(lead => ({
      campaign_id: campaign.id,
      lead_id: lead.id,
      status: 'pending',
      added_at: new Date().toISOString()
    }));

    const { data: insertedCampaignLeads, error: campaignLeadsError } = await supabase
      .from('outreach_campaign_leads')
      .insert(campaignLeads)
      .select();

    if (campaignLeadsError) {
      console.error('Error adding leads to campaign:', campaignLeadsError);
      
      // Check if it's a table doesn't exist error
      if (campaignLeadsError.message?.includes('relation "outreach_campaign_leads" does not exist')) {
        return NextResponse.json({ 
          error: 'Outreach system not set up. Please contact support to initialize the outreach tables.',
          setupRequired: true
        }, { status: 503 });
      }
      
      return NextResponse.json({ error: 'Failed to add leads to campaign' }, { status: 500 });
    }

    console.log(`Added ${insertedCampaignLeads.length} leads to campaign`);

    return NextResponse.json({
      success: true,
      message: `Successfully added ${leads.length} leads to outreach campaign`,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        leads_count: leads.length
      },
      tasksCreated: leads.length,
      leadsAdded: insertedCampaignLeads.length
    });

  } catch (error) {
    console.error('Error in send-to-outreach:', error);
    return NextResponse.json({ 
      error: 'Failed to send leads to outreach. Please try again.' 
    }, { status: 500 });
  }
} 