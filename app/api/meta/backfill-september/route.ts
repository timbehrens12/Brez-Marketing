import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

/**
 * Emergency endpoint to backfill September 2025 data
 * This will sync all missing dates for September
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get brand ID from request
    const { brandId } = await request.json();
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
    }

    console.log(`[September Backfill] Starting backfill for brand ${brandId}`);

    // Get Meta connection
    const { data: connection, error: connError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();

    if (connError || !connection) {
      console.error('[September Backfill] No active Meta connection found');
      return NextResponse.json({ error: 'No active Meta connection' }, { status: 400 });
    }

    // Check existing September data
    const { data: existing, error: existingError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date')
      .eq('brand_id', brandId)
      .gte('date', '2025-09-01')
      .lte('date', '2025-09-30')
      .order('date');

    const existingDates = new Set(existing?.map(d => d.date) || []);
    console.log(`[September Backfill] Existing dates: ${Array.from(existingDates).join(', ')}`);

    // Generate all September dates
    const allSeptemberDates = [];
    for (let day = 1; day <= 30; day++) {
      allSeptemberDates.push(`2025-09-${day.toString().padStart(2, '0')}`);
    }

    const missingDates = allSeptemberDates.filter(d => !existingDates.has(d));
    console.log(`[September Backfill] Missing dates: ${missingDates.join(', ')}`);

    if (missingDates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All September dates already synced',
        existing: existingDates.size,
        missing: 0
      });
    }

    // Trigger sync for September
    const startDate = '2025-09-01';
    const endDate = '2025-09-30';

    console.log(`[September Backfill] Triggering sync for ${startDate} to ${endDate}`);

    // Call the meta sync endpoint
    const syncResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.brezmarketingdashboard.com'}/api/meta/sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          startDate,
          endDate,
          syncDemographics: false, // Skip demographics for faster sync
          priority: 'high'
        })
      }
    );

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('[September Backfill] Sync failed:', errorText);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Sync request failed',
          details: errorText
        }, 
        { status: 500 }
      );
    }

    const syncResult = await syncResponse.json();
    console.log('[September Backfill] Sync response:', syncResult);

    // Verify the backfill
    const { data: afterSync, error: afterError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('date')
      .eq('brand_id', brandId)
      .gte('date', '2025-09-01')
      .lte('date', '2025-09-30')
      .order('date');

    const afterDates = afterSync?.map(d => d.date) || [];

    return NextResponse.json({
      success: true,
      message: 'September backfill completed',
      before: {
        dates: existingDates.size,
        list: Array.from(existingDates)
      },
      missing: {
        count: missingDates.length,
        list: missingDates
      },
      after: {
        dates: afterDates.length,
        list: afterDates
      },
      syncResult
    });

  } catch (error: any) {
    console.error('[September Backfill] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}

