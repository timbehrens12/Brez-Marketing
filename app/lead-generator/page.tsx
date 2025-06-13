"use client"

import React, { useState, useEffect, useMemo } from 'react'
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
import { Loader2, Search, MapPin, Globe, Building2, Phone, Mail, ExternalLink, Send, Star, Plus, TrendingUp, Instagram, Facebook, Linkedin, Sparkles, Circle } from 'lucide-react'
import { toast, Toaster } from 'react-hot-toast'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { useToast } from '@/components/ui/use-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LocationAutocomplete } from '@/components/location-autocomplete'
import { MultiSelect } from '@/components/multi-select'

const supabase = getSupabaseClient()

interface Brand {
  id: string
  name: string
}

interface Niche {
  id: string
  name: string
}

interface Lead {
  id: string
  company_name: string
  website: string
  phone_number: string
  address: string
  status: string
  initial_brand_id?: { name: string }
}

interface Location {
  city: string
  state: string
  lat: number
  lng: number
}

const DAILY_LEAD_LIMIT = 200

export default function LeadGenerator() {
  const { selectedBrandId } = useBrandContext()
  const { userId } = useAuth()
  const { toast: useToastToast } = useToast()
  const supabaseAuth = createClientComponentClient()
  
  const [user, setUser] = useState<User | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [niches, setNiches] = useState<Niche[]>([])
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<Location | null>(null)
  const [radius, setRadius] = useState<string>('25')
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [dailyUsage, setDailyUsage] = useState(0)

  const [filters, setFilters] = useState({
    hasWebsite: false,
    hasPhone: false,
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabaseAuth.auth.getUser()
      setUser(user)

      if (user) {
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('id, name')
          .eq('user_id', user.id)
        if (brandError) {
          console.error('Error fetching brands:', brandError)
        } else if (brandData) {
          setBrands(brandData as Brand[])
        }

        const { data: usageData, error: usageError } = await supabase
          .from('user_lead_generation_usage')
          .select('leads_generated_today')
          .eq('user_id', user.id)
          .single()
        
        if (usageData) {
          setDailyUsage(usageData.leads_generated_today as number)
        }
      }
      
      const { data: nicheData, error: nicheError } = await supabase
        .from('lead_niches')
        .select('id, name')
      if (nicheError) {
        console.error('Error fetching niches:', nicheError)
      } else if (nicheData) {
        setNiches(nicheData as Niche[])
      }
    }
    init()
  }, [supabaseAuth])

  const handleGenerate = async () => {
    if (!selectedBrand || selectedNiches.length === 0 || !location) {
      toast.error("Please select a brand, at least one niche, and a location.")
      return
    }

    setIsLoading(true)
    setError(null)
    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch('/api/leads/generate-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: selectedBrand,
          niches: selectedNiches,
          location: location,
          radius: parseInt(radius, 10),
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      const data = await response.json()
      setLeads(prevLeads => [...data.leads, ...prevLeads])
      setDailyUsage(data.newUsage)
      toast.success(`Successfully generated ${data.leads.length} new leads.`)
    } catch (err: any) {
      console.error('Error generating leads:', err)
      if (err.name !== 'AbortError') {
        setError(err.message || 'An error occurred. Please try again later.')
        toast.error(err.message || 'An unexpected error occurred.')
      }
    } finally {
      setIsLoading(false)
      setAbortController(null)
    }
  }

  const handleCancel = () => {
    if (abortController) {
      abortController.abort()
      toast.error('Lead generation has been stopped.')
    }
  }
  
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const hasWebsiteMatch = !filters.hasWebsite || (lead.website && lead.website !== 'N/A')
      const hasPhoneMatch = !filters.hasPhone || (lead.phone_number && lead.phone_number !== 'N/A')
      return hasWebsiteMatch && hasPhoneMatch
    })
  }, [leads, filters])

  const isFindDisabled = !selectedBrand || selectedNiches.length === 0 || !location || isLoading

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Toaster position="top-center" />
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold">
          Find Real Businesses
        </h1>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <div className="text-sm text-gray-500">
            Daily Usage: {dailyUsage} / {DAILY_LEAD_LIMIT}
          </div>
          {isLoading ? (
            <Button variant="destructive" onClick={handleCancel}>
              <Circle className="mr-2 h-4 w-4 animate-spin" />
              Cancel Generation
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={isFindDisabled}>
              <MapPin className="mr-2 h-4 w-4" />
              Find Businesses
            </Button>
          )}
        </div>
      </header>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Lead Generation Criteria</CardTitle>
            <CardDescription>
              Select your target brand, niches, and location to find potential business leads.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Select
                  value={selectedBrand}
                  onValueChange={setSelectedBrand}
                  disabled={brands.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="niches">Target Niches</Label>
                <MultiSelect
                  options={niches.map(n => ({ value: n.name, label: n.name }))}
                  selectedValues={selectedNiches}
                  onChange={setSelectedNiches}
                  placeholder="Select niches..."
                  disabled={niches.length === 0}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <LocationAutocomplete onLocationSelect={setLocation} />
              </div>
              <div>
                <Label htmlFor="radius">Search Radius</Label>
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select radius..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 miles</SelectItem>
                    <SelectItem value="10">10 miles</SelectItem>
                    <SelectItem value="25">25 miles</SelectItem>
                    <SelectItem value="50">50 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div >
              <CardTitle>Generated Leads</CardTitle>
              <CardDescription>
                Found {filteredLeads.length} businesses. {leads.length > filteredLeads.length ? `(${leads.length - filteredLeads.length} hidden by filters)` : ''}
              </CardDescription>
            </div>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Filters</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filter Leads</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filters.hasWebsite}
                  onCheckedChange={(checked) => setFilters(f => ({ ...f, hasWebsite: !!checked }))}
                >
                  Has Website
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.hasPhone}
                  onCheckedChange={(checked) => setFilters(f => ({ ...f, hasPhone: !!checked }))}
                >
                  Has Phone Number
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-red-500 bg-red-100 p-4 rounded-md mb-4">
                {error}
              </div>
            )}
            {isLoading && leads.length === 0 ? (
              <div className="text-center p-8">
                <p>Searching for businesses...</p>
                <p className="text-sm text-gray-500">This can take a moment. Please wait.</p>
              </div>
            ) : filteredLeads.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>{lead.company_name}</TableCell>
                      <TableCell>
                        <a 
                          href={lead.website} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline"
                        >
                          {lead.website !== 'N/A' ? 'Visit Website' : 'N/A'}
                        </a>
                      </TableCell>
                      <TableCell>{lead.phone_number}</TableCell>
                      <TableCell>{lead.address}</TableCell>
                      <TableCell>{lead.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center p-8">
                <p className="font-semibold">No leads generated yet.</p>
                <p className="text-sm text-gray-500">
                  Select your criteria above and click "Find Businesses" to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 