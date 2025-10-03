import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// TESTING ENDPOINT - Clear all AI usage tracking data
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optional: Add admin check here if you want to restrict access
    // const allowedAdminIds = ['your-clerk-user-id']
    // if (!allowedAdminIds.includes(userId)) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }

    console.log('🧹 Clearing all AI usage tracking data for testing...')

    const results: any = {
      deleted: {},
      remaining: {},
      errors: []
    }

    // Clear ai_usage_logs
    const { error: logsError, count: logsDeleted } = await supabase
      .from('ai_usage_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (logsError) {
      console.error('Error clearing ai_usage_logs:', logsError)
      results.errors.push({ table: 'ai_usage_logs', error: logsError.message })
    } else {
      results.deleted.logs = logsDeleted
    }

    // Clear ai_usage_tracking
    const { error: trackingError, count: trackingDeleted } = await supabase
      .from('ai_usage_tracking')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (trackingError) {
      console.error('Error clearing ai_usage_tracking:', trackingError)
      results.errors.push({ table: 'ai_usage_tracking', error: trackingError.message })
    } else {
      results.deleted.tracking = trackingDeleted
    }

    // Clear ai_feature_usage (used by AI Consultant)
    const { error: featureError, count: featureDeleted } = await supabase
      .from('ai_feature_usage')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (featureError) {
      console.error('Error clearing ai_feature_usage:', featureError)
      results.errors.push({ table: 'ai_feature_usage', error: featureError.message })
    } else {
      results.deleted.feature_usage = featureDeleted
    }

    // Clear outreach_message_usage
    const { error: outreachError, count: outreachDeleted } = await supabase
      .from('outreach_message_usage')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (outreachError) {
      console.error('Error clearing outreach_message_usage:', outreachError)
      results.errors.push({ table: 'outreach_message_usage', error: outreachError.message })
    } else {
      results.deleted.outreach = outreachDeleted
    }

    // Clear user_usage (lead generator)
    const { error: userUsageError, count: userUsageDeleted } = await supabase
      .from('user_usage')
      .delete()
      .neq('user_id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (userUsageError) {
      console.error('Error clearing user_usage:', userUsageError)
      results.errors.push({ table: 'user_usage', error: userUsageError.message })
    } else {
      results.deleted.user_usage = userUsageDeleted
    }

    // Clear ai_campaign_recommendations (Marketing Assistant weekly cooldown)
    const { error: campaignRecsError, count: campaignRecsDeleted } = await supabase
      .from('ai_campaign_recommendations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (campaignRecsError) {
      console.error('Error clearing ai_campaign_recommendations:', campaignRecsError)
      results.errors.push({ table: 'ai_campaign_recommendations', error: campaignRecsError.message })
    } else {
      results.deleted.campaign_recommendations = campaignRecsDeleted
    }

    // Clear recommendation_performance (Marketing Assistant performance tracking)
    const { error: recPerfError, count: recPerfDeleted } = await supabase
      .from('recommendation_performance')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (recPerfError) {
      console.error('Error clearing recommendation_performance:', recPerfError)
      results.errors.push({ table: 'recommendation_performance', error: recPerfError.message })
    } else {
      results.deleted.recommendation_performance = recPerfDeleted
    }

    // Clear optimization_action_log (Marketing Assistant action tracking)
    const { error: actionLogError, count: actionLogDeleted } = await supabase
      .from('optimization_action_log')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (actionLogError) {
      console.error('Error clearing optimization_action_log:', actionLogError)
      results.errors.push({ table: 'optimization_action_log', error: actionLogError.message })
    } else {
      results.deleted.optimization_action_log = actionLogDeleted
    }

    // Get final counts
    const { count: remainingLogs } = await supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })

    const { count: remainingTracking } = await supabase
      .from('ai_usage_tracking')
      .select('*', { count: 'exact', head: true })

    const { count: remainingFeature } = await supabase
      .from('ai_feature_usage')
      .select('*', { count: 'exact', head: true })

    const { count: remainingOutreach } = await supabase
      .from('outreach_message_usage')
      .select('*', { count: 'exact', head: true })

    const { count: remainingUserUsage } = await supabase
      .from('user_usage')
      .select('*', { count: 'exact', head: true })

    const { count: remainingCampaignRecs } = await supabase
      .from('ai_campaign_recommendations')
      .select('*', { count: 'exact', head: true })

    const { count: remainingRecPerf } = await supabase
      .from('recommendation_performance')
      .select('*', { count: 'exact', head: true })

    const { count: remainingActionLog } = await supabase
      .from('optimization_action_log')
      .select('*', { count: 'exact', head: true })

    results.remaining = {
      logs: remainingLogs || 0,
      tracking: remainingTracking || 0,
      feature_usage: remainingFeature || 0,
      outreach: remainingOutreach || 0,
      user_usage: remainingUserUsage || 0,
      campaign_recommendations: remainingCampaignRecs || 0,
      recommendation_performance: remainingRecPerf || 0,
      optimization_action_log: remainingActionLog || 0
    }

    console.log('✅ AI usage data cleared:', results)

    return NextResponse.json({
      success: true,
      message: 'All AI usage tracking data cleared successfully. Run the clearLocalStorageScript in your browser console, then refresh the Marketing Assistant page.',
      clearLocalStorageScript: `
// Clear all AI usage related localStorage
Object.keys(localStorage).filter(k => 
  k.includes("usage") || 
  k.includes("Generation") || 
  k.includes("creative") || 
  k.includes("consultant") || 
  k.includes("msg_count") || 
  k.includes("method_used") || 
  k.includes("recommendationsViewed") || 
  k.includes("completedItems") || 
  k.includes("acknowledgedAlerts")
).forEach(k => {
  console.log("🧹 Clearing:", k);
  localStorage.removeItem(k);
});
console.log("✅ localStorage cleared! Now refresh the Marketing Assistant page.");
      `.trim(),
      instructions: 'STEPS TO SEE FRESH STATE:\n1. Copy the clearLocalStorageScript above\n2. Open browser console (F12)\n3. Paste and run the script\n4. Navigate to the Marketing Assistant page and refresh',
      ...results
    })

  } catch (error) {
    console.error('Error clearing AI usage data:', error)
    return NextResponse.json({ 
      error: 'Failed to clear AI usage data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

