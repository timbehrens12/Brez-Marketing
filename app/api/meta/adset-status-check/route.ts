import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/server';
import { MetaService } from '@/lib/services/meta';

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - You must be logged in to access this resource' },
        { status: 401 }
      );
    }

    // Parse request body
    const data = await request.json();
    const { brandId, adsetId, forceRefresh = false } = data;

    if (!brandId || !adsetId) {
      return NextResponse.json(
        { error: 'Brand ID and Ad Set ID are required parameters' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient();

    // Check if user has access to this brand
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single();

    if (brandError || !brandData) {
      return NextResponse.json(
        { error: 'Brand not found or you do not have access to it' },
        { status: 404 }
      );
    }

    // Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();
      
    if (connectionError || !connection || !connection.access_token) {
      return NextResponse.json(
        { error: 'No valid Meta connection found for this brand' },
        { status: 400 }
      );
    }

    // Get ad set details from Meta API
    const cacheBuster = `refresh=${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const apiUrl = `https://graph.facebook.com/v18.0/${adsetId}?fields=effective_status,status,configured_status&access_token=${connection.access_token}&${cacheBuster}`;

    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[adset-status-check] Meta API error for adset ${adsetId}:`, errorText);
      return NextResponse.json(
        { error: `Failed to fetch ad set status: ${response.status}` },
        { status: response.status }
      );
    }

    const adSetData = await response.json();
    
    // Prioritize effective_status which gives the real runtime status
    const adSetStatus = adSetData.effective_status || adSetData.configured_status || adSetData.status || 'UNKNOWN';
    const timestamp = new Date().toISOString();

    // Update the ad set status in the database
    if (forceRefresh || adSetStatus !== 'UNKNOWN') {
      const { error: updateError } = await supabase
        .from('meta_adsets')
        .update({ 
          status: adSetStatus,
          updated_at: timestamp
        })
        .eq('adset_id', adsetId)
        .eq('brand_id', brandId);

      if (updateError) {
        console.error(`[adset-status-check] Error updating ad set ${adsetId}:`, updateError);
        return NextResponse.json(
          { error: 'Failed to update ad set status in database' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      status: adSetStatus,
      timestamp
    });
  } catch (error) {
    console.error('[adset-status-check] Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: (error as Error).message },
      { status: 500 }
    );
  }
} 