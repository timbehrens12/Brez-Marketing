import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get all leads with their outreach data (only those imported to outreach)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select(`
        id,
        status,
        created_at,
        niche_name,
        outreach_messages (
          id,
          message_type,
          status,
          created_at,
          sent_at,
          replied_at
        )
      `)
      .eq('imported_to_outreach', true) // Only analyze leads in outreach system

    if (leadsError) {
      console.error('Error fetching leads for analytics:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      )
    }

    // Calculate analytics
    const analytics = calculateOutreachAnalytics(leads || [])

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Error in outreach analytics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateOutreachAnalytics(leads: any[]) {
  const totalLeads = leads.length
  const contactedLeads = leads.filter(lead => 
    ['contacted', 'responded', 'qualified', 'proposal_sent', 'negotiating', 'signed'].includes(lead.status)
  ).length
  
  const respondedLeads = leads.filter(lead => 
    ['responded', 'qualified', 'proposal_sent', 'negotiating', 'signed'].includes(lead.status)
  ).length
  
  const qualifiedLeads = leads.filter(lead => 
    ['qualified', 'proposal_sent', 'negotiating', 'signed'].includes(lead.status)
  ).length
  
  const signedLeads = leads.filter(lead => lead.status === 'signed').length
  
  // Calculate response rate
  const responseRate = contactedLeads > 0 ? Math.round((respondedLeads / contactedLeads) * 100) : 0
  
  // Calculate conversion rate (signed / total contacted)
  const conversionRate = contactedLeads > 0 ? Math.round((signedLeads / contactedLeads) * 100) : 0
  
  // Calculate average response time
  const avgResponseTime = calculateAverageResponseTime(leads)
  
  // Weekly performance data
  const weeklyData = calculateWeeklyPerformance(leads)
  
  // Message type performance
  const messageTypePerformance = calculateMessageTypePerformance(leads)
  
  return {
    total_leads: totalLeads,
    contacted_leads: contactedLeads,
    responded_leads: respondedLeads,
    qualified_leads: qualifiedLeads,
    signed_leads: signedLeads,
    response_rate: responseRate,
    conversion_rate: conversionRate,
    avg_response_time: avgResponseTime,
    weekly_data: weeklyData,
    message_type_performance: messageTypePerformance,
    
    // Additional metrics
    pipeline_value: signedLeads * 5000, // Assume $5k average deal size
    pending_follow_ups: calculatePendingFollowUps(leads),
    top_performing_niches: calculateTopNiches(leads)
  }
}

function calculateAverageResponseTime(leads: any[]): number {
  const responseTimes: number[] = []
  
  leads.forEach(lead => {
    if (lead.outreach_messages) {
      lead.outreach_messages.forEach((message: any) => {
        if (message.sent_at && message.replied_at) {
          const sentTime = new Date(message.sent_at).getTime()
          const repliedTime = new Date(message.replied_at).getTime()
          const responseTimeHours = (repliedTime - sentTime) / (1000 * 60 * 60)
          responseTimes.push(responseTimeHours)
        }
      })
    }
  })
  
  if (responseTimes.length === 0) return 0
  
  const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
  return Math.round(avgTime)
}

function calculateWeeklyPerformance(leads: any[]) {
  const weeks = []
  const now = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (i * 7))
    weekStart.setHours(0, 0, 0, 0)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    
    const weekLeads = leads.filter(lead => {
      const createdAt = new Date(lead.created_at)
      return createdAt >= weekStart && createdAt <= weekEnd
    })
    
    const weekResponded = weekLeads.filter(lead => 
      ['responded', 'qualified', 'proposal_sent', 'negotiating', 'signed'].includes(lead.status)
    ).length
    
    weeks.push({
      week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      leads: weekLeads.length,
      responded: weekResponded,
      response_rate: weekLeads.length > 0 ? Math.round((weekResponded / weekLeads.length) * 100) : 0
    })
  }
  
  return weeks
}

function calculateMessageTypePerformance(leads: any[]) {
  const messageTypes = ['email', 'linkedin_dm', 'instagram_dm', 'facebook_dm', 'cold_call_script']
  
  return messageTypes.map(type => {
    let sent = 0
    let replied = 0
    
    leads.forEach(lead => {
      if (lead.outreach_messages) {
        const typeMessages = lead.outreach_messages.filter((msg: any) => msg.message_type === type)
        sent += typeMessages.length
        replied += typeMessages.filter((msg: any) => msg.status === 'replied').length
      }
    })
    
    return {
      type,
      sent,
      replied,
      response_rate: sent > 0 ? Math.round((replied / sent) * 100) : 0
    }
  })
}

function calculatePendingFollowUps(leads: any[]): number {
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  
  return leads.filter(lead => {
    if (!['contacted', 'unresponsive'].includes(lead.status)) return false
    
    // Check if lead was contacted but hasn't been followed up recently
    const hasRecentMessages = lead.outreach_messages?.some((msg: any) => {
      const sentAt = new Date(msg.sent_at)
      return sentAt >= threeDaysAgo
    })
    
    return !hasRecentMessages
  }).length
}

function calculateTopNiches(leads: any[]) {
  const nicheStats: { [key: string]: { total: number, signed: number } } = {}
  
  leads.forEach(lead => {
    const niche = lead.niche_name || 'Unknown'
    if (!nicheStats[niche]) {
      nicheStats[niche] = { total: 0, signed: 0 }
    }
    nicheStats[niche].total++
    if (lead.status === 'signed') {
      nicheStats[niche].signed++
    }
  })
  
  return Object.entries(nicheStats)
    .map(([niche, stats]) => ({
      niche,
      total: stats.total,
      signed: stats.signed,
      conversion_rate: stats.total > 0 ? Math.round((stats.signed / stats.total) * 100) : 0
    }))
    .sort((a, b) => b.conversion_rate - a.conversion_rate)
    .slice(0, 5)
} 