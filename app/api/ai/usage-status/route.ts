import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { AIUsageService } from '@/lib/services/ai-usage-service'

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')
    
    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      )
    }

    const aiUsageService = new AIUsageService()
    
    // Get usage status for all AI features for this brand
    const usageStats = await aiUsageService.getUsageStats(brandId)
    
    return NextResponse.json(usageStats)
    
  } catch (error) {
    console.error('Error checking AI usage status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
