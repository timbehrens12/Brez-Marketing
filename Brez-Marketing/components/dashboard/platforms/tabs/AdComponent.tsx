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
  }, [fetchAdSetBudget]);
  
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
      console.log(`[AdComponent] Fetching ads for ad set ${adsetId}`);
      
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
        
        console.log(`[AdComponent] Loaded ${data.ads?.length || 0} ads from ${data.source || 'unknown'}`);
        
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
      console.log(`[AdComponent] Date range changed, refreshing ads for ad set ${adsetId}`);
      fetchAds(false);
    }
  }, [dateRange, fetchAds, adsetId]);
  
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
  
  // Show loading state while fetching ads
  if (isLoading && ads.length === 0) {
    return (
      <div className={`space-y-3 pl-6 ${className}`}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-zinc-800/50 bg-zinc-900/50">
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
        <Card className="border border-zinc-800/50 bg-zinc-900/50">
          <CardContent className="p-6 text-center">
            <p className="text-zinc-400 mb-4">No ads found for this ad set</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchAds(true)}
              className="mx-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Ads
            </Button>
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
          <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-700 mr-2">
            {ads.length} Ad{ads.length !== 1 ? 's' : ''}
          </Badge>
          {lastRefresh && (
            <span className="text-xs text-zinc-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchAds(true)}
          disabled={isLoading}
          className="h-7 text-xs"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          Refresh Ads
        </Button>
      </div>
      
      {/* Table layout for ads - matching campaigns and ad sets */}
      <div className="bg-gray-950/80 rounded-md overflow-hidden border border-gray-800 mt-2">
        <table className="w-full">
          <thead>
            <tr className="bg-black/60 border-b border-gray-700">
              <th className="text-xs font-medium text-left p-2 pl-3">Ad</th>
              {visibleMetrics.map(metricId => {
                const metric = AVAILABLE_METRICS.find(m => m.id === metricId);
                if (!metric) return null;
                
                return (
                  <th 
                    key={metricId} 
                    className="text-xs font-medium text-right p-2"
                  >
                    {metric.name}
                  </th>
                );
              })}
              <th className="text-xs font-medium text-center p-2 w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ads.map((ad, index) => (
              <tr 
                key={ad.ad_id}
                className={`border-b border-gray-800 hover:bg-gray-900/50 ${
                  index % 2 === 0 ? 'bg-black/80' : 'bg-black/90'
                } border-l-4 border-l-gray-600`}
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
                        <Badge className={`text-xs px-1.5 py-0 h-5 ${
                          ad.status === 'ACTIVE' || ad.status === 'active'
                            ? 'bg-gray-800/80 text-gray-300' 
                            : 'bg-gray-900/50 text-gray-400'
                        }`}>
                          {ad.status}
                        </Badge>
                        {ad.effective_status && ad.effective_status !== ad.status && (
                          <Badge className="text-xs px-1.5 py-0 h-5 bg-gray-900/50 text-gray-400">
                            {ad.effective_status}
                          </Badge>
                        )}
                      </div>
                      
                      <span className="font-medium text-sm truncate max-w-[250px]" title={ad.ad_name}>
                        {ad.ad_name}
                      </span>
                      
                      {ad.headline && (
                        <span className="text-xs text-zinc-400 truncate max-w-[250px]" title={ad.headline}>
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
                              className="px-2 py-0.5 border-gray-700 bg-gray-800 text-gray-300"
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
                      value = ad.ctr;
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
                  
                  return (
                    <td key={metricId} className="p-2 text-right">
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
                      className="h-7 w-7 rounded-full"
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