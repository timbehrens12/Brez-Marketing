import { NextRequest, NextResponse } from 'next/server'
import { enforceProduction, enforceAuthentication, enforceRateLimit, createSecureResponse } from '@/lib/security/middleware'
import { auth } from '@clerk/nextjs'

export async function GET(request: NextRequest) {
  // 🔒 SECURITY: Block in production
  const prodBlock = enforceProduction(request)
  if (prodBlock) return prodBlock

  // 🔒 SECURITY: Require authentication
  const authResult = await enforceAuthentication(request)
  if (authResult.response) return authResult.response

  // 🔒 SECURITY: Rate limiting
  const rateLimitResult = await enforceRateLimit(authResult.userId!, 'debug-env', 'critical')
  if (rateLimitResult) return rateLimitResult

  // 🔒 SECURITY: Only show safe environment status (no secrets)
  const envCheck = {
    hasRequiredEnvVars: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.OPENAI_API_KEY
    ),
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    status: 'healthy'
  }

  console.log('🔒 SECURE: Environment check accessed by authenticated user:', authResult.userId)

  return createSecureResponse(envCheck)
} 