"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  Globe, 
  Phone, 
  Mail, 
  ExternalLink,
  Download,
  Plus,
  Target,
  Users,
  DollarSign,
  Star,
  Send,
  Loader2
} from "lucide-react"
import { toast } from 'sonner'
import { cn } from "@/lib/utils"

interface SearchFilters {
  businessType: 'online' | 'physical' | ''
  niches: string[]
  location: {
    zipCode: string
    radius: number
    city: string
    state: string
    country: string
  }
  businessSize: string
  revenueRange: string
  industry: string
}

interface GeneratedLead {
  id: string
  businessName: string
  ownerName?: string
  phoneNumber?: string
  email?: string
  websiteUrl?: string
  socialMediaLinks: Record<string, string>
  businessAddress?: string
  city?: string
  state?: string
  zipCode?: string
  industry?: string
  businessDescription?: string
  estimatedRevenue?: string
  employeeCount?: string
  confidenceScore: number
  dataSources: string[]
  sentToOutreach: boolean
}

interface SearchHistory {
  id: string
  searchName: string
  businessType: string
  niches: string[]
  totalResults: number
  status: string
  createdAt: string
}

const BUSINESS_NICHES = {
  online: [
    'E-commerce',
    'SaaS',
    'Digital Marketing',
    'Online Education',
    'Fintech',
    'Health Tech',
    'Real Estate Tech',
    'Food Delivery',
    'Subscription Services',
    'Marketplace',
    'Content Creation',
    'Gaming',
    'Cryptocurrency',
    'AI/ML Services'
  ],
  physical: [
    'Restaurants',
    'Retail Stores',
    'Automotive',
    'Healthcare',
    'Fitness Centers',
    'Beauty Salons',
    'Real Estate',
    'Legal Services',
    'Accounting',
    'Consulting',
    'Construction',
    'Manufacturing',
    'Professional Services',
    'Home Services'
  ]
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Real Estate',
  'Education',
  'Food & Beverage',
  'Automotive',
  'Professional Services',
  'Entertainment',
  'Non-profit'
]

