import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckSquare, Clock, MessageSquare, Star, Zap, Users } from 'lucide-react'

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
  status: 'pending' | 'contacted' | 'responded' | 'qualified' | 'signed' | 'rejected'
  last_contacted_at?: string
  lead?: {
    business_name: string
  }
}

interface SimpleTodosProps {
  campaignLeads: CampaignLead[]
  onFilterChange: (filters: any) => void
  completedTodos: Set<string>
  onCompleteTodo: (todoId: string) => void
}

const SimpleTodos: React.FC<SimpleTodosProps> = ({ 
  campaignLeads, 
  onFilterChange, 
  completedTodos, 
  onCompleteTodo 
}) => {
  const generateTodos = (): TodoItem[] => {
    if (!campaignLeads.length) return []

    const todos: TodoItem[] = []
    
    // Count leads by status
    const pendingLeads = campaignLeads.filter(cl => cl.status === 'pending')
    const contactedLeads = campaignLeads.filter(cl => cl.status === 'contacted')
    const respondedLeads = campaignLeads.filter(cl => cl.status === 'responded')
    const qualifiedLeads = campaignLeads.filter(cl => cl.status === 'qualified')
    
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

    // Generate todos based on lead status
    if (pendingLeads.length > 0) {
      todos.push({
        id: 'new_leads',
        type: 'new_leads',
        priority: 'high',
        title: `Start outreach for ${pendingLeads.length} new leads`,
        description: 'These leads are ready for initial outreach',
        count: pendingLeads.length,
        action: 'Start Outreach',
        filterAction: () => onFilterChange({ statusFilter: 'pending' })
      })
    }

    if (respondedLeads.length > 0) {
      todos.push({
        id: 'responded',
        type: 'responded',
        priority: 'high',
        title: `${respondedLeads.length} leads responded - follow up now!`,
        description: 'These leads showed interest and need immediate attention',
        count: respondedLeads.length,
        action: 'View Responses',
        filterAction: () => onFilterChange({ statusFilter: 'responded' })
      })
    }

    if (qualifiedLeads.length > 0) {
      todos.push({
        id: 'qualified',
        type: 'hot_leads',
        priority: 'high',
        title: `${qualifiedLeads.length} qualified leads ready for proposals`,
        description: 'These leads are qualified and ready for the next step',
        count: qualifiedLeads.length,
        action: 'Send Proposals',
        filterAction: () => onFilterChange({ statusFilter: 'qualified' })
      })
    }

    if (needsFollowUp.length > 0) {
      todos.push({
        id: 'follow_up',
        type: 'follow_up',
        priority: 'medium',
        title: `Follow up with ${needsFollowUp.length} leads (3+ days)`,
        description: 'These leads were contacted but haven\'t responded yet',
        count: needsFollowUp.length,
        action: 'Send Follow-up',
        filterAction: () => onFilterChange({ statusFilter: 'contacted' })
      })
    }

    if (goingCold.length > 0) {
      todos.push({
        id: 'going_cold',
        type: 'going_cold',
        priority: 'low',
        title: `${goingCold.length} leads going cold (7+ days)`,
        description: 'These leads need urgent follow-up or should be marked as rejected',
        count: goingCold.length,
        action: 'Urgent Follow-up',
        filterAction: () => onFilterChange({ statusFilter: 'contacted' })
      })
    }

    return todos
  }

  const todos = generateTodos()

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

  return (
    <Card className="bg-[#1A1A1A] border-[#333] flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-green-400" />
          Outreach Tasks
        </CardTitle>
        <CardDescription className="text-gray-400">
          Keep track of your outreach process
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {/* Empty state */}
          {todos.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 text-sm mb-4">
                <div className="text-xs text-gray-500 bg-[#2A2A2A] p-2 rounded">
                  🎯 No tasks right now - all caught up!
                </div>
              </div>
            </div>
          )}

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
                className={`p-3 border rounded-lg hover:bg-[#333] transition-all ${getPriorityColor(todo.priority)}`}
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(todo.type)}
                      <h4 className="font-medium text-white text-sm">
                        {todo.title}
                      </h4>
                      {todo.priority === 'high' && (
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-2">
                      {todo.description}
                    </p>
                    <div className="text-xs text-gray-500 mb-2">
                      {todo.count} lead{todo.count > 1 ? 's' : ''}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCompleteTodo(todo.id)}
                    className="p-1 h-6 w-6 text-gray-400 hover:text-green-400 hover:bg-green-500/10 flex-shrink-0 transition-colors"
                    title="Mark as completed"
                  >
                    <CheckSquare className="h-3 w-3" />
                  </Button>
                </div>
                <Button 
                  size="sm" 
                  className="w-full text-xs bg-[#444] hover:bg-[#555] text-gray-300 hover:text-white"
                  onClick={() => todo.filterAction()}
                >
                  {todo.action}
                </Button>
              </div>
            ))}

          {/* Completed Tasks Count */}
          {completedTodos.size > 0 && (
            <div className="pt-3 border-t border-[#333]">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <CheckSquare className="h-3 w-3" />
                <span>{completedTodos.size} tasks completed today</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SimpleTodos 