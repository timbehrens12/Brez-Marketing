"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowUpRight, ArrowDownRight, ChevronRight, Link, Image as ImageIcon,
  ExternalLink, Loader2, RefreshCw, MessageSquare, MousePointerClick,
  DollarSign, Eye, Target, Wallet, BarChart2, Users, Zap
} from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/formatters'
import { DateRange } from "react-day-picker"
import Image from "next/image"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Types for ad data
type AdInsight = {
  date: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  cost_per_conversion: number
  reach?: number
}

type Ad = {
  ad_id: string
  ad_name: string
  adset_id: string
  campaign_id: string
  status: string
  effective_status: string
  creative_id: string | null
  preview_url: string | null
  thumbnail_url: string | null
  image_url: string | null
  headline: string | null
  body: string | null
  cta_type: string | null
  link_url: string | null
  spent: number
  impressions: number
  clicks: number
  reach: number
  ctr: number
  cpc: number
  conversions: number
  cost_per_conversion: number
  daily_insights?: AdInsight[]
}

interface AdComponentProps {
  brandId: string
  adsetId: string
  dateRange?: DateRange
  className?: string
  visibleMetrics?: string[]
  adSetBudget?: {
    budget: number
    budget_type: string
  }
}

// Available metrics config (same as in CampaignWidget for consistency)
const AVAILABLE_METRICS = [
  { id: 'budget', name: 'Budget', icon: <Wallet className="h-3.5 w-3.5" />, format: 'currency' },
  { id: 'spent', name: 'Spend', icon: <DollarSign className="h-3.5 w-3.5" />, format: 'currency' },
  { id: 'impressions', name: 'Impressions', icon: <Eye className="h-3.5 w-3.5" />, format: 'number' },
  { id: 'reach', name: 'Reach', icon: <Users className="h-3.5 w-3.5" />, format: 'number' },
  { id: 'clicks', name: 'Clicks', icon: <MousePointerClick className="h-3.5 w-3.5" />, format: 'number' },
  { id: 'ctr', name: 'CTR', icon: <Target className="h-3.5 w-3.5" />, format: 'percentage' },
  { id: 'cpc', name: 'CPC', icon: <DollarSign className="h-3.5 w-3.5" />, format: 'currency' },
  { id: 'conversions', name: 'Conversions', icon: <Zap className="h-3.5 w-3.5" />, format: 'number' },
  { id: 'cost_per_conversion', name: 'Cost/Conv.', icon: <DollarSign className="h-3.5 w-3.5" />, format: 'currency' },
  { id: 'roas', name: 'ROAS', icon: <BarChart2 className="h-3.5 w-3.5" />, format: 'roas' },
]

