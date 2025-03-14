"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { useBrandContext } from '@/lib/context/BrandContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget"
import { AIRecommendationsWidget } from "@/components/dashboard/AIRecommendationsWidget"
import { supabase } from "@/lib/supabase"
import { PlatformConnection } from '@/types/platformConnection'
import { Sparkles, Brain, Lightbulb, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import BrandSelector from "@/components/BrandSelector"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export default function AIDashboardPage() {
  const { userId, isLoaded } = useAuth()
  const { brands, selectedBrandId, setSelectedBrandId } = useBrandContext()
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [isLoadingConnections, setIsLoadingConnections] = useState(true)
  const [activeTab, setActiveTab] = useState("insights")
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Always use 'overall' focus area
  const focusArea = 'overall'

  useEffect(() => {
    if (selectedBrandId) {
      loadConnections()
    }
  }, [selectedBrandId])
  
  // Handle tab parameter in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const tabParam = searchParams.get('tab')
    
    if (tabParam === 'insights' || tabParam === 'recommendations') {
      setActiveTab(tabParam)
    }
  }, [])

  const loadConnections = async () => {
    if (!selectedBrandId) return
    
    setIsLoadingConnections(true)
    
    try {
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', selectedBrandId)
      
      if (error) throw error
      
      setConnections(data || [])
    } catch (error) {
      console.error('Error loading connections:', error)
      toast.error('Failed to load platform connections')
    } finally {
      setIsLoadingConnections(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      // Trigger a refresh of the AI data
      toast.info('Refreshing AI insights and recommendations...')
      
      // Wait for a moment to simulate the refresh
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Force a re-render of the AI widgets
      setActiveTab(prev => {
        // Toggle and then toggle back to force re-render
        const temp = prev === "insights" ? "recommendations" : "insights"
        setTimeout(() => setActiveTab(prev), 100)
        return temp
      })
      
      toast.success('AI data refreshed successfully')
    } catch (error) {
      console.error('Error refreshing AI data:', error)
      toast.error('Failed to refresh AI data')
    } finally {
      setIsRefreshing(false)
    }
  }

  const getConnectedPlatforms = () => {
    const shopify = connections.some(c => c.platform_type === 'shopify' && c.status === 'active')
    const meta = connections.some(c => c.platform_type === 'meta' && c.status === 'active')
    
    return { shopify, meta }
  }

  const renderConnectionStatus = () => {
    const { shopify, meta } = getConnectedPlatforms()
    
    return (
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge variant={shopify ? "default" : "outline"} className={shopify ? "bg-green-600 hover:bg-green-700" : ""}>
          {shopify ? "Shopify Connected" : "Shopify Not Connected"}
        </Badge>
        <Badge variant={meta ? "default" : "outline"} className={meta ? "bg-blue-600 hover:bg-blue-700" : ""}>
          {meta ? "Meta Ads Connected" : "Meta Ads Not Connected"}
        </Badge>
      </div>
    )
  }

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId)
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Sparkles className="h-8 w-8 text-blue-400" />
            AI Marketing Intelligence
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Powerful AI-driven insights and recommendations to help you grow your business across all your connected platforms.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <BrandSelector 
            onSelect={handleBrandSelect} 
            selectedBrandId={selectedBrandId}
            className="w-48"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-gray-800 hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Analysis'}
          </Button>
        </div>
      </div>
      
      {renderConnectionStatus()}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-400" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300">
              Our AI analyzes your data across all platforms to provide actionable insights.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="link" className="text-blue-400 p-0 h-auto text-xs">
              Learn more <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Growth Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300">
              Discover untapped opportunities to grow your business based on your data.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="link" className="text-green-400 p-0 h-auto text-xs">
              Learn more <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-purple-400" />
              Smart Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300">
              Get personalized recommendations to optimize your marketing strategy.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="link" className="text-purple-400 p-0 h-auto text-xs">
              Learn more <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Risk Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300">
              Identify potential issues before they become problems and get recommendations to address them.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="link" className="text-amber-400 p-0 h-auto text-xs">
              Learn more <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center">
            <TabsList className="bg-gray-800/50 p-1">
              <TabsTrigger 
                value="insights" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                AI Insights
              </TabsTrigger>
              <TabsTrigger 
                value="recommendations" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Recommendations
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 shadow-xl mt-6">
            <TabsContent value="insights" className="mt-0">
              <AIInsightsWidget 
                brandId={selectedBrandId || ''} 
                dateRange={{
                  from: new Date(new Date().setDate(new Date().getDate() - 30)),
                  to: new Date()
                }}
                focusArea={focusArea}
              />
            </TabsContent>
            
            <TabsContent value="recommendations" className="mt-0">
              <AIRecommendationsWidget 
                brandId={selectedBrandId || ''}
                focusArea={focusArea}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
} 