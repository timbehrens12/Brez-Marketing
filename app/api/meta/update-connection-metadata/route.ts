/**
 * API endpoint for updating Meta connection metadata with ad_account_id
 * 
 * This is a utility endpoint to help fix Meta connections that have a missing ad_account_id
 * in their metadata, which is required for certain API calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brandId } = body;

    // Validate required parameters
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 });
    }

    console.log(`[update-connection-metadata] Updating metadata for brand ${brandId}`);

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
      console.error('[update-connection-metadata] Meta connection not found for brandId:', brandId, 'Error:', connectionError);
      return NextResponse.json({ error: 'Meta connection not found' }, { status: 404 });
    }

    // Exit early if we already have ad_account_id
    if (connection.metadata && connection.metadata.ad_account_id) {
      console.log(`[update-connection-metadata] Connection already has ad_account_id: ${connection.metadata.ad_account_id}`);
      return NextResponse.json({
        success: true,
        message: 'Connection already has ad_account_id',
        metadata: connection.metadata
      });
    }

    // Fetch ad accounts from Meta
    if (!connection.access_token) {
      return NextResponse.json({ error: 'Connection missing access token' }, { status: 400 });
    }

    try {
      console.log(`[update-connection-metadata] Fetching ad accounts from Meta`);
      const adAccountsResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&access_token=${connection.access_token}`
      );

      if (!adAccountsResponse.ok) {
        const errorText = await adAccountsResponse.text();
        console.error('[update-connection-metadata] Meta API error:', errorText);
        return NextResponse.json(
          { error: 'Failed to fetch ad accounts from Meta', details: errorText },
          { status: adAccountsResponse.status }
        );
      }

      const adAccountsData = await adAccountsResponse.json();

      if (!adAccountsData.data || adAccountsData.data.length === 0) {
        console.log(`[update-connection-metadata] No ad accounts found for brand ${brandId}`);
        return NextResponse.json({
          success: false,
          error: 'No Meta ad accounts found for this connection'
        });
      }

      console.log(`[update-connection-metadata] Found ${adAccountsData.data.length} ad accounts`);

      // Use the first ad account
      const firstAccount = adAccountsData.data[0];
      const accountId = firstAccount.id.replace('act_', '');

      console.log(`[update-connection-metadata] Using ad account ${accountId} (${firstAccount.name || 'Unnamed'})`);

      // Update the connection metadata
      const metadata = {
        ...(connection.metadata || {}),
        ad_account_id: accountId,
        ad_account_name: firstAccount.name || 'Meta Ad Account'
      };

      const { error: updateError } = await supabase
        .from('platform_connections')
        .update({ metadata })
        .eq('id', connection.id);

      if (updateError) {
        console.error('[update-connection-metadata] Error updating connection metadata:', updateError);
        return NextResponse.json(
          { error: 'Failed to update connection metadata', details: updateError },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Connection metadata updated successfully',
        metadata,
        accounts: adAccountsData.data.map((account: any) => ({
          id: account.id,
          name: account.name,
          account_id: account.account_id
        }))
      });
    } catch (apiError) {
      console.error('[update-connection-metadata] Error calling Meta API:', apiError);
      return NextResponse.json(
        { error: 'Error fetching ad accounts', details: (apiError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[update-connection-metadata] Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: (error as Error).message },
      { status: 500 }
    );
  }
} 