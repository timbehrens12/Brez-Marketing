"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { Loader2, Search, MapPin, Globe, Building2, Phone, Mail, ExternalLink, Send, Star, Plus, TrendingUp, Instagram, Facebook, Linkedin, Sparkles, Filter, RefreshCw, Clock, Zap, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'

const supabase = getSupabaseClient()

interface Lead {
  id: string
  business_name: string
  owner_name?: string
  phone?: string
  email?: string
  website?: string
  city?: string
  state_province?: string
  business_type: 'ecommerce' | 'local_service'
  niche_name?: string
  instagram_handle?: string
  facebook_page?: string
  linkedin_profile?: string
  twitter_handle?: string
  monthly_revenue_estimate?: string
  follower_count_instagram?: number
  engagement_rate?: number
  ad_spend_estimate?: string
  shopify_detected?: boolean
  marketing_prospect_reason?: string
  created_at: string
}

interface UsageData {
  used: number
  limit: number
  remaining: number
  leadsGeneratedToday: number
  maxLeadsPerGeneration: number
  maxNichesPerSearch: number
  lastGenerationAt: string | null
  resetsAt: string
  resetsIn: number
}

interface LeadFilters {
  hasPhone: boolean
  hasEmail: boolean
  hasWebsite: boolean
  searchQuery: string
}