export function AdComponent({ 
  brandId, 
  adsetId, 
  dateRange, 
  className = "", 
  visibleMetrics = ['spent', 'impressions', 'clicks', 'ctr'],
  adSetBudget: initialAdSetBudget
}: AdComponentProps) {
  // State for ads data
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Add state for ad set budget, initialize with the prop if provided
  const [adSetBudget, setAdSetBudget] = useState<{budget: number; budget_type: string} | null>(
    initialAdSetBudget || null
  );
  
  // Use a ref to track if the component is mounted
  const isMountedRef = useRef(true);
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Function to fetch ad set budget - only fetch if not provided as prop
  const fetchAdSetBudget = useCallback(async () => {
    // Skip API call if budget was provided in props
    if (initialAdSetBudget || !brandId || !adsetId || !isMountedRef.current) return;
    
    try {
      // Simple fetch to get the ad set details
      const response = await fetch(`/api/meta/adset-details?brandId=${brandId}&adsetId=${adsetId}`);
      
      if (!isMountedRef.current) return;
      
      if (response.ok) {
        const data = await response.json();
        if (data.adSet && isMountedRef.current) {
          setAdSetBudget({
            budget: data.adSet.budget || 0,
            budget_type: data.adSet.budget_type || 'daily'
          });
        }
      } else {
        console.error("[AdComponent] Failed to fetch ad set budget details");
      }
    } catch (error) {
      console.error("[AdComponent] Error fetching ad set budget:", error);
    }
  }, [brandId, adsetId, initialAdSetBudget]);
  
  // Fetch ad set budget when component mounts or when the adsetId changes
  useEffect(() => {
    // If we don't have a dedicated endpoint, we can use a fallback to find the budget
    // in the AdSets list in the parent component in a real implementation
    
    // For now, we'll attempt to fetch the adset details directly
    fetchAdSetBudget();
  }, []);
  
  // Function to fetch ads
  const fetchAds = useCallback(async (forceRefresh = false) => {
    if (!brandId || !adsetId || !isMountedRef.current) return;
    
    setIsLoading(true);
    
    // Track which endpoint we used
    let usedDirectFetch = false;
    let usedCachedData = false;
    
    try {
      // Show a loading toast for manual refreshes
      let loadingToast;
      if (forceRefresh) {
        loadingToast = toast.loading("Fetching ads...");
      }
      
      let url = `/api/meta/ads/direct-fetch`;
      // console.log(`[AdComponent] Fetching ads for ad set ${adsetId}`);
      
      // Use POST for better reliability and to match CampaignWidget pattern
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          adsetId,
          forceRefresh,
          dateRange: dateRange?.from && dateRange?.to ? {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          } : undefined
        }),
      });
      
      if (!isMountedRef.current) {
        if (loadingToast) toast.dismiss(loadingToast);
        return;
      }
      
      const data = await response.json();
      
      // Dismiss loading toast
      if (loadingToast) toast.dismiss(loadingToast);
      
      if (response.ok) {
        // Check if this is a rate limit response with cached data
        if (data.source === 'cached_due_to_rate_limit') {
          usedCachedData = true;
          console.log(`[AdComponent] Using cached ads due to Meta API rate limits`);
          
          if (forceRefresh) {
            toast.warning("Meta API rate limit reached", {
              description: "Using cached data instead. Some metrics may not be up to date.",
              duration: 5000
            });
          }
        } else if (data.warning === 'Meta API rate limit reached') {
          if (forceRefresh) {
            toast.warning("Meta API rate limit reached", {
              description: data.message || "Please try again in a few minutes",
              duration: 5000
            });
          }
        } else if (forceRefresh) {
          // Show success toast only for manual refresh
          if (data.ads && data.ads.length > 0) {
            toast.success(`Loaded ${data.ads.length} ads`, {
              description: data.message || "Ad data refreshed successfully"
            });
          } else {
            toast.info("No ads found", {
              description: "This ad set doesn't have any ads"
            });
          }
        }
        
        // console.log(`[AdComponent] Loaded ${data.ads?.length || 0} ads from ${data.source || 'unknown'}`);
        
        if (isMountedRef.current) {
          // Ensure valid array
          const validAds = Array.isArray(data.ads) ? data.ads : [];
          setAds(validAds);
          setLastRefresh(new Date());
        }
      } else {
        console.error("[AdComponent] Failed to fetch ads:", data?.error || response.statusText);
        
        if (isMountedRef.current && forceRefresh) {
          toast.error("Failed to refresh ads", {
            description: data?.error || "There was an error loading ads for this ad set"
          });
          
          setAds([]);
        }
      }
    } catch (error) {
      console.error("[AdComponent] Error fetching ads:", error);
      
      if (isMountedRef.current) {
        setAds([]);
        
        if (forceRefresh) {
          toast.error("Error loading ads", {
            description: (error as Error)?.message || "An unexpected error occurred"
          });
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [brandId, adsetId, dateRange]);
  
  // Fetch ads when the component mounts or when dependencies change
  useEffect(() => {
    fetchAds(false);
  }, [fetchAds]);
  
  // Date changes should trigger a refresh
  useEffect(() => {
    // Date range has changed, refresh data
    if (dateRange?.from && dateRange?.to) {
      // console.log(`[AdComponent] Date range changed, refreshing ads for ad set ${adsetId}`);
      fetchAds(false);
    }
  }, [dateRange?.from, dateRange?.to, adsetId]); // Remove fetchAds from dependencies to prevent infinite loops
  
  // Format values based on type
  const formatValue = (value: number | undefined | null, format: string) => {
    if (value === null || value === undefined) return '-';
    
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'number':
        return formatNumber(value);
      case 'roas':
        if (value > 0) {
          return `${value.toFixed(2)}x`;
        }
        return '0.00x';
      default:
        return value.toString();
    }
  };
  
  // Function to refresh a single ad's status
  const refreshAdStatus = useCallback(async (adId: string, force: boolean = false): Promise<void> => {
    if (!brandId || !adId || !isMountedRef.current) return;
    
    // console.log(`[AdComponent] Refreshing status for ad ${adId}`);
    
    try {
      const response = await fetch(`/api/meta/ad-status-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          adId,
          forceRefresh: force
        })
      });
      
      if (!isMountedRef.current) return;
      
      if (response.ok) {
        const statusData = await response.json();
        // console.log(`[AdComponent] Status refresh successful for ad ${adId}`);
        
        if (statusData.status) {
          // Update the local ads state
          setAds(currentAds => 
            currentAds.map(ad => 
              ad.ad_id === adId 
                ? { 
                    ...ad, 
                    status: statusData.status, 
                    effective_status: statusData.status 
                  } 
                : ad
            )
          );
        }
      } else {
        console.error(`[AdComponent] Status refresh failed for ad ${adId}`);
      }
    } catch (error) {
      console.error(`[AdComponent] Error refreshing ad status: ${error}`);
    }
  }, [brandId, isMountedRef]);

  // Function to check multiple ad statuses
  const checkAdStatuses = useCallback((adsToCheck: Ad[], forceRefresh = false): void => {
    if (!brandId || !isMountedRef.current || adsToCheck.length === 0) return;
    
    // Apply throttling to prevent multiple status checks
    const key = `check-ad-statuses-${adsetId}`;
    if (!forceRefresh && !throttle(key, 15000)) {
      // console.log(`[AdComponent] Throttled ad status check - skipping`);
      return;
    }
    
    // Log what we're doing
    // console.log(`[AdComponent] Checking statuses for ${adsToCheck.length} ads, forceRefresh: ${forceRefresh}`);
    
    // Filter out ads with invalid ad_id values
    const validAds = adsToCheck.filter(ad => 
      ad && ad.ad_id && typeof ad.ad_id === 'string' && ad.ad_id.trim() !== ''
    );
    
    if (validAds.length === 0) {
      console.log('[AdComponent] No valid ads to check statuses for');
      return;
    }
    
    // Prioritize ads: active > others
    const prioritizedAds = [...validAds].sort((a, b) => {
      // Active ads first
      const aActive = a.status.toUpperCase() === 'ACTIVE';
      const bActive = b.status.toUpperCase() === 'ACTIVE';
      
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      return 0;
    });
    
    // Process more ads when forceRefresh is true, but limit to avoid rate limits
    const batchSize = forceRefresh ? Math.min(5, prioritizedAds.length) : Math.min(2, prioritizedAds.length);
    const adsToProcess = prioritizedAds.slice(0, batchSize);
    
    // console.log(`[AdComponent] Processing ${adsToProcess.length} ads for status check`);
    
    let updatedCount = 0;
    
    // Check each ad's status with a slight delay between requests
    adsToProcess.forEach((ad, index) => {
      // Add a small delay between requests to avoid rate limiting
      setTimeout(() => {
        if (!isMountedRef.current) return;
        
        // Extra validation before API call
        if (!ad || !ad.ad_id) {
          console.log('[AdComponent] Invalid ad object or missing ad_id');
          return;
        }
        
        // Only log in debug mode
        // console.log(`[AdComponent] Checking status for ad: ${ad.ad_id}`);
        
        refreshAdStatus(ad.ad_id, forceRefresh);
      }, index * (forceRefresh ? 500 : 2000)); // Increase delay between requests to reduce rate limiting
    });
  }, [brandId, adsetId, isMountedRef, refreshAdStatus]);

  // Simple throttle function to avoid excessive calls
  const throttle = (key: string, minInterval: number = 3000): boolean => {
    const now = Date.now();
    const lastCall = localStorage.getItem(key);
    
    if (lastCall && now - parseInt(lastCall) < minInterval) {
      return false;
    }
    
    localStorage.setItem(key, now.toString());
    return true;
  };

  // Add event listener for ad set status changes
  useEffect(() => {
    const handleAdSetStatusChanged = (event: any) => {
      if (event.detail?.adsetId === adsetId) {
        // console.log(`[AdComponent] Ad set ${adsetId} status changed, refreshing ads`);
        fetchAds(true);
      }
    };

    window.addEventListener('adset-status-changed', handleAdSetStatusChanged);
    
    return () => {
      window.removeEventListener('adset-status-changed', handleAdSetStatusChanged);
    };
  }, [adsetId, fetchAds]);

  // Check ad statuses when ads change
  useEffect(() => {
    if (ads.length > 0) {
      // Check ad statuses when we have ads loaded
      checkAdStatuses(ads);
    }
  }, [ads, checkAdStatuses]);

  // Periodically check ad statuses
  useEffect(() => {
    if (ads.length === 0) return;
    
    // Set up interval to check statuses periodically
    const intervalId = setInterval(() => {
      if (ads.length > 0 && isMountedRef.current) {
        // Only check active ads during interval updates to reduce API calls
        const activeAds = ads.filter(a => a.status.toUpperCase() === 'ACTIVE');
        if (activeAds.length > 0) {
          checkAdStatuses(activeAds.slice(0, 2)); // Limit to 2 ads at a time
        }
      }
    }, 30000); // Check every 30 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [ads, checkAdStatuses, isMountedRef]);
  
  // Show loading state while fetching ads
  if (isLoading && ads.length === 0) {
    return (
      <div className={`space-y-3 pl-6 ${className}`}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-[#333] bg-[#1A1A1A]">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  // Empty state when no ads are found
  if (ads.length === 0 && !isLoading) {
    return (
      <div className={`pl-6 ${className}`}>
        <Card className="border border-[#333] bg-[#1A1A1A]">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <h3 className="text-sm font-medium mb-1 text-white">No ads found</h3>
            <p className="text-xs text-gray-400 max-w-sm mb-4">
              {isLoading ? 'Loading ads...' : 'This ad set does not have any ads or they could not be loaded.'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className={`pl-6 ${className}`}>
      {/* Ads header with refresh button */}
      <div className="flex justify-between items-center pl-1 pr-2 py-2">
        <div className="text-sm text-zinc-400 flex items-center">
          <Badge variant="outline" className="bg-[#1A1A1A] text-gray-300 border-[#333] mr-2">
            {ads.length} Ad{ads.length !== 1 ? 's' : ''}
          </Badge>
          {lastRefresh && (
            <span className="text-xs text-zinc-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
      
      {/* Table layout for ads - matching campaigns and ad sets */}
      <div className="border border-[#333] rounded-md overflow-hidden bg-[#1A1A1A]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#333] bg-[#222]">
              <th className="text-xs font-medium text-left p-2 pl-3 text-white">Ad</th>
              {visibleMetrics.map(metricId => {
                const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                if (!metric) return null;
                
                return (
                  <th 
                    key={metricId} 
                    className="text-xs font-medium text-right p-2 text-white"
                  >
                    {metric.name}
                  </th>
                );
              })}
              <th className="text-xs font-medium text-center p-2 w-16 text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad, index) => (
              <tr 
                key={ad.ad_id}
                className={`border-b border-[#333] hover:bg-black/10 transition-colors 
                  border-l-2 border-l-[#333]`}
              >
                <td className="p-2 pl-3">
                  <div className="flex items-start gap-3">
                    {/* Ad thumbnail */}
                    <div className="w-12 h-12 bg-zinc-800 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {ad.thumbnail_url || ad.image_url ? (
                        <Image 
                          src={ad.thumbnail_url || ad.image_url || ''} 
                          alt={ad.ad_name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-zinc-600" />
                      )}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge className={`text-xs px-1.5 py-0 h-5 flex items-center gap-1 ${
                          ad.status.toUpperCase() === 'ACTIVE' 
                            ? 'bg-green-950/30 text-green-500 border border-green-800/50' 
                            : 'bg-gray-950/30 text-gray-500 border border-gray-800/50'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            ad.status.toUpperCase() === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'
                          }`}></div>
                          {ad.status}
                        </Badge>
                        {ad.effective_status && ad.effective_status !== ad.status && (
                          <Badge className="text-xs px-1.5 py-0 h-5 bg-gray-950/30 text-gray-500 border border-gray-800/50">
                            {ad.effective_status}
                          </Badge>
                        )}
                      </div>
                      
                      <span className="font-medium text-sm truncate max-w-[250px] text-white" title={ad.ad_name}>
                        {ad.ad_name}
                      </span>
                      
                      {ad.headline && (
                        <span className="text-xs text-gray-400 truncate max-w-[250px]" title={ad.headline}>
                          {ad.headline}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                
                {visibleMetrics.map(metricId => {
                  const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                  if (!metric) return null;
                  
                  // Handle special case for budget which ads don't have directly but we can show the parent ad set's budget
                  if (metricId === 'budget') {
                    return (
                      <td key={metricId} className="p-2 text-right">
                        {adSetBudget ? (
                          <div className="flex flex-col items-end">
                            <Badge 
                              className="px-2 py-0.5 bg-[#111] text-white border-[#333]"
                              variant="outline"
                            >
                              {formatCurrency(adSetBudget.budget)}
                              {adSetBudget.budget_type === 'daily' && <span className="text-xs text-gray-500 ml-1">/day</span>}
                            </Badge>
                            <span className="text-xs text-zinc-500">
                              from ad set
                            </span>
                          </div>
                        ) : (
                          <div className="font-medium text-gray-400">-</div>
                        )}
                      </td>
                    );
                  }
                  
                  // Map metrics to ad properties
                  let value: number | undefined;
                  switch (metricId) {
                    case 'spent':
                      value = ad.spent;
                      break;
                    case 'impressions':
                      value = ad.impressions;
                      break;
                    case 'clicks':
                      value = ad.clicks;
                      break;
                    case 'ctr':
                      // Calculate CTR if it's 0 but we have impressions and clicks
                      if ((ad.ctr === 0 || !ad.ctr) && ad.impressions > 0) {
                        value = (ad.clicks / ad.impressions);
                      } else {
                      value = ad.ctr;
                      }
                      break;
                    case 'cpc':
                      value = ad.cpc;
                      break;
                    case 'conversions':
                      value = ad.conversions;
                      break;
                    case 'cost_per_conversion':
                      value = ad.cost_per_conversion;
                      break;
                    case 'reach':
                      value = ad.reach;
                      break;
                    case 'roas':
                      // Calculate ROAS only when there are conversions and spending
                      if (ad.conversions > 0 && ad.spent > 0) {
                        // Assuming $25 average order value
                        const estimatedOrderValue = ad.conversions * 25;
                        value = estimatedOrderValue / ad.spent;
                      } else {
                        value = 0;
                      }
                      break;
                    default:
                      value = undefined;
                  }
                  
                  // *** ADDED DEBUG LOG ***
                  // console.log(`[AdComponent DEBUG] Ad ID: ${ad.ad_id}, Metric: ${metricId}, Raw Value: ${value}, Ad Object Metrics:`, {
                  //   spent: ad.spent,
                  //   impressions: ad.impressions,
                  //   clicks: ad.clicks,
                  //   ctr: ad.ctr,
                  //   reach: ad.reach,
                  //   conversions: ad.conversions
                  // });
                  
                  return (
                    <td key={metricId} className="p-2 text-right text-white">
                      <div className="font-medium">
                        {formatValue(value, metric.format)}
                      </div>
                    </td>
                  );
                })}
                
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-white hover:bg-black/20 border border-[#333]"
                      onClick={() => {
                        if (ad.preview_url) {
                          window.open(ad.preview_url, '_blank');
                        } else {
                          toast.info("Preview not available", {
                            description: "This ad doesn't have a preview URL"
                          });
                        }
                      }}
                      disabled={!ad.preview_url}
                      title={ad.preview_url ? "View Ad Preview" : "Preview not available"}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 