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
     <div className="bg-gradient-to-r from-[#0f0f0f]/30 to-[#1a1a1a]/20 border border-[#333]/50 rounded-2xl h-full max-h-[680px] flex flex-col overflow-hidden">
       {/* Compact Header */}
       <div className="p-4 border-b border-[#333]/50">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-gradient-to-br from-white/10 to-white/5 rounded-xl 
                           flex items-center justify-center border border-white/20">
               <ImageIcon className="w-4 h-4 text-white" />
             </div>
             <div>
               <h3 className="text-lg text-white font-bold">Creative Performance</h3>
               <div className="flex items-center gap-2 mt-0.5">
                 <Badge className="bg-white/10 text-gray-300 border-white/20 text-xs px-2 py-0.5 rounded-md">
                   {filteredAndSortedAds.length} Active
                 </Badge>
                 <span className="text-gray-500 text-xs">Ad performance insights</span>
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
      </CardHeader>

       {/* Content */}
       <div className="flex-1 p-4 overflow-hidden">
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
                 <div key={ad.ad_id} className="group relative bg-gradient-to-r from-[#0f0f0f]/60 to-[#1a1a1a]/40 
                                               border border-[#333]/50 hover:border-[#444] rounded-xl 
                                               transition-all duration-300 overflow-hidden p-3">
                   
                   <div className="relative z-10 flex flex-col h-full">
                     {/* Compact Creative Section */}
                     <div className="relative h-20 bg-gradient-to-br from-[#1a1a1a] to-[#222] flex items-center justify-center overflow-hidden rounded-lg mb-3">
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
                      
                       {/* Compact Overlays */}
                       <div className="absolute top-1 left-1 z-10">
                         <Image
                           src="https://i.imgur.com/6hyyRrs.png"
                           alt="Meta"
                           width={12}
                           height={12}
                           className="object-contain rounded-sm"
                         />
                       </div>
                       
                       <div className="absolute top-1 right-1 z-10">
                         <div className={`w-2 h-2 rounded-full ${
                           ad.status === 'ACTIVE' ? 'bg-emerald-400' : 
                           ad.status === 'PAUSED' ? 'bg-amber-400' : 'bg-gray-400'
                         }`}></div>
                       </div>
                       
                       <div className="absolute bottom-1 left-1 z-10">
                         <div className={`px-1 py-0.5 rounded text-xs font-bold backdrop-blur-sm ${
                           roas >= 3 
                             ? 'bg-green-500/20 text-green-300' 
                             : roas >= 2 
                               ? 'bg-yellow-500/20 text-yellow-300' 
                               : 'bg-red-500/20 text-red-300'
                         }`}>
                           {roas > 0 ? `${roas.toFixed(1)}x` : 'N/A'}
                         </div>
                       </div>
                    </div>
                    
                     {/* Compact Content */}
                     <div className="flex-1">
                       <h4 className="font-semibold text-white text-xs mb-1 line-clamp-1">
                         {ad.ad_name}
                       </h4>
                       
                       {/* Compact Performance Grid */}
                       <div className="grid grid-cols-4 gap-1 text-xs">
                         <div className="text-center">
                           <div className="text-gray-600">Spend</div>
                           <div className="text-white font-medium">{formatCurrency(ad.spent)}</div>
                         </div>
                         <div className="text-center">
                           <div className="text-gray-600">Clicks</div>
                           <div className="text-white font-medium">{formatNumber(ad.clicks)}</div>
                         </div>
                         <div className="text-center">
                           <div className="text-gray-600">CTR</div>
                           <div className="text-white font-medium">{formatPercentage(ad.ctr)}</div>
                         </div>
                         <div className="text-center">
                           <div className="text-gray-600">Conv.</div>
                           <div className="text-white font-medium">{formatNumber(ad.conversions)}</div>
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
      </CardContent>
    </Card>
  )
} 