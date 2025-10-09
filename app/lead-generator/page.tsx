"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { Loader2, Search, MapPin, Globe, Building2, Phone, Mail, ExternalLink, Send, Star, Plus, TrendingUp, Instagram, Facebook, Linkedin, Sparkles, Filter, RefreshCw, Clock, BarChart3, AlertTriangle, Share2, Edit, Calculator, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAgency } from "@/contexts/AgencyContext"
import { getAuthenticatedSupabaseClient, getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { Country, State, City } from 'country-state-city'
import { GridOverlay } from '@/components/GridOverlay'

// Lead management constants
const REVIEW_THRESHOLD = 50 // Suggest clearing reviewed leads when this many leads

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
  leadsGeneratedThisWeek: number
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
  minScore: number
  hasOwnerName: boolean
  businessTypeFilter: string[]
  locationFilter: {
    city: string
    state: string
  }
  revenueFilter: string[]
  shopifyFilter: string // 'all', 'detected', 'not_detected'
  scoreRange: {
    min: number
    max: number
  }
  createdDateFilter: string // 'today', 'yesterday', 'week', 'month', 'all'
}

export default function LeadGeneratorPage() {
  const { userId, getToken } = useAuth()
  const router = useRouter()
  const { selectedBrand, selectedBrandId } = useBrandContext()
  
  // Unified Supabase client function
  const getSupabaseClient = async () => {
    try {
      const token = await getToken({ template: 'supabase' })
      if (token) {
        return getAuthenticatedSupabaseClient(token)
      } else {
        return getStandardSupabaseClient()
      }
    } catch (error) {
      console.error('Error getting Supabase client:', error)
      return getStandardSupabaseClient()
    }
  }
  
  const [businessType, setBusinessType] = useState<'ecommerce' | 'local_service'>('local_service')
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [location, setLocation] = useState<LocationData>({ 
    country: 'US', 
    state: '', 
    city: '', 
    radius: '5' 
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
    
    // Only return United States for now
    return usCountry ? [usCountry] : []
  }
  
  // Get filtered states (only 50 US states, no territories)
  const getFilteredStates = () => {
    const US_STATES = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 
      'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 
      'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 
      'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 
      'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 
      'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 
      'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ]
    
    let states = availableStates.filter(state => US_STATES.includes(state.name))
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
    country: 'US',
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
  
  // Get filtered data for manual lead dropdowns (only 50 US states, no territories)
  const getManualFilteredStates = () => {
    const US_STATES = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 
      'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 
      'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 
      'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 
      'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 
      'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 
      'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
    ]
    
    let states = manualAvailableStates.filter(state => US_STATES.includes(state.name))
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
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const { agencySettings } = useAgency()
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
    selectedNicheFilter: [],
    minScore: 0
  })
  
  // Temporary filters state for pending changes
  const [tempFilters, setTempFilters] = useState<LeadFilters>({
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
    selectedNicheFilter: [],
    minScore: 0
  })
  
  // Score breakdown state
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [selectedScoreBreakdown, setSelectedScoreBreakdown] = useState<any>(null)
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  
  // Smart lead management state
  const [showLeadManagement, setShowLeadManagement] = useState(false)
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const [isSendingToOutreach, setIsSendingToOutreach] = useState(false)

  const [sendingLeads, setSendingLeads] = useState<string[]>([]) // New state for individual lead sending
  const [sentLeads, setSentLeads] = useState<string[]>([]) // New state for sent leads confirmation
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({
    key: 'score',
    direction: 'desc'
  })

  // Load data on component mount and when userId changes
  useEffect(() => {
    loadNiches()
    
    // Only load usage data if userId is available
    if (userId) {
      loadUsageData()
      loadStats()
    } else {
      // If no userId, set loading to false after a short delay to avoid blank page
      const timer = setTimeout(() => {
        setIsLoadingPage(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [userId])

  // Update countdown timer every minute to refresh the display
  useEffect(() => {
    const timer = setInterval(() => {
      // Force a re-render to update the countdown display
      setIsLoadingUsage(prev => prev)
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  // Apply filters whenever leads, filters, search query, or sort config change
  useEffect(() => {
    applyFilters()
  }, [leads, filters, searchQuery, sortConfig])

  // Auto-close filter panel when no leads remain
  useEffect(() => {
    if (leads.length === 0 && showFilters) {
      setShowFilters(false)
    }
  }, [leads.length, showFilters])

  const loadUsageData = async () => {
    if (!userId) {
      setIsLoadingPage(false)
      return
    }
    
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
      setIsLoadingPage(false)
    }
  }

  // Get unique niches from current leads
  const availableNichesInLeads = Array.from(new Set(leads.map(lead => lead.niche_name).filter(Boolean))).sort()

  const applyFilters = () => {
    let filtered = [...leads]
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(lead => 
        lead.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply score filter
    if (filters.minScore > 0) {
      filtered = filtered.filter(lead => {
        const score = calculateLeadScore(lead).total
        return score >= filters.minScore
      })
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
    const hasSpecificSocialFilters = filters.socialPlatforms.instagram || 
                                   filters.socialPlatforms.facebook || 
                                   filters.socialPlatforms.linkedin || 
                                   filters.socialPlatforms.twitter;
    
    if (hasSpecificSocialFilters) {
      // If specific social platforms are selected, filter by those
      filtered = filtered.filter(lead => {
        const hasInstagram = filters.socialPlatforms.instagram && lead.instagram_handle && lead.instagram_handle !== 'N/A';
        const hasFacebook = filters.socialPlatforms.facebook && lead.facebook_page && lead.facebook_page !== 'N/A';
        const hasLinkedin = filters.socialPlatforms.linkedin && lead.linkedin_profile && lead.linkedin_profile !== 'N/A';
        const hasTwitter = filters.socialPlatforms.twitter && lead.twitter_handle && lead.twitter_handle !== 'N/A';
        
        return hasInstagram || hasFacebook || hasLinkedin || hasTwitter;
      });
    } else if (filters.hasSocials) {
      // If only general "has socials" is checked, filter for any social media
      filtered = filtered.filter(lead => 
        (lead.instagram_handle && lead.instagram_handle !== 'N/A') ||
        (lead.facebook_page && lead.facebook_page !== 'N/A') ||
        (lead.linkedin_profile && lead.linkedin_profile !== 'N/A') ||
        (lead.twitter_handle && lead.twitter_handle !== 'N/A')
      );
    }
    
    // Apply niche filter
    if (filters.selectedNicheFilter.length > 0) {
      filtered = filtered.filter(lead => 
        lead.niche_name && filters.selectedNicheFilter.includes(lead.niche_name)
      )
    }
    
    // Apply sorting
    if (sortConfig?.key === 'score') {
      filtered.sort((a, b) => {
          const scoreA = calculateLeadScore(a).total
          const scoreB = calculateLeadScore(b).total
          return sortConfig.direction === 'desc' ? scoreB - scoreA : scoreA - scoreB
      })
    } else if (sortConfig?.key === 'created_at') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return sortConfig.direction === 'desc' ? dateB - dateA : dateA - dateB
      })
    } else {
      // Default sort by score (highest first) when no sorting is specified
      filtered.sort((a, b) => {
        const scoreA = calculateLeadScore(a).total
        const scoreB = calculateLeadScore(b).total
        return scoreB - scoreA
      })
    }
    
    setFilteredLeads(filtered)
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc'
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    
    setSortConfig({ key, direction })
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
      // console.log('Loaded niches:', data?.length || 0, 'niches')
    } catch (error) {
      console.error('Error loading niches:', error)
    }
  }

  const loadExistingLeads = async () => {
    if (!userId) return
    
    try {
      const supabase = await getSupabaseClient()
      
      // First get leads that are in outreach (to exclude them)
      const { data: outreachLeadIds } = await supabase
        .from('outreach_campaign_leads')
        .select('lead_id')
      
      const excludeLeadIds = outreachLeadIds?.map((ol: { lead_id: string }) => ol.lead_id) || []
      
      let query = supabase
        .from('leads')
        .select('id, business_name, owner_name, phone, email, website, city, state_province, business_type, niche_name, instagram_handle, facebook_page, linkedin_profile, twitter_handle, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      // Exclude leads that are already in outreach
      if (excludeLeadIds.length > 0) {
        query = query.not('id', 'in', `(${excludeLeadIds.join(',')})`)
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
      const { data: allLeads, error } = await supabase
        .from('leads')
        .select('created_at')
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error loading stats:', error)
        throw error
      }
      
      const today = new Date().toDateString()
      const todayCount = allLeads?.filter((lead: { created_at: string }) => 
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

  // Auto-clear leads when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leads.length > 0) {
        e.preventDefault()
        e.returnValue = 'You have unsent leads that will be lost if you navigate away. Make sure to send any you want to outreach first!'
        return e.returnValue
      }
    }

    const handleVisibilityChange = async () => {
      // No longer auto-clear leads on tab switch - let users manage their own leads
      // The previous behavior was too aggressive and cleared leads unexpectedly
      if (document.visibilityState === 'visible') {
        // console.log('👁️ Tab became visible - keeping existing leads')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [leads.length, userId, getToken])

  // Handle internal navigation warning
  useEffect(() => {
    const handleNavigation = (url: string) => {
      if (leads.length > 0 && !url.startsWith(window.location.pathname)) {
        const confirmed = window.confirm(
          'You have unsent leads that will be lost if you navigate away. Make sure to send any you want to outreach first!\n\nAre you sure you want to leave?'
        )
        if (!confirmed) {
          throw new Error('Navigation cancelled by user')
        }
      }
    }

    const originalPush = router.push
    const originalReplace = router.replace
    
    // Override router methods to show warning
    router.push = (url: any, options?: any) => {
      try {
        if (typeof url === 'string') {
          handleNavigation(url)
        } else if (url?.pathname) {
          handleNavigation(url.pathname)
        }
        return originalPush.call(router, url, options)
      } catch (error) {
        return Promise.reject(error)
      }
    }
    
    router.replace = (url: any, options?: any) => {
      try {
        if (typeof url === 'string') {
          handleNavigation(url)
        } else if (url?.pathname) {
          handleNavigation(url.pathname)
        }
        return originalReplace.call(router, url, options)
      } catch (error) {
        return Promise.reject(error)
      }
    }

    // Also intercept anchor link clicks
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLAnchorElement
      if (target.tagName === 'A' && target.href && leads.length > 0) {
        const url = new URL(target.href)
        const currentUrl = new URL(window.location.href)
        
        // Only warn for same-origin navigation to different pages
        if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
          const confirmed = window.confirm(
            'You have unsent leads that will be lost if you navigate away. Make sure to send any you want to outreach first!\n\nAre you sure you want to leave?'
          )
          if (!confirmed) {
            e.preventDefault()
            e.stopPropagation()
          }
        }
      }
    }

    document.addEventListener('click', handleLinkClick, true)

    return () => {
      // Restore original methods
      router.push = originalPush
      router.replace = originalReplace
      document.removeEventListener('click', handleLinkClick, true)
    }
  }, [leads.length, router])

  const handleClearAndGenerate = async () => {
    try {
      setShowClearConfirmation(false)
      
      // Clear existing leads from database first, but preserve leads that are in outreach
      if (userId) {
        const supabase = await getSupabaseClient()
        
        // Get leads that are currently in outreach campaigns
        const { data: outreachLeadIds } = await supabase
          .from('outreach_campaign_leads')
          .select('lead_id')
        
        const protectedLeadIds = outreachLeadIds?.map((ol: { lead_id: string }) => ol.lead_id) || []
        
        if (protectedLeadIds.length > 0) {
          // Delete only leads that are NOT in outreach
          await supabase
            .from('leads')
            .delete()
            .eq('user_id', userId)
            .not('id', 'in', `(${protectedLeadIds.join(',')})`)
          
          // console.log(`Protected ${protectedLeadIds.length} leads that are in outreach`)
        } else {
          // No leads in outreach, safe to delete all
          await supabase
            .from('leads')
            .delete()
            .eq('user_id', userId)
        }
      }
      
      // Clear local state
      setLeads([])
      setFilteredLeads([])
      setSelectedLeads([])
      
      // Scroll to top to prevent black bar issue
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
      // Call generateLeadsInternal directly since we've already cleared the leads
      await generateLeadsInternal()
    } catch (error) {
      console.error('Error in clear and generate:', error)
      toast.error('Failed to generate leads')
    }
  }

  const generateLeads = async () => {
    if (!userId) {
      toast.error('Please sign in first')
      return
    }

    if (selectedNiches.length === 0) {
      toast.error('Please select at least 1 niche to generate leads')
      return
    }

    if (selectedNiches.length > 5) {
      toast.error('Please select no more than 5 niches to generate leads')
      return
    }

    if (!usageData || usageData.remaining <= 0) {
      toast.error(`Weekly limit reached. resets mondays - ${getCountdownToMondayMidnight()}`)
      return
    }

    // Auto-clear previous leads before new search
    if (leads.length > 0) {
      setShowClearConfirmation(true)
      return
    }

    await generateLeadsInternal()
  }

  const generateLeadsInternal = async () => {
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
      
      // Add timeout to prevent hanging - match backend timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 85000) // 85 second timeout (5 seconds less than backend)
      
      const requestBody = businessType === 'ecommerce'
        ? {
            selectedNiches,
            userId,
            ...(selectedBrandId && { brandId: selectedBrandId }),
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
            ...(selectedBrandId && { brandId: selectedBrandId }),
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
          toast.error('Request timed out, but leads may have been generated. Please check if new leads were added.')
          // Just refresh stats and usage, don't auto-load leads to keep page fresh
          await loadStats()
          await loadUsageData()
          // Clear selected niches since they may now be on cooldown
          setSelectedNiches([])
          return
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
          toast.error('Request timed out, but leads may have been generated. Please try generating again.')
          // Just refresh stats and usage, don't auto-load leads to keep page fresh
          await loadStats()
          await loadUsageData()
          // Clear selected niches since they may now be on cooldown
          setSelectedNiches([])
          return
        } else {
          throw new Error(result.error || 'Failed to generate leads')
        }
        return
      }

      if (result.leads && result.leads.length > 0) {
        setLeads(prev => [...result.leads, ...prev])
        await loadStats() // Refresh stats after generating leads
        
        // Update usage data from response
        if (result.usage) {
          setUsageData(prev => ({
            ...prev!,
            used: result.usage.used,
            remaining: Math.max(0, result.usage.limit - result.usage.used),
            leadsGeneratedThisWeek: result.usage.totalLeadsToday
          }))
        }
        
        // Clear selected niches after successful generation since they're now on cooldown
        setSelectedNiches([])
        
        const leadType = businessType === 'ecommerce' ? 'ecommerce brands' : 'local businesses'
        toast.success(`Found ${result.leads.length} ${leadType}!`)
      } else {
        toast.error('No leads found for the specified criteria')
      }
    } catch (error) {
      console.error('Error generating leads:', error)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error('Request timed out. Please try generating again.')
          // Just refresh stats and usage, don't auto-load leads to keep page fresh
          await loadStats()
          await loadUsageData()
          // Clear selected niches since they may now be on cooldown
          setSelectedNiches([])
        } else if (error.message.includes('504') || error.message.includes('timeout')) {
          toast.error('Service temporarily busy. Please try generating again.')
          // Just refresh stats and usage, don't auto-load leads to keep page fresh
          await loadStats()
          await loadUsageData()
          // Clear selected niches since they may now be on cooldown
          setSelectedNiches([])
        } else {
          toast.error(error.message || 'Failed to generate leads. Please try again.')
        }
      } else {
        toast.error('Failed to generate leads. Please try again.')
      }
    } finally {
      setIsGenerating(false)
      // Always refresh stats and usage after generation attempt
      setTimeout(async () => {
        await loadStats()
        await loadUsageData()
      }, 1000) // Small delay to ensure any in-flight database writes complete
    }
  }

  const getTimeUntilReset = () => {
    if (!usageData) return 'Sunday night at midnight'
    
    const msUntilReset = usageData.resetsIn
    const days = Math.floor(msUntilReset / (1000 * 60 * 60 * 24))
    const hours = Math.floor((msUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60))
    
    // Calculate the actual reset date (next Monday)
    const resetDate = new Date(Date.now() + msUntilReset)
    
    // Always show as "Sunday night at midnight" since that's when Monday starts
    if (days > 1) {
      return `in ${days} days (Sunday night at midnight)`
    } else if (days === 1) {
      return `tomorrow at midnight (Sunday night)`
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m (Sunday night at midnight)`
    } else if (minutes > 0) {
      return `in ${minutes}m (Sunday night at midnight)`
    }
    return `any moment now (Sunday night at midnight)`
  }

  const getCountdownToMondayMidnight = () => {
    // Calculate next Monday 12am in user's local timezone
    const now = new Date()
    const nextMonday = new Date()
    
    // Set to next Monday at midnight
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7 // 0 = Sunday, so we want next Monday
    nextMonday.setDate(now.getDate() + daysUntilMonday)
    nextMonday.setHours(0, 0, 0, 0)
    
    const msUntilReset = nextMonday.getTime() - now.getTime()
    const days = Math.floor(msUntilReset / (1000 * 60 * 60 * 24))
    const hours = Math.floor((msUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60))
    
    // If more than 24 hours, show days countdown
    if (msUntilReset > 24 * 60 * 60 * 1000) {
      return `${days} day${days === 1 ? '' : 's'}`
    }
    
    // If less than 24 hours, show hours and minutes
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    
    // Always show minutes, never "any moment"
    return `${minutes}m`
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

  // Get all available niches (no cooldown filtering needed since daily limit)
  const getAvailableNiches = () => {
    return filteredNiches
  }

    const sendToOutreach = async () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to send to outreach')
      return
    }
    
    if (!userId) {
      toast.error('Please sign in to send leads to outreach')
      return
    }
    
    setIsSendingToOutreach(true)
    // Mark leads as sending for visual feedback
    setSendingLeads([...selectedLeads])

    try {
      // console.log('Sending leads to outreach:', { 
      //   selectedLeads: selectedLeads, 
      //   selectedCount: selectedLeads.length,
      //   userId: userId 
      // })
      
      // console.log('🔄 Step 1: Getting Supabase client...')
      // Refresh the Supabase client to ensure we have a valid token
      const supabase = await getSupabaseClient()
      // console.log('✅ Step 1: Supabase client obtained')
      
      // console.log('🔄 Step 2: Verifying leads exist in database...')
      // console.log('Verifying leads:', selectedLeads, 'for user:', userId)
      
      // Verify the leads exist and belong to the current user before sending
      const { data: verifyLeads, error: verifyError } = await supabase
        .from('leads')
        .select('id, business_name')
        .in('id', selectedLeads)
        .eq('user_id', userId)

      // console.log('✅ Step 2: Database query completed')
      // console.log('Verification result:', { verifyLeads, verifyError, count: verifyLeads?.length })

      if (verifyError) {
        console.error('❌ EARLY RETURN: Error verifying leads:', verifyError)
        toast.error('Failed to verify leads. Please try refreshing the page.')
        return
      }

      if (!verifyLeads || verifyLeads.length === 0) {
        console.error('❌ EARLY RETURN: No leads found in verification - Auto-refreshing leads list')
        // console.log('Expected leads:', selectedLeads)
        // console.log('Database returned:', verifyLeads)
        toast.error('Selected leads no longer exist. Refreshing leads list...')
        
        // Auto-refresh the leads list and clear selection
        await loadExistingLeads()
        setSelectedLeads([])
        return
      }

      if (verifyLeads.length !== selectedLeads.length) {
        console.error('❌ EARLY RETURN: Lead count mismatch - Auto-refreshing leads list')
        // console.log('Expected count:', selectedLeads.length, 'Found count:', verifyLeads.length)
        const foundIds = verifyLeads.map((lead: { id: string }) => lead.id)
        const missingIds = selectedLeads.filter(id => !foundIds.includes(id))
        // console.log('Missing lead IDs:', missingIds)
        
        // Auto-refresh the leads list and clear selection
        toast.error(`Some leads no longer exist. Refreshing leads list...`)
        await loadExistingLeads()
        setSelectedLeads([])
        return
      }
      
      // console.log('✅ Step 3: Lead verification passed - proceeding to fetch')
      
      // Add timeout to prevent hanging after tab visibility changes
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.error('🚨 FETCH REQUEST TIMEOUT - ABORTING AFTER 15 SECONDS')
        controller.abort()
      }, 15000) // 15 second timeout for faster feedback
      
      // console.log('🚀 Starting fetch request to /api/leads/send-to-outreach')
      // console.log('📤 Request payload:', { leadIds: selectedLeads, userId })
      
      const response = await fetch('/api/leads/send-to-outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds: selectedLeads, userId }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      // console.log('✅ Fetch completed - Response received')
      // console.log('Response status:', response.status, response.statusText)
      // console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Send to outreach error:', errorData)
        
        if (response.status === 404) {
          toast.error('Outreach service not found. Please try again or contact support.')
          return
        }
        
        if (response.status === 503 && errorData.setupRequired) {
          toast.error('🔧 Outreach system needs to be set up. Check the setup instructions at /api/setup/outreach-tables', { duration: 10000 })
          // console.log('Setup instructions available at: /api/setup/outreach-tables')
          return
        }
        
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
          toast.error(errorData.error || `Failed to send leads to outreach (${response.status})`)
        }
        return
      }

      const data = await response.json()
      // console.log('Send to outreach success:', data)
      // console.log('Selected leads to remove:', selectedLeads)
      // console.log('Current leads count before removal:', leads.length)
      
      if (data.success) {
        toast.success(`${data.message}! Created ${data.tasksCreated || data.leadsAdded || selectedLeads.length} follow-up tasks.`)
        
        // Mark leads as sent for visual confirmation with checkmark
        setSentLeads([...selectedLeads])
        setSendingLeads([])
        
        // Remove sent leads after a longer delay to show checkmark animation
        setTimeout(() => {
          const leadsToRemove = [...selectedLeads] // Create a copy to avoid state issues
          setLeads(prev => {
            const filtered = prev.filter(lead => !leadsToRemove.includes(lead.id))
            // console.log('Leads after removal:', filtered.length)
            return filtered
          })
          setSelectedLeads([])
          setSentLeads([])
        }, 2000) // Show "sent" confirmation for 2 seconds
        
        // Update stats
        await loadStats()
      } else {
        toast.error(data.error || 'Failed to send leads to outreach')
      }
    } catch (error) {
      console.error('Error sending to outreach:', error)
      
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Request timed out. Please try again.')
      } else {
        toast.error('Network error: Failed to send leads to outreach')
      }
    } finally {
      setIsSendingToOutreach(false)
      setSendingLeads([])
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
      
      const remainingLeads = leads.filter(lead => !selectedLeads.includes(lead.id))
      setLeads(remainingLeads)
      setSelectedLeads([])
      
      // Close filter panel if no leads remain
      if (remainingLeads.length === 0) {
        setShowFilters(false)
      }
      
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
        const score = calculateLeadScore(lead).total
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

      const remainingLeads = leads.filter(lead => !lowScoreLeads.map(l => l.id).includes(lead.id))
      setLeads(remainingLeads)
      setSelectedLeads([])
      
      // Close filter panel if no leads remain
      if (remainingLeads.length === 0) {
        setShowFilters(false)
      }
      
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
    if (!userId) {
      toast.error('Please sign in first')
      return
    }

    if (leads.length === 0) {
      toast.error('No leads to clear')
      return
    }

    const confirmMessage = `Clear all ${leads.length} leads? This will permanently delete all your current leads from the lead generator. This action cannot be undone.`
    
    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    setIsProcessingBatch(true)
    try {
      const supabase = await getSupabaseClient()
      
      // Delete all leads for this user
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('user_id', userId!)

      if (error) throw error
      
      toast.success('All leads cleared successfully')

      // Don't reload leads - keep page fresh
      setSelectedLeads([])
      // Close filter panel since there are no leads to filter
      setShowFilters(false)
      await loadStats()
      
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

      // Don't reload leads - keep page fresh for current session
      
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
        country: 'US',
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
      geographic: 0
    }
    
    // Contact Information (45 points max)
    if (lead.email) scores.contactInfo += 18
    if (lead.phone) scores.contactInfo += 17
    if (lead.website) scores.contactInfo += 10
    
    // Social Media Presence (30 points max)
    if (lead.instagram_handle) scores.socialPresence += 10
    if (lead.facebook_page) scores.socialPresence += 8
    if (lead.linkedin_profile) scores.socialPresence += 9
    if (lead.twitter_handle) scores.socialPresence += 3
    
    // Business Information (15 points max)
    if (lead.business_name) scores.businessInfo += 5
    if (lead.owner_name) scores.businessInfo += 10
    
    // Geographic (10 points max)
    if (lead.city) scores.geographic += 3
    if (lead.state_province) scores.geographic += 4
    if (lead.city && lead.state_province) scores.geographic += 3 // Bonus for complete location
    
    const total = Object.values(scores).reduce((sum, score) => sum + score, 0)
    
    return {
      total,
      breakdown: {
        contactInfo: { score: scores.contactInfo, max: 45, items: [
          { name: 'Email Address', value: lead.email ? 18 : 0, max: 18, has: !!lead.email },
          { name: 'Phone Number', value: lead.phone ? 17 : 0, max: 17, has: !!lead.phone },
          { name: 'Website', value: lead.website ? 10 : 0, max: 10, has: !!lead.website }
        ]},
        socialPresence: { score: scores.socialPresence, max: 30, items: [
          { name: 'Instagram', value: lead.instagram_handle ? 10 : 0, max: 10, has: !!lead.instagram_handle },
          { name: 'Facebook', value: lead.facebook_page ? 8 : 0, max: 8, has: !!lead.facebook_page },
          { name: 'LinkedIn', value: lead.linkedin_profile ? 9 : 0, max: 9, has: !!lead.linkedin_profile },
          { name: 'Twitter/X', value: lead.twitter_handle ? 3 : 0, max: 3, has: !!lead.twitter_handle }
        ]},
        businessInfo: { score: scores.businessInfo, max: 15, items: [
          { name: 'Business Name', value: lead.business_name ? 5 : 0, max: 5, has: !!lead.business_name },
          { name: 'Owner Name', value: lead.owner_name ? 10 : 0, max: 10, has: !!lead.owner_name }
        ]},
        geographic: { score: scores.geographic, max: 10, items: [
          { name: 'City', value: lead.city ? 3 : 0, max: 3, has: !!lead.city },
          { name: 'State/Province', value: lead.state_province ? 4 : 0, max: 4, has: !!lead.state_province },
          { name: 'Complete Location', value: (lead.city && lead.state_province) ? 3 : 0, max: 3, has: !!(lead.city && lead.state_province) }
        ]}
      }
    }
  }

  const recalculateAllScores = async () => {
    setIsGenerating(true)
    try {
      const supabase = await getSupabaseClient()
      const updates = []
      
      for (const lead of leads) {
        const scoreData = calculateLeadScore(lead)
        updates.push({
          id: lead.id,
          lead_score: scoreData.total
        })
      }
      
      // Update lead scores in batches
      for (let i = 0; i < updates.length; i += 10) {
        const batch = updates.slice(i, i + 10)
        for (const update of batch) {
          await supabase
            .from('leads')
            .update({ lead_score: update.lead_score })
            .eq('id', update.id)
        }
      }
      
      // Reload leads to show updated scores
      setLeads(prev => prev.map(lead => ({
        ...lead,
        lead_score: calculateLeadScore(lead).total
      })))
      
      toast.success(`Updated ${updates.length} lead scores!`)
    } catch (error) {
      console.error('Error recalculating scores:', error)
      toast.error('Failed to update lead scores')
    } finally {
      setIsGenerating(false)
    }
  }

  // Functions to handle temporary filters
  const openFiltersPanel = () => {
    setTempFilters(filters) // Initialize temp filters with current filters
    setShowFilters(true)
  }

  const applyTempFilters = () => {
    setFilters(tempFilters) // Apply temporary filters to actual filters
    setShowFilters(false) // Close filter panel
  }

  const cancelFilters = () => {
    setTempFilters(filters) // Reset temp filters to current filters
    setShowFilters(false) // Close filter panel
  }

  const clearAllTempFilters = () => {
    const clearedFilters = {
      hasPhone: false,
      hasEmail: false,
      hasWebsite: false,
      hasSocials: false,
      socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
      selectedNicheFilter: [],
      minScore: 0
    }
    setTempFilters(clearedFilters)
  }

  // Debug function to reset daily limits for testing


  const resetDailyLimits_REMOVED = async () => {
    if (!userId) {
      toast.error('Please sign in first')
      return
    }
    
          // setIsResettingLimits(true)
    try {
      const response = await fetch('/api/debug/reset-cooldowns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset limits')
      }

      toast.success('🎉 Daily limits and cooldowns reset successfully!')
      
      // Refresh usage data to show updated limits
      await loadUsageData()
      
    } catch (error) {
      console.error('Error resetting daily limits:', error)
      toast.error('Failed to reset daily limits')
    } finally {
      // setIsResettingLimits(false)
    }
  }

  // Show loading state with enhanced progress display
  if (isLoadingPage) {
    return (
      <div className="w-full min-h-screen bg-[#0B0B0B] flex items-center justify-center relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        {/* Glassmorphic card */}
        <div className="relative z-10 w-full max-w-lg mx-4">
          <div className="relative backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-2xl p-12 shadow-2xl">
            {/* Gradient border glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#FF2A2A]/20 via-transparent to-purple-500/20 opacity-50 blur-xl"></div>
            
            <div className="relative z-10 text-center">
              {/* Enhanced spinner with glow */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                {/* Pulsing glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FF2A2A]/30 to-purple-500/30 blur-2xl animate-pulse"></div>
                
                {/* Spinner */}
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#FF2A2A] border-r-[#FF2A2A]/50 animate-spin"></div>
                  
                  {/* Logo container */}
                  <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm flex items-center justify-center">
                    {agencySettings.agency_logo_url && (
                      <img 
                        src={agencySettings.agency_logo_url} 
                        alt={`${agencySettings.agency_name} Logo`} 
                        className="w-14 h-14 object-contain" 
                      />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Title with gradient */}
              <h1 className="text-4xl font-bold bg-gradient-to-br from-white via-white to-gray-400 bg-clip-text text-transparent mb-4 tracking-tight">
                Lead Generator
              </h1>
              
              {/* Subtitle */}
              <p className="text-lg text-gray-300 mb-8 font-medium">
                Setting up lead discovery tools
              </p>
              
              {/* Bottom text */}
              <div className="text-sm text-gray-400 italic">
                Building your personalized lead generation dashboard...
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0B0B0B] text-white p-6 min-h-screen animate-in fade-in duration-300 relative">
      <GridOverlay />
      <div className="w-full space-y-6 relative z-10">
        {/* Main Content - Side by Side Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 min-h-[calc(100vh-3rem)]">
          {/* Lead Search Panel */}
          <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] border-[#2A2A2A] shadow-2xl xl:col-span-2 flex flex-col">
            <CardContent className="space-y-6 pt-6">
              {/* Usage Statistics Panel */}
            <Card className="mb-6 bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] border-[#2A2A2A] shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                  Daily Usage & Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingUsage ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                    <span className="ml-2 text-gray-400">Loading usage data...</span>
                  </div>
                ) : usageData ? (
                  <>
                    {/* Weekly Generation Status */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">Weekly Generation Status</span>
                        <span className="text-sm text-gray-500">resets mondays - {getCountdownToMondayMidnight()}</span>
                      </div>
                      
                      {/* Subtle status indicator */}
                      <div className="flex items-center justify-between p-3 rounded-lg bg-[#2A2A2A] border border-[#333]">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            usageData.remaining <= 0 ? 'bg-[#2A2A2A]' : 'bg-white'
                          }`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-300">
                              {usageData.remaining <= 0 ? 'Weekly limit reached' : 'Generation available'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {usageData.remaining <= 0 && usageData.used > 0 ? `resets mondays - ${getCountdownToMondayMidnight()}` : 
                               usageData.remaining <= 0 ? 'Weekly limit reached' : 'Ready to find leads'}
                            </div>
                          </div>
                        </div>
                        
                        {usageData.remaining > 0 && (
                          <div className="text-right">
                            <div className="text-xs font-medium text-white bg-red-600 px-2 py-1 rounded-full">
                              Ready
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Weekly Usage Counter */}
                    <div className="pt-3 border-t border-[#333]">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-white">{usageData.used}/{usageData.limit}</div>
                        <div className="text-xs text-gray-500">Used this week</div>
                      </div>
                    </div>

                    {/* System Limits */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#333]">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-white">{usageData.leadsPerNiche}</div>
                        <div className="text-xs text-gray-500">Leads per Niche</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-300">{usageData.maxNichesPerSearch}</div>
                        <div className="text-xs text-gray-500">Max Niches</div>
                      </div>
                    </div>



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
              <div className="w-full">
                <div className="flex items-center justify-center p-3 bg-[#2A2A2A] rounded-lg border border-[#333]">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-400 font-medium">Local Services</span>
                </div>
              </div>
            </div>

              {/* Niche Selection */}
            <div className="space-y-3 relative">
              {businessType === 'ecommerce' ? (
                // Coming Soon Message for eCommerce
                <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-8">
                  <div className="text-center">
                    <div className="bg-[#FF2A2A]/20 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                      <Sparkles className="h-10 w-10 text-[#FF2A2A]" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#FF2A2A] mb-3">eCommerce Lead Generation</h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                      We're perfecting our eCommerce lead discovery system with advanced Shopify detection, 
                      social media analytics, and revenue estimation features.
                    </p>
                    <Badge className="bg-[#FF2A2A]/20 text-[#FF2A2A] px-4 py-2">Coming Soon</Badge>
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
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {(categoryNiches as any[]).map((niche: any) => (
                            <div key={niche.id} className="flex items-center space-x-2 min-w-0">
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
                                className="border-[#444] data-[state=checked]:bg-gray-600 flex-shrink-0"
                              />
                              <label 
                                htmlFor={niche.id} 
                                className="text-sm cursor-pointer text-gray-400 truncate"
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
              )}
            </div>

            {/* Selected Niches Display */}
            {selectedNiches.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-400">
                  Selected Niches ({selectedNiches.length}/5 max) - 25 leads total
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedNiches.map(nicheId => {
                    const niche = niches.find(n => n.id === nicheId)
                    return niche ? (
                      <Badge key={nicheId} variant="secondary" className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300">
                        {niche.name}
                      </Badge>
                    ) : null
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  {selectedNiches.length === 1 
                    ? "25 leads from 1 niche" 
                    : `${Math.floor(25 / selectedNiches.length)} leads per niche (${25} total)`
                  }
                </div>
              </div>
            )}

            {/* Location Filter (for local services) */}
            {businessType === 'local_service' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-400">Location Targeting</Label>
                {selectedNiches.length === 0 && (
                  <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Please select at least 1 local service before choosing location
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
                        <SelectValue placeholder={selectedNiches.length === 0 ? "Select Niches First" : "Country"} />
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
                          selectedNiches.length === 0 ? "Select Niches First" : 
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
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
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
                          selectedNiches.length === 0 ? "Select Niches First" : 
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
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
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
                        selectedNiches.length === 0 ? "Select Niches First" : 
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

            {/* Show warning if too many niches selected */}
            {selectedNiches.length > 5 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Too many niches selected. Please select no more than 5 niches (you have {selectedNiches.length}).
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
                  selectedNiches.length > 5 ||
                  businessType === 'ecommerce' || 
                  (usageData?.remaining ?? 0) <= 0
                }
                className={`w-full ${
                  (usageData?.remaining ?? 0) <= 0 
                    ? 'bg-[#1A1A1A] text-gray-400 cursor-not-allowed border border-[#2A2A2A]'
                : 'bg-[#FF2A2A] hover:bg-[#E02424] text-black font-bold border border-[#FF2A2A] hover:border-[#E02424]'
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
                    Finding Real Businesses... (may take up to 90 seconds)
                  </>
                ) : (usageData?.remaining ?? 0) <= 0 ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Weekly Limit - resets Mondays - {getCountdownToMondayMidnight()}</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Find Real Businesses
                  </>
                )}
              </Button>
              
              {selectedNiches.length > 0 && selectedNiches.length <= 5 && usageData && (
                <div className="text-xs text-center text-gray-500">
                  Will generate 25 leads total
                  {selectedNiches.length > 1 ? ` (${Math.floor(25 / selectedNiches.length)} per niche)` : ''}
                  {' '}from {selectedNiches.length} niche{selectedNiches.length > 1 ? 's' : ''}
                </div>
              )}
              {selectedNiches.length === 0 && (
                <div className="text-xs text-center text-gray-400">
                  Select 1-5 niches to generate leads
                </div>
              )}
              {selectedNiches.length > 5 && (
                <div className="text-xs text-center text-red-400">
                  Too many niches selected (max 5)
                </div>
              )}
              

            </div>
            </CardContent>
          </Card>

          {/* Generated Leads Panel */}
          <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] border-[#2A2A2A] shadow-2xl xl:col-span-3 flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <h2 className="text-lg font-semibold text-gray-400 truncate">
                    Generated Leads ({filteredLeads.length}{leads.length !== filteredLeads.length && ` of ${leads.length}`})
                  </h2>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={openFiltersPanel}
                      variant="outline"
                      size="sm"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {(filters.hasPhone || filters.hasEmail || filters.hasWebsite || filters.hasSocials || 
                        filters.socialPlatforms.instagram || filters.socialPlatforms.facebook || 
                        filters.socialPlatforms.linkedin || filters.socialPlatforms.twitter || 
                        filters.minScore > 0 || filters.selectedNicheFilter.length > 0) && (
                        <Badge className="ml-2 bg-[#1A1A1A] border border-[#2A2A2A] text-white" variant="secondary">
                          Active
                        </Badge>
                      )}
                    </Button>
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
                      disabled={selectedLeads.length === 0 || isSendingToOutreach}
                      variant="outline"
                      className="bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#FF2A2A]/90 disabled:opacity-50 px-3 min-w-0"
                    >
                      {isSendingToOutreach ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                          <span className="hidden lg:inline ml-2 whitespace-nowrap">Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 flex-shrink-0" />
                          <span className="hidden xl:inline ml-2 whitespace-nowrap">Send to Outreach ({selectedLeads.length})</span>
                          <span className="hidden lg:inline xl:hidden ml-2 whitespace-nowrap">Send ({selectedLeads.length})</span>
                          <span className="lg:hidden ml-1.5 whitespace-nowrap text-xs">({selectedLeads.length})</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 h-full">

                {/* Search Bar */}
                <div className="flex-shrink-0 mb-4">
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
                  <div className="flex-shrink-0 mb-4 p-4 bg-[#2A2A2A] border border-[#444] rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-400">Advanced Filters</Label>
                      <Button
                        onClick={clearAllTempFilters}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    </div>
                    
                    {/* Score Filter */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-400">Minimum Score</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((score) => (
                          <Button
                            key={score}
                            onClick={() => setTempFilters(prev => ({ ...prev, minScore: score }))}
                            variant={tempFilters.minScore === score ? 'default' : 'outline'}
                            size="sm"
                            className={`h-8 text-xs ${
                              tempFilters.minScore === score
                                ? 'bg-white text-black border-white hover:bg-gray-200'
                                : 'bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                            }`}
                          >
                            {score === 0 ? 'All' : `${score}+`}
                          </Button>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Showing leads with score {tempFilters.minScore === 0 ? 'of any value' : `${tempFilters.minScore} or higher`}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Contact Filters */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-400">Contact Methods</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="hasPhone"
                          checked={tempFilters.hasPhone}
                          onCheckedChange={(checked) => 
                            setTempFilters(prev => ({ ...prev, hasPhone: checked as boolean }))
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
                          checked={tempFilters.hasEmail}
                          onCheckedChange={(checked) => 
                            setTempFilters(prev => ({ ...prev, hasEmail: checked as boolean }))
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
                          checked={tempFilters.hasWebsite}
                          onCheckedChange={(checked) => 
                            setTempFilters(prev => ({ ...prev, hasWebsite: checked as boolean }))
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
                            checked={tempFilters.hasSocials}
                          onCheckedChange={(checked) => 
                              setTempFilters(prev => ({ ...prev, hasSocials: checked as boolean }))
                            }
                            className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                          <label htmlFor="hasSocials" className="text-sm text-gray-400 cursor-pointer flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            Has Socials
                          </label>
                          </div>
                        </div>
                      </div>

                      {/* Social Media Sub-filters */}
                      {tempFilters.hasSocials && (
                        <div className="ml-6 p-3 bg-[#333]/30 rounded-lg border border-[#555]">
                          <Label className="text-xs font-medium text-gray-500 mb-2 block">Social Platform Filters</Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="socialInstagram"
                                checked={tempFilters.socialPlatforms.instagram}
                                onCheckedChange={(checked) => 
                                  setTempFilters(prev => ({ 
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
                                checked={tempFilters.socialPlatforms.facebook}
                          onCheckedChange={(checked) => 
                                  setTempFilters(prev => ({ 
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
                                checked={tempFilters.socialPlatforms.linkedin}
                          onCheckedChange={(checked) => 
                                  setTempFilters(prev => ({ 
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
                                checked={tempFilters.socialPlatforms.twitter}
                          onCheckedChange={(checked) => 
                                  setTempFilters(prev => ({ 
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
                                checked={nicheName ? tempFilters.selectedNicheFilter.includes(nicheName) : false}
                                onCheckedChange={(checked) => {
                                  if (checked && nicheName) {
                                    setTempFilters(prev => ({ 
                                      ...prev, 
                                      selectedNicheFilter: [...prev.selectedNicheFilter, nicheName] 
                                    }))
                                  } else if (nicheName) {
                                    setTempFilters(prev => ({ 
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
                    
                    {/* Apply and Cancel buttons */}
                    <div className="flex justify-end space-x-2 pt-4 border-t border-[#555]">
                      <Button
                        onClick={cancelFilters}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={applyTempFilters}
                        size="sm"
                        className="bg-white hover:bg-gray-200 text-black"
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="overflow-x-auto overflow-y-auto flex-1 border border-[#333] rounded-md">
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
                        <TableHead 
                          className="text-gray-400 cursor-pointer hover:text-gray-300 select-none"
                          onClick={() => handleSort('score')}
                        >
                          <div className="flex items-center gap-1">
                            Score
                            {sortConfig?.key === 'score' ? (
                              sortConfig.direction === 'desc' ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )
                            ) : (
                              <div className="h-4 w-4" />
                            )}
                          </div>
                        </TableHead>
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
                      {filteredLeads.map((lead) => {
                        const isLeadSending = sendingLeads.includes(lead.id)
                        const isLeadSent = sentLeads.includes(lead.id)
                        
                        return (
                        <TableRow
                          key={lead.id}
                          className={`border-[#333] cursor-pointer transition-all duration-500 ${
                            isLeadSent 
                              ? 'bg-[#FF2A2A]/10 opacity-50' 
                              : isLeadSending 
                                ? 'bg-white/5 opacity-75' 
                                : 'hover:bg-[#222]/50'
                          }`}
                          onClick={() => {
                            if (isLeadSending || isLeadSent) return // Prevent selection when processing
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
                              <div className="font-medium text-gray-400 flex items-center gap-2">
                                {lead.business_name}
                                {isLeadSending && (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                  </div>
                                )}
                                {isLeadSent && (
                                  <div className="flex items-center gap-1 text-xs text-[#FF2A2A] animate-in fade-in zoom-in duration-300">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="font-medium">Sent</span>
                                  </div>
                                )}
                              </div>
                              {lead.website && (
                                <a
                                  href={formatWebsiteUrl(lead.website)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
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
                                  {calculateLeadScore(lead).total}
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
                                  className="relative z-10 text-gray-100 hover:text-white hover:scale-110 p-1.5 rounded-lg transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-gray-100/50 hover:z-20"
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
                                    <span className="text-[#FF2A2A]">Shopify</span>
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
                        )
                      })}
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
                <div className="w-full">
                  <div className="flex items-center justify-center p-3 bg-[#2A2A2A] rounded-lg border border-[#333]">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="text-gray-400 font-medium">Local Services</span>
                  </div>
                </div>
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
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
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
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
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
                      onMouseDown={(e) => e.stopPropagation()}
                      onFocus={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
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
                              className="w-4 h-4 text-white bg-gray-700 border-gray-600 focus:ring-gray-500 focus:ring-2"
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
                      className="bg-gradient-to-r from-gray-600 to-gray-400 h-2 rounded-full transition-all duration-500"
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
                                                      className="bg-white h-1.5 rounded-full transition-all duration-300"
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
                                          <TrendingUp className="h-4 w-4 text-gray-400" />
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
                      <div className="text-[#FF2A2A]">
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

            {/* Lead Management Dialog */}
      <Dialog open={showLeadManagement} onOpenChange={setShowLeadManagement}>
        <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              Lead Management
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Clean up your workspace and focus on the leads that matter
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
                <div className="text-2xl font-bold text-white">
                  {leads.filter(lead => calculateLeadScore(lead).total >= 70).length}
                </div>
                <div className="text-xs text-gray-400">High Quality (70+)</div>
              </div>
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">
                  {leads.filter(lead => {
                    const score = calculateLeadScore(lead).total
                    return score >= 40 && score < 70
                  }).length}
                </div>
                <div className="text-xs text-gray-400">Medium Quality</div>
              </div>
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">
                  {leads.filter(lead => calculateLeadScore(lead).total < 40).length}
                </div>
                <div className="text-xs text-gray-400">Low Quality (&lt;40)</div>
              </div>
            </div>

            {/* Workflow Explanation */}
            <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
              <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Workflow Tips
              </h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Review generated leads and send the good ones to outreach</li>
                <li>• Clear the remaining leads since you've already decided they're not worth pursuing</li>
                <li>• Keep your workspace clean and focused on new opportunities</li>
                <li>• Focus on leads with scores 70+ for best conversion rates</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
              
              {/* Send Top Leads */}
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Send className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-white">Send Best Leads to Outreach</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Quickly send your highest-scoring leads to the outreach pipeline.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => sendTopLeadsToOutreach(10)}
                        disabled={isProcessingBatch}
                        size="sm"
                        className="bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        {isProcessingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Top 10 Leads
                      </Button>
                      <Button
                        onClick={() => sendTopLeadsToOutreach(20)}
                        disabled={isProcessingBatch}
                        size="sm"
                        className="bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        {isProcessingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Top 20 Leads
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clear All Leads */}
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-white">Clear Reviewed Leads</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Remove all leads from this list to start fresh. The good ones are already in outreach.
                    </p>
                    <Button
                      onClick={clearAllLeads}
                      disabled={isProcessingBatch}
                      size="sm"
                      className="bg-gray-600 hover:bg-gray-700 text-white mt-3"
                    >
                      {isProcessingBatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Clear All {leads.length} Leads
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearConfirmation} onOpenChange={setShowClearConfirmation}>
        <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              Clear Existing Leads?
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              You have {leads.length} leads in your current list
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
              <div className="flex items-start gap-3">
                                        <RefreshCw className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-white mb-2">Starting a new search will clear your current leads</h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Make sure to send any leads you want to pursue to outreach first. 
                    Leads not sent to outreach will be permanently deleted.
                  </p>
                  <div className="text-xs text-gray-500">
                    💡 Pro tip: Send your best leads to outreach, then clear the rest to keep your workspace clean
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowClearConfirmation(false)}
                variant="outline"
                className="flex-1 bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleClearAndGenerate}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Clear & Generate New
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 