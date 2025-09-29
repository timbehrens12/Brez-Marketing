import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
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

    const { action, recommendationId, reason } = await request.json()

    if (!recommendationId) {
      return NextResponse.json({ error: 'Recommendation ID is required' }, { status: 400 })
    }

    console.log(`[Recommendation Action] ${action} for recommendation ${recommendationId}`)

    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    switch (action) {
      case 'dismiss':
        updateData.status = 'dismissed'
        updateData.dismissed_at = new Date().toISOString()
        updateData.dismissed_by = userId
        updateData.dismiss_reason = reason || 'User dismissed'
        break

      case 'apply':
        updateData.status = 'applied'
        updateData.applied_at = new Date().toISOString()
        updateData.applied_by = userId
        updateData.test_started_at = new Date().toISOString()
        // Set test completion date (7 days from now by default)
        const testDays = 7
        const testCompleteDate = new Date(Date.now() + testDays * 24 * 60 * 60 * 1000)
        updateData.test_completed_at = testCompleteDate.toISOString()
        break

      case 'mark_successful':
        updateData.status = 'successful'
        updateData.actual_impact = reason || 'Performance improved as predicted'
        // Calculate success score based on before/after metrics
        // This would be enhanced with actual metric comparison
        updateData.success_score = 85
        break

      case 'mark_failed':
        updateData.status = 'failed'
        updateData.actual_impact = reason || 'Did not achieve predicted results'
        updateData.success_score = 30
        updateData.lessons_learned = reason
        break

      case 'rollback':
        updateData.status = 'rolled_back'
        updateData.rolled_back_at = new Date().toISOString()
        updateData.rolled_back_by = userId
        updateData.rollback_reason = reason || 'User requested rollback'
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('recommendation_states')
      .update(updateData)
      .eq('id', recommendationId)
      .select()
      .single()

    if (error) {
      console.error('[Recommendation Action] Error updating recommendation:', error)
      return NextResponse.json({ error: 'Failed to update recommendation' }, { status: 500 })
    }

    console.log(`[Recommendation Action] Successfully updated recommendation to ${updateData.status}`)

    return NextResponse.json({
      success: true,
      recommendation: data,
      message: `Recommendation ${action === 'dismiss' ? 'dismissed' : action === 'apply' ? 'applied and testing started' : 'updated'}`
    })

  } catch (error: any) {
    console.error('[Recommendation Action] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process action' },
      { status: 500 }
    )
  }
}
