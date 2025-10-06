/**
 * Marketing Assistant Complete Reset Script (Node.js)
 * 
 * INSTRUCTIONS:
 * Run this from your terminal:
 * node reset-marketing-assistant-complete.js
 * 
 * This will:
 * - Clear AI recommendations from the database
 * - Clear performance tracking
 * - Reset usage tracking (make button available)
 * - Clear optimization action logs
 * 
 * Then in browser:
 * - Clear localStorage (the browser script will do this)
 * - Hard refresh the page
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetMarketingAssistant() {
  console.log('🧹 Starting Complete Marketing Assistant Reset...\n')
  
  // Prompt for brand ID
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })

  readline.question('Enter your Brand ID: ', async (brandId) => {
    if (!brandId || brandId.trim() === '') {
      console.error('❌ Brand ID is required')
      readline.close()
      process.exit(1)
    }

    console.log(`\n📍 Brand ID: ${brandId}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    try {
      // 1. Delete AI recommendations
      console.log('📋 Deleting AI recommendations...')
      const { error: recError, count: recCount } = await supabase
        .from('ai_campaign_recommendations')
        .delete()
        .eq('brand_id', brandId)
      
      if (recError) {
        console.error('   ❌ Error:', recError.message)
      } else {
        console.log(`   ✅ Deleted ${recCount || 0} recommendations`)
      }

      // 2. Delete recommendation performance tracking
      console.log('\n📊 Deleting performance tracking...')
      const { error: perfError, count: perfCount } = await supabase
        .from('recommendation_performance')
        .delete()
        .eq('brand_id', brandId)
      
      if (perfError && perfError.code !== '42P01') { // Ignore table not exists error
        console.error('   ❌ Error:', perfError.message)
      } else {
        console.log(`   ✅ Deleted ${perfCount || 0} performance records`)
      }

      // 3. Delete optimization action logs (mark as done tracking)
      console.log('\n✅ Deleting optimization action logs...')
      const { error: actionError, count: actionCount } = await supabase
        .from('optimization_action_log')
        .delete()
        .eq('brand_id', brandId)
      
      if (actionError && actionError.code !== '42P01') {
        console.error('   ❌ Error:', actionError.message)
      } else {
        console.log(`   ✅ Deleted ${actionCount || 0} action logs`)
      }

      // 4. Clear AI usage logs (for progress tracking)
      console.log('\n🔄 Clearing AI usage logs (mark as done tracking)...')
      const { error: usageLogError, count: usageLogCount } = await supabase
        .from('ai_usage_logs')
        .delete()
        .eq('brand_id', brandId)
        .eq('endpoint', 'mark_as_done')
      
      if (usageLogError) {
        console.error('   ❌ Error:', usageLogError.message)
      } else {
        console.log(`   ✅ Deleted ${usageLogCount || 0} usage logs`)
      }

      // 5. Reset marketing assistant usage (make button available)
      console.log('\n🔓 Resetting usage tracking (making button available)...')
      
      // Get user ID (you'll need to provide this)
      readline.question('\nEnter your User ID (Clerk ID): ', async (userId) => {
        if (!userId || userId.trim() === '') {
          console.log('   ⚠️  Skipping usage reset (no user ID provided)')
        } else {
          const { error: usageError, count: usageCount } = await supabase
            .from('ai_usage_tracking')
            .delete()
            .eq('brand_id', brandId)
            .eq('user_id', userId)
            .eq('feature_type', 'marketing_analysis')
          
          if (usageError) {
            console.error('   ❌ Error:', usageError.message)
          } else {
            console.log(`   ✅ Deleted ${usageCount || 0} usage records`)
          }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('✨ Database reset complete!')
        console.log('\n📝 Next steps:')
        console.log('   1. Go to Marketing Assistant page')
        console.log('   2. Open browser console (F12)')
        console.log('   3. Paste the browser reset script to clear localStorage')
        console.log('   4. Page will auto-refresh')
        console.log('   5. All widgets should be empty')
        console.log('   6. Click "Update Recommendations" button')
        console.log('   7. Watch AI generate fresh insights! 🚀')
        console.log('\n💡 Browser script to paste in console:\n')
        
        console.log(`
// Clear localStorage and refresh
const brandId = '${brandId}'
localStorage.removeItem(\`recommendationsViewed_\${brandId}\`)
localStorage.removeItem(\`completedItems_\${brandId}\`)
localStorage.removeItem(\`lastRefreshDate_\${brandId}\`)
console.log('✅ localStorage cleared - refreshing page...')
setTimeout(() => window.location.reload(true), 500)
        `)

        readline.close()
        process.exit(0)
      })

    } catch (error) {
      console.error('\n❌ Error during reset:', error)
      readline.close()
      process.exit(1)
    }
  })
}

resetMarketingAssistant()