export default function LeadGeneratorPage() {
  const [filters, setFilters] = useState<SearchFilters>({
    businessType: '',
    niches: [],
    location: {
      zipCode: '',
      radius: 25,
      city: '',
      state: '',
      country: 'US'
    },
    businessSize: '',
    revenueRange: '',
    industry: ''
  })

  const [searchName, setSearchName] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<GeneratedLead[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [currentView, setCurrentView] = useState<'search' | 'results' | 'history'>('search')

  // Load search history on component mount
  useEffect(() => {
    loadSearchHistory()
  }, [])

  const loadSearchHistory = async () => {
    try {
      const response = await fetch('/api/lead-generation/searches')
      if (response.ok) {
        const data = await response.json()
        setSearchHistory(data)
      }
    } catch (error) {
      console.error('Error loading search history:', error)
    }
  }

  const handleSearchSubmit = async () => {
    if (!searchName.trim()) {
      toast.error('Please enter a search name')
      return
    }

    if (!filters.businessType) {
      toast.error('Please select a business type')
      return
    }

    if (filters.niches.length === 0) {
      toast.error('Please select at least one niche')
      return
    }

    setIsSearching(true)
    
    try {
      const response = await fetch('/api/lead-generation/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchName,
          ...filters
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.leads || [])
        setCurrentView('results')
        toast.success(`Found ${data.leads?.length || 0} potential leads!`)
        loadSearchHistory() // Refresh history
      } else {
        throw new Error('Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search for leads. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleNicheToggle = (niche: string) => {
    setFilters(prev => ({
      ...prev,
      niches: prev.niches.includes(niche)
        ? prev.niches.filter(n => n !== niche)
        : [...prev.niches, niche]
    }))
  }

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev)
      if (newSet.has(leadId)) {
        newSet.delete(leadId)
      } else {
        newSet.add(leadId)
      }
      return newSet
    })
  }

  const handleSendToOutreach = async () => {
    if (selectedLeads.size === 0) {
      toast.error('Please select leads to send to outreach')
      return
    }

    try {
      const response = await fetch('/api/lead-generation/send-to-outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads)
        })
      })

      if (response.ok) {
        toast.success(`${selectedLeads.size} leads sent to outreach manager!`)
        setSelectedLeads(new Set())
        // Update the leads to show they've been sent
        setSearchResults(prev => 
          prev.map(lead => 
            selectedLeads.has(lead.id) 
              ? { ...lead, sentToOutreach: true }
              : lead
          )
        )
      } else {
        throw new Error('Failed to send leads')
      }
    } catch (error) {
      console.error('Error sending leads:', error)
      toast.error('Failed to send leads to outreach')
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500'
    if (score >= 0.6) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High'
    if (score >= 0.6) return 'Medium'
    return 'Low'
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Lead Generator</h1>
          <p className="text-gray-400">Find and connect with potential clients for your marketing agency</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={currentView === 'search' ? 'default' : 'outline'}
            onClick={() => setCurrentView('search')}
            className={cn(
              "px-6",
              currentView === 'search' 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
            )}
          >
            <Search className="w-4 h-4 mr-2" />
            New Search
          </Button>
          <Button
            variant={currentView === 'results' ? 'default' : 'outline'}
            onClick={() => setCurrentView('results')}
            disabled={searchResults.length === 0}
            className={cn(
              "px-6",
              currentView === 'results' 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
            )}
          >
            <Target className="w-4 h-4 mr-2" />
            Results ({searchResults.length})
          </Button>
          <Button
            variant={currentView === 'history' ? 'default' : 'outline'}
            onClick={() => setCurrentView('history')}
            className={cn(
              "px-6",
              currentView === 'history' 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
            )}
          >
            <Filter className="w-4 h-4 mr-2" />
            Search History
          </Button>
        </div>

        {/* Search Form */}
        {currentView === 'search' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search Configuration */}
            <div className="lg:col-span-2">
              <Card className="bg-[#111] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Search className="w-5 h-5 mr-2" />
                    Search Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Search Name */}
                  <div>
                    <Label className="text-gray-300">Search Name</Label>
                    <Input
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="e.g., E-commerce stores in California"
                      className="bg-[#1A1A1A] border-[#333] text-white"
                    />
                  </div>

                  {/* Business Type */}
                  <div>
                    <Label className="text-gray-300">Business Type</Label>
                    <Select value={filters.businessType} onValueChange={(value: 'online' | 'physical') => 
                      setFilters(prev => ({ ...prev, businessType: value, niches: [] }))
                    }>
                      <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        <SelectItem value="online">Online Businesses</SelectItem>
                        <SelectItem value="physical">Physical Businesses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Niches */}
                  {filters.businessType && (
                    <div>
                      <Label className="text-gray-300">Business Niches</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {BUSINESS_NICHES[filters.businessType].map((niche) => (
                          <div key={niche} className="flex items-center space-x-2">
                            <Checkbox
                              id={niche}
                              checked={filters.niches.includes(niche)}
                              onCheckedChange={() => handleNicheToggle(niche)}
                              className="border-[#444] data-[state=checked]:bg-blue-600"
                            />
                            <Label htmlFor={niche} className="text-sm text-gray-300">
                              {niche}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location Filters (for physical businesses) */}
                  {filters.businessType === 'physical' && (
                    <div>
                      <Label className="text-gray-300">Location</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label className="text-sm text-gray-400">Zip Code</Label>
                          <Input
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
                          <Label className="text-sm text-gray-400">Radius (miles)</Label>
                          <Select value={filters.location.radius.toString()} onValueChange={(value) =>
                            setFilters(prev => ({
                              ...prev,
                              location: { ...prev.location, radius: parseInt(value) }
                            }))
                          }>
                            <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1A1A1A] border-[#333]">
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

                  {/* Advanced Filters */}
                  <div>
                    <Label className="text-gray-300">Industry (Optional)</Label>
                    <Select value={filters.industry} onValueChange={(value) =>
                      setFilters(prev => ({ ...prev, industry: value }))
                    }>
                      <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                        <SelectValue placeholder="Any industry" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Business Size</Label>
                      <Select value={filters.businessSize} onValueChange={(value) =>
                        setFilters(prev => ({ ...prev, businessSize: value }))
                      }>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue placeholder="Any size" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          <SelectItem value="startup">Startup (1-10)</SelectItem>
                          <SelectItem value="small">Small (11-50)</SelectItem>
                          <SelectItem value="medium">Medium (51-200)</SelectItem>
                          <SelectItem value="large">Large (200+)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-300">Revenue Range</Label>
                      <Select value={filters.revenueRange} onValueChange={(value) =>
                        setFilters(prev => ({ ...prev, revenueRange: value }))
                      }>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue placeholder="Any revenue" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          <SelectItem value="0-100k">$0 - $100k</SelectItem>
                          <SelectItem value="100k-500k">$100k - $500k</SelectItem>
                          <SelectItem value="500k-1m">$500k - $1M</SelectItem>
                          <SelectItem value="1m-5m">$1M - $5M</SelectItem>
                          <SelectItem value="5m+">$5M+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search Summary & Actions */}
            <div>
              <Card className="bg-[#111] border-[#333]">
                <CardHeader>
                  <CardTitle className="text-white">Search Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-gray-400">
                    <p><strong>Type:</strong> {filters.businessType || 'Not selected'}</p>
                    <p><strong>Niches:</strong> {filters.niches.length} selected</p>
                    {filters.businessType === 'physical' && (
                      <p><strong>Location:</strong> {filters.location.zipCode || 'Any'}</p>
                    )}
                  </div>
                  
                  <Separator className="bg-[#333]" />
                  
                  <Button 
                    onClick={handleSearchSubmit}
                    disabled={isSearching || !filters.businessType || filters.niches.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Start Search
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    AI-powered search will find businesses matching your criteria
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Search Results */}
        {currentView === 'results' && (
          <div>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Search Results</h2>
                <p className="text-gray-400">{searchResults.length} leads found</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSendToOutreach}
                  disabled={selectedLeads.size === 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Outreach ({selectedLeads.size})
                </Button>
                <Button variant="outline" className="bg-[#1A1A1A] border-[#333] text-gray-400 hover:bg-[#222]">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((lead) => (
                <Card key={lead.id} className="bg-[#111] border-[#333] hover:border-[#444] transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedLeads.has(lead.id)}
                          onCheckedChange={() => handleLeadSelect(lead.id)}
                          className="border-[#444] data-[state=checked]:bg-blue-600"
                        />
                        <div>
                          <CardTitle className="text-sm text-white">{lead.businessName}</CardTitle>
                          {lead.ownerName && (
                            <p className="text-xs text-gray-400">{lead.ownerName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className={cn("w-3 h-3", getConfidenceColor(lead.confidenceScore))} />
                        <span className={cn("text-xs", getConfidenceColor(lead.confidenceScore))}>
                          {getConfidenceLabel(lead.confidenceScore)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Contact Info */}
                    <div className="space-y-1">
                      {lead.email && (
                        <div className="flex items-center text-xs text-gray-400">
                          <Mail className="w-3 h-3 mr-2" />
                          {lead.email}
                        </div>
                      )}
                      {lead.phoneNumber && (
                        <div className="flex items-center text-xs text-gray-400">
                          <Phone className="w-3 h-3 mr-2" />
                          {lead.phoneNumber}
                        </div>
                      )}
                      {lead.websiteUrl && (
                        <div className="flex items-center text-xs text-gray-400">
                          <Globe className="w-3 h-3 mr-2" />
                          <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                            Website
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    {(lead.city || lead.state) && (
                      <div className="flex items-center text-xs text-gray-400">
                        <MapPin className="w-3 h-3 mr-2" />
                        {[lead.city, lead.state].filter(Boolean).join(', ')}
                      </div>
                    )}

                    {/* Industry & Size */}
                    <div className="flex flex-wrap gap-1">
                      {lead.industry && (
                        <Badge variant="secondary" className="text-xs bg-[#222] text-gray-300">
                          {lead.industry}
                        </Badge>
                      )}
                      {lead.employeeCount && (
                        <Badge variant="secondary" className="text-xs bg-[#222] text-gray-300">
                          <Users className="w-2 h-2 mr-1" />
                          {lead.employeeCount}
                        </Badge>
                      )}
                      {lead.estimatedRevenue && (
                        <Badge variant="secondary" className="text-xs bg-[#222] text-gray-300">
                          <DollarSign className="w-2 h-2 mr-1" />
                          {lead.estimatedRevenue}
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {lead.businessDescription && (
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {lead.businessDescription}
                      </p>
                    )}

                    {/* Status */}
                    {lead.sentToOutreach && (
                      <Badge className="bg-green-600 text-white text-xs">
                        Sent to Outreach
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {searchResults.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No Results Found</h3>
                <p className="text-gray-500">Try adjusting your search criteria and search again.</p>
              </div>
            )}
          </div>
        )}

        {/* Search History */}
        {currentView === 'history' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Search History</h2>
            <div className="space-y-4">
              {searchHistory.map((search) => (
                <Card key={search.id} className="bg-[#111] border-[#333]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{search.searchName}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                          <span>Type: {search.businessType}</span>
                          <span>Niches: {search.niches.join(', ')}</span>
                          <span>Results: {search.totalResults}</span>
                          <span>Date: {new Date(search.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={search.status === 'completed' ? 'default' : 'secondary'}>
                          {search.status}
                        </Badge>
                        <Button size="sm" variant="outline" className="bg-[#1A1A1A] border-[#333] text-gray-400 hover:bg-[#222]">
                          View Results
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 