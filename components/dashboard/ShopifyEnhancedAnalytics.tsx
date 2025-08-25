"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  ShoppingCart, 
  Search, 
  FileText, 
  Users, 
  Eye,
  DollarSign,
  BarChart3,
  Zap,
  Target,
  MousePointer,
  Clock,
  Smartphone,
  Monitor,
  RefreshCw
} from 'lucide-react'

interface EnhancedAnalyticsProps {
  brandId: string
}

interface AnalyticsData {
  productAnalytics: {
    products: any[]
    summary: {
      totalRevenue: string
      avgConversionRate: string
      totalViews: number
      topPerformer: string
    }
  }
  customerJourney: {
    journeys: any[]
    touchPointAnalysis: any
    deviceAnalysis: any
    summary: {
      totalJourneys: number
      conversionRate: string
      avgTimeSpent: string
    }
  }
  contentPerformance: {
    content: any[]
    summary: {
      totalPageViews: number
      totalRevenue: string
      avgBounceRate: string
      topContent: string
    }
  }
  cartAnalytics: {
    carts: any[]
    summary: {
      totalCarts: number
      conversionRate: string
      abandonmentRate: string
      avgCartValue: string
      totalValue: string
    }
  }
}

export function ShopifyEnhancedAnalytics({ brandId }: EnhancedAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/shopify/analytics/enhanced?brandId=${brandId}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const analyticsData = await response.json()
      setData(analyticsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const syncData = async () => {
    try {
      setSyncing(true)
      
      // Get the shop domain from the platform connection using Supabase
      const supabase = getSupabaseClient()
      const { data: connections, error: connectionError } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('brand_id', brandId)
        .eq('platform_type', 'shopify')
        .eq('status', 'active')
      
      if (connectionError) {
        throw new Error('Failed to get connection details: ' + connectionError.message)
      }
      
      const shopifyConnection = connections?.[0]
      if (!shopifyConnection) {
        throw new Error('No Shopify connection found for this brand')
      }

      const response = await fetch('/api/shopify/sync/enhanced-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          brandId, 
          shop: shopifyConnection.shop 
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sync failed')
      }
      
      await fetchAnalytics() // Refresh data after sync
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (brandId) {
      fetchAnalytics()
    }
  }, [brandId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Enhanced Shopify Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Enhanced Shopify Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchAnalytics} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header with Sync Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Enhanced Shopify Analytics
              </CardTitle>
              <CardDescription>
                Real-time analytics from your Shopify store data
              </CardDescription>
              <div className="mt-2 text-xs text-muted-foreground">
                <p><strong>Real Data:</strong> Products (sales, revenue), Customer journeys (from orders), Cart analytics (checkouts & orders)</p>
                <p><strong>Estimated:</strong> Content performance (based on publish dates and content length)</p>
              </div>
            </div>
            <Button 
              onClick={syncData} 
              disabled={syncing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Data'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="carts">Carts</TabsTrigger>
        </TabsList>

        {/* Product Analytics */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">${data.productAnalytics.summary.totalRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Conversion</p>
                    <p className="text-2xl font-bold">{data.productAnalytics.summary.avgConversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">{data.productAnalytics.summary.totalViews.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Top Performer</p>
                    <p className="text-sm font-medium truncate">{data.productAnalytics.summary.topPerformer}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.productAnalytics.products.slice(0, 10).map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{product.title}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{product.views} views</span>
                        <span>{product.purchases} purchases</span>
                        <span>{product.conversion_rate}% conversion</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${product.revenue}</p>
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Journey Analytics */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Journeys</p>
                    <p className="text-2xl font-bold">{data.customerJourney.summary.totalJourneys}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold">{data.customerJourney.summary.conversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Time Spent</p>
                    <p className="text-2xl font-bold">{data.customerJourney.summary.avgTimeSpent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.customerJourney.touchPointAnalysis).map(([source, stats]: [string, any]) => (
                    <div key={source} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{source}</p>
                        <p className="text-sm text-muted-foreground">{stats.count} visits</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${stats.revenue.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {((stats.conversions / stats.count) * 100).toFixed(1)}% conv
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.customerJourney.deviceAnalysis).map(([device, stats]: [string, any]) => (
                    <div key={device} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {device === 'mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                        <div>
                          <p className="font-medium capitalize">{device}</p>
                          <p className="text-sm text-muted-foreground">{stats.count} sessions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{((stats.conversions / stats.count) * 100).toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">conversion</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Performance */}
        <TabsContent value="content" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Page Views</p>
                    <p className="text-2xl font-bold">{data.contentPerformance.summary.totalPageViews.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold">${data.contentPerformance.summary.totalRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bounce Rate</p>
                    <p className="text-2xl font-bold">{data.contentPerformance.summary.avgBounceRate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Top Content</p>
                    <p className="text-sm font-medium truncate">{data.contentPerformance.summary.topContent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.contentPerformance.content.slice(0, 10).map((content: any) => (
                  <div key={content.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{content.title}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <Badge variant="outline">{content.content_type}</Badge>
                        <span>{content.page_views} views</span>
                        <span>{content.bounce_rate}% bounce</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${content.revenue}</p>
                      <p className="text-sm text-muted-foreground">{content.conversion_rate}% conv</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Cart Analytics */}
        <TabsContent value="carts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Carts</p>
                    <p className="text-2xl font-bold">{data.cartAnalytics.summary.totalCarts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold">{data.cartAnalytics.summary.conversionRate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Abandonment</p>
                    <p className="text-2xl font-bold">{data.cartAnalytics.summary.abandonmentRate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Cart Value</p>
                    <p className="text-2xl font-bold">${data.cartAnalytics.summary.avgCartValue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Cart Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.cartAnalytics.carts.slice(0, 10).map((cart: any) => (
                  <div key={cart.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Cart #{cart.cart_token.slice(-8)}</h4>
                        <Badge variant={cart.converted ? "default" : cart.abandoned ? "destructive" : "secondary"}>
                          {cart.converted ? "Converted" : cart.abandoned ? "Abandoned" : "Active"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{cart.item_count} items</span>
                        <span>{Math.floor(cart.time_spent_in_cart / 60)} min</span>
                        <span>{cart.device_type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">${cart.total_value}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(cart.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
