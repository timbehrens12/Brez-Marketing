import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get leads with outreach-specific data and calculate lead scores
    // Only show leads that have been imported to outreach
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        *,
        outreach_messages (
          id,
          message_type,
          status,
          created_at,
          sent_at,
          replied_at
        ),
        tasks (
          id,
          title,
          status,
          due_date,
          ai_generated
        )
      `)
      .eq('imported_to_outreach', true) // Only show leads imported to outreach
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    // Enhance leads with outreach-specific data
    const enhancedLeads = leads?.map(lead => ({
      ...lead,
      // Calculate lead score based on various factors
      lead_score: calculateLeadScore(lead),
      
      // Determine priority based on various factors
      priority: calculatePriority(lead),
      
      // Ensure status is properly set for outreach workflow
      status: lead.status || 'new',
      
      // Count of outreach attempts
      outreach_count: lead.outreach_messages?.length || 0,
      
      // Last outreach date
      last_contacted_at: getLastContactDate(lead.outreach_messages),
      
      // Has pending tasks
      has_pending_tasks: lead.tasks?.some((task: any) => task.status === 'pending') || false
    })) || []

    return NextResponse.json(enhancedLeads)

  } catch (error) {
    console.error('Error in outreach leads API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { leadIds } = await request.json()
    
    if (!leadIds || !Array.isArray(leadIds)) {
      return NextResponse.json(
        { error: 'Invalid lead IDs provided' },
        { status: 400 }
      )
    }

    const supabase = createClient()
    
    // Import leads to outreach by updating their status
    const { data, error } = await supabase
      .from('leads')
      .update({ 
        imported_to_outreach: true,
        imported_to_outreach_at: new Date().toISOString()
      })
      .in('id', leadIds)
      .select()

    if (error) {
      console.error('Error importing leads to outreach:', error)
      return NextResponse.json(
        { error: 'Failed to import leads' },
        { status: 500 }
      )
    }

    // Create initial tasks for each imported lead
    const tasks = leadIds.map(leadId => ({
      title: 'Research and prepare outreach message',
      description: 'Review lead profile and prepare personalized outreach strategy',
      task_type: 'lead_research',
      priority: 'medium',
      status: 'pending',
      lead_id: leadId,
      ai_generated: true,
      ai_reasoning: 'Initial research task created when lead was imported to outreach',
      created_at: new Date().toISOString()
    }))

    await supabase
      .from('tasks')
      .insert(tasks)

    return NextResponse.json({
      success: true,
      imported_count: data?.length || 0,
      message: `Successfully imported ${data?.length || 0} leads to outreach`
    })

  } catch (error) {
    console.error('Error importing leads to outreach:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateLeadScore(lead: any): number {
  let score = 50 // Base score

  // Website presence
  if (lead.website) score += 15

  // Contact information completeness
  if (lead.email) score += 10
  if (lead.phone) score += 10
  if (lead.owner_name) score += 5

  // Social media presence
  if (lead.instagram_handle) score += 5
  if (lead.facebook_page) score += 5
  if (lead.linkedin_profile) score += 5

  // Location data
  if (lead.city && lead.state_province) score += 5

  // Business type premium niches
  const premiumNiches = ['restaurants', 'fitness', 'beauty', 'automotive', 'real estate', 'healthcare']
  if (premiumNiches.includes(lead.niche_name?.toLowerCase())) score += 10

  // Previous outreach response (if any)
  const hasResponded = lead.outreach_messages?.some((msg: any) => msg.status === 'replied')
  if (hasResponded) score += 20

  // Cap the score at 100
  return Math.min(score, 100)
}

function calculatePriority(lead: any): 'low' | 'medium' | 'high' {
  const score = calculateLeadScore(lead)
  
  // High value indicators
  const hasWebsite = !!lead.website
  const hasMultipleSocials = [lead.instagram_handle, lead.facebook_page, lead.linkedin_profile].filter(Boolean).length >= 2
  const isResponseiveLead = lead.outreach_messages?.some((msg: any) => msg.status === 'replied')
  
  if (score >= 80 || isResponseiveLead) return 'high'
  if (score >= 60 || hasWebsite || hasMultipleSocials) return 'medium'
  return 'low'
}

function getLastContactDate(messages: any[]): string | null {
  if (!messages || messages.length === 0) return null
  
  const sentMessages = messages.filter(msg => msg.sent_at)
  if (sentMessages.length === 0) return null
  
  return sentMessages
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
    .sent_at
} 