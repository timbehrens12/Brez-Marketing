import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';

/**
 * Debug endpoint to reset lead generation usage to 0
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`[Reset Lead Gen Usage] Resetting for user ${userId}`);

    // Reset ai_usage_tracking for lead gen features
    const { data: resetAiTracking, error: resetAiError } = await supabase
      .from('ai_usage_tracking')
      .update({
        daily_usage_count: 0,
        monthly_usage_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .in('feature_type', ['lead_gen_ecommerce', 'lead_gen_enrichment'])
      .select();

    if (resetAiError) {
      console.error('[Reset Lead Gen Usage] Error resetting ai_usage_tracking:', resetAiError);
      return NextResponse.json({ error: 'Failed to reset usage' }, { status: 500 });
    }

    // Also reset legacy user_usage table
    const { data: resetUserUsage, error: resetUserError } = await supabase
      .from('user_usage')
      .delete()
      .eq('user_id', userId);

    if (resetUserError) {
      console.error('[Reset Lead Gen Usage] Error resetting user_usage:', resetUserError);
    }

    // Reset niche usage
    const { data: resetNicheUsage, error: resetNicheError } = await supabase
      .from('user_niche_usage')
      .delete()
      .eq('user_id', userId);

    if (resetNicheError) {
      console.error('[Reset Lead Gen Usage] Error resetting user_niche_usage:', resetNicheError);
    }

    console.log(`[Reset Lead Gen Usage] ✅ Reset complete. Updated ${resetAiTracking?.length || 0} ai_usage_tracking records`);

    return NextResponse.json({
      success: true,
      message: 'Lead generation usage reset to 0',
      recordsUpdated: resetAiTracking?.length || 0,
      updatedRecords: resetAiTracking
    });

  } catch (error: any) {
    console.error('[Reset Lead Gen Usage] Error:', error);
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

