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
  name: string
  description?: string
  campaign_type: string
  status: 'active' | 'paused' | 'completed'
  max_leads: number
  leads_contacted: number
  response_rate: string
  conversion_rate: string
  created_at: string
  updated_at: string
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
  lead?: Lead
  campaign?: OutreachCampaign
}

export default function OutreachToolPage() {
  const { getSupabaseClient } = useAuthenticatedSupabase()
  const { selectedBrandId } = useBrandContext()
  const { userId } = useAuth()

  const [activeTab, setActiveTab] = useState('pipeline')
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([])
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([])
  const [selectedCampaignLead, setSelectedCampaignLead] = useState<CampaignLead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [messageType, setMessageType] = useState<'email' | 'sms' | 'linkedin' | 'call'>('email')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Calculate statistics based on campaign leads
  const stats = {
    totalCampaigns: campaigns.length,
    totalLeads: campaignLeads.length,
    newLeads: campaignLeads.filter(cl => cl.status === 'pending').length,
    inProgress: campaignLeads.filter(cl => ['contacted', 'responded'].includes(cl.status)).length,
    signed: campaignLeads.filter(cl => cl.status === 'signed').length,
    lost: campaignLeads.filter(cl => cl.status === 'rejected').length,
    conversionRate: campaignLeads.length > 0 ? (campaignLeads.filter(cl => cl.status === 'signed').length / campaignLeads.length * 100).toFixed(1) : '0',
    activeCampaigns: campaigns.filter(c => c.status === 'active').length
  }

  useEffect(() => {
    if (userId) {
      loadCampaigns()
      loadCampaignLeads()
    }
  }, [userId, selectedBrandId])

  const loadCampaigns = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      const supabase = await getSupabaseClient()
      
      let query = supabase
        .from('outreach_campaigns')
        .select('*')
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

  const loadCampaignLeads = async () => {
    if (!userId) return

    try {
      const supabase = await getSupabaseClient()
      
      // First get campaigns for this user
      const { data: userCampaigns, error: campaignsError } = await supabase
        .from('outreach_campaigns')
        .select('id')
        .eq('user_id', userId)

      if (campaignsError) throw campaignsError

      if (!userCampaigns || userCampaigns.length === 0) {
        setCampaignLeads([])
        return
      }

      const campaignIds = userCampaigns.map(c => c.id)

      // Then get campaign leads for those campaigns with lead data
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
      
      setCampaignLeads(data || [])
    } catch (error) {
      console.error('Error loading campaign leads:', error)
      toast.error('Failed to load campaign leads')
    }
  }

  const generatePersonalizedMessage = async () => {
    if (!selectedCampaignLead || !selectedCampaignLead.lead) {
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
          lead: selectedCampaignLead.lead,
          messageType,
          brandInfo: { name: 'Your Business' }
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate message')
      }

      setGeneratedMessage(data.message)
      setMessageSubject(data.subject || '')
      toast.success('Message generated successfully!')
    } catch (error) {
      console.error('Error generating message:', error)
      toast.error('Failed to generate message')
    } finally {
      setIsGeneratingMessage(false)
    }
  }

  const updateCampaignLeadStatus = async (campaignLeadId: string, newStatus: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('outreach_campaign_leads')
        .update({ 
          status: newStatus,
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignLeadId)

      if (error) throw error
      
      // Refresh the data
      loadCampaignLeads()
      toast.success('Status updated successfully!')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-500/20 text-blue-300 border-blue-500/50'
      case 'contacted': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
      case 'responded': return 'bg-purple-500/20 text-purple-300 border-purple-500/50'
      case 'qualified': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
      case 'signed': return 'bg-green-500/20 text-green-300 border-green-500/50'
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/50'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50'
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
    switch (platform) {
      case 'instagram': return `https://instagram.com/${handle.replace('@', '')}`
      case 'facebook': return `https://facebook.com/${handle}`
      case 'linkedin': return handle.startsWith('http') ? handle : `https://linkedin.com/in/${handle}`
      case 'twitter': return `https://twitter.com/${handle.replace('@', '')}`
      default: return '#'
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading outreach data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-6">


        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalLeads}</div>
              <div className="flex items-center text-sm text-blue-400 mt-1">
                <Users className="h-3 w-3 mr-1" />
                {stats.newLeads} new
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.activeCampaigns}</div>
              <div className="flex items-center text-sm text-blue-400 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stats.inProgress} in progress
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
                {stats.signed} signed
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalCampaigns}</div>
              <div className="flex items-center text-sm text-yellow-400 mt-1">
                <BarChart3 className="h-3 w-3 mr-1" />
                All time
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#1A1A1A] border-[#333]">
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="compose" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
              Compose Message
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-[#333] data-[state=active]:text-white">
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Lead Pipeline</CardTitle>
                    <CardDescription>Track and manage your outreach leads</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40 bg-[#2A2A2A] border-[#333]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="responded">Responded</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="signed">Signed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => { loadCampaignLeads(); loadCampaigns(); }}
                      variant="outline" 
                      size="sm"
                      className="border-[#333] hover:bg-[#222]"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-[#333]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#333] hover:bg-transparent">
                        <TableHead>Business</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Contact</TableHead>
                        <TableHead>Social Media</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(statusFilter === 'all' ? campaignLeads : campaignLeads.filter(cl => cl.status === statusFilter)).map((campaignLead) => (
                        <TableRow key={campaignLead.id} className="border-[#333] hover:bg-[#2A2A2A]">
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-400">{campaignLead.lead?.business_name}</div>
                              <div className="text-sm text-gray-500">{campaignLead.lead?.niche_name}</div>
                              {campaignLead.lead?.website && (
                                <a
                                  href={campaignLead.lead.website.startsWith('http') ? campaignLead.lead.website : `https://${campaignLead.lead.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Visit Website
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              {campaignLead.lead?.owner_name && (
                                <div className="text-gray-400">{campaignLead.lead.owner_name}</div>
                              )}
                              {campaignLead.lead?.email && (
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Mail className="h-3 w-3" />
                                  {campaignLead.lead.email}
                                </div>
                              )}
                              {campaignLead.lead?.phone && (
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Phone className="h-3 w-3" />
                                  {campaignLead.lead.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={campaignLead.status}
                              onValueChange={(value) => updateCampaignLeadStatus(campaignLead.id, value)}
                            >
                              <SelectTrigger className={`w-32 h-8 ${getStatusColor(campaignLead.status)} bg-transparent border`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1A1A1A] border-[#333]">
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="responded">Responded</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="signed">Signed</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-400">
                              {campaignLead.last_contacted_at ? new Date(campaignLead.last_contacted_at).toLocaleDateString() : 'Never'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {campaignLead.lead?.instagram_handle && (
                                <a
                                  href={getSocialMediaLink('instagram', campaignLead.lead.instagram_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-400 hover:text-pink-300"
                                >
                                  {getSocialMediaIcon('instagram')}
                                </a>
                              )}
                              {campaignLead.lead?.facebook_page && (
                                <a
                                  href={getSocialMediaLink('facebook', campaignLead.lead.facebook_page)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  {getSocialMediaIcon('facebook')}
                                </a>
                              )}
                              {campaignLead.lead?.linkedin_profile && (
                                <a
                                  href={getSocialMediaLink('linkedin', campaignLead.lead.linkedin_profile)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  {getSocialMediaIcon('linkedin')}
                                </a>
                              )}
                              {campaignLead.lead?.twitter_handle && (
                                <a
                                  href={getSocialMediaLink('twitter', campaignLead.lead.twitter_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  {getSocialMediaIcon('twitter')}
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
                              onClick={() => {
                                setSelectedCampaignLead(campaignLead)
                                setActiveTab('compose')
                              }}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Message
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compose" className="space-y-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle>Compose Message</CardTitle>
                <CardDescription>Generate AI-powered personalized messages for your leads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-400">Select Lead</Label>
                      <Select
                        value={selectedCampaignLead?.id || ''}
                        onValueChange={(value) => {
                          const campaignLead = campaignLeads.find(cl => cl.id === value)
                          setSelectedCampaignLead(campaignLead || null)
                        }}
                      >
                        <SelectTrigger className="bg-[#2A2A2A] border-[#333]">
                          <SelectValue placeholder="Choose a lead to message" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {campaignLeads.map((campaignLead) => (
                            <SelectItem key={campaignLead.id} value={campaignLead.id}>
                              {campaignLead.lead?.business_name} - {campaignLead.lead?.owner_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-400">Message Type</Label>
                      <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                        <SelectTrigger className="bg-[#2A2A2A] border-[#333]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="linkedin">LinkedIn Message</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="call">Call Script</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={generatePersonalizedMessage}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      disabled={!selectedCampaignLead || isGeneratingMessage}
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

                    {selectedCampaignLead && (
                      <div className="p-4 bg-[#2A2A2A] rounded-lg space-y-2">
                        <div className="text-sm">
                          <span className="text-gray-500">Business:</span>
                          <span className="text-gray-300 ml-2">{selectedCampaignLead.lead?.business_name}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Contact:</span>
                          <span className="text-gray-300 ml-2">{selectedCampaignLead.lead?.owner_name || 'Unknown'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Industry:</span>
                          <span className="text-gray-300 ml-2">{selectedCampaignLead.lead?.niche_name || 'General'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Status:</span>
                          <Badge variant="outline" className={`ml-2 ${getStatusColor(selectedCampaignLead.status)}`}>
                            {selectedCampaignLead.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {messageType === 'email' && (
                      <div>
                        <Label className="text-gray-400">Subject Line</Label>
                        <Input
                          value={messageSubject}
                          onChange={(e) => setMessageSubject(e.target.value)}
                          placeholder="Email subject..."
                          className="bg-[#2A2A2A] border-[#333]"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-gray-400">Message Content</Label>
                      <Textarea
                        value={generatedMessage}
                        onChange={(e) => setGeneratedMessage(e.target.value)}
                        placeholder="Your personalized message will appear here..."
                        className="min-h-[300px] bg-[#2A2A2A] border-[#333]"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigator.clipboard.writeText(generatedMessage)}
                        variant="outline"
                        className="flex-1 border-[#333] hover:bg-[#222]"
                        disabled={!generatedMessage}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Message
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-[#333] hover:bg-[#222]"
                        disabled={!generatedMessage || !selectedCampaignLead}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>Smart recommendations to keep your outreach momentum going</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Update Status - Pending leads sitting too long */}
                {campaignLeads.filter(cl => 
                  cl.status === 'pending' && 
                  new Date(cl.added_at) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
                ).length > 0 && (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-orange-400">Update Lead Status</h3>
                        <p className="text-sm text-gray-300 mb-3">
                          You have {campaignLeads.filter(cl => 
                            cl.status === 'pending' && 
                            new Date(cl.added_at) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
                          ).length} leads sitting in "pending" for 2+ days. Time to reach out or update their status!
                        </p>
                        <div className="space-y-2">
                          {campaignLeads.filter(cl => 
                            cl.status === 'pending' && 
                            new Date(cl.added_at) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
                          ).slice(0, 3).map(cl => (
                            <div key={cl.id} className="flex items-center justify-between bg-[#2A2A2A] p-2 rounded">
                              <div className="flex-1">
                                <span className="text-sm text-gray-300">{cl.lead?.business_name}</span>
                                <div className="text-xs text-gray-500">
                                  Added {Math.floor((Date.now() - new Date(cl.added_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 text-xs px-2"
                                  onClick={() => updateCampaignLeadStatus(cl.id, 'contacted')}
                                >
                                  Mark Contacted
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs px-2"
                                  onClick={() => updateCampaignLeadStatus(cl.id, 'rejected')}
                                >
                                  Not Interested
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Check on Contacted Leads - sitting too long without follow-up */}
                {campaignLeads.filter(cl => 
                  cl.status === 'contacted' && 
                  cl.last_contacted_at && 
                  new Date(cl.last_contacted_at) < new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                ).length > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-red-400">Stale Contacted Leads</h3>
                        <p className="text-sm text-gray-300 mb-3">
                          These leads have been "contacted" for 5+ days. Did they respond? Update their status!
                        </p>
                        <div className="space-y-2">
                          {campaignLeads.filter(cl => 
                            cl.status === 'contacted' && 
                            cl.last_contacted_at && 
                            new Date(cl.last_contacted_at) < new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                          ).slice(0, 3).map(cl => (
                            <div key={cl.id} className="flex items-center justify-between bg-[#2A2A2A] p-2 rounded">
                              <div className="flex-1">
                                <span className="text-sm text-gray-300">{cl.lead?.business_name}</span>
                                <div className="text-xs text-gray-500">
                                  Contacted {Math.floor((Date.now() - new Date(cl.last_contacted_at!).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs px-2"
                                  onClick={() => updateCampaignLeadStatus(cl.id, 'responded')}
                                >
                                  They Responded
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 text-xs px-2"
                                  onClick={() => {
                                    setSelectedCampaignLead(cl)
                                    setActiveTab('compose')
                                  }}
                                >
                                  Follow Up
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs px-2"
                                  onClick={() => updateCampaignLeadStatus(cl.id, 'rejected')}
                                >
                                  No Response
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Follow-up Tasks */}
                {campaignLeads.filter(cl => 
                  cl.status === 'contacted' && 
                  cl.last_contacted_at && 
                  new Date(cl.last_contacted_at) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) &&
                  new Date(cl.last_contacted_at) >= new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                ).length > 0 && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-yellow-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-yellow-400">Follow-up Required</h3>
                        <p className="text-sm text-gray-300 mb-3">
                          You have {campaignLeads.filter(cl => 
                            cl.status === 'contacted' && 
                            cl.last_contacted_at && 
                            new Date(cl.last_contacted_at) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                          ).length} leads that need follow-up (contacted 3+ days ago)
                        </p>
                        <div className="space-y-2">
                          {campaignLeads.filter(cl => 
                            cl.status === 'contacted' && 
                            cl.last_contacted_at && 
                            new Date(cl.last_contacted_at) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                          ).slice(0, 3).map(cl => (
                            <div key={cl.id} className="flex items-center justify-between bg-[#2A2A2A] p-2 rounded">
                              <span className="text-sm text-gray-300">{cl.lead?.business_name}</span>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                                onClick={() => {
                                  setSelectedCampaignLead(cl)
                                  setActiveTab('compose')
                                }}
                              >
                                Follow Up
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Need More Leads */}
                {campaignLeads.filter(cl => cl.status === 'pending').length < 5 && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-blue-400">Generate More Leads</h3>
                        <p className="text-sm text-gray-300 mb-3">
                          You only have {campaignLeads.filter(cl => cl.status === 'pending').length} pending leads. 
                          Keep your pipeline full by generating more leads.
                        </p>
                        <Button 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => window.open('/lead-generator', '_blank')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Generate More Leads
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Responded Leads Need Attention */}
                {campaignLeads.filter(cl => cl.status === 'responded').length > 0 && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-green-400">Hot Leads Responded!</h3>
                        <p className="text-sm text-gray-300 mb-3">
                          {campaignLeads.filter(cl => cl.status === 'responded').length} leads have responded. 
                          Move them to qualified or schedule calls.
                        </p>
                        <div className="space-y-2">
                          {campaignLeads.filter(cl => cl.status === 'responded').slice(0, 3).map(cl => (
                            <div key={cl.id} className="flex items-center justify-between bg-[#2A2A2A] p-2 rounded">
                              <span className="text-sm text-gray-300">{cl.lead?.business_name}</span>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                                onClick={() => updateCampaignLeadStatus(cl.id, 'qualified')}
                              >
                                Mark Qualified
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Daily Outreach Goal */}
                {(() => {
                  const today = new Date().toDateString()
                  const todayContacted = campaignLeads.filter(cl => 
                    cl.last_contacted_at && 
                    new Date(cl.last_contacted_at).toDateString() === today
                  ).length
                  const dailyGoal = 5
                  
                  return todayContacted < dailyGoal && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Target className="h-5 w-5 text-purple-400 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-medium text-purple-400">Daily Outreach Goal</h3>
                          <p className="text-sm text-gray-300 mb-3">
                            You've contacted {todayContacted} leads today. Goal: {dailyGoal} leads per day.
                          </p>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 bg-[#2A2A2A] rounded-full h-2">
                              <div 
                                className="bg-purple-500 h-2 rounded-full transition-all" 
                                style={{ width: `${Math.min((todayContacted / dailyGoal) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-400">{todayContacted}/{dailyGoal}</span>
                          </div>
                          <Button 
                            variant="outline"
                            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                            onClick={() => setActiveTab('pipeline')}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Start Outreach
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Success Celebration */}
                {campaignLeads.filter(cl => cl.status === 'signed').length > 0 && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-emerald-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-emerald-400">🎉 Deals Closed!</h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Awesome! You've closed {campaignLeads.filter(cl => cl.status === 'signed').length} deals. 
                          Keep up the momentum!
                        </p>
                        <Button 
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => window.open('/lead-generator', '_blank')}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate More Leads
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Tasks - All Good */}
                {campaignLeads.length === 0 && (
                  <div className="p-8 text-center">
                    <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No Leads Yet</h3>
                    <p className="text-gray-500 mb-4">Start by generating some leads to begin your outreach.</p>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => window.open('/lead-generator', '_blank')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Your First Leads
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 