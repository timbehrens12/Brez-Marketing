"use client"

import { useState, useEffect } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus 
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
  recommendation?: {
    action: string
    reasoning: string
    impact: string
    confidence: number
    implementation: string
    forecast: string
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

  // Fetch Meta campaigns
  const fetchMetaCampaigns = async () => {
    if (!selectedBrandId) return

    try {
      setPlatforms(prev => ({
        ...prev,
        meta: { ...prev.meta, isLoading: true, error: undefined }
      }))

      const response = await fetch(`/api/meta/campaigns?brandId=${selectedBrandId}&status=ACTIVE&limit=50&sortBy=spent&sortOrder=desc`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns')
      }

      const data = await response.json()
      
      // Fetch AI recommendations for each campaign
      const campaignsWithRecommendations = await Promise.all(
        data.campaigns.map(async (campaign: Campaign) => {
          try {
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
              return { ...campaign, recommendation: recData.recommendation }
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
      'ACTIVE': 'bg-green-500/20 text-green-400 border-green-500/30',
      'PAUSED': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'DELETED': 'bg-red-500/20 text-red-400 border-red-500/30',
      'DRAFT': 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
    
    return (
      <Badge 
        variant="outline" 
        className={`${statusColors[status as keyof typeof statusColors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
      >
        {status}
      </Badge>
    )
  }

  const getRecommendationBadge = (campaign: Campaign) => {
    const { recommendation } = campaign
    
    if (!recommendation) {
      return (
        <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
          <Minus className="w-3 h-3 mr-1" />
          No Data
        </Badge>
      )
    }

    const actionColors = {
      'increase budget': 'bg-green-500/20 text-green-400 border-green-500/30',
      'reduce budget': 'bg-red-500/20 text-red-400 border-red-500/30',
      'increase cpc': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'reduce cpc': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'leave as is': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'pause campaign': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'optimize targeting': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
    }

    const actionLower = recommendation.action.toLowerCase()
    const colorClass = actionColors[actionLower as keyof typeof actionColors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'

    return (
      <Badge 
        variant="outline" 
        className={`${colorClass} cursor-pointer hover:opacity-80 transition-opacity`}
        onClick={() => handleRecommendationClick(campaign)}
      >
        {recommendation.action.includes('increase') && <TrendingUp className="w-3 h-3 mr-1" />}
        {recommendation.action.includes('reduce') && <TrendingDown className="w-3 h-3 mr-1" />}
        {recommendation.action.includes('leave') && <Minus className="w-3 h-3 mr-1" />}
        {recommendation.action}
      </Badge>
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

  return (
    <div className="space-y-6">
      {Object.entries(platforms).map(([platformKey, platform]) => (
        <Card key={platformKey} className="bg-[#111] border-[#333]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePlatform(platformKey)}
                  className="p-0 h-auto hover:bg-transparent"
                >
                  {expandedPlatforms.has(platformKey) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  }`}
                >
                  {platform.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              {platform.isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchMetaCampaigns()}
                  disabled={platform.isLoading}
                  className="text-gray-400 hover:text-white"
                >
                  <RefreshCw className={`w-4 h-4 ${platform.isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </CardHeader>
          
          {expandedPlatforms.has(platformKey) && (
            <CardContent className="pt-0">
              {!platform.isActive ? (
                <div className="text-center py-8 text-gray-500">
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
              ) : platform.campaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No active campaigns found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#333] hover:bg-[#1a1a1a]">
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
                        <TableHead className="text-gray-400">Recommendation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {platform.campaigns.map((campaign) => (
                        <TableRow 
                          key={campaign.campaign_id}
                          className="border-[#333] hover:bg-[#1a1a1a]"
                        >
                          <TableCell className="font-medium text-white max-w-[200px] truncate">
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