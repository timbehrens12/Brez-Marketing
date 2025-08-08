"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, TrendingDown, Zap, Calendar, X, Settings, Eye, EyeOff, Lightbulb } from "lucide-react"
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { toast } from 'sonner'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Alert {
  id: string
  alert_type: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  campaign_id?: string
  adset_id?: string
  ad_id?: string
  data?: any
  is_dismissed: boolean
  created_at: string
  brand_id: string
}

interface CampaignOptimization {
  campaign_id: string
  campaign_name: string
  brand_name: string
  recommendations: string[]
  potential_improvement: string
  priority: 'high' | 'medium' | 'low'
}

export default function AIPoweredAlerts() {
  const { contextBrands, selectedBrandId } = useBrandContext()
  const { userId } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [optimizations, setOptimizations] = useState<CampaignOptimization[]>([])
  const [isOptimizationDialogOpen, setIsOptimizationDialogOpen] = useState(false)
  const [isGeneratingOptimizations, setIsGeneratingOptimizations] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetchAlerts()
  }, [userId, selectedBrandId])

  const fetchAlerts = async () => {
    try {
      setIsLoading(true)
      const supabase = getStandardSupabaseClient()

      let query = supabase
        .from('active_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })

      if (selectedBrandId) {
        query = query.eq('brand_id', selectedBrandId)
      }

      const { data, error } = await query

      if (error) throw error

      setAlerts(data || [])
      
      // Also generate new alerts based on current data
      await generateRealTimeAlerts()

    } catch (error) {
      console.error('Error fetching alerts:', error)
      toast.error('Failed to load alerts')
    } finally {
      setIsLoading(false)
    }
  }

  const generateRealTimeAlerts = async () => {
    try {
      const supabase = getStandardSupabaseClient()
      const today = new Date().toISOString().split('T')[0]
      
      // Get active campaigns and their performance
      const brandsToCheck = selectedBrandId ? [selectedBrandId] : contextBrands?.map(b => b.brand_id) || []
      
      for (const brandId of brandsToCheck) {
        // Check for budget alerts
        const { data: budgetData } = await supabase
          .from('brand_budgets')
          .select('*')
          .eq('brand_id', brandId)
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        if (budgetData?.daily_budget) {
          const { data: spendData } = await supabase
            .from('meta_ad_insights')
            .select('spend')
            .eq('brand_id', brandId)
            .gte('date_start', today)

          const totalSpend = spendData?.reduce((sum, row) => sum + (parseFloat(row.spend) || 0), 0) || 0
          const budgetUsed = (totalSpend / budgetData.daily_budget) * 100

          if (budgetUsed >= 85 && budgetUsed < 100) {
            await createAlert(brandId, 'budget_limit', 'Budget Alert', 
              `Campaign spending at ${budgetUsed.toFixed(1)}% of daily budget`, 'high')
          } else if (budgetUsed >= 100) {
            await createAlert(brandId, 'budget_limit', 'Budget Exceeded', 
              `Daily budget exceeded by ${(budgetUsed - 100).toFixed(1)}%`, 'critical')
          }
        }

        // Check for performance warnings
        const { data: campaignData } = await supabase
          .from('meta_campaigns')
          .select('campaign_id, campaign_name')
          .eq('brand_id', brandId)
          .eq('status', 'ACTIVE')

        for (const campaign of campaignData || []) {
          const { data: performanceData } = await supabase
            .from('meta_ad_insights')
            .select('spend, actions')
            .eq('brand_id', brandId)
            .eq('campaign_id', campaign.campaign_id)
            .gte('date_start', today)

          const spend = performanceData?.reduce((sum, row) => sum + (parseFloat(row.spend) || 0), 0) || 0
          const conversions = performanceData?.reduce((sum, row) => {
            const actions = row.actions ? JSON.parse(row.actions) : []
            return sum + (actions.find((a: any) => a.action_type === 'purchase')?.value || 0)
          }, 0) || 0

          if (spend > 50 && conversions === 0) {
            await createAlert(brandId, 'performance_warning', 'No Conversions', 
              `Campaign "${campaign.campaign_name}" has spent $${spend.toFixed(2)} with no conversions today`, 'high')
          }
        }
      }

    } catch (error) {
      console.error('Error generating real-time alerts:', error)
    }
  }

  const createAlert = async (brandId: string, alertType: string, title: string, description: string, severity: string) => {
    try {
      const supabase = getStandardSupabaseClient()
      
      // Check if this alert already exists today
      const today = new Date().toISOString().split('T')[0]
      const { data: existingAlert } = await supabase
        .from('active_alerts')
        .select('id')
        .eq('user_id', userId)
        .eq('brand_id', brandId)
        .eq('alert_type', alertType)
        .eq('title', title)
        .gte('created_at', today)
        .single()

      if (existingAlert) return // Don't create duplicate alerts

      const { error } = await supabase
        .from('active_alerts')
        .insert({
          user_id: userId,
          brand_id: brandId,
          alert_type: alertType,
          title,
          description,
          severity
        })

      if (error) throw error

    } catch (error) {
      console.error('Error creating alert:', error)
    }
  }

  const dismissAlert = async (alertId: string) => {
    try {
      const supabase = getStandardSupabaseClient()
      const { error } = await supabase
        .from('active_alerts')
        .update({ 
          is_dismissed: true, 
          dismissed_at: new Date().toISOString() 
        })
        .eq('id', alertId)

      if (error) throw error

      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
      toast.success('Alert dismissed')

    } catch (error) {
      console.error('Error dismissing alert:', error)
      toast.error('Failed to dismiss alert')
    }
  }

  const generateCampaignOptimizations = async () => {
    try {
      setIsGeneratingOptimizations(true)
      const brandsToOptimize = selectedBrandId ? [selectedBrandId] : contextBrands?.map(b => b.brand_id) || []
      
      const mockOptimizations: CampaignOptimization[] = []
      
      for (const brandId of brandsToOptimize) {
        const brand = contextBrands?.find(b => b.brand_id === brandId)
        if (!brand) continue

        // This would normally call an AI service, but for now we'll generate mock data
        mockOptimizations.push({
          campaign_id: `campaign_${brandId}_1`,
          campaign_name: "Holiday Sale Campaign",
          brand_name: brand.brand_name,
          recommendations: [
            "Increase budget for high-performing ad sets by 20%",
            "Pause underperforming ads with CTR < 1%",
            "Add negative keywords to reduce irrelevant clicks",
            "Test new ad creative variations"
          ],
          potential_improvement: "+15% ROAS improvement",
          priority: 'high'
        })
      }

      setOptimizations(mockOptimizations)
      setIsOptimizationDialogOpen(true)

    } catch (error) {
      console.error('Error generating optimizations:', error)
      toast.error('Failed to generate optimizations')
    } finally {
      setIsGeneratingOptimizations(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/20 text-red-400'
      case 'high': return 'bg-orange-500/10 border-orange-500/20 text-orange-400'
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
      case 'low': return 'bg-blue-500/10 border-blue-500/20 text-blue-400'
      default: return 'bg-gray-500/10 border-gray-500/20 text-gray-400'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />
      case 'high': return <TrendingDown className="w-4 h-4" />
      case 'medium': return <Eye className="w-4 h-4" />
      case 'low': return <Lightbulb className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full bg-[#111] border-[#222]">
        <CardHeader>
          <div className="h-6 bg-[#333] rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-[#333] rounded animate-pulse"></div>
                <div className="h-3 bg-[#333] rounded animate-pulse w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="w-full bg-[#111] border-[#222] hover:border-[#333] transition-colors">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white text-lg">
              <Zap className="w-5 h-5 text-yellow-500" />
              AI-Powered Alerts
            </CardTitle>
            <div className="flex gap-2">
              <Dialog open={isOptimizationDialogOpen} onOpenChange={setIsOptimizationDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateCampaignOptimizations}
                    disabled={isGeneratingOptimizations}
                    className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#2a2a2a]"
                  >
                    {isGeneratingOptimizations ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/20 border-t-white mr-2" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4 mr-2" />
                        Optimize All
                      </>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] bg-[#111] border-[#333]">
                  <DialogHeader>
                    <DialogTitle className="text-white">Campaign Optimization Recommendations</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      AI-generated recommendations to improve your campaign performance
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                      {optimizations.map((opt, index) => (
                        <Card key={index} className="bg-[#1a1a1a] border-[#333]">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-white font-semibold">{opt.campaign_name}</h3>
                                <p className="text-sm text-gray-400">{opt.brand_name}</p>
                              </div>
                              <Badge className={`${
                                opt.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                opt.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {opt.priority} priority
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                <p className="text-green-400 text-sm font-medium">
                                  💡 {opt.potential_improvement}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-white text-sm font-medium mb-2">Recommendations:</h4>
                                <ul className="space-y-1">
                                  {opt.recommendations.map((rec, i) => (
                                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                                      <span className="text-blue-400 mt-1">•</span>
                                      {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAlerts}
                className="text-gray-400 hover:text-white hover:bg-[#222]"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-gray-400 text-sm">No active alerts</p>
              <p className="text-gray-500 text-xs">Your campaigns are performing well!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-3 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{alert.title}</h4>
                        <p className="text-xs opacity-80 mt-1">{alert.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs border-current">
                            {alert.alert_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs opacity-60">
                            {new Date(alert.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                      className="h-8 w-8 p-0 hover:bg-current/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
