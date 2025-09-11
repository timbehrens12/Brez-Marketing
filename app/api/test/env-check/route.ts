import { NextRequest, NextResponse } from 'next/server'

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

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment_variables: envVars,
      summary: {
        metaReady: !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
        redisReady: !!(process.env.REDIS_HOST || process.env.REDIS_URL),
        databaseReady: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
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
