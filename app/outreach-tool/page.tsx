"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
  ArrowUpRight, ArrowDownRight, AlertTriangle, Search, Trash2,
  XCircle, MessageCircle, MailOpen, PhoneCall, User,
  Share2, Globe, MapPin, Zap, CircleDot, CheckCircle2,
  Eye
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
  outreach_method?: 'email' | 'phone' | 'linkedin' | 'instagram' | 'facebook'
  dm_sent?: number
  dm_responded?: number
  email_sent?: number
  email_responded?: number
}

interface LeadFilters {
  hasPhone: boolean
  hasEmail: boolean
  hasWebsite: boolean
  hasSocials: boolean
  socialPlatforms: {
    instagram: boolean
    facebook: boolean
    linkedin: boolean
    twitter: boolean
  }
  selectedNicheFilter: string[]
  statusFilter: string
}

export default function OutreachToolPage() {
  const { getSupabaseClient } = useAuthenticatedSupabase()
  const { selectedBrandId } = useBrandContext()
  const { userId } = useAuth()

  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([])
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([])
  const [selectedCampaignLead, setSelectedCampaignLead] = useState<CampaignLead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [messageType, setMessageType] = useState<'email' | 'phone' | 'linkedin' | 'instagram' | 'facebook'>('email')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMessageComposer, setShowMessageComposer] = useState(false)
  const [showOutreachOptions, setShowOutreachOptions] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedSource, setSelectedSource] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  
  // Advanced filters state
  const [filters, setFilters] = useState<LeadFilters>({
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false,
    hasSocials: false,
    socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
    selectedNicheFilter: [],
    statusFilter: 'all'
  })

  // Calculate enhanced statistics
  const stats = {
    totalLeads: campaignLeads.length,
    dmOutreaches: campaignLeads.reduce((acc, cl) => acc + (cl.dm_sent || 0), 0),
    dmResponseRate: campaignLeads.length > 0 ? 
      (campaignLeads.reduce((acc, cl) => acc + (cl.dm_responded || 0), 0) / 
       campaignLeads.reduce((acc, cl) => acc + (cl.dm_sent || 0), 0) * 100 || 0).toFixed(1) : '0',
    emailOutreaches: campaignLeads.reduce((acc, cl) => acc + (cl.email_sent || 0), 0),
    emailResponseRate: campaignLeads.length > 0 ?
      (campaignLeads.reduce((acc, cl) => acc + (cl.email_responded || 0), 0) /
       campaignLeads.reduce((acc, cl) => acc + (cl.email_sent || 0), 0) * 100 || 0).toFixed(1) : '0',
    pending: campaignLeads.filter(cl => cl.status === 'pending').length,
    contacted: campaignLeads.filter(cl => cl.status === 'contacted').length,
    responded: campaignLeads.filter(cl => cl.status === 'responded').length,
    qualified: campaignLeads.filter(cl => cl.status === 'qualified').length,
    signed: campaignLeads.filter(cl => cl.status === 'signed').length,
    rejected: campaignLeads.filter(cl => cl.status === 'rejected').length,
    conversionRate: campaignLeads.length > 0 ? 
      (campaignLeads.filter(cl => cl.status === 'signed').length / campaignLeads.length * 100).toFixed(1) : '0'
  }

  // Get unique niches from leads
  const availableNichesInLeads = [...new Set(campaignLeads.map(cl => cl.lead?.niche_name).filter(Boolean))]

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

  const generatePersonalizedMessage = async (lead: Lead, method: string) => {
    setIsGeneratingMessage(true)
    try {
      const response = await fetch('/api/outreach/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead,
          messageType: method,
          brandInfo: { name: 'Your Business' }
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate message')
      }

      setGeneratedMessage(data.message)
      setMessageSubject(data.subject || '')
      setMessageType(method as any)
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
      
      loadCampaignLeads()
      toast.success('Status updated successfully!')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const deleteCampaignLead = async (campaignLeadId: string) => {
    if (!confirm('Are you sure you want to remove this lead from outreach?')) {
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('outreach_campaign_leads')
        .delete()
        .eq('id', campaignLeadId)

      if (error) throw error
      
      setCampaignLeads(prev => prev.filter(cl => cl.id !== campaignLeadId))
      toast.success('Lead removed from outreach!')
    } catch (error) {
      console.error('Error deleting campaign lead:', error)
      toast.error('Failed to remove lead')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <CircleDot className="h-4 w-4" />
      case 'contacted': return <MessageCircle className="h-4 w-4" />
      case 'responded': return <MessageSquare className="h-4 w-4" />
      case 'qualified': return <Star className="h-4 w-4" />
      case 'signed': return <CheckCircle2 className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <CircleDot className="h-4 w-4" />
    }
  }

  const getOutreachMethods = (lead: Lead) => {
    const methods = []
    if (lead.email) methods.push({ type: 'email', icon: Mail, label: 'Email' })
    if (lead.phone) methods.push({ type: 'phone', icon: Phone, label: 'Call' })
    if (lead.linkedin_profile) methods.push({ type: 'linkedin', icon: Linkedin, label: 'LinkedIn' })
    if (lead.instagram_handle) methods.push({ type: 'instagram', icon: Instagram, label: 'Instagram' })
    if (lead.facebook_page) methods.push({ type: 'facebook', icon: Facebook, label: 'Facebook' })
    return methods
  }

  const getSocialMediaLink = (platform: string, handle: string) => {
    if (!handle) return undefined
    
    switch (platform) {
      case 'instagram':
        return `https://instagram.com/${handle.replace('@', '')}`
      case 'facebook':
        return handle.startsWith('http') ? handle : `https://facebook.com/${handle}`
      case 'linkedin':
        return handle.startsWith('http') ? handle : `https://linkedin.com/in/${handle}`
      case 'twitter':
        return `https://twitter.com/${handle.replace('@', '')}`
      default:
        return undefined
    }
  }

  const getSocialMediaIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="h-4 w-4" />
      case 'facebook':
        return <Facebook className="h-4 w-4" />
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />
      case 'twitter': 
        // Modern X logo using SVG
        return (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        )
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${type} copied to clipboard!`)
    } catch (err) {
      toast.error(`Failed to copy ${type}`)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id))
    } else {
      setSelectedLeads([])
    }
  }

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const handleSendMessage = (lead: CampaignLead) => {
    setSelectedCampaignLead(lead)
    setShowOutreachOptions(true)
  }

  const handleViewDetails = (lead: CampaignLead) => {
    // You can implement a details modal here
    console.log('View details for:', lead)
  }

  const applyFilters = (leads: CampaignLead[]) => {
    return leads.filter(cl => {
      // Status filter
      if (filters.statusFilter !== 'all' && cl.status !== filters.statusFilter) return false
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        if (
          !(cl.lead?.business_name?.toLowerCase().includes(query) ||
            cl.lead?.owner_name?.toLowerCase().includes(query))
        ) return false
      }
      
      // Contact filters
      if (filters.hasPhone && !cl.lead?.phone) return false
      if (filters.hasEmail && !cl.lead?.email) return false
      if (filters.hasWebsite && !cl.lead?.website) return false
      
      // Social filters
      if (filters.hasSocials) {
        const hasSocial = cl.lead?.instagram_handle || cl.lead?.facebook_page || 
                         cl.lead?.linkedin_profile || cl.lead?.twitter_handle
        if (!hasSocial) return false
        
        // Specific platform filters
        if (filters.socialPlatforms.instagram && !cl.lead?.instagram_handle) return false
        if (filters.socialPlatforms.facebook && !cl.lead?.facebook_page) return false
        if (filters.socialPlatforms.linkedin && !cl.lead?.linkedin_profile) return false
        if (filters.socialPlatforms.twitter && !cl.lead?.twitter_handle) return false
      }
      
      // Niche filter
      if (filters.selectedNicheFilter.length > 0 && cl.lead?.niche_name) {
        if (!filters.selectedNicheFilter.includes(cl.lead.niche_name)) return false
      }
      
      return true
    })
  }

  const filteredLeads = applyFilters(campaignLeads)

  if (isLoading) {
  return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading outreach data...</span>
          </div>
          </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header section - this stays at the top */}
      <div className="bg-white border-b p-6 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Outreach Tool</h1>
              <p className="text-gray-600 mt-1">Manage and engage with your leads</p>
            </div>
            <Button 
              onClick={() => { loadCampaignLeads(); loadCampaigns(); }}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </Button>
          </div>

          {/* Filters section */}
          <div className="flex gap-4 mb-4 flex-wrap">
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="apollo">Apollo</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="website">Website</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                                     <SelectItem value="pending">Pending</SelectItem>
                     <SelectItem value="contacted">Contacted</SelectItem>
                     <SelectItem value="responded">Responded</SelectItem>
                     <SelectItem value="qualified">Qualified</SelectItem>
                     <SelectItem value="signed">Signed</SelectItem>
                     <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Leads</p>
                    <p className="text-2xl font-semibold">{stats.totalLeads}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Response Rate</p>
                    <p className="text-2xl font-semibold">{stats.dmResponseRate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-semibold">{stats.conversionRate}%</p>
                  </div>
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">New This Week</p>
                    <p className="text-2xl font-semibold">{stats.signed}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main content area - this will fill remaining space and be scrollable */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col min-h-0">
        <div className="bg-white rounded-lg shadow-sm border flex-1 flex flex-col min-h-0">
          {/* Table header - fixed at top of container */}
          <div className="p-4 border-b bg-gray-50 flex-shrink-0">
            <h2 className="text-lg font-medium text-gray-900">
              Leads ({filteredLeads.length})
            </h2>
          </div>
          
          {/* Scrollable table container - takes remaining space */}
          <div className="flex-1 overflow-auto min-h-0">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Last Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading leads...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No leads found. Try adjusting your filters or generate new leads.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox 
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={() => handleSelectLead(lead.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{lead.lead?.business_name}</TableCell>
                      <TableCell>{lead.lead?.niche_name}</TableCell>
                      <TableCell>{lead.lead?.email}</TableCell>
                      <TableCell>
                                                 <Badge 
                           variant={lead.status === 'signed' ? 'default' : 
                                    lead.status === 'responded' ? 'secondary' : 
                                    lead.status === 'contacted' ? 'outline' : 'default'}
                           className={lead.status === 'signed' ? 'bg-green-100 text-green-800' :
                                     lead.status === 'responded' ? 'bg-blue-100 text-blue-800' :
                                     lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                     lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                                     'bg-gray-100 text-gray-800'}
                         >
                           {lead.status}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         <Badge variant="outline">Campaign</Badge>
                      </TableCell>
                      <TableCell>{lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString() : 'Never'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendMessage(lead)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(lead)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
} 