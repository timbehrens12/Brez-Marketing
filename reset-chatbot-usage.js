/**
 * Script to reset AI Chatbot usage for a specific user
 * This clears all usage records to start fresh
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetChatbotUsage(userId) {
  console.log(`\n🔄 Resetting AI Chatbot usage for user: ${userId}\n`)

  try {
    // 1. Delete from ai_feature_usage table (unified table)
    const { data: deletedFeature, error: featureError } = await supabase
      .from('ai_feature_usage')
      .delete()
      .eq('user_id', userId)
      .eq('feature_type', 'ai_consultant')

    if (featureError) {
      console.error('❌ Error deleting from ai_feature_usage:', featureError)
    } else {
      console.log('✅ Cleared ai_feature_usage table')
    }

    // 2. Delete from ai_usage_tracking table (legacy table)
    const { data: deletedTracking, error: trackingError } = await supabase
      .from('ai_usage_tracking')
      .delete()
      .eq('user_id', userId)
      .eq('feature_name', 'ai_consultant')

    if (trackingError) {
      console.error('❌ Error deleting from ai_usage_tracking:', trackingError)
    } else {
      console.log('✅ Cleared ai_usage_tracking table')
    }

    // 3. Verify the reset
    console.log('\n📊 Verifying reset...')
    
    const { data: remainingFeature } = await supabase
      .from('ai_feature_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('feature_type', 'ai_consultant')
      .single()

    const { data: remainingTracking } = await supabase
      .from('ai_usage_tracking')
      .select('count')
      .eq('user_id', userId)
      .eq('feature_name', 'ai_consultant')
      .single()

    console.log(`\nai_feature_usage records: ${remainingFeature?.count || 0}`)
    console.log(`ai_usage_tracking records: ${remainingTracking?.count || 0}`)

    console.log('\n✅ AI Chatbot usage has been reset!')
    console.log('The counter should now show 0/10 (or 0/your tier limit)')
    
  } catch (error) {
    console.error('❌ Error resetting usage:', error)
    process.exit(1)
  }
}

// Get user ID from command line or use default
const userId = process.argv[2]

if (!userId) {
  console.error('❌ Please provide a user ID')
  console.error('Usage: node reset-chatbot-usage.js <user_id>')
  process.exit(1)
}

resetChatbotUsage(userId)
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

