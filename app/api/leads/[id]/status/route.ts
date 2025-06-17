import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json()
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // Update lead status
    const { data: lead, error } = await supabase
      .from('leads')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating lead status:', error)
      return NextResponse.json(
        { error: 'Failed to update lead status' },
        { status: 500 }
      )
    }

    // Create automated tasks based on status change
    await createStatusBasedTasks(supabase, params.id, status, lead.business_name)

    return NextResponse.json({
      success: true,
      lead
    })

  } catch (error) {
    console.error('Error updating lead status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function createStatusBasedTasks(supabase: any, leadId: string, status: string, businessName: string) {
  const now = new Date()
  const tasks = []

  switch (status) {
    case 'responded':
      // Create task to qualify the lead
      tasks.push({
        title: `Qualify ${businessName} lead`,
        description: `Lead has responded! Follow up to qualify their needs and budget.`,
        task_type: 'outreach',
        priority: 'high',
        status: 'pending',
        lead_id: leadId,
        due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        ai_generated: true,
        ai_reasoning: 'Lead responded and needs immediate follow-up to qualify',
        created_at: now.toISOString()
      })
      break

    case 'qualified':
      // Create task to send proposal
      tasks.push({
        title: `Prepare proposal for ${businessName}`,
        description: `Lead is qualified! Create and send proposal with pricing and next steps.`,
        task_type: 'outreach',
        priority: 'high',
        status: 'pending',
        lead_id: leadId,
        due_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days
        ai_generated: true,
        ai_reasoning: 'Qualified lead needs proposal to move forward',
        created_at: now.toISOString()
      })
      break

    case 'proposal_sent':
      // Create follow-up task
      tasks.push({
        title: `Follow up on proposal with ${businessName}`,
        description: `Check if they've reviewed the proposal and answer any questions.`,
        task_type: 'follow_up',
        priority: 'medium',
        status: 'pending',
        lead_id: leadId,
        due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days
        ai_generated: true,
        ai_reasoning: 'Proposal sent, follow-up needed to close deal',
        created_at: now.toISOString()
      })
      break

    case 'negotiating':
      // Create task to address objections
      tasks.push({
        title: `Address concerns for ${businessName}`,
        description: `Lead is negotiating! Address their concerns and close the deal.`,
        task_type: 'outreach',
        priority: 'high',
        status: 'pending',
        lead_id: leadId,
        due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        ai_generated: true,
        ai_reasoning: 'Lead is negotiating, immediate attention needed to close',
        created_at: now.toISOString()
      })
      break

    case 'unresponsive':
      // Create task for different outreach approach
      tasks.push({
        title: `Try different approach with ${businessName}`,
        description: `Lead is unresponsive. Try different message type or channel.`,
        task_type: 'outreach',
        priority: 'low',
        status: 'pending',
        lead_id: leadId,
        due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week
        ai_generated: true,
        ai_reasoning: 'Lead unresponsive, needs different outreach strategy',
        created_at: now.toISOString()
      })
      break

    case 'signed':
      // Create onboarding task
      tasks.push({
        title: `Begin onboarding for ${businessName}`,
        description: `Congratulations! ${businessName} signed. Start onboarding process.`,
        task_type: 'custom',
        priority: 'high',
        status: 'pending',
        lead_id: leadId,
        due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        ai_generated: true,
        ai_reasoning: 'New client needs immediate onboarding',
        created_at: now.toISOString()
      })
      break
  }

  if (tasks.length > 0) {
    await supabase
      .from('tasks')
      .insert(tasks)
  }
} 