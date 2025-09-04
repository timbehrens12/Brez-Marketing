"use client"

import { useState, useEffect, useCallback } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  ImageIcon,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  MousePointer,
  DollarSign,
  Target,
  Zap
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { emitMetaApiError } from '@/components/MetaConnectionStatus'
import { isTokenExpired, getTokenErrorMessage } from '@/lib/services/meta-service'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/formatters'

interface Ad {
  ad_id: string
  ad_name: string
  adset_id: string
  campaign_id: string
  campaign_name: string
  adset_name: string
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
  updated_at: string
}

interface AdCreativeBreakdownProps {
  preloadedAds?: any[]
}

export default function AdCreativeBreakdown({ preloadedAds }: AdCreativeBreakdownProps = {}) {
  const { selectedBrandId } = useBrandContext()
  const [ads, setAds] = useState<Ad[]>(preloadedAds || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null)
  const [sortBy, setSortBy] = useState('spent')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0)

  // Use preloaded ads when they change
  useEffect(() => {
    if (preloadedAds && preloadedAds.length > 0) {
      // console.log('[AdCreativeBreakdown] Using preloaded ads data:', preloadedAds.length)
      setAds(preloadedAds)
    }
  }, [preloadedAds])

  // Fetch all ads using the same method as dashboard
  const fetchAds = async (forceRefresh = false) => {
    if (!selectedBrandId) return

    try {
      // console.log('[AdCreativeBreakdown] Fetching ads for brand:', selectedBrandId)
      
      const campaignsResponse = await fetch(`/api/meta/campaigns?brandId=${selectedBrandId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const campaignsData = await campaignsResponse.json()

      // Check for error field rather than success field, since the API doesn't return success field
      if (campaignsData.error) {
        throw new Error(campaignsData.error || 'Failed to fetch campaigns')
      }

      // Also check if campaigns array exists
      if (!campaignsData.campaigns) {
        throw new Error('No campaigns data returned from API')
      }

      const allAds: Ad[] = []

      for (const campaign of campaignsData.campaigns || []) {
        try {
          const adsetsResponse = await fetch(`/api/meta/adsets?brandId=${selectedBrandId}&campaignId=${campaign.campaign_id}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          })
          const adsetsData = await adsetsResponse.json()

          if (adsetsData.success && adsetsData.adSets) {
            for (const adSet of adsetsData.adSets) {
              try {
                const adsResponse = await fetch(`/api/meta/ads?brandId=${selectedBrandId}&adsetId=${adSet.adset_id}`, {
                  cache: 'no-store',
                  headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                  }
                })
                const adsData = await adsResponse.json()
                
                if (adsData.success && adsData.ads) {
                  const enhancedAds = adsData.ads.map((ad: any) => ({
                    ...ad,
                    campaign_name: campaign.campaign_name,
                    adset_name: adSet.adset_name,
                    campaign_id: campaign.campaign_id
                  }))
                  
                  allAds.push(...enhancedAds)
                }
              } catch (error) {
                console.error(`[AdCreativeBreakdown] Error fetching ads for adset ${adSet.adset_id}:`, error)
              }
            }
          }
        } catch (error) {
          console.error(`[AdCreativeBreakdown] Error fetching adsets for campaign ${campaign.campaign_id}:`, error)
        }
      }

      setAds(allAds)
      setLastRefreshTime(Date.now())
      
      if (forceRefresh) {
        toast.success(`Loaded ${allAds.length} ad creatives`, {
          description: "Today's ad creative data refreshed successfully"
        })
      }
      
      // console.log(`[AdCreativeBreakdown] Successfully loaded ${allAds.length} ads`)

    } catch (error: any) {
      console.error('[AdCreativeBreakdown] Error:', error)
      
      if (isTokenExpired(error)) {
        emitMetaApiError(error)
        toast.error("Meta Connection Expired", {
          description: "Please reconnect your Meta account in Settings"
        })
      } else {
        toast.error("Failed to load ad creatives", {
          description: getTokenErrorMessage(error)
        })
      }
      
      setAds([])
    }
  }

  // Initial load - only if no preloaded data
  useEffect(() => {
    if (selectedBrandId && (!preloadedAds || preloadedAds.length === 0)) {
      // console.log('[AdCreativeBreakdown] No preloaded data, fetching ads...')
      fetchAds()
    }
  }, [selectedBrandId, preloadedAds])

  // Listen for refresh events
  useEffect(() => {
    if (!selectedBrandId) return

    let refreshTimeout: NodeJS.Timeout

    const handleGlobalRefresh = (event: CustomEvent) => {
      const { brandId, source, forceRefresh } = event.detail
      
      if (brandId === selectedBrandId && source !== 'AdCreativeBreakdown') {
        // console.log('[AdCreativeBreakdown] Global refresh triggered from other widgets, updating ads...', { source, forceRefresh })
        
        clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          fetchAds(true)
        }, 1500)
      }
    }

    const handleGlobalRefreshAll = (event: CustomEvent) => {
      const { brandId, platforms, currentTab } = event.detail
      
      if (brandId === selectedBrandId && (platforms?.meta || currentTab === 'meta')) {
        // console.log('[AdCreativeBreakdown] Global refresh all triggered, updating ads...', { platforms, currentTab })
        
        clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          fetchAds(true)
        }, 1500)
      }
    }

    const handleNewDayDetected = (event: CustomEvent) => {
      const { brandId } = event.detail
      
      if (brandId === selectedBrandId) {
        // console.log('[AdCreativeBreakdown] New day detected, updating ads...')
        
        clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          fetchAds(true)
        }, 1500)
      }
    }

    window.addEventListener('metaDataRefreshed', handleGlobalRefresh as EventListener)
    window.addEventListener('force-meta-refresh', handleGlobalRefresh as EventListener)
    window.addEventListener('global-refresh-all', handleGlobalRefreshAll as EventListener)
    window.addEventListener('newDayDetected', handleNewDayDetected as EventListener)
    window.addEventListener('refresh-all-widgets', handleGlobalRefreshAll as EventListener)

    return () => {
      clearTimeout(refreshTimeout)
      window.removeEventListener('metaDataRefreshed', handleGlobalRefresh as EventListener)
      window.removeEventListener('force-meta-refresh', handleGlobalRefresh as EventListener)
      window.removeEventListener('global-refresh-all', handleGlobalRefreshAll as EventListener)
      window.removeEventListener('newDayDetected', handleNewDayDetected as EventListener)
      window.removeEventListener('refresh-all-widgets', handleGlobalRefreshAll as EventListener)
    }
  }, [selectedBrandId, fetchAds])

  // Helper function to get sort value based on metric
  const getSortValue = (ad: Ad, metric: string) => {
    switch (metric) {
      case 'spent':
        return ad.spent || 0
      case 'impressions':
        return ad.impressions || 0
      case 'clicks':
        return ad.clicks || 0
      case 'ctr':
        return ad.ctr || 0
      case 'conversions':
        return ad.conversions || 0
      default:
        return ad.spent || 0
    }
  }

  // Filter and sort ads
  const filteredAndSortedAds = ads
    .filter(ad => {
      const matchesSearch = searchQuery === '' || 
        (ad.ad_name && ad.ad_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ad.campaign_name && ad.campaign_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ad.adset_name && ad.adset_name.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesStatus = showInactive || ad.status === 'ACTIVE'
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const aValue = getSortValue(a, sortBy)
      const bValue = getSortValue(b, sortBy)
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
    })

  // Handle refresh
  const handleRefresh = () => {
    fetchAds(true)
  }

  // Format ROAS calculation
  const calculateROAS = (conversions: number, spent: number) => {
    if (conversions > 0 && spent > 0) {
      const estimatedOrderValue = conversions * 25
      return estimatedOrderValue / spent
    }
    return 0
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header with modern design */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-600/20 
                        flex items-center justify-center border border-orange-500/30">
            <ImageIcon className="w-4 h-4 text-orange-300" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm flex items-center gap-2">
              Creative Analysis
              <Badge className="bg-orange-500/10 text-orange-300 border-orange-500/20 text-xs px-2 py-1">
                {filteredAndSortedAds.length}
              </Badge>
            </h4>
            <p className="text-gray-400 text-xs">Top performing ad creatives</p>
          </div>
        </div>
        
        {/* Compact controls */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10">
                <Settings className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0d1117] border-[#30363d]">
              <DropdownMenuLabel className="text-white text-xs">Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#30363d]" />
              {['spent', 'impressions', 'clicks', 'ctr', 'conversions'].map(metric => (
                <DropdownMenuItem 
                  key={metric} 
                  onSelect={() => setSortBy(metric)}
                  className="text-white hover:bg-[#1c2128] text-xs"
                >
                  <span className="capitalize">{metric === 'ctr' ? 'CTR' : metric}</span>
                  {sortBy === metric && (
                    <span className="ml-auto text-orange-400">
                      {sortOrder === 'desc' ? '↓' : '↑'}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Compact search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
        <Input
          placeholder="Search creatives..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 bg-[#161b22] border-[#30363d] text-white placeholder-gray-400 text-xs
                   focus:border-orange-500/30 focus:ring-1 focus:ring-orange-500/20"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {filteredAndSortedAds.length === 0 && !(preloadedAds && preloadedAds.length > 0 && ads.length === 0) ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-pink-600/20 rounded-xl 
                            flex items-center justify-center border border-orange-500/30 mx-auto mb-3">
                <ImageIcon className="h-6 w-6 text-orange-300" />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">No Creatives</h3>
              <p className="text-xs text-gray-400 max-w-sm">
                {searchQuery ? 
                  `No ads match "${searchQuery}"` :
                  'No ad creatives found. Connect Meta to see performance data.'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-full overflow-y-auto">
            {filteredAndSortedAds.slice(0, 4).map((ad) => {
              const roas = calculateROAS(ad.conversions, ad.spent)
              
              return (
                <div key={ad.ad_id} 
                     className="bg-gradient-to-r from-[#161b22] via-[#1c2128] to-[#161b22] 
                              border border-[#30363d] rounded-xl p-4 hover:border-[#444c56] 
                              transition-all duration-300 group relative overflow-hidden">
                  {/* Background glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10 flex items-start gap-3">
                    {/* Creative thumbnail */}
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <div className="w-full h-full bg-[#21262d] rounded-lg border border-[#30363d] 
                                    flex items-center justify-center overflow-hidden">
                        {ad.thumbnail_url || ad.image_url ? (
                          <Image 
                            src={ad.thumbnail_url || ad.image_url || ''} 
                            alt={ad.ad_name}
                            fill
                            className="object-cover rounded-lg"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      
                      {/* Platform badge */}
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full 
                                    flex items-center justify-center border-2 border-[#161b22]">
                        <span className="text-white text-xs font-bold">f</span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-white text-sm truncate">
                            {ad.ad_name}
                          </h4>
                          <p className="text-xs text-gray-400 truncate">
                            {ad.campaign_name}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge className={`text-xs px-2 py-1 ${
                            ad.status === 'ACTIVE' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}>
                            {ad.status}
                          </Badge>
                          
                          {ad.preview_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => window.open(ad.preview_url!, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Metrics grid */}
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-1">Spend</div>
                          <div className="text-sm font-semibold text-white">
                            {formatCurrency(ad.spent)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-1">CTR</div>
                          <div className="text-sm font-semibold text-white">
                            {formatPercentage(ad.ctr)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-1">ROAS</div>
                          <div className={`text-sm font-semibold ${
                            roas >= 3 ? 'text-green-400' : roas >= 2 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {roas > 0 ? `${roas.toFixed(1)}x` : '0.0x'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Show more indicator */}
            {filteredAndSortedAds.length > 4 && (
              <div className="text-center py-2">
                <p className="text-xs text-gray-500">
                  +{filteredAndSortedAds.length - 4} more creatives
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 