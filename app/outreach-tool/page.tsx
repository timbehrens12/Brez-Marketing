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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Loader2, Send, MessageSquare, Phone, Mail, Calendar, 
  CheckCircle, Clock, AlertCircle, Star, TrendingUp,
  Plus, Edit, Copy, Sparkles, Target, Users, BarChart3,
  Building2, ExternalLink, Linkedin, Twitter, Instagram,
  Facebook, ChevronRight, Filter, RefreshCw, DollarSign,
  ArrowUpRight, ArrowDownRight, AlertTriangle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuthenticatedSupabase } from '@/lib/utils/supabase-auth-client'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'

interface Lead {
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

interface OutreachCampaign {
  id: string
  lead_id: string
  lead?: Lead
  status: 'new' | 'contacted' | 'responded' | 'interested' | 'negotiating' | 'signed' | 'lost'
  last_contact_date?: string
  next_follow_up_date?: string
  notes?: string | null
  deal_value?: number
  created_at: string
  updated_at: string
}

interface OutreachMessage {
  id: string
  campaign_id: string
  message_type: 'email' | 'sms' | 'linkedin' | 'call' | 'other'
  subject?: string
  content: string
  direction: 'outbound' | 'inbound'
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'replied' | 'bounced'
  sent_at?: string
  read_at?: string
  created_at: string
}

interface OutreachTask {
  id: string
  campaign_id?: string
  campaign?: OutreachCampaign
  title: string
  description?: string
  task_type: 'follow_up' | 'call' | 'research' | 'meeting' | 'proposal' | 'other'
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export default function OutreachToolPage() {
  const { getSupabaseClient } = useAuthenticatedSupabase()
  const { selectedBrandId } = useBrandContext()
  const { userId } = useAuth()

  const [activeTab, setActiveTab] = useState('pipeline')
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([])
  const [tasks, setTasks] = useState<OutreachTask[]>([])
  const [messages, setMessages] = useState<OutreachMessage[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<OutreachCampaign | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [messageType, setMessageType] = useState<'email' | 'sms' | 'linkedin' | 'call'>('email')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    task_type: 'follow_up',
    priority: 'medium',
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    campaign_id: ''
  })

  // Calculate statistics
  const stats = {
    totalCampaigns: campaigns.length,
    newLeads: campaigns.filter(c => c.status === 'new').length,
    inProgress: campaigns.filter(c => ['contacted', 'responded', 'interested', 'negotiating'].includes(c.status)).length,
    signed: campaigns.filter(c => c.status === 'signed').length,
    lost: campaigns.filter(c => c.status === 'lost').length,
    totalValue: campaigns.filter(c => c.status === 'signed').reduce((sum, c) => sum + (c.deal_value || 0), 0),
    conversionRate: campaigns.length > 0 ? (campaigns.filter(c => c.status === 'signed').length / campaigns.length * 100).toFixed(1) : '0',
    avgDealSize: campaigns.filter(c => c.status === 'signed' && c.deal_value).length > 0 
      ? campaigns.filter(c => c.status === 'signed').reduce((sum, c) => sum + (c.deal_value || 0), 0) / campaigns.filter(c => c.status === 'signed' && c.deal_value).length
      : 0
  }

  useEffect(() => {
    if (userId) {
      loadCampaigns()
      loadTasks()
    }
  }, [userId, selectedBrandId])

  const loadCampaigns = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      const supabase = await getSupabaseClient()
      
