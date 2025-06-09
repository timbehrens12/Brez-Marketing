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
import { 
  Loader2, Send, MessageSquare, Phone, Mail, Calendar, 
  CheckCircle, Clock, AlertCircle, Star, Filter, Download, 
  Plus, Edit, Copy, Sparkles, Target, Users, BarChart3
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Lead {
  id: string
  business_name: string
  owner_name?: string
  email?: string
  phone?: string
  website?: string
  city?: string
  state_province?: string
  niche_name?: string
  lead_score: number
  status: string
  priority: string
}

interface OutreachMessage {
  id: string
  lead_id: string
  message_type: 'email' | 'sms' | 'linkedin' | 'call_script'
  subject?: string
  message_content: string
  personalization_data?: any
  status: 'draft' | 'scheduled' | 'sent' | 'replied' | 'bounced'
  scheduled_at?: string
  sent_at?: string
  created_at: string
}

interface Task {
  id: string
  title: string
  description: string
  type: 'outreach' | 'follow_up' | 'research' | 'call'
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed'
  due_date: string
  lead_id?: string
  created_at: string
}

export default function OutreachManagerPage() {
  const [activeTab, setActiveTab] = useState('campaigns')
  const [leads, setLeads] = useState<Lead[]>([])
  const [messages, setMessages] = useState<OutreachMessage[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [messageType, setMessageType] = useState<'email' | 'sms' | 'linkedin' | 'call_script'>('email')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [isAddingTask, setIsAddingTask] = useState(false)

  // Mock data
  useEffect(() => {
    setLeads([
      {
        id: '1',
        business_name: 'FitGear Pro',
        owner_name: 'Sarah Johnson',
        email: 'sarah@fitgearpro.com',
        phone: '+1 (555) 123-4567',
        website: 'https://fitgearpro.com',
        city: 'Austin',
        state_province: 'TX',
        niche_name: 'Fitness & Wellness',
        lead_score: 85,
        status: 'new',
        priority: 'high'
      },
      {
        id: '2',
        business_name: 'Urban Style Boutique',
        owner_name: 'Mike Chen',
        email: 'mike@urbanstyle.com',
        website: 'https://urbanstyle.com',
        city: 'San Francisco',
        state_province: 'CA',
        niche_name: 'Apparel & Fashion',
        lead_score: 72,
        status: 'contacted',
        priority: 'medium'
      }
    ])

    setTasks([
      {
        id: '1',
        title: 'Follow up with FitGear Pro',
        description: 'Send follow-up email about Facebook ads consultation',
        type: 'follow_up',
        priority: 'high',
        status: 'pending',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        lead_id: '1',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        title: 'Research Urban Style competitors',
        description: 'Analyze competitor ad strategies for better pitch',
        type: 'research',
        priority: 'medium',
        status: 'in_progress',
        due_date: new Date(Date.now() + 172800000).toISOString(),
        lead_id: '2',
        created_at: new Date().toISOString()
      }
    ])
  }, [])

  const generatePersonalizedMessage = async () => {
    if (!selectedLead) {
      toast.error('Please select a lead first')
      return
    }

    setIsGeneratingMessage(true)
    
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const templates = {
        email: {
          subject: `Boost ${selectedLead.business_name}'s Revenue with Targeted Facebook Ads`,
          content: `Hi ${selectedLead.owner_name || 'there'},

I noticed ${selectedLead.business_name} has a strong presence in the ${selectedLead.niche_name?.toLowerCase()} space${selectedLead.city ? ` in ${selectedLead.city}` : ''}. Your business caught my attention because of its potential for growth through strategic digital advertising.

I specialize in helping ${selectedLead.niche_name?.toLowerCase()} businesses like yours increase revenue by 30-50% through data-driven Facebook and Instagram ad campaigns.

Here's what I can do for ${selectedLead.business_name}:
• Create high-converting ad creatives that resonate with your target audience
• Set up precise targeting to reach customers ready to buy
• Optimize campaigns for maximum ROI and lowest cost per acquisition
• Provide detailed analytics and regular performance reports

Would you be interested in a 15-minute call this week to discuss how we could scale ${selectedLead.business_name}'s growth? I'd be happy to share some specific strategies that have worked well for other ${selectedLead.niche_name?.toLowerCase()} businesses.

Best regards,
[Your Name]
P.S. I have some quick wins I could implement immediately that typically show results within the first week.`
        },
        sms: {
          content: `Hi ${selectedLead.owner_name || 'there'}! I help ${selectedLead.niche_name?.toLowerCase()} businesses like ${selectedLead.business_name} increase revenue 30-50% with Facebook ads. Interested in a quick chat about scaling your growth? - [Your Name]`
        },
        linkedin: {
          content: `Hi ${selectedLead.owner_name || 'there'},

I came across ${selectedLead.business_name} and was impressed by what you've built in the ${selectedLead.niche_name?.toLowerCase()} space. 

I specialize in helping businesses like yours scale through strategic Facebook advertising. I've helped similar companies increase their revenue by 30-50% within 90 days.

Would you be open to a brief conversation about growth opportunities for ${selectedLead.business_name}?

Best,
[Your Name]`
        },
        call_script: {
          content: `**Opening:**
Hi ${selectedLead.owner_name || 'there'}, this is [Your Name] calling about ${selectedLead.business_name}. I hope I'm catching you at a good time?

**Purpose:**
I specialize in helping ${selectedLead.niche_name?.toLowerCase()} businesses increase their revenue through strategic Facebook advertising, and ${selectedLead.business_name} caught my attention.

**Value Proposition:**
I've helped businesses similar to yours increase revenue by 30-50% within 90 days by:
- Creating high-converting ad campaigns
- Optimizing targeting to reach ready-to-buy customers
- Maximizing ROI while minimizing ad spend

**Question:**
How are you currently handling your digital marketing and advertising?

**Objection Handling:**
"We're already working with someone" → "That's great! How are the results? I might have some additional strategies that could complement what you're already doing."

"Not interested" → "I understand. Could I ask what your biggest challenge is with growing ${selectedLead.business_name} right now?"

**Close:**
Would you be open to a 15-minute conversation this week to explore some quick wins I could implement for ${selectedLead.business_name}?`
        }
      }

      const template = templates[messageType]
      setGeneratedMessage(template.content)
      if (template.subject) {
        setMessageSubject(template.subject)
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
    if (!selectedLead || !generatedMessage) {
      toast.error('Please select a lead and generate a message first')
      return
    }

    const newMessage: OutreachMessage = {
      id: Date.now().toString(),
      lead_id: selectedLead.id,
      message_type: messageType,
      subject: messageSubject,
      message_content: generatedMessage,
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    }

    setMessages(prev => [newMessage, ...prev])
    
    // Update lead status
    setLeads(prev => prev.map(lead => 
      lead.id === selectedLead.id 
        ? { ...lead, status: 'contacted' }
        : lead
    ))

    // Clear form
    setGeneratedMessage('')
    setMessageSubject('')
    setSelectedLead(null)
    
    toast.success(`${messageType} sent successfully!`)
  }

  const completeTask = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: 'completed' }
        : task
    ))
    toast.success('Task completed!')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-300 border-blue-500/50'
      case 'contacted': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
      case 'replied': return 'bg-green-500/20 text-green-300 border-green-500/50'
      case 'closed': return 'bg-gray-500/20 text-gray-300 border-gray-500/50'
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

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Outreach Management System</h1>
            <p className="text-gray-400 mt-2">
              AI-powered personalized communication and lead relationship management
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setIsAddingTask(true)}
              variant="outline"
              className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{leads.length}</div>
              <div className="flex items-center text-sm text-green-400 mt-1">
                <Users className="h-3 w-3 mr-1" />
                Active prospects
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Messages Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{messages.length}</div>
              <div className="flex items-center text-sm text-blue-400 mt-1">
                <Send className="h-3 w-3 mr-1" />
                This week
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Response Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">24%</div>
              <div className="flex items-center text-sm text-yellow-400 mt-1">
                <BarChart3 className="h-3 w-3 mr-1" />
                Above average
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Tasks Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {tasks.filter(task => task.status === 'pending').length}
              </div>
              <div className="flex items-center text-sm text-orange-400 mt-1">
                <Target className="h-3 w-3 mr-1" />
                Due today
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-[#2A2A2A]">
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-[#333] text-gray-400">
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="compose" className="data-[state=active]:bg-[#333] text-gray-400">
              Compose
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-[#333] text-gray-400">
              Tasks
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#333] text-gray-400">
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-400">Lead Pipeline</CardTitle>
                    <CardDescription>
                      Manage your outreach prospects and track progress
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm" className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#333]">
                        <TableHead className="text-gray-400">Business</TableHead>
                        <TableHead className="text-gray-400">Contact</TableHead>
                        <TableHead className="text-gray-400">Score</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Priority</TableHead>
                        <TableHead className="text-gray-400">Last Contact</TableHead>
                        <TableHead className="text-gray-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.id} className="border-[#333] hover:bg-[#222]/50">
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-400">{lead.business_name}</div>
                              <div className="text-sm text-gray-500">{lead.niche_name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm text-gray-400">{lead.owner_name}</div>
                              <div className="text-xs text-gray-500">{lead.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-400" />
                              <span className="text-gray-400">{lead.lead_score}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(lead.status)}>
                              {lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getPriorityIcon(lead.priority)}
                              <span className="text-gray-400 capitalize">{lead.priority}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-400">2 days ago</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
                                onClick={() => {
                                  setSelectedLead(lead)
                                  setActiveTab('compose')
                                }}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Message
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
                    Create personalized outreach messages powered by AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-400">Select Lead</Label>
                    <Select
                      value={selectedLead?.id || ''}
                      onValueChange={(value) => {
                        const lead = leads.find(l => l.id === value)
                        setSelectedLead(lead || null)
                      }}
                    >
                      <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-gray-400">
                        <SelectValue placeholder="Choose a lead to message" />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.business_name} - {lead.owner_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-400">Message Type</Label>
                    <Select
                      value={messageType}
                      onValueChange={(value) => setMessageType(value as any)}
                    >
                      <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-gray-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="linkedin">LinkedIn Message</SelectItem>
                        <SelectItem value="call_script">Call Script</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={generatePersonalizedMessage}
                    disabled={isGeneratingMessage || !selectedLead}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isGeneratingMessage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Personalized Message
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Message Preview & Edit */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-gray-400">Message Preview</CardTitle>
                  <CardDescription>
                    Review and edit your AI-generated message
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {messageType === 'email' && (
                    <div className="space-y-2">
                      <Label className="text-gray-400">Subject Line</Label>
                      <Input
                        value={messageSubject}
                        onChange={(e) => setMessageSubject(e.target.value)}
                        placeholder="Email subject..."
                        className="bg-[#2A2A2A] border-[#444] text-gray-400"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-gray-400">Message Content</Label>
                    <Textarea
                      value={generatedMessage}
                      onChange={(e) => setGeneratedMessage(e.target.value)}
                      placeholder="Your personalized message will appear here..."
                      className="min-h-[300px] bg-[#2A2A2A] border-[#444] text-gray-400"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={sendMessage}
                      disabled={!selectedLead || !generatedMessage}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedMessage)
                        toast.success('Message copied to clipboard!')
                      }}
                      variant="outline"
                      className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-gray-400">Daily Tasks</CardTitle>
                <CardDescription>
                  AI-generated tasks to maximize your outreach success
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-4 border rounded-lg ${
                        task.status === 'completed' 
                          ? 'border-green-500/50 bg-green-500/10' 
                          : 'border-[#333] bg-[#2A2A2A]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getPriorityIcon(task.priority)}
                            <h3 className={`font-medium ${
                              task.status === 'completed' 
                                ? 'text-green-400 line-through' 
                                : 'text-gray-400'
                            }`}>
                              {task.title}
                            </h3>
                            <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                              {task.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                          <div className="text-xs text-gray-600">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {task.status !== 'completed' && (
                            <Button
                              onClick={() => completeTask(task.id)}
                              size="sm"
                              variant="outline"
                              className="border-green-500/50 hover:bg-green-500/20 text-green-400"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-gray-400">Response Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Email</span>
                      <span className="text-green-400">28%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">LinkedIn</span>
                      <span className="text-blue-400">22%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">SMS</span>
                      <span className="text-yellow-400">18%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-gray-400">Best Performing Niches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Fitness & Wellness</span>
                      <span className="text-green-400">35%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Beauty & Cosmetics</span>
                      <span className="text-blue-400">31%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Apparel & Fashion</span>
                      <span className="text-yellow-400">27%</span>
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