import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { format } from 'date-fns'

// Define types for our data
interface MetaInsight {
  campaign_id: string;
  spend: string;
  impressions: string;
  clicks: string;
  conversions: string;
  date: string;
  [key: string]: any;
}

interface MetaCampaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  estimated_revenue?: number;
  start_time?: string;
  stop_time?: string | null;
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
    // Create debugging context for better error tracking
    const context = {
      requestId: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString()
    };
    
    console.log(`[${context.requestId}] Meta Campaigns API request start at ${context.timestamp}`);
    
    // Capture request params
    const url = new URL(request.url)
    const brandId = url.searchParams.get('brandId')
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')
    const preset = url.searchParams.get('preset')
    
    // Enhanced debugging logs for each request
    console.log(`[${context.requestId}] Meta Campaigns API - Request params:`, {
      brandId,
      fromDate,
      toDate, 
      preset,
      url: request.url
    })
    
    // Validate required params
    if (!brandId) {
      console.error(`[${context.requestId}] Missing brandId parameter`)
      return NextResponse.json({ 
        error: 'Missing brandId parameter',
        requestId: context.requestId,
        params: { brandId, fromDate, toDate, preset }
      }, { status: 400 })
    }
    
    let validationError = null;
    
    // Validate date parameters early
    if (fromDate || toDate) {
      try {
        if (fromDate) {
          new Date(fromDate).toISOString(); // Will throw if invalid
        }
        if (toDate) {
          new Date(toDate).toISOString(); // Will throw if invalid
        }
      } catch (dateError) {
        validationError = `Invalid date format: ${dateError instanceof Error ? dateError.message : 'Unknown date error'}`;
        console.error(`[${context.requestId}] ${validationError}`, { fromDate, toDate });
        
        return NextResponse.json({
          error: 'Date validation failed',
          details: validationError,
          requestId: context.requestId,
          params: { fromDate, toDate, preset }
        }, { status: 400 });
      }
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // First fetch all campaigns for this brand
    console.log(`[${context.requestId}] Fetching campaigns for brand: ${brandId}`)
    const { data: campaignData, error: campaignError } = await supabase
      .from('meta_campaigns')
      .select('*')
      .eq('brand_id', brandId)
    
    if (campaignError) {
      console.error(`[${context.requestId}] Database error fetching campaigns:`, campaignError)
      return NextResponse.json({ 
        error: 'Failed to fetch Meta campaigns data',
        requestId: context.requestId
      }, { status: 500 })
    }
    
    console.log(`[${context.requestId}] Retrieved ${campaignData?.length || 0} campaigns for brand ${brandId}`)

    // Standardize date handling for all queries
    let formattedFromDate: string | null = null
    let formattedToDate: string | null = null

    console.log(`[${context.requestId}] Processing date parameters`)

    try {
      // Handle presets first (they take precedence)
      if (preset === 'yesterday') {
        // For yesterday preset, ensure we use exactly one day (same date for both from and to)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        formattedFromDate = format(yesterday, 'yyyy-MM-dd')
        formattedToDate = formattedFromDate  // Exact same string
        
        console.log(`[${context.requestId}] YESTERDAY preset: Using single day ${formattedFromDate}`)
      } 
      else if (preset === 'today') {
        // For today preset, use current date for both
        const today = new Date()
        formattedFromDate = format(today, 'yyyy-MM-dd')
        formattedToDate = formattedFromDate  // Exact same string
        
        console.log(`[${context.requestId}] TODAY preset: Using single day ${formattedFromDate}`)
      }
      // Handle explicit date parameters after presets
      else if (fromDate && toDate) {
        // Parse and format provided dates
        formattedFromDate = format(new Date(fromDate), 'yyyy-MM-dd')
        formattedToDate = format(new Date(toDate), 'yyyy-MM-dd')
        
        // Special handling for single day queries (identical from/to dates)
        if (formattedFromDate === formattedToDate) {
          console.log(`[${context.requestId}] Manual SINGLE DAY selection detected: ${formattedFromDate}`)
        } else {
          console.log(`[${context.requestId}] Date RANGE selection: ${formattedFromDate} to ${formattedToDate}`)
        }
      }
      // Handle only from date specified
      else if (fromDate) {
        formattedFromDate = format(new Date(fromDate), 'yyyy-MM-dd')
        formattedToDate = formattedFromDate  // Default to same day if only from is provided
        console.log(`[${context.requestId}] Only fromDate provided: Using single day ${formattedFromDate}`)
      }
      // Handle only to date specified
      else if (toDate) {
        formattedToDate = format(new Date(toDate), 'yyyy-MM-dd')
        formattedFromDate = formattedToDate  // Default to same day if only to is provided
        console.log(`[${context.requestId}] Only toDate provided: Using single day ${formattedToDate}`)
      }
      // If no date params, use current date
      else {
        const today = new Date()
        formattedFromDate = format(today, 'yyyy-MM-dd')
        formattedToDate = formattedFromDate
        console.log(`[${context.requestId}] No date params provided: Using today ${formattedFromDate}`)
      }
    } catch (dateError) {
      console.error(`[${context.requestId}] Error processing date parameters:`, dateError)
      console.error(`[${context.requestId}] Invalid date format - from: ${fromDate}, to: ${toDate}`)
      
      // Handle this error more gracefully rather than crashing
      // Fall back to using today as default
      const today = new Date()
      formattedFromDate = format(today, 'yyyy-MM-dd')
      formattedToDate = formattedFromDate
      console.log(`[${context.requestId}] Using fallback date (today): ${formattedFromDate}`)
    }

    // Log the final date range we'll be using
    console.log(`[${context.requestId}] Meta Campaigns - Final date range: from=${formattedFromDate}, to=${formattedToDate}`)

    // Build the query for insights (metrics), with clear try/catch blocks
    let insightsData = [];
    try {
      console.log(`[${context.requestId}] Building insights query with date range`)
      
      let insightsQuery = supabase
        .from('meta_ad_insights')
        .select('*')
        .eq('brand_id', brandId)
      
      // Add date filtering
      if (formattedFromDate) {
        insightsQuery = insightsQuery.gte('date', formattedFromDate)
        console.log(`[${context.requestId}] Added from date filter: >= ${formattedFromDate}`)
      }
      
      if (formattedToDate) {
        insightsQuery = insightsQuery.lte('date', formattedToDate)
        console.log(`[${context.requestId}] Added to date filter: <= ${formattedToDate}`)
      }
      
      // Execute query in a try-catch to handle all potential errors
      console.log(`[${context.requestId}] Executing insights query`)
      const { data, error } = await insightsQuery
      
      if (error) {
        console.error(`[${context.requestId}] Insights query error:`, error)
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log(`[${context.requestId}] No insights data found for the date range`)
      } else {
        console.log(`[${context.requestId}] Retrieved ${data.length} insight records`)
        insightsData = data;
      }
    } catch (insightsError) {
      console.error(`[${context.requestId}] Error fetching insights:`, insightsError)
      // Continue without insights data - we'll show campaigns with zero metrics
      console.log(`[${context.requestId}] Continuing with empty insights data due to query error`)
    }
    
    // Start with empty campaigns array and process data with robust error handling
    let campaigns: CampaignResponse[] = [];
    
    try {
      // Process the data only if we have campaigns
      if (campaignData && campaignData.length > 0) {
        console.log(`[${context.requestId}] Processing ${campaignData.length} campaigns with insights data`)
        
        // Group insights by campaign_id with defensive programming
        const insightsByCampaign: Record<string, MetaInsight[]> = {};
        
        if (insightsData && insightsData.length > 0) {
          insightsData.forEach((insight: MetaInsight) => {
            try {
              if (!insight?.campaign_id) return;
              
              if (!insightsByCampaign[insight.campaign_id]) {
                insightsByCampaign[insight.campaign_id] = [];
              }
              
              insightsByCampaign[insight.campaign_id].push(insight);
            } catch (err) {
              console.error(`Error processing insight:`, err)
              // Continue with next insight
            }
          });
        }
        
        // Process each campaign with robust error handling
        campaigns = (campaignData as MetaCampaign[]).map(campaign => {
          try {
            // Default values for safety
            const defaultCampaign = {
              id: campaign.campaign_id || 'unknown',
              campaign_name: campaign.campaign_name || 'Unnamed Campaign',
              status: campaign.status || 'UNKNOWN',
              spend: 0,
              impressions: 0,
              clicks: 0,
              ctr: 0,
              conversions: 0,
              cpa: 0,
              roas: 0,
              start_date: campaign.start_time || null,
              end_date: campaign.stop_time || null
            };
            
            // If no insights for this campaign, return default values
            if (!insightsByCampaign[campaign.campaign_id] || 
                insightsByCampaign[campaign.campaign_id].length === 0) {
              return defaultCampaign;
            }
            
            const campaignInsights = insightsByCampaign[campaign.campaign_id] || [];
            
            // Sum up metrics with safe parsing
            let totalSpend = 0;
            let totalImpressions = 0;
            let totalClicks = 0;
            let totalConversions = 0;
            
            // Safely process each metric
            campaignInsights.forEach(insight => {
              try {
                // Parse spend
                if (insight.spend) {
                  const spendValue = parseFloat(insight.spend);
                  if (!isNaN(spendValue)) {
                    totalSpend += spendValue;
                  }
                }
                
                // Parse impressions
                if (insight.impressions) {
                  const impressionsValue = parseInt(insight.impressions);
                  if (!isNaN(impressionsValue)) {
                    totalImpressions += impressionsValue;
                  }
                }
                
                // Parse clicks
                if (insight.clicks) {
                  const clicksValue = parseInt(insight.clicks);
                  if (!isNaN(clicksValue)) {
                    totalClicks += clicksValue;
                  }
                }
                
                // Parse conversions
                if (insight.conversions) {
                  const conversionsValue = parseInt(insight.conversions);
                  if (!isNaN(conversionsValue)) {
                    totalConversions += conversionsValue;
                  }
                }
              } catch (metricErr) {
                console.error(`Error parsing metrics for campaign ${campaign.campaign_id}:`, metricErr);
                // Continue with next insight
              }
            });
            
            // Calculate derived metrics safely
            const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
            const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
            let roas = 0;
            
            try {
              if (totalSpend > 0 && campaign.estimated_revenue) {
                roas = campaign.estimated_revenue / totalSpend;
              }
            } catch (roasErr) {
              console.error(`Error calculating ROAS:`, roasErr);
            }
            
            return {
              id: campaign.campaign_id,
              campaign_name: campaign.campaign_name || 'Unnamed Campaign',
              status: campaign.status || 'UNKNOWN',
              spend: totalSpend,
              impressions: totalImpressions,
              clicks: totalClicks,
              ctr: ctr,
              conversions: totalConversions,
              cpa: cpa,
              roas: roas,
              start_date: campaign.start_time || null,
              end_date: campaign.stop_time || null
            };
          } catch (campaignErr) {
            console.error(`Error processing campaign ${campaign.campaign_id}:`, campaignErr);
            // Return default campaign object on error
            return {
              id: campaign.campaign_id || 'unknown',
              campaign_name: campaign.campaign_name || 'Error Processing Campaign',
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
        
        console.log(`Processed ${campaigns.length} campaigns with their metrics`);
      } else {
        console.log('No campaign data available, returning empty array');
      }
    } catch (processingError) {
      console.error('Error processing campaigns data:', processingError);
      // Return empty array in case of processing error
      campaigns = [];
    }
    
    // Safely sort by spend 
    try {
      campaigns.sort((a, b) => b.spend - a.spend);
      console.log(`[${context.requestId}] Sorted campaigns by spend (descending)`)
    } catch (sortErr) {
      console.error(`[${context.requestId}] Error sorting campaigns:`, sortErr);
    }

    // Return only campaigns with spend > 0 during the selected period
    let activeCampaigns: CampaignResponse[] = [];
    try {
      activeCampaigns = campaigns.filter(campaign => campaign.spend > 0);
      console.log(`[${context.requestId}] Filtered to ${activeCampaigns.length} active campaigns (with spend > 0)`);
    } catch (filterErr) {
      console.error(`[${context.requestId}] Error filtering active campaigns:`, filterErr);
      activeCampaigns = campaigns; // Fallback to all campaigns
    }

    // Return the data with debug information
    console.log(`[${context.requestId}] Returning API response with ${(activeCampaigns.length > 0 ? activeCampaigns : campaigns).length} campaigns`)
    return NextResponse.json({ 
      campaigns: activeCampaigns.length > 0 ? activeCampaigns : campaigns,
      _debug: {
        requestId: context.requestId,
        requestedDateRange: { 
          fromDate: formattedFromDate, 
          toDate: formattedToDate,
          preset: preset,
          originalFromDate: fromDate,
          originalToDate: toDate
        },
        campaignsCount: campaignData?.length || 0,
        insightsCount: insightsData?.length || 0,
        filteredCampaignsCount: activeCampaigns.length
      }
    })
  } catch (error) {
    // Enhanced error handling with more detailed logging
    console.error('Error in Meta campaigns endpoint:', error);
    
    const errorId = Math.random().toString(36).substring(2, 15);
    console.error(`Error ID: ${errorId}`);
    
    // Collect detailed error information
    const errorDetails = typeof error === 'object' && error !== null 
      ? {
          message: 'message' in error ? (error.message as string) : 'Unknown error',
          stack: 'stack' in error ? (error.stack as string) : undefined,
          name: 'name' in error ? (error.name as string) : undefined
        }
      : { message: 'Unknown error' };
      
    return NextResponse.json({ 
      error: 'Failed to fetch campaigns', 
      errorId,
      details: errorDetails,
      errorType: error instanceof Error ? error.constructor.name : typeof error
    }, { status: 500 })
  }
} 