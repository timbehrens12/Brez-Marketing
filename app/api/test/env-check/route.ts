import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const envVars = {
      // Meta variables
      META_APP_ID: process.env.META_APP_ID,
      META_APP_SECRET: process.env.META_APP_SECRET ? '***SET***' : null,
      META_CONFIG_ID: process.env.META_CONFIG_ID,

      // Redis variables
      REDIS_URL: process.env.REDIS_URL,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD ? '***SET***' : null,

      // Database variables
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***SET***' : null,

      // All environment variables starting with META or REDIS
      allMetaVars: Object.keys(process.env).filter(key => key.startsWith('META_')),
      allRedisVars: Object.keys(process.env).filter(key => key.startsWith('REDIS_')),
      allEnvVars: Object.keys(process.env).length,

      // Test Meta API call
      metaApiTest: null as any
    }

    // Test Meta API if we have credentials
    if (process.env.META_APP_ID && process.env.META_APP_SECRET) {
      try {
        const testResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${process.env.META_APP_SECRET}`)
        if (testResponse.ok) {
          const testData = await testResponse.json()
          envVars.metaApiTest = {
            success: true,
            userId: testData.id,
            name: testData.name
          }
        } else {
          envVars.metaApiTest = {
            success: false,
            error: `HTTP ${testResponse.status}: ${testResponse.statusText}`
          }
        }
      } catch (error) {
        envVars.metaApiTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Test Supabase connection
    let supabaseTest = { success: false, error: null, connectionCount: 0, metaConnections: [] }
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('platform_connections')
        .select('count', { count: 'exact', head: true })

      supabaseTest.connectionCount = data || 0

      // Test Meta connection lookup specifically
      const { data: metaConnections, error: metaError } = await supabase
        .from('platform_connections')
        .select('id, status, sync_status, created_at')
        .eq('brand_id', '1a30f34b-b048-4f80-b880-6c61bd12c720')
        .eq('platform_type', 'meta')
        .order('created_at', { ascending: false })
        .limit(5)

      supabaseTest.success = !error && !metaError
      supabaseTest.error = error?.message || metaError?.message || null
      supabaseTest.metaConnections = metaConnections || []

    } catch (error) {
      supabaseTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionCount: 0,
        metaConnections: []
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment_variables: envVars,
      supabaseTest,
      summary: {
        metaReady: !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
        redisReady: !!(process.env.REDIS_HOST || process.env.REDIS_URL),
        databaseReady: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        supabaseWorking: supabaseTest.success
      }
    })

  } catch (error) {
    console.error('[Env Check] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to check environment variables',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
