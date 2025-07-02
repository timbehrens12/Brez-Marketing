import { NextResponse } from 'next/server'

export async function GET() {
  const envCheck = {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  }

  console.log('Environment check:', envCheck)

  return NextResponse.json(envCheck)
} 