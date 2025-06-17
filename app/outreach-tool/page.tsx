"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, Send, MessageSquare, Phone, Mail, Calendar, 
  CheckCircle, Clock, AlertCircle, Star, 
  Plus, Edit, Copy, Sparkles, Target, Users, BarChart3, MessageCircle, Bell, RefreshCw,
  Search, Download, Upload, Eye, Filter, TrendingUp, AlertTriangle, Trash2, Archive, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface Lead {
  id: string
  business_name: string
  owner_name?: string
  email?: string
  phone?: string
  website?: string
  city?: string
  state_province?: string
  country?: string
  niche_name?: string
  status: 'new' | 'contacted' | 'responded' | 'qualified' | 'proposal_sent' | 'negotiating' | 'signed' | 'rejected' | 'unresponsive'
  priority: 'low' | 'medium' | 'high'
  lead_score: number
  last_contacted_at?: string
  created_at: string
  instagram_handle?: string
  facebook_page?: string
  linkedin_profile?: string
  twitter_handle?: string
  estimated_revenue?: string
  notes?: string
}

interface OutreachMessage {
  id: string
  lead_id: string
  message_type: 'email' | 'linkedin_dm' | 'instagram_dm' | 'facebook_dm' | 'cold_call_script'
  subject?: string
  content: string
  status: 'generated' | 'reviewed' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced'
  ai_generated: boolean
  sent_at?: string
  opened_at?: string
  replied_at?: string
  response_content?: string
  response_sentiment?: 'positive' | 'negative' | 'neutral'
  created_at: string
}

interface Task {
  id: string
  title: string
  description?: string
  task_type: 'outreach' | 'follow_up' | 'lead_research' | 'campaign_review' | 'custom'
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'snoozed'
  lead_id?: string
  due_date?: string
  ai_generated: boolean
  ai_reasoning?: string
  created_at: string
}

