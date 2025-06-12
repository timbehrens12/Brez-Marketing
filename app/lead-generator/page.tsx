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
import { Loader2, Search, MapPin, Globe, Building2, Phone, Mail, ExternalLink, Send, Star, TrendingUp, Instagram, Facebook, Linkedin, Sparkles } from 'lucide-react'
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
  tiktok_handle?: string
  monthly_revenue_estimate?: string
  follower_count_instagram?: number
  follower_count_tiktok?: number
  engagement_rate?: number
  ad_spend_estimate?: string
  shopify_detected?: boolean
  marketing_prospect_reason?: string
  created_at: string
}

export default function LeadGeneratorPage() {
  const { selectedBrandId } = useBrandContext()
  const { userId } = useAuth()
  
  const [businessType, setBusinessType] = useState<'ecommerce' | 'local_service'>('local_service')
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [location, setLocation] = useState({ country: '', state: '', city: '', radius: '' })
  const [isGenerating, setIsGenerating] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [niches, setNiches] = useState<any[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [isClearing, setIsClearing] = useState(false)
  
  // Weekly rate limiting states
  const [weeklyGenerations, setWeeklyGenerations] = useState(0)
  const [lastGenerationTime, setLastGenerationTime] = useState<Date | null>(null)
  
  // Updated moderation limits - changed from daily to weekly
  const MAX_NICHES_PER_SEARCH = 3
  const MAX_LEADS_PER_GENERATION = 25 // Increased from 15
  const MAX_WEEKLY_GENERATIONS = 5 // Changed from 10 daily to 5 weekly
  const MIN_TIME_BETWEEN_GENERATIONS = 30000 // 30 seconds
  const MAX_LEADS_STORAGE = 500 // Max leads to keep in database per user

  // Niche grouping for local services only
  const nicheGroups: Record<string, string[]> = {
    "Home & Property": ["Home Cleaning", "Landscaping", "Pool Service", "Pest Control", "HVAC", "Plumbing", "Electrical", "Roofing", "Handyman", "Interior Design"],
    "Health & Beauty": ["Hair Salon", "Nail Salon", "Spa", "Massage Therapy", "Personal Training", "Yoga Studio", "Dermatology", "Chiropractic", "Physical Therapy"],
    "Professional Services": ["Real Estate", "Insurance", "Accounting", "Legal Services", "Marketing Agency", "Photography", "Web Design", "Consulting", "Financial Planning"],
    "Food & Hospitality": ["Restaurant", "Catering", "Food Truck", "Bar/Pub", "Coffee Shop", "Event Planning", "Hotel/Lodging"],
    "Automotive & Transportation": ["Auto Repair", "Car Dealership", "Towing Service", "Car Wash", "Uber/Taxi", "Moving Company"],
    "Education & Childcare": ["Tutoring", "Music Lessons", "Daycare", "Preschool", "Dance Studio", "Martial Arts"],
    "Retail & Shopping": ["Boutique", "Jewelry Store", "Pet Store", "Florist", "Grocery Store", "Hardware Store"]
  }

  // Load data on component mount
  useEffect(() => {
    loadNiches()
    
    if (selectedBrandId && userId) {
      loadExistingLeads()
      loadStats()
    }
  }, [selectedBrandId, userId])

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
    if (!userId || !selectedBrandId) return
    
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, business_name, owner_name, phone, email, website, city, state_province, business_type, niche_name, instagram_handle, facebook_page, linkedin_profile, created_at')
        .eq('user_id', userId)
        .eq('brand_id', selectedBrandId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setLeads((data as Lead[]) || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    }
  }

  const loadStats = async () => {
    if (!userId || !selectedBrandId) return
    
    try {
      const { data: allLeads, error } = await supabase
        .from('leads')
        .select('created_at')
        .eq('user_id', userId)
        .eq('brand_id', selectedBrandId)
      
      if (error) throw error
      
      setTotalLeads(allLeads?.length || 0)
      
      // Load weekly generation count from localStorage
      const currentWeek = getWeekKey()
      const storedData = localStorage.getItem(`leadGen_weekly_${userId}_${currentWeek}`)
      if (storedData) {
        try {
          const { count, lastTime } = JSON.parse(storedData)
          setWeeklyGenerations(count || 0)
          setLastGenerationTime(lastTime ? new Date(lastTime) : null)
        } catch (error) {
          console.error('Error parsing stored generation data:', error)
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Helper function to get week key for localStorage
  const getWeekKey = () => {
    const now = new Date()
    const year = now.getFullYear()
    const week = Math.ceil(((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7)
    return `${year}-W${week}`
  }

  // Check if user can generate leads
  const canGenerateLeads = () => {
    const now = new Date()
    
    // Check weekly limit
    if (weeklyGenerations >= MAX_WEEKLY_GENERATIONS) {
      return { canGenerate: false, reason: `Weekly limit reached (${MAX_WEEKLY_GENERATIONS} generations per week)` }
    }
    
    // Check time between generations
    if (lastGenerationTime && (now.getTime() - lastGenerationTime.getTime()) < MIN_TIME_BETWEEN_GENERATIONS) {
      const remainingTime = Math.ceil((MIN_TIME_BETWEEN_GENERATIONS - (now.getTime() - lastGenerationTime.getTime())) / 1000)
      return { canGenerate: false, reason: `Please wait ${remainingTime} seconds before generating again` }
    }
    
    // Check niche selection limit
    if (selectedNiches.length > MAX_NICHES_PER_SEARCH) {
      return { canGenerate: false, reason: `Please select maximum ${MAX_NICHES_PER_SEARCH} niches for better results` }
    }
    
    // Check if approaching storage limit
    if (totalLeads >= MAX_LEADS_STORAGE) {
      return { canGenerate: false, reason: `Storage limit reached (${MAX_LEADS_STORAGE} leads). Please clear some leads first.` }
    }
    
    return { canGenerate: true, reason: '' }
  }

  // Update generation tracking
  const updateGenerationTracking = () => {
    const now = new Date()
    const currentWeek = getWeekKey()
    
    const newCount = weeklyGenerations + 1
    setWeeklyGenerations(newCount)
    setLastGenerationTime(now)
    
    // Store in localStorage with week key
    localStorage.setItem(`leadGen_weekly_${userId}_${currentWeek}`, JSON.stringify({
      count: newCount,
      lastTime: now.toISOString()
    }))
  }

  const getNichesByGroup = (groupName: string) => {
    return niches.filter(niche => 
      niche.business_type === businessType && 
      nicheGroups[groupName]?.includes(niche.name)
    )
  }

  const generateLeads = async () => {
    const validation = canGenerateLeads()
    if (!validation.canGenerate) {
      toast.error(validation.reason)
      return
    }

    if (!selectedBrandId || !userId) {
      toast.error('Please select a brand first')
      return
    }

    if (selectedNiches.length === 0) {
      toast.error('Please select at least one niche')
      return
    }

    if (businessType === 'ecommerce') {
      toast.error('eCommerce lead generation is coming soon!')
      return
    }

    setIsGenerating(true)
    
    try {
      const selectedNicheNames = selectedNiches.map(nicheId => {
        const niche = niches.find(n => n.id === nicheId)
        return niche?.name
      }).filter(Boolean)

      const response = await fetch('/api/leads/generate-real', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrandId,
          userId,
          businessType,
          niches: selectedNicheNames,
          location: businessType === 'local_service' ? location : null,
          maxLeads: MAX_LEADS_PER_GENERATION
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate leads')
      }

      const data = await response.json()
      
      if (data.leads && data.leads.length > 0) {
        // Update generation tracking
        updateGenerationTracking()
        
        // Reload leads to show new ones
        await loadExistingLeads()
        await loadStats()
        
        toast.success(`Generated ${data.leads.length} new leads!`)
      } else {
        toast.error('No leads found with the specified criteria')
      }
    } catch (error) {
      console.error('Error generating leads:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate leads')
    } finally {
      setIsGenerating(false)
    }
  }

  const sendToOutreach = () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to send to outreach')
      return
    }
    
    toast.success(`${selectedLeads.length} leads prepared for outreach`)
    // TODO: Implement outreach functionality
  }

  const clearAllLeads = async () => {
    if (!userId || !selectedBrandId) return
    
    setIsClearing(true)
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('user_id', userId)
        .eq('brand_id', selectedBrandId)
      
      if (error) throw error
      
      setLeads([])
      setSelectedLeads([])
      setTotalLeads(0)
      toast.success('All leads cleared')
    } catch (error) {
      console.error('Error clearing leads:', error)
      toast.error('Failed to clear leads')
    } finally {
      setIsClearing(false)
    }
  }

  const deleteSelectedLeads = async () => {
    if (selectedLeads.length === 0 || !userId || !selectedBrandId) return
    
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', selectedLeads)
        .eq('user_id', userId)
        .eq('brand_id', selectedBrandId)
      
      if (error) throw error
      
      setLeads(prev => prev.filter(lead => !selectedLeads.includes(lead.id)))
      setSelectedLeads([])
      setTotalLeads(prev => prev - selectedLeads.length)
      toast.success(`Deleted ${selectedLeads.length} leads`)
    } catch (error) {
      console.error('Error deleting leads:', error)
      toast.error('Failed to delete leads')
    }
  }

  // Fixed social media link generation
  const getSocialMediaLink = (platform: string, handle: string) => {
    if (!handle) return '#'
    
    // Clean handle (remove @ if present)
    const cleanHandle = handle.replace(/^@/, '')
    
    switch (platform) {
      case 'instagram':
        return `https://instagram.com/${cleanHandle}`
      case 'facebook':
        // For Facebook, if it looks like a full URL, use it; otherwise construct basic URL
        if (handle.includes('facebook.com') || handle.includes('fb.com')) {
          return handle.startsWith('http') ? handle : `https://${handle}`
        }
        return `https://facebook.com/${cleanHandle}`
      case 'linkedin':
        if (handle.includes('linkedin.com')) {
          return handle.startsWith('http') ? handle : `https://${handle}`
        }
        return `https://linkedin.com/in/${cleanHandle}`
      case 'tiktok':
        return `https://tiktok.com/@${cleanHandle}`
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
      default:
        return null
    }
  }

  // Filter niches based on business type
  const filteredNiches = niches.filter(niche => niche.business_type === businessType)

  if (!selectedBrandId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">No Brand Selected</h2>
            <p className="text-gray-500">Please select a brand from the sidebar to access lead generation.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-400">Lead Generator</h1>
            <p className="text-gray-500">Discover and generate high-quality leads for your business</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{totalLeads}</div>
              <p className="text-sm text-gray-500">Stored in database</p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-400">Weekly Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{weeklyGenerations}</div>
              <p className="text-sm text-gray-500">of {MAX_WEEKLY_GENERATIONS} generations this week</p>
              <div className="w-full bg-[#333] rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(weeklyGenerations / MAX_WEEKLY_GENERATIONS) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Configuration */}
          <div className="lg:col-span-1">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-gray-400">Search Configuration</CardTitle>
                <CardDescription>Configure your lead generation parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Business Type Selection */}
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
                  ) : (
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
                              <div className="grid grid-cols-1 gap-2">
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
                    <div className="grid grid-cols-1 gap-3">
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

                {/* Usage Stats */}
                {businessType === 'local_service' && (
                  <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-medium text-gray-400">Weekly Usage</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-white">{weeklyGenerations}</div>
                        <div className="text-xs text-gray-500">of {MAX_WEEKLY_GENERATIONS} generations</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{selectedNiches.length}</div>
                        <div className="text-xs text-gray-500">of {MAX_NICHES_PER_SEARCH} niches selected</div>
                      </div>
                    </div>
                    <div className="w-full bg-[#1A1A1A] rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(weeklyGenerations / MAX_WEEKLY_GENERATIONS) * 100}%` }}
                      />
                    </div>
                    {selectedNiches.length > MAX_NICHES_PER_SEARCH && (
                      <div className="text-xs text-orange-400">
                        ⚠️ Please select maximum {MAX_NICHES_PER_SEARCH} niches for optimal results
                      </div>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={generateLeads}
                  disabled={isGenerating || selectedNiches.length === 0 || businessType === 'ecommerce'}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Leads...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Generate {MAX_LEADS_PER_GENERATION} Leads
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Generated Leads */}
          <div className="lg:col-span-2">
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-400">Generated Leads ({leads.length})</CardTitle>
                    <CardDescription>Your discovered business prospects</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedLeads.length > 0 && (
                      <>
                        <Button
                          onClick={sendToOutreach}
                          size="sm"
                          className="bg-green-600 hover:bg-green-500 text-white"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send to Outreach ({selectedLeads.length})
                        </Button>
                        <Button
                          onClick={deleteSelectedLeads}
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400 hover:bg-red-500/10"
                        >
                          Delete Selected
                        </Button>
                      </>
                    )}
                    {leads.length > 0 && (
                      <Button
                        onClick={clearAllLeads}
                        disabled={isClearing}
                        size="sm"
                        variant="outline"
                        className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
                      >
                        {isClearing ? (
                          <Loader2 className="h-4 animate-spin" />
                        ) : (
                          'Clear All'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#333]">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedLeads.length === leads.length && leads.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedLeads(leads.map(lead => lead.id))
                              } else {
                                setSelectedLeads([])
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead className="text-gray-400">Business</TableHead>
                        <TableHead className="text-gray-400">Contact</TableHead>
                        <TableHead className="text-gray-400">Social Media</TableHead>
                        <TableHead className="text-gray-400">Location</TableHead>
                        <TableHead className="text-gray-400">Niche</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
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
                              {!lead.instagram_handle && !lead.facebook_page && !lead.linkedin_profile && (
                                <span className="text-gray-500">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-400">
                              {lead.city && lead.state_province ? (
                                <div>{lead.city}, {lead.state_province}</div>
                              ) : lead.city ? (
                                <div>{lead.city}</div>
                              ) : <span className="text-gray-500">-</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-gray-600/20 text-gray-300">
                              {lead.niche_name || 'General'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {leads.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No leads generated yet</p>
                      <p className="text-sm">Configure your search parameters and click "Generate Leads"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 