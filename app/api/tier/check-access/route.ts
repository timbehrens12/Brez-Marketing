import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { tierEnforcementService } from '@/lib/services/tier-enforcement-service'

/**
 * Check if user has access to a specific feature based on their tier
 * 
 * POST /api/tier/check-access
 * Body: { feature: 'lead_generation' | 'outreach_tool' | 'white_label' | 'team_members' }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { feature } = body

    if (!feature) {
      return NextResponse.json({ error: 'Feature is required' }, { status: 400 })
    }

    // Check feature access
    const accessResult = await tierEnforcementService.canAccessFeature(userId, feature)

    return NextResponse.json(accessResult)
  } catch (error) {
    console.error('Error checking tier access:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

