import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 🚀 BACKGROUND QUEUE PROCESSOR: Handles 12-month Meta sync jobs
export async function POST(request: NextRequest) {
  try {
    console.log(`[Process Full Sync Queue] 🚀 Starting queue processor...`)

    // Initialize Redis connection
    const { Queue, Worker } = await import('bullmq')
    const Redis = require('ioredis')
    
    const redis = new Redis(process.env.UPSTASH_REDIS_REST_URL?.replace('https://', 'redis://') || 'redis://localhost:6379', {
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    })

    // Import Meta service functions
    const { fetchMetaAdInsights, fetchMetaAdSets } = await import('@/lib/services/meta-service')

    // Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Create worker to process Meta sync jobs
    const worker = new Worker('meta-full-sync', async (job) => {
      const { brandId, adAccountId, month, startDate, endDate, chunkNumber, totalChunks, type } = job.data
      
      console.log(`[Queue Worker] 🔄 Processing ${type || 'insights'} job: ${month || type?.toUpperCase() || 'Unknown'}`)

      try {
        if (type === 'budget_sync') {
          // 💰 BUDGET SYNC JOB
          console.log(`[Queue Worker] 💰 Processing budget sync for brand ${brandId}`)
          
          // Fetch and save adsets with budgets
          const adsetsResult = await fetchMetaAdSets(brandId, true) // forceSave = true
          
          if (adsetsResult.success) {
            console.log(`[Queue Worker] ✅ Budget sync completed: ${adsetsResult.count} adsets synced`)
            return { success: true, type: 'budget', count: adsetsResult.count }
          } else {
            throw new Error(`Budget sync failed: ${adsetsResult.error}`)
          }
          
        } else if (type === 'creative_sync') {
          // 🎨 CREATIVE SYNC JOB (Images, Headlines, CTAs)
          console.log(`[Queue Worker] 🎨 Processing creative sync for brand ${brandId}`)
          
          // Get all campaigns for this brand
          const { data: campaigns } = await supabase
            .from('meta_campaigns')
            .select('campaign_id')
            .eq('brand_id', brandId)
            .eq('status', 'ACTIVE')
          
          if (!campaigns || campaigns.length === 0) {
            console.log(`[Queue Worker] ⚠️ No active campaigns found for creative sync`)
            return { success: true, type: 'creative', count: 0, message: 'No campaigns to sync' }
          }
          
          let totalAds = 0
          for (const campaign of campaigns) {
            // Get adsets for this campaign
            const { data: adsets } = await supabase
              .from('meta_adsets')
              .select('adset_id')
              .eq('brand_id', brandId)
              .eq('campaign_id', campaign.campaign_id)
              .eq('status', 'ACTIVE')
            
            if (adsets && adsets.length > 0) {
              const { fetchMetaAds } = await import('@/lib/services/meta-service')
              
              for (const adset of adsets) {
                try {
                  const adsResult = await fetchMetaAds(brandId, adset.adset_id, true) // forceSave = true
                  if (adsResult.success) {
                    totalAds += adsResult.count || 0
                  }
                  // Small delay to prevent rate limiting
                  await new Promise(resolve => setTimeout(resolve, 1000))
                } catch (adsError) {
                  console.warn(`[Queue Worker] ⚠️ Failed to sync ads for adset ${adset.adset_id}:`, adsError)
                }
              }
            }
          }
          
          console.log(`[Queue Worker] ✅ Creative sync completed: ${totalAds} ads synced`)
          return { success: true, type: 'creative', count: totalAds }
          
        } else {
          // 📊 MONTHLY INSIGHTS JOB
          const startDateObj = new Date(startDate)
          const endDateObj = new Date(endDate)
          
          console.log(`[Queue Worker] 📊 Processing month ${chunkNumber}/${totalChunks}: ${month}`)
          console.log(`[Queue Worker] Date range: ${startDateObj.toISOString().split('T')[0]} to ${endDateObj.toISOString().split('T')[0]}`)

          // Fetch insights for this month
          const insightsResult = await fetchMetaAdInsights(
            brandId,
            startDateObj,
            endDateObj,
            false, // dryRun = false
            false  // skipDemographics = false
          )

          if (insightsResult.success) {
            console.log(`[Queue Worker] ✅ Month ${chunkNumber}/${totalChunks} completed: ${insightsResult.count} insights`)
            
            // Update progress in platform_connections
            const progressPct = Math.round((chunkNumber / totalChunks) * 100)
            await supabase
              .from('platform_connections')
              .update({ 
                sync_status: progressPct >= 100 ? 'completed' : 'in_progress',
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('brand_id', brandId)
              .eq('platform_type', 'meta')

            return { 
              success: true, 
              type: 'insights',
              month, 
              chunk: chunkNumber, 
              total: totalChunks, 
              count: insightsResult.count,
              progress: progressPct
            }
          } else {
            throw new Error(`Month ${month} failed: ${insightsResult.error}`)
          }
        }
      } catch (jobError) {
        console.error(`[Queue Worker] ❌ Job failed:`, jobError)
        throw jobError
      }
    }, { 
      connection: redis,
      concurrency: 2, // Process 2 jobs at once to prevent rate limiting
    })

    // Handle worker events
    worker.on('completed', (job, result) => {
      console.log(`[Queue Worker] ✅ Job ${job.id} completed:`, result)
    })

    worker.on('failed', (job, err) => {
      console.error(`[Queue Worker] ❌ Job ${job?.id} failed:`, err)
    })

    worker.on('error', (err) => {
      console.error(`[Queue Worker] ❌ Worker error:`, err)
    })

    console.log(`[Process Full Sync Queue] ✅ Worker started and listening for jobs`)

    // Keep worker alive for 10 minutes (enough to process 12 monthly jobs)
    setTimeout(() => {
      console.log(`[Process Full Sync Queue] ⏰ Shutting down worker after 10 minutes`)
      worker.close()
    }, 10 * 60 * 1000)

    return NextResponse.json({
      success: true,
      message: 'Queue processor started for 12-month sync',
      workerInfo: {
        concurrency: 2,
        timeout: '10 minutes',
        status: 'listening'
      }
    })

  } catch (error) {
    console.error('[Process Full Sync Queue] Error:', error)
    return NextResponse.json({
      error: 'Queue processor failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request)
}
