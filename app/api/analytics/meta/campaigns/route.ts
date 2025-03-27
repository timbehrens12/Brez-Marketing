import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { format, isValid, isPast } from 'date-fns'

// Define types for our data
interface MetaInsight {
  campaign_id: string;
  campaign_name: string;
  status?: string;
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  date: string;
  brand_id: string;
  [key: string]: any;
}

interface CampaignResponse {
  id: string;
  campaign_name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  start_date?: string | null;
  end_date?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const rawFromDate = url.searchParams.get('from')
    const rawToDate = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    
    // Create mutable copies of the date parameters
    let fromDate = rawFromDate;
    let toDate = rawToDate;
    
    // Immediately log the raw request parameters
    console.log(`Meta Campaigns API - Raw parameters received:`, {
      brandId,
      fromDate,
      toDate,
      preset,
      fullUrl: request.url
    })
    
    // Override date parameters if 'today' preset is detected
    if (preset === 'today') {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      
      console.log(`'today' preset detected - ENFORCING EXACT CURRENT DATE: ${todayStr}`);
      
      // Force both dates to be today's exact date
      fromDate = todayStr;
      toDate = todayStr;
    }
    
    // Similarly handle yesterday preset 
    if (preset === 'yesterday') {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
      
      console.log(`'yesterday' preset detected - ENFORCING EXACT YESTERDAY DATE: ${yesterdayStr}`);
      
      // Force both dates to be yesterday's exact date
      fromDate = yesterdayStr;
      toDate = yesterdayStr;
    }
    
    // Check for potential date format issues upfront
    if (fromDate && !isValid(new Date(fromDate))) {
      console.error(`Invalid from date format received: ${fromDate}`)
    }
    
    if (toDate && !isValid(new Date(toDate))) {
      console.error(`Invalid to date format received: ${toDate}`)
    }
    
    // Log year values for potentially problematic dates in future
    try {
      if (fromDate) {
        const parsedFromDate = new Date(fromDate)
        if (isValid(parsedFromDate)) {
          const fromYear = parsedFromDate.getFullYear()
          const currentYear = new Date().getFullYear()
          if (fromYear > currentYear) {
            console.warn(`Future year detected in fromDate: ${fromYear} > ${currentYear}`)
          }
        }
      }
      
      if (toDate) {
        const parsedToDate = new Date(toDate)
        if (isValid(parsedToDate)) {
          const toYear = parsedToDate.getFullYear()
          const currentYear = new Date().getFullYear()
          if (toYear > currentYear) {
            console.warn(`Future year detected in toDate: ${toYear} > ${currentYear}`)
          }
        }
      }
    } catch (e) {
      console.error('Error validating date years:', e)
    }
    
    // Check for yesterday preset explicitly
    const isYesterdayPreset = preset === 'yesterday'
    const isTodayPreset = preset === 'today'
    
    // Log the requested date range for debugging
    console.log(`Meta Campaigns - Request date range: from=${fromDate}, to=${toDate}, brandId=${brandId}, preset=${preset}`)
    
