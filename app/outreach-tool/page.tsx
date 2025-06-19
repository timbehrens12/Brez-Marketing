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
  Share2, Globe, MapPin, Zap, CircleDot, CheckCircle2
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

// Lead management constants
const MAX_PENDING_LEADS = 75 // Maximum pending leads allowed
const MAX_TOTAL_LEADS = 200 // Maximum total leads in outreach
const WARNING_THRESHOLD = 0.8 // Show warning at 80% of limit

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
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
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

  const deleteBulkCampaignLeads = async () => {
    if (selectedLeads.length === 0) return
    
    if (!confirm(`Are you sure you want to remove ${selectedLeads.length} leads from outreach?`)) {
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('outreach_campaign_leads')
        .delete()
        .in('id', selectedLeads)

      if (error) throw error
      
      setCampaignLeads(prev => prev.filter(cl => !selectedLeads.includes(cl.id)))
      setSelectedLeads([])
      setIsSelectAll(false)
      toast.success(`${selectedLeads.length} leads removed from outreach!`)
    } catch (error) {
      console.error('Error deleting campaign leads:', error)
      toast.error('Failed to remove leads')
    }
  }

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId])
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId))
      setIsSelectAll(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(cl => cl.id))
      setIsSelectAll(true)
    } else {
      setSelectedLeads([])
      setIsSelectAll(false)
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

  const copyToClipboard = async (text: string, type: string, fieldId?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${type} copied to clipboard!`)
      
      // Add visual feedback
      if (fieldId) {
        setCopiedField(fieldId)
        setTimeout(() => setCopiedField(null), 2000) // Clear after 2 seconds
      }
    } catch (err) {
      toast.error(`Failed to copy ${type}`)
    }
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
    <div className="min-h-screen bg-black text-white p-4">
      <div className="flex flex-col space-y-4">


        {/* Lead Limit Warning */}
        {(stats.pending >= MAX_PENDING_LEADS * WARNING_THRESHOLD || stats.totalLeads >= MAX_TOTAL_LEADS * WARNING_THRESHOLD) && (
          <Card className="bg-yellow-900/20 border-yellow-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-yellow-300 font-medium text-sm">
                    {stats.pending >= MAX_PENDING_LEADS ? 
                      'Lead Limit Reached' : 
                      stats.totalLeads >= MAX_TOTAL_LEADS ? 
                        'Total Lead Limit Reached' :
                        'Approaching Lead Limits'
                    }
                  </div>
                  <div className="text-yellow-400/80 text-xs mt-1">
                    {stats.pending >= MAX_PENDING_LEADS && (
                      <span>You have {stats.pending} pending leads (max: {MAX_PENDING_LEADS}). </span>
                    )}
                    {stats.totalLeads >= MAX_TOTAL_LEADS && (
                      <span>You have {stats.totalLeads} total leads (max: {MAX_TOTAL_LEADS}). </span>
                    )}
                    {(stats.pending < MAX_PENDING_LEADS && stats.totalLeads < MAX_TOTAL_LEADS) && (
                      <span>
                        Pending: {stats.pending}/{MAX_PENDING_LEADS} • Total: {stats.totalLeads}/{MAX_TOTAL_LEADS}
                      </span>
                    )}
                    <br />Complete outreach to existing leads before adding more.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{stats.totalLeads}</div>
              <p className="text-xs text-gray-500 mt-1">In pipeline</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">DM Outreach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{stats.dmOutreaches}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.dmResponseRate}% response</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Email Outreach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{stats.emailOutreaches}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.emailResponseRate}% response</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Responded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{stats.responded}</div>
              <p className="text-xs text-gray-500 mt-1">Active conversations</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Qualified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{stats.qualified}</div>
              <p className="text-xs text-gray-500 mt-1">Ready to close</p>
            </CardContent>
          </Card>
          
            <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400">Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-white">{stats.conversionRate}%</div>
              <p className="text-xs text-gray-500 mt-1">{stats.signed} signed</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Enhanced Lead Pipeline - Takes up 4 columns */}
          <div className="xl:col-span-4 flex flex-col h-[calc(100vh-150px)]">
            <Card className="bg-[#1A1A1A] border-[#333] flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-400" />
                      Lead Pipeline
                    </CardTitle>
                    <CardDescription className="text-gray-400">Click outreach to see available contact methods</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowFilters(!showFilters)}
                      variant="outline"
                      size="sm"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {(filters.hasPhone || filters.hasEmail || filters.hasWebsite || filters.hasSocials ||
                        filters.statusFilter !== 'all' || filters.selectedNicheFilter.length > 0) && (
                        <Badge className="ml-2 bg-blue-600/20 text-blue-300" variant="secondary">
                          Active
                        </Badge>
                      )}
                    </Button>
                    <Button 
                      onClick={() => { loadCampaignLeads(); loadCampaigns(); }}
                      variant="outline" 
                      size="sm"
                      className="bg-[#1A1A1A] border-[#333] hover:bg-[#2A2A2A] text-gray-400 hover:text-white"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 h-0">
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by business name or owner..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-[#2A2A2A] border-[#444] text-gray-300 placeholder-gray-500 focus:border-gray-300"
                    />
                  </div>
                </div>

                {/* Advanced Filters Panel */}
                {showFilters && (
                  <div className="mb-4 p-4 bg-[#2A2A2A] border border-[#444] rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-400">Advanced Filters</Label>
                      <Button
                        onClick={() => setFilters({
                          hasPhone: false, hasEmail: false, hasWebsite: false, hasSocials: false,
                          socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
                          selectedNicheFilter: [], statusFilter: 'all'
                        })}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                    
                    {/* Status Filter */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-400">Status</Label>
                      <Select value={filters.statusFilter} onValueChange={(value) => setFilters(prev => ({ ...prev, statusFilter: value }))}>
                        <SelectTrigger className="w-full bg-[#1A1A1A] border-[#333] text-gray-400">
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
                    </div>
                    
                    {/* Contact Filters */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-400">Contact Methods</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasPhone"
                            checked={filters.hasPhone}
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasPhone: checked as boolean }))}
                            className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                          <label htmlFor="hasPhone" className="text-sm text-gray-400 cursor-pointer flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Has Phone
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasEmail"
                            checked={filters.hasEmail}
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasEmail: checked as boolean }))}
                            className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                          <label htmlFor="hasEmail" className="text-sm text-gray-400 cursor-pointer flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Has Email
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasWebsite"
                            checked={filters.hasWebsite}
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasWebsite: checked as boolean }))}
                            className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                          <label htmlFor="hasWebsite" className="text-sm text-gray-400 cursor-pointer flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Has Website
                          </label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasSocials"
                            checked={filters.hasSocials}
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasSocials: checked as boolean }))}
                            className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                          <label htmlFor="hasSocials" className="text-sm text-gray-400 cursor-pointer flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            Has Socials
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Social Media Sub-filters */}
                    {filters.hasSocials && (
                      <div className="ml-6 p-3 bg-[#333]/30 rounded-lg border border-[#555]">
                        <Label className="text-xs font-medium text-gray-500 mb-2 block">Social Platform Filters</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="socialInstagram"
                              checked={filters.socialPlatforms.instagram}
                              onCheckedChange={(checked) => setFilters(prev => ({ 
                                ...prev, 
                                socialPlatforms: { ...prev.socialPlatforms, instagram: checked as boolean }
                              }))}
                              className="border-[#444] data-[state=checked]:bg-gray-600"
                            />
                            <label htmlFor="socialInstagram" className="text-xs text-gray-500 cursor-pointer flex items-center gap-1">
                              <Instagram className="h-3 w-3" />
                              Instagram
                            </label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="socialFacebook"
                              checked={filters.socialPlatforms.facebook}
                              onCheckedChange={(checked) => setFilters(prev => ({ 
                                ...prev, 
                                socialPlatforms: { ...prev.socialPlatforms, facebook: checked as boolean }
                              }))}
                              className="border-[#444] data-[state=checked]:bg-gray-600"
                            />
                            <label htmlFor="socialFacebook" className="text-xs text-gray-500 cursor-pointer flex items-center gap-1">
                              <Facebook className="h-3 w-3" />
                              Facebook
                            </label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="socialLinkedin"
                              checked={filters.socialPlatforms.linkedin}
                              onCheckedChange={(checked) => setFilters(prev => ({ 
                                ...prev, 
                                socialPlatforms: { ...prev.socialPlatforms, linkedin: checked as boolean }
                              }))}
                              className="border-[#444] data-[state=checked]:bg-gray-600"
                            />
                            <label htmlFor="socialLinkedin" className="text-xs text-gray-500 cursor-pointer flex items-center gap-1">
                              <Linkedin className="h-3 w-3" />
                              LinkedIn
                            </label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="socialTwitter"
                              checked={filters.socialPlatforms.twitter}
                              onCheckedChange={(checked) => setFilters(prev => ({ 
                                ...prev, 
                                socialPlatforms: { ...prev.socialPlatforms, twitter: checked as boolean }
                              }))}
                              className="border-[#444] data-[state=checked]:bg-gray-600"
                            />
                            <label htmlFor="socialTwitter" className="text-xs text-gray-500 cursor-pointer flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              X/Twitter
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Niche Filter */}
                    {availableNichesInLeads.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-400">Filter by Niche</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                          {availableNichesInLeads.map((nicheName) => (
                            <div key={nicheName || 'unknown'} className="flex items-center space-x-2">
                              <Checkbox
                                id={`niche-${nicheName}`}
                                checked={nicheName ? filters.selectedNicheFilter.includes(nicheName) : false}
                                onCheckedChange={(checked) => {
                                  if (checked && nicheName) {
                                    setFilters(prev => ({ 
                                      ...prev, 
                                      selectedNicheFilter: [...prev.selectedNicheFilter, nicheName] 
                                    }))
                                  } else if (nicheName) {
                                    setFilters(prev => ({ 
                                      ...prev, 
                                      selectedNicheFilter: prev.selectedNicheFilter.filter(n => n !== nicheName) 
                                    }))
                                  }
                                }}
                                className="border-[#444] data-[state=checked]:bg-gray-600"
                              />
                              <label htmlFor={`niche-${nicheName}`} className="text-sm text-gray-400 cursor-pointer">
                                {nicheName || 'Unknown'}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Bulk Actions Bar */}
                {selectedLeads.length > 0 && (
                  <div className="mb-4 p-3 bg-[#2A2A2A] border border-[#444] rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-sm font-medium">
                          {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            setSelectedLeads([])
                            setIsSelectAll(false)
                          }}
                          variant="outline"
                          size="sm"
                          className="bg-[#1A1A1A] border-[#333] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          Clear Selection
                        </Button>
                        <Button
                          onClick={deleteBulkCampaignLeads}
                          variant="outline"
                          size="sm"
                          className="bg-red-900/20 border-red-500/50 text-red-300 hover:bg-red-900/30 hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Lead Table */}
                <div className="overflow-x-auto flex-1 overflow-y-auto border border-[#333] rounded-md">
                  <Table>
                    <TableHeader className="sticky top-0 bg-[#1A1A1A] z-10">
                      <TableRow className="border-[#333] hover:bg-transparent">
                        <TableHead className="w-12 text-gray-400">
                          <Checkbox
                            checked={isSelectAll && filteredLeads.length > 0}
                            onCheckedChange={handleSelectAll}
                            className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                        </TableHead>
                        <TableHead className="text-gray-400">Business</TableHead>
                        <TableHead className="text-gray-400">Owner</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Contact Info</TableHead>
                        <TableHead className="text-gray-400">Last Contact</TableHead>
                        <TableHead className="text-gray-400">Outreach</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((campaignLead) => {
                        const outreachMethods = campaignLead.lead ? getOutreachMethods(campaignLead.lead) : []
                        
                            return (
                        <TableRow key={campaignLead.id} className="border-[#333] hover:bg-[#2A2A2A]">
                          <TableCell className="w-12">
                            <Checkbox
                              checked={selectedLeads.includes(campaignLead.id)}
                              onCheckedChange={(checked) => handleSelectLead(campaignLead.id, checked as boolean)}
                              className="border-[#444] data-[state=checked]:bg-gray-600"
                            />
                          </TableCell>
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
                                    Website
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                              <div className="text-sm">
                                {campaignLead.lead?.owner_name ? (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-300">{campaignLead.lead.owner_name}</span>
                                </div>
                                ) : (
                                  <span className="text-gray-500">No owner info</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={campaignLead.status}
                              onValueChange={(value) => updateCampaignLeadStatus(campaignLead.id, value)}
                            >
                                <SelectTrigger className="w-36 h-8 bg-[#2A2A2A] border-[#444] text-gray-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1A1A1A] border-[#333]">
                                  <SelectItem value="pending">
                                    <div className="flex items-center gap-2">
                                      <CircleDot className="h-3 w-3" />
                                      Pending
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="contacted">
                                    <div className="flex items-center gap-2">
                                      <MessageCircle className="h-3 w-3" />
                                      Contacted
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="responded">
                                    <div className="flex items-center gap-2">
                                      <MessageSquare className="h-3 w-3" />
                                      Responded
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="qualified">
                                    <div className="flex items-center gap-2">
                                      <Star className="h-3 w-3" />
                                      Qualified
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="signed">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Signed
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="rejected">
                                    <div className="flex items-center gap-2">
                                      <XCircle className="h-3 w-3" />
                                      Rejected
                                    </div>
                                  </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                              <div className="space-y-1 text-sm">
                                {campaignLead.lead?.email && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <Mail className="h-3 w-3" />
                                    <span 
                                      className={`text-xs cursor-pointer hover:text-gray-300 transition-colors ${
                                        copiedField === `email-${campaignLead.id}` ? 'text-green-400' : ''
                                      }`}
                                      onClick={() => copyToClipboard(campaignLead.lead!.email!, 'Email', `email-${campaignLead.id}`)}
                                      title="Click to copy email"
                                    >
                                      {copiedField === `email-${campaignLead.id}` ? '✓ Copied!' : campaignLead.lead.email}
                                    </span>
                            </div>
                                )}
                                {campaignLead.lead?.phone && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <Phone className="h-3 w-3" />
                                    <span 
                                      className={`text-xs cursor-pointer hover:text-gray-300 transition-colors ${
                                        copiedField === `phone-${campaignLead.id}` ? 'text-green-400' : ''
                                      }`}
                                      onClick={() => copyToClipboard(campaignLead.lead!.phone!, 'Phone', `phone-${campaignLead.id}`)}
                                      title="Click to copy phone"
                                    >
                                      {copiedField === `phone-${campaignLead.id}` ? '✓ Copied!' : campaignLead.lead.phone}
                                    </span>
                                  </div>
                                )}
                                {/* Social Media Icons - Overlapping Style */}
                                <div className="flex items-center relative max-w-[80px]">
                              {campaignLead.lead?.instagram_handle && (
                                <a
                                  href={getSocialMediaLink('instagram', campaignLead.lead.instagram_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                      className="relative z-10 text-pink-500 hover:text-pink-400 hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-pink-500/50 hover:z-20"
                                      onClick={(e) => e.stopPropagation()}
                                  title={`Instagram: ${campaignLead.lead.instagram_handle}`}
                                  style={{ marginLeft: '0px' }}
                                >
                                      <Instagram className="h-3 w-3" />
                                </a>
                              )}
                                  {campaignLead.lead?.facebook_page && getSocialMediaLink('facebook', campaignLead.lead.facebook_page) && (
                                <a
                                  href={getSocialMediaLink('facebook', campaignLead.lead.facebook_page)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                      className="relative z-10 text-blue-500 hover:text-blue-400 hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-blue-500/50 hover:z-20"
                                      onClick={(e) => e.stopPropagation()}
                                  title={`Facebook: ${campaignLead.lead.facebook_page}`}
                                      style={{ marginLeft: campaignLead.lead.instagram_handle ? '-6px' : '0px' }}
                                >
                                      <Facebook className="h-3 w-3" />
                                </a>
                              )}
                              {campaignLead.lead?.linkedin_profile && (
                                <a
                                  href={getSocialMediaLink('linkedin', campaignLead.lead.linkedin_profile)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                      className="relative z-10 text-blue-600 hover:text-blue-500 hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-blue-600/50 hover:z-20"
                                      onClick={(e) => e.stopPropagation()}
                                  title={`LinkedIn: ${campaignLead.lead.linkedin_profile}`}
                                      style={{ marginLeft: (campaignLead.lead.instagram_handle || campaignLead.lead.facebook_page) ? '-6px' : '0px' }}
                                >
                                      <Linkedin className="h-3 w-3" />
                                </a>
                              )}
                              {campaignLead.lead?.twitter_handle && (
                                <a
                                  href={getSocialMediaLink('twitter', campaignLead.lead.twitter_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                      className="relative z-10 text-gray-300 hover:text-white hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-gray-300/50 hover:z-20"
                                      onClick={(e) => e.stopPropagation()}
                                  title={`X/Twitter: ${campaignLead.lead.twitter_handle}`}
                                      style={{ marginLeft: (campaignLead.lead.instagram_handle || campaignLead.lead.facebook_page || campaignLead.lead.linkedin_profile) ? '-6px' : '0px' }}
                                >
                                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                      </svg>
                                </a>
                              )}
                              {!campaignLead.lead?.instagram_handle && !campaignLead.lead?.facebook_page && !campaignLead.lead?.linkedin_profile && !campaignLead.lead?.twitter_handle && (
                                    <span className="text-gray-500 text-xs">No socials found</span>
                                  )}
                                </div>
                                {campaignLead.lead?.city && campaignLead.lead?.state_province && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <MapPin className="h-3 w-3" />
                                    <span className="text-xs">{campaignLead.lead.city}, {campaignLead.lead.state_province}</span>
                                  </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                              <div className="text-sm text-gray-400">
                                {campaignLead.last_contacted_at ? (
                                  <div>
                                    <div>{new Date(campaignLead.last_contacted_at).toLocaleDateString()}</div>
                                    <div className="text-xs text-gray-500">
                                      {Math.floor((Date.now() - new Date(campaignLead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">Never</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                                onClick={() => {
                                  setSelectedCampaignLead(campaignLead)
                                  setShowOutreachOptions(true)
                                }}
                                disabled={outreachMethods.length === 0}
                              >
                                <Zap className="h-3 w-3 mr-1" />
                                Outreach ({outreachMethods.length})
                              </Button>
                            </TableCell>
                        </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  
                  {filteredLeads.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      {campaignLeads.length === 0 ? (
                        <>
                          <p>No leads in outreach yet</p>
                          <p className="text-sm">Add leads from the Lead Generator to start outreaching</p>
                        </>
                      ) : (
                        <>
                          <p>No leads match your filters</p>
                          <p className="text-sm">Try adjusting your filter criteria</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dynamic To-Do List Widget */}
          <div className="xl:col-span-1 h-[calc(100vh-150px)]">
            <Card className="bg-[#1A1A1A] border-[#333] h-full overflow-hidden">
                <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  Dynamic To-Do List
                  </CardTitle>
                <CardDescription className="text-gray-400">AI-powered action items</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 overflow-y-auto flex-1">
                {/* Overdue Follow-ups */}
                {campaignLeads.filter(cl => 
                  cl.status === 'contacted' && 
                  cl.last_contacted_at && 
                  new Date(cl.last_contacted_at) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                ).length > 0 && (
                  <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-red-300 text-sm">Urgent: Overdue Follow-ups</h4>
                        <p className="text-xs text-gray-400 mb-2">
                          {campaignLeads.filter(cl => 
                            cl.status === 'contacted' && 
                            cl.last_contacted_at && 
                            new Date(cl.last_contacted_at) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                          ).length} leads need immediate follow-up
                        </p>
                        <div className="space-y-1">
                          {campaignLeads.filter(cl => 
                            cl.status === 'contacted' && 
                            cl.last_contacted_at && 
                            new Date(cl.last_contacted_at) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                          ).slice(0, 3).map(cl => (
                            <div key={cl.id} className="text-xs text-gray-300 truncate">
                              • {cl.lead?.business_name} - {Math.floor((Date.now() - new Date(cl.last_contacted_at!).getTime()) / (1000 * 60 * 60 * 24))} days
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* New Leads to Contact */}
                {campaignLeads.filter(cl => cl.status === 'pending').length > 0 && (
                  <div className="p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CircleDot className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-blue-300 text-sm">New Leads to Contact</h4>
                        <p className="text-xs text-gray-400 mb-2">
                          {campaignLeads.filter(cl => cl.status === 'pending').length} leads awaiting first contact
                        </p>
                        <div className="space-y-1">
                          {campaignLeads.filter(cl => cl.status === 'pending').slice(0, 3).map(cl => (
                            <div key={cl.id} className="text-xs text-gray-300 truncate">
                              • {cl.lead?.business_name} ({cl.lead?.niche_name})
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Responded Leads */}
                {campaignLeads.filter(cl => cl.status === 'responded').length > 0 && (
                  <div className="p-3 bg-purple-900/20 border border-purple-500/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-purple-300 text-sm">Active Conversations</h4>
                        <p className="text-xs text-gray-400 mb-2">
                          {campaignLeads.filter(cl => cl.status === 'responded').length} leads have responded
                        </p>
                        <div className="space-y-1">
                          {campaignLeads.filter(cl => cl.status === 'responded').slice(0, 3).map(cl => (
                            <div key={cl.id} className="text-xs text-gray-300 truncate">
                              • {cl.lead?.business_name} - Reply ASAP
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Qualified Leads */}
                {campaignLeads.filter(cl => cl.status === 'qualified').length > 0 && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-yellow-300 text-sm">Close These Deals</h4>
                        <p className="text-xs text-gray-400 mb-2">
                          {campaignLeads.filter(cl => cl.status === 'qualified').length} qualified leads ready
                        </p>
                        <div className="space-y-1">
                          {campaignLeads.filter(cl => cl.status === 'qualified').slice(0, 3).map(cl => (
                            <div key={cl.id} className="text-xs text-gray-300 truncate">
                              • {cl.lead?.business_name} - Send proposal
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Wins */}
                {campaignLeads.filter(cl => 
                  cl.status === 'signed' && 
                  new Date(cl.added_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length > 0 && (
                  <div className="p-3 bg-green-900/20 border border-green-500/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-green-300 text-sm">Recent Wins 🎉</h4>
                        <p className="text-xs text-gray-400 mb-2">
                          {campaignLeads.filter(cl => 
                            cl.status === 'signed' && 
                            new Date(cl.added_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          ).length} signed this week!
                        </p>
                        <div className="space-y-1">
                          {campaignLeads.filter(cl => 
                            cl.status === 'signed' && 
                            new Date(cl.added_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                          ).slice(0, 3).map(cl => (
                            <div key={cl.id} className="text-xs text-gray-300 truncate">
                              ✓ {cl.lead?.business_name}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* All Caught Up */}
                {campaignLeads.filter(cl => cl.status === 'pending').length === 0 && 
                  campaignLeads.filter(cl => 
                    cl.status === 'contacted' && 
                    cl.last_contacted_at && 
                   new Date(cl.last_contacted_at) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                  ).length === 0 && (
                  <div className="p-4 text-center text-gray-400">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                    <h4 className="text-sm font-medium text-gray-300 mb-1">All Caught Up!</h4>
                    <p className="text-xs">Great job staying on top of outreach.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Outreach Options Dialog */}
        <Dialog open={showOutreachOptions} onOpenChange={setShowOutreachOptions}>
          <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-gray-400" />
                Choose Outreach Method
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedCampaignLead?.lead?.business_name}
                {selectedCampaignLead?.lead?.owner_name && (
                  <span className="block mt-1">Owner: {selectedCampaignLead.lead.owner_name}</span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 py-4">
              {selectedCampaignLead && selectedCampaignLead.lead && getOutreachMethods(selectedCampaignLead.lead).map((method) => (
                <Button
                  key={method.type}
                  onClick={() => {
                    setShowOutreachOptions(false)
                    setShowMessageComposer(true)
                    setMessageType(method.type as any)
                    if (selectedCampaignLead.lead) {
                      generatePersonalizedMessage(selectedCampaignLead.lead, method.type)
                    }
                  }}
                  className="w-full bg-[#2A2A2A] hover:bg-[#333] text-white justify-start"
                >
                  <method.icon className="h-4 w-4 mr-2" />
                  {method.label}
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              ))}
          </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Message Composer Dialog */}
        <Dialog open={showMessageComposer} onOpenChange={setShowMessageComposer}>
          <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                {messageType === 'email' && <Mail className="h-5 w-5 text-gray-400" />}
                {messageType === 'phone' && <Phone className="h-5 w-5 text-gray-400" />}
                {messageType === 'linkedin' && <Linkedin className="h-5 w-5 text-gray-400" />}
                {messageType === 'instagram' && <Instagram className="h-5 w-5 text-gray-400" />}
                {messageType === 'facebook' && <Facebook className="h-5 w-5 text-gray-400" />}
                AI {messageType === 'phone' ? 'Call Script' : `${messageType.charAt(0).toUpperCase() + messageType.slice(1)} Message`}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedCampaignLead?.lead?.business_name} - {selectedCampaignLead?.lead?.owner_name || 'No owner info'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6">
              {messageType === 'phone' ? (
                // Call Script Display
              <div className="space-y-4">
                  <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-300 mb-4">Call Script</h3>
                    <div className="space-y-4 text-gray-300 whitespace-pre-wrap font-mono text-sm">
                      {generatedMessage || (
                        <div className="text-center py-8 text-gray-500">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                          Generating personalized call script...
                  </div>
                      )}
                  </div>
                  </div>
                  {generatedMessage && (
                  <Button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedMessage)
                        toast.success('Call script copied to clipboard!')
                      }}
                  className="w-full bg-[#444] hover:bg-[#555] text-white"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Script
                  </Button>
                )}
              </div>
              ) : (
                // Message Display
              <div className="space-y-4">
                  {messageType === 'email' && messageSubject && (
                  <div>
                      <Label className="text-gray-400 mb-2">Subject Line</Label>
                      <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-3">
                        <p className="text-gray-300">{messageSubject}</p>
                      </div>
                    </div>
                  )}

                <div>
                    <Label className="text-gray-400 mb-2">Message</Label>
                    <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4 min-h-[200px]">
                      {generatedMessage ? (
                        <p className="text-gray-300 whitespace-pre-wrap">{generatedMessage}</p>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                          Generating personalized message...
                        </div>
                      )}
                    </div>
                  </div>

                  {generatedMessage && (
                    <div className="flex gap-3">
                    <Button
                        onClick={() => {
                          const fullMessage = messageType === 'email' && messageSubject 
                            ? `Subject: ${messageSubject}\n\n${generatedMessage}`
                            : generatedMessage
                          navigator.clipboard.writeText(fullMessage)
                          toast.success('Message copied to clipboard!')
                        }}
                        className="flex-1 bg-[#444] hover:bg-[#555] text-white"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Message
                  </Button>
                  <Button
                        onClick={() => {
                          updateCampaignLeadStatus(selectedCampaignLead!.id, 'contacted')
                          setShowMessageComposer(false)
                          toast.success('Lead marked as contacted!')
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                        Mark as Sent
                    </Button>
                    </div>
                  )}
                  </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 