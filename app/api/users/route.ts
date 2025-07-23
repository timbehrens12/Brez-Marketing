import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userIds } = await request.json()
    
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds array is required' }, { status: 400 })
    }

    // Limit to 50 users max to prevent abuse
    if (userIds.length > 50) {
      return NextResponse.json({ error: 'Too many userIds (max 50)' }, { status: 400 })
    }

    try {
      // Fetch user information from Clerk for each user ID
      const userPromises = userIds.map(async (id: string) => {
        try {
          const user = await clerkClient.users.getUser(id)
          return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            emailAddress: user.emailAddresses?.[0]?.emailAddress,
            imageUrl: user.imageUrl,
            fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.emailAddresses?.[0]?.emailAddress || 'Unknown User'
          }
        } catch (error) {
          console.error(`Error fetching user ${id}:`, error)
          return {
            id,
            firstName: null,
            lastName: null,
            emailAddress: null,
            imageUrl: null,
            fullName: 'Unknown User'
          }
        }
      })

      const users = await Promise.all(userPromises)
      
      return NextResponse.json({ 
        success: true,
        users: users.reduce((acc, user) => {
          acc[user.id] = user
          return acc
        }, {} as Record<string, any>)
      })

    } catch (error) {
      console.error('Error fetching users from Clerk:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch user information',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 