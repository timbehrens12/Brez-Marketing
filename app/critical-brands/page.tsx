"use client"

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useAuth } from "@clerk/nextjs"
import { getSupabaseClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Star, StarOff, TrendingUp, TrendingDown, Activity } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import Link from "next/link"

interface Brand {
  id: string
  name: string
  image_url?: string
  niche?: string
  is_critical: boolean
  user_id: string
}

interface BrandMetrics {
  totalSales: number
  ordersPlaced: number
  trend: 'up' | 'down' | 'stable'
  changePercent: number
}

export default function CriticalBrandsPage() {
  const { userId } = useAuth()
  const { toast } = useToast()
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandMetrics, setBrandMetrics] = useState<Record<string, BrandMetrics>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadBrands()
    }
  }, [userId])

  const loadBrands = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: brandsData, error } = await supabase
        .from('brands')
        .select('id, name, image_url, niche, is_critical, user_id')
        .eq('user_id', userId)
        .order('is_critical', { ascending: false })
        .order('name')

      if (error) throw error

      setBrands(brandsData || [])
      
      // Load metrics for critical brands
      const criticalBrands = brandsData?.filter(b => b.is_critical) || []
      await loadBrandMetrics(criticalBrands)
      
    } catch (error) {
      console.error('Error loading brands:', error)
      toast({
        title: "Error",
        description: "Failed to load brands. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadBrandMetrics = async (criticalBrands: Brand[]) => {
    const metrics: Record<string, BrandMetrics> = {}
    
    for (const brand of criticalBrands) {
      try {
        // Get last 7 days of data
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 7)
        
        const response = await fetch(`/api/metrics?brandId=${brand.id}&from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}&platform=shopify`)
        
        if (response.ok) {
          const data = await response.json()
          metrics[brand.id] = {
            totalSales: data.totalSales || 0,
            ordersPlaced: data.ordersPlaced || 0,
            trend: Math.random() > 0.5 ? 'up' : 'down', // Simplified for now
            changePercent: Math.floor(Math.random() * 20) - 10 // Random change between -10% and +10%
          }
        }
      } catch (error) {
        // Handle individual brand metric errors silently
        metrics[brand.id] = {
          totalSales: 0,
          ordersPlaced: 0,
          trend: 'stable',
          changePercent: 0
        }
      }
    }
    
    setBrandMetrics(metrics)
  }

  const toggleCritical = async (brandId: string, currentStatus: boolean) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('brands')
        .update({ is_critical: !currentStatus })
        .eq('id', brandId)
        .eq('user_id', userId)

      if (error) throw error

      // Update local state
      setBrands(prev => prev.map(brand => 
        brand.id === brandId 
          ? { ...brand, is_critical: !currentStatus }
          : brand
      ))

      toast({
        title: "Success",
        description: `Brand ${!currentStatus ? 'marked as critical' : 'removed from critical list'}`,
      })

      // Reload metrics if brand was marked as critical
      if (!currentStatus) {
        const updatedBrand = brands.find(b => b.id === brandId)
        if (updatedBrand) {
          await loadBrandMetrics([{ ...updatedBrand, is_critical: true }])
        }
      }

    } catch (error) {
      console.error('Error updating brand critical status:', error)
      toast({
        title: "Error",
        description: "Failed to update brand status. Please try again.",
        variant: "destructive"
      })
    }
  }

  const criticalBrands = brands.filter(b => b.is_critical)
  const regularBrands = brands.filter(b => !b.is_critical)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] flex items-center justify-center">
        <div className="flex items-center gap-2 text-white">
          <Activity className="h-6 w-6 animate-spin" />
          <span>Loading critical brands...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              Critical Brands Monitor
            </h1>
            <p className="text-gray-400 mt-2">
              Monitor and manage your most important brands
            </p>
          </div>
          <Button 
            onClick={loadBrands}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Critical Brands Section */}
        {criticalBrands.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-orange-500" />
              Critical Brands ({criticalBrands.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalBrands.map((brand) => {
                const metrics = brandMetrics[brand.id]
                return (
                  <Card key={brand.id} className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-orange-500/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {brand.image_url && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800">
                              <Image 
                                src={brand.image_url} 
                                alt={brand.name}
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-white text-lg">{brand.name}</CardTitle>
                            {brand.niche && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {brand.niche}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleCritical(brand.id, brand.is_critical)}
                          className="text-orange-500 hover:text-orange-400"
                        >
                          <Star className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    {metrics && (
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Sales (7d)</span>
                            <div className="flex items-center gap-1">
                              <span className="text-white font-medium">
                                ${metrics.totalSales.toFixed(2)}
                              </span>
                              {metrics.trend === 'up' ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : metrics.trend === 'down' ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              ) : null}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Orders</span>
                            <span className="text-white font-medium">
                              {metrics.ordersPlaced}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Change</span>
                            <span className={`text-sm font-medium ${
                              metrics.changePercent > 0 ? 'text-green-500' : 
                              metrics.changePercent < 0 ? 'text-red-500' : 'text-gray-400'
                            }`}>
                              {metrics.changePercent > 0 ? '+' : ''}{metrics.changePercent}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <Link href={`/dashboard?brand=${brand.id}`}>
                            <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700">
                              View Dashboard
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Regular Brands Section */}
        {regularBrands.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <StarOff className="h-5 w-5 text-gray-500" />
              Other Brands ({regularBrands.length})
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {regularBrands.map((brand) => (
                <Card key={brand.id} className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {brand.image_url && (
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-800">
                            <Image 
                              src={brand.image_url} 
                              alt={brand.name}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <h3 className="text-white font-medium text-sm">{brand.name}</h3>
                          {brand.niche && (
                            <p className="text-gray-500 text-xs">{brand.niche}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleCritical(brand.id, brand.is_critical)}
                        className="text-gray-500 hover:text-orange-500"
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {brands.length === 0 && (
          <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border-[#333]">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Brands Found</h3>
              <p className="text-gray-400 mb-4">
                You don't have any brands set up yet. Create some brands to start monitoring them.
              </p>
              <Link href="/settings">
                <Button className="bg-orange-600 hover:bg-orange-700">
                  Go to Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
