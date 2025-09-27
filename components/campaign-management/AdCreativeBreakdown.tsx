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
    <Card className="bg-gradient-to-br from-[#0D0D0D] via-[#111] to-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl h-full max-h-[720px] flex flex-col overflow-hidden">
      {/* Modern Header with Glass Effect */}
      <CardHeader className="bg-gradient-to-r from-[#111]/90 to-[#0A0A0A]/90 backdrop-blur-lg border-b border-white/10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF2A2A]/20 to-[#FF2A2A]/5 rounded-2xl 
                          flex items-center justify-center border border-[#FF2A2A]/20 shadow-lg">
              <ImageIcon className="w-8 h-8 text-[#FF2A2A]" />
            </div>
            <div>
              <h2 className="text-3xl text-white font-bold tracking-tight mb-1">Ad Creative Performance</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-white/10 text-gray-300 border-white/20 text-xs font-medium">
                  {filteredAndSortedAds.length} Creative{filteredAndSortedAds.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-transparent border-[#333] text-white hover:bg-gray-800/50">
                  <Settings className="h-4 w-4 mr-2" />
                  Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-[#333]">
                <DropdownMenuLabel className="text-white">Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#333]" />
                {['spent', 'impressions', 'clicks', 'ctr', 'conversions'].map(metric => (
                  <DropdownMenuItem 
                    key={metric} 
                    onSelect={() => setSortBy(metric)}
                    className="text-white hover:bg-gray-800"
                  >
                    {metric === 'spent' && <DollarSign className="h-4 w-4 mr-2" />}
                    {metric === 'impressions' && <Eye className="h-4 w-4 mr-2" />}
                    {metric === 'clicks' && <MousePointer className="h-4 w-4 mr-2" />}
                    {metric === 'ctr' && <Target className="h-4 w-4 mr-2" />}
                    {metric === 'conversions' && <Zap className="h-4 w-4 mr-2" />}
                    <span className="capitalize">{metric === 'ctr' ? 'CTR' : metric}</span>
                    {sortBy === metric && (
                      <Badge className="ml-2 bg-blue-600 text-white">
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-[#333]" />
                <DropdownMenuItem 
                  onSelect={(e) => { e.preventDefault(); setShowInactive(!showInactive); }} 
                  className="text-white hover:bg-gray-800"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      {showInactive ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                      Show Inactive Ads
                    </div>
                    <Switch checked={showInactive} />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search ads, campaigns, or headlines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-400 
                     focus:border-white/20 focus:ring-1 focus:ring-white/20"
          />
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1 p-6 overflow-hidden">
        <div className="h-full overflow-y-auto custom-scrollbar">
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
                <Card key={ad.ad_id} className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#0F0F0F]/80 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 
                                              shadow-lg hover:shadow-2xl group overflow-hidden flex flex-col rounded-xl hover:transform hover:scale-105">
                  <CardContent className="p-0 flex-1 flex flex-col">
                    {/* Creative Image - Responsive sizing */}
                    <div className="p-3 lg:p-4 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] flex-shrink-0">
                      <div className="relative h-28 lg:h-32 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] 
                                    flex items-center justify-center overflow-hidden group-hover:border-[#3a3a3a] transition-colors">
                        {ad.thumbnail_url || ad.image_url ? (
                          <Image 
                            src={ad.thumbnail_url || ad.image_url || ''} 
                            alt={ad.ad_name}
                            fill
                            className="object-cover rounded-xl"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 lg:h-8 lg:w-8 text-gray-500" />
                        )}
                        
                        {/* Platform Logo */}
                        <div className="absolute top-1.5 lg:top-2 left-1.5 lg:left-2">
                          <div className="w-5 h-5 lg:w-6 lg:h-6 bg-[#0a0a0a] rounded-lg flex items-center justify-center border border-[#2a2a2a]">
                            <Image
                              src="https://i.imgur.com/6hyyRrs.png"
                              alt="Meta"
                              width={12}
                              height={12}
                              className="object-contain lg:w-[14px] lg:h-[14px]"
                            />
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="absolute top-1.5 lg:top-2 right-1.5 lg:right-2">
                          <Badge className={`text-xs px-1.5 lg:px-2 py-0.5 lg:py-1 ${
                            ad.status === 'ACTIVE' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}>
                            {ad.status}
                          </Badge>
                        </div>
                        
                        {/* Preview Link - Hidden on smaller screens */}
                        {ad.preview_url && (
                          <div className="absolute bottom-1.5 lg:bottom-2 right-1.5 lg:right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 lg:h-6 lg:w-6 bg-[#0a0a0a]/80 hover:bg-[#1a1a1a] text-white border border-[#2a2a2a]"
                                    onClick={() => window.open(ad.preview_url!, '_blank')}
                                  >
                                    <ExternalLink className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#0a0a0a] border-[#2a2a2a]">
                                  <p className="text-white text-xs">Preview Ad</p>
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