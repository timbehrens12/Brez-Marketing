import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Define some types to help with type safety
interface CampaignStat {
  campaign_id: string;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cost_per_conversion: number;
  roas: number;
  [key: string]: any;
}

interface Campaign {
  id: string;
  campaign_id: string;
  budget: number;
  budget_type: string;
  [key: string]: any;
}

/**
 * API endpoint to get Meta campaign data for a specific date range
 * Returns aggregated campaign data from the meta_campaign_daily_stats table
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')
    const status = url.searchParams.get('status') // Note: we'll ignore this and include all statuses
    const includeAll = url.searchParams.get('include_all') === 'true' // Flag to include all campaigns regardless of data
    const debug = url.searchParams.get('debug') === 'true' // Debug mode
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100 // Increased default limit
    const sortBy = url.searchParams.get('sortBy') || 'spent'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 })
    }

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'From and to dates are required' }, { status: 400 })
    }

    // Log the request
    console.log(`[Meta Campaigns Date Range] Fetching campaigns for brand ${brandId} from ${fromDate} to ${toDate}, include_all: ${includeAll}, debug: ${debug}`)

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    
    // First, get ALL campaign details from meta_campaigns table regardless of status
    // This ensures we have current budget information
    const { data: campaignDetails, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)
    
    if (campaignError) {
      console.error('Error fetching campaign details:', campaignError)
      return NextResponse.json({ error: 'Error fetching campaign data' }, { status: 500 })
    }
    
    if (!campaignDetails || campaignDetails.length === 0) {
      return NextResponse.json({ 
        campaigns: [],
        message: 'No campaigns found'
      })
    }
    
    console.log(`[Meta Campaigns Date Range] Found ${campaignDetails.length} campaigns total`)
    
    // Normalize date format to ensure consistency
    const normalizeDate = (dateStr: string): string => {
      if (!dateStr) return '';
      
      // If the date already contains a T (ISO format), extract just the date part
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
      }
      
      // Otherwise, assume it's already in YYYY-MM-DD format
      return dateStr;
    };
    
    const normalizedFromDate = normalizeDate(fromDate!);
    const normalizedToDate = normalizeDate(toDate!);
    
    console.log(`[Meta Campaigns Date Range] Normalized date range: ${normalizedFromDate} to ${normalizedToDate}`);
    
    // Get daily stats for all campaigns in the date range
    // First try with standard date comparison
    let { data: dailyStats, error: statsError } = await supabase
      .from('meta_campaign_daily_stats')
      .select('*')
      .eq('brand_id', brandId)
      .gte('date', normalizedFromDate)
      .lte('date', normalizedToDate);
    
    // If no data found or there was an error, try a different approach with substring matching
    if ((!dailyStats || dailyStats.length === 0) && debug) {
      console.log(`[Meta Campaigns Date Range DEBUG] No data found with standard date comparison, trying alternative approach`);
      
      // Try a more flexible approach that uses string operations if supported
      try {
        // This is a fallback to find dates that might be stored in a different format
        const { data: alternateStats, error: alternateError } = await supabase
          .from('meta_campaign_daily_stats')
          .select('*')
          .eq('brand_id', brandId)
          .filter('date', 'ilike', `%${normalizedFromDate}%`);
        
        if (alternateStats && alternateStats.length > 0) {
          console.log(`[Meta Campaigns Date Range DEBUG] Found ${alternateStats.length} records with alternate date approach`);
          dailyStats = alternateStats;
        }
      } catch (err) {
        console.log(`[Meta Campaigns Date Range DEBUG] Alternative date approach failed:`, err);
      }
    }
    
    if (statsError) {
      console.error('Error fetching daily campaign stats:', statsError)
      return NextResponse.json({ error: 'Error fetching campaign statistics' }, { status: 500 })
    }
    
    // Debug output - log all daily stats dates
    if (debug && dailyStats && dailyStats.length > 0) {
      const dates = [...new Set(dailyStats.map(stat => {
        // Normalize date format for debugging
        let dateStr = stat.date;
        if (typeof dateStr === 'string') {
          // Try to standardize the date format if it's a string
          if (dateStr.includes('T')) {
            dateStr = dateStr.split('T')[0];
          }
        } else if (dateStr instanceof Date) {
          dateStr = dateStr.toISOString().split('T')[0];
        }
        return dateStr;
      }))].sort();
      
      console.log(`[Meta Campaigns Date Range DEBUG] Found data for dates: ${dates.join(', ')}`);
      console.log(`[Meta Campaigns Date Range DEBUG] Looking for date range ${fromDate} to ${toDate}`);
      
      // Check if our requested dates are in the found dates
      const fromDateFound = dates.includes(fromDate);
      const toDateFound = dates.includes(toDate);
      
      console.log(`[Meta Campaigns Date Range DEBUG] From date found: ${fromDateFound}, To date found: ${toDateFound}`);
      
      // Try another query for exact date match to see if date format is the issue
      const { data: exactMatch, error: exactMatchError } = await supabase
        .from('meta_campaign_daily_stats')
        .select('date')
        .eq('brand_id', brandId)
        .eq('date', fromDate)
        .limit(5);
        
      console.log(`[Meta Campaigns Date Range DEBUG] Exact match for ${fromDate}: ${exactMatch?.length || 0} results`);
      
      // Log stats for each campaign
      const campaignStats: Record<string, string[]> = {};
      dailyStats.forEach(stat => {
        if (stat.campaign_id) {
          if (!campaignStats[stat.campaign_id]) {
            campaignStats[stat.campaign_id] = [];
          }
          if (stat.date) {
            // Normalize date before pushing
            let dateStr = stat.date;
            if (typeof dateStr === 'string' && dateStr.includes('T')) {
              dateStr = dateStr.split('T')[0];
            }
            campaignStats[stat.campaign_id].push(dateStr);
          }
        }
      });
      
      Object.keys(campaignStats).forEach(campaignId => {
        const campaign = campaignDetails.find(c => c.campaign_id === campaignId);
        const campaignName = campaign ? campaign.campaign_name : 'Unknown';
        console.log(`[Meta Campaigns Date Range DEBUG] Campaign ${campaignName} (${campaignId}) has data for dates: ${campaignStats[campaignId].sort().join(', ')}`);
      });
    }
    
    // Get the set of campaign IDs that have data in this date range
    const campaignIdsWithData = new Set<string>();
    
    // Add a more flexible date comparison function
    const isDateInRange = (dateValue: any, fromDate: string, toDate: string): boolean => {
      if (!dateValue) return false;
      
      let dateStr: string;
      
      // Handle various date formats
      if (typeof dateValue === 'string') {
        // For string dates, normalize to YYYY-MM-DD
        dateStr = dateValue.split('T')[0];
      } else if (dateValue instanceof Date) {
        // For Date objects
        dateStr = dateValue.toISOString().split('T')[0];
      } else {
        // Unsupported format
        return false;
      }
      
      // Compare normalized dates
      return dateStr >= fromDate && dateStr <= toDate;
    };
    
    // Filter dailyStats manually for better date handling
    const filteredDailyStats = dailyStats?.filter(stat => 
      isDateInRange(stat.date, normalizedFromDate, normalizedToDate)
    ) || [];
    
    // Extract campaign IDs from filtered stats
    filteredDailyStats.forEach(stat => {
      if (stat && stat.campaign_id) {
        campaignIdsWithData.add(stat.campaign_id);
      }
    });
    
    if (debug) {
      console.log(`[Meta Campaigns Date Range] After flexible date filtering: Found ${campaignIdsWithData.size} campaigns with data`);
    }
    
    console.log(`[Meta Campaigns Date Range] Found ${campaignIdsWithData.size} campaigns with data in date range ${fromDate} to ${toDate}`)
    
    // If debug mode and no campaigns with data, list the expected date format and actual dates
    if (debug && campaignIdsWithData.size === 0) {
      console.log(`[Meta Campaigns Date Range DEBUG] Expected date format: YYYY-MM-DD`);
      console.log(`[Meta Campaigns Date Range DEBUG] From date: ${fromDate}`);
      console.log(`[Meta Campaigns Date Range DEBUG] To date: ${toDate}`);
      
      // Check if there's any data at all in the table
      const { data: anyStats, error: anyStatsError } = await supabase
        .from('meta_campaign_daily_stats')
        .select('date')
        .eq('brand_id', brandId)
        .limit(10);
        
      if (anyStats && anyStats.length > 0) {
        console.log(`[Meta Campaigns Date Range DEBUG] Sample dates in the table: ${anyStats.map(s => s.date).join(', ')}`);
      }
    }
    
    // Determine which campaigns to include in the response
    let relevantCampaigns: any[]
    
    if (includeAll) {
      // If includeAll is true, use all campaigns but flag the ones with data
      relevantCampaigns = campaignDetails.map(campaign => ({
        ...campaign,
        has_data_in_range: campaignIdsWithData.has(campaign.campaign_id)
      }))
      console.log(`[Meta Campaigns Date Range] Including all ${relevantCampaigns.length} campaigns with has_data_in_range flag`)
    } else {
      // Otherwise, only include campaigns that have data in this date range
      relevantCampaigns = campaignDetails.filter(campaign => 
        campaignIdsWithData.has(campaign.campaign_id)
      )
      console.log(`[Meta Campaigns Date Range] Filtered to ${relevantCampaigns.length} campaigns with data in range`)
    }
    
    // Use filteredDailyStats for all downstream operations instead of dailyStats
    
    // Group daily stats by campaign_id
    const statsByCampaign: Record<string, CampaignStat[]> = {}
    
    // Initialize empty arrays for each campaign_id
    relevantCampaigns.forEach(campaign => {
      statsByCampaign[campaign.campaign_id] = []
    })
    
    // Add each stat to the appropriate campaign array
    filteredDailyStats.forEach(stat => {
      if (stat && stat.campaign_id && statsByCampaign[stat.campaign_id]) {
        statsByCampaign[stat.campaign_id].push(stat as CampaignStat)
      }
    })
    
    // Combine campaign details with aggregated daily stats
    const campaigns = relevantCampaigns.map(campaign => {
      const campaignStats = statsByCampaign[campaign.campaign_id] || []
      
      // Calculate aggregated metrics for the date range
      const spend = campaignStats.reduce((sum: number, stat: CampaignStat) => sum + (Number(stat.spend) || 0), 0)
      const impressions = campaignStats.reduce((sum: number, stat: CampaignStat) => sum + (Number(stat.impressions) || 0), 0)
      const clicks = campaignStats.reduce((sum: number, stat: CampaignStat) => sum + (Number(stat.clicks) || 0), 0)
      const reach = campaignStats.reduce((sum: number, stat: CampaignStat) => sum + (Number(stat.reach) || 0), 0)
      const conversions = campaignStats.reduce((sum: number, stat: CampaignStat) => sum + (Number(stat.conversions) || 0), 0)
      
      // Calculate derived metrics
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
      const cpc = clicks > 0 ? spend / clicks : 0
      const cost_per_conversion = conversions > 0 ? spend / conversions : 0
      
      // Calculate weighted ROAS
      let roas = 0
      if (campaignStats.length > 0) {
        const roasStats = campaignStats.filter(stat => stat.spend > 0 && stat.roas > 0)
        if (roasStats.length > 0) {
          const totalSpend = roasStats.reduce((sum: number, stat: CampaignStat) => sum + stat.spend, 0)
          const weightedRoas = roasStats.reduce((sum: number, stat: CampaignStat) => sum + (stat.roas * stat.spend), 0)
          roas = totalSpend > 0 ? weightedRoas / totalSpend : 0
        }
      }
      
      // Log campaign data for debug
      if (debug) {
        console.log(`[Meta Campaigns Date Range DEBUG] Campaign "${campaign.campaign_name}" (${campaign.campaign_id}):`)
        console.log(`  - Has data: ${campaignIdsWithData.has(campaign.campaign_id)}`)
        console.log(`  - Data points: ${campaignStats.length}`)
        console.log(`  - Spend: ${spend}`)
        console.log(`  - Impressions: ${impressions}`)
        console.log(`  - Clicks: ${clicks}`)
      }
      
      // Return campaign with:
      // 1. Current campaign details (name, status, budget, etc.)
      // 2. Aggregated performance metrics for the date range
      return {
        ...campaign, // Keep all current campaign data (including current budget)
        spent: spend,
        impressions,
        clicks,
        reach,
        conversions,
        ctr,
        cpc,
        cost_per_conversion,
        roas,
        // Flag indicating if this campaign had data in the date range
        has_data_in_range: campaignIdsWithData.has(campaign.campaign_id),
        daily_insights: campaignStats.map(stat => ({
          date: stat.date,
          campaign_id: stat.campaign_id,
          spent: Number(stat.spend) || 0,
          impressions: Number(stat.impressions) || 0,
          clicks: Number(stat.clicks) || 0,
          reach: Number(stat.reach) || 0,
          conversions: Number(stat.conversions) || 0,
          ctr: Number(stat.ctr) || 0,
          cpc: Number(stat.cpc) || 0,
          cost_per_conversion: Number(stat.cost_per_conversion) || 0,
          roas: Number(stat.roas) || 0
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      }
    })
    
    // Sort campaigns based on the specified metric
    // When include_all is true, campaigns with data should appear first
    const sortedCampaigns = [...campaigns].sort((a, b) => {
      // When includeAll is true, prioritize campaigns with data
      if (includeAll) {
        if (a.has_data_in_range && !b.has_data_in_range) return -1;
        if (!a.has_data_in_range && b.has_data_in_range) return 1;
      }
      
      // Then apply the normal sorting
      const valueA = a[sortBy] || 0
      const valueB = b[sortBy] || 0
      
      if (sortOrder.toLowerCase() === 'asc') {
        return valueA - valueB
      } else {
        return valueB - valueA
      }
    })
    
    // Apply limit if specified
    const limitedCampaigns = limit > 0 ? sortedCampaigns.slice(0, limit) : sortedCampaigns
    
    return NextResponse.json({
      campaigns: limitedCampaigns,
      dateRange: {
        from: fromDate,
        to: toDate
      },
      campaignsWithData: campaignIdsWithData.size,
      totalCampaigns: campaignDetails.length,
      lastRefresh: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('[Meta Campaigns Date Range] Error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: typeof error === 'object' && error !== null && 'message' in error 
        ? (error.message as string) 
        : 'Unknown error'
    }, { status: 500 })
  }
} 