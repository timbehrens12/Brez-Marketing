import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient()

    // Verify user owns this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, user_id')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    if (brand.user_id !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    console.log(`[Brand Delete] Starting comprehensive cleanup for brand ${brandId}`)

    // Step 1: Delete all ETL jobs (the foreign key constraint issue)
    const { error: etlError } = await supabase
      .from('etl_job')
      .delete()
      .eq('brand_id', brandId)

    if (etlError) {
      console.error('[Brand Delete] Error deleting ETL jobs:', etlError)
      // Continue anyway - these might not exist
    }

    // Step 2: Delete all platform connections and their data
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('id, platform_type')
      .eq('brand_id', brandId)

    if (connections && connections.length > 0) {
      console.log(`[Brand Delete] Found ${connections.length} platform connections to clean up`)
      
      // Delete platform-specific data
      for (const connection of connections) {
        if (connection.platform_type === 'meta') {
          // Delete Meta data
          await Promise.all([
            supabase.from('meta_campaigns').delete().eq('brand_id', brandId),
            supabase.from('meta_ad_insights').delete().eq('brand_id', brandId),
            supabase.from('meta_ad_daily_insights').delete().eq('brand_id', brandId),
            supabase.from('meta_demographics').delete().eq('brand_id', brandId),
            supabase.from('meta_device_performance').delete().eq('brand_id', brandId),
            supabase.from('meta_ad_sets').delete().eq('brand_id', brandId),
            supabase.from('meta_ads').delete().eq('brand_id', brandId)
          ])
          console.log(`[Brand Delete] Cleaned up Meta data for brand ${brandId}`)
        }
        
        if (connection.platform_type === 'shopify') {
          // Delete Shopify data
          await Promise.all([
            supabase.from('shopify_orders').delete().eq('brand_id', brandId),
            supabase.from('shopify_customers').delete().eq('brand_id', brandId),
            supabase.from('shopify_products').delete().eq('brand_id', brandId),
            supabase.from('inventory_items').delete().eq('brand_id', brandId)
          ])
          console.log(`[Brand Delete] Cleaned up Shopify data for brand ${brandId}`)
        }
      }

      // Delete platform connections
      const { error: connectionsError } = await supabase
        .from('platform_connections')
        .delete()
        .eq('brand_id', brandId)

      if (connectionsError) {
        console.error('[Brand Delete] Error deleting platform connections:', connectionsError)
      }
    }

    // Step 3: Delete brand access records
    await supabase.from('brand_access').delete().eq('brand_id', brandId)

    // Step 4: Finally delete the brand itself
    const { error: brandDeleteError } = await supabase
      .from('brands')
      .delete()
      .eq('id', brandId)
      .eq('user_id', userId) // Double-check ownership

    if (brandDeleteError) {
      console.error('[Brand Delete] Error deleting brand:', brandDeleteError)
      return NextResponse.json({ 
        error: 'Failed to delete brand', 
        details: brandDeleteError.message 
      }, { status: 500 })
    }

    console.log(`[Brand Delete] ✅ Successfully deleted brand ${brandId} and all associated data`)

    return NextResponse.json({ 
      success: true, 
      message: 'Brand and all associated data deleted successfully',
      brandId 
    })

  } catch (error) {
    console.error('[Brand Delete] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
