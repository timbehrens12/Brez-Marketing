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
import { Loader2, Search, MapPin, Globe, Building2, Phone, Mail, ExternalLink, Send, Star, Filter, Download, Plus, TrendingUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@supabase/supabase-js'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Lead {
  id: string
  business_name: string
  owner_name?: string
  phone?: string
  email?: string
  website?: string
  city?: string
  state_province?: string
  instagram_handle?: string
  facebook_page?: string
  business_type: 'ecommerce' | 'local_service'
  niche_name?: string
  lead_score: number
  priority: string
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
  const [averageScore, setAverageScore] = useState(0)
  const [useAI, setUseAI] = useState(true)

  // Load data on component mount
  useEffect(() => {
    if (selectedBrandId && userId) {
      loadNiches()
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
        .select('*')
        .eq('user_id', userId)
        .eq('brand_id', selectedBrandId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    }
  }

  const loadStats = async () => {
    if (!userId || !selectedBrandId) return
    
    try {
      const { data: allLeads, error } = await supabase
        .from('leads')
        .select('lead_score, created_at')
        .eq('user_id', userId)
        .eq('brand_id', selectedBrandId)
      
      if (error) throw error
      
      const today = new Date().toDateString()
      const todayCount = allLeads?.filter(lead => 
        new Date(lead.created_at).toDateString() === today
      ).length || 0
      
      const avgScore = allLeads?.length > 0 
        ? Math.round(allLeads.reduce((sum, lead) => sum + lead.lead_score, 0) / allLeads.length)
        : 0
      
      setTotalLeads(allLeads?.length || 0)
      setTodayLeads(todayCount)
      setAverageScore(avgScore)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const filteredNiches = niches.filter(niche => niche.category === businessType)
  
  // Reset selected niches when business type changes
  useEffect(() => {
    setSelectedNiches([])
  }, [businessType])

  const generateLeads = async () => {
    if (!userId || !selectedBrandId) {
      toast.error('Please select a brand first')
      return
    }

    if (selectedNiches.length === 0) {
      toast.error('Please select at least one niche')
      return
    }

    setIsGenerating(true)
    
    try {
      const apiEndpoint = useAI ? '/api/leads/generate-ai' : '/api/leads/generate'
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          businessType,
          niches: selectedNiches,
          location,
          brandId: selectedBrandId,
          userId,
          maxResults: 20
        })
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Failed to generate leads')
      }

      const result = await response.json()
      
      if (result.leads && result.leads.length > 0) {
        setLeads(prev => [...result.leads, ...prev])
        await loadStats() // Refresh stats
        toast.success(`Generated ${result.leads.length} new leads!`)
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

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/50'
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50'
      case 'low': return 'bg-green-500/20 text-green-300 border-green-500/50'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50'
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
            <Button
              onClick={sendToOutreach}
              disabled={selectedLeads.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send to Outreach ({selectedLeads.length})
            </Button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalLeads}</div>
              <div className="flex items-center text-sm text-gray-400 mt-1">
                <Building2 className="h-3 w-3 mr-1" />
                All time
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Generated Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{todayLeads}</div>
              <div className="flex items-center text-sm text-blue-400 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Today's activity
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{averageScore > 0 ? averageScore : '--'}</div>
              <div className="flex items-center text-sm text-yellow-400 mt-1">
                <Star className="h-3 w-3 mr-1" />
                Lead quality
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{selectedLeads.length}</div>
              <div className="flex items-center text-sm text-green-400 mt-1">
                <Send className="h-3 w-3 mr-1" />
                Ready for outreach
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lead Generation Form */}
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-400">
              <Search className="h-5 w-5" />
              Generate New Leads
            </CardTitle>
            <CardDescription>
              Configure your lead search parameters to find the perfect prospects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Business Type Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-400">Business Type</Label>
              <Tabs value={businessType} onValueChange={(value) => setBusinessType(value as any)}>
                <TabsList className="grid w-full grid-cols-2 bg-[#2A2A2A]">
                  <TabsTrigger value="ecommerce" className="data-[state=active]:bg-[#333] text-gray-400">
                    <Globe className="h-4 w-4 mr-2" />
                    Online eCommerce
                  </TabsTrigger>
                  <TabsTrigger value="local_service" className="data-[state=active]:bg-[#333] text-gray-400">
                    <MapPin className="h-4 w-4 mr-2" />
                    Local / IRL Services
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Niche Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-400">Target Niches</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-4 border border-[#333] rounded-lg bg-[#2A2A2A]">
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
                    />
                    <Label
                      htmlFor={niche.id}
                      className="text-sm cursor-pointer hover:text-blue-400 text-gray-400"
                      title={niche.description}
                    >
                      {niche.name}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedNiches.length > 0 && (
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
              )}
            </div>

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
                  <Input
                    placeholder="Radius (miles)"
                    value={location.radius}
                    onChange={(e) => setLocation(prev => ({ ...prev, radius: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                  />
                </div>
              </div>
            )}



            {/* Generate Button */}
            <Button
              onClick={generateLeads}
              disabled={isGenerating || selectedNiches.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Leads...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Generate Leads
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-gray-400">Generated Leads ({leads.length})</CardTitle>
                <CardDescription>
                  Click on leads to select them for outreach
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
                    <TableHead className="text-gray-400">Location</TableHead>
                    <TableHead className="text-gray-400">Social</TableHead>
                    <TableHead className="text-gray-400">Score</TableHead>
                    <TableHead className="text-gray-400">Priority</TableHead>
                    <TableHead className="text-gray-400">Niche</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
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
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-400">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-400">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-400">
                          {lead.city && lead.state_province ? (
                            <div>{lead.city}, {lead.state_province}</div>
                          ) : lead.city ? (
                            <div>{lead.city}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {lead.instagram_handle && (
                            <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">IG</Badge>
                          )}
                          {lead.facebook_page && (
                            <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">FB</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${getLeadScoreColor(lead.lead_score)}`}>
                          <Star className="h-3 w-3" />
                          {lead.lead_score}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                          {lead.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-gray-600/20 text-gray-300">
                          {lead.niche_name || 'General'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Open lead details modal
                          }}
                        >
                          View
                        </Button>
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