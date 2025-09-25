import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs'

export const maxDuration = 300 // 5 minutes

/**
 * COMPLETE NUCLEAR CLEAN: Delete ALL Meta data from ALL Meta tables
 * This finds every single Meta table and cleans it
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log(`[COMPLETE NUCLEAR CLEAN] 🧨 Finding ALL Meta tables for brand ${brandId}`)

    // Step 1: Find ALL Meta tables
    const { data: allMetaTables } = await supabase.rpc('exec', {
      sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'meta_%'
        ORDER BY table_name
      `
    })

    const metaTableNames = allMetaTables?.map(t => t.table_name) || []
    console.log(`[COMPLETE NUCLEAR CLEAN] 📋 Found ${metaTableNames.length} Meta tables:`, metaTableNames)

    // Step 2: For each table, check if it has brand_id column and delete records
    let cleanedTables = []
    let skippedTables = []
    let totalDeleted = 0

    for (const tableName of metaTableNames) {
      try {
        // Check if table has brand_id column
        const { data: columns } = await supabase.rpc('exec', {
          sql: `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = '${tableName}' 
            AND table_schema = 'public' 
            AND column_name = 'brand_id'
          `
        })

        if (columns && columns.length > 0) {
          // Table has brand_id, delete records for this brand
          console.log(`[COMPLETE NUCLEAR CLEAN] 🧹 Cleaning ${tableName}...`)
          
          const { data: deletedData, error } = await supabase
            .from(tableName)
            .delete()
            .eq('brand_id', brandId)

          if (error) {
            console.error(`[COMPLETE NUCLEAR CLEAN] ❌ Error cleaning ${tableName}:`, error)
            skippedTables.push({ table: tableName, error: error.message })
          } else {
            console.log(`[COMPLETE NUCLEAR CLEAN] ✅ Cleaned ${tableName}`)
            cleanedTables.push(tableName)
          }
        } else {
          console.log(`[COMPLETE NUCLEAR CLEAN] ⏭️ Skipping ${tableName} (no brand_id column)`)
          skippedTables.push({ table: tableName, reason: 'no brand_id column' })
        }

      } catch (tableError) {
        console.error(`[COMPLETE NUCLEAR CLEAN] ❌ Error processing ${tableName}:`, tableError)
        skippedTables.push({ table: tableName, error: tableError.message })
      }
    }

    console.log(`[COMPLETE NUCLEAR CLEAN] 🎉 COMPLETE!`)
    console.log(`[COMPLETE NUCLEAR CLEAN] ✅ Cleaned: ${cleanedTables.length} tables`)
    console.log(`[COMPLETE NUCLEAR CLEAN] ⏭️ Skipped: ${skippedTables.length} tables`)

    // Step 3: Verify key tables are now empty
    const verificationQueries = await Promise.allSettled([
      supabase.from('meta_ad_insights').select('id').eq('brand_id', brandId).limit(1),
      supabase.from('meta_demographics').select('id').eq('brand_id', brandId).limit(1),
      supabase.from('meta_adsets_total_reach').select('date').eq('brand_id', brandId).limit(1),
      supabase.from('meta_campaigns').select('id').eq('brand_id', brandId).limit(1)
    ])

    const verification = {
      ad_insights: verificationQueries[0].status === 'fulfilled' ? verificationQueries[0].value.data?.length || 0 : 'error',
      demographics: verificationQueries[1].status === 'fulfilled' ? verificationQueries[1].value.data?.length || 0 : 'error',
      total_reach: verificationQueries[2].status === 'fulfilled' ? verificationQueries[2].value.data?.length || 0 : 'error',
      campaigns: verificationQueries[3].status === 'fulfilled' ? verificationQueries[3].value.data?.length || 0 : 'error'
    }

    return NextResponse.json({
      success: true,
      message: `COMPLETE NUCLEAR CLEAN FINISHED! Processed ${metaTableNames.length} Meta tables.`,
      tables_found: metaTableNames.length,
      tables_cleaned: cleanedTables.length,
      tables_skipped: skippedTables.length,
      cleaned_tables: cleanedTables,
      skipped_tables: skippedTables,
      verification,
      note: 'All Meta data should now be completely removed. You can now run a fresh sync.'
    })

  } catch (error) {
    console.error('[COMPLETE NUCLEAR CLEAN] ❌ Critical error:', error)
    return NextResponse.json({ 
      error: 'Complete nuclear clean failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
