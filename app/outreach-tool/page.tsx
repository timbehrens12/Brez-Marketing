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
    <div className="min-h-screen bg-black text-white p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Outreach Center</h1>
          <p className="text-gray-400">Manage your lead outreach campaigns with AI-powered messaging</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalLeads}</div>
              <div className="flex items-center text-sm text-gray-400 mt-1">
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
              <div className="flex items-center text-sm text-gray-400 mt-1">
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
              <div className="flex items-center text-sm text-gray-400 mt-1">
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
              <div className="flex items-center text-sm text-gray-400 mt-1">
                <BarChart3 className="h-3 w-3 mr-1" />
                All time
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#2A2A2A] border-none">
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-[#333] data-[state=active]:text-white text-gray-400">
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="compose" className="data-[state=active]:bg-[#333] data-[state=active]:text-white text-gray-400">
              Compose Message
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-[#333] data-[state=active]:text-white text-gray-400">
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Lead Pipeline</CardTitle>
                    <CardDescription className="text-gray-400">Track and manage your outreach leads</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40 bg-[#2A2A2A] border-[#333] text-gray-400">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        <SelectItem value="all" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">All Statuses</SelectItem>
                        <SelectItem value="pending" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Pending</SelectItem>
                        <SelectItem value="contacted" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Contacted</SelectItem>
                        <SelectItem value="responded" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Responded</SelectItem>
                        <SelectItem value="qualified" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Qualified</SelectItem>
                        <SelectItem value="signed" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Signed</SelectItem>
                        <SelectItem value="rejected" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => { loadCampaignLeads(); loadCampaigns(); }}
                      variant="outline" 
                      size="sm"
                      className="border-[#333] hover:bg-[#2A2A2A] text-gray-400 hover:text-white"
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
                        <TableHead className="text-gray-400">Business</TableHead>
                        <TableHead className="text-gray-400">Contact</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Last Contact</TableHead>
                        <TableHead className="text-gray-400">Social Media</TableHead>
                        <TableHead className="text-gray-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(statusFilter === 'all' ? campaignLeads : campaignLeads.filter(cl => cl.status === statusFilter)).map((campaignLead) => (
                        <TableRow key={campaignLead.id} className="border-[#333] hover:bg-[#2A2A2A]">
                          <TableCell>
                            <div>
                              <div className="font-medium text-white">{campaignLead.lead?.business_name}</div>
                              <div className="text-sm text-gray-400">{campaignLead.lead?.niche_name}</div>
                              {campaignLead.lead?.website && (
                                <a
                                  href={campaignLead.lead.website.startsWith('http') ? campaignLead.lead.website : `https://${campaignLead.lead.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1 mt-1"
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
                                <div className="text-gray-300">{campaignLead.lead.owner_name}</div>
                              )}
                              {campaignLead.lead?.email && (
                                <div className="flex items-center gap-1 text-gray-400">
                                  <Mail className="h-3 w-3" />
                                  {campaignLead.lead.email}
                                </div>
                              )}
                              {campaignLead.lead?.phone && (
                                <div className="flex items-center gap-1 text-gray-400">
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
                                <SelectItem value="pending" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Pending</SelectItem>
                                <SelectItem value="contacted" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Contacted</SelectItem>
                                <SelectItem value="responded" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Responded</SelectItem>
                                <SelectItem value="qualified" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Qualified</SelectItem>
                                <SelectItem value="signed" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Signed</SelectItem>
                                <SelectItem value="rejected" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-400">
                              {campaignLead.last_contacted_at ? new Date(campaignLead.last_contacted_at).toLocaleDateString() : 'Never'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {campaignLead.lead?.instagram_handle && (
                                <a
                                  href={getSocialMediaLink('instagram', campaignLead.lead.instagram_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-gray-300"
                                >
                                  {getSocialMediaIcon('instagram')}
                                </a>
                              )}
                              {campaignLead.lead?.facebook_page && (
                                <a
                                  href={getSocialMediaLink('facebook', campaignLead.lead.facebook_page)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-gray-300"
                                >
                                  {getSocialMediaIcon('facebook')}
                                </a>
                              )}
                              {campaignLead.lead?.linkedin_profile && (
                                <a
                                  href={getSocialMediaLink('linkedin', campaignLead.lead.linkedin_profile)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-gray-300"
                                >
                                  {getSocialMediaIcon('linkedin')}
                                </a>
                              )}
                              {campaignLead.lead?.twitter_handle && (
                                <a
                                  href={getSocialMediaLink('twitter', campaignLead.lead.twitter_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-gray-300"
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
                              className="h-8 text-xs border-[#333] hover:bg-[#2A2A2A] text-gray-400 hover:text-white"
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
                <CardTitle className="text-white">Compose Message</CardTitle>
                <CardDescription className="text-gray-400">Generate AI-powered personalized messages for your leads</CardDescription>
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
                        <SelectTrigger className="bg-[#2A2A2A] border-[#333] text-gray-400">
                          <SelectValue placeholder="Choose a lead to message" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {campaignLeads.map((campaignLead) => (
                            <SelectItem key={campaignLead.id} value={campaignLead.id} className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">
                              {campaignLead.lead?.business_name} - {campaignLead.lead?.owner_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-400">Message Type</Label>
                      <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                        <SelectTrigger className="bg-[#2A2A2A] border-[#333] text-gray-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          <SelectItem value="email" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Email</SelectItem>
                          <SelectItem value="linkedin" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">LinkedIn Message</SelectItem>
                          <SelectItem value="sms" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">SMS</SelectItem>
                          <SelectItem value="call" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">Call Script</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={generatePersonalizedMessage}
                      className="w-full bg-[#444] hover:bg-[#555] text-white"
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
                          <span className="text-gray-400">Business:</span>
                          <span className="text-gray-300 ml-2">{selectedCampaignLead.lead?.business_name}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-400">Contact:</span>
                          <span className="text-gray-300 ml-2">{selectedCampaignLead.lead?.owner_name || 'Unknown'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-400">Industry:</span>
                          <span className="text-gray-300 ml-2">{selectedCampaignLead.lead?.niche_name || 'General'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-400">Status:</span>
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
                          className="bg-[#2A2A2A] border-[#333] text-gray-300"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-gray-400">Message Content</Label>
                      <Textarea
                        value={generatedMessage}
                        onChange={(e) => setGeneratedMessage(e.target.value)}
                        placeholder="Your personalized message will appear here..."
                        className="min-h-[300px] bg-[#2A2A2A] border-[#333] text-gray-300"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigator.clipboard.writeText(generatedMessage)}
                        variant="outline"
                        className="flex-1 border-[#333] hover:bg-[#2A2A2A] text-gray-400 hover:text-white"
                        disabled={!generatedMessage}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Message
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-[#333] hover:bg-[#2A2A2A] text-gray-400 hover:text-white"
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
                <CardTitle className="text-white">Action Items</CardTitle>
                <CardDescription className="text-gray-400">Smart recommendations to keep your outreach momentum going</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Update Status - Pending leads sitting too long */}
                {campaignLeads.filter(cl => 
                  cl.status === 'pending' && 
                  new Date(cl.added_at) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
                ).length > 0 && (
                  <div className="p-4 bg-[#2A2A2A] border border-[#444] rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-300">Update Lead Status</h3>
                        <p className="text-sm text-gray-400 mb-3">
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
                            <div key={cl.id} className="flex items-center justify-between bg-[#333] p-2 rounded">
                              <div className="flex-1">
                                <span className="text-sm text-gray-300">{cl.lead?.business_name}</span>
                                <div className="text-xs text-gray-400">
                                  Added {Math.floor((Date.now() - new Date(cl.added_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-[#444] text-gray-300 hover:bg-[#444] text-xs px-2"
                                  onClick={() => updateCampaignLeadStatus(cl.id, 'contacted')}
                                >
                                  Mark Contacted
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-[#444] text-gray-300 hover:bg-[#444] text-xs px-2"
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
                  <div className="p-4 bg-[#2A2A2A] border border-[#444] rounded-lg">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-300">Stale Contacted Leads</h3>
                        <p className="text-sm text-gray-400 mb-3">
                          {campaignLeads.filter(cl => 
                            cl.status === 'contacted' && 
                            cl.last_contacted_at && 
                            new Date(cl.last_contacted_at) < new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                          ).length} leads have been contacted but no follow-up in 5+ days. Consider reaching out again or updating status.
                        </p>
                        <div className="space-y-2">
                          {campaignLeads.filter(cl => 
                            cl.status === 'contacted' && 
                            cl.last_contacted_at && 
                            new Date(cl.last_contacted_at) < new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                          ).slice(0, 3).map(cl => (
                            <div key={cl.id} className="flex items-center justify-between bg-[#333] p-2 rounded">
                              <div className="flex-1">
                                <span className="text-sm text-gray-300">{cl.lead?.business_name}</span>
                                <div className="text-xs text-gray-400">
                                  Last contact {Math.floor((Date.now() - new Date(cl.last_contacted_at!).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-[#444] text-gray-300 hover:bg-[#444] text-xs px-2"
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
                                  className="border-[#444] text-gray-300 hover:bg-[#444] text-xs px-2"
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

                {/* Success Stories - Recent Signed Leads */}
                {campaignLeads.filter(cl => 
                  cl.status === 'signed' && 
                  new Date(cl.added_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length > 0 && (
                  <div className="p-4 bg-[#2A2A2A] border border-[#444] rounded-lg">
                    <div className="flex items-start gap-3">
                      <Star className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-300">Recent Wins</h3>
                        <p className="text-sm text-gray-400 mb-3">
                          Congratulations! You've signed {campaignLeads.filter(cl => 
                            cl.status === 'signed' && 
                            new Date(cl.added_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          ).length} new leads this week!
                        </p>
                        <div className="space-y-1">
                          {campaignLeads.filter(cl => 
                            cl.status === 'signed' && 
                            new Date(cl.added_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          ).slice(0, 3).map(cl => (
                            <div key={cl.id} className="text-sm text-gray-300">
                              ✓ {cl.lead?.business_name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Action Items */}
                {campaignLeads.filter(cl => 
                    cl.status === 'pending' && 
                    new Date(cl.added_at) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
                  ).length === 0 && 
                  campaignLeads.filter(cl => 
                    cl.status === 'contacted' && 
                    cl.last_contacted_at && 
                    new Date(cl.last_contacted_at) < new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                  ).length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">All Caught Up!</h3>
                    <p className="text-sm">No urgent action items right now. Keep up the great work!</p>
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