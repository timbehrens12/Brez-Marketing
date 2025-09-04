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
    <div className="relative bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A] border border-[#1a1a1a] rounded-2xl h-full flex flex-col overflow-hidden">
      {/* Modern header */}
      <div className="relative bg-gradient-to-r from-[#0f0f0f]/80 to-[#1a1a1a]/80 backdrop-blur-xl p-5 border-b border-[#222]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-xl 
                          flex items-center justify-center border border-purple-500/20 shadow-lg">
              <ImageIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Creative Performance</h2>
              <p className="text-gray-400 text-sm">{filteredAndSortedAds.length} ads • {filteredAndSortedAds.filter(ad => ad.status === 'ACTIVE').length} active</p>
            </div>
          </div>
          
          {/* Quick stats */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Spend</p>
              <p className="text-lg font-bold text-white">${filteredAndSortedAds.reduce((sum, ad) => sum + (ad.spent || 0), 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-3 mt-4">
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
      </div>

      {/* Content */}
      <div className="p-6">
        {filteredAndSortedAds.length === 0 && !((preloadedAds && preloadedAds.length > 0) && ads.length === 0) ? (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
            {filteredAndSortedAds.map((ad) => {
              const roas = calculateROAS(ad.conversions, ad.spent)
              
              return (
                <div key={ad.ad_id} className="relative bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#333] rounded-xl hover:border-[#444] transition-all duration-300 group overflow-hidden">
                  {/* Creative Image */}
                  <div className="relative h-40 bg-[#1a1a1a] overflow-hidden">
                    {ad.thumbnail_url || ad.image_url ? (
                      <Image 
                        src={ad.thumbnail_url || ad.image_url || ''} 
                        alt={ad.ad_name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-500" />
                      </div>
                    )}
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    {/* Status badge */}
                    <div className="absolute top-3 right-3">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ad.status === 'ACTIVE' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {ad.status}
                      </div>
                    </div>
                    
                    {/* Platform logo */}
                    <div className="absolute top-3 left-3">
                      <div className="w-8 h-8 bg-black/50 backdrop-blur rounded-lg flex items-center justify-center border border-white/10">
                        <Image
                          src="https://i.imgur.com/6hyyRrs.png"
                          alt="Meta"
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                    </div>
                    
                    {/* Preview button */}
                    {ad.preview_url && (
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-black/50 backdrop-blur hover:bg-black/70 text-white border border-white/20"
                          onClick={() => window.open(ad.preview_url!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Content section */}
                  <div className="p-4">
                    {/* Ad name and headline */}
                    <div className="mb-3">
                      <h4 className="font-semibold text-white text-sm mb-1 line-clamp-1">
                        {ad.ad_name}
                      </h4>
                      {ad.headline && (
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {ad.headline}
                        </p>
                      )}
                    </div>
                      
                    
                    {/* Key metrics in a horizontal layout */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Spend</p>
                        <p className="text-sm font-bold text-white">{formatCurrency(ad.spent)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Clicks</p>
                        <p className="text-sm font-bold text-white">{formatNumber(ad.clicks)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">CTR</p>
                        <p className="text-sm font-bold text-white">{formatPercentage(ad.ctr)}</p>
                      </div>
                    </div>
                    
                    {/* Performance indicator */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {roas > 2 ? (
                          <div className="flex items-center gap-1 text-green-400">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-xs font-medium">High ROAS</span>
                          </div>
                        ) : roas > 1 ? (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Target className="w-3 h-3" />
                            <span className="text-xs font-medium">Moderate</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-400">
                            <TrendingDown className="w-3 h-3" />
                            <span className="text-xs font-medium">Low ROAS</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Est. ROAS</p>
                        <p className="text-sm font-bold text-white">{roas.toFixed(2)}x</p>
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
  )
} 