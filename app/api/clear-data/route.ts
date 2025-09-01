import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { enforceProduction, enforceAuthentication, enforceRateLimit, createSecureResponse, validateUUID } from '@/lib/security/middleware'
import { auth } from '@clerk/nextjs'

export async function DELETE(request: NextRequest) {
  // 🔒 SECURITY: Block in production
  const prodBlock = enforceProduction(request)
  if (prodBlock) return prodBlock

  // 🔒 SECURITY: Require authentication
  const authResult = await enforceAuthentication(request)
  if (authResult.response) return authResult.response

  // 🔒 SECURITY: Rate limiting for destructive operations
  const rateLimitResult = await enforceRateLimit(authResult.userId!, 'clear-data', 'critical')
  if (rateLimitResult) return rateLimitResult

  let requestUserId: string
  try {
    const body = await request.json()
    requestUserId = body.userId
    
    // 🔒 SECURITY: Validate UUID format
    if (!validateUUID(requestUserId)) {
      return createSecureResponse({ error: 'Invalid user ID format' }, 400)
    }
    
    // 🔒 SECURITY: Users can only clear their own data
    if (requestUserId !== authResult.userId) {
      console.warn(`🚨 SECURITY: User ${authResult.userId} attempted to clear data for user ${requestUserId}`)
      return createSecureResponse({ error: 'Unauthorized: Cannot clear other user data' }, 403)
    }
  } catch (error) {
    return createSecureResponse({ error: 'Invalid request body' }, 400)
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Delete in correct order to handle foreign key constraints
    await supabase
      .from('shopify_orders')
      .delete()
      .eq('user_id', requestUserId)

    await supabase
      .from('metrics')
      .delete()
      .eq('user_id', requestUserId)

    await supabase
      .from('platform_connections')
      .delete()
      .eq('user_id', requestUserId)

    console.log(`🔒 SECURE: Data cleared for authenticated user: ${authResult.userId}`)
    return createSecureResponse({ success: true })
  } catch (error) {
    console.error('Error clearing data:', error)
    return createSecureResponse(
      { error: 'Failed to clear data' },
      500
    )
  }
} 