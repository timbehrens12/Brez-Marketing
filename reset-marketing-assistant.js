/**
 * Reset Marketing Assistant - Clear All AI Data
 * 
 * This script clears all AI-generated data and resets the Marketing Assistant
 * to a fresh state, as if the user is loading it for the first time.
 * 
 * What it clears:
 * - AI campaign recommendations (backend)
 * - AI usage tracking records (backend)
 * - localStorage for recommendations viewed state
 * - localStorage for completed items
 * - localStorage for last refresh date
 * 
 * After running this, all widgets will be blank until you click "Update Recommendations"
 */

const { createClient } = require('@supabase/supabase-js')

// Get brand ID from command line argument
const brandId = process.argv[2]

if (!brandId) {
  console.error('❌ Error: Please provide a brand ID')
  console.log('Usage: node reset-marketing-assistant.js <BRAND_ID>')
  console.log('\nTo find your brand ID:')
  console.log('1. Go to the Marketing Assistant page')
  console.log('2. Open browser console')
  console.log('3. Type: localStorage')
  console.log('4. Look for keys like "recommendationsViewed_<BRAND_ID>"')
  process.exit(1)
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetMarketingAssistant() {
  console.log(`\n🧹 Resetting Marketing Assistant for brand: ${brandId}\n`)
  
  try {
    // 1. Delete AI campaign recommendations
    console.log('📋 Deleting AI campaign recommendations...')
    const { data: deletedRecs, error: recsError } = await supabase
      .from('ai_campaign_recommendations')
      .delete()
      .eq('brand_id', brandId)
    
    if (recsError) {
      console.error('❌ Error deleting recommendations:', recsError.message)
    } else {
      console.log('✅ Deleted AI recommendations')
    }

    // 2. Delete AI usage tracking for marketing_analysis
    console.log('📊 Deleting AI usage tracking records...')
    const { data: deletedUsage, error: usageError } = await supabase
      .from('ai_usage_tracking')
      .delete()
      .eq('brand_id', brandId)
      .eq('feature_type', 'marketing_analysis')
    
    if (usageError) {
      console.error('❌ Error deleting usage tracking:', usageError.message)
    } else {
      console.log('✅ Deleted AI usage tracking')
    }

    // 3. Instructions for clearing localStorage (must be done in browser)
    console.log('\n💾 To complete the reset, clear localStorage in your browser:')
    console.log('────────────────────────────────────────────────────────────')
    console.log('1. Open the Marketing Assistant page')
    console.log('2. Open browser console (F12)')
    console.log('3. Run these commands:')
    console.log(`\nlocalStorage.removeItem('recommendationsViewed_${brandId}')`)
    console.log(`localStorage.removeItem('completedItems_${brandId}')`)
    console.log(`localStorage.removeItem('lastRefreshDate_${brandId}')`)
    console.log(`\n4. Refresh the page (F5)`)
    console.log('────────────────────────────────────────────────────────────')

    console.log('\n✨ Backend reset complete!')
    console.log('\n📝 Expected state after full reset:')
    console.log('   - All widgets show empty state')
    console.log('   - "Update Recommendations" button is enabled')
    console.log('   - Click button to generate first AI analysis')
    console.log('   - All widgets populate after analysis completes')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

resetMarketingAssistant()