export default function LeadGeneratorPage() {
  const { selectedBrandId } = useBrandContext()
  const { userId } = useAuth()
  
  const [businessType, setBusinessType] = useState<'ecommerce' | 'local_service'>('local_service')
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [location, setLocation] = useState({ country: '', state: '', city: '', radius: '' })
  const [keywords, setKeywords] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [isAddingManual, setIsAddingManual] = useState(false)
  const [niches, setNiches] = useState<any[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [todayLeads, setTodayLeads] = useState(0)
  const [activeTab, setActiveTab] = useState('search')
  const [isClearing, setIsClearing] = useState(false)
  const [isLoadingUsage, setIsLoadingUsage] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  // Usage data from API
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  
  // Lead filters
  const [filters, setFilters] = useState<LeadFilters>({
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false,
    searchQuery: ''
  })

  // Load data on component mount
  useEffect(() => {
    // Load niches immediately - doesn't require brand selection
    loadNiches()
    
    if (userId) {
      loadUsageData()
      // Refresh usage data every 30 seconds
      const interval = setInterval(loadUsageData, 30000)
      return () => clearInterval(interval)
    }
  }, [userId])
  
  useEffect(() => {
    if (userId) {
      loadExistingLeads()
      loadStats()
    }
  }, [selectedBrandId, userId])

  // Apply filters whenever leads or filters change
  useEffect(() => {
    applyFilters()
  }, [leads, filters])

  const loadUsageData = async () => {
    if (!userId) return
    
    try {
      const response = await fetch(`/api/leads/usage?userId=${userId}`)
      const data = await response.json()
      
      if (response.ok) {
        setUsageData(data.usage)
      } else {
        console.error('Failed to load usage data:', data.error)
      }
    } catch (error) {
      console.error('Error loading usage data:', error)
    } finally {
      setIsLoadingUsage(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...leads]
    
    // Apply has filters
    if (filters.hasPhone) {
      filtered = filtered.filter(lead => lead.phone && lead.phone !== 'N/A')
    }
    if (filters.hasEmail) {
      filtered = filtered.filter(lead => lead.email && lead.email !== 'N/A')
    }
    if (filters.hasWebsite) {
      filtered = filtered.filter(lead => lead.website && lead.website !== 'N/A')
    }
    
    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(lead => 
        lead.business_name?.toLowerCase().includes(query) ||
        lead.owner_name?.toLowerCase().includes(query) ||
        lead.city?.toLowerCase().includes(query) ||
        lead.niche_name?.toLowerCase().includes(query)
      )
    }
    
    setFilteredLeads(filtered)
  }

  const loadNiches = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_niches')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })
      
      if (error) throw error
      setNiches(data || [])
    } catch (error) {
      console.error('Error loading niches:', error)
    }
  }

  const loadExistingLeads = async () => {
    if (!userId) return
    
    try {
      let query = supabase
        .from('leads')
        .select('id, business_name, owner_name, phone, email, website, city, state_province, business_type, niche_name, instagram_handle, facebook_page, linkedin_profile, twitter_handle, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (selectedBrandId) {
        query = query.eq('brand_id', selectedBrandId)
      } else {
        query = query.is('brand_id', null)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setLeads((data as Lead[]) || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    }
  }

  const loadStats = async () => {
    if (!userId) return
    
    try {
      let query = supabase
        .from('leads')
        .select('created_at')
        .eq('user_id', userId)
      
      if (selectedBrandId) {
        query = query.eq('brand_id', selectedBrandId)
      } else {
        query = query.is('brand_id', null)
      }
      
      const { data: allLeads, error } = await query
      
      if (error) throw error
      
      const today = new Date().toDateString()
      const todayCount = allLeads?.filter(lead => 
        new Date(lead.created_at as string).toDateString() === today
      ).length || 0
      
      setTotalLeads(allLeads?.length || 0)
      setTodayLeads(todayCount)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Filter niches by business type
  const filteredNiches = niches.filter(niche => niche.category === businessType)
  
  // Group niches by categories for better UX
  const nicheGroups = {
    'Home Services': [
      'Construction', 'Roofing', 'HVAC', 'Plumbing', 'Electrical Services', 
      'Painting', 'Flooring', 'Windows & Doors', 'Fencing', 'Concrete & Masonry',
      'Appliance Repair', 'Locksmith', 'Cleaning Services', 'Landscaping', 'Pool Services', 'Tree Services'
    ],
    'Health & Wellness': [
      'General Dentistry', 'Orthodontics', 'Healthcare', 'Chiropractic', 
      'Physical Therapy', 'Mental Health', 'Optometry', 'Med Spas', 'Massage Therapy'
    ],
    'Personal Services': [
      'Beauty Salons', 'Tattoo Shops', 'Personal Training', 'Fitness Centers',
      'Photography', 'Pet Services'
    ],
    'Vehicle Services': [
      'Auto Services', 'Auto Repair', 'Towing Services'
    ],
    'Business Services': [
      'Professional Services', 'Marketing Agency', 'Real Estate', 'Insurance', 
      'Financial Services', 'Computer Repair'
    ],
    'Specialty Services': [
      'Food Services', 'Wedding Services', 'Event Planning', 'Moving Services',
      'Security Services', 'Pest Control', 'Senior Care', 'Child Care', 'Tutoring'
    ]
  }

  const getNichesByGroup = (groupName: string) => {
    const groupNiches = nicheGroups[groupName as keyof typeof nicheGroups] || []
    return filteredNiches.filter(niche => groupNiches.includes(niche.name))
  }

  // Reset selected niches when business type changes
  useEffect(() => {
    setSelectedNiches([])
  }, [businessType])

  const generateLeads = async () => {
    if (!userId) {
      toast.error('Please sign in first')
      return
    }

    if (selectedNiches.length === 0) {
      toast.error('Please select at least one niche')
      return
    }

    if (!usageData || usageData.remaining <= 0) {
      toast.error(`Daily limit reached. Resets ${getTimeUntilReset()}`)
      return
    }

    setIsGenerating(true)
    
    try {
      // Use different API endpoints for ecommerce vs local service
      const apiEndpoint = businessType === 'ecommerce' 
        ? '/api/leads/generate-ecommerce'
        : '/api/leads/generate-real'
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const requestBody = businessType === 'ecommerce'
        ? {
            selectedNiches,
            brandId: selectedBrandId || null,
            userId
          }
        : {
            businessType,
            niches: selectedNiches,
            location,
            brandId: selectedBrandId || null,
            userId
          }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(requestBody)
      })
      
      clearTimeout(timeoutId)

      const result = await response.json()
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit error
          toast.error(result.error)
        } else {
          throw new Error(result.error || 'Failed to generate leads')
        }
        return
      }

      if (result.leads && result.leads.length > 0) {
        setLeads(prev => [...result.leads, ...prev])
        if (selectedBrandId) {
          await loadStats() // Only refresh stats if brand is selected
        }
        
        // Update usage data from response
        if (result.usage) {
          setUsageData(prev => ({
            ...prev!,
            used: result.usage.used,
            remaining: Math.max(0, result.usage.limit - result.usage.used),
            leadsGeneratedToday: result.usage.totalLeadsToday
          }))
        }
        
        const leadType = businessType === 'ecommerce' ? 'ecommerce brands' : 'local businesses'
        toast.success(`Found ${result.leads.length} ${leadType}!`)
      } else {
        toast.error('No leads found for the specified criteria')
      }
    } catch (error) {
      console.error('Error generating leads:', error)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error('Request timed out. Please try again with fewer results or different criteria.')
        } else if (error.message.includes('504') || error.message.includes('timeout')) {
          toast.error('Service temporarily busy. Please try again in a moment.')
        } else {
          toast.error(error.message || 'Failed to generate leads. Please try again.')
        }
      } else {
        toast.error('Failed to generate leads. Please try again.')
      }
    } finally {
      setIsGenerating(false)
      // Refresh usage data
      await loadUsageData()
    }
  }

  const getTimeUntilReset = () => {
    if (!usageData) return 'tomorrow'
    
    const msUntilReset = usageData.resetsIn
    const hours = Math.floor(msUntilReset / (1000 * 60 * 60))
    const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`
    }
    return `in ${minutes}m`
  }

  const sendToOutreach = () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to send to outreach')
      return
    }
    toast.success(`Sent ${selectedLeads.length} leads to Outreach Manager!`)
    setSelectedLeads([])
  }

  // Clear all leads
  const clearAllLeads = async () => {
    if (!userId) return
    
    setIsClearing(true)
    try {
      let query = supabase
        .from('leads')
        .delete()
        .eq('user_id', userId)
      
      if (selectedBrandId) {
        query = query.eq('brand_id', selectedBrandId)
      } else {
        query = query.is('brand_id', null)
      }
      
      const { error } = await query
      
      if (error) throw error
      
      setLeads([])
      setSelectedLeads([])
      setFilteredLeads([])
      await loadStats()
      toast.success('All leads cleared successfully')
    } catch (error) {
      console.error('Error clearing leads:', error)
      toast.error('Failed to clear leads')
    } finally {
      setIsClearing(false)
    }
  }

  // Delete selected leads
  const deleteSelectedLeads = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to delete')
      return
    }
    
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', selectedLeads)
        .eq('user_id', userId!)
      
      if (error) throw error
      
      setLeads(prev => prev.filter(lead => !selectedLeads.includes(lead.id)))
      setSelectedLeads([])
      await loadStats()
      toast.success(`Deleted ${selectedLeads.length} leads`)
    } catch (error) {
      console.error('Error deleting leads:', error)
      toast.error('Failed to delete leads')
    }
  }

  const getSocialMediaLink = (platform: string, handle: string) => {
    switch (platform) {
      case 'instagram':
        return `https://instagram.com/${handle.replace('@', '')}`
      case 'facebook':
        // Only generate a Facebook link if the handle is a valid username or page (not @, not malformed, not a profile/group)
        if (!handle || handle.startsWith('@') || handle.includes('profile.php') || handle.match(/\/groups\//i)) return undefined;
        // Remove any URL prefix and trailing slashes
        let page = handle.replace(/^https?:\/\/(www\.)?facebook\.com\//i, '').replace(/\/$/, '');
        // Remove leading @ if present
        page = page.replace(/^@/, '');
        // Disallow empty, generic, or malformed pages
        if (!page || page === '' || page.toLowerCase() === 'facebook-f' || page.match(/^profile/)) return undefined;
        // Only allow valid Facebook page usernames (alphanumeric, dot, dash, min 5 chars)
        if (!/^[a-zA-Z0-9\.\-]{5,}$/.test(page)) return undefined;
        return `https://facebook.com/${page}`
      case 'linkedin':
        return `https://linkedin.com/company/${handle}`
      case 'twitter':
        return `https://twitter.com/${handle.replace('@', '')}`
      default:
        return '#'
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
        return <ExternalLink className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Lead Discovery Platform</h1>
            <p className="text-gray-400 mt-2">
              Find real businesses with verified contact information from Google Places
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={loadUsageData}
              variant="outline"
              size="sm"
              className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingUsage ? 'animate-spin' : ''}`} />
              Refresh Usage
            </Button>
            <Button
              onClick={() => setIsAddingManual(true)}
              variant="outline"
              className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Manual Lead
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Daily Usage</p>
                  <p className="text-2xl font-bold text-white">
                    {usageData?.used || 0} / {usageData?.limit || 10}
                  </p>
                  <Progress 
                    value={(usageData?.used || 0) / (usageData?.limit || 1) * 100} 
                    className="mt-2 h-1"
                  />
                </div>
                <Zap className="h-8 w-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Leads Today</p>
                  <p className="text-2xl font-bold text-white">
                    {usageData?.leadsGeneratedToday || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Up to {usageData?.maxLeadsPerGeneration || 25} per search
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Leads</p>
                  <p className="text-2xl font-bold text-white">{totalLeads}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedBrandId ? 'For this brand' : 'Select a brand'}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Resets In</p>
                  <p className="text-2xl font-bold text-white">
                    {usageData ? getTimeUntilReset() : '--'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Daily limit refreshes
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Side by Side Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Lead Search Panel */}
          <Card className="bg-[#1A1A1A] border-[#333] xl:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-400">Lead Search</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Business Type Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-400">Business Type</Label>
              <Tabs value={businessType} onValueChange={(value) => setBusinessType(value as any)}>
                <TabsList className="grid w-full grid-cols-2 bg-[#2A2A2A]">
                  <TabsTrigger value="ecommerce" className="data-[state=active]:bg-[#333] text-gray-400 relative">
                    <Globe className="h-4 w-4 mr-2" />
                    eCommerce
                    <Badge className="ml-2 bg-orange-500/20 text-orange-400 text-xs">Coming Soon</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="local_service" className="data-[state=active]:bg-[#333] text-gray-400">
                    <MapPin className="h-4 w-4 mr-2" />
                    Local Services
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Niche Selector */}
            <div className="space-y-3 relative">
              <Label className="text-sm font-medium text-gray-400">Target Niches</Label>
              
              {businessType === 'ecommerce' ? (
                // Coming Soon Message for eCommerce
                <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-8">
                  <div className="text-center">
                    <div className="bg-orange-500/20 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                      <Sparkles className="h-10 w-10 text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-orange-400 mb-3">eCommerce Lead Generation</h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                      We're perfecting our eCommerce lead discovery system with advanced Shopify detection, 
                      social media analytics, and revenue estimation features.
                    </p>
                    <Badge className="bg-orange-500/20 text-orange-400 px-4 py-2">Coming Soon</Badge>
                  </div>
                </div>
              ) : businessType === 'local_service' ? (
                // Accordion view for local services
                <Accordion type="multiple" className="w-full">
                  {Object.entries(nicheGroups).map(([groupName, groupNiches]) => {
                    const categoryNiches = getNichesByGroup(groupName)
                    if (categoryNiches.length === 0) return null
                    
                    return (
                      <AccordionItem key={groupName} value={groupName} className="border-none">
                        <AccordionTrigger className="text-sm font-medium text-gray-300 hover:text-white bg-[#2A2A2A] px-4 py-3 rounded-lg hover:no-underline">
                          {groupName} ({categoryNiches.length})
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-3 bg-[#1A1A1A] rounded-b-lg">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {categoryNiches.map((niche: any) => (
                              <div key={niche.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={niche.id}
                                  checked={selectedNiches.includes(niche.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedNiches(prev => [...prev, niche.id])
                                    } else {
                                      setSelectedNiches(prev => prev.filter(id => id !== niche.id))
                                    }
                                  }}
                                  className="border-[#444] data-[state=checked]:bg-blue-600"
                                />
                                <label htmlFor={niche.id} className="text-sm text-gray-400 cursor-pointer">
                                  {niche.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              ) : (
                // Accordion view for ecommerce as well
                <Accordion type="multiple" className="w-full">
                                     <AccordionItem value="ecommerce" className="border-none">
                    <AccordionTrigger className="text-sm font-medium text-gray-300 hover:text-white bg-[#2A2A2A] px-4 py-3 rounded-lg hover:no-underline">
                      eCommerce Categories ({filteredNiches.length})
                    </AccordionTrigger>
                    <AccordionContent className="px-4 py-3 bg-[#1A1A1A] rounded-b-lg">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                        {filteredNiches.map((niche: any) => (
                          <div key={niche.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={niche.id}
                              checked={selectedNiches.includes(niche.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedNiches(prev => [...prev, niche.id])
                                } else {
                                  setSelectedNiches(prev => prev.filter(id => id !== niche.id))
                                }
                              }}
                              className="border-[#444] data-[state=checked]:bg-blue-600"
                            />
                            <label htmlFor={niche.id} className="text-sm text-gray-400 cursor-pointer">
                              {niche.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>

            {selectedNiches.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-400">Selected Niches ({selectedNiches.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedNiches.map(nicheId => {
                    const niche = niches.find(n => n.id === nicheId)
                    return niche ? (
                      <Badge key={nicheId} variant="secondary" className="bg-blue-600/20 text-blue-300">
                        {niche.name}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
            )}

            {/* Location Filter (for local services) */}
            {businessType === 'local_service' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-400">Location Targeting</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input
                    placeholder="Country"
                    value={location.country}
                    onChange={(e) => setLocation(prev => ({ ...prev, country: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                  />
                  <Input
                    placeholder="State/Province"
                    value={location.state}
                    onChange={(e) => setLocation(prev => ({ ...prev, state: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                  />
                  <Input
                    placeholder="City"
                    value={location.city}
                    onChange={(e) => setLocation(prev => ({ ...prev, city: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                  />
                  <Select
                    value={location.radius}
                    onValueChange={(value) => setLocation(prev => ({ ...prev, radius: value }))}
                  >
                    <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-gray-400">
                      <SelectValue placeholder="Search radius" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 miles</SelectItem>
                      <SelectItem value="10">10 miles</SelectItem>
                      <SelectItem value="15">15 miles</SelectItem>
                      <SelectItem value="25">25 miles</SelectItem>
                      <SelectItem value="50">50 miles</SelectItem>
                      <SelectItem value="75">75 miles</SelectItem>
                      <SelectItem value="100">100 miles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="space-y-2">
              <Button
                onClick={generateLeads}
                disabled={isGenerating || selectedNiches.length === 0 || businessType === 'ecommerce' || (usageData?.remaining ?? 0) <= 0}
                className={`w-full ${
                  (usageData?.remaining ?? 0) <= 0 
                    ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {businessType === 'ecommerce' ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Coming Soon
                  </>
                ) : isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finding Real Businesses...
                  </>
                ) : (usageData?.remaining ?? 0) <= 0 ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Daily Limit Reached
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Find Real Businesses
                  </>
                )}
              </Button>
              
              {selectedNiches.length > 0 && usageData && (
                <div className="text-xs text-center text-gray-500">
                  Will search for up to {Math.min(
                    Math.ceil(usageData.maxLeadsPerGeneration / selectedNiches.length) * selectedNiches.length,
                    usageData.maxLeadsPerGeneration
                  )} businesses ({Math.ceil(usageData.maxLeadsPerGeneration / selectedNiches.length)} per niche)
                </div>
              )}
            </div>
            </CardContent>
          </Card>

          {/* Generated Leads Panel */}
          <Card className="bg-[#1A1A1A] border-[#333] xl:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-400">
                      Generated Leads ({filteredLeads.length}{leads.length !== filteredLeads.length && ` of ${leads.length}`})
                    </h2>
                  </div>
                  {leads.length > 0 && (
                    <Button
                      onClick={() => setShowFilters(!showFilters)}
                      variant="outline"
                      size="sm"
                      className={`border-[#333] ${showFilters ? 'bg-[#222] text-white' : 'text-gray-400 hover:bg-[#222] hover:text-white'}`}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {(filters.hasPhone || filters.hasEmail || filters.hasWebsite || filters.searchQuery) && (
                        <Badge className="ml-2 bg-blue-600/20 text-blue-300" variant="secondary">
                          Active
                        </Badge>
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                    <Button
                      onClick={deleteSelectedLeads}
                      disabled={selectedLeads.length === 0}
                      variant="outline"
                      size="sm"
                      className="bg-red-900/20 text-red-400 border-red-800 hover:bg-red-900/40 hover:text-red-300 disabled:opacity-50"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Delete ({selectedLeads.length})
                    </Button>
                    <Button
                      onClick={clearAllLeads}
                      disabled={isClearing || leads.length === 0}
                      variant="outline"
                      size="sm"
                      className="bg-orange-900/20 text-orange-400 border-orange-800 hover:bg-orange-900/40 hover:text-orange-300 disabled:opacity-50"
                    >
                      {isClearing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-2" />
                      )}
                      Clear All
                    </Button>
                    <Button
                      onClick={sendToOutreach}
                      disabled={selectedLeads.length === 0}
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send to Outreach ({selectedLeads.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filter Panel */}
                {showFilters && (
                  <div className="mb-4 p-4 bg-[#2A2A2A] border border-[#444] rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-400">Quick Filters</Label>
                      <Button
                        onClick={() => setFilters({ hasPhone: false, hasEmail: false, hasWebsite: false, searchQuery: '' })}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasPhone"
                          checked={filters.hasPhone}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, hasPhone: checked as boolean }))
                          }
                          className="border-[#444] data-[state=checked]:bg-blue-600"
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
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, hasEmail: checked as boolean }))
                          }
                          className="border-[#444] data-[state=checked]:bg-blue-600"
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
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, hasWebsite: checked as boolean }))
                          }
                          className="border-[#444] data-[state=checked]:bg-blue-600"
                        />
                        <label htmlFor="hasWebsite" className="text-sm text-gray-400 cursor-pointer flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Has Website
                        </label>
                      </div>
                      
                      <Input
                        placeholder="Search leads..."
                        value={filters.searchQuery}
                        onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                        className="bg-[#1A1A1A] border-[#444] text-gray-400 placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#333]">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedLeads(filteredLeads.map(lead => lead.id))
                              } else {
                                setSelectedLeads([])
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="text-gray-400">Business</TableHead>
                        <TableHead className="text-gray-400">Contact</TableHead>
                        <TableHead className="text-gray-400">Social Media</TableHead>
                        {businessType === 'ecommerce' ? (
                          <>
                            <TableHead className="text-gray-400">Revenue Est.</TableHead>
                            <TableHead className="text-gray-400">Followers</TableHead>
                            <TableHead className="text-gray-400">Platform</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="text-gray-400">Location</TableHead>
                          </>
                        )}
                        <TableHead className="text-gray-400">Niche</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow
                          key={lead.id}
                          className="border-[#333] hover:bg-[#222]/50 cursor-pointer"
                          onClick={() => {
                            if (selectedLeads.includes(lead.id)) {
                              setSelectedLeads(prev => prev.filter(id => id !== lead.id))
                            } else {
                              setSelectedLeads(prev => [...prev, lead.id])
                            }
                          }}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedLeads.includes(lead.id)}
                              onChange={() => {}}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-400">{lead.business_name}</div>
                              {lead.owner_name && (
                                <div className="text-sm text-gray-500">{lead.owner_name}</div>
                              )}
                              {lead.website && (
                                <a
                                  href={lead.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Website
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-400">
                              {lead.email && (
                                <div className="flex items-center gap-1 mb-1">
                                  <Mail className="h-3 w-3" />
                                  {lead.email}
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {lead.phone}
                                </div>
                              )}
                              {!lead.email && !lead.phone && <span className="text-gray-500">-</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {lead.instagram_handle && (
                                <a
                                  href={getSocialMediaLink('instagram', lead.instagram_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-400 hover:text-pink-300"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`@${lead.instagram_handle}`}
                                >
                                  {getSocialMediaIcon('instagram')}
                                </a>
                              )}
                              {lead.facebook_page && (
                                <a
                                  href={getSocialMediaLink('facebook', lead.facebook_page)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`Facebook: ${lead.facebook_page}`}
                                >
                                  {getSocialMediaIcon('facebook')}
                                </a>
                              )}
                              {lead.linkedin_profile && (
                                <a
                                  href={getSocialMediaLink('linkedin', lead.linkedin_profile)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:text-blue-400"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`LinkedIn: ${lead.linkedin_profile}`}
                                >
                                  {getSocialMediaIcon('linkedin')}
                                </a>
                              )}
                              {lead.twitter_handle && (
                                <a
                                  href={getSocialMediaLink('twitter', lead.twitter_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-white"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`Twitter: @${lead.twitter_handle}`}
                                >
                                  {getSocialMediaIcon('twitter')}
                                </a>
                              )}
                              {!lead.instagram_handle && !lead.facebook_page && !lead.linkedin_profile && !lead.twitter_handle && (
                                <span className="text-gray-500">-</span>
                              )}
                            </div>
                          </TableCell>
                          {businessType === 'ecommerce' ? (
                            <>
                              <TableCell>
                                <div className="text-sm text-gray-400">
                                  {(lead as any).monthly_revenue_estimate || 
                                   <span className="text-gray-500">Estimating...</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-400">
                                  {(lead as any).follower_count_instagram ? 
                                    `${((lead as any).follower_count_instagram / 1000).toFixed(1)}k IG` : 
                                    <span className="text-gray-500">Analyzing...</span>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-400">
                                  {(lead as any).shopify_detected ? (
                                    <span className="text-green-400">Shopify</span>
                                  ) : (
                                    <span className="text-gray-500">Custom</span>
                                  )}
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>
                                <div className="text-sm text-gray-400">
                                  {lead.city && lead.state_province ? (
                                    <div>{lead.city}, {lead.state_province}</div>
                                  ) : lead.city ? (
                                    <div>{lead.city}</div>
                                  ) : <span className="text-gray-500">-</span>}
                                </div>
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <Badge variant="secondary" className="bg-gray-600/20 text-gray-300">
                              {lead.niche_name || 'General'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {filteredLeads.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      {leads.length === 0 ? (
                        <>
                          <p>No leads generated yet</p>
                          <p className="text-sm">Configure your search parameters and click "Find Real Businesses"</p>
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
        </div>

      {/* Manual Lead Add Dialog */}
      <Dialog open={isAddingManual} onOpenChange={setIsAddingManual}>
        <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-400">Add Manual Lead</DialogTitle>
            <DialogDescription>
              Manually add a lead to your database
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Business Name *</Label>
              <Input className="bg-[#2A2A2A] border-[#444] text-gray-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Owner Name</Label>
              <Input className="bg-[#2A2A2A] border-[#444] text-gray-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Email *</Label>
              <Input type="email" className="bg-[#2A2A2A] border-[#444] text-gray-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Phone</Label>
              <Input className="bg-[#2A2A2A] border-[#444] text-gray-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Website</Label>
              <Input className="bg-[#2A2A2A] border-[#444] text-gray-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Niche</Label>
              <Select>
                <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-gray-400">
                  <SelectValue placeholder="Select niche" />
                </SelectTrigger>
                                  <SelectContent>
                    {filteredNiches.map((niche: any) => (
                      <SelectItem key={niche.id} value={niche.name}>
                        {niche.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsAddingManual(false)}
              className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsAddingManual(false)
                toast.success('Lead added successfully!')
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 