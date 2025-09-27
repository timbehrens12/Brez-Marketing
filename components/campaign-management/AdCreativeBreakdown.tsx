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
    <div className="relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden h-full max-h-[680px] flex flex-col">
      {/* Modern Header */}
      <div className="relative bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-indigo-600/20 p-6 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10 animate-pulse"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl
                            flex items-center justify-center border border-blue-500/30 shadow-lg backdrop-blur-sm">
                <ImageIcon className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Creative Performance</h2>
                <p className="text-blue-200 text-sm">Analyze ad effectiveness and audience engagement</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-300 text-sm font-medium">Live Data</span>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-white">{filteredAndSortedAds.length}</div>
                <div className="text-xs text-slate-400">Active Creatives</div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search creatives by name, headline, or campaign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:border-blue-400/50 focus:ring-blue-400/20"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50">
                  <Settings className="w-4 h-4 mr-2" />
                  Sort & Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-600 min-w-64">
                <DropdownMenuLabel className="text-slate-200">Sort By Performance</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-600" />
                {[
                  { key: 'spent', label: 'Ad Spend', icon: DollarSign },
                  { key: 'impressions', label: 'Impressions', icon: Eye },
                  { key: 'clicks', label: 'Clicks', icon: MousePointer },
                  { key: 'ctr', label: 'CTR', icon: Target },
                  { key: 'conversions', label: 'Conversions', icon: Zap }
                ].map(({ key, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={key}
                    onSelect={() => setSortBy(key)}
                    className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    <span className="flex-1">{label}</span>
                    {sortBy === key && (
                      <Badge className="bg-blue-600 text-white text-xs">
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="bg-slate-600" />
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); setShowInactive(!showInactive); }}
                  className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      {showInactive ? <Eye className="h-4 w-4 mr-3" /> : <EyeOff className="h-4 w-4 mr-3" />}
                      Show Inactive Ads
                    </div>
                    <Switch
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full overflow-y-auto custom-scrollbar">
          {filteredAndSortedAds.length === 0 && !(preloadedAds && preloadedAds.length > 0 && ads.length === 0) ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-slate-600/20 to-slate-700/30 rounded-2xl flex items-center justify-center border border-slate-600/50">
                <ImageIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">No Creatives Found</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                {searchQuery ? 'Try adjusting your search criteria' : 'No ad creatives found. Start creating ads to see performance data here.'}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                <span className="text-indigo-300 text-sm font-medium">Ready for your ads...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredAndSortedAds.map((ad) => {
                const roas = calculateROAS(ad.conversions, ad.spent)
                const ctrColor = ad.ctr >= 2 ? 'text-green-400' : ad.ctr >= 1 ? 'text-yellow-400' : 'text-red-400'
                const roasColor = roas >= 3 ? 'text-green-400' : roas >= 2 ? 'text-yellow-400' : 'text-red-400'

                return (
                  <div key={ad.ad_id} className="group relative backdrop-blur-xl bg-gradient-to-br from-slate-800/30 to-slate-900/30 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-indigo-400/30 transition-all duration-300">
                    {/* Animated background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="relative">
                      {/* Creative Preview Section */}
                      <div className="p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-b border-slate-700/50">
                        <div className="relative aspect-video bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden group-hover:border-slate-600/50 transition-colors">
                          {ad.thumbnail_url || ad.image_url ? (
                            <Image
                              src={ad.thumbnail_url || ad.image_url || ''}
                              alt={ad.ad_name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-slate-500" />
                            </div>
                          )}

                          {/* Overlay Elements */}
                          <div className="absolute top-3 left-3">
                            <div className="w-8 h-8 bg-slate-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center border border-slate-600/50">
                              <Image
                                src="https://i.imgur.com/6hyyRrs.png"
                                alt="Meta"
                                width={16}
                                height={16}
                                className="object-contain"
                              />
                            </div>
                          </div>

                          <div className="absolute top-3 right-3">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm border ${
                              ad.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                            }`}>
                              {ad.status}
                            </div>
                          </div>

                          {/* Preview Button */}
                          {ad.preview_url && (
                            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="w-8 h-8 bg-slate-800/80 backdrop-blur-sm hover:bg-slate-700/80 text-white border border-slate-600/50"
                                      onClick={() => window.open(ad.preview_url!, '_blank')}
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-800 border-slate-600">
                                    <p className="text-white text-xs">Preview Ad</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="p-4">
                        {/* Ad Details */}
                        <div className="mb-4">
                          <h4 className="font-semibold text-white text-base mb-2 line-clamp-2 group-hover:text-indigo-200 transition-colors">
                            {ad.ad_name}
                          </h4>
                          {ad.headline && (
                            <p className="text-sm text-slate-400 mb-2 line-clamp-2">
                              {ad.headline}
                            </p>
                          )}
                          <div className="text-xs text-slate-500 space-y-1">
                            <div className="truncate" title={ad.campaign_name}>{ad.campaign_name}</div>
                            <div className="truncate" title={ad.adset_name}>{ad.adset_name}</div>
                          </div>
                        </div>

                        {/* Performance Metrics Grid */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="text-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                            <div className="text-lg font-bold text-white mb-1">{formatCurrency(ad.spent)}</div>
                            <div className="text-xs text-slate-400">Spend</div>
                          </div>

                          <div className="text-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                            <div className="text-lg font-bold text-white mb-1">{(ad.impressions / 1000).toFixed(0)}K</div>
                            <div className="text-xs text-slate-400">Impressions</div>
                          </div>

                          <div className="text-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                            <div className="text-lg font-bold text-white mb-1">{ad.clicks.toLocaleString()}</div>
                            <div className="text-xs text-slate-400">Clicks</div>
                          </div>
                        </div>

                        {/* Key Performance Indicators */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className={`text-lg font-bold mb-1 ${ctrColor}`}>{formatPercentage(ad.ctr)}</div>
                            <div className="text-xs text-slate-400">CTR</div>
                          </div>

                          <div className="text-center">
                            <div className="text-lg font-bold text-white mb-1">{ad.conversions}</div>
                            <div className="text-xs text-slate-400">Conversions</div>
                          </div>

                          <div className="text-center">
                            <div className={`text-lg font-bold mb-1 ${roasColor}`}>
                              {roas > 0 ? `${roas.toFixed(2)}x` : '0.00x'}
                            </div>
                            <div className="text-xs text-slate-400">ROAS</div>
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