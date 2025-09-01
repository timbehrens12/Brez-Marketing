import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { explainMetric } from '@/lib/openai';
import { auth } from '@clerk/nextjs';

export async function POST(request: NextRequest) {
  // Define metric outside try block so it's accessible in catch
  let metric: { name: string; value: number; change: number } | undefined;
  
  try {
    // Verify authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { brandId, metric: metricData, historicalData } = await request.json();
    metric = metricData; // Assign to outer variable
    
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

    // Limit historical data to reduce payload size
    const limitedHistoricalData = historicalData ? 
      historicalData.slice(0, 10) : // Only use the 10 most recent data points
      [];

    // Generate explanation using GPT-4
    const explanation = await explainMetric(metric, limitedHistoricalData);
    
    return NextResponse.json({ explanation });
    
  } catch (error) {
    console.error('Error generating metric explanation:', error);
    
    // Return a user-friendly fallback explanation
    return NextResponse.json({
      explanation: `${metric?.name || 'This metric'} is ${metric?.value || 'changing'}. Unable to provide a detailed explanation at this time due to high demand. Please try again in a moment.`
    });
  }
} 