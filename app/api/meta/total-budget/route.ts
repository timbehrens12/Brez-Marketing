import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get brandId from query parameters
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brandId');
    const activeOnly = url.searchParams.get('activeOnly') === 'true';
    
    if (!brandId) {
      // Return zero budget instead of error for missing brandId
      return NextResponse.json({ 
        success: true, 
        totalBudget: 0, 
        adSetCount: 0,
        message: 'No brandId provided' 
      });
    }

    const supabase = createClient();
    
    // Get ad sets for this brand with basic info
    let query = supabase
      .from('meta_adset')
      .select('id, budget, budget_type, status')
      .eq('brand_id', brandId);
      
    // Filter to only active ad sets if requested
    if (activeOnly) {
      query = query.eq('status', 'ACTIVE');
    }
    
    const { data: adSets, error } = await query;
    
    if (error) {
      console.error('Error fetching ad sets:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch ad sets',
        // Return a default instead of error for better UX
        totalBudget: 0,
        adSetCount: 0
      }, { status: 200 }); // Use 200 instead of 500 to prevent repeated error logs
    }
    
    // Calculate total budget
    const totalBudget = adSets?.reduce((sum, adSet) => {
      if (adSet.budget) {
        return sum + adSet.budget;
      }
      return sum;
    }, 0) || 0;
    
    return NextResponse.json({
      success: true,
      totalBudget,
      adSetCount: adSets?.length || 0
    });
    
  } catch (error) {
    console.error('Error in total budget API:', error);
    // Return 200 with default values to prevent client errors
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to calculate total budget',
      totalBudget: 0,
      adSetCount: 0
    }, { status: 200 });
  }
} 