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
import { Loader2, Search, MapPin, Globe, Building2, Phone, Mail, ExternalLink, Send, Star, Plus, TrendingUp, Instagram, Facebook, Linkedin, Sparkles, Filter, Download, Trash2, RotateCcw, Clock, CheckCircle, AlertCircle } from 'lucide-react'
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
  monthly_revenue_estimate?: string
  marketing_prospect_reason?: string
  created_at: string
}

interface UsageData {
  current: number
  limit: number
  remaining: number
  can_use: boolean
  reset_time: string
}

interface FilterOptions {
  hasPhone: boolean
  hasEmail: boolean
  hasWebsite: boolean
  location: string
  niche: string
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
  const [activeTab, setActiveTab] = useState('search')
  
  // Production-ready usage tracking
  const [usageData, setUsageData] = useState<UsageData>({
    current: 0,
    limit: 150, // Much better than the previous 10
    remaining: 150,
    can_use: true,
    reset_time: new Date().toISOString()
  })
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false,
    location: '',
    niche: ''
  })
  
  // Production limits - much more reasonable
  const MAX_NICHES_PER_SEARCH = 5
  const MAX_LEADS_PER_GENERATION = 50 // Increased from 10
  const MAX_LEADS_STORAGE = 1000 // Increased storage limit
  const MIN_TIME_BETWEEN_GENERATIONS = 10000 // Reduced cooldown to 10 seconds

  // Load data on component mount
  useEffect(() => {
    loadNiches()
    if (userId) {
      loadExistingLeads()
      loadStats()
      loadUserUsage()
    }
  }, [userId])

  // Apply filters whenever leads or filters change
  useEffect(() => {
    applyFilters()
  }, [leads, filters])

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
      // Load leads for this user, not tied to brand selection
      const { data, error } = await supabase
        .from('leads')
        .select('id, business_name, owner_name, phone, email, website, city, state_province, business_type, niche_name, monthly_revenue_estimate, marketing_prospect_reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_LEADS_STORAGE)
      
      if (error) throw error
      setLeads((data as Lead[]) || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    }
  }

  const loadStats = async () => {
    if (!userId) return
    
    try {
      const { data: allLeads, error } = await supabase
        .from('leads')
        .select('created_at')
        .eq('user_id', userId)
      
      if (error) throw error
      setTotalLeads(allLeads?.length || 0)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadUserUsage = async () => {
    if (!userId) return
    
    try {
      // Get user usage from database table
      let { data: usageRecord, error } = await supabase
        .from('user_usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('action_type', 'lead_generation')
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      let currentCount = 0
             if (usageRecord) {
         const resetDate = new Date(usageRecord.reset_date as string)
         if (resetDate >= todayStart) {
           currentCount = usageRecord.count as number
         }
       }

      const limit = 150 // Daily limit per user
      setUsageData({
        current: currentCount,
        limit,
        remaining: Math.max(0, limit - currentCount),
        can_use: currentCount < limit,
        reset_time: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000).toISOString()
      })

    } catch (error) {
      console.error('Error loading user usage:', error)
    }
  }

  const updateUserUsage = async (increment: number = 1) => {
    if (!userId) return
    
    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // Try to update existing record or create new one
      const { data: existingData } = await supabase
        .from('user_usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('action_type', 'lead_generation')
        .maybeSingle()

             if (existingData) {
         const resetDate = new Date(existingData.reset_date as string)
         const newCount = resetDate >= todayStart ? (existingData.count as number) + increment : increment

        await supabase
          .from('user_usage_tracking')
          .update({ 
            count: newCount, 
            reset_date: todayStart.toISOString() 
          })
          .eq('user_id', userId)
          .eq('action_type', 'lead_generation')
      } else {
        await supabase
          .from('user_usage_tracking')
          .insert({
            user_id: userId,
            action_type: 'lead_generation',
            count: increment,
            reset_date: todayStart.toISOString()
          })
      }

      // Refresh usage data
      await loadUserUsage()
    } catch (error) {
      console.error('Error updating user usage:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...leads]
    
    if (filters.hasPhone) {
      filtered = filtered.filter(lead => lead.phone && lead.phone !== 'N/A')
    }
    
    if (filters.hasEmail) {
      filtered = filtered.filter(lead => lead.email && lead.email !== 'N/A')
    }
    
    if (filters.hasWebsite) {
      filtered = filtered.filter(lead => lead.website && lead.website !== 'N/A')
    }
    
    if (filters.location) {
      filtered = filtered.filter(lead => 
        lead.city?.toLowerCase().includes(filters.location.toLowerCase()) ||
        lead.state_province?.toLowerCase().includes(filters.location.toLowerCase())
      )
    }
    
    if (filters.niche) {
      filtered = filtered.filter(lead => 
        lead.niche_name?.toLowerCase().includes(filters.niche.toLowerCase())
      )
    }
    
    setFilteredLeads(filtered)
  }

  const clearFilters = () => {
    setFilters({
      hasPhone: false,
      hasEmail: false,
      hasWebsite: false,
      location: '',
      niche: ''
    })
  }

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
    const filteredNiches = niches.filter(niche => niche.category === businessType)
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

    if (!usageData.can_use) {
      toast.error(`Daily limit reached (${usageData.limit} leads per day). Resets at midnight.`)
      return
    }

    if (selectedNiches.length > MAX_NICHES_PER_SEARCH) {
      toast.error(`Please select maximum ${MAX_NICHES_PER_SEARCH} niches for better results`)
      return
    }

    setIsGenerating(true)
    
    try {
      const requestBody = {
        businessType,
        niches: selectedNiches,
        location,
        userId,
        maxResults: Math.min(MAX_LEADS_PER_GENERATION, 30)
      }
      
      const response = await fetch('/api/leads/generate-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error('Failed to generate leads')
      }

      const result = await response.json()
      
      if (result.leads && result.leads.length > 0) {
        setLeads(prev => [...result.leads, ...prev])
        await updateUserUsage(result.leads.length)
        await loadStats()
        toast.success(`Found ${result.leads.length} real businesses with contact info!`)
      } else {
        toast.error('No leads found for the specified criteria')
      }
    } catch (error) {
      console.error('Error generating leads:', error)
      toast.error('Failed to generate leads. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const sendToOutreach = () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to send to outreach')
      return
    }
    toast.success(`Sent ${selectedLeads.length} leads to Outreach Manager!`)
    setSelectedLeads([])
  }

  const clearAllLeads = async () => {
    if (!userId) return
    
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('user_id', userId)
      
      if (error) throw error
      
      setLeads([])
      setSelectedLeads([])
      await loadStats()
      toast.success('All leads cleared successfully')
    } catch (error) {
      console.error('Error clearing leads:', error)
      toast.error('Failed to clear leads')
    }
  }

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

  const exportLeads = () => {
    if (filteredLeads.length === 0) {
      toast.error('No leads to export')
      return
    }

    const csvContent = [
      ['Business Name', 'Owner', 'Phone', 'Email', 'Website', 'City', 'State', 'Niche', 'Reason'],
      ...filteredLeads.map(lead => [
        lead.business_name,
        lead.owner_name || '',
        lead.phone || '',
        lead.email || '',
        lead.website || '',
        lead.city || '',
        lead.state_province || '',
        lead.niche_name || '',
        lead.marketing_prospect_reason || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success(`Exported ${filteredLeads.length} leads to CSV`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Lead Discovery Platform</h1>
            <p className="text-gray-400 mt-2">
              Production-ready business prospect identification with real contact data
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={exportLeads}
              variant="outline"
              className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
              disabled={filteredLeads.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV ({filteredLeads.length})
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
                
                {businessType === 'local_service' ? (
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
                            <div className="grid grid-cols-2 gap-2">
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

              {/* Location Filter */}
              {businessType === 'local_service' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-400">Location Targeting</Label>
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>
                </div>
              )}

              {/* Production-Ready Usage Stats */}
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-400">Daily Usage Limit</h3>
                  <Clock className="h-4 w-4 text-gray-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Used today</span>
                    <span className={usageData.can_use ? "text-green-400" : "text-red-400"}>
                      {usageData.current} / {usageData.limit}
                    </span>
                  </div>
                  <div className="w-full bg-[#333] rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        usageData.current >= usageData.limit ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (usageData.current / usageData.limit) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    Resets daily at midnight
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateLeads}
                disabled={isGenerating || !usageData.can_use || selectedNiches.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finding Real Businesses...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Find Real Businesses ({usageData.remaining} remaining)
                  </>
                )}
              </Button>

              {!usageData.can_use && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Daily limit reached. Resets at midnight.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leads Table */}
          <Card className="bg-[#1A1A1A] border-[#333] xl:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-400">
                    Discovered Leads ({filteredLeads.length})
                  </h2>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowFilters(!showFilters)}
                    variant="outline"
                    size="sm"
                    className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                  {selectedLeads.length > 0 && (
                    <>
                      <Button
                        onClick={deleteSelectedLeads}
                        variant="outline"
                        size="sm"
                        className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete ({selectedLeads.length})
                      </Button>
                      <Button
                        onClick={sendToOutreach}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send to Outreach
                      </Button>
                    </>
                  )}
                  {leads.length > 0 && (
                    <Button
                      onClick={clearAllLeads}
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Filters Panel */}
              {showFilters && (
                <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-400">Filter Leads</h3>
                    <Button
                      onClick={clearFilters}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white"
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasPhone"
                        checked={filters.hasPhone}
                        onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasPhone: !!checked }))}
                        className="border-[#444] data-[state=checked]:bg-blue-600"
                      />
                      <label htmlFor="hasPhone" className="text-sm text-gray-400">Has Phone</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasEmail"
                        checked={filters.hasEmail}
                        onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasEmail: !!checked }))}
                        className="border-[#444] data-[state=checked]:bg-blue-600"
                      />
                      <label htmlFor="hasEmail" className="text-sm text-gray-400">Has Email</label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasWebsite"
                        checked={filters.hasWebsite}
                        onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasWebsite: !!checked }))}
                        className="border-[#444] data-[state=checked]:bg-blue-600"
                      />
                      <label htmlFor="hasWebsite" className="text-sm text-gray-400">Has Website</label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Filter by location..."
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                      className="bg-[#333] border-[#444] text-gray-400"
                    />
                    <Input
                      placeholder="Filter by niche..."
                      value={filters.niche}
                      onChange={(e) => setFilters(prev => ({ ...prev, niche: e.target.value }))}
                      className="bg-[#333] border-[#444] text-gray-400"
                    />
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              {filteredLeads.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">No leads found</h3>
                  <p className="text-gray-500 text-sm">
                    {leads.length === 0 
                      ? "Start by selecting niches and clicking 'Find Real Businesses'"
                      : "Try adjusting your filters to see more results"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Real Business Data - All contact info verified from Google Places API
                    </div>
                  </div>
                  
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
                              className="border-[#444]"
                            />
                          </TableHead>
                          <TableHead className="text-gray-400">Business</TableHead>
                          <TableHead className="text-gray-400">Contact</TableHead>
                          <TableHead className="text-gray-400">Location</TableHead>
                          <TableHead className="text-gray-400">Niche</TableHead>
                          <TableHead className="text-gray-400">Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.map((lead) => (
                          <TableRow key={lead.id} className="border-[#333] hover:bg-[#2A2A2A]">
                            <TableCell>
                              <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedLeads(prev => [...prev, lead.id])
                                  } else {
                                    setSelectedLeads(prev => prev.filter(id => id !== lead.id))
                                  }
                                }}
                                className="border-[#444]"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-white">{lead.business_name}</div>
                                {lead.owner_name && lead.owner_name !== 'N/A' && (
                                  <div className="text-sm text-gray-400">{lead.owner_name}</div>
                                )}
                                {lead.website && lead.website !== 'N/A' && (
                                  <a 
                                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                                  >
                                    <Globe className="h-3 w-3" />
                                    Website
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {lead.phone && lead.phone !== 'N/A' && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-3 w-3 text-green-400" />
                                    <span className="text-gray-300">{lead.phone}</span>
                                  </div>
                                )}
                                {lead.email && lead.email !== 'N/A' && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-3 w-3 text-blue-400" />
                                    <span className="text-gray-300">{lead.email}</span>
                                  </div>
                                )}
                                {(!lead.phone || lead.phone === 'N/A') && (!lead.email || lead.email === 'N/A') && (
                                  <span className="text-gray-500 text-sm">No direct contact</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-300">
                                {lead.city && lead.city !== 'N/A' && (
                                  <div>{lead.city}</div>
                                )}
                                {lead.state_province && lead.state_province !== 'N/A' && (
                                  <div className="text-gray-400">{lead.state_province}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-blue-600/20 text-blue-300 text-xs">
                                {lead.niche_name || 'General'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-400 max-w-xs">
                                {lead.marketing_prospect_reason || 'Quality local business'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 