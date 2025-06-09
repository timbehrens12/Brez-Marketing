import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leadIds } = await request.json()

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'Invalid lead IDs' }, { status: 400 })
    }

    // Verify that the leads belong to the user's searches
    const { data: leads, error: leadsError } = await supabase
      .from('generated_leads')
      .select(`
        id,
        search_id,
        lead_generation_searches!inner(user_id)
      `)
      .in('id', leadIds)

    if (leadsError) {
      console.error('Error fetching leads:', leadsError)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    // Check if all leads belong to the current user
    const unauthorizedLeads = leads?.filter(lead => 
      (lead as any).lead_generation_searches.user_id !== userId
    )

    if (unauthorizedLeads && unauthorizedLeads.length > 0) {
      return NextResponse.json({ error: 'Unauthorized access to leads' }, { status: 403 })
    }

    // Update leads to mark as sent to outreach
    const { error: updateError } = await supabase
      .from('generated_leads')
      .update({ sent_to_outreach: true })
      .in('id', leadIds)

    if (updateError) {
      console.error('Error updating leads:', updateError)
      return NextResponse.json({ error: 'Failed to update leads' }, { status: 500 })
    }

    // Here you could also create outreach campaign records
    // or integrate with email marketing tools

    return NextResponse.json({ 
      success: true,
      message: `${leadIds.length} leads sent to outreach manager`
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 