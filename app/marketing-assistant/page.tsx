"use client"

import { useEffect, useState } from "react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Brain, 
  Palette, 
  MessageSquare,
  Calendar,
  DollarSign,
  Users,
  Eye,
  Zap,
  PieChart,
  LineChart,
  ArrowUp,
  Plus,
  Settings,
  RefreshCw,
  Download,
  Filter
} from "lucide-react"

export default function MarketingAssistantPage() {
  const { selectedBrandId } = useBrandContext()
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const { agencySettings } = useAgency()
  const pathname = usePathname()

  useEffect(() => {
    // Page loading simulation
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Show loading state
  if (isLoadingPage) {
    const loadingConfig = getPageLoadingConfig(pathname)
    
    return (
      <UnifiedLoading
        variant="page"
        size="lg"
        message="Loading Marketing Assistant"
        subMessage="Preparing your AI-powered marketing tools"
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Marketing Assistant</h1>
            <p className="text-gray-400">AI-powered marketing insights, campaign optimization, and content creation</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="bg-[#1A1A1A] border-[#333] text-white hover:bg-[#222]">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Button variant="outline" className="bg-[#1A1A1A] border-[#333] text-white hover:bg-[#222]">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {!selectedBrandId ? (
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Brain className="h-16 w-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Select a Brand</h3>
              <p className="text-gray-400 text-center max-w-md">
                Choose a brand from the dropdown to access AI-powered marketing insights and tools
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-[#1A1A1A] border-[#333] mb-6">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
                <Target className="h-4 w-4 mr-2" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="insights" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
                <Brain className="h-4 w-4 mr-2" />
                AI Insights
              </TabsTrigger>
              <TabsTrigger value="creative" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
                <Palette className="h-4 w-4 mr-2" />
                Creative Studio
              </TabsTrigger>
              <TabsTrigger value="automation" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
                <Zap className="h-4 w-4 mr-2" />
                Automation
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-400">Total Ad Spend</CardTitle>
                      <DollarSign className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">$0</div>
                    <div className="flex items-center text-sm">
                      <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">0%</span>
                      <span className="text-gray-400 ml-1">vs last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-400">ROAS</CardTitle>
                      <TrendingUp className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">0.0x</div>
                    <div className="flex items-center text-sm">
                      <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">0%</span>
                      <span className="text-gray-400 ml-1">vs last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-400">Impressions</CardTitle>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">0</div>
                    <div className="flex items-center text-sm">
                      <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">0%</span>
                      <span className="text-gray-400 ml-1">vs last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-gray-400">Conversions</CardTitle>
                      <Users className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">0</div>
                    <div className="flex items-center text-sm">
                      <ArrowUp className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">0%</span>
                      <span className="text-gray-400 ml-1">vs last month</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Analysis Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">Performance Trends</CardTitle>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <LineChart className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                        <p>Performance chart will be displayed here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">Channel Distribution</CardTitle>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <PieChart className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                        <p>Channel breakdown will be displayed here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Recommendations Section */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center">
                        <Brain className="h-5 w-5 mr-2" />
                        AI Recommendations
                      </CardTitle>
                      <p className="text-gray-400 text-sm mt-1">Smart insights to optimize your marketing performance</p>
                    </div>
                    <Badge variant="secondary" className="bg-[#333] text-white">
                      <Zap className="h-3 w-3 mr-1" />
                      3 New
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 bg-[#222] border border-[#333] rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-medium mb-1">Recommendation {i}</h4>
                            <p className="text-gray-400 text-sm">AI-generated recommendation will appear here</p>
                          </div>
                          <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Campaign Management</h2>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>

              {/* Campaign Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">Active Campaigns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                      <p className="text-gray-500">Campaign list will be displayed here</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">Performance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                      <p className="text-gray-500">Campaign performance metrics</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">Optimization Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 mx-auto mb-3 text-gray-600" />
                      <p className="text-gray-500">AI optimization recommendations</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">Market Intelligence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Brain className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-500">AI market analysis coming soon</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">Audience Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-500">Audience analysis coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Creative Studio Tab */}
            <TabsContent value="creative" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">Ad Creative Generator</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Palette className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-500">Creative tools coming soon</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">Copy Generator</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-500">AI copywriting coming soon</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">Content Calendar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-500">Content planning coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Automation Tab */}
            <TabsContent value="automation" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">Automated Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-16">
                      <Zap className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-500">Campaign automation coming soon</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#1A1A1A] border-[#333]">
                  <CardHeader>
                    <CardTitle className="text-white">Smart Bidding</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-16">
                      <Target className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                      <p className="text-gray-500">AI bidding optimization coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
} 