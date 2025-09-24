import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { auth } from '@clerk/nextjs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { brandId } = await request.json()
    
    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'Missing brandId' },
        { status: 400 }
      )
    }

    console.log(`[Rebuild Demographics] 🔥 Starting 2-month demographics rebuild for brand ${brandId}`)

    // Import the service we need
    const { fetchMetaAdInsights } = await import('@/lib/services/meta-service')
    
    // Define the SAME 2-month window as the auth sync and general data
    const today = new Date()
    const criticalChunks = [
      { start: new Date('2025-09-01'), end: today, name: 'September 2025 (current)' },
      { start: new Date('2025-07-25'), end: new Date('2025-08-31'), name: 'August 2025 (full + July end)' }
    ]
    
    let totalDemographicsRecords = 0
    
    for (const chunk of criticalChunks) {
      try {
        console.log(`[Rebuild Demographics] 📅 Syncing demographics for ${chunk.name} (${chunk.start.toISOString().split('T')[0]} to ${chunk.end.toISOString().split('T')[0]})`)
        
        // Sync ONLY demographics for this chunk (skipDemographics=false, dryRun=false)
        const result = await fetchMetaAdInsights(brandId, chunk.start, chunk.end, false, false)
        const count = result?.length || 0
        totalDemographicsRecords += count
        
        console.log(`[Rebuild Demographics] ✅ ${chunk.name}: ${count} demographic records synced`)
        
        // Delay to prevent rate limits
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (chunkError) {
        console.error(`[Rebuild Demographics] ❌ Failed to sync ${chunk.name}:`, chunkError)
        // Continue with other chunks even if one fails
      }
    }
    
    console.log(`[Rebuild Demographics] 🎉 REBUILD COMPLETE! Total demographic records: ${totalDemographicsRecords}`)
    
    return NextResponse.json({ 
      success: true, 
      totalRecords: totalDemographicsRecords,
      chunks: criticalChunks.length,
      message: 'Demographics rebuilt with 2-month pattern'
    })

  } catch (error) {
    console.error('[Rebuild Demographics] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
