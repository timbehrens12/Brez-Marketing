import { NextResponse } from 'next/server'
import { withSecureAuth } from '@/lib/security/auth-helpers'

export async function POST(request: Request) {
  return withSecureAuth(
    request as any,
    async ({ userId, supabase, request }) => {
      const { brandId, platformType } = await request.json()

      try {
        console.log('Disconnecting platform:', { brandId, platformType, userId })
        
        // First, check if the connection exists - but don't use .single() since there might be multiple
        const { data: connections, error: connectionQueryError } = await supabase
          .from('platform_connections')
          .select('id')
          .eq('brand_id', brandId)
          .eq('platform_type', platformType)

        if (connectionQueryError) {
          console.error('Error finding connections:', connectionQueryError)
          return NextResponse.json(
            { error: 'Error querying connections' },
            { status: 500 }
          )
        }

        if (!connections || connections.length === 0) {
          console.error('No connections found for:', { brandId, platformType })
          return NextResponse.json(
            { error: 'Connection not found' },
            { status: 404 }
          )
        }

        console.log(`Found ${connections.length} connections to disconnect`)

        // Try to delete the connections directly - if there are foreign key constraints, return 409
        const { error: connectionError } = await supabase
          .from('platform_connections')
          .delete()
          .eq('brand_id', brandId)
          .eq('platform_type', platformType)

        if (connectionError) {
          console.error('Error deleting connections:', connectionError)
          
          // Check if it's a foreign key constraint error  
          if (connectionError.code === '23503' || (connectionError.message && connectionError.message.includes('foreign key constraint'))) {
            return NextResponse.json(
              { 
                error: 'Cannot disconnect platform. There is still related data that must be removed first. Use force disconnect to remove all data.',
                hasRelatedData: true,
                details: connectionError.message
              },
              { status: 409 }
            )
          }
          
          return NextResponse.json(
            { error: 'Failed to delete connection: ' + connectionError.message },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('Error disconnecting platform:', error)
        return NextResponse.json(
          { error: 'Failed to disconnect platform: ' + (error instanceof Error ? error.message : String(error)) },
          { status: 500 }
        )
      }
    },
    {
      requireBrandAccess: false,
      rateLimitTier: 'medium',
      endpoint: 'disconnect-platform'
    }
  )
}