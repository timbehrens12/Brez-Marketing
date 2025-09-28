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
              }
            }
          }
        } catch (error) {
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
    <div className="relative h-full max-h-[680px] flex flex-col">
      {/* Seamless Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-white/70" />
            </div>
            <div>
              <h2 className="text-lg text-white font-semibold tracking-tight">Creative Studio</h2>
              <div className="flex items-center gap-3 mt-1">
                <Badge className="bg-white/5 text-gray-300 border-white/20 text-xs font-semibold px-2 py-0.5 rounded-lg">
                  {filteredAndSortedAds.length} Active Creative{filteredAndSortedAds.length !== 1 ? 's' : ''}
                </Badge>
                <span className="text-gray-500 text-sm">Performance insights</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-[#1a1a1a]/60 border-[#333]/50 text-white hover:bg-[#2a2a2a] backdrop-blur-sm rounded-xl">
                  <Settings className="h-4 w-4 mr-2" />
                  Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#0a0a0a] border-[#333] p-2 rounded-2xl backdrop-blur-sm">
                <DropdownMenuLabel className="text-white px-3 py-2">Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#333]" />
                {['spent', 'impressions', 'clicks', 'ctr', 'conversions'].map(metric => (
                  <DropdownMenuItem 
                    key={metric} 
                    onSelect={() => setSortBy(metric)}
                    className="text-white hover:bg-[#1a1a1a] rounded-lg mx-1 px-3 py-2"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        {metric === 'spent' && <DollarSign className="h-4 w-4 mr-3" />}
                        {metric === 'impressions' && <Eye className="h-4 w-4 mr-3" />}
                        {metric === 'clicks' && <MousePointer className="h-4 w-4 mr-3" />}
                        {metric === 'ctr' && <Target className="h-4 w-4 mr-3" />}
                        {metric === 'conversions' && <Zap className="h-4 w-4 mr-3" />}
                        <span className="capitalize font-medium">{metric === 'ctr' ? 'CTR' : metric}</span>
                      </div>
                      {sortBy === metric && (
                        <Badge className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-md">
                          {sortOrder === 'desc' ? '↓' : '↑'}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-[#333] my-2" />
                <DropdownMenuItem 
                  onSelect={(e) => { e.preventDefault(); setShowInactive(!showInactive); }} 
                  className="text-white hover:bg-[#1a1a1a] rounded-lg mx-1 px-3 py-2"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      {showInactive ? <Eye className="h-4 w-4 mr-3" /> : <EyeOff className="h-4 w-4 mr-3" />}
                      <span className="font-medium">Show Inactive Ads</span>
                    </div>
                    <Switch checked={showInactive} className="data-[state=checked]:bg-emerald-500" />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Modern Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search ads, campaigns, or headlines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-3 bg-[#1a1a1a]/60 border-[#333]/50 text-white placeholder-gray-400 
                     focus:border-white/20 focus:ring-1 focus:ring-white/20 rounded-xl backdrop-blur-sm"
          />
        </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {filteredAndSortedAds.length === 0 && !(preloadedAds && preloadedAds.length > 0 && ads.length === 0) ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">No Ad Creatives Found</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
              {
                'No ad creatives found for your selected criteria. Try adjusting your filters or check if your Meta campaigns have active ads.'
              }
            </p>
          </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAndSortedAds.map((ad) => {
              const roas = calculateROAS(ad.conversions, ad.spent)
              
              return (
                <Card key={ad.ad_id} className="group relative bg-gradient-to-br from-white/[0.02] to-white/[0.01] 
                                              border border-white/10 hover:border-white/20 rounded-xl 
                                              transition-all duration-300 overflow-hidden">
                  {/* Subtle shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent 
                                 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  <CardContent className="relative z-10 p-0 flex flex-col h-full">
                    {/* Creative Image Section */}
                    <div className="relative h-32 bg-gradient-to-br from-[#1a1a1a] to-[#222] flex items-center justify-center overflow-hidden">
                      {ad.thumbnail_url || ad.image_url ? (
                        <Image 
                          src={ad.thumbnail_url || ad.image_url || ''} 
                          alt={ad.ad_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-gray-500" />
                      )}
                      
                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Platform Logo */}
                      <div className="absolute top-3 left-3 z-10">
                        <div className="w-7 h-7 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                          <Image
                            src="https://i.imgur.com/6hyyRrs.png"
                            alt="Meta"
                            width={16}
                            height={16}
                            className="object-contain"
                          />
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3 z-10">
                        <Badge className={`text-xs px-2 py-1 backdrop-blur-sm border ${
                          ad.status === 'ACTIVE' 
                            ? 'bg-green-500/20 text-green-300 border-green-500/40' 
                            : 'bg-gray-500/20 text-gray-300 border-gray-500/40'
                        }`}>
                          {ad.status}
                        </Badge>
                      </div>
                      
                      {/* Performance Indicator */}
                      <div className="absolute bottom-3 left-3 z-10">
                        <div className={`px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-sm border ${
                          roas >= 3 
                            ? 'bg-green-500/20 text-green-300 border-green-500/40' 
                            : roas >= 2 
                              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' 
                              : 'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}>
                          {roas > 0 ? `${roas.toFixed(2)}x ROAS` : 'No ROAS'}
                        </div>
                      </div>
                      
                      {/* Preview Link */}
                      {ad.preview_url && (
                        <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 bg-black/60 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 rounded-xl"
                                  onClick={() => window.open(ad.preview_url!, '_blank')}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-[#0a0a0a] border-[#333]">
                                <p className="text-white text-xs">Preview Ad</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                    
                    {/* Content Section */}
                    <div className="p-4 flex-1 flex flex-col">
                      {/* Ad Details */}
                      <div className="mb-4">
                        <h4 className="font-bold text-white text-sm mb-2 line-clamp-2 leading-tight">
                          {ad.ad_name}
                        </h4>
                        {ad.headline && (
                          <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                            {ad.headline}
                          </p>
                        )}
                        {/* Campaign info */}
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 line-clamp-1" title={ad.campaign_name}>
                            📊 {ad.campaign_name}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-1" title={ad.adset_name}>
                            🎯 {ad.adset_name}
                          </p>
                        </div>
                      </div>
                      
                      {/* Performance Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 mt-auto">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Spend</div>
                          <div className="text-sm font-bold text-white">
                            {formatCurrency(ad.spent)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">Clicks</div>
                          <div className="text-sm font-bold text-white">
                            {formatNumber(ad.clicks)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">CTR</div>
                          <div className="text-sm font-bold text-white">
                            {formatPercentage(ad.ctr)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom metrics bar */}
                      <div className="mt-3 pt-3 border-t border-[#333]/50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Impressions:</span>
                          <span className="text-white font-medium">{formatNumber(ad.impressions)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Conversions:</span>
                          <span className="text-white font-medium">{formatNumber(ad.conversions)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
              })}
            </div>
        )}
        </div>
      </div>
    </div>
  )
} 