"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter, 
  Image, 
  Play, 
  Eye, 
  MousePointer, 
  DollarSign, 
  Target,
  ShoppingBag,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink
} from "lucide-react"
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/utils/formatters"

interface Creative {
  id: string
  ad_id: string
  ad_name: string
  campaign_id: string
  campaign_name: string
  headline: string
  body: string
  cta_type: string
  image_url: string
  spent: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  roas: number
  conversions: number
  performance_rank: number
}

interface CreativeAnalysisProps {
  creatives: Creative[]
  brandId: string
}

export function CreativeAnalysis({ creatives, brandId }: CreativeAnalysisProps) {
  const [sortBy, setSortBy] = useState<'roas' | 'ctr' | 'spent' | 'conversions'>('roas')
  const [filterBy, setFilterBy] = useState<'all' | 'top' | 'bottom'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState<'all' | 'images' | 'video'>('all')

  // Process and sort creatives
  const processedCreatives = useMemo(() => {
    let filtered = [...creatives]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        creative => 
          creative.ad_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          creative.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          creative.headline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          creative.body?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply tab filter
    if (selectedTab === 'images') {
      filtered = filtered.filter(creative => creative.image_url && !creative.image_url.includes('video'))
    } else if (selectedTab === 'video') {
      filtered = filtered.filter(creative => creative.image_url && creative.image_url.includes('video'))
    }

    // Sort by selected metric
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'roas':
          return b.roas - a.roas
        case 'ctr':
          return b.ctr - a.ctr
        case 'spent':
          return b.spent - a.spent
        case 'conversions':
          return b.conversions - a.conversions
        default:
          return 0
      }
    })

    // Apply performance filter
    if (filterBy === 'top') {
      filtered = filtered.slice(0, Math.ceil(filtered.length * 0.3)) // Top 30%
    } else if (filterBy === 'bottom') {
      filtered = filtered.slice(-Math.ceil(filtered.length * 0.3)) // Bottom 30%
    }

    return filtered
  }, [creatives, sortBy, filterBy, searchTerm, selectedTab])

  // Get performance stats
  const getPerformanceLevel = (creative: Creative) => {
    const topThird = Math.ceil(creatives.length / 3)
    const middleThird = Math.ceil((creatives.length * 2) / 3)
    
    if (creative.performance_rank <= topThird) {
      return { level: 'top', color: 'text-green-400', icon: Award }
    } else if (creative.performance_rank <= middleThird) {
      return { level: 'middle', color: 'text-yellow-400', icon: Clock }
    } else {
      return { level: 'bottom', color: 'text-red-400', icon: AlertTriangle }
    }
  }

  const getTotalStats = () => {
    const total = creatives.reduce((acc, creative) => ({
      spent: acc.spent + creative.spent,
      impressions: acc.impressions + creative.impressions,
      clicks: acc.clicks + creative.clicks,
      conversions: acc.conversions + creative.conversions
    }), { spent: 0, impressions: 0, clicks: 0, conversions: 0 })

    return {
      ...total,
      avgCTR: total.impressions > 0 ? total.clicks / total.impressions : 0,
      avgCPC: total.clicks > 0 ? total.spent / total.clicks : 0,
      avgROAS: total.spent > 0 ? (total.conversions * 50) / total.spent : 0 // Assuming $50 avg conversion value
    }
  }

  const stats = getTotalStats()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Creative Performance</h2>
          <p className="text-gray-400 text-sm">All active creatives ranked by performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-gray-400 border-gray-600">
            {creatives.length} Creatives
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Spend</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(stats.spent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Target className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Avg CTR</p>
                <p className="text-lg font-semibold text-white">{formatPercentage(stats.avgCTR)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <MousePointer className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Avg CPC</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(stats.avgCPC)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Avg ROAS</p>
                <p className="text-lg font-semibold text-white">{stats.avgROAS.toFixed(2)}x</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search creatives..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 bg-[#222] border-[#333] text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40 bg-[#222] border-[#333] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#333]">
                  <SelectItem value="roas">Sort by ROAS</SelectItem>
                  <SelectItem value="ctr">Sort by CTR</SelectItem>
                  <SelectItem value="spent">Sort by Spend</SelectItem>
                  <SelectItem value="conversions">Sort by Conversions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                <SelectTrigger className="w-40 bg-[#222] border-[#333] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#333]">
                  <SelectItem value="all">All Creatives</SelectItem>
                  <SelectItem value="top">Top Performers</SelectItem>
                  <SelectItem value="bottom">Bottom Performers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Creative Type Tabs */}
      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
        <TabsList className="bg-[#1A1A1A] border-[#333]">
          <TabsTrigger value="all" className="text-gray-400 data-[state=active]:text-white">
            All ({creatives.length})
          </TabsTrigger>
          <TabsTrigger value="images" className="text-gray-400 data-[state=active]:text-white">
            <Image className="w-4 h-4 mr-2" />
            Images ({creatives.filter(c => c.image_url && !c.image_url.includes('video')).length})
          </TabsTrigger>
          <TabsTrigger value="video" className="text-gray-400 data-[state=active]:text-white">
            <Play className="w-4 h-4 mr-2" />
            Video ({creatives.filter(c => c.image_url && c.image_url.includes('video')).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {/* Creative Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedCreatives.map((creative) => {
              const performance = getPerformanceLevel(creative)
              const PerformanceIcon = performance.icon
              
              return (
                <Card key={creative.ad_id} className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
                  <CardContent className="p-4">
                    {/* Creative Preview */}
                    <div className="aspect-square bg-[#222] rounded-lg mb-4 overflow-hidden relative">
                      {creative.image_url ? (
                        <img 
                          src={creative.image_url} 
                          alt={creative.ad_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-12 h-12 text-gray-500" />
                        </div>
                      )}
                      
                      {/* Performance Badge */}
                      <div className="absolute top-2 right-2">
                        <Badge variant="outline" className={`${performance.color} border-current`}>
                          <PerformanceIcon className="w-3 h-3 mr-1" />
                          #{creative.performance_rank}
                        </Badge>
                      </div>
                      
                      {/* View External Link */}
                      {creative.image_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70"
                          onClick={() => window.open(creative.image_url, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {/* Creative Info */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-medium text-white truncate">{creative.ad_name}</h3>
                        <p className="text-xs text-gray-400 truncate">{creative.campaign_name}</p>
                      </div>

                      {/* Creative Content */}
                      {creative.headline && (
                        <div>
                          <p className="text-xs text-gray-400">Headline</p>
                          <p className="text-sm text-white line-clamp-2">{creative.headline}</p>
                        </div>
                      )}
                      
                      {creative.body && (
                        <div>
                          <p className="text-xs text-gray-400">Body</p>
                          <p className="text-sm text-white line-clamp-2">{creative.body}</p>
                        </div>
                      )}

                      {creative.cta_type && (
                        <div>
                          <p className="text-xs text-gray-400">CTA</p>
                          <Badge variant="outline" className="text-xs">
                            {creative.cta_type}
                          </Badge>
                        </div>
                      )}

                      {/* Performance Metrics */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#333]">
                        <div>
                          <p className="text-xs text-gray-400">Spent</p>
                          <p className="text-sm font-semibold text-white">{formatCurrency(creative.spent)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">ROAS</p>
                          <p className={`text-sm font-semibold ${creative.roas >= 3 ? 'text-green-400' : creative.roas >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {creative.roas.toFixed(2)}x
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">CTR</p>
                          <p className="text-sm font-semibold text-white">{formatPercentage(creative.ctr)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Conversions</p>
                          <p className="text-sm font-semibold text-white">{formatNumber(creative.conversions)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {processedCreatives.length === 0 && (
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardContent className="p-8 text-center">
                <Image className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No creatives found</h3>
                <p className="text-gray-400">Try adjusting your filters or search terms</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 