"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from 'sonner'
import { 
  Search, 
  Filter, 
  Building2, 
  Globe, 
  MapPin, 
  Loader2,
  Send,
  Eye,
  Plus,
  X,
  Settings
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Niche categories based on user requirements
const ONLINE_NICHES = [
  'Apparel / Streetwear',
  'Fitness & Activewear',
  'Beauty & Skincare',
  'Haircare',
  'Pet Products',
  'Home Decor / Aesthetic Goods',
  'Jewelry & Accessories',
  'Tech Accessories',
  'Eco-Friendly Brands',
  'Baby Products',
  'Toys / Educational Kits',
  'Outdoor & Survival Gear',
  'Hobby & DIY Craft Kits',
  'Kitchen Tools',
  'Supplements / Wellness',
  'Subscription Boxes',
  'Digital Products / Online Courses',
  'Niche SaaS Tools',
  'Gaming Accessories',
  'Electronics / Gadgets',
  'Books / Publishing',
  'Art Supplies',
  'Photography Equipment'
]

const LOCAL_NICHES = [
  'Roofing / HVAC / Plumbing',
  'Pest Control',
  'Landscaping',
  'Gyms / Bootcamps / Trainers',
  'Chiropractors / Physical Therapists',
  'Dentists / Orthodontists',
  'Hair Salons / Barbers / Spas',
  'Med Spas / Massage Studios',
  'House Cleaners',
  'Tattoo Shops',
  'Car Wash / Tint / Detail',
  'General Contractors / Remodelers',
  'Real Estate / Property Managers',
  'Caterers / Meal Prep / Food Trucks',
  'Bookkeepers / Accountants',
  'Moving Companies / Event Planners',
  'Auto Repair',
  'Wedding Planners',
  'Photography Studios',
  'Legal Services',
  'Insurance Agencies',
  'Travel Agencies'
]

interface Lead {
  id: string
  business_name: string
  business_type: string
  niche: string
  owner_name: string | null
  email: string | null
  phone: string | null
  website: string | null
  social_media: any
  location: any
  business_info: any
  lead_quality_score: number
  contact_status: string
  is_sent_to_outreach: boolean
  created_at: string
}

interface SearchFilters {
  businessType: 'online' | 'local' | ''
  selectedNiches: string[]
  location: {
    zipCode: string
    radius: number
    city: string
    state: string
    country: string
  }
  additionalFilters: {
    minEmployees: number
    maxEmployees: number
    minRevenue: number
    maxRevenue: number
    hasWebsite: boolean
    hasSocialMedia: boolean
    hasContactInfo: boolean
  }
}

export default function LeadGeneratorPage() {
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Lead[]>([])
  const [searchName, setSearchName] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({
    businessType: '',
    selectedNiches: [],
    location: {
      zipCode: '',
      radius: 25,
      city: '',
      state: '',
      country: 'US'
    },
    additionalFilters: {
      minEmployees: 1,
      maxEmployees: 500,
      minRevenue: 0,
      maxRevenue: 10000000,
      hasWebsite: false,
      hasSocialMedia: false,
      hasContactInfo: true
    }
  })

  const availableNiches = filters.businessType === 'online' ? ONLINE_NICHES : 
                         filters.businessType === 'local' ? LOCAL_NICHES : []

  const handleNicheToggle = (niche: string) => {
    setFilters(prev => ({
      ...prev,
      selectedNiches: prev.selectedNiches.includes(niche)
        ? prev.selectedNiches.filter(n => n !== niche)
        : [...prev.selectedNiches, niche]
    }))
  }

  const removeNiche = (niche: string) => {
    setFilters(prev => ({
      ...prev,
      selectedNiches: prev.selectedNiches.filter(n => n !== niche)
    }))
  }

  const validateSearchParams = () => {
    if (!searchName.trim()) {
      toast.error('Please enter a search name')
      return false
    }

    if (!filters.businessType) {
      toast.error('Please select a business type')
      return false
    }

    if (filters.selectedNiches.length === 0) {
      toast.error('Please select at least one niche')
      return false
    }

    if (filters.businessType === 'local') {
      if (!filters.location.zipCode && !filters.location.city) {
        toast.error('Please enter a location (zip code or city) for local business search')
        return false
      }
    }

    return true
  }

  const handleSearch = async () => {
    if (!validateSearchParams()) return

    setIsSearching(true)
    
    try {
      const response = await fetch('/api/leads/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchName,
          filters
        })
      })

      if (!response.ok) {
        throw new Error('Failed to search for leads')
      }

      const results = await response.json()
      setSearchResults(results.leads)
      
      toast.success(`Found ${results.leads.length} potential leads!`)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search for leads. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const sendToOutreach = async (leadId: string) => {
    try {
      const response = await fetch('/api/leads/send-to-outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId })
      })

      if (!response.ok) {
        throw new Error('Failed to send to outreach')
      }

      // Update the lead in the current results
      setSearchResults(prev => 
        prev.map(lead => 
          lead.id === leadId 
            ? { ...lead, is_sent_to_outreach: true }
            : lead
        )
      )

      toast.success('Lead sent to outreach manager!')
    } catch (error) {
      console.error('Send to outreach error:', error)
      toast.error('Failed to send lead to outreach. Please try again.')
    }
  }

  const getQualityBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-600 text-white'
    if (score >= 60) return 'bg-yellow-600 text-white'
    if (score >= 40) return 'bg-orange-600 text-white'
    return 'bg-red-600 text-white'
  }

  const getQualityLabel = (score: number) => {
    if (score >= 80) return 'High'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Medium'
    return 'Low'
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Lead Generator</h1>
          <p className="text-gray-400">Find and target potential clients for your marketing agency</p>
        </div>

        {/* Search Configuration */}
        <Card className="bg-[#111] border-[#333] mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="h-5 w-5" />
              Search Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Name */}
            <div>
              <Label htmlFor="searchName" className="text-gray-300">Search Name</Label>
              <Input
                id="searchName"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g., Local Fitness Studios - NYC"
                className="bg-[#1A1A1A] border-[#333] text-white"
              />
            </div>

            {/* Business Type */}
            <div>
              <Label className="text-gray-300">Business Type</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={filters.businessType === 'online' ? 'default' : 'outline'}
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    businessType: 'online',
                    selectedNiches: [] // Reset niches when switching type
                  }))}
                  className={cn(
                    "flex items-center gap-2",
                    filters.businessType === 'online' 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "border-[#333] text-gray-400 hover:text-white hover:bg-[#222]"
                  )}
                >
                  <Globe className="h-4 w-4" />
                  Online Businesses
                </Button>
                <Button
                  variant={filters.businessType === 'local' ? 'default' : 'outline'}
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    businessType: 'local',
                    selectedNiches: [] // Reset niches when switching type
                  }))}
                  className={cn(
                    "flex items-center gap-2",
                    filters.businessType === 'local' 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "border-[#333] text-gray-400 hover:text-white hover:bg-[#222]"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Local Businesses
                </Button>
              </div>
            </div>

            {/* Niches */}
            {filters.businessType && (
              <div>
                <Label className="text-gray-300">Select Niches ({filters.selectedNiches.length} selected)</Label>
                
                {/* Selected Niches */}
                {filters.selectedNiches.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 mb-4">
                    {filters.selectedNiches.map(niche => (
                      <Badge
                        key={niche}
                        variant="secondary"
                        className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                        onClick={() => removeNiche(niche)}
                      >
                        {niche}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Available Niches */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto border border-[#333] rounded-md p-3 bg-[#1A1A1A]">
                  {availableNiches.map(niche => (
                    <div key={niche} className="flex items-center space-x-2">
                      <Checkbox
                        id={niche}
                        checked={filters.selectedNiches.includes(niche)}
                        onCheckedChange={() => handleNicheToggle(niche)}
                        className="border-gray-600"
                      />
                      <Label
                        htmlFor={niche}
                        className="text-sm text-gray-300 cursor-pointer hover:text-white"
                      >
                        {niche}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location Filters (for local businesses) */}
            {filters.businessType === 'local' && (
              <div>
                <Label className="text-gray-300">Location Filters</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                  <div>
                    <Label htmlFor="zipCode" className="text-sm text-gray-400">Zip Code</Label>
                    <Input
                      id="zipCode"
                      value={filters.location.zipCode}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        location: { ...prev.location, zipCode: e.target.value }
                      }))}
                      placeholder="90210"
                      className="bg-[#1A1A1A] border-[#333] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-sm text-gray-400">City</Label>
                    <Input
                      id="city"
                      value={filters.location.city}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        location: { ...prev.location, city: e.target.value }
                      }))}
                      placeholder="Los Angeles"
                      className="bg-[#1A1A1A] border-[#333] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-sm text-gray-400">State</Label>
                    <Input
                      id="state"
                      value={filters.location.state}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        location: { ...prev.location, state: e.target.value }
                      }))}
                      placeholder="CA"
                      className="bg-[#1A1A1A] border-[#333] text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="radius" className="text-sm text-gray-400">Radius (miles)</Label>
                    <Select
                      value={filters.location.radius.toString()}
                      onValueChange={(value) => setFilters(prev => ({
                        ...prev,
                        location: { ...prev.location, radius: parseInt(value) }
                      }))}
                    >
                      <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 miles</SelectItem>
                        <SelectItem value="10">10 miles</SelectItem>
                        <SelectItem value="25">25 miles</SelectItem>
                        <SelectItem value="50">50 miles</SelectItem>
                        <SelectItem value="100">100 miles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Filters */}
            <div>
              <Label className="text-gray-300">Additional Filters</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasWebsite"
                    checked={filters.additionalFilters.hasWebsite}
                    onCheckedChange={(checked) => setFilters(prev => ({
                      ...prev,
                      additionalFilters: { ...prev.additionalFilters, hasWebsite: checked as boolean }
                    }))}
                    className="border-gray-600"
                  />
                  <Label htmlFor="hasWebsite" className="text-sm text-gray-300">
                    Must have website
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasSocialMedia"
                    checked={filters.additionalFilters.hasSocialMedia}
                    onCheckedChange={(checked) => setFilters(prev => ({
                      ...prev,
                      additionalFilters: { ...prev.additionalFilters, hasSocialMedia: checked as boolean }
                    }))}
                    className="border-gray-600"
                  />
                  <Label htmlFor="hasSocialMedia" className="text-sm text-gray-300">
                    Must have social media
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasContactInfo"
                    checked={filters.additionalFilters.hasContactInfo}
                    onCheckedChange={(checked) => setFilters(prev => ({
                      ...prev,
                      additionalFilters: { ...prev.additionalFilters, hasContactInfo: checked as boolean }
                    }))}
                    className="border-gray-600"
                  />
                  <Label htmlFor="hasContactInfo" className="text-sm text-gray-300">
                    Must have contact info
                  </Label>
                </div>
              </div>
            </div>

            <Separator className="bg-[#333]" />

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={isSearching || !filters.businessType || filters.selectedNiches.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching for leads...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search for Leads
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="bg-[#111] border-[#333]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span>Search Results ({searchResults.length} leads found)</span>
                <Badge variant="secondary" className="bg-blue-600 text-white">
                  {searchResults.filter(lead => !lead.is_sent_to_outreach).length} available
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#333]">
                      <TableHead className="text-gray-300">Business</TableHead>
                      <TableHead className="text-gray-300">Niche</TableHead>
                      <TableHead className="text-gray-300">Owner</TableHead>
                      <TableHead className="text-gray-300">Contact</TableHead>
                      <TableHead className="text-gray-300">Location</TableHead>
                      <TableHead className="text-gray-300">Quality</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((lead) => (
                      <TableRow key={lead.id} className="border-[#333]">
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">{lead.business_name}</div>
                            {lead.website && (
                              <a 
                                href={lead.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm"
                              >
                                {lead.website}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-[#444] text-gray-300">
                            {lead.niche}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {lead.owner_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {lead.email && (
                              <div className="text-sm text-gray-300">{lead.email}</div>
                            )}
                            {lead.phone && (
                              <div className="text-sm text-gray-300">{lead.phone}</div>
                            )}
                            {!lead.email && !lead.phone && (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {lead.location?.city || lead.location?.state ? 
                            `${lead.location.city || ''} ${lead.location.state || ''}`.trim() : 
                            'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge className={getQualityBadgeColor(lead.lead_quality_score)}>
                            {getQualityLabel(lead.lead_quality_score)} ({lead.lead_quality_score})
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!lead.is_sent_to_outreach ? (
                              <Button
                                size="sm"
                                onClick={() => sendToOutreach(lead.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Send to Outreach
                              </Button>
                            ) : (
                              <Badge className="bg-gray-600 text-white">
                                Sent to Outreach
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-[#333] text-gray-400 hover:text-white hover:bg-[#222]"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 