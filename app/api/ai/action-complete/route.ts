import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { actionId, userId, campaignId } = await request.json()

    if (!actionId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // In a real app, you might store completed actions in a database
    // For now, we'll just return success and let the frontend handle state
    const completedAt = new Date().toISOString()

    return NextResponse.json({ 
      success: true, 
      actionId, 
      completedAt,
      message: 'Action marked as completed'
    })

  } catch (error) {
    console.error('Error marking action as complete:', error)
    return NextResponse.json({ error: 'Failed to complete action' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Action completion endpoint' })
} 