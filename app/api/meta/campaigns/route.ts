import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMetaApi } from '@/lib/meta';
import { getPeriodDates } from '@/lib/date-utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const brandId = searchParams.get('brandId');
  const period = searchParams.get('period') || 'monthly';

  if (!brandId) {
    return NextResponse.json(
      { error: 'Brand ID is required' },
      { status: 400 }
    );
  }

  try {
    // Get the connected Meta account for this brand
    const metaConnection = await prisma.metaConnection.findFirst({
      where: {
        brandId: brandId,
        active: true,
      },
    });

    if (!metaConnection) {
      return NextResponse.json(
        { 
          error: 'No active Meta connection found',
          campaigns: [] 
        },
        { status: 200 }
      );
    }

    // Get date range based on period
    const { startDate, endDate } = getPeriodDates(period);
    
    // Initialize Meta API
    const metaApi = await getMetaApi(metaConnection);
    
    if (!metaApi) {
      return NextResponse.json(
        { 
          error: 'Could not initialize Meta API',
          campaigns: [] 
        },
        { status: 200 }
      );
    }

    // Fetch campaigns from Meta Marketing API
    const adAccounts = await metaApi.getAdAccounts();
    
    if (!adAccounts || adAccounts.length === 0) {
      return NextResponse.json(
        {
          error: 'No ad accounts found',
          campaigns: []
        },
        { status: 200 }
      );
    }

    const adAccountId = adAccounts[0].id;
    
    const campaignsResponse = await metaApi.getCampaigns({
      adAccountId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      fields: [
        'campaign_name',
        'spend',
        'impressions',
        'clicks',
        'conversions',
        'cpm',
        'cpc',
        'ctr',
        'cpa',
        'purchase_roas',
      ],
    });

    // Format the response
    const campaigns = campaignsResponse?.data?.map((campaign: any) => {
      const spend = parseFloat(campaign.spend || '0');
      const conversions = parseFloat(campaign.conversions || '0');
      const revenue = campaign.purchase_roas 
        ? parseFloat(campaign.purchase_roas[0]?.value || '0') * spend 
        : 0;
      
      return {
        id: campaign.campaign_id,
        name: campaign.campaign_name,
        spend: spend,
        impressions: parseInt(campaign.impressions || '0'),
        clicks: parseInt(campaign.clicks || '0'),
        conversions: conversions,
        revenue: revenue,
        cpm: parseFloat(campaign.cpm || '0'),
        cpc: parseFloat(campaign.cpc || '0'),
        ctr: parseFloat(campaign.ctr || '0') * 100, // Convert to percentage
        cpa: conversions > 0 ? spend / conversions : 0,
        roas: spend > 0 ? revenue / spend : 0,
      };
    }) || [];

    // Filter out test/demo campaigns
    const filteredCampaigns = campaigns.filter((campaign: any) => {
      if (!campaign || !campaign.name || typeof campaign.name !== 'string') return false;
      const name = campaign.name.toLowerCase();
      return !name.includes('test') && 
            !name.includes('demo') && 
            !name.includes('sample') && 
            !name.includes('unused') &&
            !name.includes('placeholder');
    });

    // Sort by ROAS descending
    const sortedCampaigns = filteredCampaigns.sort((a: any, b: any) => b.roas - a.roas);

    return NextResponse.json({ campaigns: sortedCampaigns });
  } catch (error) {
    console.error('Error fetching campaign data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch campaign data',
        message: error instanceof Error ? error.message : 'Unknown error',
        campaigns: [] 
      },
      { status: 200 }
    );
  }
} 