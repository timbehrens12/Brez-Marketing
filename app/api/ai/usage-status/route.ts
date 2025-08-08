import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { AIUsageService } from '@/lib/services/ai-usage-service'

export async function GET(request: NextRequest) {
  try {
    console.log('[AI Usage API] 📡 GET /api/ai/usage-status called')
    
    const { userId } = auth()
    console.log('[AI Usage API] 👤 User ID:', userId)
    
    if (!userId) {
      console.log('[AI Usage API] ❌ No user ID - unauthorized')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    console.log('[AI Usage API] 🏷️ Brand ID:', brandId)
    
    if (!brandId) {
      console.log('[AI Usage API] ❌ No brand ID provided')
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      )
    }

    console.log('[AI Usage API] 🔄 Creating AIUsageService...')
    const aiUsageService = new AIUsageService()
    
    // Get usage status for all AI features for this brand
    console.log('[AI Usage API] 📊 Getting usage stats for brand:', brandId)
    const usageStats = await aiUsageService.getUsageStats(brandId)
    console.log('[AI Usage API] ✅ Usage stats retrieved:', usageStats)
    
    return NextResponse.json(usageStats)
    
  } catch (error) {
    console.error('[AI Usage API] 💥 Error checking AI usage status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
