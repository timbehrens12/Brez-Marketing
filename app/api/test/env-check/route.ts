import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const envVars = {
      // Meta variables
      META_APP_ID: process.env.META_APP_ID,
      META_APP_SECRET: process.env.META_APP_SECRET,
      META_CONFIG_ID: process.env.META_CONFIG_ID,

      // Redis variables
      REDIS_URL: process.env.REDIS_URL,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,

      // Database variables
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

      // All environment variables starting with META or REDIS
      allMetaVars: Object.keys(process.env).filter(key => key.startsWith('META_')),
      allRedisVars: Object.keys(process.env).filter(key => key.startsWith('REDIS_')),
      allEnvVars: Object.keys(process.env).length
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment_variables: envVars
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
