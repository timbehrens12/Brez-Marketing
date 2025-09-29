"use client"

import { useState, useEffect } from 'react'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/DateRangePicker'
import { 
  Brain, 
  Filter, 
  Settings, 
  TrendingUp, 
  AlertTriangle, 
  Activity,
  Target,
  BarChart3,
  Clock,
  CheckCircle,
  Play,
  Pause,
  MoreHorizontal,
  Eye,
  MousePointer,
  DollarSign
} from 'lucide-react'
import PlatformCampaignWidget from '@/components/campaign-management/PlatformCampaignWidget'
import { format, subDays } from 'date-fns'
import { cn } from '@/lib/utils'

interface MarketingAssistantPageProps {}

export default function MarketingAssistantPage({}: MarketingAssistantPageProps) {
  const { selectedBrandId, brands } = useBrandContext()
  const { userId } = useAuth()
  
  // State management
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date()
  })
  const [selectedCampaignStatus, setSelectedCampaignStatus] = useState('all')
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Mock data for KPIs (would be replaced with real data)
  const [kpiData, setKpiData] = useState({
    totalSpend: 12450,
    spendGrowth: 8.2,
    totalConversions: 324,
    conversionsGrowth: 15.4,
    averageROAS: 4.2,
    roasGrowth: -2.1,
    activeCampaigns: 12,
    campaignsGrowth: 0
  })

  // Mock experiments queue data
  const [experimentsQueue, setExperimentsQueue] = useState([
    {
      id: '1',
      type: 'budget_optimization',
      campaignName: 'Holiday Sale Campaign',
      status: 'pending',
      estimatedImpact: '+15% ROAS',
      priority: 'high'
    },
    {
      id: '2',
      type: 'audience_expansion',
      campaignName: 'Retargeting Campaign',
      status: 'running',
      estimatedImpact: '+8% Reach',
      priority: 'medium'
    }
  ])

  // Mock performance trends data
  const [performanceTrends, setPerformanceTrends] = useState([
    { metric: 'ROAS', value: 4.2, change: -2.1, status: 'warning' },
    { metric: 'CPC', value: 1.85, change: 12.5, status: 'critical' },
    { metric: 'CTR', value: 2.8, change: 5.2, status: 'good' }
  ])

  // Mock action log
  const [actionLog, setActionLog] = useState([
    {
      id: '1',
      action: 'Budget increased by $500',
      campaign: 'Holiday Sale Campaign',
      timestamp: new Date(),
      status: 'completed'
    },
    {
      id: '2',
      action: 'Audience expanded',
      campaign: 'Retargeting Campaign', 
      timestamp: subDays(new Date(), 1),
      status: 'completed'
    }
  ])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0B0D10' }}>
      {/* Subtle background pattern - behind content */}
      <div className="fixed inset-0 opacity-[0.02]">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(239, 68, 68, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(239, 68, 68, 0.05) 0%, transparent 50%),
              linear-gradient(90deg, transparent 49%, rgba(42, 47, 54, 0.3) 50%, transparent 51%),
              linear-gradient(0deg, transparent 49%, rgba(42, 47, 54, 0.2) 50%, transparent 51%)
            `,
            backgroundSize: '100px 100px, 150px 150px, 30px 30px, 30px 30px'
          }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="relative z-10">
        <div className="grid grid-cols-12 gap-4 lg:gap-6 p-4 lg:p-6 max-w-[1800px] mx-auto">
          
          {/* Left Column - Sticky (3 cols) */}
          <div className="col-span-12 lg:col-span-3 order-1 lg:order-1">
            <div className="sticky top-6 space-y-4 lg:space-y-6">
              
              {/* Scope & Filters Panel */}
              <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#D1D5DB' }}>
                    <Filter className="w-5 h-5" style={{ color: '#EF4444' }} />
                    Scope & Filters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: '#9AA4B2' }}>
                      Date Range
                    </label>
                    <DateRangePicker 
                      dateRange={dateRange} 
                      setDateRange={setDateRange}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: '#9AA4B2' }}>
                      Platform
                    </label>
                    <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                      <SelectTrigger style={{ backgroundColor: '#0F1216', borderColor: '#2A2F36', color: '#D1D5DB' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                        <SelectItem value="all">All Platforms</SelectItem>
                        <SelectItem value="meta">Meta</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: '#9AA4B2' }}>
                      Campaign Status
                    </label>
                    <Select value={selectedCampaignStatus} onValueChange={setSelectedCampaignStatus}>
                      <SelectTrigger style={{ backgroundColor: '#0F1216', borderColor: '#2A2F36', color: '#D1D5DB' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                        <SelectItem value="all">All Campaigns</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block" style={{ color: '#9AA4B2' }}>
                      Search Campaigns
                    </label>
                    <Input 
                      placeholder="Search campaigns..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ backgroundColor: '#0F1216', borderColor: '#2A2F36', color: '#D1D5DB' }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Experiments Queue Panel */}
              <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#D1D5DB' }}>
                    <Brain className="w-5 h-5" style={{ color: '#EF4444' }} />
                    Experiments Queue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {experimentsQueue.map((experiment) => (
                      <div 
                        key={experiment.id}
                        className="p-3 rounded-lg border"
                        style={{ backgroundColor: '#0F1216', borderColor: '#2A2F36' }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant={experiment.priority === 'high' ? 'destructive' : 'secondary'}
                            style={{ 
                              backgroundColor: experiment.priority === 'high' ? '#EF4444' : '#9AA4B2',
                              color: '#FFFFFF'
                            }}
                          >
                            {experiment.priority}
                          </Badge>
                          <Badge 
                            variant="outline"
                            style={{ borderColor: '#2A2F36', color: '#9AA4B2' }}
                          >
                            {experiment.status}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium mb-1" style={{ color: '#D1D5DB' }}>
                          {experiment.campaignName}
                        </div>
                        <div className="text-xs" style={{ color: '#9AA4B2' }}>
                          {experiment.estimatedImpact}
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full mt-2"
                          style={{ backgroundColor: '#EF4444', borderColor: '#DC2626' }}
                        >
                          Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Middle Column - Scrollable (6 cols) */}
          <div className="col-span-12 lg:col-span-6 order-2 lg:order-2">
            <div className="space-y-4 lg:space-y-6">
              
              {/* KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Spend Card */}
                <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#9AA4B2' }}>Total Spend</p>
                        <p className="text-2xl font-bold" style={{ color: '#D1D5DB' }}>
                          ${kpiData.totalSpend.toLocaleString()}
                        </p>
                        <p className={cn(
                          "text-sm font-medium",
                          kpiData.spendGrowth > 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                        )}>
                          {kpiData.spendGrowth > 0 ? '+' : ''}{kpiData.spendGrowth}%
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8" style={{ color: '#EF4444' }} />
                    </div>
                  </CardContent>
                </Card>

                {/* Conversions Card */}
                <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#9AA4B2' }}>Conversions</p>
                        <p className="text-2xl font-bold" style={{ color: '#D1D5DB' }}>
                          {kpiData.totalConversions}
                        </p>
                        <p className={cn(
                          "text-sm font-medium",
                          kpiData.conversionsGrowth > 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                        )}>
                          {kpiData.conversionsGrowth > 0 ? '+' : ''}{kpiData.conversionsGrowth}%
                        </p>
                      </div>
                      <Target className="w-8 h-8" style={{ color: '#EF4444' }} />
                    </div>
                  </CardContent>
                </Card>

                {/* Avg ROAS Card */}
                <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#9AA4B2' }}>Avg ROAS</p>
                        <p className="text-2xl font-bold" style={{ color: '#D1D5DB' }}>
                          {kpiData.averageROAS.toFixed(1)}
                        </p>
                        <p className={cn(
                          "text-sm font-medium",
                          kpiData.roasGrowth > 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                        )}>
                          {kpiData.roasGrowth > 0 ? '+' : ''}{kpiData.roasGrowth}%
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8" style={{ color: '#EF4444' }} />
                    </div>
                  </CardContent>
                </Card>

                {/* Active Campaigns Card */}
                <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#9AA4B2' }}>Active Campaigns</p>
                        <p className="text-2xl font-bold" style={{ color: '#D1D5DB' }}>
                          {kpiData.activeCampaigns}
                        </p>
                        <p className={cn(
                          "text-sm font-medium",
                          kpiData.campaignsGrowth === 0 ? "text-[#9AA4B2]" : 
                          kpiData.campaignsGrowth > 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                        )}>
                          {kpiData.campaignsGrowth === 0 ? 'No change' : 
                           `${kpiData.campaignsGrowth > 0 ? '+' : ''}${kpiData.campaignsGrowth}%`}
                        </p>
                      </div>
                      <Activity className="w-8 h-8" style={{ color: '#EF4444' }} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Campaign List with AI Suggestions */}
              <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#D1D5DB' }}>
                    <BarChart3 className="w-5 h-5" style={{ color: '#EF4444' }} />
                    Campaign Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Use existing PlatformCampaignWidget but style it for the new theme */}
                  <div className="[&_.bg-white]:!bg-[#14171C] [&_.bg-gray-50]:!bg-[#0F1216] [&_.border-gray-200]:!border-[#2A2F36] [&_.text-gray-900]:!text-[#D1D5DB] [&_.text-gray-600]:!text-[#9AA4B2] [&_.bg-gray-100]:!bg-[#0F1216] [&_.text-gray-700]:!text-[#9AA4B2] [&_.text-gray-800]:!text-[#D1D5DB] [&_.border-gray-300]:!border-[#2A2F36] overflow-hidden">
                    <PlatformCampaignWidget />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Sticky (3 cols) */}
          <div className="col-span-12 lg:col-span-3 order-3 lg:order-3">
            <div className="sticky top-6 space-y-4 lg:space-y-6">
              
              {/* Performance Trends */}
              <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#D1D5DB' }}>
                    <TrendingUp className="w-5 h-5" style={{ color: '#EF4444' }} />
                    Performance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceTrends.map((trend) => (
                      <div key={trend.metric} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className={cn(
                              "w-2 h-2 rounded-full",
                              trend.status === 'good' && "bg-[#22C55E]",
                              trend.status === 'warning' && "bg-[#F59E0B]", 
                              trend.status === 'critical' && "bg-[#EF4444]"
                            )}
                          />
                          <span className="text-sm font-medium" style={{ color: '#D1D5DB' }}>
                            {trend.metric}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold" style={{ color: '#D1D5DB' }}>
                            {trend.value}
                          </div>
                          <div 
                            className={cn(
                              "text-xs",
                              trend.change > 0 ? "text-[#22C55E]" : "text-[#EF4444]"
                            )}
                          >
                            {trend.change > 0 ? '+' : ''}{trend.change}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Creative Performance */}
              <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#D1D5DB' }}>
                    <Eye className="w-5 h-5" style={{ color: '#EF4444' }} />
                    Creative Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: '#9AA4B2' }}>Top Performing</span>
                      <span style={{ color: '#22C55E' }}>4.2x ROAS</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: '#9AA4B2' }}>Needs Attention</span>
                      <span style={{ color: '#EF4444' }}>1.1x ROAS</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: '#9AA4B2' }}>Testing</span>
                      <span style={{ color: '#F59E0B' }}>3 variants</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Log */}
              <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#D1D5DB' }}>
                    <Clock className="w-5 h-5" style={{ color: '#EF4444' }} />
                    Action Log
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {actionLog.map((action) => (
                      <div 
                        key={action.id}
                        className="p-2 rounded border"
                        style={{ backgroundColor: '#0F1216', borderColor: '#2A2F36' }}
                      >
                        <div className="text-sm font-medium mb-1" style={{ color: '#D1D5DB' }}>
                          {action.action}
                        </div>
                        <div className="text-xs" style={{ color: '#9AA4B2' }}>
                          {action.campaign}
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#9AA4B2' }}>
                          {format(action.timestamp, 'MMM d, h:mm a')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Alerts */}
              <Card style={{ backgroundColor: '#14171C', borderColor: '#2A2F36' }}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg" style={{ color: '#D1D5DB' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
                    Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#EF4444] mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#D1D5DB' }}>
                          High CPC Alert
                        </div>
                        <div className="text-xs" style={{ color: '#9AA4B2' }}>
                          Holiday Sale Campaign
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B] mt-1.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#D1D5DB' }}>
                          Budget 80% Used
                        </div>
                        <div className="text-xs" style={{ color: '#9AA4B2' }}>
                          Retargeting Campaign
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
