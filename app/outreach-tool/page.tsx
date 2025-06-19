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
import { 
  Loader2, Send, MessageSquare, Phone, Mail, Calendar, 
  CheckCircle, Clock, AlertCircle, Star, TrendingUp,
  Plus, Edit, Copy, Sparkles, Target, Users, BarChart3,
  Building2, ExternalLink, Linkedin, Twitter, Instagram,
  Facebook, ChevronRight, Filter, RefreshCw, DollarSign,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Search,
      UserCheck, UserX, PhoneCall, MessageCircle,
  Eye, X
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

interface CampaignLead {
  id: string
  campaign_id: string
  lead_id: string
  status: 'pending' | 'contacted' | 'responded' | 'qualified' | 'signed' | 'rejected'
  outreach_method?: 'email' | 'phone' | 'dm' | 'linkedin'
  last_contacted_at?: string
  next_follow_up_date?: string
  notes?: string
  lead?: Lead
}

interface OutreachFilters {
  status: string[]
  outreachMethod: string[]
  hasEmail: boolean
  hasPhone: boolean
  hasSocials: boolean
  responseStatus: string[]
}

interface OutreachStats {
  totalLeads: number
  emailOutreach: number
  emailResponse: number
  dmOutreach: number
  dmResponse: number
  phoneOutreach: number
  phoneResponse: number
  conversionRate: number
  responseRate: number
}

export default function OutreachToolPage() {
  const { getSupabaseClient } = useAuthenticatedSupabase()
  const { selectedBrandId } = useBrandContext()
  const { userId } = useAuth()

  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<CampaignLead[]>([])
  const [selectedLead, setSelectedLead] = useState<CampaignLead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showOutreachDialog, setShowOutreachDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [selectedOutreachMethod, setSelectedOutreachMethod] = useState<'email' | 'phone' | 'dm' | 'linkedin'>('email')

  const [filters, setFilters] = useState<OutreachFilters>({
    status: [],
    outreachMethod: [],
    hasEmail: false,
    hasPhone: false,
    hasSocials: false,
    responseStatus: []
  })

  // Calculate comprehensive statistics
  const stats: OutreachStats = {
    totalLeads: campaignLeads.length,
    emailOutreach: campaignLeads.filter(cl => cl.outreach_method === 'email').length,
    emailResponse: campaignLeads.filter(cl => cl.outreach_method === 'email' && ['responded', 'qualified', 'signed'].includes(cl.status)).length,
    dmOutreach: campaignLeads.filter(cl => cl.outreach_method === 'dm').length,
    dmResponse: campaignLeads.filter(cl => cl.outreach_method === 'dm' && ['responded', 'qualified', 'signed'].includes(cl.status)).length,
    phoneOutreach: campaignLeads.filter(cl => cl.outreach_method === 'phone').length,
    phoneResponse: campaignLeads.filter(cl => cl.outreach_method === 'phone' && ['responded', 'qualified', 'signed'].includes(cl.status)).length,
    conversionRate: campaignLeads.length > 0 ? (campaignLeads.filter(cl => cl.status === 'signed').length / campaignLeads.length * 100) : 0,
    responseRate: campaignLeads.length > 0 ? (campaignLeads.filter(cl => ['responded', 'qualified', 'signed'].includes(cl.status)).length / campaignLeads.length * 100) : 0
  }

  useEffect(() => {
    if (userId) {
      loadCampaignLeads()
    }
  }, [userId, selectedBrandId])

  useEffect(() => {
    applyFilters()
  }, [campaignLeads, filters, searchQuery])

  const loadCampaignLeads = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('outreach_campaign_leads')
        .select(`
          *,
          lead:leads(*)
        `)
        .eq('lead.user_id', userId)
        .order('added_at', { ascending: false })

      if (error) throw error
      
      setCampaignLeads(data || [])
    } catch (error) {
      console.error('Error loading campaign leads:', error)
      toast.error('Failed to load leads')
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...campaignLeads]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(cl => 
        cl.lead?.business_name?.toLowerCase().includes(query) ||
        cl.lead?.owner_name?.toLowerCase().includes(query) ||
        cl.lead?.email?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(cl => filters.status.includes(cl.status))
    }

    // Outreach method filter
    if (filters.outreachMethod.length > 0) {
      filtered = filtered.filter(cl => cl.outreach_method && filters.outreachMethod.includes(cl.outreach_method))
    }

    // Contact info filters
    if (filters.hasEmail) {
      filtered = filtered.filter(cl => cl.lead?.email)
    }
    if (filters.hasPhone) {
      filtered = filtered.filter(cl => cl.lead?.phone)
    }
    if (filters.hasSocials) {
      filtered = filtered.filter(cl => 
        cl.lead?.instagram_handle || cl.lead?.facebook_page || 
        cl.lead?.linkedin_profile || cl.lead?.twitter_handle
      )
    }

    setFilteredLeads(filtered)
  }

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('outreach_campaign_leads')
        .update({ 
          status: newStatus,
          last_contacted_at: newStatus === 'contacted' ? new Date().toISOString() : undefined
        })
        .eq('id', leadId)

      if (error) throw error

      setCampaignLeads(prev => 
        prev.map(cl => cl.id === leadId ? { ...cl, status: newStatus as any } : cl)
      )

      toast.success('Status updated successfully')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const generateOutreachMessage = async (lead: Lead, method: string) => {
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
          brandInfo: { name: selectedBrandId || 'Your Business' }
        }),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedMessage(data.message)
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error generating message:', error)
      toast.error('Failed to generate message')
    } finally {
      setIsGeneratingMessage(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'contacted': return <Send className="h-4 w-4" />
      case 'responded': return <MessageCircle className="h-4 w-4" />
      case 'qualified': return <UserCheck className="h-4 w-4" />
      case 'signed': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <UserX className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getOutreachMethods = (lead: Lead) => {
    const methods = []
    if (lead.email) methods.push('email')
    if (lead.phone) methods.push('phone')
    if (lead.instagram_handle || lead.facebook_page || lead.twitter_handle) methods.push('dm')
    if (lead.linkedin_profile) methods.push('linkedin')
    return methods
  }

  const handleOutreachClick = (campaignLead: CampaignLead) => {
    setSelectedLead(campaignLead)
    setShowOutreachDialog(true)
    setGeneratedMessage('')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="h-screen bg-black text-white p-6 overflow-hidden">
      <div className="w-full h-full flex flex-col space-y-6">
        
        {/* Analytics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2A2A2A] rounded-lg">
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Leads</p>
                  <p className="text-xl font-semibold text-white">{stats.totalLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2A2A2A] rounded-lg">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email Outreach</p>
                  <p className="text-xl font-semibold text-white">{stats.emailOutreach}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2A2A2A] rounded-lg">
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email Response</p>
                  <p className="text-xl font-semibold text-white">
                    {stats.emailOutreach > 0 ? Math.round((stats.emailResponse / stats.emailOutreach) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2A2A2A] rounded-lg">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">DM Outreach</p>
                  <p className="text-xl font-semibold text-white">{stats.dmOutreach}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2A2A2A] rounded-lg">
                  <ArrowUpRight className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">DM Response</p>
                  <p className="text-xl font-semibold text-white">
                    {stats.dmOutreach > 0 ? Math.round((stats.dmResponse / stats.dmOutreach) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2A2A2A] rounded-lg">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Phone Outreach</p>
                  <p className="text-xl font-semibold text-white">{stats.phoneOutreach}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2A2A2A] rounded-lg">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Response Rate</p>
                  <p className="text-xl font-semibold text-white">{Math.round(stats.responseRate)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2A2A2A] rounded-lg">
                  <Target className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Conversion</p>
                  <p className="text-xl font-semibold text-white">{Math.round(stats.conversionRate)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lead Pipeline Widget */}
        <Card className="bg-[#1A1A1A] border-[#333] flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                <CardTitle className="text-lg font-semibold text-gray-400">
                  Lead Pipeline ({filteredLeads.length}{campaignLeads.length !== filteredLeads.length && ` of ${campaignLeads.length}`})
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  size="sm"
                  className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {(filters.status.length > 0 || filters.outreachMethod.length > 0 || 
                    filters.hasEmail || filters.hasPhone || filters.hasSocials) && (
                    <Badge className="ml-2 bg-blue-600/20 text-blue-300" variant="secondary">
                      Active
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col flex-1 overflow-hidden">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by business name, owner, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#2A2A2A] border-[#444] text-gray-300 placeholder-gray-500 focus:border-gray-300"
                />
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mb-4 p-4 bg-[#2A2A2A] border border-[#444] rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-400">Filters</Label>
                  <Button
                    onClick={() => setFilters({ status: [], outreachMethod: [], hasEmail: false, hasPhone: false, hasSocials: false, responseStatus: [] })}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500">Status</Label>
                    <div className="space-y-2">
                      {['pending', 'contacted', 'responded', 'qualified', 'signed', 'rejected'].map((status) => (
                        <div key={status} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status}`}
                            checked={filters.status.includes(status)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({ ...prev, status: [...prev.status, status] }))
                              } else {
                                setFilters(prev => ({ ...prev, status: prev.status.filter(s => s !== status) }))
                              }
                            }}
                            className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                          <label htmlFor={`status-${status}`} className="text-sm text-gray-400 cursor-pointer capitalize flex items-center gap-2">
                            {getStatusIcon(status)}
                            {status}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info Filters */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500">Contact Info</Label>
                    <div className="space-y-2">
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
                          id="hasSocials"
                          checked={filters.hasSocials}
                          onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasSocials: checked as boolean }))}
                          className="border-[#444] data-[state=checked]:bg-gray-600"
                        />
                        <label htmlFor="hasSocials" className="text-sm text-gray-400 cursor-pointer flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Has Socials
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Outreach Method Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500">Outreach Method</Label>
                    <div className="space-y-2">
                      {['email', 'phone', 'dm', 'linkedin'].map((method) => (
                        <div key={method} className="flex items-center space-x-2">
                          <Checkbox
                            id={`method-${method}`}
                            checked={filters.outreachMethod.includes(method)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({ ...prev, outreachMethod: [...prev.outreachMethod, method] }))
                              } else {
                                setFilters(prev => ({ ...prev, outreachMethod: prev.outreachMethod.filter(m => m !== method) }))
                              }
                            }}
                            className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                          <label htmlFor={`method-${method}`} className="text-sm text-gray-400 cursor-pointer capitalize">
                            {method}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lead Pipeline Table */}
            <div className="flex-1 min-h-[400px] max-h-[calc(100vh-200px)] overflow-y-auto border border-[#333] rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-[#1A1A1A] z-10">
                  <TableRow className="border-[#333]">
                    <TableHead className="text-gray-400">Business</TableHead>
                    <TableHead className="text-gray-400">Owner</TableHead>
                    <TableHead className="text-gray-400">Contact</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Method</TableHead>
                    <TableHead className="text-gray-400">Last Contact</TableHead>
                    <TableHead className="text-gray-400">Outreach</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((campaignLead) => (
                    <TableRow
                      key={campaignLead.id}
                      className="border-[#333] hover:bg-[#222]/50"
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-400">{campaignLead.lead?.business_name}</div>
                          {campaignLead.lead?.website && (
                            <a
                              href={campaignLead.lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Website
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-400">
                          {campaignLead.lead?.owner_name || <span className="text-gray-500">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-400">
                          {campaignLead.lead?.email && (
                            <div className="flex items-center gap-1 mb-1">
                              <Mail className="h-3 w-3" />
                              {campaignLead.lead.email}
                            </div>
                          )}
                          {campaignLead.lead?.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {campaignLead.lead.phone}
                            </div>
                          )}
                          {!campaignLead.lead?.email && !campaignLead.lead?.phone && <span className="text-gray-500">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={campaignLead.status}
                          onValueChange={(value) => updateLeadStatus(campaignLead.id, value)}
                        >
                          <SelectTrigger className="w-32 bg-[#2A2A2A] border-[#444] text-gray-400">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(campaignLead.status)}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A1A] border-[#333]">
                            <SelectItem value="pending" className="text-gray-300 hover:bg-[#2A2A2A]">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Pending
                              </div>
                            </SelectItem>
                            <SelectItem value="contacted" className="text-gray-300 hover:bg-[#2A2A2A]">
                              <div className="flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                Contacted
                              </div>
                            </SelectItem>
                            <SelectItem value="responded" className="text-gray-300 hover:bg-[#2A2A2A]">
                              <div className="flex items-center gap-2">
                                <MessageCircle className="h-4 w-4" />
                                Responded
                              </div>
                            </SelectItem>
                            <SelectItem value="qualified" className="text-gray-300 hover:bg-[#2A2A2A]">
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4" />
                                Qualified
                              </div>
                            </SelectItem>
                            <SelectItem value="signed" className="text-gray-300 hover:bg-[#2A2A2A]">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Signed
                              </div>
                            </SelectItem>
                            <SelectItem value="rejected" className="text-gray-300 hover:bg-[#2A2A2A]">
                              <div className="flex items-center gap-2">
                                <UserX className="h-4 w-4" />
                                Rejected
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-400 capitalize">
                          {campaignLead.outreach_method || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-400">
                          {campaignLead.last_contacted_at 
                            ? new Date(campaignLead.last_contacted_at).toLocaleDateString()
                            : '-'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleOutreachClick(campaignLead)}
                          disabled={!campaignLead.lead}
                          size="sm"
                          variant="outline"
                          className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Outreach
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-1 h-6 w-6 text-gray-400 hover:text-white hover:bg-[#222]"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-1 h-6 w-6 text-gray-400 hover:text-white hover:bg-[#222]"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredLeads.length === 0 && !isLoading && (
                <div className="text-center py-12 text-gray-400">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  {campaignLeads.length === 0 ? (
                    <>
                      <p>No leads in pipeline yet</p>
                      <p className="text-sm">Import leads from the Lead Generator</p>
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

        {/* Outreach Dialog */}
        <Dialog open={showOutreachDialog} onOpenChange={setShowOutreachDialog}>
          <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-gray-400 flex items-center gap-2">
                <Send className="h-5 w-5" />
                Outreach: {selectedLead?.lead?.business_name}
              </DialogTitle>
              <DialogDescription>
                {selectedLead?.lead?.owner_name && `Contact: ${selectedLead.lead.owner_name}`}
              </DialogDescription>
            </DialogHeader>
            
            {selectedLead?.lead && (
              <div className="space-y-6">
                {/* Available Outreach Methods */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-400">Available Outreach Methods</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {getOutreachMethods(selectedLead.lead).map((method) => (
                      <Button
                        key={method}
                        onClick={() => {
                          setSelectedOutreachMethod(method as any)
                          generateOutreachMessage(selectedLead.lead!, method)
                        }}
                        variant={selectedOutreachMethod === method ? "default" : "outline"}
                        className={`justify-start ${
                          selectedOutreachMethod === method 
                            ? "bg-gray-600 text-white" 
                            : "bg-[#2A2A2A] text-gray-400 border-[#444] hover:bg-[#333]"
                        }`}
                      >
                        {method === 'email' && <Mail className="h-4 w-4 mr-2" />}
                        {method === 'phone' && <Phone className="h-4 w-4 mr-2" />}
                        {method === 'dm' && <MessageSquare className="h-4 w-4 mr-2" />}
                        {method === 'linkedin' && <Linkedin className="h-4 w-4 mr-2" />}
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Generated Message */}
                {isGeneratingMessage && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                    <span className="ml-2 text-gray-400">Generating personalized message...</span>
                  </div>
                )}

                {generatedMessage && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-400">
                        Generated {selectedOutreachMethod.charAt(0).toUpperCase() + selectedOutreachMethod.slice(1)} Message
                      </Label>
                      <Button
                        onClick={() => copyToClipboard(generatedMessage)}
                        size="sm"
                        variant="outline"
                        className="bg-[#2A2A2A] text-gray-400 border-[#444] hover:bg-[#333]"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <div className="p-4 bg-[#2A2A2A] border border-[#444] rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">
                        {generatedMessage}
                      </pre>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          updateLeadStatus(selectedLead.id, 'contacted')
                          setShowOutreachDialog(false)
                          toast.success('Lead marked as contacted!')
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Contacted
                      </Button>
                      <Button
                        onClick={() => copyToClipboard(generatedMessage)}
                        variant="outline"
                        className="bg-[#2A2A2A] text-gray-400 border-[#444] hover:bg-[#333]"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy & Close
                      </Button>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-400">Contact Information</Label>
                  <div className="p-4 bg-[#2A2A2A] border border-[#444] rounded-lg space-y-2">
                    {selectedLead.lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">{selectedLead.lead.email}</span>
                      </div>
                    )}
                    {selectedLead.lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300">{selectedLead.lead.phone}</span>
                      </div>
                    )}
                    {selectedLead.lead.website && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                        <a 
                          href={selectedLead.lead.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          {selectedLead.lead.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 