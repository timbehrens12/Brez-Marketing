import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

export async function GET() {
  // Verify authentication - only authenticated users can check env
  const { userId } = auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
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