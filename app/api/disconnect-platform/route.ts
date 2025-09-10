import { NextResponse } from 'next/server'
import { withSecureAuth } from '@/lib/security/auth-helpers'

export async function POST(request: Request) {
  return withSecureAuth(
    request as any,
    async ({ userId, supabase, request }) => {
      const { brandId, platformType } = await request.json()

      try {
        // Disconnect platform request
        
        // First, check if the connection exists - but don't use .single() since there might be multiple
        const { data: connections, error: connectionQueryError } = await supabase
          .from('platform_connections')
          .select('id')
          .eq('brand_id', brandId)
          .eq('platform_type', platformType)

        if (connectionQueryError) {
          return NextResponse.json(
            { error: 'Error querying connections' },
            { status: 500 }
          )
        }

        if (!connections || connections.length === 0) {
          return NextResponse.json(
            { error: 'Connection not found' },
            { status: 404 }
          )
        }

        // STEP 1: Clear all queue jobs for these connections FIRST
        console.log('🧹 Clearing orphaned queue jobs for connections:', connections.map(c => c.id))
        try {
          const connectionIds = connections.map(c => c.id)
          const cleanupResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/test/queue-cleanup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connectionIds })
          })
          
          if (cleanupResponse.ok) {
            const cleanupResult = await cleanupResponse.json()
            console.log('✅ Queue cleanup completed:', cleanupResult)
          }
        } catch (cleanupError) {
          console.warn('⚠️ Queue cleanup error:', cleanupError)
        }

        // STEP 2: Clean up platform-specific data BEFORE trying to delete connections
        if (platformType === 'meta') {
          console.log(`🧹 Cleaning up Meta data for brand ${brandId}`)
          
          // Delete all Meta-related data for this brand
          const metaTables = [
            'meta_campaigns',
            'meta_campaign_daily_stats', 
            'meta_ad_insights',
            'meta_demographics',
            'meta_device_performance',
            'meta_sync_history'
          ]

          for (const table of metaTables) {
            try {
              const { count, error: countError } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true })
                .eq('brand_id', brandId)

              if (!countError && count && count > 0) {
                console.log(`Deleting ${count} Meta records from ${table}`)
                const { error: deleteError } = await supabase
                  .from(table)
                  .delete()
                  .eq('brand_id', brandId)

                if (deleteError) {
                  console.error(`Error deleting Meta data from ${table}:`, deleteError)
                } else {
                  console.log(`✅ Successfully deleted ${count} records from ${table}`)
                }
              }
            } catch (error) {
              console.error(`Error handling Meta table ${table}:`, error)
            }
          }

          // Also clean up any ETL jobs for this brand
          try {
            const { count: etlCount, error: etlCountError } = await supabase
              .from('etl_job')
              .select('*', { count: 'exact', head: true })
              .eq('brand_id', brandId)
              .like('job_type', 'meta_%')

            if (!etlCountError && etlCount && etlCount > 0) {
              console.log(`Deleting ${etlCount} Meta ETL jobs`)
              const { error: etlDeleteError } = await supabase
                .from('etl_job')
                .delete()
                .eq('brand_id', brandId)
                .like('job_type', 'meta_%')

              if (etlDeleteError) {
                console.error('Error deleting Meta ETL jobs:', etlDeleteError)
              } else {
                console.log(`✅ Successfully deleted ${etlCount} Meta ETL jobs`)
              }
            }
          } catch (error) {
            console.error('Error handling Meta ETL jobs:', error)
          }
        }

        // STEP 3: Try to delete the connections directly - if there are foreign key constraints, return 409
        const { error: connectionError } = await supabase
          .from('platform_connections')
          .delete()
          .eq('brand_id', brandId)
          .eq('platform_type', platformType)

        if (connectionError) {
          // Check if it's a foreign key constraint error  
          if (connectionError.code === '23503' || (connectionError.message && connectionError.message.includes('foreign key constraint'))) {
            // Silently handle the constraint - frontend will handle force delete automatically
            return NextResponse.json(
              { 
                error: 'Cannot disconnect platform. There is still related data that must be removed first. Use force disconnect to remove all data.',
                hasRelatedData: true,
                silent: true // Flag to suppress frontend error display
              },
              { status: 409 }
            )
          }
          
          return NextResponse.json(
            { error: 'Failed to delete connection: ' + connectionError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true })
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to disconnect platform: ' + (error instanceof Error ? error.message : String(error)) },
          { status: 500 }
        )
      }
    },
    {
      requireBrandAccess: false,
      rateLimitTier: 'medium',
      endpoint: 'disconnect-platform'
    }
  )
}