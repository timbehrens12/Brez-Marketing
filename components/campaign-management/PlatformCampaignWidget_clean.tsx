"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Settings,
  Info,
  X,
  CheckCircle,
  ArrowRight,
  Loader2,
  Users,
  Target,
  Brain,
  Sparkles,
  Eye,
  RefreshCw,
  Clock,
  DollarSign
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface Campaign {
  campaign_id: string
  campaign_name: string
  status: 'ACTIVE' | 'PAUSED' | 'LEARNING'
  spent: number
  revenue: number
  roas: number
  ctr: number
  conversions: number
  reach: number
  impressions: number
  cpc: number
  platform: string
  recommendation?: any
}

interface PlatformCampaignWidgetProps {
  preloadedCampaigns?: Campaign[]
}

export default function PlatformCampaignWidget({ preloadedCampaigns }: PlatformCampaignWidgetProps) {
  const { selectedBrandId } = useBrandContext()
  const [searchQuery, setSearchQuery] = useState("")
  const [showInactive, setShowInactive] = useState(true)
  const [selectedTab, setSelectedTab] = useState("all")
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[]>(preloadedCampaigns || [])

  // Mock data for demonstration
  const mockCampaigns: Campaign[] = [
    {
      campaign_id: "camp-1",
      campaign_name: "Summer Sale 2024",
      status: "ACTIVE",
      spent: 2500,
      revenue: 7500,
      roas: 3.0,
      ctr: 2.5,
      conversions: 150,
      reach: 50000,
      impressions: 200000,
      cpc: 1.25,
      platform: "meta"
    },
    {
      campaign_id: "camp-2",
      campaign_name: "Brand Awareness Q4",
      status: "ACTIVE",
      spent: 1200,
      revenue: 3600,
      roas: 3.0,
      ctr: 1.8,
      conversions: 72,
      reach: 25000,
      impressions: 100000,
      cpc: 1.20,
      platform: "meta"
    }
  ]

  useEffect(() => {
    if (preloadedCampaigns) {
      setLocalCampaigns(preloadedCampaigns)
    } else {
      setLocalCampaigns(mockCampaigns)
    }
  }, [preloadedCampaigns])

  // Helper function for currency formatting
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Helper function for number formatting
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const getROASColor = (roas: number) => {
    if (roas >= 3) return 'text-emerald-400'
    if (roas >= 2) return 'text-amber-400'
    return 'text-red-400'
  }

  // Get all campaigns across platforms
  const getAllCampaigns = () => {
    return localCampaigns
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333]/50 shadow-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#FF2A2A]/10 to-transparent border-b border-[#333]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FF2A2A] rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-white text-lg font-bold flex items-center gap-2">
                Campaign Performance
                <Badge className="bg-[#FF2A2A]/20 text-[#FF2A2A] text-xs">
                  {getAllCampaigns().length} Active
                </Badge>
              </CardTitle>
              <p className="text-gray-400 text-sm">Maximize ROI with data-driven campaign optimization</p>
            </div>
          </div>

          {/* Quick Filters & Search */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#0f0f0f]/50 border-[#333]/50 text-white placeholder:text-gray-500 w-48 h-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-[#0f0f0f]/50 border-[#333]/50 text-gray-300 hover:bg-[#333]/50 h-9">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1a1a1a] border-[#333] z-50">
                <div className="p-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-inactive"
                      checked={showInactive}
                      onCheckedChange={setShowInactive}
                    />
                    <label htmlFor="show-inactive" className="text-sm text-white">
                      Show inactive campaigns
                    </label>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">

        {/* Profitability Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Total Revenue</span>
            </div>
            <div className="text-xl font-black text-white">
              ${(getAllCampaigns().reduce((sum, c) => sum + (c.revenue || 0), 0)).toFixed(0)}
            </div>
          </div>

          <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Avg ROAS</span>
            </div>
            <div className="text-xl font-black text-white">
              {(getAllCampaigns().reduce((sum, c) => sum + (c.roas || 0), 0) / Math.max(getAllCampaigns().length, 1)).toFixed(1)}x
            </div>
          </div>

          <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Total Reach</span>
            </div>
            <div className="text-xl font-black text-white">
              {formatNumber(getAllCampaigns().reduce((sum, c) => sum + (c.reach || 0), 0))}
            </div>
          </div>

          <div className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-400">Conversions</span>
            </div>
            <div className="text-xl font-black text-white">
              {getAllCampaigns().reduce((sum, c) => sum + (c.conversions || 0), 0)}
            </div>
          </div>
        </div>

        {/* Campaign Performance Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            Campaign Performance
          </h3>

          {getAllCampaigns().length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No campaigns found</p>
              <p className="text-sm text-gray-500">Connect your ad platforms to start optimizing</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {getAllCampaigns().slice(0, 10).map((campaign) => (
                <div
                  key={campaign.campaign_id}
                  className="bg-[#0f0f0f]/50 border border-[#333]/50 rounded-lg p-4 hover:bg-[#333]/30 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#FF2A2A]/20 rounded-lg flex items-center justify-center">
                        <Image
                          src={campaign.platform === 'tiktok' ? "https://i.imgur.com/AXHa9UT.png" : "https://i.imgur.com/6hyyRrs.png"}
                          alt={campaign.platform || 'meta'}
                          width={16}
                          height={16}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-white truncate max-w-xs">{campaign.campaign_name}</h4>
                        <p className="text-xs text-gray-400 capitalize">{campaign.status?.toLowerCase()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getROASColor(campaign.roas || 0)}`}>
                        {(campaign.roas || 0).toFixed(1)}x
                      </div>
                      <div className="text-xs text-gray-400">ROAS</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400">Spent:</span>
                      <div className="text-white font-medium">{formatCurrency(campaign.spent || 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Revenue:</span>
                      <div className="text-white font-medium">{formatCurrency(campaign.revenue || 0)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Profit:</span>
                      <div className={`font-medium ${((campaign.revenue || 0) - (campaign.spent || 0)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {((campaign.revenue || 0) - (campaign.spent || 0)) >= 0 ? '+' : ''}{formatCurrency((campaign.revenue || 0) - (campaign.spent || 0))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400">CTR:</span>
                      <div className="text-white font-medium">{(campaign.ctr || 0).toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