      let query = supabase
        .from('outreach_campaigns')
        .select(`
          *,
          lead:leads(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (selectedBrandId) {
        query = query.eq('brand_id', selectedBrandId)
      }

      const { data, error } = await query

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
      toast.error('Failed to load campaigns')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTasks = async () => {
    if (!userId) return

    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('outreach_tasks')
        .select(`
          *,
          campaign:outreach_campaigns(
            *,
            lead:leads(*)
          )
        `)
        .eq('user_id', userId)
        .order('due_date', { ascending: true })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Failed to load tasks')
    }
  }

  const generatePersonalizedMessage = async () => {
    if (!selectedCampaign || !selectedCampaign.lead) {
      toast.error('Please select a lead first')
      return
    }

    setIsGeneratingMessage(true)
    
    try {
      const response = await fetch('/api/outreach/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead: selectedCampaign.lead,
          messageType,
          brandInfo: { name: 'Your Business' } // You can get this from user profile
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate message')
      }

      const data = await response.json()
      setGeneratedMessage(data.content)
      if (data.subject) {
        setMessageSubject(data.subject)
      }
      
      toast.success('Personalized message generated!')
    } catch (error) {
      console.error('Error generating message:', error)
      toast.error('Failed to generate message')
    } finally {
      setIsGeneratingMessage(false)
    }
  }

  const sendMessage = async () => {
    if (!selectedCampaign || !generatedMessage) {
      toast.error('Please select a lead and generate a message first')
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      // Save message to database
      const { data: message, error } = await supabase
        .from('outreach_messages')
        .insert({
          campaign_id: selectedCampaign.id,
          message_type: messageType,
          subject: messageSubject || undefined,
          content: generatedMessage,
          direction: 'outbound',
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update campaign status and last contact date
      const { error: updateError } = await supabase
        .from('outreach_campaigns')
        .update({
          status: selectedCampaign.status === 'new' ? 'contacted' : selectedCampaign.status,
          last_contact_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCampaign.id)

      if (updateError) throw updateError

      // Create follow-up task
      const followUpDate = new Date()
      followUpDate.setDate(followUpDate.getDate() + 3) // Follow up in 3 days
      
      const { error: taskError } = await supabase
        .from('outreach_tasks')
        .insert({
          campaign_id: selectedCampaign.id,
          user_id: userId,
          title: `Follow up with ${selectedCampaign.lead?.business_name}`,
          description: `Check if they received and read the ${messageType}`,
          task_type: 'follow_up',
          priority: 'medium',
          status: 'pending',
          due_date: followUpDate.toISOString()
        })

      if (taskError) console.error('Error creating follow-up task:', taskError)

      toast.success(`${messageType} sent successfully!`)
      
      // Refresh data
      await loadCampaigns()
      await loadTasks()
      
      // Clear form
      setGeneratedMessage('')
      setMessageSubject('')
      setSelectedCampaign(null)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const updateCampaignStatus = async (campaignId: string, newStatus: string, notes?: string | null, dealValue?: number) => {
    try {
      const supabase = await getSupabaseClient()
      
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }
      
      if (notes !== undefined) updateData.notes = notes === null ? null : notes
      if (dealValue !== undefined) updateData.deal_value = dealValue
      
      const { error } = await supabase
        .from('outreach_campaigns')
        .update(updateData)
        .eq('id', campaignId)
        .eq('user_id', userId!)

      if (error) throw error

      toast.success('Campaign status updated')
      await loadCampaigns()
    } catch (error) {
      console.error('Error updating campaign:', error)
      toast.error('Failed to update campaign')
    }
  }

  const completeTask = async (taskId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('outreach_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', userId!)

      if (error) throw error

      toast.success('Task completed!')
      await loadTasks()
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete task')
    }
  }

  const createTask = async () => {
    if (!userId || !newTaskData.title) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setIsCreatingTask(true)
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('outreach_tasks')
        .insert({
          ...newTaskData,
          user_id: userId,
          status: 'pending',
          due_date: new Date(newTaskData.due_date).toISOString()
        })

      if (error) throw error

      toast.success('Task created successfully!')
      await loadTasks()
      
      // Reset form
      setNewTaskData({
        title: '',
        description: '',
        task_type: 'follow_up',
        priority: 'medium',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        campaign_id: ''
      })
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    } finally {
      setIsCreatingTask(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-300 border-blue-500/50'
      case 'contacted': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
      case 'responded': return 'bg-purple-500/20 text-purple-300 border-purple-500/50'
      case 'interested': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
      case 'negotiating': return 'bg-orange-500/20 text-orange-300 border-orange-500/50'
      case 'signed': return 'bg-green-500/20 text-green-300 border-green-500/50'
      case 'lost': return 'bg-red-500/20 text-red-300 border-red-500/50'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'medium': return <Clock className="h-4 w-4 text-yellow-400" />
      case 'low': return <CheckCircle className="h-4 w-4 text-green-400" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getSocialMediaIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="h-4 w-4" />
      case 'facebook': return <Facebook className="h-4 w-4" />
      case 'linkedin': return <Linkedin className="h-4 w-4" />
      case 'twitter': return <Twitter className="h-4 w-4" />
      default: return null
    }
  }

  const getSocialMediaLink = (platform: string, handle: string) => {
    if (!handle) return null
    
    switch (platform) {
      case 'instagram': return `https://instagram.com/${handle.replace('@', '')}`
      case 'twitter': return `https://twitter.com/${handle.replace('@', '')}`
      case 'linkedin': return handle.includes('linkedin.com') ? handle : `https://linkedin.com/in/${handle}`
      case 'facebook': return handle.includes('facebook.com') ? handle : `https://facebook.com/${handle}`
      default: return null
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getDaysSinceContact = (date?: string) => {
    if (!date) return null
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    return days
  }

  const filteredCampaigns = campaigns.filter(campaign => 
    statusFilter === 'all' || campaign.status === statusFilter
  )

  // Get overdue and upcoming tasks
  const overdueTasks = tasks.filter(task => 
    task.status === 'pending' && new Date(task.due_date) < new Date()
  )
  
  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.due_date).toDateString()
    const today = new Date().toDateString()
    return task.status === 'pending' && taskDate === today
  })

  const upcomingTasks = tasks.filter(task => 
    task.status === 'pending' && new Date(task.due_date) > new Date()
  ).slice(0, 5)

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Outreach CRM</h1>
            <p className="text-gray-400 mt-2">
              AI-powered lead management and personalized outreach campaigns
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setActiveTab('compose')}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Compose Message
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.inProgress}</div>
              <div className="flex items-center text-sm text-blue-400 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.newLeads} new this week
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.conversionRate}%</div>
              <div className="flex items-center text-sm text-green-400 mt-1">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {stats.signed} deals closed
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Pipeline Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalValue)}</div>
              <div className="flex items-center text-sm text-yellow-400 mt-1">
                <DollarSign className="h-3 w-3 mr-1" />
                {formatCurrency(stats.avgDealSize)} avg deal
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Tasks Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {overdueTasks.length + todayTasks.length}
              </div>
              <div className="flex items-center text-sm text-orange-400 mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {overdueTasks.length} overdue
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-[#2A2A2A]">
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-[#333] text-gray-400 data-[state=active]:text-gray-200">
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-[#333] text-gray-400 data-[state=active]:text-gray-200">
              Tasks
            </TabsTrigger>
            <TabsTrigger value="compose" className="data-[state=active]:bg-[#333] text-gray-400 data-[state=active]:text-gray-200">
              Compose
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#333] text-gray-400 data-[state=active]:text-gray-200">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <h2 className="text-lg font-semibold text-gray-400">
                        Lead Pipeline ({filteredCampaigns.length})
                      </h2>
                    </div>
                    <Button
                      onClick={() => setShowFilters(!showFilters)}
                      variant="outline"
                      size="sm"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </div>
                  <Button
                    onClick={loadCampaigns}
                    variant="outline"
                    size="sm"
                    className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filter Panel */}
                {showFilters && (
                  <div className="mb-4 p-4 bg-[#2A2A2A] border border-[#444] rounded-lg">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm font-medium text-gray-400">Status Filter</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-48 bg-[#1A1A1A] border-[#333] text-gray-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="responded">Responded</SelectItem>
                          <SelectItem value="interested">Interested</SelectItem>
                          <SelectItem value="negotiating">Negotiating</SelectItem>
                          <SelectItem value="signed">Signed</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#333]">
                          <TableHead className="text-gray-400">Business</TableHead>
                          <TableHead className="text-gray-400">Contact Info</TableHead>
                          <TableHead className="text-gray-400">Status</TableHead>
                          <TableHead className="text-gray-400">Last Contact</TableHead>
                          <TableHead className="text-gray-400">Deal Value</TableHead>
                          <TableHead className="text-gray-400">Social</TableHead>
                          <TableHead className="text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCampaigns.map((campaign) => (
                          <TableRow key={campaign.id} className="border-[#333] hover:bg-[#222]/50">
                            <TableCell>
                              <div>
                                <div className="font-medium text-gray-400">{campaign.lead?.business_name}</div>
                                <div className="text-sm text-gray-500">{campaign.lead?.niche_name}</div>
                                {campaign.lead?.website && (
                                  <a
                                    href={campaign.lead.website.startsWith('http') ? campaign.lead.website : `https://${campaign.lead.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Website
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                {campaign.lead?.owner_name && (
                                  <div className="text-gray-400">{campaign.lead.owner_name}</div>
                                )}
                                {campaign.lead?.email && (
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <Mail className="h-3 w-3" />
                                    {campaign.lead.email}
                                  </div>
                                )}
                                {campaign.lead?.phone && (
                                  <div className="flex items-center gap-1 text-gray-500">
                                    <Phone className="h-3 w-3" />
                                    {campaign.lead.phone}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={campaign.status}
                                onValueChange={(value) => updateCampaignStatus(campaign.id, value)}
                              >
                                <SelectTrigger className={`w-32 h-8 ${getStatusColor(campaign.status)} bg-transparent border`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1A1A1A] border-[#333]">
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="contacted">Contacted</SelectItem>
                                  <SelectItem value="responded">Responded</SelectItem>
                                  <SelectItem value="interested">Interested</SelectItem>
                                  <SelectItem value="negotiating">Negotiating</SelectItem>
                                  <SelectItem value="signed">Signed</SelectItem>
                                  <SelectItem value="lost">Lost</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {campaign.last_contact_date ? (
                                <div className="text-sm">
                                  <div className="text-gray-400">
                                    {getDaysSinceContact(campaign.last_contact_date)} days ago
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(campaign.last_contact_date).toLocaleDateString()}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-500">Never contacted</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {campaign.status === 'signed' && campaign.deal_value ? (
                                <div className="text-green-400 font-medium">
                                  {formatCurrency(campaign.deal_value)}
                                </div>
                              ) : campaign.status === 'negotiating' ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-gray-400 hover:text-white"
                                  onClick={() => {
                                    const value = prompt('Enter deal value:')
                                    if (value && !isNaN(Number(value))) {
                                      updateCampaignStatus(campaign.id, campaign.status, undefined, Number(value))
                                    }
                                  }}
                                >
                                  Set value
                                </Button>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {campaign.lead?.instagram_handle && (
                                  <a
                                    href={getSocialMediaLink('instagram', campaign.lead.instagram_handle)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-pink-400 hover:text-pink-300"
                                  >
                                    {getSocialMediaIcon('instagram')}
                                  </a>
                                )}
                                {campaign.lead?.facebook_page && (
                                  <a
                                    href={getSocialMediaLink('facebook', campaign.lead.facebook_page)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    {getSocialMediaIcon('facebook')}
                                  </a>
                                )}
                                {campaign.lead?.linkedin_profile && (
                                  <a
                                    href={getSocialMediaLink('linkedin', campaign.lead.linkedin_profile)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:text-blue-400"
                                  >
                                    {getSocialMediaIcon('linkedin')}
                                  </a>
                                )}
                                {campaign.lead?.twitter_handle && (
                                  <a
                                    href={getSocialMediaLink('twitter', campaign.lead.twitter_handle)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-white"
                                  >
                                    {getSocialMediaIcon('twitter')}
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
                                  onClick={() => {
                                    setSelectedCampaign(campaign)
                                    setActiveTab('compose')
                                  }}
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Message
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-gray-400 hover:text-white"
                                  onClick={() => {
                                    const notes = prompt('Add notes:', campaign.notes || '')
                                    if (notes !== null) {
                                      updateCampaignStatus(campaign.id, campaign.status, notes || undefined)
                                    }
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {filteredCampaigns.length === 0 && !isLoading && (
                  <div className="text-center py-12 text-gray-400">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No campaigns found</p>
                    <p className="text-sm">Send leads from the Lead Generator to start outreach</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overdue Tasks */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-gray-400 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    Overdue ({overdueTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {overdueTasks.map((task) => (
                        <div key={task.id} className="p-3 bg-[#2A2A2A] rounded-lg border border-red-500/30">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-300">{task.title}</h4>
                              {task.description && (
                                <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                              )}
                              {task.campaign?.lead && (
                                <p className="text-xs text-gray-400 mt-2">
                                  {task.campaign.lead.business_name}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs bg-red-500/20 text-red-300 border-red-500/50">
                                  {Math.abs(getDaysSinceContact(task.due_date) || 0)} days overdue
                                </Badge>
                                {getPriorityIcon(task.priority)}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => completeTask(task.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {overdueTasks.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No overdue tasks</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Today's Tasks */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-gray-400 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-yellow-400" />
                    Today ({todayTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {todayTasks.map((task) => (
                        <div key={task.id} className="p-3 bg-[#2A2A2A] rounded-lg border border-yellow-500/30">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-300">{task.title}</h4>
                              {task.description && (
                                <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                              )}
                              {task.campaign?.lead && (
                                <p className="text-xs text-gray-400 mt-2">
                                  {task.campaign.lead.business_name}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
                                  Due today
                                </Badge>
                                {getPriorityIcon(task.priority)}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => completeTask(task.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {todayTasks.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No tasks due today</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Upcoming Tasks */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-gray-400 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-400" />
                    Upcoming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {upcomingTasks.map((task) => (
                        <div key={task.id} className="p-3 bg-[#2A2A2A] rounded-lg border border-[#444]">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-300">{task.title}</h4>
                              {task.description && (
                                <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                              )}
                              {task.campaign?.lead && (
                                <p className="text-xs text-gray-400 mt-2">
                                  {task.campaign.lead.business_name}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs bg-[#333] text-gray-400 border-[#444]">
                                  {new Date(task.due_date).toLocaleDateString()}
                                </Badge>
                                {getPriorityIcon(task.priority)}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => completeTask(task.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {upcomingTasks.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No upcoming tasks</p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Create Task */}
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-gray-400">Create New Task</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Title *</Label>
                    <Input
                      value={newTaskData.title}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-[#2A2A2A] border-[#444] text-gray-400"
                      placeholder="Task title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Type</Label>
                    <Select
                      value={newTaskData.task_type}
                      onValueChange={(value) => setNewTaskData(prev => ({ ...prev, task_type: value }))}
                    >
                      <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-gray-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="research">Research</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Priority</Label>
                    <Select
                      value={newTaskData.priority}
                      onValueChange={(value) => setNewTaskData(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-gray-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-400">Due Date</Label>
                    <Input
                      type="date"
                      value={newTaskData.due_date}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, due_date: e.target.value }))}
                      className="bg-[#2A2A2A] border-[#444] text-gray-400"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-gray-400">Campaign (Optional)</Label>
                    <Select
                      value={newTaskData.campaign_id}
                      onValueChange={(value) => setNewTaskData(prev => ({ ...prev, campaign_id: value }))}
                    >
                      <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-gray-400">
                        <SelectValue placeholder="Select a campaign" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        <SelectItem value="">No campaign</SelectItem>
                        {campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.lead?.business_name} - {campaign.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2 lg:col-span-4">
                    <Label className="text-gray-400">Description</Label>
                    <Textarea
                      value={newTaskData.description}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-[#2A2A2A] border-[#444] text-gray-400"
                      placeholder="Task description (optional)"
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2 lg:col-span-4">
                    <Button
                      onClick={createTask}
                      className="bg-[#444] hover:bg-[#555] text-gray-200"
                      disabled={isCreatingTask || !newTaskData.title}
                    >
                      {isCreatingTask ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      Create Task
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compose Tab */}
          <TabsContent value="compose" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lead Selection & Message Type */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-400">
                    <Sparkles className="h-5 w-5" />
                    AI Message Generator
                  </CardTitle>
                  <CardDescription>
                    Create personalized outreach messages that highlight your AI-powered marketing dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Select Lead</Label>
                    <Select
                      value={selectedCampaign?.id || ''}
                      onValueChange={(value) => {
                        const campaign = campaigns.find(c => c.id === value)
                        setSelectedCampaign(campaign || null)
                      }}
                    >
                      <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-gray-400">
                        <SelectValue placeholder="Choose a lead to message" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        {campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.lead?.business_name} - {campaign.lead?.owner_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-400">Message Type</Label>
                    <Tabs value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                      <TabsList className="grid w-full grid-cols-4 bg-[#2A2A2A]">
                        <TabsTrigger value="email" className="data-[state=active]:bg-[#333] text-gray-400">
                          <Mail className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger value="linkedin" className="data-[state=active]:bg-[#333] text-gray-400">
                          <Linkedin className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger value="sms" className="data-[state=active]:bg-[#333] text-gray-400">
                          <MessageSquare className="h-4 w-4" />
                        </TabsTrigger>
                        <TabsTrigger value="call" className="data-[state=active]:bg-[#333] text-gray-400">
                          <Phone className="h-4 w-4" />
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <Button
                    onClick={generatePersonalizedMessage}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    disabled={!selectedCampaign || isGeneratingMessage}
                  >
                    {isGeneratingMessage ? (
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

                  {selectedCampaign && (
                    <div className="p-4 bg-[#2A2A2A] rounded-lg space-y-2">
                      <div className="text-sm">
                        <span className="text-gray-500">Business:</span>
                        <span className="text-gray-300 ml-2">{selectedCampaign.lead?.business_name}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Contact:</span>
                        <span className="text-gray-300 ml-2">{selectedCampaign.lead?.owner_name || 'Unknown'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Industry:</span>
                        <span className="text-gray-300 ml-2">{selectedCampaign.lead?.niche_name || 'General'}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500">Status:</span>
                        <Badge variant="outline" className={`ml-2 ${getStatusColor(selectedCampaign.status)}`}>
                          {selectedCampaign.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Message Preview & Edit */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-gray-400">Message Preview</CardTitle>
                  <CardDescription>
                    Review and customize your message before sending
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messageType === 'email' && (
                    <div className="space-y-2">
                      <Label className="text-gray-400">Subject Line</Label>
                      <Input
                        value={messageSubject}
                        onChange={(e) => setMessageSubject(e.target.value)}
                        className="bg-[#2A2A2A] border-[#444] text-gray-300"
                        placeholder="Email subject"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-gray-400">Message Content</Label>
                    <Textarea
                      value={generatedMessage}
                      onChange={(e) => setGeneratedMessage(e.target.value)}
                      className="bg-[#2A2A2A] border-[#444] text-gray-300"
                      placeholder="Your personalized message will appear here..."
                      rows={messageType === 'sms' ? 4 : 12}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={sendMessage}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      disabled={!generatedMessage || !selectedCampaign}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedMessage)
                        toast.success('Message copied to clipboard!')
                      }}
                      className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
                      disabled={!generatedMessage}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Conversion Funnel */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-gray-400">Conversion Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { stage: 'New Leads', count: stats.totalCampaigns, color: 'bg-blue-500' },
                      { stage: 'Contacted', count: campaigns.filter(c => c.status !== 'new').length, color: 'bg-yellow-500' },
                      { stage: 'Responded', count: campaigns.filter(c => ['responded', 'interested', 'negotiating', 'signed'].includes(c.status)).length, color: 'bg-purple-500' },
                      { stage: 'Interested', count: campaigns.filter(c => ['interested', 'negotiating', 'signed'].includes(c.status)).length, color: 'bg-indigo-500' },
                      { stage: 'Negotiating', count: campaigns.filter(c => ['negotiating', 'signed'].includes(c.status)).length, color: 'bg-orange-500' },
                      { stage: 'Signed', count: stats.signed, color: 'bg-green-500' },
                    ].map((stage, index) => (
                      <div key={stage.stage} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{stage.stage}</span>
                          <span className="text-gray-300">{stage.count}</span>
                        </div>
                        <div className="w-full bg-[#2A2A2A] rounded-full h-2">
                          <div
                            className={`${stage.color} h-2 rounded-full transition-all`}
                            style={{ width: `${stats.totalCampaigns > 0 ? (stage.count / stats.totalCampaigns * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-gray-400">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                      <div>
                        <p className="text-sm text-gray-500">Response Rate</p>
                        <p className="text-xl font-bold text-white">
                          {campaigns.length > 0 
                            ? Math.round((campaigns.filter(c => ['responded', 'interested', 'negotiating', 'signed'].includes(c.status)).length / campaigns.filter(c => c.status !== 'new').length) * 100) || 0
                            : 0}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-400" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                      <div>
                        <p className="text-sm text-gray-500">Avg Days to Close</p>
                        <p className="text-xl font-bold text-white">
                          {campaigns.filter(c => c.status === 'signed' && c.created_at).length > 0
                            ? Math.round(
                                campaigns
                                  .filter(c => c.status === 'signed' && c.created_at)
                                  .reduce((sum, c) => {
                                    const days = Math.floor((new Date().getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
                                    return sum + days
                                  }, 0) / campaigns.filter(c => c.status === 'signed').length
                              )
                            : 0}
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-blue-400" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                      <div>
                        <p className="text-sm text-gray-500">Win Rate</p>
                        <p className="text-xl font-bold text-white">
                          {campaigns.filter(c => ['signed', 'lost'].includes(c.status)).length > 0
                            ? Math.round((stats.signed / campaigns.filter(c => ['signed', 'lost'].includes(c.status)).length) * 100)
                            : 0}%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue by Status */}
              <Card className="bg-[#1A1A1A] border-[#333] md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-gray-400">Pipeline by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-[#333]">
                          <TableHead className="text-gray-400">Status</TableHead>
                          <TableHead className="text-gray-400 text-center">Count</TableHead>
                          <TableHead className="text-gray-400 text-right">Total Value</TableHead>
                          <TableHead className="text-gray-400 text-right">Avg Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {['new', 'contacted', 'responded', 'interested', 'negotiating', 'signed', 'lost'].map(status => {
                          const statusCampaigns = campaigns.filter(c => c.status === status)
                          const totalValue = statusCampaigns.reduce((sum, c) => sum + (c.deal_value || 0), 0)
                          const avgValue = statusCampaigns.filter(c => c.deal_value).length > 0
                            ? totalValue / statusCampaigns.filter(c => c.deal_value).length
                            : 0

                          return (
                            <TableRow key={status} className="border-[#333]">
                              <TableCell>
                                <Badge variant="outline" className={getStatusColor(status)}>
                                  {status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-gray-400">
                                {statusCampaigns.length}
                              </TableCell>
                              <TableCell className="text-right text-gray-400">
                                {formatCurrency(totalValue)}
                              </TableCell>
                              <TableCell className="text-right text-gray-400">
                                {formatCurrency(avgValue)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
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