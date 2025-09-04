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
import { cn } from "@/lib/utils"

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
      setAds(preloadedAds)
    }
  }, [preloadedAds])

  // Filter and sort ads
  const filteredAndSortedAds = ads
    .filter(ad => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          ad.ad_name.toLowerCase().includes(query) ||
          ad.campaign_name.toLowerCase().includes(query) ||
          (ad.headline && ad.headline.toLowerCase().includes(query)) ||
          (ad.body && ad.body.toLowerCase().includes(query))
        
        if (!matchesSearch) return false
      }
      
      // Filter by active status
      if (!showInactive && ad.status !== 'ACTIVE') return false
      
      return true
    })
    .sort((a, b) => {
      let aVal: any = a[sortBy as keyof Ad]
      let bVal: any = b[sortBy as keyof Ad]
      
      // Handle numeric sorting
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal
      }
      
      // Handle string sorting
      aVal = String(aVal).toLowerCase()
      bVal = String(bVal).toLowerCase()
      
      if (sortOrder === 'desc') {
        return bVal.localeCompare(aVal)
      }
      return aVal.localeCompare(bVal)
    })

  // Format ROAS calculation
  const calculateROAS = (conversions: number, spent: number) => {
    if (conversions > 0 && spent > 0) {
      const estimatedOrderValue = conversions * 25
      return estimatedOrderValue / spent
    }
    return 0
  }

  return (
    <div className="bg-gradient-to-br from-[#0f0f0f] via-[#111] to-[#0a0a0a] border border-[#333]/50 rounded-2xl shadow-2xl backdrop-blur-sm h-full flex flex-col">
      {/* Modern Compact Header */}
      <div className="p-4 border-b border-[#333]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg 
                          flex items-center justify-center border border-orange-500/20">
              <ImageIcon className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Ad Creative Performance</h2>
              <p className="text-gray-400 text-xs">{filteredAndSortedAds.length} creative{filteredAndSortedAds.length !== 1 ? 's' : ''}</p>
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
              <DropdownMenuContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                <DropdownMenuLabel>View Options</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#2a2a2a]" />
                <DropdownMenuItem className="hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]">
                  <div className="flex items-center justify-between w-full">
                    <span>Show Inactive</span>
                    <Switch
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                      className="ml-2"
                    />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#2a2a2a]" />
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSortBy('spent')} className="hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]">
                  Ad Spend
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('ctr')} className="hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]">
                  CTR
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('conversions')} className="hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]">
                  Conversions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Modern Content Grid */}
      <div className="flex-1 p-4 overflow-auto">
        {filteredAndSortedAds.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-2">No Creatives Found</h3>
            <p className="text-gray-400 text-sm">
              {searchQuery ? `No ads match "${searchQuery}"` : 'No active ad creatives to display'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedAds.slice(0, 5).map((ad) => {
              const roas = calculateROAS(ad.conversions, ad.spent)
              
              return (
                <div key={ad.ad_id} className="bg-gradient-to-r from-[#1a1a1a] to-[#111] border border-[#333]/30 rounded-xl p-4 hover:border-[#444]/50 transition-all">
                  <div className="flex gap-4">
                    {/* Creative Thumbnail */}
                    <div className="w-16 h-16 bg-[#222] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {ad.thumbnail_url || ad.image_url ? (
                        <Image 
                          src={ad.thumbnail_url || ad.image_url || ''} 
                          alt={ad.ad_name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    
                    {/* Creative Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-white truncate">{ad.ad_name}</h3>
                          <p className="text-xs text-gray-400 truncate">{ad.campaign_name}</p>
                        </div>
                        <Badge className={cn("text-xs ml-2", 
                          ad.status === 'ACTIVE' ? "bg-green-500/20 text-green-400 border-green-500/30" : 
                          "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        )}>
                          {ad.status}
                        </Badge>
                      </div>
                      
                      {/* Metrics Row */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-400">Spent:</span>
                          <span className="text-white ml-1 font-medium">${ad.spent.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">CTR:</span>
                          <span className="text-white ml-1 font-medium">{ad.ctr.toFixed(2)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Impressions:</span>
                          <span className="text-white ml-1 font-medium">{ad.impressions.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">ROAS:</span>
                          <span className={cn("ml-1 font-medium", 
                            roas >= 2 ? "text-green-400" : roas >= 1 ? "text-yellow-400" : "text-red-400"
                          )}>
                            {roas.toFixed(2)}x
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {filteredAndSortedAds.length > 5 && (
              <div className="text-center py-3">
                <p className="text-xs text-gray-400">Showing top 5 creatives</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}