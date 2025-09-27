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
    <div className="relative bg-gradient-to-br from-[#0f0f0f]/50 to-[#1a1a1a]/50 backdrop-blur-xl border border-[#333]/50 rounded-3xl overflow-hidden h-full max-h-[680px] flex flex-col">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-teal-500/5"></div>
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-full blur-3xl"></div>

      <div className="relative z-10">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-[#0a0a0a]/80 to-[#141414]/80 backdrop-blur-xl border-b border-[#333]/50 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-2xl
                            flex items-center justify-center border border-[#333]/50 shadow-lg backdrop-blur-xl">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Creative Performance
                </h2>
                <p className="text-gray-400 text-sm">Analyze ad creative effectiveness and ROI</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-[#1a1a1a]/50 border border-[#333]/50 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-gray-300">
                      {filteredAndSortedAds.length} Creative{filteredAndSortedAds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search creatives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#1a1a1a]/50 border-[#333]/50 text-white placeholder:text-gray-500 w-48 rounded-xl focus:border-blue-500/50"
                />
              </div>

              {/* Filters */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-[#1a1a1a]/50 border-[#333]/50 text-white hover:bg-[#2a2a2a]/50 rounded-xl">
                    <Settings className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#333] rounded-xl">
                <DropdownMenuLabel className="text-white">Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#333]" />
                {['spent', 'impressions', 'clicks', 'ctr', 'conversions'].map(metric => (
                  <DropdownMenuItem 
                    key={metric} 
                    onSelect={() => setSortBy(metric)}
                    className="text-white hover:bg-[#2a2a2a] rounded-lg"
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

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {filteredAndSortedAds.length === 0 && !(preloadedAds && preloadedAds.length > 0 && ads.length === 0) ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-2xl flex items-center justify-center border border-gray-500/30">
                <ImageIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">No Ad Creatives Found</h3>
              <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">
                No ad creatives match your current filters. Try adjusting your search criteria or check if your Meta campaigns have active ads.
              </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAndSortedAds.map((ad) => {
              const roas = calculateROAS(ad.conversions, ad.spent)
              const profit = (roas * ad.spent) - ad.spent

              return (
                <div key={ad.ad_id} className="group relative bg-gradient-to-br from-[#0f0f0f]/80 to-[#1a1a1a]/80 backdrop-blur-xl border border-[#333]/50 rounded-2xl hover:border-teal-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10 overflow-hidden flex flex-col">
                  {/* Background Glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                  <div className="relative z-10 flex-1 flex flex-col">
                    {/* Creative Image */}
                    <div className="p-4 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] flex-shrink-0">
                      <div className="relative h-32 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]
                                    flex items-center justify-center overflow-hidden group-hover:border-teal-500/30 transition-colors">
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

                    {/* Ad Details - Streamlined */}
                    <div className="p-4 flex-1 flex flex-col">
                      {/* Header */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-white text-sm mb-2 truncate">
                          {ad.ad_name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs px-2 py-0.5 ${
                            ad.status === 'ACTIVE'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}>
                            {ad.status}
                          </Badge>
                          <span className="text-xs text-gray-500">Meta Ads</span>
                        </div>
                      </div>

                      {/* Key Metrics - Profitability Focus */}
                      <div className="space-y-3 mb-4">
                        {/* Profit & ROAS Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-400 mb-1">Profit</div>
                            <div className={`text-lg font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {profit >= 0 ? '+' : ''}${Math.abs(profit).toFixed(0)}
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                            <div className="text-xs text-gray-400 mb-1">ROAS</div>
                            <div className={`text-lg font-bold ${roas >= 2 ? 'text-green-400' : roas >= 1.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {roas.toFixed(2)}x
                            </div>
                          </div>
                        </div>

                        {/* Performance Row */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">CTR</div>
                            <div className="text-sm font-semibold text-white">{formatPercentage(ad.ctr)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Clicks</div>
                            <div className="text-sm font-semibold text-white">{formatNumber(ad.clicks)}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">Spend</div>
                            <div className="text-sm font-semibold text-white">${ad.spent?.toFixed(0) || '0'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Campaign Info */}
                      <div className="text-xs text-gray-500 space-y-1">
                        <div className="truncate" title={ad.campaign_name}>
                          Campaign: {ad.campaign_name}
                        </div>
                        <div className="truncate" title={ad.adset_name}>
                          Ad Set: {ad.adset_name}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
              })}
            </div>
        )}
        </div>
      </div>
    </div>
  )
} 