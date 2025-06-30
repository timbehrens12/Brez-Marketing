/**
 * API endpoint to update Meta connection metadata
 * This allows for fixing missing ad_account_id issue without restarting the server
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { brandId, forceUpdate = false } = await request.json();
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }
    
    console.log(`[update-connection] Starting update for brand ${brandId}, force update: ${forceUpdate}`);
    
    // Create Supabase client
    const supabase = createClient();
    
    // Get Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform_type', 'meta')
      .eq('status', 'active')
      .single();
    
    if (connectionError || !connection) {
      console.error(`[update-connection] Meta connection not found for brand ${brandId}:`, connectionError);
      return NextResponse.json({ error: 'Meta connection not found' }, { status: 404 });
    }
    
    // Check if the connection already has ad_account_id
    const hasAdAccountId = connection.metadata && connection.metadata.ad_account_id;
    
    if (hasAdAccountId && !forceUpdate) {
      console.log(`[update-connection] Connection ${connection.id} already has ad_account_id: ${connection.metadata.ad_account_id}`);
      return NextResponse.json({
        success: true,
        message: 'Connection already has ad_account_id',
        connection: {
          id: connection.id,
          brand_id: connection.brand_id,
          metadata: connection.metadata
        }
      });
    }
    
    // Fetch ad accounts from Meta
    const accountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`
    );
    
    if (!accountsResponse.ok) {
      const error = await accountsResponse.json();
      console.error(`[update-connection] Error fetching ad accounts:`, error);
      return NextResponse.json({ error: 'Error fetching ad accounts from Meta', details: error }, { status: 500 });
    }
    
    const accountsData = await accountsResponse.json();
    
    if (!accountsData.data || accountsData.data.length === 0) {
      console.log(`[update-connection] No ad accounts found for brand ${brandId}`);
      return NextResponse.json({ error: 'No ad accounts found for this Meta user' }, { status: 400 });
    }
    
    // Use the first ad account
    const firstAccount = accountsData.data[0];
    const accountId = firstAccount.account_id || firstAccount.id.replace('act_', '');
    const adAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    console.log(`[update-connection] Found ad account id: ${adAccountId}, updating connection metadata`);
    
    // Update the connection with the ad_account_id
    const updatedMetadata = {
      ...(connection.metadata || {}),
      ad_account_id: adAccountId
    };
    
    // Update the platform_connections table
    const { error: updateError } = await supabase
      .from('platform_connections')
      .update({ metadata: updatedMetadata })
      .eq('id', connection.id);
    
    if (updateError) {
      console.error(`[update-connection] Error updating connection metadata:`, updateError);
      return NextResponse.json({ error: 'Error updating connection metadata', details: updateError }, { status: 500 });
    }
    
    console.log(`[update-connection] Updated connection ${connection.id} with ad_account_id: ${adAccountId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Connection updated successfully',
      connection: {
        id: connection.id,
        brand_id: connection.brand_id,
        metadata: updatedMetadata
      }
    });
  } catch (error) {
    console.error(`[update-connection] Server error:`, error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 