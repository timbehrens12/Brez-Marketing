"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'
import { getSupabaseClient } from '@/lib/supabase/client'
import { 
  RefreshCw,
  CheckSquare, 
  Clock, 
  MessageSquare, 
  Star, 
  Zap, 
  Users,
  Send
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

interface OutreachItem {
  id: string
  type: 'pending' | 'followup' | 'responded' | 'qualified'
  title: string
  description: string
  count: number
  campaignName: string
  href: string
}

interface TodoItem {
  id: string
  type: 'new_leads' | 'follow_up' | 'hot_leads' | 'going_cold' | 'responded'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  count: number
  action: string
  filterAction: () => void
}

interface CampaignLead {
  id: string
  campaign_id: string
  lead_id: string
  status: 'pending' | 'contacted' | 'responded' | 'qualified' | 'signed' | 'rejected'
  added_at: string
  last_contacted_at?: string
  next_follow_up_date?: string
  notes?: string
  lead?: {
    id: string
    business_name: string
    owner_name?: string
    email?: string
    phone?: string
    website?: string
    city?: string
    state_province?: string
    business_type?: string
    niche_name?: string
    instagram_handle?: string
    facebook_page?: string
    linkedin_profile?: string
    twitter_handle?: string
    lead_score?: number
    created_at?: string
  }
  campaign?: {
    id: string
    name: string
    description?: string
    campaign_type: string
    status: 'active' | 'paused' | 'completed'
  }
}

export default function ActionCenterPage() {
  const { userId } = useAuth()
  const { selectedBrandId } = useBrandContext()
  const router = useRouter()
  
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [completedTodos, setCompletedTodos] = useState<Set<string>>(new Set())

  // Load campaign leads
  const loadCampaignLeads = useCallback(async () => {
    if (!userId) return

    try {
      console.log('Loading campaign leads for user:', userId)
      const supabase = await getSupabaseClient()
      
      const { data: userCampaigns, error: campaignsError } = await supabase
        .from('outreach_campaigns')
        .select('id')
        .eq('user_id', userId)

      if (campaignsError) throw campaignsError

      if (!userCampaigns || userCampaigns.length === 0) {
        console.log('No campaigns found, setting empty campaign leads')
        setCampaignLeads([])
        return
      }

      const campaignIds = userCampaigns.map(c => c.id)

      const { data, error } = await supabase
        .from('outreach_campaign_leads')
        .select(`
          *,
          lead:leads(*),
          campaign:outreach_campaigns(*)
        `)
        .in('campaign_id', campaignIds)
        .order('added_at', { ascending: false })

      if (error) throw error
      
      console.log('Loaded campaign leads:', data?.length || 0)
      setCampaignLeads(data || [])
    } catch (error) {
      console.error('Error loading campaign leads:', error)
      setCampaignLeads([])
    }
  }, [userId])

  // Generate todos based on campaign leads
  const generateTodos = useCallback(() => {
    if (!campaignLeads.length) {
      setTodos([])
      return
    }

    const newTodos: TodoItem[] = []
    
    // Count leads by status
    const pendingLeads = campaignLeads.filter(cl => cl.status === 'pending')
    const contactedLeads = campaignLeads.filter(cl => cl.status === 'contacted')
    const respondedLeads = campaignLeads.filter(cl => cl.status === 'responded')
    const qualifiedLeads = campaignLeads.filter(cl => cl.status === 'qualified')
    
    // Get current date for comparisons
    const now = new Date()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(now.getDate() - 3)
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(now.getDate() - 5)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(now.getDate() - 7)
    
    // Get leads that need follow-up (5+ days old and still contacted, not snoozed)
    const needsFollowUp = contactedLeads.filter(cl => {
      if (!cl.last_contacted_at) return false
      // Exclude snoozed leads (those with future next_follow_up_date)
      if (cl.next_follow_up_date && new Date(cl.next_follow_up_date) > now) return false
      return new Date(cl.last_contacted_at) < fiveDaysAgo
    })
    
    // Get leads going cold (7+ days old, not snoozed)
    const goingCold = contactedLeads.filter(cl => {
      if (!cl.last_contacted_at) return false
      // Exclude snoozed leads (those with future next_follow_up_date)
      if (cl.next_follow_up_date && new Date(cl.next_follow_up_date) > now) return false
      return new Date(cl.last_contacted_at) < sevenDaysAgo
    })

    // High priority - Responded leads (need immediate attention)
    if (respondedLeads.length > 0) {
      newTodos.push({
        id: 'responded_leads',
        type: 'responded',
        priority: 'high',
        title: `${respondedLeads.length} leads have responded and need immediate attention`,
        description: 'These leads showed interest and need your response right away',
        count: respondedLeads.length,
        action: 'Respond Now',
        filterAction: () => router.push('/outreach-tool')
      })
    }

    // High priority - Qualified leads (ready to close)
    if (qualifiedLeads.length > 0) {
      newTodos.push({
        id: 'qualified_leads',
        type: 'hot_leads',
        priority: 'high',
        title: `${qualifiedLeads.length} qualified leads are ready for contracts`,
        description: 'These leads are qualified and ready for your proposal',
        count: qualifiedLeads.length,
        action: 'Send Proposals',
        filterAction: () => router.push('/outreach-tool')
      })
    }

    // Medium priority - Pending leads (need initial outreach)
    if (pendingLeads.length > 0) {
      newTodos.push({
        id: 'pending_leads',
        type: 'new_leads',
        priority: 'medium',
        title: `${pendingLeads.length} leads are pending and awaiting outreach`,
        description: 'Start personalized outreach to convert these new leads',
        count: pendingLeads.length,
        action: 'Start Outreach',
        filterAction: () => router.push('/outreach-tool')
      })
    }

    // Medium priority - Contacted leads needing follow-up (7+ days old)
    if (goingCold.length > 0) {
      newTodos.push({
        id: 'going_cold',
        type: 'follow_up',
        priority: 'medium',
        title: `${goingCold.length} leads have been contacted for 7+ days with no updates`,
        description: 'These leads need follow-up outreach or status updates',
        count: goingCold.length,
        action: 'Follow Up',
        filterAction: () => router.push('/outreach-tool')
      })
    }

    // Check for leads whose snooze period has expired
    const unsnoozedLeads = contactedLeads.filter(cl => {
      if (!cl.next_follow_up_date) return false
      return new Date(cl.next_follow_up_date) <= now
    })

    if (unsnoozedLeads.length > 0) {
      newTodos.push({
        id: 'unsnoozed_leads',
        type: 'follow_up',
        priority: 'high',
        title: `${unsnoozedLeads.length} snoozed leads are ready for follow-up`,
        description: 'These leads were snoozed and are now ready for re-engagement',
        count: unsnoozedLeads.length,
        action: 'Follow Up',
        filterAction: () => router.push('/outreach-tool')
      })
    }

    setTodos(newTodos)
  }, [campaignLeads, router])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return
      setIsLoading(true)
      try {
        await loadCampaignLeads()
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [userId, loadCampaignLeads, refreshKey])

  // Generate todos when data changes
  useEffect(() => {
    if (userId && campaignLeads.length >= 0) {
      generateTodos()
    }
  }, [userId, campaignLeads, generateTodos])

  // Load completed todos from localStorage
  useEffect(() => {
    if (!userId) return

    const stored = localStorage.getItem(`completed-todos-${userId}`)
    if (stored) {
      try {
        const completed = JSON.parse(stored)
        setCompletedTodos(new Set(completed))
      } catch (error) {
        console.error('Error loading completed todos:', error)
      }
    }
  }, [userId])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const completeTodo = async (todoId: string) => {
    try {
      setCompletedTodos(prev => new Set([...prev, todoId]))
      
      // Store in localStorage for persistence
      const completed = Array.from(completedTodos)
      completed.push(todoId)
      localStorage.setItem(`completed-todos-${userId}`, JSON.stringify(completed))
      
    } catch (error) {
      console.error('Error completing todo:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500/50 bg-red-900/20'
      case 'medium': return 'border-yellow-500/50 bg-yellow-900/20'
      case 'low': return 'border-gray-500/50 bg-gray-900/20'
      default: return 'border-gray-500/50 bg-gray-900/20'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'new_leads': return <Users className="h-4 w-4 text-blue-400" />
      case 'responded': return <MessageSquare className="h-4 w-4 text-green-400" />
      case 'hot_leads': return <Star className="h-4 w-4 text-yellow-400" />
      case 'follow_up': return <Clock className="h-4 w-4 text-orange-400" />
      case 'going_cold': return <Zap className="h-4 w-4 text-red-400" />
      default: return <CheckSquare className="h-4 w-4 text-gray-400" />
    }
  }

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Loading icon */}
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-white/60 animate-spin"></div>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Action Center
          </h1>
          
          <p className="text-xl text-gray-300 mb-6 font-medium">
            Loading your outreach tasks...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] border border-[#333] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Action Center</h1>
              <p className="text-gray-400">
                Stay on top of your outreach tasks and never miss an opportunity
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              className="bg-white hover:bg-gray-200 text-black"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Outreach Actions Widget */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] border-[#333] h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-xl flex items-center gap-3">
                  <Send className="h-6 w-6 text-blue-400" />
                  Outreach Actions
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Your most important outreach tasks requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Todo Items */}
                {todos
                  .filter(todo => !completedTodos.has(todo.id))
                  .sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 }
                    return priorityOrder[b.priority as keyof typeof priorityOrder] - 
                           priorityOrder[a.priority as keyof typeof priorityOrder]
                  })
                  .map((todo) => (
                    <div 
                      key={todo.id} 
                      className={`p-4 border rounded-lg hover:bg-[#333]/50 transition-all ${getPriorityColor(todo.priority)}`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            {getTypeIcon(todo.type)}
                            <h4 className="font-semibold text-white">
                              {todo.title}
                            </h4>
                            {todo.priority === 'high' && (
                              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 leading-relaxed mb-3">
                            {todo.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{todo.count} lead{todo.count > 1 ? 's' : ''}</span>
                            <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                              {todo.priority} priority
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => completeTodo(todo.id)}
                          className="p-2 h-8 w-8 text-gray-400 hover:text-green-400 hover:bg-green-500/10 flex-shrink-0"
                          title="Mark as completed"
                        >
                          <CheckSquare className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => todo.filterAction()}
                      >
                        {todo.action}
                      </Button>
                    </div>
                  ))}

                {/* Empty state */}
                {todos.filter(todo => !completedTodos.has(todo.id)).length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500 mb-4">
                      <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium text-gray-400 mb-2">All caught up!</h3>
                      <p className="text-sm text-gray-500">
                        No urgent outreach tasks right now. Great work!
                      </p>
                    </div>
                  </div>
                )}

                {/* Completed Tasks Count */}
                {completedTodos.size > 0 && (
                  <div className="pt-4 border-t border-[#333]">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <CheckSquare className="h-4 w-4" />
                      <span>{completedTodos.size} tasks completed today</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Sidebar */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] border-[#333]">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Quick Stats</CardTitle>
                <CardDescription className="text-gray-400">
                  Your outreach pipeline overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-gray-300">Pending</span>
                  </div>
                  <span className="font-semibold text-white">
                    {campaignLeads.filter(cl => cl.status === 'pending').length}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-400" />
                    <span className="text-sm text-gray-300">Contacted</span>
                  </div>
                  <span className="font-semibold text-white">
                    {campaignLeads.filter(cl => cl.status === 'contacted').length}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-300">Responded</span>
                  </div>
                  <span className="font-semibold text-white">
                    {campaignLeads.filter(cl => cl.status === 'responded').length}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-gray-300">Qualified</span>
                  </div>
                  <span className="font-semibold text-white">
                    {campaignLeads.filter(cl => cl.status === 'qualified').length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Action Button */}
            <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] border-[#333]">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Need to get started?</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Jump straight into your outreach tool to manage leads
                </p>
                <Button 
                  onClick={() => router.push('/outreach-tool')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Go to Outreach Tool
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 