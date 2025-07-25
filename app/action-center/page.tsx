"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@clerk/nextjs'
import { getAuthenticatedSupabaseClient, getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { 
  CheckSquare, 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  Star, 
  Send,
  ExternalLink,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface TodoItem {
  id: string
  type: 'responded' | 'hot_leads' | 'new_leads' | 'follow_up' | 'reports' | 'ai_recommendations'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  count: number
  action: string
  targetPage: string
}

interface TaskState {
  [key: string]: {
    status: 'pending' | 'snoozed' | 'completed' | 'dismissed'
    snoozeUntil?: Date
    completedAt?: Date
    dismissedAt?: Date
  }
}

export default function ActionCenterPage() {
  const { userId, getToken } = useAuth()
  const router = useRouter()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [taskStates, setTaskStates] = useState<TaskState>({})
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null)

  // Unified Supabase client function (same as outreach page)
  const getSupabaseClient = async () => {
    try {
      console.log('[Action Center] 🔗 Getting Supabase client...')
      const token = await getToken({ template: 'supabase' })
      if (token) {
        console.log('[Action Center] ✅ Using authenticated client')
        return getAuthenticatedSupabaseClient(token)
      } else {
        console.log('[Action Center] ⚠️ Using standard client (no token)')
        return getStandardSupabaseClient()
      }
    } catch (error) {
      console.error('[Action Center] ❌ Error getting Supabase client:', error)
      return getStandardSupabaseClient()
    }
  }

  // Load task states from localStorage
  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`actionCenter_taskStates_${userId}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert date strings back to Date objects
        Object.keys(parsed).forEach(key => {
          if (parsed[key].snoozeUntil) {
            parsed[key].snoozeUntil = new Date(parsed[key].snoozeUntil)
          }
          if (parsed[key].completedAt) {
            parsed[key].completedAt = new Date(parsed[key].completedAt)
          }
          if (parsed[key].dismissedAt) {
            parsed[key].dismissedAt = new Date(parsed[key].dismissedAt)
          }
        })
        setTaskStates(parsed)
      }
    }
  }, [userId])

  const getTaskState = (taskId: string) => {
    const state = taskStates[taskId]
    if (!state) return { status: 'pending' }
    
    // Check if snoozed task should be reactivated
    if (state.status === 'snoozed' && state.snoozeUntil && state.snoozeUntil < new Date()) {
      return { status: 'pending' }
    }
    
    return state
  }

  const isTaskActive = (taskId: string) => {
    const state = getTaskState(taskId)
    return state.status === 'pending'
  }

  // Generate todos from outreach data and other sources
  const generateTodos = useCallback(async () => {
    if (!userId) return

    try {
      const supabase = await getSupabaseClient() // Use the new local function
      const newTodos: TodoItem[] = []

      console.log('[Action Center] Loading outreach data for user:', userId)

      // Load campaign leads exactly like the outreach page does - as a flat array
      const { data: userCampaigns, error: campaignsError } = await supabase
        .from('outreach_campaigns')
        .select('id')
        .eq('user_id', userId)

      if (campaignsError) {
        console.error('[Action Center] Error loading campaigns:', campaignsError)
        return
      }

      if (!userCampaigns || userCampaigns.length === 0) {
        console.log('[Action Center] No campaigns found')
        setTodos([])
        return
      }

      const campaignIds = userCampaigns.map(c => c.id)

      // Get ALL campaign leads as a flat array (same as outreach page)
      const { data: campaignLeads, error } = await supabase
        .from('outreach_campaign_leads')
        .select(`
          *,
          lead:leads(*)
        `)
        .in('campaign_id', campaignIds)
        .order('added_at', { ascending: false })

      if (error) {
        console.error('[Action Center] Error loading campaign leads:', error)
        return
      }

      console.log('[Action Center] Found campaign leads:', campaignLeads?.length || 0)

      if (!campaignLeads || campaignLeads.length === 0) {
        console.log('[Action Center] No campaign leads found')
        setTodos([])
        return
      }

      // Use EXACT same logic as SimpleTodos component
      // Count leads by status
      const pendingLeads = campaignLeads.filter(cl => cl.status === 'pending')
      const contactedLeads = campaignLeads.filter(cl => cl.status === 'contacted')
      const respondedLeads = campaignLeads.filter(cl => cl.status === 'responded')
      const qualifiedLeads = campaignLeads.filter(cl => cl.status === 'qualified')
      
      console.log('[Action Center] Lead counts:', {
        pending: pendingLeads.length,
        contacted: contactedLeads.length,
        responded: respondedLeads.length,
        qualified: qualifiedLeads.length,
        total: campaignLeads.length
      })
      
      // Get leads contacted more than 3 days ago (need follow-up)
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      const needsFollowUp = contactedLeads.filter(cl => {
        if (!cl.last_contacted_at) return false
        return new Date(cl.last_contacted_at) < threeDaysAgo
      })
      
      // Get leads contacted more than 7 days ago (going cold)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const goingCold = contactedLeads.filter(cl => {
        if (!cl.last_contacted_at) return false
        return new Date(cl.last_contacted_at) < sevenDaysAgo
      })

      console.log('[Action Center] Follow-up counts:', {
        needsFollowUp: needsFollowUp.length,
        goingCold: goingCold.length
      })

      // Generate todos based on lead status (EXACT same logic as simple-todos.tsx)
      if (pendingLeads.length > 0) {
        newTodos.push({
          id: 'new_leads',
          type: 'new_leads',
          priority: 'high',
          title: `Start outreach for ${pendingLeads.length} new leads`,
          description: 'These leads are ready for initial outreach',
          count: pendingLeads.length,
          action: 'Start Outreach',
          targetPage: '/outreach-tool'
        })
      }

      if (respondedLeads.length > 0) {
        newTodos.push({
          id: 'responded',
          type: 'responded',
          priority: 'high',
          title: `${respondedLeads.length} leads responded - follow up now!`,
          description: 'These leads showed interest and need immediate attention',
          count: respondedLeads.length,
          action: 'View Responses',
          targetPage: '/outreach-tool'
        })
      }

      if (qualifiedLeads.length > 0) {
        newTodos.push({
          id: 'qualified',
          type: 'hot_leads',
          priority: 'high',
          title: `${qualifiedLeads.length} qualified leads ready for proposals`,
          description: 'These leads are qualified and ready for the next step',
          count: qualifiedLeads.length,
          action: 'Send Proposals',
          targetPage: '/outreach-tool'
        })
      }

      if (needsFollowUp.length > 0) {
        newTodos.push({
          id: 'follow_up',
          type: 'follow_up',
          priority: 'medium',
          title: `Follow up with ${needsFollowUp.length} leads (3+ days)`,
          description: 'These leads were contacted but haven\'t responded yet',
          count: needsFollowUp.length,
          action: 'Send Follow-up',
          targetPage: '/outreach-tool'
        })
      }

      if (goingCold.length > 0) {
        newTodos.push({
          id: 'going_cold',
          type: 'follow_up',
          priority: 'low',
          title: `${goingCold.length} leads going cold (7+ days)`,
          description: 'These leads need urgent follow-up or should be marked as rejected',
          count: goingCold.length,
          action: 'Urgent Follow-up',
          targetPage: '/outreach-tool'
        })
      }

      console.log('[Action Center] Generated todos:', newTodos.length)
      console.log('[Action Center] Todos:', newTodos)
      setTodos(newTodos)
    } catch (error) {
      console.error('[Action Center] Error generating todos:', error)
    }
  }, [userId, getToken])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        await generateTodos()
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadData()
    }
  }, [userId, generateTodos])

  // Filter active todos (same logic as simple-todos)
  const activeTodos = todos.filter(todo => isTaskActive(todo.id))

  // Get icons and colors (same as simple-todos)
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
      case 'new_leads': return <Send className="h-4 w-4 text-blue-400" />
      case 'responded': return <MessageSquare className="h-4 w-4 text-green-400" />
      case 'hot_leads': return <Star className="h-4 w-4 text-yellow-400" />
      case 'follow_up': return <Clock className="h-4 w-4 text-orange-400" />
      default: return <CheckSquare className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">High</Badge>
      case 'medium': return <Badge variant="secondary" className="text-xs bg-yellow-900 text-yellow-200">Medium</Badge>
      case 'low': return <Badge variant="outline" className="text-xs">Low</Badge>
      default: return <Badge variant="outline" className="text-xs">Normal</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
          <h1 className="text-3xl font-bold text-white">Action Center</h1>
          <p className="text-[#9ca3af] mt-2">Stay on top of your outreach and business priorities</p>
        </div>

        {/* Main Content - Grid Layout for Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* Outreach Tasks Widget - Thin Column */}
          <div className="md:col-span-1">
            <Card className="bg-[#1a1a1a] border border-[#333] h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-blue-400" />
                    <CardTitle className="text-white text-lg">Outreach Tasks</CardTitle>
                  </div>
                  {activeTodos.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {activeTodos.length}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-[#9ca3af] text-sm">
                  Tasks that need your attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : activeTodos.length > 0 ? (
                  activeTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all hover:shadow-md",
                        getPriorityColor(todo.priority)
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getTypeIcon(todo.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5">
                              {todo.count}
                            </Badge>
                            {getPriorityBadge(todo.priority)}
                          </div>
                          <h4 className="font-medium text-white text-sm leading-tight mb-1">
                            {todo.title}
                          </h4>
                          <p className="text-[#9ca3af] text-xs leading-relaxed mb-3">
                            {todo.description}
                          </p>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                                onClick={() => setSelectedTodo(todo)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                {todo.action}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#1a1a1a] border border-[#333]">
                              <DialogHeader>
                                <DialogTitle className="text-white flex items-center gap-2">
                                  {getTypeIcon(todo.type)}
                                  {todo.title}
                                </DialogTitle>
                                <DialogDescription className="text-[#9ca3af]">
                                  {todo.description}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex flex-col gap-4 pt-4">
                                <Button
                                  onClick={() => {
                                    router.push(todo.targetPage)
                                  }}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Go to Outreach Tool
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <h3 className="font-medium text-white mb-1">All caught up!</h3>
                    <p className="text-[#9ca3af] text-sm">No outreach tasks need attention right now.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Placeholder for other widgets */}
          <div className="md:col-span-2 lg:col-span-3">
            <Card className="bg-[#1a1a1a] border border-[#333] h-64">
              <CardHeader>
                <CardTitle className="text-white">More Widgets Coming Soon</CardTitle>
                <CardDescription className="text-[#9ca3af]">
                  Additional action center widgets will be added here
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-32">
                <p className="text-[#9ca3af]">Widget space available</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 