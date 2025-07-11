"use client"

import { useState } from 'react'
import { BlendedMetricsGrid } from '@/components/marketing/BlendedMetricsGrid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  Target, 
  Palette, 
  FileText, 
  Calendar,
  TrendingUp,
  Zap,
  Brain,
  Settings,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBrandContext } from '@/lib/context/BrandContext'

export default function MarketingAssistantPage() {
  const { selectedBrandId, selectedBrand } = useBrandContext()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (!selectedBrandId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-gray-400">Loading marketing dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-[#222] bg-[#111]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Marketing Assistant</h1>
              <p className="text-gray-400 text-sm mt-1">
                AI-powered insights across all advertising platforms{selectedBrand ? ` for ${selectedBrand.name}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Live Data
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                className="border-[#333] hover:border-[#444]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Blended Metrics Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Blended Performance Metrics</h2>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              All Platforms
            </Badge>
          </div>
          
          <BlendedMetricsGrid 
            key={refreshKey}
            brandId={selectedBrandId} 
            className="mb-8" 
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-[#111] border border-[#333] p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#222]">
              <TrendingUp className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-[#222]">
              <Target className="h-4 w-4 mr-2" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="creatives" className="data-[state=active]:bg-[#222]">
              <Palette className="h-4 w-4 mr-2" />
              Creatives
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-[#222]">
              <FileText className="h-4 w-4 mr-2" />
              AI Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Performance Summary */}
              <Card className="bg-[#111] border-[#333] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-400" />
                    AI Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-green-400 mb-1">Strong Performance Detected</h4>
                          <p className="text-sm text-gray-300">
                            Your Meta campaigns are performing 23% above industry average. 
                            ROAS has improved consistently over the past 7 days.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Zap className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-400 mb-1">Optimization Opportunity</h4>
                          <p className="text-sm text-gray-300">
                            3 campaigns could benefit from budget reallocation. 
                            Potential to increase ROAS by 15-20%.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-[#111] border-[#333]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-400" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start border-[#333] hover:border-[#444]">
                    <Target className="h-4 w-4 mr-2" />
                    Analyze Campaigns
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-[#333] hover:border-[#444]">
                    <Palette className="h-4 w-4 mr-2" />
                    Review Creatives
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-[#333] hover:border-[#444]">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-[#333] hover:border-[#444]">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Analysis
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card className="bg-[#111] border-[#333]">
              <CardHeader>
                <CardTitle>Campaign Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Campaign Analysis Coming Soon</h3>
                  <p className="text-gray-500">
                    Advanced campaign management with AI recommendations will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="creatives">
            <Card className="bg-[#111] border-[#333]">
              <CardHeader>
                <CardTitle>Creative Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Palette className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Creative Performance Coming Soon</h3>
                  <p className="text-gray-500">
                    AI-powered creative analysis and optimization suggestions will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="bg-[#111] border-[#333]">
              <CardHeader>
                <CardTitle>AI Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Daily AI Reports Coming Soon</h3>
                  <p className="text-gray-500">
                    Automated daily reports with insights and recommendations will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 