import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    // Get recent optimization actions
    const { data: actions, error } = await supabase
      .from('optimization_action_log')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching action log:', error)
      return NextResponse.json({ error: 'Failed to fetch action log' }, { status: 500 })
    }

    // Format actions for display
    const formattedActions = actions.map(action => ({
      id: action.id,
      type: action.action_type,
      campaignId: action.campaign_id,
      description: getActionDescription(action),
      status: action.status,
      appliedAt: action.applied_at,
      revertedAt: action.reverted_at,
      impact: action.action_details.impact,
      canRevert: action.status === 'applied' && !action.reverted_at && isRecentAction(action.applied_at)
    }))

    return NextResponse.json({ actions: formattedActions })

  } catch (error) {
    console.error('Error fetching action log:', error)
    return NextResponse.json({ error: 'Failed to fetch action log' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, actionId, brandId } = await request.json()

    if (action === 'revert' && actionId) {
      // Revert an optimization action
      const { data: actionLog, error: fetchError } = await supabase
        .from('optimization_action_log')
        .select('*')
        .eq('id', actionId)
        .eq('user_id', userId)
        .eq('brand_id', brandId)
        .single()

      if (fetchError || !actionLog) {
        return NextResponse.json({ error: 'Action not found' }, { status: 404 })
      }

      if (actionLog.status !== 'applied' || actionLog.reverted_at) {
        return NextResponse.json({ error: 'Action cannot be reverted' }, { status: 400 })
      }

      // Check if action is recent enough to revert (within 24 hours)
      if (!isRecentAction(actionLog.applied_at)) {
        return NextResponse.json({ error: 'Action too old to revert' }, { status: 400 })
      }

      // Update action log
      const { error: updateError } = await supabase
        .from('optimization_action_log')
        .update({
          status: 'reverted',
          reverted_at: new Date().toISOString()
        })
        .eq('id', actionId)

      if (updateError) {
        console.error('Error reverting action:', updateError)
        return NextResponse.json({ error: 'Failed to revert action' }, { status: 500 })
      }

      // In a real implementation, this would integrate with the ads platform API to actually revert changes
      
      return NextResponse.json({ 
        success: true, 
        message: 'Action reverted successfully' 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error handling action log request:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

function getActionDescription(action: any): string {
  const details = action.action_details
  const type = action.action_type

  switch (type) {
    case 'budget_increase':
      return `Increased daily budget from $${details.oldBudget || 0} to $${details.newBudget || 0}`
    case 'creative_refresh':
      return `Added new ad creatives to improve CTR`
    case 'audience_expansion':
      return `Expanded audience targeting to reach more users`
    case 'frequency_optimization':
      return `Set frequency cap to ${details.frequencyCap || 3} impressions per ${details.period || 7} days`
    case 'bid_optimization':
      return `Adjusted bid strategy to ${details.bidStrategy || 'automatic'}`
    default:
      return `Applied ${type} optimization`
  }
}

function isRecentAction(appliedAt: string | null): boolean {
  if (!appliedAt) return false
  
  const actionTime = new Date(appliedAt)
  const now = new Date()
  const hoursDiff = (now.getTime() - actionTime.getTime()) / (1000 * 60 * 60)
  
  return hoursDiff <= 24 // Can revert within 24 hours
}
