"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts'
import { Loader2, ArrowUpDown, Star, Package, RefreshCw, ShoppingCart, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface ProductPerformanceProps {
  brandId: string
  isRefreshing?: boolean
}

interface ProductMetric {
  id: string
  name: string
  sku: string
  views: number
  purchases: number
  viewToPurchaseRatio: number
  returnRate: number
  averageRating: number
  reviewCount: number
  inventoryTurnoverRate: number
  revenue: number
  profitMargin: number
}

interface RelatedProduct {
  id: string
  name: string
  relationshipType: string
  strength: number
  conversionRate: number
}

interface ProductReview {
  id: string
  productName: string
  rating: number
  title: string
  text: string
  customerName: string
  verifiedPurchase: boolean
  helpfulVotes: number
  date: string
}

export function ProductPerformance({ brandId, isRefreshing = false }: ProductPerformanceProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [sortField, setSortField] = useState('revenue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [products, setProducts] = useState<ProductMetric[]>([])
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  
  useEffect(() => {
    if (!brandId) return
    
    const fetchProductPerformance = async () => {
      setIsLoading(true)
      try {
        // Call the real API endpoint
        const response = await fetch(`/api/shopify/products/performance?brandId=${brandId}`)
        if (!response.ok) throw new Error('Failed to fetch product performance data')
        const data = await response.json()
        
        // Check if we have data
        if (data.error) {
          throw new Error(data.error)
        }
        
        setProducts(data.products || [])
        setRelatedProducts(data.relatedProducts || [])
        setReviews(data.reviews || [])
        
        // If it's mock data, log a message
        if (data.isMockData) {
          console.log('Using mock product performance data for demonstration')
        }
        
      } catch (error) {
        console.error('Error fetching product performance data:', error)
        setError('Failed to load product performance data')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchProductPerformance()
  }, [brandId, isRefreshing])
  
  const handleSyncData = async () => {
    if (!brandId || isSyncing) return
    
    setIsSyncing(true)
    setSyncMessage('Syncing product performance data from Shopify...')
    setError(null)
    
    try {
      // Get the connection ID for this brand
      const connectionsResponse = await fetch(`/api/shopify/connections?brandId=${brandId}`)
      if (!connectionsResponse.ok) throw new Error('Failed to fetch Shopify connections')
      
      const connectionsData = await connectionsResponse.json()
      if (!connectionsData.connections || connectionsData.connections.length === 0) {
        throw new Error('No Shopify connections found for this brand')
      }
      
      // Use the first connection
      const connectionId = connectionsData.connections[0].id
      
      // Trigger the sync process
      const syncResponse = await fetch('/api/shopify/products/performance/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ connectionId })
      })
      
      if (!syncResponse.ok) {
        const errorData = await syncResponse.json()
        throw new Error(errorData.error || 'Sync failed')
      }
      
      const syncData = await syncResponse.json()
      
      setSyncMessage(`Sync completed! Processed ${syncData.metrics} products, ${syncData.relationships} relationships, and ${syncData.reviews} reviews.`)
      
      // Refresh the data
      setTimeout(() => {
        // Call the real API endpoint
        fetch(`/api/shopify/products/performance?brandId=${brandId}`)
          .then(response => response.json())
          .then(data => {
            if (data.error) {
              throw new Error(data.error)
            }
            
            setProducts(data.products || [])
            setRelatedProducts(data.relatedProducts || [])
            setReviews(data.reviews || [])
            
            // If it's still mock data, show a message
            if (data.isMockData) {
              setSyncMessage('Sync completed, but no real data was found. Using mock data for demonstration.')
            } else {
              setSyncMessage('Data refreshed with real Shopify data!')
            }
          })
          .catch(error => {
            console.error('Error refreshing data after sync:', error)
            setSyncMessage('Sync completed, but failed to refresh data.')
          })
      }, 2000)
      
    } catch (error) {
      console.error('Error syncing product performance data:', error)
      setError(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setSyncMessage(null)
    } finally {
      setIsSyncing(false)
    }
  }
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }
  
  const sortedProducts = [...products].sort((a, b) => {
    const fieldA = a[sortField as keyof ProductMetric]
    const fieldB = b[sortField as keyof ProductMetric]
    
    if (typeof fieldA === 'number' && typeof fieldB === 'number') {
      return sortOrder === 'desc' ? fieldB - fieldA : fieldA - fieldB
    }
    
    if (typeof fieldA === 'string' && typeof fieldB === 'string') {
      return sortOrder === 'desc' 
        ? fieldB.localeCompare(fieldA) 
        : fieldA.localeCompare(fieldB)
    }
    
    return 0
  })
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }
  
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }
  
  const renderStarRating = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)
    }
    
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative">
          <Star className="h-4 w-4 text-gray-300" />
          <div className="absolute top-0 left-0 overflow-hidden w-1/2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      )
    }
    
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />)
    }
    
    return <div className="flex">{stars}</div>
  }
  
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    return sortOrder === 'desc' 
      ? <ArrowUpDown className="h-4 w-4 ml-1 text-blue-500" /> 
      : <ArrowUpDown className="h-4 w-4 ml-1 text-blue-500 rotate-180" />
  }
  
  const renderOverviewTab = () => {
    // Prepare data for the view-to-purchase chart
    const viewToPurchaseData = sortedProducts.slice(0, 5).map(product => ({
      name: product.name,
      views: product.views,
      purchases: product.purchases,
      ratio: product.viewToPurchaseRatio
    }))
    
    // Prepare data for the return rate pie chart
    const returnRateData = [
      { name: 'No Returns', value: 100 - sortedProducts.reduce((sum, p) => sum + p.returnRate, 0) / sortedProducts.length },
      { name: 'Returns', value: sortedProducts.reduce((sum, p) => sum + p.returnRate, 0) / sortedProducts.length }
    ]
    
    // Prepare data for the inventory turnover chart
    const inventoryData = sortedProducts.slice(0, 5).map(product => ({
      name: product.name,
      turnover: product.inventoryTurnoverRate
    }))
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* View-to-Purchase Ratio */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">View-to-Purchase Ratio</CardTitle>
              <CardDescription>Products with highest conversion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={viewToPurchaseData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70} 
                      tick={{ fill: '#888', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      orientation="left"
                      tick={{ fill: '#888' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: '#888' }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="views" name="Views" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="purchases" name="Purchases" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="ratio" name="Conversion Rate" fill="#ffc658" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Return Rates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Return Rates</CardTitle>
              <CardDescription>Average return rate across products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={returnRateData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell key="no-returns" fill="#82ca9d" />
                      <Cell key="returns" fill="#ff6b6b" />
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Products with highest returns:</span>
                  <span>Return Rate</span>
                </div>
                {sortedProducts
                  .sort((a, b) => b.returnRate - a.returnRate)
                  .slice(0, 3)
                  .map(product => (
                    <div key={product.id} className="flex justify-between items-center mb-2">
                      <span className="text-sm">{product.name}</span>
                      <Badge variant={product.returnRate > 5 ? "destructive" : "secondary"}>
                        {formatPercentage(product.returnRate)}
                      </Badge>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cross-sell Performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Cross-sell Performance</CardTitle>
              <CardDescription>Products commonly purchased together</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {relatedProducts.slice(0, 5).map(relation => (
                  <div key={relation.id} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{relation.name}</span>
                      <Badge variant="outline">
                        {relation.relationshipType.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Relationship Strength</span>
                      <span>{relation.strength}%</span>
                    </div>
                    <Progress value={relation.strength} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Conversion Rate</span>
                      <span>{relation.conversionRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Inventory Turnover */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Inventory Turnover</CardTitle>
              <CardDescription>How quickly products sell through inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={inventoryData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70} 
                      tick={{ fill: '#888', fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fill: '#888' }}
                      label={{ value: 'Turnover Rate', angle: -90, position: 'insideLeft', fill: '#888' }}
                    />
                    <Tooltip />
                    <Bar dataKey="turnover" name="Turnover Rate" fill="#4ade80" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Average turnover rate: {(sortedProducts.reduce((sum, p) => sum + p.inventoryTurnoverRate, 0) / sortedProducts.length).toFixed(1)}</p>
                <p className="mt-1">Higher turnover rates indicate products that sell quickly relative to inventory levels.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  const renderProductsTab = () => {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center">
                    Product {renderSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('views')}>
                  <div className="flex items-center justify-end">
                    Views {renderSortIcon('views')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('viewToPurchaseRatio')}>
                  <div className="flex items-center justify-end">
                    Conversion {renderSortIcon('viewToPurchaseRatio')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('returnRate')}>
                  <div className="flex items-center justify-end">
                    Returns {renderSortIcon('returnRate')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('averageRating')}>
                  <div className="flex items-center justify-end">
                    Rating {renderSortIcon('averageRating')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('inventoryTurnoverRate')}>
                  <div className="flex items-center justify-end">
                    Turnover {renderSortIcon('inventoryTurnoverRate')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer text-right" onClick={() => handleSort('revenue')}>
                  <div className="flex items-center justify-end">
                    Revenue {renderSortIcon('revenue')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div>
                      {product.name}
                      <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{product.views.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatPercentage(product.viewToPurchaseRatio)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={product.returnRate > 5 ? "destructive" : "secondary"}>
                      {formatPercentage(product.returnRate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center">
                      {renderStarRating(product.averageRating)}
                      <span className="ml-2 text-xs text-muted-foreground">({product.reviewCount})</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{product.inventoryTurnoverRate.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(product.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }
  
  const renderReviewsTab = () => {
    return (
      <div className="space-y-4">
        {reviews.map(review => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{review.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {review.productName} • {new Date(review.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center">
                  {renderStarRating(review.rating)}
                </div>
              </div>
              <p className="my-2">{review.text}</p>
              <div className="flex justify-between items-center mt-4 text-sm">
                <div className="flex items-center">
                  <span className="text-muted-foreground">By {review.customerName}</span>
                  {review.verifiedPurchase && (
                    <Badge variant="outline" className="ml-2">Verified Purchase</Badge>
                  )}
                </div>
                <div className="text-muted-foreground">
                  {review.helpfulVotes} {review.helpfulVotes === 1 ? 'person' : 'people'} found this helpful
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  return (
    <Card className="col-span-3">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-bold">Product Performance</CardTitle>
            <CardDescription>Detailed metrics about your product performance</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncData}
            disabled={isSyncing || !brandId}
            className="flex items-center gap-1"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sync Shopify Data
              </>
            )}
          </Button>
        </div>
        {syncMessage && (
          <div className="mt-2 p-2 bg-muted rounded-md text-sm">
            {syncMessage}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="products" className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                Products
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                Reviews
              </TabsTrigger>
            </TabsList>
          </div>
          
          {isLoading ? (
            <div className="w-full h-[400px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="w-full h-[400px] flex items-center justify-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            <>
              <TabsContent value="overview" className="mt-0">
                {renderOverviewTab()}
              </TabsContent>
              <TabsContent value="products" className="mt-0">
                {renderProductsTab()}
              </TabsContent>
              <TabsContent value="reviews" className="mt-0">
                {renderReviewsTab()}
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
} 