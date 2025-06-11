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
import { Loader2, Search, MapPin, Globe, Building2, Phone, Mail, ExternalLink, Send, Star, Filter, Download, Plus, TrendingUp, Instagram, Facebook, Linkedin } from 'lucide-react'
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
  
  const [businessType, setBusinessType] = useState<'ecommerce' | 'local_service'>('ecommerce')
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [location, setLocation] = useState({ country: '', state: '', city: '', radius: '' })
  const [keywords, setKeywords] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [isAddingManual, setIsAddingManual] = useState(false)
  const [niches, setNiches] = useState<any[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [todayLeads, setTodayLeads] = useState(0)
  const [activeTab, setActiveTab] = useState('search')

  // Load data on component mount
  useEffect(() => {
    // Load niches immediately - doesn't require brand selection
    loadNiches()
    
    if (selectedBrandId && userId) {
      loadExistingLeads()
      loadStats()
    }
  }, [selectedBrandId, userId])

  // Also load niches on initial mount
  useEffect(() => {
    loadNiches()
  }, [])

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
      
      const today = new Date().toDateString()
      const todayCount = allLeads?.filter(lead => 
        new Date(lead.created_at).toDateString() === today
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
            userId,
            maxResults: 20
          }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(requestBody)
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Failed to generate leads')
      }

      const result = await response.json()
      
      if (result.leads && result.leads.length > 0) {
        setLeads(prev => [...result.leads, ...prev])
        if (selectedBrandId) {
          await loadStats() // Only refresh stats if brand is selected
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
          toast.error('Failed to generate leads. Please try again.')
        }
      } else {
        toast.error('Failed to generate leads. Please try again.')
      }
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

  const getSocialMediaLink = (platform: string, handle: string) => {
    switch (platform) {
      case 'instagram':
        return `https://instagram.com/${handle.replace('@', '')}`
      case 'facebook':
        return `https://facebook.com/${handle}`
      case 'linkedin':
        return `https://linkedin.com/company/${handle}`
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
              AI-powered business prospect identification and qualification system
            </p>
          </div>
          <div className="flex gap-3">
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
                  <TabsTrigger value="ecommerce" className="data-[state=active]:bg-[#333] text-gray-400">
                    <Globe className="h-4 w-4 mr-2" />
                    eCommerce
                  </TabsTrigger>
                  <TabsTrigger value="local_service" className="data-[state=active]:bg-[#333] text-gray-400">
                    <MapPin className="h-4 w-4 mr-2" />
                    Local Services
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Niche Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-400">Target Niches</Label>
              
              {businessType === 'local_service' ? (
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
            <Button
              onClick={generateLeads}
              disabled={isGenerating || selectedNiches.length === 0}
              variant="outline"
              className="w-full border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finding Real Businesses...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Find Real Businesses
                </>
              )}
            </Button>
            </CardContent>
          </Card>

          {/* Generated Leads Panel */}
          <Card className="bg-[#1A1A1A] border-[#333] xl:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <h2 className="text-lg font-semibold text-gray-400">Generated Leads ({leads.length})</h2>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm" className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white">
                      <Download className="h-4 w-4 mr-2" />
                      Export
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
                        {businessType === 'ecommerce' ? (
                          <>
                            <TableHead className="text-gray-400">Revenue Est.</TableHead>
                            <TableHead className="text-gray-400">Followers</TableHead>
                            <TableHead className="text-gray-400">Platform</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="text-gray-400">Phone</TableHead>
                            <TableHead className="text-gray-400">Location</TableHead>
                          </>
                        )}
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
                                {lead.phone ? (
                                  <div className="flex items-center gap-1 text-sm text-gray-400">
                                    <Phone className="h-3 w-3" />
                                    {lead.phone}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
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