export default function OutreachToolPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [leads, setLeads] = useState<Lead[]>([])
  const [messages, setMessages] = useState<OutreachMessage[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [messageType, setMessageType] = useState<'email' | 'sms' | 'linkedin' | 'call_script'>('email')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  // Analytics state
  const [analytics, setAnalytics] = useState({
    total_leads: 0,
    contacted_leads: 0,
    responded_leads: 0,
    signed_leads: 0,
    response_rate: 0,
    conversion_rate: 0,
    avg_response_time: 0
  })

  useEffect(() => {
    fetchOutreachData()
  }, [])

  const fetchOutreachData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch leads with outreach status
      const leadsResponse = await fetch('/api/leads/outreach')
      const leadsData = await leadsResponse.json()
      
      // Fetch tasks
      const tasksResponse = await fetch('/api/tasks')
      const tasksData = await tasksResponse.json()
      
      // Fetch messages
      const messagesResponse = await fetch('/api/outreach/messages')
      const messagesData = await messagesResponse.json()
      
      // Fetch analytics
      const analyticsResponse = await fetch('/api/outreach/analytics')
      const analyticsData = await analyticsResponse.json()
      
      setLeads(leadsData)
      setTasks(tasksData)
      setMessages(messagesData)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error fetching outreach data:', error)
      toast.error('Failed to load outreach data')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const pendingTasks = tasks.filter(task => task.status === 'pending').slice(0, 5)
  const todayTasks = tasks.filter(task => task.due_date === new Date().toISOString().split('T')[0])

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      'new': 'bg-blue-500',
      'contacted': 'bg-yellow-500', 
      'responded': 'bg-green-500',
      'qualified': 'bg-purple-500',
      'proposal_sent': 'bg-orange-500',
      'negotiating': 'bg-indigo-500',
      'signed': 'bg-emerald-500',
      'rejected': 'bg-red-500',
      'unresponsive': 'bg-gray-500'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-500'
  }

  const getPriorityBadgeColor = (priority: string) => {
    const colors = {
      'low': 'bg-gray-500',
      'medium': 'bg-yellow-500',
      'high': 'bg-red-500'
    }
    return colors[priority as keyof typeof colors] || 'bg-gray-500'
  }

  const generateAIMessage = async (lead: Lead, messageType: string) => {
    try {
      setIsGeneratingMessage(true)
      
      const response = await fetch('/api/outreach/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          message_type: messageType,
          lead_data: lead
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('AI message generated successfully!')
        fetchOutreachData() // Refresh data
      } else {
        toast.error(data.error || 'Failed to generate message')
      }
    } catch (error) {
      console.error('Error generating message:', error)
      toast.error('Failed to generate message')
    } finally {
      setIsGeneratingMessage(false)
    }
  }

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        setLeads(leads.map(lead => 
          lead.id === leadId ? { ...lead, status: newStatus as any } : lead
        ))
        toast.success('Lead status updated!')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const markTaskComplete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'PATCH'
      })
      
      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, status: 'completed' } : task
        ))
        toast.success('Task completed!')
      }
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete task')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading outreach data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Outreach Management</h1>
              <p className="text-gray-400">Manage your lead outreach with AI-powered messaging and automated follow-ups</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => fetchOutreachData()}
                className="bg-[#333] hover:bg-[#444] text-gray-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Import Leads
              </Button>
            </div>
          </div>

          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Leads</p>
                    <p className="text-2xl font-bold text-white">{analytics.total_leads}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Response Rate</p>
                    <p className="text-2xl font-bold text-white">{analytics.response_rate}%</p>
                  </div>
                  <MessageCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Conversion Rate</p>
                    <p className="text-2xl font-bold text-white">{analytics.conversion_rate}%</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Signed Deals</p>
                    <p className="text-2xl font-bold text-white">{analytics.signed_leads}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-[#2A2A2A]">
            <TabsTrigger value="dashboard" className="text-gray-400 data-[state=active]:bg-[#333] data-[state=active]:text-gray-200">Dashboard</TabsTrigger>
            <TabsTrigger value="leads" className="text-gray-400 data-[state=active]:bg-[#333] data-[state=active]:text-gray-200">Leads</TabsTrigger>
            <TabsTrigger value="messages" className="text-gray-400 data-[state=active]:bg-[#333] data-[state=active]:text-gray-200">Messages</TabsTrigger>
            <TabsTrigger value="tasks" className="text-gray-400 data-[state=active]:bg-[#333] data-[state=active]:text-gray-200">Tasks</TabsTrigger>
            <TabsTrigger value="analytics" className="text-gray-400 data-[state=active]:bg-[#333] data-[state=active]:text-gray-200">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Priority Tasks */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Priority Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingTasks.length === 0 ? (
                    <p className="text-gray-400 text-sm">No pending tasks</p>
                  ) : (
                    pendingTasks.map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{task.title}</p>
                          <p className="text-xs text-gray-400">{task.description}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => markTaskComplete(task.id)}
                          className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-500" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Activity items would go here */}
                    <p className="text-gray-400 text-sm">Activity feed coming soon...</p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Today's Tasks</span>
                    <span className="text-white font-medium">{todayTasks.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Messages Sent</span>
                    <span className="text-white font-medium">{messages.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Avg Response Time</span>
                    <span className="text-white font-medium">{analytics.avg_response_time}h</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads by name, email, or business..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#2A2A2A] border-[#444] text-gray-200"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 bg-[#2A2A2A] border-[#444] text-gray-200">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2A] border-[#444]">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="responded">Responded</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="negotiating">Negotiating</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="unresponsive">Unresponsive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-48 bg-[#2A2A2A] border-[#444] text-gray-200">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent className="bg-[#2A2A2A] border-[#444]">
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Leads Table */}
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Leads ({filteredLeads.length})
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-[#333] hover:bg-[#444] text-gray-200">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#333]">
                        <TableHead className="text-gray-400">Business</TableHead>
                        <TableHead className="text-gray-400">Contact</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Priority</TableHead>
                        <TableHead className="text-gray-400">Score</TableHead>
                        <TableHead className="text-gray-400">Last Contact</TableHead>
                        <TableHead className="text-gray-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id} className="border-[#333] hover:bg-[#2A2A2A]">
                          <TableCell>
                            <div>
                              <p className="font-medium text-white">{lead.business_name}</p>
                              <p className="text-sm text-gray-400">{lead.niche_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-white">{lead.owner_name || 'Unknown'}</p>
                              <p className="text-sm text-gray-400">{lead.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={lead.status}
                              onValueChange={(value) => updateLeadStatus(lead.id, value)}
                            >
                              <SelectTrigger className="w-32 h-8 bg-[#2A2A2A] border-[#444]">
                                <Badge className={`${getStatusBadgeColor(lead.status)} text-white text-xs`}>
                                  {lead.status.replace('_', ' ')}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent className="bg-[#2A2A2A] border-[#444]">
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="responded">Responded</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                                <SelectItem value="negotiating">Negotiating</SelectItem>
                                <SelectItem value="signed">Signed</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                                <SelectItem value="unresponsive">Unresponsive</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getPriorityBadgeColor(lead.priority)} text-white`}>
                              {lead.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-[#333] rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full"
                                  style={{ width: `${lead.lead_score}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-400">{lead.lead_score}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-400">
                              {lead.last_contacted_at 
                                ? new Date(lead.last_contacted_at).toLocaleDateString()
                                : 'Never'
                              }
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
                                    onClick={() => setSelectedLead(lead)}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-4xl">
                                  <AIMessageGenerator lead={lead} onGenerate={generateAIMessage} />
                                </DialogContent>
                              </Dialog>
                              
                              <Button 
                                size="sm" 
                                className="h-8 w-8 p-0 bg-[#333] hover:bg-[#444]"
                                onClick={() => setSelectedLead(lead)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Outreach Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="border border-[#333] rounded-lg p-4 bg-[#2A2A2A]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-600 text-white">
                            {message.message_type.replace('_', ' ')}
                          </Badge>
                          <Badge className={`${getStatusBadgeColor(message.status)} text-white`}>
                            {message.status}
                          </Badge>
                          {message.ai_generated && (
                            <Badge className="bg-purple-600 text-white">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-gray-400">
                          {new Date(message.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {message.subject && (
                        <h4 className="font-medium text-white mb-2">{message.subject}</h4>
                      )}
                      
                      <p className="text-gray-300 mb-3">{message.content}</p>
                      
                      {message.response_content && (
                        <div className="bg-[#1A1A1A] p-3 rounded border-l-4 border-green-500">
                          <p className="text-sm text-gray-400 mb-1">Response:</p>
                          <p className="text-gray-300">{message.response_content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Outreach Tasks & To-Do List
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-4 p-4 bg-[#2A2A2A] rounded-lg">
                      <Button
                        size="sm"
                        onClick={() => markTaskComplete(task.id)}
                        className={`h-8 w-8 p-0 ${
                          task.status === 'completed' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-[#444] hover:bg-[#555]'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-white">{task.title}</h4>
                          <Badge className={`${getPriorityBadgeColor(task.priority)} text-white text-xs`}>
                            {task.priority}
                          </Badge>
                          {task.ai_generated && (
                            <Badge className="bg-purple-600 text-white text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Suggested
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{task.description}</p>
                        {task.ai_reasoning && (
                          <p className="text-xs text-purple-400 mt-1">AI Reasoning: {task.ai_reasoning}</p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-400">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-white">Conversion Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Total Leads</span>
                      <span className="text-white font-medium">{analytics.total_leads}</span>
                    </div>
                    <Progress value={(analytics.contacted_leads / analytics.total_leads) * 100} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Contacted</span>
                      <span className="text-white font-medium">{analytics.contacted_leads}</span>
                    </div>
                    <Progress value={(analytics.responded_leads / analytics.total_leads) * 100} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Responded</span>
                      <span className="text-white font-medium">{analytics.responded_leads}</span>
                    </div>
                    <Progress value={(analytics.signed_leads / analytics.total_leads) * 100} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Signed</span>
                      <span className="text-white font-medium">{analytics.signed_leads}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-white">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-500">{analytics.response_rate}%</p>
                      <p className="text-gray-400">Response Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-500">{analytics.conversion_rate}%</p>
                      <p className="text-gray-400">Conversion Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-500">{analytics.avg_response_time}h</p>
                      <p className="text-gray-400">Avg Response Time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// AI Message Generator Component
function AIMessageGenerator({ lead, onGenerate }: { lead: Lead, onGenerate: (lead: Lead, messageType: string) => void }) {
  const [messageType, setMessageType] = useState('email')
  const [isGenerating, setIsGenerating] = useState(false)

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Generate AI Outreach Message
        </DialogTitle>
        <DialogDescription className="text-gray-400">
          Generate a personalized outreach message for {lead.business_name} using AI
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label className="text-gray-400 mb-2 block">Message Type</Label>
          <Select value={messageType} onValueChange={setMessageType}>
            <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#2A2A2A] border-[#444]">
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="linkedin_dm">LinkedIn DM</SelectItem>
              <SelectItem value="instagram_dm">Instagram DM</SelectItem>
              <SelectItem value="facebook_dm">Facebook DM</SelectItem>
              <SelectItem value="cold_call_script">Cold Call Script</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-[#2A2A2A] p-4 rounded-lg">
          <h4 className="text-white font-medium mb-2">Lead Information</h4>
          <div className="text-sm text-gray-400 space-y-1">
            <p><strong>Business:</strong> {lead.business_name}</p>
            <p><strong>Industry:</strong> {lead.niche_name}</p>
            <p><strong>Location:</strong> {lead.city}, {lead.state_province}</p>
            {lead.website && <p><strong>Website:</strong> {lead.website}</p>}
          </div>
        </div>

        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
          <h4 className="text-blue-400 font-medium mb-2">AI will include:</h4>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>• Custom ERT dashboard access (exclusive)</li>
            <li>• AI optimization features for better ad results</li>
            <li>• Competitive advantage over other ad managers</li>
            <li>• Personalized based on their industry and location</li>
            <li>• Professional tone with compelling value proposition</li>
          </ul>
        </div>

        <Button 
          onClick={() => onGenerate(lead, messageType)}
          disabled={isGenerating}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate AI Message
            </>
          )}
        </Button>
      </div>
    </div>
  )
} 