"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUser } from '@clerk/nextjs'
import { getSupabaseClient } from '@/lib/supabase/client'
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
  const { user } = useUser()
  const router = useRouter()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [taskStates, setTaskStates] = useState<TaskState>({})
  const [selectedTodo, setSelectedTodo] = useState<TodoItem | null>(null)

  // Load task states from localStorage
  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`actionCenter_taskStates_${user.id}`)
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
  }, [user?.id])

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
    if (!user?.id) return

    try {
      const supabase = await getSupabaseClient()
      const newTodos: TodoItem[] = []

      // Load ONLY Outreach Items (same as outreach page)
      const { data: outreachCampaigns } = await supabase
        .from('outreach_campaigns')
        .select(`
          *,
          outreach_campaign_leads(
            id,
            status,
            last_contacted_at,
            next_follow_up_date,
            lead:leads(
              id,
              business_name
            )
          )
        `)
        .eq('user_id', user.id)

      if (outreachCampaigns) {
        for (const campaign of outreachCampaigns) {
          const leads = campaign.outreach_campaign_leads || []
          
          // Get current date for comparisons
          const now = new Date()
          const threeDaysAgo = new Date()
          threeDaysAgo.setDate(now.getDate() - 3)
          const fiveDaysAgo = new Date()
          fiveDaysAgo.setDate(now.getDate() - 5)
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(now.getDate() - 7)
          
          // 1. High priority - Responded leads (need immediate attention)
          const respondedLeads = leads.filter((cl: any) => cl.status === 'responded')
          if (respondedLeads.length > 1) {
            // Bulk responded leads
            newTodos.push({
              id: `bulk_responded_many_${campaign.id}`,
              type: 'responded',
              priority: 'high',
              title: `${respondedLeads.length} leads have responded and need immediate attention`,
              description: 'Use the bulk smart response tool to efficiently process all responded leads in sequence',
              count: respondedLeads.length,
              action: 'Start Bulk Smart Response',
              targetPage: '/outreach-tool'
            })
          } else if (respondedLeads.length === 1) {
            // Individual responded lead
            const lead = respondedLeads[0]
            newTodos.push({
              id: `respond_${lead.id}`,
              type: 'responded',
              priority: 'high',
              title: `Respond to ${lead.lead?.business_name || 'lead'}`,
              description: `${lead.lead?.business_name || 'Lead'} responded to your outreach - follow up now!`,
              count: 1,
              action: 'Smart Response',
              targetPage: '/outreach-tool'
            })
          }

          // 2. High priority - Qualified leads (ready to close)
          const qualifiedLeads = leads.filter((cl: any) => cl.status === 'qualified')
          if (qualifiedLeads.length > 1) {
            // Bulk qualified leads
            newTodos.push({
              id: `bulk_contracts_many_${campaign.id}`,
              type: 'hot_leads',
              priority: 'high',
              title: `${qualifiedLeads.length} qualified leads are ready for contracts`,
              description: 'Use the bulk contract generator to efficiently create contracts for all qualified leads in sequence',
              count: qualifiedLeads.length,
              action: 'Generate Contracts',
              targetPage: '/outreach-tool'
            })
          } else if (qualifiedLeads.length === 1) {
            // Individual qualified lead
            const lead = qualifiedLeads[0]
            newTodos.push({
              id: `close_${lead.id}`,
              type: 'hot_leads',
              priority: 'high',
              title: `Send proposal to ${lead.lead?.business_name || 'lead'}`,
              description: `${lead.lead?.business_name || 'Lead'} is qualified and ready for your proposal`,
              count: 1,
              action: 'Send Proposal',
              targetPage: '/outreach-tool'
            })
          }

          // 3. Medium priority - Pending leads (need initial outreach)
          const pendingLeads = leads.filter((cl: any) => cl.status === 'pending')
          if (pendingLeads.length > 1) {
            newTodos.push({
              id: `bulk_pending_many_${campaign.id}`,
              type: 'new_leads',
              priority: 'medium',
              title: `${pendingLeads.length} leads are pending and awaiting outreach`,
              description: 'Use the bulk outreach tool to efficiently process all pending leads in sequence',
              count: pendingLeads.length,
              action: 'Start Bulk Outreach',
              targetPage: '/outreach-tool'
            })
          } else if (pendingLeads.length === 1) {
            const lead = pendingLeads[0]
            newTodos.push({
              id: `contact_${lead.id}`,
              type: 'new_leads',
              priority: 'medium',
              title: `Contact ${lead.lead?.business_name || 'new lead'}`,
              description: `Start outreach to ${lead.lead?.business_name || 'this lead'}`,
              count: 1,
              action: 'Start Outreach',
              targetPage: '/outreach-tool'
            })
          }

          // 4. Medium priority - Follow-up needed (5+ days old, not snoozed)
          const contactedLeads = leads.filter((cl: any) => cl.status === 'contacted')
          const needsFollowUp = contactedLeads.filter((cl: any) => {
            if (!cl.last_contacted_at) return false
            // Exclude snoozed leads (those with future next_follow_up_date)
            if (cl.next_follow_up_date && new Date(cl.next_follow_up_date) > now) return false
            return new Date(cl.last_contacted_at) < fiveDaysAgo
          })
          
          if (needsFollowUp.length > 1) {
            newTodos.push({
              id: `bulk_followup_many_${campaign.id}`,
              type: 'follow_up',
              priority: 'medium',
              title: `${needsFollowUp.length} leads need follow-up (5+ days old)`,
              description: 'Use the bulk follow-up tool to efficiently follow up with all stale leads in sequence',
              count: needsFollowUp.length,
              action: 'Start Bulk Follow-up',
              targetPage: '/outreach-tool'
            })
          } else if (needsFollowUp.length === 1) {
            const lead = needsFollowUp[0]
            newTodos.push({
              id: `followup_${lead.id}`,
              type: 'follow_up',
              priority: 'medium',
              title: `Follow up with ${lead.lead?.business_name || 'lead'}`,
              description: `No contact in 5+ days - time to follow up`,
              count: 1,
              action: 'Follow Up',
              targetPage: '/outreach-tool'
            })
          }

          // 5. High priority - Going cold (7+ days old)
          const goingCold = contactedLeads.filter((cl: any) => {
            if (!cl.last_contacted_at) return false
            // Exclude snoozed leads (those with future next_follow_up_date)
            if (cl.next_follow_up_date && new Date(cl.next_follow_up_date) > now) return false
            return new Date(cl.last_contacted_at) < sevenDaysAgo
          })
          
          if (goingCold.length > 0) {
            newTodos.push({
              id: `going_cold_${campaign.id}`,
              type: 'follow_up',
              priority: 'high',
              title: `${goingCold.length} leads are going cold (7+ days)`,
              description: 'These leads need immediate attention to prevent them from going cold',
              count: goingCold.length,
              action: 'Re-engage Now',
              targetPage: '/outreach-tool'
            })
          }
        }
      }

      setTodos(newTodos)
    } catch (error) {
      console.error('Error generating todos:', error)
    }
  }, [user?.id])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await generateTodos()
      setIsLoading(false)
    }

    if (user?.id) {
      loadData()
    }
  }, [user?.id, generateTodos])

  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'high':
        return { color: 'bg-red-400', label: 'High Priority', borderColor: 'border-red-500/20' }
      case 'medium':
        return { color: 'bg-yellow-400', label: 'Medium Priority', borderColor: 'border-yellow-500/20' }
      case 'low':
        return { color: 'bg-[#2A2A2A]', label: 'Low Priority', borderColor: 'border-[#333]' }
      default:
        return { color: 'bg-[#2A2A2A]', label: 'Priority', borderColor: 'border-[#333]' }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'responded':
        return <MessageSquare className="h-4 w-4 text-green-400" />
      case 'hot_leads':
        return <Star className="h-4 w-4 text-yellow-400" />
      case 'follow_up':
        return <Clock className="h-4 w-4 text-orange-400" />
      case 'new_leads':
        return <Send className="h-4 w-4 text-blue-400" />
      case 'reports':
        return <CheckSquare className="h-4 w-4 text-purple-400" />
      case 'ai_recommendations':
        return <AlertTriangle className="h-4 w-4 text-cyan-400" />
      default:
        return <CheckSquare className="h-4 w-4 text-gray-400" />
    }
  }

  const handleTodoClick = (todo: TodoItem) => {
    setSelectedTodo(todo)
  }

  const handleGoToPage = () => {
    if (selectedTodo) {
      router.push(selectedTodo.targetPage)
      setSelectedTodo(null)
    }
  }

  const activeTodos = todos.filter(todo => isTaskActive(todo.id))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
            <h1 className="text-3xl font-bold text-white">Action Center</h1>
            <p className="text-[#9ca3af] mt-2">Loading your tasks...</p>
            <div className="flex items-center justify-center mt-8">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6">
          <h1 className="text-3xl font-bold text-white">Action Center</h1>
          <p className="text-[#9ca3af] mt-2">Monitor tasks and priorities across your marketing operations</p>
        </div>

        {/* Outreach Tasks Widget */}
        <Card className="bg-[#1a1a1a] border-[#333] shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-gray-400" />
                <CardTitle className="text-white">Outreach Tasks</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-[#2A2A2A] text-gray-300">
                  {activeTodos.length} active
                </Badge>
              </div>
            </div>
            <CardDescription className="text-gray-400">
              Your personalized task list from outreach campaigns and brand monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTodos.length === 0 ? (
              <div className="text-center py-8">
                <div className="p-3 bg-[#2A2A2A] rounded-full w-fit mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <p className="text-sm text-gray-400 mb-1">All caught up!</p>
                <p className="text-xs text-gray-500">No pending tasks right now</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTodos
                  .sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 }
                    return priorityOrder[b.priority] - priorityOrder[a.priority]
                  })
                  .map((todo) => {
                    const priorityInfo = getPriorityInfo(todo.priority)
                    
                    return (
                      <div
                        key={todo.id}
                        className={cn(
                          "relative p-3 rounded-lg border transition-all cursor-pointer",
                          `border-[#333] bg-[#1A1A1A]/50 hover:bg-[#2A2A2A]/50 hover:${priorityInfo.borderColor}`
                        )}
                        onClick={() => handleTodoClick(todo)}
                      >
                        {/* Priority indicator dot */}
                        <div 
                          className={`absolute top-2 right-2 w-2 h-2 rounded-full ${priorityInfo.color}`}
                          title={priorityInfo.label}
                        />
                        
                        <div className="flex items-start gap-3">
                          {getTypeIcon(todo.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-white text-sm pr-4">
                                {todo.title}
                              </h4>
                              <Badge className="bg-white text-black text-xs font-medium px-2 py-1">
                                {todo.count}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">{todo.description}</p>
                            <Button
                              size="sm"
                              className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white border border-[#444] text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleTodoClick(todo)
                              }}
                            >
                              {todo.action}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <Dialog open={!!selectedTodo} onOpenChange={() => setSelectedTodo(null)}>
          <DialogContent className="bg-[#1a1a1a] border-[#333] text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTodo && getTypeIcon(selectedTodo.type)}
                {selectedTodo?.title}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedTodo?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                <span className="text-sm text-gray-300">Task Count:</span>
                <Badge className="bg-white text-black">
                  {selectedTodo?.count}
                </Badge>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={handleGoToPage}
                  className="flex-1 bg-white text-black hover:bg-gray-200"
                >
                  {selectedTodo?.action}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedTodo(null)}
                  className="border-[#444] text-gray-300 hover:bg-[#2A2A2A]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 