import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/server'

// TEMPORARY RESET ENDPOINT - DELETE AFTER USE
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only allow specific user (replace with your actual user ID)
    const ALLOWED_USER_ID = 'user_31G4OwE2UKx42Pj3Y6UT5BWcdpL'; // Replace with your actual user ID
    
    if (userId !== ALLOWED_USER_ID) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const supabase = createClient();
    
    // Delete only this user's creative generation usage
    const { error } = await supabase
      .from('ai_feature_usage')
      .delete()
      .eq('user_id', userId)
      .eq('feature_type', 'creative_generation');

    if (error) {
      console.error('Error resetting usage:', error);
      return NextResponse.json({ error: 'Failed to reset usage' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Usage reset to 0 for user: ' + userId 
    });

  } catch (error) {
    console.error('Reset usage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