    if (!brandId) {
      return NextResponse.json({ error: 'Missing brandId parameter' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // First fetch unique campaign IDs for this brand
    const { data: uniqueCampaigns, error: campaignError } = await supabase
      .from('meta_ad_insights')
      .select('campaign_id, campaign_name')
      .eq('brand_id', brandId)
      .not('campaign_id', 'is', null)

    if (campaignError) {
      console.error('Database error fetching campaigns:', campaignError)
      if (campaignError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Table not found', 
          details: 'The database table for Meta campaigns does not exist.',
          code: campaignError.code,
          message: campaignError.message
        }, { status: 500 })
      }
      return NextResponse.json({ error: 'Failed to fetch Meta campaigns data', details: campaignError }, { status: 500 })
    }

    console.log(`Found ${uniqueCampaigns?.length || 0} unique campaigns`)

    // Handle date range with more precision for exact queries
    let formattedFromDate: string | null = null
    let formattedToDate: string | null = null
    
    // Get current date for validation
    const currentDate = new Date();
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    
    // Special handling for yesterday preset
    if (isYesterdayPreset) {
      console.log('YESTERDAY PRESET DETECTED - ENFORCING STRICT SINGLE DAY QUERY')
      
      try {
        // Use exactly yesterday's date for both from and to
        // We may have already normalized this above, so check
        if (fromDate && toDate && fromDate === toDate && isValid(new Date(fromDate))) {
          console.log(`Using preset-provided yesterday date: ${fromDate}`);
          formattedFromDate = fromDate;
          formattedToDate = formattedFromDate;
        } else {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          
          // Ensure the date is valid
          if (isValid(yesterday)) {
            formattedFromDate = format(yesterday, 'yyyy-MM-dd')
            formattedToDate = formattedFromDate  // Same day - critical for single day accuracy
            
            console.log(`Using strict yesterday-only query: from=${formattedFromDate}, to=${formattedToDate}`)
          } else {
            console.error('Invalid date generated for yesterday preset')
            // Fallback to a reasonable default (yesterday from today)
            formattedFromDate = format(new Date(currentDate.setDate(currentDate.getDate() - 1)), 'yyyy-MM-dd')
            formattedToDate = formattedFromDate
          }
        }
      } catch (e) {
        console.error('Error handling yesterday preset:', e)
        // Provide a safe fallback
        formattedFromDate = format(new Date(currentDate.setDate(currentDate.getDate() - 1)), 'yyyy-MM-dd')
        formattedToDate = formattedFromDate
      }
    }
    // Special handling for today preset
    else if (isTodayPreset) {
      console.log('TODAY PRESET DETECTED - ENFORCING STRICT SINGLE DAY QUERY')
      
      try {
        // Use exactly today's date for both from and to
        // We may have already normalized this above, so check
        if (fromDate && toDate && fromDate === toDate && isValid(new Date(fromDate))) {
          console.log(`Using preset-provided today date: ${fromDate}`);
          formattedFromDate = fromDate;
          formattedToDate = formattedFromDate;
        } else {
          const today = new Date();
          
          // Ensure the date is valid
          if (isValid(today)) {
            formattedFromDate = format(today, 'yyyy-MM-dd')
            formattedToDate = formattedFromDate  // Same day - critical for single day accuracy
            
            console.log(`Using strict today-only query: from=${formattedFromDate}, to=${formattedToDate}`)
          } else {
            console.error('Invalid date generated for today preset')
            // Fallback to current date string
            formattedFromDate = currentDateStr
            formattedToDate = formattedFromDate
          }
        }
      } catch (e) {
        console.error('Error handling today preset:', e)
        // Already using the current date, so no fallback needed
        formattedFromDate = currentDateStr
        formattedToDate = currentDateStr
      }
    }
    // Normal handling for explicit date parameters
    else if (fromDate && toDate) {
      try {
        // Validate both dates - this is critical for preventing 500 errors
        let parsedFromDate = new Date(fromDate)
        let parsedToDate = new Date(toDate)
        
        // Handle potentially invalid dates (including future dates)
        if (!isValid(parsedFromDate) || !isValid(parsedToDate)) {
          console.error(`Invalid date format detected. from=${fromDate}, to=${toDate}`)
          
          // Use fallback dates - default to current date on error
          formattedFromDate = currentDateStr
          formattedToDate = currentDateStr
        } else {
          // Check for future dates - replace with today
          const now = new Date()
          
          // If future dates are provided, log and adjust them
          if (parsedFromDate > now) {
            console.warn(`Future from date detected: ${fromDate}. Adjusting to today.`)
            parsedFromDate = now
          }
          
          if (parsedToDate > now) {
            console.warn(`Future to date detected: ${toDate}. Adjusting to today.`)
            parsedToDate = now
          }
          
          // Format the dates (which are now valid and not in the future)
          formattedFromDate = format(parsedFromDate, 'yyyy-MM-dd')
          formattedToDate = format(parsedToDate, 'yyyy-MM-dd')
          
          // Check for dates that are way in the future (different year)
          const currentYear = now.getFullYear()
          const fromYear = parsedFromDate.getFullYear()
          const toYear = parsedToDate.getFullYear()
          
          if (fromYear > currentYear || toYear > currentYear) {
            console.warn(`Dates in future year detected (${fromYear}, ${toYear}). This may indicate a date selection error.`)
          }
          
          // Check if this is a single-day query (from and to are the same)
          if (formattedFromDate === formattedToDate) {
            console.log(`Single day query detected: ${formattedFromDate}`)
            
            // When exact same day is detected, use the same string representation
            // to guarantee consistent handling across the application
            formattedToDate = formattedFromDate
          }
        }
      } catch (e) {
        console.error(`Invalid date format: ${fromDate} or ${toDate}`, e)
        // Fallback to current date on error
        formattedFromDate = currentDateStr
        formattedToDate = currentDateStr
      }
    }
    // Handle only from date specified
    else if (fromDate) {
      try {
        const parsedFromDate = new Date(fromDate)
        
        if (!isValid(parsedFromDate)) {
          console.error(`Invalid from date: ${fromDate}`)
          formattedFromDate = currentDateStr
        } else {
          formattedFromDate = format(parsedFromDate, 'yyyy-MM-dd')
        }
      } catch (e) {
        console.error(`Error parsing from date: ${fromDate}`, e)
        formattedFromDate = currentDateStr
      }
    }
    // Handle only to date specified
    else if (toDate) {
      try {
        const parsedToDate = new Date(toDate)
        
        if (!isValid(parsedToDate)) {
          console.error(`Invalid to date: ${toDate}`)
          formattedToDate = currentDateStr
        } else {
          formattedToDate = format(parsedToDate, 'yyyy-MM-dd')
        }
      } catch (e) {
        console.error(`Error parsing to date: ${toDate}`, e)
        formattedToDate = currentDateStr
      }
    }

    // If no dates were provided or processed successfully, default to today
    if (!formattedFromDate && !formattedToDate) {
      formattedFromDate = currentDateStr
      formattedToDate = currentDateStr
      console.log(`Using default date (today) for missing date parameters: ${currentDateStr}`)
    }

    // Build the query for insights (metrics)
    let insightsQuery = supabase
      .from('meta_ad_insights')
      .select('*')
      .eq('brand_id', brandId)
    
    // Add date filtering if provided
    if (formattedFromDate) {
      insightsQuery = insightsQuery.gte('date', formattedFromDate)
      console.log(`Filtering from date: ${formattedFromDate}`)
    }
    
    if (formattedToDate) {
      insightsQuery = insightsQuery.lte('date', formattedToDate)
      console.log(`Filtering to date: ${formattedToDate}`)
    }
    
    // Fetch insights with date filtering
    const { data: insightsData, error: insightsError } = await insightsQuery

    if (insightsError) {
      console.error('Database error fetching insights:', insightsError)
      if (insightsError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Table not found', 
          details: 'The database table for Meta insights does not exist.',
          code: insightsError.code,
          message: insightsError.message
        }, { status: 500 })
      }
      return NextResponse.json({ error: 'Failed to fetch Meta insights data', details: insightsError }, { status: 500 })
    }
    
    console.log(`Retrieved ${insightsData?.length || 0} Meta insights records for date range`)

    // Start with empty campaigns array
    let campaigns: CampaignResponse[] = [];
    
    // Process the data only if we have insights
    if (insightsData && insightsData.length > 0) {
      // Group insights by campaign_id
      const campaignGroups = new Map<string, MetaInsight[]>();
      
      insightsData.forEach((insight: MetaInsight) => {
        if (!insight.campaign_id) return;
        
        if (!campaignGroups.has(insight.campaign_id)) {
          campaignGroups.set(insight.campaign_id, []);
        }
        
        campaignGroups.get(insight.campaign_id)!.push(insight);
      });
      
      // Process each unique campaign from insights
      campaigns = Array.from(campaignGroups.entries()).map(([campaignId, insights]) => {
        try {
          // Get the campaign name from the first insight (assuming it's consistent)
          const campaignName = insights[0].campaign_name || 'Unnamed Campaign';
          const status = insights[0].status || 'UNKNOWN';
          
          // Sum up metrics from all insights for this campaign
          const totalSpend = insights.reduce(
            (sum: number, insight: MetaInsight) => {
              try {
                return sum + parseFloat(insight.spend || '0');
              } catch (e) {
                console.error(`Error parsing spend: ${insight.spend}`, e);
                return sum;
              }
            }, 
            0
          );
          
          const totalImpressions = insights.reduce(
            (sum: number, insight: MetaInsight) => {
              try {
                return sum + parseInt(insight.impressions || '0');
              } catch (e) {
                console.error(`Error parsing impressions: ${insight.impressions}`, e);
                return sum;
              }
            }, 
            0
          );
          
          const totalClicks = insights.reduce(
            (sum: number, insight: MetaInsight) => {
              try {
                return sum + parseInt(insight.clicks || '0');
              } catch (e) {
                console.error(`Error parsing clicks: ${insight.clicks}`, e);
                return sum;
              }
            }, 
            0
          );
          
          const totalConversions = insights.reduce(
            (sum: number, insight: MetaInsight) => {
              try {
                return sum + parseInt(insight.conversions || '0');
              } catch (e) {
                console.error(`Error parsing conversions: ${insight.conversions}`, e);
                return sum;
              }
            }, 
            0
          );
          
          // Calculate derived metrics
          const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
          const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
          const roas = totalSpend > 0 ? 0 : 0; // No estimated_revenue in this table
          
          // Find start and end dates from insights
          const dates = insights.map(insight => new Date(insight.date));
          const startDate = dates.length > 0 ? format(new Date(Math.min(...dates.map(d => d.getTime()))), 'yyyy-MM-dd') : null;
          const endDate = dates.length > 0 ? format(new Date(Math.max(...dates.map(d => d.getTime()))), 'yyyy-MM-dd') : null;
          
          return {
            id: campaignId,
            campaign_name: campaignName,
            status: status,
            spend: totalSpend || 0,
            impressions: totalImpressions || 0,
            clicks: totalClicks || 0,
            ctr: ctr || 0,
            conversions: totalConversions || 0,
            cpa: cpa || 0,
            roas: roas || 0,
            start_date: startDate,
            end_date: endDate
          };
        } catch (err) {
          console.error(`Error processing campaign ${campaignId}:`, err);
          // Return a default campaign object with zeros to prevent the entire response from failing
          return {
            id: campaignId || 'unknown',
            campaign_name: 'Error Processing Campaign',
            status: 'ERROR',
            spend: 0,
            impressions: 0,
            clicks: 0,
            ctr: 0,
            conversions: 0,
            cpa: 0,
            roas: 0,
            start_date: null,
            end_date: null
          };
        }
      });
    } else {
      console.log('No insights data available')
    }
    
    // Sort by spend (descending)
    try {
      campaigns.sort((a, b) => b.spend - a.spend);
    } catch (sortErr) {
      console.error('Error sorting campaigns:', sortErr);
    }

    // Return only campaigns with spend > 0 during the selected period
    let activeCampaigns: CampaignResponse[] = [];
    try {
      activeCampaigns = campaigns.filter(campaign => campaign.spend > 0);
    } catch (filterErr) {
      console.error('Error filtering active campaigns:', filterErr);
      activeCampaigns = campaigns; // Fallback to all campaigns
    }

    return NextResponse.json({ 
      campaigns: activeCampaigns.length > 0 ? activeCampaigns : campaigns,
      _debug: {
        requestedDateRange: { 
          fromDate: formattedFromDate || fromDate, 
          toDate: formattedToDate || toDate,
          preset: preset,
          originalFromDate: fromDate,
          originalToDate: toDate
        },
        campaignsCount: uniqueCampaigns?.length || 0,
        insightsCount: insightsData?.length || 0,
        filteredCampaignsCount: activeCampaigns.length
      }
    })
  } catch (error) {
    console.error('Error in Meta campaigns endpoint:', error)
    // Include more detailed error information for debugging
    const errorDetails = typeof error === 'object' && error !== null 
      ? {
          message: 'message' in error ? (error.message as string) : 'Unknown error',
          stack: 'stack' in error ? (error.stack as string) : undefined,
          name: 'name' in error ? (error.name as string) : undefined
        }
      : { message: 'Unknown error' };
      
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns', 
      details: errorDetails,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 })
  }
} 