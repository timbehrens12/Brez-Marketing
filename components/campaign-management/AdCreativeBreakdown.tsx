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
    <div className="relative h-full">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl blur-xl"></div>

      <Card className="relative bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-3xl shadow-2xl h-full flex flex-col">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-white/5 via-white/2 to-transparent border-b border-white/10 rounded-t-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
              <ImageIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Ad Creative Performance</h2>
              <div className="flex items-center gap-3">
                <Badge className="bg-gradient-to-br from-blue-500/20 to-blue-600/30 text-blue-300 border-blue-500/40 text-sm font-medium px-3 py-1">
                  {filteredAndSortedAds.length} Creative{filteredAndSortedAds.length !== 1 ? 's' : ''}
                </Badge>
                <span className="text-gray-400 text-sm">•</span>
                <span className="text-gray-400 text-sm">
                  Sorted by {sortBy === 'ctr' ? 'CTR' : sortBy} {sortOrder === 'desc' ? '↓' : '↑'}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Controls */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30 px-4 py-2 rounded-2xl">
                  <Settings className="h-4 w-4 mr-2" />
                  Sort & Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-white/20 w-64 p-2 rounded-2xl shadow-2xl backdrop-blur-sm">
                <DropdownMenuLabel className="text-gray-300 font-semibold px-2 py-1">Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                {['spent', 'impressions', 'clicks', 'ctr', 'conversions'].map(metric => (
                  <DropdownMenuItem
                    key={metric}
                    onSelect={() => setSortBy(metric)}
                    className="text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {metric === 'spent' && <DollarSign className="h-4 w-4 text-green-400" />}
                        {metric === 'impressions' && <Eye className="h-4 w-4 text-blue-400" />}
                        {metric === 'clicks' && <MousePointer className="h-4 w-4 text-purple-400" />}
                        {metric === 'ctr' && <Target className="h-4 w-4 text-cyan-400" />}
                        {metric === 'conversions' && <Zap className="h-4 w-4 text-orange-400" />}
                        <span className="capitalize">{metric === 'ctr' ? 'CTR' : metric}</span>
                      </div>
                      {sortBy === metric && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs">
                          {sortOrder === 'desc' ? '↓' : '↑'}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); setShowInactive(!showInactive); }}
                  className="text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {showInactive ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
                      Show Inactive Ads
                    </div>
                    <Switch checked={showInactive} className="data-[state=checked]:bg-blue-500" />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search ads, campaigns, or headlines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-3 bg-gradient-to-br from-white/5 to-white/2 border-white/10 text-white placeholder:text-gray-400 w-full rounded-2xl focus:border-white/30 focus:ring-2 focus:ring-white/20"
          />
        </div>
      </div>

      {/* Content */}
      <CardContent className="flex-1 p-6 overflow-hidden">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              {filteredAndSortedAds.map((ad) => {
              const roas = calculateROAS(ad.conversions, ad.spent)
              
              // 🔍 CONVERSIONS DEBUG - Ad Creative Breakdown
              console.log(`🔍 AdCreative ${ad.ad_name} (${ad.ad_id}) Debug:`, {
                conversions: ad.conversions,
                spent: ad.spent,
                costPerConversion: ad.cost_per_conversion,
                calculatedROAS: roas,
                campaignId: ad.campaign_id,
                adsetId: ad.adset_id,
                status: ad.status,
                effectiveStatus: ad.effective_status
              });
              
              return (
                <div key={ad.ad_id} className="relative group">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <Card className="relative bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm border border-white/10 rounded-3xl hover:border-white/20 transition-all duration-300 shadow-2xl hover:shadow-white/10 group-hover:scale-[1.02] overflow-hidden flex flex-col">
                    <CardContent className="p-0 flex-1 flex flex-col">
                      {/* Enhanced Creative Image */}
                      <div className="p-4 bg-gradient-to-br from-white/5 to-white/2 flex-shrink-0">
                        <div className="relative h-32 lg:h-36 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-white/20 transition-all duration-300">
                          {ad.thumbnail_url || ad.image_url ? (
                            <Image
                              src={ad.thumbnail_url || ad.image_url || ''}
                              alt={ad.ad_name}
                              fill
                              className="object-cover rounded-2xl"
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 lg:h-10 lg:w-10 text-gray-500" />
                          )}

                          {/* Enhanced Platform Logo */}
                          <div className="absolute top-2 left-2">
                            <div className="w-6 h-6 lg:w-7 lg:h-7 bg-gradient-to-br from-white/10 to-white/5 rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                              <Image
                                src="https://i.imgur.com/6hyyRrs.png"
                                alt="Meta"
                                width={14}
                                height={14}
                                className="object-contain"
                              />
                            </div>
                          </div>

                          {/* Enhanced Status Badge */}
                          <div className="absolute top-2 right-2">
                            <Badge className={`text-xs px-2 py-1 rounded-xl border-2 ${
                              ad.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/40'
                            }`}>
                              {ad.status}
                            </Badge>
                          </div>

                          {/* Enhanced Preview Link */}
                          {ad.preview_url && (
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-lg backdrop-blur-sm"
                                      onClick={() => window.open(ad.preview_url!, '_blank')}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#444] text-white p-2 rounded-xl shadow-2xl">
                                    <p className="text-white text-xs font-medium">Preview Ad</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </div>
                      </div>
                    
                    {/* Ad Details - Flexible container with proper overflow handling */}
                    <div className="p-3 lg:p-4 pt-0 flex-1 flex flex-col min-h-0">
                      <div className="mb-3 lg:mb-4 flex-shrink-0">
                        {/* Ad name with responsive text sizing and proper line clamping */}
                        <h4 className="font-semibold text-white text-xs lg:text-sm mb-1 tracking-tight 
                                     break-words overflow-hidden text-ellipsis line-clamp-2">
                          {ad.ad_name}
                        </h4>
                        {ad.headline && (
                          <p className="text-xs text-gray-400 mb-2 break-words overflow-hidden text-ellipsis line-clamp-2">
                            {ad.headline}
                          </p>
                        )}
                        {/* Campaign and adset names with responsive overflow handling */}
                        <div className="text-xs text-gray-500 space-y-0.5 lg:space-y-1">
                          <p className="text-gray-400 break-words overflow-hidden text-ellipsis line-clamp-1" 
                             title={ad.campaign_name}>
                            {ad.campaign_name}
                          </p>
                          <p className="text-gray-500 break-words overflow-hidden text-ellipsis line-clamp-1" 
                             title={ad.adset_name}>
                            {ad.adset_name}
                          </p>
                        </div>
                      </div>
                      
                      {/* Performance Metrics - Fully responsive grid */}
                      <div className="grid grid-cols-2 gap-1.5 lg:gap-2 text-xs flex-1">
                        <div className="bg-[#1a1a1a] rounded-lg lg:rounded-xl p-2 lg:p-3 border border-[#2a2a2a] 
                                       hover:bg-[#1f1f1f] transition-colors min-h-0 flex flex-col">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider text-xs 
                                         truncate flex-shrink-0">
                            Spend
                          </div>
                          <div className="text-white font-bold text-xs lg:text-sm break-words flex-1 flex items-end">
                            {formatCurrency(ad.spent)}
                          </div>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-lg lg:rounded-xl p-2 lg:p-3 border border-[#2a2a2a] 
                                       hover:bg-[#1f1f1f] transition-colors min-h-0 flex flex-col">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider text-xs 
                                         truncate flex-shrink-0">
                            Impress.
                          </div>
                          <div className="text-white font-bold text-xs lg:text-sm break-words flex-1 flex items-end">
                            {formatNumber(ad.impressions)}
                          </div>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-lg lg:rounded-xl p-2 lg:p-3 border border-[#2a2a2a] 
                                       hover:bg-[#1f1f1f] transition-colors min-h-0 flex flex-col">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider text-xs 
                                         truncate flex-shrink-0">
                            Clicks
                          </div>
                          <div className="text-white font-bold text-xs lg:text-sm break-words flex-1 flex items-end">
                            {formatNumber(ad.clicks)}
                          </div>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-lg lg:rounded-xl p-2 lg:p-3 border border-[#2a2a2a] 
                                       hover:bg-[#1f1f1f] transition-colors min-h-0 flex flex-col">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider text-xs 
                                         truncate flex-shrink-0">
                            CTR
                          </div>
                          <div className="text-white font-bold text-xs lg:text-sm break-words flex-1 flex items-end">
                            {formatPercentage(ad.ctr)}
                          </div>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-lg lg:rounded-xl p-2 lg:p-3 border border-[#2a2a2a] 
                                       hover:bg-[#1f1f1f] transition-colors min-h-0 flex flex-col">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider text-xs 
                                         truncate flex-shrink-0">
                            Conver.
                          </div>
                          <div className="text-white font-bold text-xs lg:text-sm break-words flex-1 flex items-end">
                            {formatNumber(ad.conversions)}
                          </div>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-lg lg:rounded-xl p-2 lg:p-3 border border-[#2a2a2a] 
                                       hover:bg-[#1f1f1f] transition-colors min-h-0 flex flex-col">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider text-xs 
                                         truncate flex-shrink-0">
                            ROAS
                          </div>
                          <div className={`font-bold text-xs lg:text-sm break-words flex-1 flex items-end ${
                            roas >= 3 ? 'text-green-400' : roas >= 2 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {roas > 0 ? `${roas.toFixed(2)}x` : '0.00x'}
                          </div>
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
      </CardContent>
    </Card>
  )
} 