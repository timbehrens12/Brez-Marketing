import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    const { data: task, error } = await supabase
      .from('tasks')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error completing task:', error)
      return NextResponse.json(
        { error: 'Failed to complete task' },
        { status: 500 }
      )
    }

    // If this was a follow-up task, create next follow-up if needed
    if (task.task_type === 'follow_up' && task.lead_id) {
      await createNextFollowUpTask(supabase, task.lead_id, task.title)
    }

    return NextResponse.json({
      success: true,
      task
    })

  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function createNextFollowUpTask(supabase: any, leadId: string, previousTitle: string) {
  // Get the lead to check current status
  const { data: lead } = await supabase
    .from('leads')
    .select('business_name, status')
    .eq('id', leadId)
    .single()

  // Only create next follow-up if lead hasn't responded yet
  if (lead && ['new', 'contacted', 'unresponsive'].includes(lead.status)) {
    const nextFollowUpDate = new Date()
    nextFollowUpDate.setDate(nextFollowUpDate.getDate() + 7) // Follow up in a week

    await supabase
      .from('tasks')
      .insert({
        title: `Second follow-up with ${lead.business_name}`,
        description: `Previous follow-up completed. Send second follow-up message or consider different approach.`,
        task_type: 'follow_up',
        priority: 'medium',
        status: 'pending',
        lead_id: leadId,
        due_date: nextFollowUpDate.toISOString().split('T')[0],
        ai_generated: true,
        ai_reasoning: 'Automated second follow-up created after first follow-up was completed without response',
        created_at: new Date().toISOString()
      })
  }
} 