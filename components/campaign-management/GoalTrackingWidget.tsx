"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Target, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  Calendar,
  CheckCircle
} from "lucide-react"
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Goal {
  id: string
  goal_type: 'revenue' | 'roas' | 'leads'
  target_value: number
  current_value: number
  period_type: 'monthly' | 'quarterly' | 'yearly'
  period_start: string
  period_end: string
  is_active: boolean
  brand_id?: string
}

interface NewGoal {
  goal_type: 'revenue' | 'roas' | 'leads'
  target_value: string
  period_type: 'monthly' | 'quarterly' | 'yearly'
  brand_id?: string
}

export default function GoalTrackingWidget() {
  const { contextBrands, selectedBrandId } = useBrandContext()
  const { userId } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false)
  const [newGoal, setNewGoal] = useState<NewGoal>({
    goal_type: 'revenue',
    target_value: '',
    period_type: 'monthly',
    brand_id: selectedBrandId
  })
  const [isCreatingGoal, setIsCreatingGoal] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetchGoals()
  }, [userId, selectedBrandId])

  useEffect(() => {
    setNewGoal(prev => ({ ...prev, brand_id: selectedBrandId }))
  }, [selectedBrandId])

  const fetchGoals = async () => {
    try {
      setIsLoading(true)
      const supabase = getStandardSupabaseClient()

      let query = supabase
        .from('agency_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (selectedBrandId) {
        query = query.eq('brand_id', selectedBrandId)
      }

      const { data, error } = await query

      if (error) throw error

      const goalsWithCurrentValues = await Promise.all((data || []).map(async (goal) => {
        const currentValue = await calculateCurrentValue(goal)
        return { ...goal, current_value: currentValue }
      }))

      setGoals(goalsWithCurrentValues)

    } catch (error) {
      console.error('Error fetching goals:', error)
      toast.error('Failed to load goals')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateCurrentValue = async (goal: Goal): Promise<number> => {
    try {
      const supabase = getStandardSupabaseClient()
      const periodStart = new Date(goal.period_start).toISOString().split('T')[0]
      const periodEnd = new Date(goal.period_end).toISOString().split('T')[0]

      let brandIds = [goal.brand_id]
      if (!goal.brand_id) {
        // Agency-wide goal - include all brands
        brandIds = contextBrands?.map(b => b.brand_id) || []
      }

      let currentValue = 0

      for (const brandId of brandIds) {
        if (!brandId) continue

        if (goal.goal_type === 'revenue') {
          // Calculate revenue from Meta insights
          const { data: metaData } = await supabase
            .from('meta_ad_insights')
            .select('actions')
            .eq('brand_id', brandId)
            .gte('date_start', periodStart)
            .lte('date_start', periodEnd)

          const revenue = metaData?.reduce((sum, row) => {
            const actions = row.actions ? JSON.parse(row.actions) : []
            const purchaseValue = actions.find((a: any) => a.action_type === 'purchase')?.value || 0
            return sum + parseFloat(purchaseValue || '0')
          }, 0) || 0

          currentValue += revenue

        } else if (goal.goal_type === 'roas') {
          // Calculate ROAS
          const { data: metaData } = await supabase
            .from('meta_ad_insights')
            .select('spend, actions')
            .eq('brand_id', brandId)
            .gte('date_start', periodStart)
            .lte('date_start', periodEnd)

          let totalSpend = 0
          let totalRevenue = 0

          metaData?.forEach(row => {
            totalSpend += parseFloat(row.spend || '0')
            const actions = row.actions ? JSON.parse(row.actions) : []
            const purchaseValue = actions.find((a: any) => a.action_type === 'purchase')?.value || 0
            totalRevenue += parseFloat(purchaseValue || '0')
          })

          const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
          currentValue = Math.max(currentValue, roas) // Use highest ROAS if multiple brands

        } else if (goal.goal_type === 'leads') {
          // Calculate leads
          const { data: metaData } = await supabase
            .from('meta_ad_insights')
            .select('actions')
            .eq('brand_id', brandId)
            .gte('date_start', periodStart)
            .lte('date_start', periodEnd)

          const leads = metaData?.reduce((sum, row) => {
            const actions = row.actions ? JSON.parse(row.actions) : []
            const leadValue = actions.find((a: any) => a.action_type === 'lead')?.value || 0
            return sum + parseInt(leadValue || '0')
          }, 0) || 0

          currentValue += leads
        }
      }

      return currentValue

    } catch (error) {
      console.error('Error calculating current value:', error)
      return 0
    }
  }

  const createGoal = async () => {
    try {
      setIsCreatingGoal(true)
      const supabase = getStandardSupabaseClient()

      // Calculate period dates
      const now = new Date()
      let periodStart: Date
      let periodEnd: Date

      if (newGoal.period_type === 'monthly') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      } else if (newGoal.period_type === 'quarterly') {
        const quarter = Math.floor(now.getMonth() / 3)
        periodStart = new Date(now.getFullYear(), quarter * 3, 1)
        periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0)
      } else {
        periodStart = new Date(now.getFullYear(), 0, 1)
        periodEnd = new Date(now.getFullYear(), 11, 31)
      }

      const { error } = await supabase
        .from('agency_goals')
        .insert({
          user_id: userId,
          brand_id: newGoal.brand_id || null,
          goal_type: newGoal.goal_type,
          target_value: parseFloat(newGoal.target_value),
          period_type: newGoal.period_type,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0]
        })

      if (error) throw error

      toast.success('Goal created successfully!')
      setIsSetupDialogOpen(false)
      setNewGoal({
        goal_type: 'revenue',
        target_value: '',
        period_type: 'monthly',
        brand_id: selectedBrandId
      })
      fetchGoals()

    } catch (error) {
      console.error('Error creating goal:', error)
      toast.error('Failed to create goal')
    } finally {
      setIsCreatingGoal(false)
    }
  }

  const deleteGoal = async (goalId: string) => {
    try {
      const supabase = getStandardSupabaseClient()
      const { error } = await supabase
        .from('agency_goals')
        .update({ is_active: false })
        .eq('id', goalId)

      if (error) throw error

      toast.success('Goal deleted')
      fetchGoals()

    } catch (error) {
      console.error('Error deleting goal:', error)
      toast.error('Failed to delete goal')
    }
  }

  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'revenue': return <DollarSign className="w-4 h-4" />
      case 'roas': return <TrendingUp className="w-4 h-4" />
      case 'leads': return <Users className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getGoalColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-400'
    if (percentage >= 75) return 'text-yellow-400'
    if (percentage >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  const formatGoalValue = (type: string, value: number) => {
    switch (type) {
      case 'revenue': return `$${value.toLocaleString()}`
      case 'roas': return `${value.toFixed(2)}x`
      case 'leads': return value.toLocaleString()
      default: return value.toString()
    }
  }

  const getBrandName = (brandId?: string) => {
    return contextBrands?.find(b => b.brand_id === brandId)?.brand_name || 'Unknown Brand'
  }

  if (isLoading) {
    return (
      <Card className="w-full bg-[#111] border-[#222]">
        <CardHeader>
          <div className="h-6 bg-[#333] rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-[#333] rounded animate-pulse"></div>
                <div className="h-6 bg-[#333] rounded animate-pulse"></div>
                <div className="h-3 bg-[#333] rounded animate-pulse w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!selectedBrandId) {
    return (
      <Card className="w-full bg-[#111] border-[#222]">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-white text-lg">
            <Target className="w-5 h-5 text-blue-500" />
            Goal Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              <Target className="w-12 h-12 text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm mb-2">Select a brand to view goals</p>
            <p className="text-gray-500 text-xs">Goals are tracked per brand in the marketing assistant</p>
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
              <Target className="w-5 h-5 text-blue-500" />
              Goal Tracking
            </CardTitle>
            <Dialog open={isSetupDialogOpen} onOpenChange={setIsSetupDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#2a2a2a]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111] border-[#333]">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Goal</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Set targets for your marketing performance
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="goal_type" className="text-white">Goal Type</Label>
                    <Select value={newGoal.goal_type} onValueChange={(value: any) => 
                      setNewGoal(prev => ({ ...prev, goal_type: value }))
                    }>
                      <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#333]">
                        <SelectItem value="revenue" className="text-white hover:bg-[#333]">Revenue Target</SelectItem>
                        <SelectItem value="roas" className="text-white hover:bg-[#333]">ROAS Target</SelectItem>
                        <SelectItem value="leads" className="text-white hover:bg-[#333]">Lead Generation Target</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="target_value" className="text-white">Target Value</Label>
                    <Input
                      id="target_value"
                      type="number"
                      value={newGoal.target_value}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, target_value: e.target.value }))}
                      placeholder={
                        newGoal.goal_type === 'revenue' ? '10000' :
                        newGoal.goal_type === 'roas' ? '3.5' :
                        '100'
                      }
                      className="bg-[#1a1a1a] border-[#333] text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="period_type" className="text-white">Period</Label>
                    <Select value={newGoal.period_type} onValueChange={(value: any) => 
                      setNewGoal(prev => ({ ...prev, period_type: value }))
                    }>
                      <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#333]">
                        <SelectItem value="monthly" className="text-white hover:bg-[#333]">Monthly</SelectItem>
                        <SelectItem value="quarterly" className="text-white hover:bg-[#333]">Quarterly</SelectItem>
                        <SelectItem value="yearly" className="text-white hover:bg-[#333]">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="brand_id" className="text-white">Brand</Label>
                    <Select value={newGoal.brand_id || selectedBrandId || ''} onValueChange={(value) => 
                      setNewGoal(prev => ({ ...prev, brand_id: value }))
                    }>
                      <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white">
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-[#333]">
                        {contextBrands?.map(brand => (
                          <SelectItem key={brand.brand_id} value={brand.brand_id} className="text-white hover:bg-[#333]">
                            {brand.brand_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={createGoal}
                      disabled={!newGoal.target_value || !newGoal.brand_id || isCreatingGoal}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                    >
                      {isCreatingGoal ? (
                        <>
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/20 border-t-white mr-2" />
                          Creating...
                        </>
                      ) : (
                        'Create Goal'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsSetupDialogOpen(false)}
                      className="bg-[#1a1a1a] border-[#333] text-white hover:bg-[#2a2a2a]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-gray-400 text-sm mb-2">No goals set yet</p>
              <p className="text-gray-500 text-xs mb-4">Create your first goal to start tracking progress</p>
              <Button
                onClick={() => setIsSetupDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Set Up Goals
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal) => {
                const percentage = (goal.current_value / goal.target_value) * 100
                const isCompleted = percentage >= 100

                return (
                  <div key={goal.id} className="border border-[#333] rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getGoalIcon(goal.goal_type)}
                        <span className="text-white font-medium capitalize">
                          {goal.goal_type} Goal
                        </span>
                        {isCompleted && <CheckCircle className="w-4 h-4 text-green-400" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-[#444] text-gray-400">
                          {getBrandName(goal.brand_id)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGoal(goal.id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Progress</span>
                        <span className={`text-sm font-medium ${getGoalColor(percentage)}`}>
                          {formatGoalValue(goal.goal_type, goal.current_value)} / {formatGoalValue(goal.goal_type, goal.target_value)}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, percentage)} 
                        className="h-2 bg-[#222]"
                      />
                      <div className="flex items-center justify-between text-xs">
                        <span className={getGoalColor(percentage)}>
                          {percentage.toFixed(1)}% complete
                        </span>
                        <span className="text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {goal.period_type}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
