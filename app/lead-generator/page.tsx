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
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Search, MapPin, Globe, Building2, Phone, Mail, ExternalLink, Send, Star, Plus, TrendingUp, Instagram, Facebook, Linkedin, Sparkles, Filter, RefreshCw, Clock, BarChart3, AlertTriangle, Share2, Edit, Calculator } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuthenticatedSupabase } from '@/lib/utils/supabase-auth-client'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { Country, State, City } from 'country-state-city';

// Lead management constants
const MAX_LEADS_TOTAL = 150 // Maximum total leads allowed
const WARNING_THRESHOLD = 0.8 // Show warning at 80% of limit
const BATCH_ACTION_THRESHOLD = 20 // Suggest batch actions when this many leads

// Location data interface
interface LocationData {
  country: string;
  state: string;
  city: string;
  radius: string;
}

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
  lead_score?: number
  created_at: string
}

interface UsageData {
  used: number
  limit: number
  remaining: number
  leadsGeneratedToday: number
  leadsPerNiche: number
  maxNichesPerSearch: number
  lastGenerationAt: string | null
  resetsAt: string
  resetsIn: number
  nicheCooldowns: Array<{
    niche_id: string
    niche_name: string
    niche_category: string
    last_used_at: string
    leads_generated: number
    cooldown_until: string
    cooldown_remaining_ms: number
  }>
  cooldownHours: number
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
}

