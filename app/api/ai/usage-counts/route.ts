import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Get usage counts for all AI features
 * POST /api/ai/usage-counts
 * Body: { userId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: bodyUserId } = await req.json()
    const { userId: authUserId } = await auth()
    
    const userId = bodyUserId || authUserId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    // Get AI usage tracking data
    const { data: usageData, error } = await supabase
      .from('ai_usage_tracking')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching usage data:', error)
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
    }

    // Calculate usage for each feature
    const calculateUsage = (featureType: string) => {
      const records = usageData?.filter(r => r.feature_type === featureType) || []
      
      // Daily usage
      const dailyRecord = records.find(r => r.daily_usage_date === today)
      const daily = dailyRecord?.daily_usage_count || 0
      
      // Monthly usage
      const monthlyRecords = records.filter(r => {
        const recordMonth = r.monthly_usage_month?.split('T')[0]
        return recordMonth === firstOfMonth
      })
      const monthly = monthlyRecords.reduce((sum, r) => sum + (r.monthly_usage_count || 0), 0)
      
      return { daily, monthly }
    }

    const usageCounts = {
      creativeStudio: calculateUsage('creative_generation'),
      leadGenerator: calculateUsage('lead_gen_ecommerce'),
      outreachTool: calculateUsage('outreach_messages'),
      aiConsultant: calculateUsage('ai_consultant_chat'),
      brandReport: calculateUsage('brand_report'),
      marketingAssistant: calculateUsage('marketing_analysis')
    }

    return NextResponse.json(usageCounts)
  } catch (error) {
    console.error('Error in usage-counts endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

