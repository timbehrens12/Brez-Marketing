import { createClient } from '@supabase/supabase-js'
import { fetchMetaAdInsights } from '../../../lib/services/meta-service'

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('🚨 EMERGENCY RESYNC: Starting emergency Meta data resync')

  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Extract brandId from request
    const { brandId } = req.body
    
    if (!brandId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Brand ID is required' 
      })
    }

    // Calculate date range for last 90 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)

    console.log(`🚨 EMERGENCY RESYNC: Resyncing Meta data for brand ${brandId} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    // First, check for Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      console.error('🚨 EMERGENCY RESYNC: No active Meta connection found:', connectionError)
      return res.status(400).json({ 
        success: false, 
        error: 'No active Meta connection found' 
      })
    }

    // Log the presence of the views column
    const { data: columnCheck, error: columnError } = await supabase.rpc(
      'check_column_exists',
      { table_name: 'meta_ad_insights', column_name: 'views' }
    )

    console.log(`🚨 EMERGENCY RESYNC: Views column exists in database: ${columnCheck ? 'YES' : 'NO'}`)
    
    // Check how many records are in the table before resync
    const { count: beforeCount, error: countError } = await supabase
      .from('meta_ad_insights')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)

    console.log(`🚨 EMERGENCY RESYNC: Records in meta_ad_insights before resync: ${beforeCount || 0}`)
    
    // If views column doesn't exist, add it now
    if (!columnCheck) {
      console.log(`🚨 EMERGENCY RESYNC: Adding missing views column to meta_ad_insights table`)
      
      try {
        await supabase.rpc('add_views_column_if_missing')
        console.log(`🚨 EMERGENCY RESYNC: Views column added successfully`)
      } catch (error) {
        console.error(`🚨 EMERGENCY RESYNC: Error adding views column:`, error)
        // Continue anyway - we'll try the sync
      }
    }

    // Fetch Meta data
    const result = await fetchMetaAdInsights(brandId, startDate, endDate)

    if (!result.success) {
      console.error('🚨 EMERGENCY RESYNC: Error fetching Meta data:', result.error)
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch Meta data',
        details: result.error
      })
    }

    // Check how many records are in the table after resync
    const { count: afterCount, error: afterCountError } = await supabase
      .from('meta_ad_insights')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)

    console.log(`🚨 EMERGENCY RESYNC: Records in meta_ad_insights after resync: ${afterCount || 0}`)
    console.log(`🚨 EMERGENCY RESYNC: Net change: ${(afterCount || 0) - (beforeCount || 0)} records`)

    // Now make sure the views column is populated from reach
    try {
      const { data: updateResult, error: updateError } = await supabase.rpc('update_views_from_reach')
      
      if (updateError) {
        console.error('🚨 EMERGENCY RESYNC: Error updating views from reach:', updateError)
      } else {
        console.log(`🚨 EMERGENCY RESYNC: Successfully updated views column from reach data`)
      }
    } catch (error) {
      console.error('🚨 EMERGENCY RESYNC: Error in update_views_from_reach function:', error)
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Emergency Meta data resync completed successfully',
      recordsBeforeSync: beforeCount || 0,
      recordsAfterSync: afterCount || 0,
      netChange: (afterCount || 0) - (beforeCount || 0)
    })
  } catch (error) {
    console.error('🚨 EMERGENCY RESYNC: Unexpected error:', error)
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message
    })
  }
} 