export default function LeadGeneratorPage() {
  const { selectedBrandId } = useBrandContext()
  const { userId } = useAuth()
  const { getSupabaseClient } = useAuthenticatedSupabase()
  
  const [businessType, setBusinessType] = useState<'ecommerce' | 'local_service'>('local_service')
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [location, setLocation] = useState<LocationData>({ 
    country: '', 
    state: '', 
    city: '', 
    radius: '' 
  })
  
  // Search states for dropdowns
  const [countrySearch, setCountrySearch] = useState('')
  const [stateSearch, setStateSearch] = useState('')
  const [citySearch, setCitySearch] = useState('')
  
  // Get available data based on selections
  const availableStates = location.country ? State.getStatesOfCountry(location.country) : []
  const availableCities = location.country && location.state ? City.getCitiesOfState(location.country, location.state) : []
  
  // Get filtered countries with US at top
  const getAllCountriesWithUSFirst = () => {
    const countries = Country.getAllCountries()
    const usCountry = countries.find(country => country.isoCode === 'US')
    const otherCountries = countries.filter(country => country.isoCode !== 'US')
    
    let filteredCountries = usCountry ? [usCountry, ...otherCountries] : countries
    
    if (countrySearch) {
      filteredCountries = filteredCountries.filter(country => 
        country.name.toLowerCase().includes(countrySearch.toLowerCase())
      )
    }
    
    return filteredCountries
  }
  
  // Get filtered states
  const getFilteredStates = () => {
    let states = availableStates
    if (stateSearch) {
      states = states.filter(state => 
        state.name.toLowerCase().includes(stateSearch.toLowerCase())
      )
    }
    return states
  }
  
  // Get filtered cities
  const getFilteredCities = () => {
    let cities = availableCities
    if (citySearch) {
      cities = cities.filter(city => 
        city.name.toLowerCase().includes(citySearch.toLowerCase())
      )
    }
    return cities
  }
  const [keywords, setKeywords] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [isAddingManual, setIsAddingManual] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [manualLeadData, setManualLeadData] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    phone: '',
    website: '',
    city: '',
    state_province: '',
    country: '',
    niche_id: '',
    instagram_handle: '',
    facebook_page: '',
    linkedin_profile: '',
    twitter_handle: ''
  })
  
  // Search states for manual lead dropdowns
  const [manualCountrySearch, setManualCountrySearch] = useState('')
  const [manualStateSearch, setManualStateSearch] = useState('')
  const [manualCitySearch, setManualCitySearch] = useState('')
  
  // Get manual lead location data
  const manualAvailableStates = manualLeadData.country ? State.getStatesOfCountry(manualLeadData.country) : []
  const manualAvailableCities = manualLeadData.country && manualLeadData.state_province ? City.getCitiesOfState(manualLeadData.country, manualLeadData.state_province) : []
  
  // Get filtered data for manual lead dropdowns
  const getManualFilteredStates = () => {
    let states = manualAvailableStates
    if (manualStateSearch) {
      states = states.filter(state => 
        state.name.toLowerCase().includes(manualStateSearch.toLowerCase())
      )
    }
    return states
  }
  
  const getManualFilteredCities = () => {
    let cities = manualAvailableCities
    if (manualCitySearch) {
      cities = cities.filter(city => 
        city.name.toLowerCase().includes(manualCitySearch.toLowerCase())
      )
    }
    return cities
  }
  const [niches, setNiches] = useState<any[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [todayLeads, setTodayLeads] = useState(0)
  const [activeTab, setActiveTab] = useState('search')
  const [isLoadingUsage, setIsLoadingUsage] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Usage data from API
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  
  // Lead filters
  const [filters, setFilters] = useState<LeadFilters>({
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false,
    hasSocials: false,
    socialPlatforms: {
      instagram: false,
      facebook: false,
      linkedin: false,
      twitter: false
    },
    selectedNicheFilter: []
  })
  
  // Score breakdown state
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [selectedScoreBreakdown, setSelectedScoreBreakdown] = useState<any>(null)
  
  // Smart lead management state
  const [showLeadManagement, setShowLeadManagement] = useState(false)
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)

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

  // Apply filters whenever leads, filters, or search query change
  useEffect(() => {
    applyFilters()
  }, [leads, filters, searchQuery])

  const loadUsageData = async () => {
    if (!userId) return
    
    const localNow = new Date();
    const localDate = [
      localNow.getFullYear(),
      ('0' + (localNow.getMonth() + 1)).slice(-2),
      ('0' + localNow.getDate()).slice(-2)
    ].join('-');
    
    const startOfToday = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), 0, 0, 0, 0);
    const localStartOfDayUTC = startOfToday.toISOString();

    try {
      const response = await fetch(`/api/leads/usage?userId=${userId}&localDate=${localDate}&localStartOfDayUTC=${localStartOfDayUTC}`);
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

  // Get unique niches from current leads
  const availableNichesInLeads = Array.from(new Set(leads.map(lead => lead.niche_name).filter(Boolean))).sort()

  const applyFilters = () => {
    let filtered = [...leads]
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(lead => 
        lead.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.owner_name && lead.owner_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    
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
    
    // Apply social media filters
    if (filters.hasSocials) {
      filtered = filtered.filter(lead => 
        (lead.instagram_handle && lead.instagram_handle !== 'N/A') ||
        (lead.facebook_page && lead.facebook_page !== 'N/A') ||
        (lead.linkedin_profile && lead.linkedin_profile !== 'N/A') ||
        (lead.twitter_handle && lead.twitter_handle !== 'N/A')
      )
    }
    
    // Apply specific social platform filters
    if (filters.socialPlatforms.instagram) {
      filtered = filtered.filter(lead => lead.instagram_handle && lead.instagram_handle !== 'N/A')
    }
    if (filters.socialPlatforms.facebook) {
      filtered = filtered.filter(lead => lead.facebook_page && lead.facebook_page !== 'N/A')
    }
    if (filters.socialPlatforms.linkedin) {
      filtered = filtered.filter(lead => lead.linkedin_profile && lead.linkedin_profile !== 'N/A')
    }
    if (filters.socialPlatforms.twitter) {
      filtered = filtered.filter(lead => lead.twitter_handle && lead.twitter_handle !== 'N/A')
    }
    
    // Apply niche filter
    if (filters.selectedNicheFilter.length > 0) {
      filtered = filtered.filter(lead => 
        lead.niche_name && filters.selectedNicheFilter.includes(lead.niche_name)
      )
    }
    
    setFilteredLeads(filtered)
  }

  const loadNiches = async () => {
    try {
      const supabase = await getSupabaseClient()
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
      const supabase = await getSupabaseClient()
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
      
      if (error) {
        console.error('Error loading leads:', error)
        throw error
      }
      setLeads((data as Lead[]) || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    }
  }

  const loadStats = async () => {
    if (!userId) return
    
    try {
      const supabase = await getSupabaseClient()
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
      
      if (error) {
        console.error('Error loading stats:', error)
        throw error
      }
      
      const today = new Date().toDateString()
      const todayCount = allLeads?.filter((lead: any) => 
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

    // Check lead storage limit
    if (leads.length >= MAX_LEADS_TOTAL) {
      toast.error(`Lead storage limit reached (${MAX_LEADS_TOTAL}). Please manage your existing leads before generating more.`)
      setShowLeadManagement(true)
      return
    }

    // Warn if approaching limit
    const potentialNewLeads = selectedNiches.length * (usageData.leadsPerNiche || 25)
    if (leads.length + potentialNewLeads > MAX_LEADS_TOTAL) {
      const maxPossible = MAX_LEADS_TOTAL - leads.length
      toast.error(`This search would exceed your lead limit. You can generate at most ${maxPossible} more leads. Consider managing existing leads first.`)
      setShowLeadManagement(true)
      return
    }

    setIsGenerating(true)
    
    try {
      // Calculate user's local date and timezone info
      const localNow = new Date();
      const localDate = [
        localNow.getFullYear(),
        ('0' + (localNow.getMonth() + 1)).slice(-2),
        ('0' + localNow.getDate()).slice(-2)
      ].join('-');
      
      const startOfToday = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), 0, 0, 0, 0);
      const localStartOfDayUTC = startOfToday.toISOString();

      // Use different API endpoints for ecommerce vs local service
      const apiEndpoint = businessType === 'ecommerce' 
        ? '/api/leads/generate-ecommerce'
        : '/api/leads/generate-real'
      
      // Add timeout to prevent hanging - increased for multiple niches
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout for multiple niches
      
      const requestBody = businessType === 'ecommerce'
        ? {
            selectedNiches,
            brandId: selectedBrandId || null,
            userId,
            localDate,
            localStartOfDayUTC
          }
        : {
            businessType,
            niches: selectedNiches,
            location: {
              country: location.country,
              state: location.state,
              city: location.city,
              radius: location.radius
            },
            brandId: selectedBrandId || null,
            userId,
            localDate,
            localStartOfDayUTC
          }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(requestBody)
      })
      
      clearTimeout(timeoutId)

      let result
      try {
        result = await response.json()
      } catch (parseError) {
        if (response.status === 504) {
          toast.error('Request timed out. The server is busy processing leads. Please try again with fewer niches or wait a moment.')
        } else {
          toast.error('Server error. Please try again.')
        }
        return
      }
      
      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit error
          toast.error(result.error)
        } else if (response.status === 504) {
          toast.error('Request timed out. Please try again with fewer niches or wait a moment.')
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

  const getTimeUntilMidnight = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setDate(midnight.getDate() + 1)
    midnight.setHours(0, 0, 0, 0)
    
    const msUntilMidnight = midnight.getTime() - now.getTime()
    const hours = Math.floor(msUntilMidnight / (1000 * 60 * 60))
    const minutes = Math.floor((msUntilMidnight % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`
    }
    return `in ${minutes}m`
  }

  const isNicheOnCooldown = (nicheId: string) => {
    if (!usageData?.nicheCooldowns) return false
    return usageData.nicheCooldowns.some(cooldown => 
      cooldown.niche_id === nicheId && cooldown.cooldown_remaining_ms > 0
    )
  }

  const getNicheCooldownInfo = (nicheId: string) => {
    if (!usageData?.nicheCooldowns) return null
    return usageData.nicheCooldowns.find(cooldown => 
      cooldown.niche_id === nicheId && cooldown.cooldown_remaining_ms > 0
    )
  }

  // Filter out niches on cooldown from available selections
  const getAvailableNiches = () => {
    if (!usageData?.nicheCooldowns) return filteredNiches
    
    const cooldownNicheIds = usageData.nicheCooldowns
      .filter(cooldown => cooldown.cooldown_remaining_ms > 0)
      .map(cooldown => cooldown.niche_id)
    
    return filteredNiches.filter((niche: any) => !cooldownNicheIds.includes(niche.id))
  }

  const sendToOutreach = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to send to outreach')
      return
    }

    try {
      const response = await fetch('/api/leads/send-to-outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds: selectedLeads })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (errorData.currentTotal !== undefined || errorData.currentPending !== undefined) {
          // Lead limit error - show detailed message
          toast.error(errorData.error, { duration: 6000 })
          
          if (errorData.remainingSlots > 0) {
            setTimeout(() => toast(`You can add up to ${errorData.remainingSlots} more leads total.`, { duration: 4000 }), 500)
          }
          if (errorData.remainingPendingSlots > 0) {
            setTimeout(() => toast(`You can add up to ${errorData.remainingPendingSlots} more pending leads.`, { duration: 4000 }), 1000)
          }
        } else {
          toast.error(errorData.error || 'Failed to send leads to outreach')
        }
        return
      }

      const data = await response.json()
      toast.success(`${data.message}! Created ${data.tasksCreated} follow-up tasks.`)
      
      // Remove sent leads from the current page
      setLeads(prev => prev.filter(lead => !selectedLeads.includes(lead.id)))
    setSelectedLeads([])
      
      // Update stats
      await loadStats()
    } catch (error) {
      console.error('Error sending to outreach:', error)
      toast.error('Failed to send leads to outreach')
    }
  }

  // Delete selected leads
  const deleteSelectedLeads = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to delete')
      return
    }
    
    try {
      const supabase = await getSupabaseClient()
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

  // Smart batch actions
  const sendTopLeadsToOutreach = async (count: number = 20) => {
    setIsProcessingBatch(true)
    try {
      // Get top scoring leads
      const topLeads = [...leads]
        .sort((a, b) => (b.lead_score || calculateLeadScore(b).total) - (a.lead_score || calculateLeadScore(a).total))
        .slice(0, count)
      
      if (topLeads.length === 0) {
        toast.error('No leads available to send to outreach')
        return
      }

      setSelectedLeads(topLeads.map(lead => lead.id))
      await sendToOutreach()
      
      toast.success(`Sent top ${topLeads.length} leads to outreach!`)
    } catch (error) {
      console.error('Error sending top leads to outreach:', error)
      toast.error('Failed to send leads to outreach')
    } finally {
      setIsProcessingBatch(false)
    }
  }

  const archiveLowScoreLeads = async (threshold: number = 30) => {
    setIsProcessingBatch(true)
    try {
      const lowScoreLeads = leads.filter(lead => {
        const score = lead.lead_score || calculateLeadScore(lead).total
        return score < threshold
      })
      
      if (lowScoreLeads.length === 0) {
        toast.error(`No leads found with score below ${threshold}`)
        return
      }

      const confirmed = window.confirm(
        `Archive ${lowScoreLeads.length} leads with score below ${threshold}? This will remove them from your active leads.`
      )
      if (!confirmed) return

      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', lowScoreLeads.map(lead => lead.id))
        .eq('user_id', userId!)

      if (error) throw error

      setLeads(prev => prev.filter(lead => !lowScoreLeads.map(l => l.id).includes(lead.id)))
      setSelectedLeads([])
      await loadStats()
      
      toast.success(`Archived ${lowScoreLeads.length} low-scoring leads`)
    } catch (error) {
      console.error('Error archiving low score leads:', error)
      toast.error('Failed to archive leads')
    } finally {
      setIsProcessingBatch(false)
    }
  }

  const clearAllLeads = async () => {
    const confirmed = window.confirm(
      `Clear all ${leads.length} leads? This will permanently delete all your current leads. This action cannot be undone.`
    )
    if (!confirmed) return

    setIsProcessingBatch(true)
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('user_id', userId!)
        .eq('brand_id', selectedBrandId || null)

      if (error) throw error

      setLeads([])
      setSelectedLeads([])
      await loadStats()
      
      toast.success('All leads cleared successfully')
    } catch (error) {
      console.error('Error clearing all leads:', error)
      toast.error('Failed to clear leads')
    } finally {
      setIsProcessingBatch(false)
    }
  }

  // Add manual lead function
  const addManualLead = async () => {
    if (!userId) {
      toast.error('Please sign in first')
      return
    }

    if (!manualLeadData.business_name || !manualLeadData.email) {
      toast.error('Business name and email are required')
      return
    }

    try {
      const leadToInsert = {
        user_id: userId,
        brand_id: selectedBrandId || null,
        business_name: manualLeadData.business_name,
        owner_name: manualLeadData.owner_name || null,
        email: manualLeadData.email,
        phone: manualLeadData.phone || null,
        website: manualLeadData.website || null,
        city: manualLeadData.city || null,
        state_province: manualLeadData.state_province || null,
        business_type: businessType,
        niche_name: manualLeadData.niche_id ? 
          niches.find(n => n.id === manualLeadData.niche_id)?.name || null : null,
        instagram_handle: manualLeadData.instagram_handle ? 
          manualLeadData.instagram_handle.replace('@', '') : null,
        facebook_page: manualLeadData.facebook_page || null,
        linkedin_profile: manualLeadData.linkedin_profile || null,
        twitter_handle: manualLeadData.twitter_handle ? 
          manualLeadData.twitter_handle.replace('@', '') : null,
        status: 'new',
        lead_score: 75, // Default score for manual leads
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const supabase = await getSupabaseClient()

      if (editingLead) {
        // Update existing lead
        const { error } = await supabase
          .from('leads')
          .update({
            business_name: manualLeadData.business_name,
            owner_name: manualLeadData.owner_name || null,
            email: manualLeadData.email,
            phone: manualLeadData.phone || null,
            website: manualLeadData.website || null,
            city: manualLeadData.city || null,
            state_province: manualLeadData.state_province || null,
            niche_name: manualLeadData.niche_id ? 
              niches.find(n => n.id === manualLeadData.niche_id)?.name || null : null,
            instagram_handle: manualLeadData.instagram_handle ? 
              manualLeadData.instagram_handle.replace('@', '') : null,
            facebook_page: manualLeadData.facebook_page || null,
            linkedin_profile: manualLeadData.linkedin_profile || null,
            twitter_handle: manualLeadData.twitter_handle ? 
              manualLeadData.twitter_handle.replace('@', '') : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLead.id)
          .eq('user_id', userId)

        if (error) throw error
        toast.success('Lead updated successfully!')
      } else {
        // Insert new lead
      const { data: insertedLead, error } = await supabase
        .from('leads')
        .insert([leadToInsert])
        .select()
        .single()

      if (error) throw error
        toast.success('Lead added successfully!')
      }

      // Reload leads to get fresh data
      await loadExistingLeads()
      
      // Reset form
      resetManualLeadForm()
      
      setIsAddingManual(false)
      setEditingLead(null)
      await loadStats()
    } catch (error) {
      console.error('Error saving lead:', error)
      toast.error('Failed to save lead')
    }
  }

  // Reset manual lead form
  const resetManualLeadForm = () => {
      setManualLeadData({
        business_name: '',
        owner_name: '',
        email: '',
        phone: '',
        website: '',
        city: '',
        state_province: '',
        country: '',
        niche_id: '',
        instagram_handle: '',
        facebook_page: '',
        linkedin_profile: '',
        twitter_handle: ''
      })
  }

  // Handle edit lead
  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead)
    
    // Find the niche ID from the niche name
    const selectedNiche = niches.find(n => n.name === lead.niche_name)
    
    // Try to find country and state ISO codes from the stored city/state names
    let countryCode = ''
    let stateCode = ''
    let cityName = lead.city || ''
    
    if (lead.state_province && lead.city) {
      // First try to find by state name (most common case for US)
      const countries = Country.getAllCountries()
      
      for (const country of countries) {
        const states = State.getStatesOfCountry(country.isoCode)
        
        // Try to match state by name or abbreviation
        const matchedState = states.find(state => 
          state.name.toLowerCase() === lead.state_province?.toLowerCase() ||
          state.isoCode.toLowerCase() === lead.state_province?.toLowerCase()
        )
        
        if (matchedState) {
          // Found the state, now check if the city exists in this state
          const cities = City.getCitiesOfState(country.isoCode, matchedState.isoCode)
          const matchedCity = cities.find(city => 
            city.name.toLowerCase() === lead.city?.toLowerCase()
          )
          
          if (matchedCity) {
            countryCode = country.isoCode
            stateCode = matchedState.isoCode
            cityName = matchedCity.name
            break
          }
        }
      }
      
      // If we couldn't find a match, default to US if the state looks like a US state
      if (!countryCode && lead.state_province && lead.state_province.length === 2) {
        countryCode = 'US'
        const usStates = State.getStatesOfCountry('US')
        const usState = usStates.find(state => 
          state.isoCode.toLowerCase() === lead.state_province?.toLowerCase()
        )
        if (usState) {
          stateCode = usState.isoCode
        }
      }
    }
    
    // Pre-fill the form with existing lead data
    setManualLeadData({
      business_name: lead.business_name || '',
      owner_name: lead.owner_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      website: lead.website || '',
      city: cityName,
      state_province: stateCode,
      country: countryCode,
      niche_id: selectedNiche?.id || '',
      instagram_handle: lead.instagram_handle || '',
      facebook_page: lead.facebook_page || '',
      linkedin_profile: lead.linkedin_profile || '',
      twitter_handle: lead.twitter_handle || ''
    })
    
    setIsAddingManual(true)
  }

  // Fix website URL formatting
  const formatWebsiteUrl = (url: string) => {
    if (!url) return ''
    
    // If URL already has protocol, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    
    // Add https:// if missing
    return `https://${url}`
  }

  const getSocialMediaLink = (platform: string, handle: string) => {
    if (!handle || handle === 'N/A' || handle.includes('(estimated)')) return undefined;
    
    switch (platform) {
      case 'instagram':
        const igHandle = handle.replace('@', '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '');
        return `https://instagram.com/${igHandle}`;
        
      case 'facebook':
        // Handle various Facebook URL formats
        let fbPage = handle;
        
        // If it's already a full URL, extract the page name
        if (fbPage.includes('facebook.com/')) {
          fbPage = fbPage.replace(/^https?:\/\/(www\.)?facebook\.com\//i, '').replace(/\/$/, '');
          // Remove query parameters
          fbPage = fbPage.split('?')[0];
        }
        
        // Remove @ if present
        fbPage = fbPage.replace(/^@/, '');
        
        // Skip obviously invalid handles and generic Facebook placeholders
        const invalidHandles = [
          'Facebook-f', 'facebook-f', 'Facebook', 'facebook', 
          'pages', 'profile.php', 'groups', 'home', 'login',
          'sharer', 'dialog', 'tr', 'plugins', 'help'
        ];
        
        if (!fbPage || fbPage === '' || 
            fbPage.includes('profile.php') || 
            fbPage.includes('/groups/') ||
            invalidHandles.includes(fbPage) ||
            fbPage.toLowerCase().includes('facebook-f') ||
            fbPage.length < 3) {
          return undefined;
        }
        
        return `https://facebook.com/${fbPage}`;
        
      case 'linkedin':
        let linkedinHandle = handle;
        
        // If it's already a full URL, use it
        if (linkedinHandle.includes('linkedin.com/')) {
          return linkedinHandle.startsWith('http') ? linkedinHandle : `https://${linkedinHandle}`;
        }
        
        // If it starts with 'company/', use as is
        if (linkedinHandle.startsWith('company/')) {
          return `https://linkedin.com/${linkedinHandle}`;
        }
        
        // Otherwise assume it's a company name
        return `https://linkedin.com/company/${linkedinHandle}`;
        
      case 'twitter':
        const twitterHandle = handle.replace('@', '').replace(/^https?:\/\/(www\.)?(twitter|x)\.com\//i, '').replace(/\/$/, '');
        // Use X.com as it's the current platform
        return `https://x.com/${twitterHandle}`;
        
      default:
        return '#';
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

  // Lead Scoring System
  const calculateLeadScore = (lead: Lead) => {
    if (!lead) return { total: 0, breakdown: {} }
    
    const scores = {
      contactInfo: 0,
      socialPresence: 0,
      businessInfo: 0,
      geographic: 0,
      industryBonus: 0
    }
    
    // Contact Information (40 points max)
    if (lead.email) scores.contactInfo += 15
    if (lead.phone) scores.contactInfo += 15
    if (lead.website) scores.contactInfo += 10
    
    // Social Media Presence (25 points max)
    if (lead.instagram_handle) scores.socialPresence += 8
    if (lead.facebook_page) scores.socialPresence += 6
    if (lead.linkedin_profile) scores.socialPresence += 8
    if (lead.twitter_handle) scores.socialPresence += 3
    
    // Business Information (20 points max)
    if (lead.business_name) scores.businessInfo += 5
    if (lead.owner_name) scores.businessInfo += 8
    if (lead.niche_name) scores.businessInfo += 7
    
    // Geographic (10 points max)
    if (lead.city) scores.geographic += 3
    if (lead.state_province) scores.geographic += 4
    if (lead.city && lead.state_province) scores.geographic += 3 // Bonus for complete location
    
    // Industry Bonus (5 points max)
    const highValueIndustries = ['technology', 'healthcare', 'finance', 'real estate', 'e-commerce', 'saas']
    if (lead.niche_name && highValueIndustries.some(industry => 
      lead.niche_name?.toLowerCase().includes(industry)
    )) {
      scores.industryBonus += 5
    }
    
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0)
    
    return {
      total,
      breakdown: {
        contactInfo: { score: scores.contactInfo, max: 40, items: [
          { name: 'Email Address', value: lead.email ? 15 : 0, max: 15, has: !!lead.email },
          { name: 'Phone Number', value: lead.phone ? 15 : 0, max: 15, has: !!lead.phone },
          { name: 'Website', value: lead.website ? 10 : 0, max: 10, has: !!lead.website }
        ]},
        socialPresence: { score: scores.socialPresence, max: 25, items: [
          { name: 'Instagram', value: lead.instagram_handle ? 8 : 0, max: 8, has: !!lead.instagram_handle },
          { name: 'Facebook', value: lead.facebook_page ? 6 : 0, max: 6, has: !!lead.facebook_page },
          { name: 'LinkedIn', value: lead.linkedin_profile ? 8 : 0, max: 8, has: !!lead.linkedin_profile },
          { name: 'Twitter/X', value: lead.twitter_handle ? 3 : 0, max: 3, has: !!lead.twitter_handle }
        ]},
        businessInfo: { score: scores.businessInfo, max: 20, items: [
          { name: 'Business Name', value: lead.business_name ? 5 : 0, max: 5, has: !!lead.business_name },
          { name: 'Owner Name', value: lead.owner_name ? 8 : 0, max: 8, has: !!lead.owner_name },
          { name: 'Industry/Niche', value: lead.niche_name ? 7 : 0, max: 7, has: !!lead.niche_name }
        ]},
        geographic: { score: scores.geographic, max: 10, items: [
          { name: 'City', value: lead.city ? 3 : 0, max: 3, has: !!lead.city },
          { name: 'State/Province', value: lead.state_province ? 4 : 0, max: 4, has: !!lead.state_province },
          { name: 'Complete Location', value: (lead.city && lead.state_province) ? 3 : 0, max: 3, has: !!(lead.city && lead.state_province) }
        ]},
        industryBonus: { score: scores.industryBonus, max: 5, items: [
          { name: 'High-Value Industry', value: scores.industryBonus, max: 5, has: scores.industryBonus > 0 }
        ]}
      }
    }
  }

  return (
    <div className="h-screen bg-black text-white p-6 overflow-hidden">
      <div className="w-full space-y-6">
        {/* Main Content - Side by Side Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 h-[calc(100vh-120px)]">
          {/* Lead Search Panel */}
          <Card className="bg-[#1A1A1A] border-[#333] xl:col-span-2 h-full overflow-y-auto">
            <CardContent className="space-y-6 pt-6">
              {/* Usage Statistics Panel */}
            <Card className="mb-6 bg-[#1A1A1A] border-[#333]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                  Daily Usage & Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingUsage ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                    <span className="ml-2 text-gray-400">Loading usage data...</span>
                  </div>
                ) : usageData ? (
                  <>
                    {/* Generation Limit Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Generations Today</span>
                        <span className="text-sm font-medium text-white">
                          {usageData.used} / {usageData.limit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            usageData.remaining <= 0 ? 'bg-red-500' : 
                            usageData.remaining <= 1 ? 'bg-white' : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.min((usageData.used / usageData.limit) * 100, 100)}%` }}
                  />
                </div>
              </div>

                    {/* Leads Generated Today */}
                    <div className="flex justify-between items-center py-2 border-t border-[#333]">
                      <span className="text-sm text-gray-400">Leads Generated Today</span>
                      <span className="text-sm font-medium text-white">
                        {usageData.leadsGeneratedToday}
                      </span>
                </div>

                    {/* System Limits */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#333]">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-white">{usageData.leadsPerNiche}</div>
                        <div className="text-xs text-gray-500">Leads per Niche</div>
                </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-300">{usageData.maxNichesPerSearch}</div>
                        <div className="text-xs text-gray-500">Max Niches</div>
              </div>
                    </div>

                    {/* Reset Information */}
                    <div className="flex justify-between items-center py-2 border-t border-[#333]">
                      <span className="text-sm text-gray-400">Resets at Midnight</span>
                      <span className="text-sm text-white">
                        {getTimeUntilMidnight()}
                      </span>
                </div>

                    {/* Niche Cooldowns */}
                    {usageData.nicheCooldowns && usageData.nicheCooldowns.length > 0 && (
                                              <div className="pt-3 border-t border-[#333]">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-300">Niche Cooldowns</span>
              </div>
                        <div className="space-y-2 max-h-24 overflow-y-auto pr-3">
                          {usageData.nicheCooldowns.map((cooldown) => (
                            <div key={cooldown.niche_id} className="flex justify-between items-center text-sm">
                              <span className="text-gray-400">{cooldown.niche_name}</span>
                              <span className="text-gray-300">
                                {getTimeUntilMidnight()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Unable to load usage data
                  </div>
                )}
            </CardContent>
          </Card>

              {/* Business Type Selector */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-400">Business Type</Label>
              <Tabs value={businessType} onValueChange={(value) => setBusinessType(value as any)}>
                <TabsList className="grid w-full grid-cols-2 bg-[#2A2A2A]">
                  <TabsTrigger value="local_service" className="data-[state=active]:bg-[#333] text-gray-400">
                    <MapPin className="h-4 w-4 mr-2" />
                    Local Services
                  </TabsTrigger>
                  <TabsTrigger value="ecommerce" className="data-[state=active]:bg-[#333] text-gray-400 relative">
                    <Globe className="h-4 w-4 mr-2" />
                    eCommerce
                    <Badge className="ml-2 bg-orange-500/20 text-orange-400 text-xs">Coming Soon</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

              {/* Niche Selection */}
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
                <Accordion type="multiple" className="w-full">
                  {Object.entries(
                    getAvailableNiches().reduce((groups: any, niche: any) => {
                      const category = niche.category || 'other'
                      if (!groups[category]) groups[category] = []
                      groups[category].push(niche)
                      return groups
                    }, {})
                  ).map(([category, categoryNiches]) => (
                    <AccordionItem key={category} value={category} className="border-[#333]">
                      <AccordionTrigger className="text-gray-400 hover:text-white capitalize">
                        {category.replace('_', ' ')} ({(categoryNiches as any[]).length})
                        </AccordionTrigger>
                      <AccordionContent className="pb-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {(categoryNiches as any[]).map((niche: any) => {
                            const onCooldown = isNicheOnCooldown(niche.id)
                            const cooldownInfo = getNicheCooldownInfo(niche.id)
                            
                            return (
                              <div key={niche.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={niche.id}
                                  checked={selectedNiches.includes(niche.id)}
                                  disabled={onCooldown}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedNiches(prev => [...prev, niche.id])
                                    } else {
                                      setSelectedNiches(prev => prev.filter(id => id !== niche.id))
                                    }
                                  }}
                                  className="border-[#444] data-[state=checked]:bg-gray-600 disabled:opacity-50"
                                />
                                <label 
                                  htmlFor={niche.id} 
                                  className={`text-sm cursor-pointer ${
                                    onCooldown ? 'text-gray-600 line-through' : 'text-gray-400'
                                  }`}
                                >
                                  {niche.name}
                                  {onCooldown && cooldownInfo && (
                                    <span className="ml-1 text-xs text-gray-400">
                                      ({getTimeUntilMidnight()})
                                    </span>
                                  )}
                                </label>
                              </div>
                    )
                  })}
                          </div>
                        
                        {/* Show message if all niches in category are on cooldown */}
                        {getAvailableNiches().filter((n: any) => n.category === category).length === 0 && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            <Clock className="h-4 w-4 mx-auto mb-2 text-gray-400" />
                            All niches in this category are on cooldown
                      </div>
                        )}
                    </AccordionContent>
                  </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            {/* Selected Niches Display */}
            {selectedNiches.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-400">Selected Niches ({selectedNiches.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedNiches.map(nicheId => {
                    const niche = niches.find(n => n.id === nicheId)
                    return niche ? (
                      <Badge key={nicheId} variant="secondary" className="bg-gray-600/20 text-gray-300">
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
                {selectedNiches.length === 0 && (
                  <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Please select at least one local service before choosing location
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <Select
                      value={location.country}
                      onValueChange={(value) => {
                        setLocation(prev => ({ 
                          ...prev, 
                          country: value,
                          state: '',
                          city: ''
                        }))
                        setCountrySearch('')
                      }}
                      disabled={selectedNiches.length === 0}
                    >
                      <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-gray-400 disabled:opacity-50 hover:bg-[#2A2A2A]">
                        <SelectValue placeholder={selectedNiches.length === 0 ? "Select Local Service First" : "Country"} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        <div className="sticky top-0 p-2 bg-[#1A1A1A] border-b border-[#333] z-50">
                          <Input
                            placeholder="Search countries..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            onFocus={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#2A2A2A] border-[#444] text-gray-300 text-sm"
                          />
                        </div>
                        {getAllCountriesWithUSFirst().map((country) => (
                          <SelectItem key={country.isoCode} value={country.isoCode} className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="relative">
                    <Select
                      value={location.state}
                      onValueChange={(value) => {
                        setLocation(prev => ({ 
                          ...prev, 
                          state: value,
                          city: ''
                        }))
                        setStateSearch('')
                      }}
                      disabled={selectedNiches.length === 0 || !location.country}
                    >
                      <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-gray-400 disabled:opacity-50 hover:bg-[#2A2A2A]">
                        <SelectValue placeholder={
                          selectedNiches.length === 0 ? "Select Local Service First" : 
                          !location.country ? "Country First" : "State"
                        } />
                      </SelectTrigger>
                                              <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          <div className="sticky top-0 p-2 bg-[#1A1A1A] border-b border-[#333] z-50">
                            <Input
                              placeholder="Search states..."
                              value={stateSearch}
                              onChange={(e) => setStateSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-[#2A2A2A] border-[#444] text-gray-300 text-sm"
                            />
                          </div>
                        {getFilteredStates().map((state) => (
                          <SelectItem key={state.isoCode} value={state.isoCode} className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="relative">
                    <Select
                      value={location.city}
                      onValueChange={(value) => {
                        setLocation(prev => ({ 
                          ...prev, 
                          city: value
                        }))
                        setCitySearch('')
                      }}
                      disabled={selectedNiches.length === 0 || !location.state}
                    >
                      <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-gray-400 disabled:opacity-50 hover:bg-[#2A2A2A]">
                        <SelectValue placeholder={
                          selectedNiches.length === 0 ? "Select Local Service First" : 
                          !location.state ? "State First" : "City"
                        } />
                      </SelectTrigger>
                                              <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          <div className="sticky top-0 p-2 bg-[#1A1A1A] border-b border-[#333] z-50">
                            <Input
                              placeholder="Search cities..."
                              value={citySearch}
                              onChange={(e) => setCitySearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              onFocus={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-[#2A2A2A] border-[#444] text-gray-300 text-sm"
                            />
                          </div>
                        {getFilteredCities().map((city) => (
                          <SelectItem key={city.name} value={city.name} className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Select
                    value={location.radius}
                    onValueChange={(value) => setLocation(prev => ({ ...prev, radius: value }))}
                    disabled={selectedNiches.length === 0 || !location.city}
                  >
                    <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-gray-400 disabled:opacity-50 hover:bg-[#2A2A2A]">
                      <SelectValue placeholder={
                        selectedNiches.length === 0 ? "Select Local Service First" : 
                        !location.city ? "City First" : "Radius"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#333]">
                      <SelectItem value="5" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">5 miles</SelectItem>
                      <SelectItem value="10" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">10 miles</SelectItem>
                      <SelectItem value="15" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">15 miles</SelectItem>
                      <SelectItem value="25" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">25 miles</SelectItem>
                      <SelectItem value="50" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">50 miles</SelectItem>
                      <SelectItem value="75" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">75 miles</SelectItem>
                      <SelectItem value="100" className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">100 miles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Show warning if trying to select too many niches */}
            {selectedNiches.length > (usageData?.maxNichesPerSearch || 5) && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Too many niches selected. Maximum {usageData?.maxNichesPerSearch || 5} niches allowed 
                  ({usageData?.leadsPerNiche || 25} leads each).
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="space-y-2">
              <Button
                onClick={generateLeads}
                disabled={
                  isGenerating || 
                  selectedNiches.length === 0 || 
                  selectedNiches.length > (usageData?.maxNichesPerSearch || 5) ||
                  businessType === 'ecommerce' || 
                  (usageData?.remaining ?? 0) <= 0 ||
                  leads.length >= MAX_LEADS_TOTAL
                }
                className={`w-full ${
                  (usageData?.remaining ?? 0) <= 0 || leads.length >= MAX_LEADS_TOTAL
                    ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
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
                ) : leads.length >= MAX_LEADS_TOTAL ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Lead Storage Full
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
                  Will generate {selectedNiches.length * (usageData.leadsPerNiche || 25)} leads 
                  ({usageData.leadsPerNiche || 25} per niche) from {selectedNiches.length} niches
                </div>
              )}
              
              {/* Lead Storage Status */}
              {leads.length >= MAX_LEADS_TOTAL * WARNING_THRESHOLD && (
                <div className="text-xs text-center">
                  <div className={`${leads.length >= MAX_LEADS_TOTAL ? 'text-red-400' : 'text-yellow-400'}`}>
                    Lead Storage: {leads.length} / {MAX_LEADS_TOTAL}
                  </div>
                  {leads.length >= MAX_LEADS_TOTAL && (
                    <div className="text-red-300">
                      Manage existing leads to generate more
                    </div>
                  )}
                </div>
              )}
            </div>
            </CardContent>
          </Card>

          {/* Generated Leads Panel */}
          <Card className="bg-[#1A1A1A] border-[#333] xl:col-span-3 flex flex-col h-full">
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
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {(filters.hasPhone || filters.hasEmail || filters.hasWebsite || filters.hasSocials || 
                        filters.socialPlatforms.instagram || filters.socialPlatforms.facebook || 
                        filters.socialPlatforms.linkedin || filters.socialPlatforms.twitter) && (
                        <Badge className="ml-2 bg-blue-600/20 text-blue-300" variant="secondary">
                          Active
                        </Badge>
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                    <Button
                      onClick={() => setIsAddingManual(true)}
                      variant="outline"
                      size="sm"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Manual Lead
                    </Button>
                    <Button
                      onClick={deleteSelectedLeads}
                      disabled={selectedLeads.length === 0}
                      variant="outline"
                      size="sm"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white disabled:opacity-50"
                    >
                        <TrendingUp className="h-4 w-4 mr-2" />
                      Delete ({selectedLeads.length})
                    </Button>
                    <Button
                      onClick={sendToOutreach}
                      disabled={selectedLeads.length === 0}
                      variant="outline"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send to Outreach ({selectedLeads.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 overflow-hidden">
                {/* Lead Limit Warning */}
                {leads.length >= MAX_LEADS_TOTAL * WARNING_THRESHOLD && (
                  <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-yellow-300 font-medium text-sm">
                          {leads.length >= MAX_LEADS_TOTAL ? 'Lead Limit Reached' : 'Approaching Lead Limit'}
                        </div>
                        <div className="text-yellow-400/80 text-xs mt-1">
                          You have {leads.length} of {MAX_LEADS_TOTAL} maximum leads. 
                          {leads.length >= MAX_LEADS_TOTAL ? 
                            ' Clear space before generating more leads.' : 
                            ' Consider managing your leads to avoid hitting the limit.'}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => setShowLeadManagement(true)}
                            size="sm"
                            className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs h-7"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Smart Actions
                          </Button>
                          {leads.length >= BATCH_ACTION_THRESHOLD && (
                            <Button
                              onClick={() => sendTopLeadsToOutreach(20)}
                              disabled={isProcessingBatch}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                            >
                              {isProcessingBatch ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3 mr-1" />
                              )}
                              Send Top 20
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Smart Suggestions */}
                {leads.length >= BATCH_ACTION_THRESHOLD && leads.length < MAX_LEADS_TOTAL * WARNING_THRESHOLD && (
                  <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-300 text-sm">
                      <Sparkles className="h-4 w-4" />
                      <span className="font-medium">Smart Suggestion:</span>
                      <span>You have {leads.length} leads. Consider sending your top-scoring leads to outreach.</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={() => sendTopLeadsToOutreach(15)}
                        disabled={isProcessingBatch}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                      >
                        {isProcessingBatch ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3 mr-1" />
                        )}
                        Send Top 15
                      </Button>
                      <Button
                        onClick={() => setShowLeadManagement(true)}
                        size="sm"
                        variant="outline"
                        className="bg-[#1A1A1A] border-blue-500/50 text-blue-300 hover:bg-blue-900/30 text-xs h-7"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        More Options
                      </Button>
                    </div>
                  </div>
                )}

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

                {/* Filter Panel */}
                {showFilters && (
                  <div className="mb-4 p-4 bg-[#2A2A2A] border border-[#444] rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-400">Quick Filters</Label>
                      <Button
                        onClick={() => setFilters({ hasPhone: false, hasEmail: false, hasWebsite: false, hasSocials: false, socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false }, selectedNicheFilter: [] })}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Basic Filters */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasPhone"
                          checked={filters.hasPhone}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, hasPhone: checked as boolean }))
                          }
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
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, hasEmail: checked as boolean }))
                          }
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
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, hasWebsite: checked as boolean }))
                          }
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
                          onCheckedChange={(checked) => 
                              setFilters(prev => ({ ...prev, hasSocials: checked as boolean }))
                            }
                            className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                          <label htmlFor="hasSocials" className="text-sm text-gray-400 cursor-pointer flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            Has Socials
                          </label>
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
                                onCheckedChange={(checked) => 
                                  setFilters(prev => ({ 
                                    ...prev, 
                                    socialPlatforms: { ...prev.socialPlatforms, instagram: checked as boolean }
                                  }))
                          }
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
                          onCheckedChange={(checked) => 
                                  setFilters(prev => ({ 
                                    ...prev, 
                                    socialPlatforms: { ...prev.socialPlatforms, facebook: checked as boolean }
                                  }))
                          }
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
                          onCheckedChange={(checked) => 
                                  setFilters(prev => ({ 
                                    ...prev, 
                                    socialPlatforms: { ...prev.socialPlatforms, linkedin: checked as boolean }
                                  }))
                          }
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
                          onCheckedChange={(checked) => 
                                  setFilters(prev => ({ 
                                    ...prev, 
                                    socialPlatforms: { ...prev.socialPlatforms, twitter: checked as boolean }
                                  }))
                          }
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
                    </div>
                    
                    {/* Niche Filter */}
                    {availableNichesInLeads.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-400">Filter by Niche</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                          {availableNichesInLeads.map((nicheName) => (
                            <div key={nicheName || 'unknown'} className="flex items-center space-x-2">
                              <Checkbox
                                id={`niche-${nicheName || 'unknown'}`}
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
                              <label htmlFor={`niche-${nicheName || 'unknown'}`} className="text-sm text-gray-400 cursor-pointer">
                                {nicheName || 'Unknown'}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="overflow-x-auto flex-1 min-h-[400px] max-h-[calc(100vh-200px)] overflow-y-auto border border-[#333] rounded-md">
                  <Table>
                    <TableHeader className="sticky top-0 bg-[#1A1A1A] z-10">
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
                        <TableHead className="text-gray-400">Score</TableHead>
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
                        <TableHead className="text-gray-400">Actions</TableHead>
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
                              {lead.website && (
                                <a
                                  href={formatWebsiteUrl(lead.website)}
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
                          <TableCell className="max-w-[200px]">
                            <div className="text-sm text-gray-400">
                              {lead.owner_name && (
                                <div className="font-medium text-gray-300 mb-1 truncate">{lead.owner_name}</div>
                              )}
                              {lead.email && (
                                <div className="flex items-center gap-1 mb-1 min-w-0">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate" title={lead.email}>{lead.email}</span>
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-1 min-w-0">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{lead.phone}</span>
                                </div>
                              )}
                              {!lead.owner_name && !lead.email && !lead.phone && <span className="text-gray-500">-</span>}
                            </div>
                          </TableCell>
                          <TableCell className="w-20">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 hover:bg-[#333] text-gray-300 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation()
                                const scoreData = calculateLeadScore(lead)
                                setSelectedScoreBreakdown({
                                  lead: lead,
                                  scoreData
                                })
                                setShowScoreBreakdown(true)
                              }}
                            >
                              <div className="flex items-center gap-1">
                                <Calculator className="h-3 w-3" />
                                <span className="font-mono text-xs">
                                  {lead.lead_score || calculateLeadScore(lead).total}
                                </span>
                              </div>
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center relative max-w-[100px]">
                              {lead.instagram_handle && (
                                <a
                                  href={getSocialMediaLink('instagram', lead.instagram_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative z-10 text-pink-500 hover:text-pink-400 hover:scale-110 p-1.5 rounded-lg transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-pink-500/50 hover:z-20"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`Instagram: ${lead.instagram_handle}`}
                                  style={{ marginLeft: '0px' }}
                                >
                                  {getSocialMediaIcon('instagram')}
                                </a>
                              )}
                              {lead.facebook_page && getSocialMediaLink('facebook', lead.facebook_page) && (
                                <a
                                  href={getSocialMediaLink('facebook', lead.facebook_page)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative z-10 text-blue-500 hover:text-blue-400 hover:scale-110 p-1.5 rounded-lg transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-blue-500/50 hover:z-20"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`Facebook: ${lead.facebook_page}`}
                                  style={{ marginLeft: lead.instagram_handle ? '-8px' : '0px' }}
                                >
                                  {getSocialMediaIcon('facebook')}
                                </a>
                              )}
                              {lead.linkedin_profile && (
                                <a
                                  href={getSocialMediaLink('linkedin', lead.linkedin_profile)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative z-10 text-blue-600 hover:text-blue-500 hover:scale-110 p-1.5 rounded-lg transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-blue-600/50 hover:z-20"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`LinkedIn: ${lead.linkedin_profile}`}
                                  style={{ marginLeft: (lead.instagram_handle || lead.facebook_page) ? '-8px' : '0px' }}
                                >
                                  {getSocialMediaIcon('linkedin')}
                                </a>
                              )}
                              {lead.twitter_handle && (
                                <a
                                  href={getSocialMediaLink('twitter', lead.twitter_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative z-10 text-gray-300 hover:text-white hover:scale-110 p-1.5 rounded-lg transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-gray-300/50 hover:z-20"
                                  onClick={(e) => e.stopPropagation()}
                                  title={`X/Twitter: ${lead.twitter_handle}`}
                                  style={{ marginLeft: (lead.instagram_handle || lead.facebook_page || lead.linkedin_profile) ? '-8px' : '0px' }}
                                >
                                  {getSocialMediaIcon('twitter')}
                                </a>
                              )}
                              {!lead.instagram_handle && !lead.facebook_page && !lead.linkedin_profile && !lead.twitter_handle && (
                                <span className="text-gray-500 text-sm">No socials found</span>
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
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="p-1 h-8 w-8 text-gray-400 hover:text-white hover:bg-[#222]"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditLead(lead)
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
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

      {/* Enhanced Manual Lead Add Dialog */}
      <Dialog open={isAddingManual} onOpenChange={setIsAddingManual}>
        <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-400 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editingLead ? 'Edit Lead' : 'Add Manual Lead'}
            </DialogTitle>
            <DialogDescription>
              {editingLead ? 'Edit and update lead information' : 'Manually add a comprehensive lead with all business details'}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-[#2A2A2A]">
              <TabsTrigger value="basic" className="text-gray-400 data-[state=active]:bg-[#333] data-[state=active]:text-gray-200">Basic Info</TabsTrigger>
              <TabsTrigger value="contact" className="text-gray-400 data-[state=active]:bg-[#333] data-[state=active]:text-gray-200">Contact</TabsTrigger>
              <TabsTrigger value="social" className="text-gray-400 data-[state=active]:bg-[#333] data-[state=active]:text-gray-200">Social Media</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              {/* Business Type Selection */}
              <div className="space-y-3 mb-6">
                <Label className="text-sm font-medium text-gray-400">Business Type</Label>
                <Tabs value="local_service" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-[#2A2A2A]">
                    <TabsTrigger value="local_service" className="data-[state=active]:bg-[#333] text-gray-400">
                      <MapPin className="h-4 w-4 mr-2" />
                      Local Services
                    </TabsTrigger>
                    <TabsTrigger value="ecommerce" className="data-[state=active]:bg-[#333] text-gray-400 relative cursor-not-allowed opacity-60" disabled>
                      <Globe className="h-4 w-4 mr-2" />
                      eCommerce
                      <Badge className="ml-2 bg-orange-500/20 text-orange-400 text-xs">Coming Soon</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Business Name *</Label>
                  <Input 
                    value={manualLeadData.business_name}
                    onChange={(e) => setManualLeadData(prev => ({ ...prev, business_name: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                    placeholder="Enter business name"
                  />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Owner Name</Label>
                  <Input 
                    value={manualLeadData.owner_name}
                    onChange={(e) => setManualLeadData(prev => ({ ...prev, owner_name: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                    placeholder="Enter owner/contact name"
                  />
            </div>
            {/* Location Dropdowns */}
            <div className="space-y-2">
              <Label className="text-gray-400">Country</Label>
              <Select
                value={manualLeadData.country}
                onValueChange={(value) => {
                  setManualLeadData(prev => ({ 
                    ...prev, 
                    country: value,
                    state_province: '',
                    city: ''
                  }))
                  setManualCountrySearch('')
                }}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-gray-400 hover:bg-[#2A2A2A]">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#333]">
                  <div className="sticky top-0 p-2 bg-[#1A1A1A] border-b border-[#333] z-50">
                    <Input
                      placeholder="Search countries..."
                      value={manualCountrySearch}
                      onChange={(e) => setManualCountrySearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#2A2A2A] border-[#444] text-gray-300 text-sm"
                    />
                  </div>
                  {getAllCountriesWithUSFirst().filter(country => 
                    !manualCountrySearch || country.name.toLowerCase().includes(manualCountrySearch.toLowerCase())
                  ).map((country) => (
                    <SelectItem key={country.isoCode} value={country.isoCode} className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">State/Province</Label>
              <Select
                value={manualLeadData.state_province}
                onValueChange={(value) => {
                  setManualLeadData(prev => ({ 
                    ...prev, 
                    state_province: value,
                    city: ''
                  }))
                  setManualStateSearch('')
                }}
                disabled={!manualLeadData.country}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-gray-400 disabled:opacity-50 hover:bg-[#2A2A2A]">
                  <SelectValue placeholder={!manualLeadData.country ? "Country First" : "State"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#333]">
                  <div className="sticky top-0 p-2 bg-[#1A1A1A] border-b border-[#333] z-50">
                    <Input
                      placeholder="Search states..."
                      value={manualStateSearch}
                      onChange={(e) => setManualStateSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#2A2A2A] border-[#444] text-gray-300 text-sm"
                    />
                  </div>
                  {getManualFilteredStates().map((state) => (
                    <SelectItem key={state.isoCode} value={state.isoCode} className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">City</Label>
              <Select
                value={manualLeadData.city}
                onValueChange={(value) => {
                  setManualLeadData(prev => ({ 
                    ...prev, 
                    city: value
                  }))
                  setManualCitySearch('')
                }}
                disabled={!manualLeadData.state_province}
              >
                <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-gray-400 disabled:opacity-50 hover:bg-[#2A2A2A]">
                  <SelectValue placeholder={!manualLeadData.state_province ? "State First" : "City"} />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-[#333]">
                  <div className="sticky top-0 p-2 bg-[#1A1A1A] border-b border-[#333] z-50">
                    <Input
                      placeholder="Search cities..."
                      value={manualCitySearch}
                      onChange={(e) => setManualCitySearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#2A2A2A] border-[#444] text-gray-300 text-sm"
                    />
                  </div>
                  {getManualFilteredCities().map((city) => (
                    <SelectItem key={city.name} value={city.name} className="text-gray-300 hover:bg-[#2A2A2A] focus:bg-[#2A2A2A]">
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
                <div className="space-y-2 col-span-2">
              <Label className="text-gray-400">Local Service Category</Label>
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(
                  niches.filter(niche => niche.category === 'local_service').reduce((groups: any, niche: any) => {
                    const category = niche.category || 'other'
                    if (!groups[category]) groups[category] = []
                    groups[category].push(niche)
                    return groups
                  }, {})
                ).map(([category, categoryNiches]) => (
                  <AccordionItem key={category} value={category} className="border-[#333]">
                    <AccordionTrigger className="text-gray-400 hover:text-white capitalize text-sm">
                      {category.replace('_', ' ')} ({(categoryNiches as any[]).length})
                    </AccordionTrigger>

                    <AccordionContent className="pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {(categoryNiches as any[]).map((niche: any) => (
                          <div key={niche.id} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={`manual-${niche.id}`}
                              name="manual-niche"
                              checked={manualLeadData.niche_id === niche.id}
                              onChange={() => setManualLeadData(prev => ({ ...prev, niche_id: niche.id }))}
                              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500 focus:ring-2"
                            />
                            <label 
                              htmlFor={`manual-${niche.id}`} 
                              className="text-sm text-gray-400 cursor-pointer"
                            >
                              {niche.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
            </TabsContent>
            
            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400">Email *</Label>
                  <Input 
                    type="email"
                    value={manualLeadData.email}
                    onChange={(e) => setManualLeadData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Phone</Label>
                  <Input 
                    value={manualLeadData.phone}
                    onChange={(e) => setManualLeadData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-gray-400">Website</Label>
                  <Input 
                    value={manualLeadData.website}
                    onChange={(e) => setManualLeadData(prev => ({ ...prev, website: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="social" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400 flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    Instagram Handle
                  </Label>
                  <Input 
                    value={manualLeadData.instagram_handle}
                    onChange={(e) => setManualLeadData(prev => ({ ...prev, instagram_handle: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                    placeholder="@username or username"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 flex items-center gap-2">
                    <Facebook className="h-4 w-4" />
                    Facebook Page
                  </Label>
                  <Input 
                    value={manualLeadData.facebook_page}
                    onChange={(e) => setManualLeadData(prev => ({ ...prev, facebook_page: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                    placeholder="Page name or URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn Profile
                  </Label>
                  <Input 
                    value={manualLeadData.linkedin_profile}
                    onChange={(e) => setManualLeadData(prev => ({ ...prev, linkedin_profile: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                    placeholder="linkedin.com/company/name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Twitter Handle</Label>
                  <Input 
                    value={manualLeadData.twitter_handle}
                    onChange={(e) => setManualLeadData(prev => ({ ...prev, twitter_handle: e.target.value }))}
                    className="bg-[#2A2A2A] border-[#444] text-gray-400"
                    placeholder="@username or username"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#333]">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingManual(false)
                setEditingLead(null)
                resetManualLeadForm()
              }}
              className="border-[#333] hover:bg-[#222] text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={addManualLead}
              className="bg-[#444] hover:bg-[#555] text-gray-200"
              disabled={!manualLeadData.business_name || !manualLeadData.email}
            >
              <Plus className="h-4 w-4 mr-2" />
              {editingLead ? 'Update Lead' : 'Add Lead'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Score Breakdown Dialog */}
      <Dialog open={showScoreBreakdown} onOpenChange={setShowScoreBreakdown}>
        <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calculator className="h-5 w-5 text-gray-400" />
              Lead Score Breakdown
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedScoreBreakdown?.lead?.business_name} - Detailed scoring analysis
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedScoreBreakdown && (
              <div className="space-y-4">
                {/* Score Summary */}
                <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Overall Score</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold text-white">
                        {selectedScoreBreakdown.scoreData.total}
                      </span>
                      <span className="text-gray-400">/100</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#333] rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${selectedScoreBreakdown.scoreData.total}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>Poor (0-30)</span>
                    <span>Fair (31-60)</span>
                    <span>Good (61-80)</span>
                    <span>Excellent (81-100)</span>
                  </div>
                </div>

                {/* Score Categories */}
                <div className="space-y-4">
                  {Object.entries(selectedScoreBreakdown.scoreData.breakdown).map(([category, data]: [string, any]) => (
                    <div key={category} className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-white capitalize">
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-white">{data.score}</span>
                          <span className="text-gray-400">/{data.max}</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-[#333] rounded-full h-1.5 mb-3">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(data.score / data.max) * 100}%` }}
                        ></div>
                      </div>
                      
                      <div className="space-y-2">
                        {data.items.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                item.has ? 'bg-green-500' : 'bg-gray-500'
                              }`}></div>
                              <span className={item.has ? 'text-gray-300' : 'text-gray-500'}>
                                {item.name}
                              </span>
                            </div>
                            <span className={`font-mono ${item.has ? 'text-green-400' : 'text-gray-500'}`}>
                              {item.value}/{item.max}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Improvement Suggestions */}
                <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                    Improvement Suggestions
                  </h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    {selectedScoreBreakdown.scoreData.total < 50 && (
                      <div className="text-yellow-400">
                        • This lead needs significant data enrichment before outreach
                      </div>
                    )}
                    {!selectedScoreBreakdown.lead.email && (
                      <div>• Find email address for direct outreach (+15 points)</div>
                    )}
                    {!selectedScoreBreakdown.lead.phone && (
                      <div>• Locate phone number for call outreach (+15 points)</div>
                    )}
                    {!selectedScoreBreakdown.lead.website && (
                      <div>• Find business website for context (+10 points)</div>
                    )}
                    {!selectedScoreBreakdown.lead.owner_name && (
                      <div>• Identify business owner/decision maker (+8 points)</div>
                    )}
                    {(!selectedScoreBreakdown.lead.linkedin_profile && !selectedScoreBreakdown.lead.instagram_handle) && (
                      <div>• Research social media presence for personalization (+8-16 points)</div>
                    )}
                    {selectedScoreBreakdown.scoreData.total >= 80 && (
                      <div className="text-green-400">
                        • This is a high-quality lead ready for immediate outreach!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart Lead Management Dialog */}
      <Dialog open={showLeadManagement} onOpenChange={setShowLeadManagement}>
        <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              Smart Lead Management
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Efficiently manage your {leads.length} leads with intelligent batch actions
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            {/* Lead Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{leads.length}</div>
                <div className="text-xs text-gray-400">Total Leads</div>
              </div>
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {leads.filter(lead => (lead.lead_score || calculateLeadScore(lead).total) >= 70).length}
                </div>
                <div className="text-xs text-gray-400">High Quality (70+)</div>
              </div>
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {leads.filter(lead => {
                    const score = lead.lead_score || calculateLeadScore(lead).total
                    return score >= 40 && score < 70
                  }).length}
                </div>
                <div className="text-xs text-gray-400">Medium Quality</div>
              </div>
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-400">
                  {leads.filter(lead => (lead.lead_score || calculateLeadScore(lead).total) < 40).length}
                </div>
                <div className="text-xs text-gray-400">Low Quality (&lt;40)</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Lead Storage</span>
                <span className="text-gray-300">{leads.length} / {MAX_LEADS_TOTAL}</span>
              </div>
              <div className="w-full bg-[#333] rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    leads.length >= MAX_LEADS_TOTAL ? 'bg-red-500' :
                    leads.length >= MAX_LEADS_TOTAL * WARNING_THRESHOLD ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((leads.length / MAX_LEADS_TOTAL) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Smart Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Recommended Actions</h3>
              
              {/* Send Top Leads */}
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Send className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-white">Send High-Quality Leads to Outreach</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Send your top-scoring leads to the outreach tool for immediate action.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => sendTopLeadsToOutreach(10)}
                        disabled={isProcessingBatch}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isProcessingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Top 10 Leads
                      </Button>
                      <Button
                        onClick={() => sendTopLeadsToOutreach(20)}
                        disabled={isProcessingBatch}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isProcessingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Top 20 Leads
                      </Button>
                      <Button
                        onClick={() => {
                          const highQualityLeads = leads.filter(lead => (lead.lead_score || calculateLeadScore(lead).total) >= 70)
                          if (highQualityLeads.length > 0) {
                            setSelectedLeads(highQualityLeads.map(lead => lead.id))
                            sendToOutreach()
                          }
                        }}
                        disabled={isProcessingBatch || leads.filter(lead => (lead.lead_score || calculateLeadScore(lead).total) >= 70).length === 0}
                        size="sm"
                        variant="outline"
                        className="bg-[#1A1A1A] border-blue-500/50 text-blue-300 hover:bg-blue-900/30"
                      >
                        All High Quality ({leads.filter(lead => (lead.lead_score || calculateLeadScore(lead).total) >= 70).length})
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Archive Low-Quality Leads */}
              {leads.filter(lead => (lead.lead_score || calculateLeadScore(lead).total) < 40).length > 0 && (
                <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-white">Archive Low-Quality Leads</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        Remove leads with poor data quality to make room for better prospects.
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => archiveLowScoreLeads(30)}
                          disabled={isProcessingBatch}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          {isProcessingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                          Archive Score &lt;30 ({leads.filter(lead => (lead.lead_score || calculateLeadScore(lead).total) < 30).length})
                        </Button>
                        <Button
                          onClick={() => archiveLowScoreLeads(40)}
                          disabled={isProcessingBatch}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          {isProcessingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                          Archive Score &lt;40 ({leads.filter(lead => (lead.lead_score || calculateLeadScore(lead).total) < 40).length})
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Clear All Leads */}
              <div className="bg-[#2A2A2A] border border-red-500/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-white">Clear All Leads</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Permanently delete all leads to start fresh. This action cannot be undone.
                    </p>
                    <Button
                      onClick={clearAllLeads}
                      disabled={isProcessingBatch}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white mt-3"
                    >
                      {isProcessingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Clear All {leads.length} Leads
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
              <h4 className="font-medium text-blue-300 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Pro Tips
              </h4>
              <ul className="space-y-1 text-sm text-blue-200">
                <li>• Keep your lead count under {MAX_LEADS_TOTAL * WARNING_THRESHOLD} for optimal performance</li>
                <li>• Focus on leads with scores 70+ for best conversion rates</li>
                <li>• Regularly send qualified leads to outreach to maintain momentum</li>
                <li>• Archive low-scoring leads rather than deleting to keep your database clean</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 