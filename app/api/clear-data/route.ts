import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { userId } = await request.json()

  try {
    // Delete in correct order to handle foreign key constraints
    await supabase
      .from('shopify_orders')
      .delete()
      .eq('user_id', userId)

    await supabase
      .from('metrics')
      .delete()
      .eq('user_id', userId)

    await supabase
      .from('platform_connections')
      .delete()
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing data:', error)
    return NextResponse.json(
      { error: 'Failed to clear data' },
      { status: 500 }
    )
  }
} 