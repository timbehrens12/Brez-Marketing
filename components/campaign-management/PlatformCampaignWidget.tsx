"use client"

import { useState, useEffect, useMemo } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Search,
  Settings,
  Info,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import CampaignRecommendationModal from "./CampaignRecommendationModal"

interface Campaign {
  campaign_id: string
  campaign_name: string
  status: string
  objective: string
  budget: number
  budget_type: string
  spent: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  cpc: number
  roas: number
  account_name?: string
  last_recommendation_refresh?: string
  recommendation?: {
    action: string
    reasoning: string
    impact: string
    confidence: number
    implementation: string
    forecast: string
    specific_actions?: {
      adsets_to_scale?: string[]
      adsets_to_optimize?: string[]
      adsets_to_pause?: string[]
      ads_to_pause?: string[]
      ads_to_duplicate?: string[]
    }
  }
}

interface PlatformData {
  name: string
  logo: string
  isActive: boolean
  campaigns: Campaign[]
  isLoading: boolean
  error?: string
}

export default function PlatformCampaignWidget() {
  const { selectedBrandId } = useBrandContext()
  const [platforms, setPlatforms] = useState<Record<string, PlatformData>>({
    meta: {
      name: "Meta",
      logo: "https://i.imgur.com/6hyyRrs.png",
      isActive: true,
      campaigns: [],
      isLoading: true
    },
    tiktok: {
      name: "TikTok",
      logo: "https://i.imgur.com/AXHa9UT.png",
      isActive: false,
      campaigns: [],
      isLoading: false
    },
    google: {
      name: "Google Ads",
      logo: "https://i.imgur.com/TavV4UJ.png",
      isActive: false,
      campaigns: [],
      isLoading: false
    }
  })
  
  const [expandedPlatforms, setExpandedPlatforms] = useState<Set<string>>(new Set(['meta']))
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showRecommendationModal, setShowRecommendationModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showInactive, setShowInactive] = useState(true)
  const [sortBy, setSortBy] = useState('spent')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Check if a campaign can get a new recommendation (weekly limit)
  const canRefreshRecommendation = (campaign: Campaign) => {
    if (!campaign.last_recommendation_refresh) return true
    
    const lastRefresh = new Date(campaign.last_recommendation_refresh)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    return lastRefresh < weekAgo
  }

  // Get days until next recommendation refresh
  const getDaysUntilNextRefresh = (campaign: Campaign) => {
    if (!campaign.last_recommendation_refresh) return 0
    
    const lastRefresh = new Date(campaign.last_recommendation_refresh)
    const nextRefresh = new Date(lastRefresh)
    nextRefresh.setDate(nextRefresh.getDate() + 7)
    
    const now = new Date()
    const diffTime = nextRefresh.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }

  // Fetch Meta campaigns - now includes ALL campaigns, not just active ones
  const fetchMetaCampaigns = async () => {
    if (!selectedBrandId) return

    try {
      setPlatforms(prev => ({
        ...prev,
        meta: { ...prev.meta, isLoading: true, error: undefined }
      }))

      // Remove the status=ACTIVE filter to get all campaigns
      const response = await fetch(`/api/meta/campaigns?brandId=${selectedBrandId}&limit=100&sortBy=spent&sortOrder=desc`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns')
      }

      const data = await response.json()
      
      // Fetch AI recommendations for each campaign with refresh limit check
      const campaignsWithRecommendations = await Promise.all(
        data.campaigns.map(async (campaign: Campaign) => {
          try {
            // Only fetch new recommendations if the weekly limit allows
            if (canRefreshRecommendation(campaign)) {
              const recResponse = await fetch('/api/ai/campaign-recommendations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  brandId: selectedBrandId,
                  campaignId: campaign.campaign_id,
                  campaignData: campaign
                })
              })
              
              if (recResponse.ok) {
                const recData = await recResponse.json()
                return { 
                  ...campaign, 
                  recommendation: recData.recommendation,
                  last_recommendation_refresh: new Date().toISOString()
                }
              }
            }
          } catch (error) {
            console.error('Error fetching recommendation for campaign:', campaign.campaign_id, error)
          }
          
          return campaign
        })
      )

      setPlatforms(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          campaigns: campaignsWithRecommendations,
          isLoading: false
        }
      }))

    } catch (error) {
      console.error('Error fetching Meta campaigns:', error)
      setPlatforms(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          isLoading: false,
          error: 'Failed to load campaigns'
        }
      }))
      toast.error('Failed to load Meta campaigns')
    }
  }

  // Initial data fetch
  useEffect(() => {
    if (selectedBrandId) {
      fetchMetaCampaigns()
    }
  }, [selectedBrandId])

  const togglePlatform = (platformKey: string) => {
    setExpandedPlatforms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(platformKey)) {
        newSet.delete(platformKey)
      } else {
        newSet.add(platformKey)
      }
      return newSet
    })
  }

  const handleRecommendationClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setShowRecommendationModal(true)
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'ACTIVE': 'bg-green-950/30 text-green-400 border-green-800/50',
      'PAUSED': 'bg-slate-800/50 text-slate-400 border-slate-700/50',
      'DELETED': 'bg-red-950/30 text-red-400 border-red-800/50',
      'DRAFT': 'bg-gray-950/30 text-gray-400 border-gray-800/50',
      'ARCHIVED': 'bg-red-950/30 text-red-400 border-red-800/50'
    }
    
    const statusLabels = {
      'ACTIVE': 'Active',
      'PAUSED': 'Inactive',
      'DELETED': 'Deleted',
      'DRAFT': 'Draft',
      'ARCHIVED': 'Archived'
    }
    
    return (
      <Badge 
        variant="outline" 
        className={`${statusColors[status as keyof typeof statusColors] || 'bg-gray-950/30 text-gray-400 border-gray-800/50'}`}
      >
        {statusLabels[status as keyof typeof statusLabels] || status}
      </Badge>
    )
  }

  const getRecommendationBadge = (campaign: Campaign) => {
    const { recommendation } = campaign
    
    if (!recommendation) {
      return (
        <Badge variant="outline" className="bg-gray-950/30 text-gray-400 border-gray-800/50">
          <Minus className="w-3 h-3 mr-1" />
          No Data
        </Badge>
      )
    }

    const canRefresh = canRefreshRecommendation(campaign)
    const daysUntilRefresh = getDaysUntilNextRefresh(campaign)

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge 
              variant="outline" 
              className="bg-gray-950/30 text-gray-300 border-gray-800/50 cursor-pointer hover:bg-gray-800/50 transition-colors"
              onClick={() => handleRecommendationClick(campaign)}
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              {recommendation.action}
              {!canRefresh && (
                <Clock className="w-3 h-3 ml-1 opacity-50" />
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">AI Recommendation Available</p>
              <p className="text-sm text-gray-400">
                {canRefresh 
                  ? "Click to view detailed analysis and recommendations"
                  : `Next refresh in ${daysUntilRefresh} day${daysUntilRefresh !== 1 ? 's' : ''}`
                }
              </p>
              <p className="text-xs text-gray-500">
                Recommendations refresh weekly
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`
  }

  // Filter and sort campaigns
  const getFilteredAndSortedCampaigns = (campaigns: Campaign[]) => {
    let filtered = [...campaigns]
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(campaign => 
        campaign.campaign_name.toLowerCase().includes(query) ||
        campaign.campaign_id.toLowerCase().includes(query) ||
        (campaign.account_name && campaign.account_name.toLowerCase().includes(query))
      )
    }
    
    // Filter by status
    if (!showInactive) {
      filtered = filtered.filter(campaign => campaign.status === 'ACTIVE')
    }
    
    // Sort campaigns
    return filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof Campaign] as number || 0
      const bValue = b[sortBy as keyof Campaign] as number || 0
      
      if (sortOrder === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }

  return (
    <div className="space-y-6">
      {Object.entries(platforms).map(([platformKey, platform]) => (
        <Card key={platformKey} className="bg-gray-900/50 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePlatform(platformKey)}
                  className="p-0 h-auto hover:bg-transparent text-gray-400 hover:text-white"
                >
                  {expandedPlatforms.has(platformKey) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
                
                <Image
                  src={platform.logo}
                  alt={platform.name}
                  width={24}
                  height={24}
                  className={`object-contain ${!platform.isActive ? 'grayscale opacity-40' : ''}`}
                />
                
                <CardTitle className="text-lg text-white">
                  {platform.name}
                </CardTitle>
                
                <Badge 
                  variant="outline" 
                  className={`${
                    platform.isActive 
                      ? 'bg-green-950/30 text-green-400 border-green-800/50' 
                      : 'bg-gray-950/30 text-gray-400 border-gray-800/50'
                  }`}
                >
                  {platform.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              {platform.isActive && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchMetaCampaigns()}
                    disabled={platform.isLoading}
                    className="text-gray-400 hover:text-white"
                  >
                    <RefreshCw className={`w-4 h-4 ${platform.isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          
          {expandedPlatforms.has(platformKey) && (
            <CardContent className="pt-0">
              {!platform.isActive ? (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>This platform is not connected yet</p>
                  <p className="text-sm mt-2">Connect your {platform.name} account to view campaigns</p>
                </div>
              ) : platform.isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-1/4 bg-gray-800" />
                      <Skeleton className="h-4 w-1/6 bg-gray-800" />
                      <Skeleton className="h-4 w-1/6 bg-gray-800" />
                      <Skeleton className="h-4 w-1/6 bg-gray-800" />
                      <Skeleton className="h-4 w-1/6 bg-gray-800" />
                    </div>
                  ))}
                </div>
              ) : platform.error ? (
                <div className="text-center py-8 text-red-400">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                  <p>{platform.error}</p>
                </div>
              ) : (
                <>
                  {/* Search and Filter Controls */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search campaigns..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                      />
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-transparent border-gray-700 text-white hover:bg-gray-800/50">
                          <Settings className="h-4 w-4 mr-2" />
                          Options
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <div className="flex items-center justify-between w-full">
                            <span className="text-white">Show Inactive Campaigns</span>
                            <Switch 
                              checked={showInactive} 
                              onCheckedChange={setShowInactive}
                              className="ml-2"
                            />
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {(() => {
                    const filteredCampaigns = getFilteredAndSortedCampaigns(platform.campaigns)
                    
                    if (filteredCampaigns.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-400">
                          <p>No campaigns found</p>
                          <p className="text-sm mt-2">
                            {searchQuery ? 'Try adjusting your search query' : 
                             !showInactive ? 'Try enabling inactive campaigns' : 
                             'No campaigns available'}
                          </p>
                        </div>
                      )
                    }
                    
                    return (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-800 hover:bg-gray-800/50">
                              <TableHead className="text-gray-400">Campaign</TableHead>
                              <TableHead className="text-gray-400">Status</TableHead>
                              <TableHead className="text-gray-400">Objective</TableHead>
                              <TableHead className="text-gray-400">Budget</TableHead>
                              <TableHead className="text-gray-400">Spent</TableHead>
                              <TableHead className="text-gray-400">Impressions</TableHead>
                              <TableHead className="text-gray-400">Clicks</TableHead>
                              <TableHead className="text-gray-400">CTR</TableHead>
                              <TableHead className="text-gray-400">CPC</TableHead>
                              <TableHead className="text-gray-400">Conversions</TableHead>
                              <TableHead className="text-gray-400">ROAS</TableHead>
                              <TableHead className="text-gray-400">
                                <div className="flex items-center gap-1">
                                  Recommendation
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="w-3 h-3 text-gray-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>AI recommendations refresh weekly</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredCampaigns.map((campaign) => (
                              <TableRow 
                                key={campaign.campaign_id}
                                className="border-gray-800 hover:bg-gray-800/30"
                              >
                                <TableCell className="font-medium text-white max-w-[200px] truncate">
                                  <div className="flex flex-col">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <span className="truncate">{campaign.campaign_name}</span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-[300px] break-words">{campaign.campaign_name}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    {campaign.account_name && (
                                      <span className="text-xs text-gray-400 truncate">
                                        {campaign.account_name}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                                <TableCell className="text-gray-300">{campaign.objective}</TableCell>
                                <TableCell className="text-gray-300">
                                  {formatCurrency(campaign.budget)}
                                  <span className="text-xs text-gray-500 ml-1">
                                    /{campaign.budget_type}
                                  </span>
                                </TableCell>
                                <TableCell className="text-gray-300">{formatCurrency(campaign.spent)}</TableCell>
                                <TableCell className="text-gray-300">{formatNumber(campaign.impressions)}</TableCell>
                                <TableCell className="text-gray-300">{formatNumber(campaign.clicks)}</TableCell>
                                <TableCell className="text-gray-300">{formatPercentage(campaign.ctr)}</TableCell>
                                <TableCell className="text-gray-300">{formatCurrency(campaign.cpc)}</TableCell>
                                <TableCell className="text-gray-300">{formatNumber(campaign.conversions)}</TableCell>
                                <TableCell className="text-gray-300">{campaign.roas.toFixed(2)}x</TableCell>
                                <TableCell>{getRecommendationBadge(campaign)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  })()}
                </>
              )}
            </CardContent>
          )}
        </Card>
      ))}
      
      {/* Recommendation Modal */}
      <CampaignRecommendationModal 
        isOpen={showRecommendationModal}
        onClose={() => setShowRecommendationModal(false)}
        campaign={selectedCampaign}
      />
    </div>
  )
} 