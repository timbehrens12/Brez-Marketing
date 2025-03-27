'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart2, TrendingUp, AlertCircle, CheckCircle, Clock, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

interface Campaign {
  id: string;
  campaign_name: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  start_date: string;
  end_date: string | null;
}

export default function MetaCampaignsTable({ brandId }: { brandId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Campaign;
    direction: 'ascending' | 'descending';
  } | null>(null)
  const [metrics, setMetrics] = useState({
    ctrChange: 0,
    roasChange: 0,
    currentCTR: 0,
    previousCTR: 0,
    currentRoas: 0,
    previousRoas: 0,
    totalSpend: 0,
    totalClicks: 0
  })

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        setLoading(true)
        const response = await fetch(`/api/analytics/meta/campaigns?brandId=${brandId}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch campaigns: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        // If we have real data, use it
        if (data.campaigns && data.campaigns.length > 0) {
          setCampaigns(data.campaigns)
          
          // Calculate aggregated metrics
          if (data.campaigns.length > 0) {
            const totalClicks = data.campaigns.reduce((sum: number, campaign: Campaign) => sum + campaign.clicks, 0);
            const totalImpressions = data.campaigns.reduce((sum: number, campaign: Campaign) => sum + campaign.impressions, 0);
            const totalSpend = data.campaigns.reduce((sum: number, campaign: Campaign) => sum + campaign.spend, 0);
            const totalRevenue = data.campaigns.reduce((sum: number, campaign: Campaign) => sum + (campaign.roas * campaign.spend), 0);
            
            const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
            const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
            
            // Check if we have comparison data
            if (data.periodComparison && data.periodComparison.current && data.periodComparison.previous) {
              const { current, previous } = data.periodComparison;
              
              const ctrChange = previous.ctr > 0 
                ? ((avgCTR - previous.ctr) / previous.ctr) * 100 
                : 0;
                
              const roasChange = previous.roas > 0 
                ? ((avgRoas - previous.roas) / previous.roas) * 100 
                : 0;
                
              setMetrics({
                ctrChange,
                roasChange,
                currentCTR: avgCTR,
                previousCTR: previous.ctr,
                currentRoas: avgRoas,
                previousRoas: previous.roas,
                totalSpend,
                totalClicks
              });
            } else {
              // If no comparison data, at least set the current metrics
              setMetrics(prev => ({
                ...prev,
                currentCTR: avgCTR,
                currentRoas: avgRoas,
                totalSpend,
                totalClicks
              }));
            }
          }
          
        } else {
          // Otherwise use mock data
          setCampaigns([
            {
              id: '1',
              campaign_name: 'Summer Sale 2023',
              status: 'ACTIVE',
              spend: 1250.75,
              impressions: 85000,
              clicks: 3200,
              ctr: 3.76,
              conversions: 128,
              cpa: 9.77,
              roas: 4.2,
              start_date: '2023-06-01',
              end_date: '2023-08-31'
            },
            {
              id: '2',
              campaign_name: 'New Product Launch',
              status: 'ACTIVE',
              spend: 2450.50,
              impressions: 120000,
              clicks: 5800,
              ctr: 4.83,
              conversions: 210,
              cpa: 11.67,
              roas: 3.8,
              start_date: '2023-09-15',
              end_date: null
            },
            {
              id: '3',
              campaign_name: 'Holiday Special',
              status: 'PAUSED',
              spend: 850.25,
              impressions: 45000,
              clicks: 1800,
              ctr: 4.00,
              conversions: 72,
              cpa: 11.81,
              roas: 3.5,
              start_date: '2023-11-01',
              end_date: '2023-12-31'
            },
            {
              id: '4',
              campaign_name: 'Retargeting Campaign',
              status: 'ACTIVE',
              spend: 750.00,
              impressions: 32000,
              clicks: 1600,
              ctr: 5.00,
              conversions: 96,
              cpa: 7.81,
              roas: 5.2,
              start_date: '2023-10-01',
              end_date: null
            },
            {
              id: '5',
              campaign_name: 'Brand Awareness',
              status: 'COMPLETED',
              spend: 1800.00,
              impressions: 150000,
              clicks: 4500,
              ctr: 3.00,
              conversions: 90,
              cpa: 20.00,
              roas: 2.1,
              start_date: '2023-05-01',
              end_date: '2023-07-31'
            }
          ])
        }
      } catch (err) {
        console.error('Error fetching Meta campaigns:', err)
        setError('Failed to load Meta campaigns data')
      } finally {
        setLoading(false)
      }
    }

    if (brandId) {
      fetchCampaigns()
    }
  }, [brandId])

  // Sort function
  const sortedCampaigns = useMemo(() => {
    let sortableCampaigns = [...campaigns]
    
    if (sortConfig !== null) {
      sortableCampaigns.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    
    return sortableCampaigns
  }, [campaigns, sortConfig])

  // Filter function
  const filteredCampaigns = useMemo(() => {
    return sortedCampaigns.filter(campaign => {
      const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || campaign.status.toLowerCase() === statusFilter.toLowerCase()
      return matchesSearch && matchesStatus
    })
  }, [sortedCampaigns, searchTerm, statusFilter])

  // Request sort function
  const requestSort = (key: keyof Campaign) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  // Status badge component
  const StatusBadge = ({ status }: { status: Campaign['status'] }) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-600">Active</Badge>
      case 'PAUSED':
        return <Badge className="bg-yellow-600">Paused</Badge>
      case 'COMPLETED':
        return <Badge className="bg-blue-600">Completed</Badge>
      case 'ARCHIVED':
        return <Badge className="bg-gray-600">Archived</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Card className="bg-[#111] border-[#333] shadow-lg">
        <CardContent className="pt-6 flex items-center justify-center h-[500px]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-6 w-32 bg-[#222] rounded mb-4"></div>
            <div className="h-80 w-full bg-[#222] rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-[#111] border-[#333] shadow-lg">
        <CardContent className="pt-6 text-red-500 flex items-center justify-center h-[500px]">
          <div className="flex flex-col items-center">
            <AlertCircle className="h-12 w-12 mb-4" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#111] border-[#333] shadow-lg w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-400" />
            Meta Campaigns
          </CardTitle>
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs cursor-help bg-[#222] px-2 py-1 rounded">
                    {filteredCampaigns.length} Campaigns
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-[#333] border-[#444]">
                  <p className="text-xs">
                    Total spend: ${Math.round(metrics.totalSpend)} | Total clicks: {metrics.totalClicks}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {metrics.ctrChange !== 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`text-xs cursor-help ${metrics.ctrChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      CTR: {metrics.ctrChange > 0 ? '↑' : '↓'} {Math.abs(metrics.ctrChange).toFixed(1)}%
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#333] border-[#444]">
                    <p className="text-xs">
                      Current: {metrics.currentCTR.toFixed(2)}% vs Previous: {metrics.previousCTR.toFixed(2)}%
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {metrics.roasChange !== 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`text-xs cursor-help ${metrics.roasChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ROAS: {metrics.roasChange > 0 ? '↑' : '↓'} {Math.abs(metrics.roasChange).toFixed(1)}%
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#333] border-[#444]">
                    <p className="text-xs">
                      Current: {metrics.currentRoas.toFixed(1)}x vs Previous: {metrics.previousRoas.toFixed(1)}x
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#222] border-[#333] text-white"
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#222] border-[#333] text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-[#222] border-[#333] text-white">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="rounded-md border border-[#333] overflow-hidden">
          <Table>
            <TableHeader className="bg-[#1a1a1a]">
              <TableRow>
                <TableHead className="text-white cursor-pointer" onClick={() => requestSort('campaign_name')}>
                  Campaign Name
                </TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white text-right cursor-pointer" onClick={() => requestSort('spend')}>
                  Spend
                </TableHead>
                <TableHead className="text-white text-right cursor-pointer" onClick={() => requestSort('impressions')}>
                  Impressions
                </TableHead>
                <TableHead className="text-white text-right cursor-pointer" onClick={() => requestSort('clicks')}>
                  Clicks
                </TableHead>
                <TableHead className="text-white text-right cursor-pointer" onClick={() => requestSort('ctr')}>
                  CTR
                </TableHead>
                <TableHead className="text-white text-right cursor-pointer" onClick={() => requestSort('conversions')}>
                  Conversions
                </TableHead>
                <TableHead className="text-white text-right cursor-pointer" onClick={() => requestSort('cpa')}>
                  CPA
                </TableHead>
                <TableHead className="text-white text-right cursor-pointer" onClick={() => requestSort('roas')}>
                  ROAS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="hover:bg-[#1a1a1a]">
                    <TableCell className="font-medium text-white">
                      <div className="flex flex-col">
                        <span>{campaign.campaign_name}</span>
                        <span className="text-xs text-gray-400">
                          Started: {new Date(campaign.start_date).toLocaleDateString()}
                          {campaign.end_date && ` • Ends: ${new Date(campaign.end_date).toLocaleDateString()}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={campaign.status} />
                    </TableCell>
                    <TableCell className="text-right">${typeof campaign.spend === 'number' ? campaign.spend.toFixed(2) : '0.00'}</TableCell>
                    <TableCell className="text-right">{typeof campaign.impressions === 'number' ? campaign.impressions.toLocaleString() : '0'}</TableCell>
                    <TableCell className="text-right">{typeof campaign.clicks === 'number' ? campaign.clicks.toLocaleString() : '0'}</TableCell>
                    <TableCell className="text-right">{typeof campaign.ctr === 'number' ? campaign.ctr.toFixed(2) : '0.00'}%</TableCell>
                    <TableCell className="text-right">{typeof campaign.conversions === 'number' ? campaign.conversions : '0'}</TableCell>
                    <TableCell className="text-right">${typeof campaign.cpa === 'number' ? campaign.cpa.toFixed(2) : '0.00'}</TableCell>
                    <TableCell className="text-right">{typeof campaign.roas === 'number' ? campaign.roas.toFixed(1) : '0.0'}x</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                    No campaigns found matching your filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 