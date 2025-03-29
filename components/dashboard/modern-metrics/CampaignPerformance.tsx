"use client"

import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { 
  RefreshCw, 
  SlidersHorizontal, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Users,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface CampaignPerformanceProps {
  campaigns: any[]
  isLoading: boolean
  onRefresh: () => void
  className?: string
}

export function CampaignPerformance({
  campaigns = [],
  isLoading = false,
  onRefresh,
  className
}: CampaignPerformanceProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('spend')
  
  // Sort campaigns based on selection
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    switch (sortBy) {
      case 'spend':
        return (typeof b.spend === 'number' ? b.spend : 0) - (typeof a.spend === 'number' ? a.spend : 0)
      case 'roas':
        return (typeof b.roas === 'number' ? b.roas : 0) - (typeof a.roas === 'number' ? a.roas : 0)
      case 'cpc':
        return (typeof a.cpc === 'number' ? a.cpc : Infinity) - (typeof b.cpc === 'number' ? b.cpc : Infinity)
      case 'impressions':
        return (typeof b.impressions === 'number' ? b.impressions : 0) - (typeof a.impressions === 'number' ? a.impressions : 0)
      default:
        return (typeof b.spend === 'number' ? b.spend : 0) - (typeof a.spend === 'number' ? a.spend : 0)
    }
  })
  
  // Get top metrics for visualization
  const topCampaigns = sortedCampaigns.slice(0, 5)
  
  // Prepare data for spend vs clicks chart
  const spendClicksData = topCampaigns.map(campaign => ({
    name: campaign.campaign_name?.length > 20 
      ? campaign.campaign_name.substring(0, 20) + '...' 
      : campaign.campaign_name || 'Unknown',
    spend: typeof campaign.spend === 'number' ? campaign.spend : 0,
    clicks: typeof campaign.clicks === 'number' ? campaign.clicks : 0
  }))

  // Colors for charts
  const colors = {
    blue: "#3b82f6",
    purple: "#8b5cf6",
    pink: "#ec4899",
    green: "#10b981",
    yellow: "#f59e0b"
  }
  
  return (
    <div className={cn(
      "bg-gradient-to-br from-[#0c0c0c] to-[#111] border border-[#333] rounded-lg overflow-hidden shadow-lg",
      className
    )}>
      {/* Header */}
      <div className="border-b border-[#333] p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-blue-500/20 flex items-center justify-center">
            <LineChart className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-base font-medium text-white">Campaign Performance</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 bg-[#1a1a1a] hover:bg-[#222] border-[#333] text-xs"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-2" />
            )}
            Refresh
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 bg-[#1a1a1a] hover:bg-[#222] border-[#333] text-xs">
                <SlidersHorizontal className="h-3 w-3 mr-2" />
                {sortBy === 'spend' ? 'Highest Spend' : 
                 sortBy === 'roas' ? 'Highest ROAS' :
                 sortBy === 'cpc' ? 'Lowest CPC' : 'Most Impressions'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#111] border-[#333]">
              <DropdownMenuItem 
                className="text-xs hover:bg-[#222]" 
                onClick={() => setSortBy('spend')}
              >
                Highest Spend
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-xs hover:bg-[#222]"
                onClick={() => setSortBy('roas')}
              >
                Highest ROAS
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-xs hover:bg-[#222]"
                onClick={() => setSortBy('cpc')}
              >
                Lowest CPC
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-xs hover:bg-[#222]"
                onClick={() => setSortBy('impressions')}
              >
                Most Impressions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5">
        {isLoading && campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-sm text-gray-400">Loading campaign data...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-gray-400">No campaign data available</p>
          </div>
        ) : (
          <>
            {/* Summary metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-4 border border-[#333]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xs text-gray-400">Active Campaigns</h3>
                    <p className="text-2xl font-semibold mt-1 text-white">
                      {campaigns.filter(c => c.status === 'ACTIVE').length}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <LineChart className="h-5 w-5 text-blue-400" />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {campaigns.filter(c => c.status !== 'ACTIVE').length} paused
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-4 border border-[#333]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xs text-gray-400">Total Spend</h3>
                    <p className="text-2xl font-semibold mt-1 text-white">
                      ${campaigns.reduce((sum, c) => sum + (typeof c.spend === 'number' ? c.spend : 0), 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Across all campaigns
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-4 border border-[#333]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xs text-gray-400">Avg. ROAS</h3>
                    <p className="text-2xl font-semibold mt-1 text-white">
                      {(() => {
                        const validCampaigns = campaigns.filter(c => typeof c.roas === 'number' && c.spend > 0)
                        if (validCampaigns.length === 0) return '0.00'
                        const totalSpend = validCampaigns.reduce((sum, c) => sum + c.spend, 0)
                        const weightedRoas = validCampaigns.reduce((sum, c) => sum + (c.roas * c.spend), 0)
                        return (weightedRoas / totalSpend).toFixed(2)
                      })()}x
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Weighted average
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#222] rounded-lg p-4 border border-[#333]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xs text-gray-400">Avg. CTR</h3>
                    <p className="text-2xl font-semibold mt-1 text-white">
                      {(() => {
                        const validCampaigns = campaigns.filter(c => 
                          typeof c.ctr === 'number' && 
                          typeof c.impressions === 'number' && 
                          c.impressions > 0
                        )
                        if (validCampaigns.length === 0) return '0.00'
                        const totalImpressions = validCampaigns.reduce((sum, c) => sum + c.impressions, 0)
                        const weightedCtr = validCampaigns.reduce((sum, c) => sum + (c.ctr * c.impressions), 0)
                        return (weightedCtr / totalImpressions).toFixed(2)
                      })()}%
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <MousePointerClick className="h-5 w-5 text-amber-400" />
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Weighted average
                </div>
              </div>
            </div>
            
            {/* Visualization */}
            <div className="mb-6 bg-[#0a0a0a] border border-[#333] rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Top Campaigns: Spend vs Clicks</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={spendClicksData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#888" 
                      fontSize={12} 
                      tick={{ fill: '#888' }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      stroke="#888" 
                      fontSize={12}
                      tick={{ fill: '#888' }} 
                      tickFormatter={(value) => `$${value}`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#888" 
                      fontSize={12}
                      tick={{ fill: '#888' }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#111', 
                        border: '1px solid #444',
                        borderRadius: '4px',
                        color: '#fff'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#888' }} />
                    <Bar 
                      yAxisId="left" 
                      dataKey="spend" 
                      name="Spend ($)" 
                      fill={colors.blue} 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="clicks" 
                      name="Clicks" 
                      fill={colors.purple} 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Campaign List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-300 mb-3">All Campaigns</h3>
              {sortedCampaigns.map((campaign, index) => (
                <Collapsible 
                  key={campaign.campaign_id || index} 
                  open={selectedCampaign === campaign.campaign_id}
                  onOpenChange={(open) => {
                    if (open) {
                      setSelectedCampaign(campaign.campaign_id)
                    } else if (selectedCampaign === campaign.campaign_id) {
                      setSelectedCampaign(null)
                    }
                  }}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                        <div className="text-left">
                          <h4 className="font-medium text-sm text-white truncate max-w-[200px]">
                            {campaign.campaign_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400 truncate max-w-[150px]">
                              ID: {campaign.campaign_id}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="flex flex-col items-end mr-4">
                          <span className="text-sm font-medium text-white">
                            ${typeof campaign.spend === 'number' ? campaign.spend.toFixed(2) : '0.00'}
                          </span>
                          <span className="text-xs text-gray-400">Spend</span>
                        </div>
                        
                        <div className="flex flex-col items-end mr-4">
                          <span className={`text-sm font-medium ${campaign.roas >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                            {typeof campaign.roas === 'number' ? campaign.roas.toFixed(2) : '0.00'}x
                          </span>
                          <span className="text-xs text-gray-400">ROAS</span>
                        </div>
                        
                        {selectedCampaign === campaign.campaign_id ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="p-4 bg-[#111] border border-t-0 border-[#333] rounded-b-lg">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-[#1a1a1a] p-3 rounded-md border border-[#222]">
                          <div className="text-xs text-gray-400 mb-1">Impressions</div>
                          <div className="text-base font-medium text-white">
                            {typeof campaign.impressions === 'number' 
                              ? campaign.impressions.toLocaleString()
                              : '0'}
                          </div>
                        </div>
                        
                        <div className="bg-[#1a1a1a] p-3 rounded-md border border-[#222]">
                          <div className="text-xs text-gray-400 mb-1">Clicks</div>
                          <div className="text-base font-medium text-white">
                            {typeof campaign.clicks === 'number' 
                              ? campaign.clicks.toLocaleString() 
                              : '0'}
                          </div>
                        </div>
                        
                        <div className="bg-[#1a1a1a] p-3 rounded-md border border-[#222]">
                          <div className="text-xs text-gray-400 mb-1">CTR</div>
                          <div className="text-base font-medium text-white">
                            {typeof campaign.ctr === 'number' 
                              ? `${campaign.ctr.toFixed(2)}%` 
                              : '0.00%'}
                          </div>
                        </div>
                        
                        <div className="bg-[#1a1a1a] p-3 rounded-md border border-[#222]">
                          <div className="text-xs text-gray-400 mb-1">CPC</div>
                          <div className="text-base font-medium text-white">
                            ${typeof campaign.cpc === 'number' 
                              ? campaign.cpc.toFixed(2) 
                              : '0.00'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
} 