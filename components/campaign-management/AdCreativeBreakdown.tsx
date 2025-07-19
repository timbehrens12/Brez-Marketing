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
  // Remove loading states
  // const [isLoading, setIsLoading] = useState(true)
  // const [isRefreshing, setIsRefreshing] = useState(false) // Global refresh state
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null)
  const [sortBy, setSortBy] = useState('spent')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0)

  // Use preloaded ads when they change
  useEffect(() => {
    if (preloadedAds && preloadedAds.length > 0) {
      console.log('[AdCreativeBreakdown] Using preloaded ads data:', preloadedAds.length)
      setAds(preloadedAds)
    }
  }, [preloadedAds])

  // Fetch all ads using the same method as dashboard
  const fetchAds = async (forceRefresh = false) => {
    if (!selectedBrandId) return

    // Remove loading states
    // setIsLoading(true)
    // setIsRefreshing(true) // Set global refresh state

    try {
      // First get all active campaigns with cache-busting for fresh data
      const campaignsResponse = await fetch(`/api/meta/campaigns?brandId=${selectedBrandId}&status=ACTIVE&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const campaignsData = await campaignsResponse.json()
      
      if (!campaignsData.campaigns || campaignsData.campaigns.length === 0) {
        console.log('[AdCreativeBreakdown] No active campaigns found')
        setAds([])
        // Remove loading state
        // setIsLoading(false)
        return
      }

      console.log(`[AdCreativeBreakdown] Found ${campaignsData.campaigns.length} active campaigns`)

      // Get optimal date range - use today's date like blended widgets do at midnight
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      const todayString = today.toISOString().split('T')[0]
      const yesterdayString = yesterday.toISOString().split('T')[0]
      
      // Force today's data at midnight transition (like blended widgets)
      const shouldForceToday = forceRefresh || (today.getHours() === 0 && today.getMinutes() < 30) // First 30 minutes of new day
      
      console.log(`[AdCreativeBreakdown] DEBUG: Using date range: ${todayString} (will ${shouldForceToday ? 'force today' : `try yesterday ${yesterdayString} if no data`})`)
      
      // Then get ad sets for each campaign
      const allAds: Ad[] = []
      
      for (const campaign of campaignsData.campaigns) {
        try {
          // Get ad sets for this campaign with cache-busting
          const adSetsResponse = await fetch(`/api/meta/adsets?brandId=${selectedBrandId}&campaignId=${campaign.campaign_id}&t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            }
          })
          const adSetsData = await adSetsResponse.json()
          
          if (adSetsData.adSets && adSetsData.adSets.length > 0) {
            // Get ads for each ad set using the same endpoint as dashboard
            for (const adSet of adSetsData.adSets) {
              // Only include active ad sets unless showInactive is true
              if (!showInactive && adSet.status !== 'ACTIVE') continue
              
              try {
                // Try today's data first with cache-busting
                let adsResponse = await fetch('/api/meta/ads/direct-fetch', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                  },
                  body: JSON.stringify({
                    brandId: selectedBrandId,
                    adsetId: adSet.adset_id,
                    forceRefresh,
                    dateRange: {
                      from: todayString,
                      to: todayString
                    },
                    timestamp: Date.now()
                  })
                })
                
                let adsData = await adsResponse.json()
                
                                // If today's data is empty (all zeros), try yesterday's data (unless forcing today)
                if (adsData.success && adsData.ads?.length > 0 && !shouldForceToday) {
                  const hasData = adsData.ads.some((ad: any) => 
                    (ad.spent || 0) > 0 || (ad.impressions || 0) > 0 || (ad.clicks || 0) > 0
                  )
                  
                  if (!hasData) {
                    console.log(`[AdCreativeBreakdown] No data for today, trying yesterday for adset ${adSet.adset_id}`)
                    adsResponse = await fetch('/api/meta/ads/direct-fetch', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                      },
                      body: JSON.stringify({
                        brandId: selectedBrandId,
                        adsetId: adSet.adset_id,
                        forceRefresh,
                        dateRange: {
                          from: yesterdayString,
                          to: yesterdayString
                        },
                        timestamp: Date.now()
                      })
                    })
                    adsData = await adsResponse.json()
                  }
                } else if (shouldForceToday) {
                  console.log(`[AdCreativeBreakdown] Forcing today's data (midnight transition) for adset ${adSet.adset_id}`)
                }
                
                console.log(`[AdCreativeBreakdown] DEBUG: API Response for adset ${adSet.adset_id}:`, JSON.stringify({
                  success: adsData.success,
                  adsCount: adsData.ads?.length || 0,
                  sampleAd: adsData.ads?.[0] ? {
                    ad_id: adsData.ads[0].ad_id,
                    spent: adsData.ads[0].spent,
                    impressions: adsData.ads[0].impressions,
                    clicks: adsData.ads[0].clicks,
                    conversions: adsData.ads[0].conversions,
                    ctr: adsData.ads[0].ctr,
                    cpc: adsData.ads[0].cpc,
                    status: adsData.ads[0].status
                  } : null,
                  error: adsData.error
                }, null, 2))
                
                if (adsData.success && adsData.ads) {
                  // Add campaign and adset context to each ad
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
      
      console.log(`[AdCreativeBreakdown] DEBUG: Final aggregated data:`, JSON.stringify({
        totalAds: allAds.length,
        totalSpent: allAds.reduce((sum, ad) => sum + (ad.spent || 0), 0),
        totalImpressions: allAds.reduce((sum, ad) => sum + (ad.impressions || 0), 0),
        totalClicks: allAds.reduce((sum, ad) => sum + (ad.clicks || 0), 0),
        totalConversions: allAds.reduce((sum, ad) => sum + (ad.conversions || 0), 0),
        sampleAds: allAds.slice(0, 3).map(ad => ({
          ad_id: ad.ad_id,
          spent: ad.spent,
          impressions: ad.impressions,
          clicks: ad.clicks,
          conversions: ad.conversions
        }))
      }, null, 2))
      
      if (forceRefresh) {
        toast.success(`Loaded ${allAds.length} ad creatives`, {
          description: "Today's ad creative data refreshed successfully"
        })
      }
      
      console.log(`[AdCreativeBreakdown] Successfully loaded ${allAds.length} ads`)

    } catch (error: any) {
      console.error('[AdCreativeBreakdown] Error:', error)
      
      // Check if this is a token expiration error and emit for global handling
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
    } finally {
      // Remove loading states
      // setIsLoading(false)
      // setIsRefreshing(false) // Reset global refresh state
    }
  }

  // Initial load - only if no preloaded data
  useEffect(() => {
    if (selectedBrandId && (!preloadedAds || preloadedAds.length === 0)) {
      console.log('[AdCreativeBreakdown] No preloaded data, fetching ads...')
      fetchAds()
    }
  }, [selectedBrandId, preloadedAds])

  // Listen for the same refresh events as other dashboard widgets
  useEffect(() => {
    if (!selectedBrandId) return

    let refreshTimeout: NodeJS.Timeout

    const handleGlobalRefresh = (event: CustomEvent) => {
      const { brandId, source, forceRefresh } = event.detail
      
      // Only refresh if it's for the current brand and not from this widget
      if (brandId === selectedBrandId && source !== 'AdCreativeBreakdown') {
        console.log('[AdCreativeBreakdown] Global refresh triggered from other widgets, updating ads...', { source, forceRefresh })
        
        // Debounce multiple rapid refresh events
        clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          fetchAds(true)
        }, 1500) // Longer delay for manual refreshes to prevent loops
      }
    }

    const handleGlobalRefreshAll = (event: CustomEvent) => {
      const { brandId, platforms, currentTab } = event.detail
      
      // Only refresh if it's for the current brand and includes meta platform
      if (brandId === selectedBrandId && (platforms?.meta || currentTab === 'meta')) {
        console.log('[AdCreativeBreakdown] Global refresh all triggered, updating ads...', { platforms, currentTab })
        
        // Debounce multiple rapid refresh events
        clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          fetchAds(true)
        }, 1500)
      }
    }

    const handleNewDayDetected = (event: CustomEvent) => {
      const { brandId } = event.detail
      
      // Only refresh if it's for the current brand
      if (brandId === selectedBrandId) {
        console.log('[AdCreativeBreakdown] New day detected, updating ads...')
        
        // Debounce multiple rapid refresh events
        clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
          fetchAds(true)
        }, 1500)
      }
    }

    // Listen for the same events as other dashboard widgets
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
        ad.ad_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.adset_name.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Only show active ads unless showInactive toggle is enabled
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
      // Assuming $25 average order value
      const estimatedOrderValue = conversions * 25
      return estimatedOrderValue / spent
    }
    return 0
  }

  // Remove loading state calculations - always show content or empty state
  // Component is loading if either external loading prop is true OR internal loading state is true
  // const showLoading = loading || isLoading

  return (
    <Card className="bg-[#0a0a0a] border-[#1a1a1a] shadow-2xl overflow-hidden relative">
      {/* Remove Loading Overlay */}
      {/* {isRefreshing && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 animate-pulse">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
            <p className="text-gray-400 text-lg font-medium">Refreshing ad creatives...</p>
            <p className="text-gray-500 text-sm mt-2">Analyzing performance data</p>
          </div>
        </div>
      )} */}
      
      <CardHeader className="bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] pb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                          flex items-center justify-center border border-white/10 shadow-lg">
              <ImageIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-white font-bold tracking-tight">Ad Creative Performance</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-white/10 text-gray-300 border-white/20 text-xs font-medium">
                  {/* Remove loading check */}
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

      <CardContent className="p-6">
        {/* Show empty state only if no data and not waiting for preloaded data */}
        {filteredAndSortedAds.length === 0 && !(preloadedAds && preloadedAds.length > 0 && ads.length === 0) ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-white/5 to-white/10 rounded-2xl 
                          flex items-center justify-center border border-white/10 shadow-lg mx-auto mb-4">
              <ImageIcon className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-medium text-white truncate mb-2">No Ad Creatives Found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {searchQuery ? 
                `No ads match your search "${searchQuery}". Try adjusting your filters.` :
                'No ad creatives found for your selected criteria. Try adjusting your filters or check if your Meta campaigns have active ads.'
              }
            </p>
          </div>
        ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 max-h-[800px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {filteredAndSortedAds.map((ad) => {
              const roas = calculateROAS(ad.conversions, ad.spent)
              
              return (
                <Card key={ad.ad_id} className="bg-[#0f0f0f] border-[#1a1a1a] hover:border-[#2a2a2a] transition-all duration-300 
                                              shadow-lg hover:shadow-2xl group overflow-hidden">
                  <CardContent className="p-0">
                    {/* Creative Image - Smaller with widget background */}
                    <div className="p-4 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
                      <div className="relative h-32 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] 
                                    flex items-center justify-center overflow-hidden group-hover:border-[#3a3a3a] transition-colors">
                        {ad.thumbnail_url || ad.image_url ? (
                          <Image 
                            src={ad.thumbnail_url || ad.image_url || ''} 
                            alt={ad.ad_name}
                            fill
                            className="object-cover rounded-xl"
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-gray-500" />
                        )}
                        
                        {/* Platform Logo */}
                        <div className="absolute top-2 left-2">
                          <div className="w-6 h-6 bg-[#0a0a0a] rounded-lg flex items-center justify-center border border-[#2a2a2a]">
                            <Image
                              src="https://i.imgur.com/6hyyRrs.png"
                              alt="Meta"
                              width={14}
                              height={14}
                              className="object-contain"
                            />
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className="absolute top-2 right-2">
                          <Badge className={`text-xs px-2 py-1 ${
                            ad.status === 'ACTIVE' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}>
                            {ad.status}
                          </Badge>
                        </div>
                        
                        {/* Preview Link */}
                        {ad.preview_url && (
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 bg-[#0a0a0a]/80 hover:bg-[#1a1a1a] text-white border border-[#2a2a2a]"
                                    onClick={() => window.open(ad.preview_url!, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3" />
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
                    
                    {/* Ad Details */}
                    <div className="p-4 pt-0">
                      <div className="mb-4">
                                                  <h4 className="font-semibold text-white text-sm mb-1 tracking-tight line-clamp-2 overflow-hidden text-ellipsis">
                          {ad.ad_name}
                        </h4>
                        {ad.headline && (
                          <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                            {ad.headline}
                          </p>
                        )}
                                                  <div className="text-xs text-gray-500 space-y-1">
                            <p className="text-gray-400 truncate">{ad.campaign_name}</p>
                            <p className="text-gray-500 truncate">{ad.adset_name}</p>
                          </div>
                      </div>
                      
                      {/* Performance Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider">Spend</div>
                          <div className="text-white font-bold">{formatCurrency(ad.spent)}</div>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider">Impressions</div>
                          <div className="text-white font-bold">{formatNumber(ad.impressions)}</div>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider">Clicks</div>
                          <div className="text-white font-bold">{formatNumber(ad.clicks)}</div>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider">CTR</div>
                          <div className="text-white font-bold">{formatPercentage(ad.ctr)}</div>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider">Conversions</div>
                          <div className="text-white font-bold">{formatNumber(ad.conversions)}</div>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] hover:bg-[#1f1f1f] transition-colors">
                          <div className="text-gray-500 mb-1 font-medium uppercase tracking-wider">ROAS</div>
                          <div className={`font-bold ${
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
      </CardContent>
    </Card>
  )
} 