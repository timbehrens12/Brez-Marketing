import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Onboarding API] Setting showOnboarding flag for user: ${userId}`)

    // Set the showOnboarding flag in user metadata
    await clerkClient.users.updateUserMetadata(userId, {
      unsafeMetadata: {
        showOnboarding: true
      }
    })

    console.log(`[Onboarding API] Successfully set showOnboarding flag for user: ${userId}`)
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[Onboarding API] Error setting showOnboarding flag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
