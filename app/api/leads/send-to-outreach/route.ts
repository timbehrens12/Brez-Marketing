import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leadId }: { leadId: string } = await request.json()

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    // Update the lead to mark it as sent to outreach
    const { data: updatedLead, error } = await supabase
      .from('generated_leads')
      .update({
        is_sent_to_outreach: true,
        sent_to_outreach_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .eq('user_id', userId) // Ensure user can only update their own leads
      .select()
      .single()

    if (error) {
      console.error('Error updating lead:', error)
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }

    if (!updatedLead) {
      return NextResponse.json({ error: 'Lead not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      lead: updatedLead
    })

  } catch (error) {
    console.error('Send to outreach error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 