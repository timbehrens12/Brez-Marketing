/**
 * Reset Usage Only Script
 * 
 * Run this in Node.js to reset just the AI usage tracking
 * so you can test the "Update Recommendations" button again
 * without clearing all the recommendations and widgets.
 * 
 * Usage: node reset-usage-only.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BRAND_ID = '1a30f34b-b048-4f80-b880-6c61bd12c720' // Your test brand

async function resetUsageOnly() {
  console.log('🧹 Resetting AI Usage Tracking Only...\n')
  
  try {
    // Delete only marketing_analysis usage records for this brand
    const { error: usageError } = await supabase
      .from('ai_usage_tracking')
      .delete()
      .eq('brand_id', BRAND_ID)
      .eq('feature_type', 'marketing_analysis')
    
    if (usageError) {
      console.error('❌ Error deleting usage records:', usageError)
    } else {
      console.log('✅ Deleted marketing_analysis usage records')
    }
    
    console.log('\n✨ Usage reset complete!')
    console.log('\n📝 Next steps:')
    console.log('   1. Refresh the Marketing Assistant page')
    console.log('   2. "Update Recommendations" button should now be available')
    console.log('   3. All existing recommendations and widgets will remain')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
  
  process.exit(0)
}

resetUsageOnly()

