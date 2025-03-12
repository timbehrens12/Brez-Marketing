import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { explainMetric } from '@/lib/openai';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { brandId, metric, historicalData } = await request.json();
    
    if (!brandId || !metric) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('user_id', userId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 403 });
    }

    // Generate explanation using GPT-4
    const explanation = await explainMetric(metric, historicalData);
    
    return NextResponse.json({ explanation });
    
  } catch (error) {
    console.error('Error generating metric explanation:', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 