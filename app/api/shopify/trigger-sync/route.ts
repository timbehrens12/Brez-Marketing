import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop') || 'brez-marketing-test-store.myshopify.com'
    const brandId = searchParams.get('brandId') || '1a30f34b-b048-4f80-b880-6c61bd12c720'
    
    console.log('[Trigger Sync] Manually triggering sync for:', { shop, brandId })
    
    // Get the host from the request
    const host = request.headers.get('host') || 'brezmarketingdashboard.com'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`
    
    // Trigger the sync
    const syncResponse = await fetch(`${baseUrl}/api/shopify/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shop: shop,
        brandId: brandId
      })
    })
    
    if (!syncResponse.ok) {
      const errorText = await syncResponse.text()
      throw new Error(`Sync failed: ${syncResponse.status} ${errorText}`)
    }
    
    const syncResult = await syncResponse.json()
    
    return NextResponse.json({
      success: true,
      message: 'Sync triggered successfully',
      syncResult,
      instructions: 'Wait 5-10 seconds, then check the test-connection endpoint again to see if data was synced.'
    })
    
  } catch (error) {
    console.error('[Trigger Sync] Error:', error)
    return NextResponse.json({
      error: 'Failed to trigger sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
