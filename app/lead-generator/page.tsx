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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Search, MapPin, Globe, Building2, Phone, Mail, ExternalLink, Send, Star, Plus, TrendingUp, Instagram, Facebook, Linkedin, Sparkles, Filter, RefreshCw, Clock, BarChart3, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuthenticatedSupabase } from '@/lib/utils/supabase-auth-client'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import ManualLeadForm from '@/components/ManualLeadForm'

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
  hasInstagram: boolean
  hasTwitter: boolean
  hasLinkedin: boolean
  hasFacebook: boolean
  selectedNicheFilter: string[]
}

// Zod schema for form validation
const leadSchema = z.object({
  // Basic Info
  business_name: z.string().min(1, "Business name is required"),
  owner_name: z.string().min(1, "Owner name is required"),
  location: z.string().min(1, "Location is required"),
  
  // Contact
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  
  // Social Media
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface NicheCooldown {
  niche: string;
  used_today: number;
  daily_limit: number;
  cooldown_remaining_ms: number;
  cooldown_end_time: string;
}

export default function LeadGeneratorPage() {
  const { selectedBrandId } = useBrandContext()
  const { userId } = useAuth()
  const { getSupabaseClient } = useAuthenticatedSupabase()
  
  const [businessType, setBusinessType] = useState<'ecommerce' | 'local_service'>('local_service')
  const [selectedNiches, setSelectedNiches] = useState<string[]>([])
  const [location, setLocation] = useState({ country: '', state: '', city: '', radius: '' })
  const [keywords, setKeywords] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [isAddingManual, setIsAddingManual] = useState(false)
  const [manualLeadData, setManualLeadData] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    phone: '',
    website: '',
    city: '',
    state_province: '',
    niche_id: '',
    instagram_handle: '',
    facebook_page: '',
    linkedin_profile: '',
    twitter_handle: ''
  })
  const [niches, setNiches] = useState<any[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [todayLeads, setTodayLeads] = useState(0)
  const [activeTab, setActiveTab] = useState('search')
  const [isLoadingUsage, setIsLoadingUsage] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  // Usage data from API
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  
  // Lead filters
  const [filters, setFilters] = useState<LeadFilters>({
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false,
    hasInstagram: false,
    hasTwitter: false,
    hasLinkedin: false,
    hasFacebook: false,
    selectedNicheFilter: []
  })

  const [nicherCooldowns, setNicheCooldowns] = useState<NicheCooldown[]>([])
  const [isLoadingCooldowns, setIsLoadingCooldowns] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { control, handleSubmit, reset, formState: { errors, isValid }, watch } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    mode: 'onChange',
    defaultValues: {
      business_name: '',
      owner_name: '',
      location: '',
      phone: '',
      email: '',
      website: '',
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      tiktok: '',
      youtube: '',
    }
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
    if (filters.hasInstagram) {
      filtered = filtered.filter(lead => lead.instagram_handle && lead.instagram_handle !== 'N/A')
    }
    if (filters.hasTwitter) {
      filtered = filtered.filter(lead => lead.twitter_handle && lead.twitter_handle !== 'N/A')
    }
    if (filters.hasLinkedin) {
      filtered = filtered.filter(lead => lead.linkedin_profile && lead.linkedin_profile !== 'N/A')
    }
    if (filters.hasFacebook) {
      filtered = filtered.filter(lead => lead.facebook_page && lead.facebook_page !== 'N/A')
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
            location,
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

  const sendToOutreach = () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to send to outreach')
      return
    }
    toast.success(`Sent ${selectedLeads.length} leads to Outreach Manager!`)
    setSelectedLeads([])
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
      const { data: insertedLead, error } = await supabase
        .from('leads')
        .insert([leadToInsert])
        .select()
        .single()

      if (error) throw error

      // Reload leads to get fresh data instead of trying to add to local state
      await loadExistingLeads()
      
      // Reset form
      setManualLeadData({
        business_name: '',
        owner_name: '',
        email: '',
        phone: '',
        website: '',
        city: '',
        state_province: '',
        niche_id: '',
        instagram_handle: '',
        facebook_page: '',
        linkedin_profile: '',
        twitter_handle: ''
      })
      
      setIsAddingManual(false)
      await loadStats()
      toast.success('Lead added successfully!')
    } catch (error) {
      console.error('Error adding manual lead:', error)
      toast.error('Failed to add lead')
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

  // Helper function to clean social media handles
  const cleanSocialHandle = (url: string, platform: string): string => {
    if (!url) return '';
    
    let handle = url.trim();
    
    // Remove protocol and common prefixes
    handle = handle.replace(/^https?:\/\//i, '');
    handle = handle.replace(/^www\./i, '');
    
    // Platform-specific cleaning
    const platformDomains: { [key: string]: string[] } = {
      facebook: ['facebook.com/', 'fb.com/', 'm.facebook.com/'],
      instagram: ['instagram.com/', 'instagr.am/'],
      twitter: ['twitter.com/', 'x.com/'],
      linkedin: ['linkedin.com/in/', 'linkedin.com/company/', 'linkedin.com/pub/'],
      tiktok: ['tiktok.com/@', 'tiktok.com/'],
      youtube: ['youtube.com/channel/', 'youtube.com/user/', 'youtube.com/c/', 'youtu.be/']
    };
    
    if (platformDomains[platform]) {
      for (const domain of platformDomains[platform]) {
        if (handle.toLowerCase().startsWith(domain)) {
          handle = handle.substring(domain.length);
          break;
        }
      }
    }
    
    // Remove @ symbol if it's the first character
    if (handle.startsWith('@')) {
      handle = handle.substring(1);
    }
    
    // Remove trailing slashes and query parameters
    handle = handle.replace(/[\/\?#].*$/, '');
    
    return handle;
  };

  // Fetch niche cooldowns
  const fetchNicheCooldowns = async () => {
    try {
      setIsLoadingCooldowns(true);
      const response = await fetch('/api/leads/usage');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Cooldown data received:', data);
      
      if (data.success && Array.isArray(data.niche_cooldowns)) {
        const activeCooldowns = data.niche_cooldowns.filter((item: NicheCooldown) => 
          item.cooldown_remaining_ms > 0
        );
        console.log('Active cooldowns:', activeCooldowns);
        setNicheCooldowns(activeCooldowns);
      } else {
        console.error('Invalid cooldown data format:', data);
        setNicheCooldowns([]);
      }
    } catch (error) {
      console.error('Error fetching niche cooldowns:', error);
      toast.error('Failed to load niche cooldowns');
      setNicheCooldowns([]);
    } finally {
      setIsLoadingCooldowns(false);
    }
  };

  const handleFormSuccess = () => {
    setIsAddingManual(false);
    toast.success('Lead added successfully!');
  };

  useEffect(() => {
    fetchNicheCooldowns();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNicheCooldowns, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Generator</h1>
          <p className="text-muted-foreground">Generate and manage your business leads</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchNicheCooldowns} variant="outline">
            Refresh Cooldowns
          </Button>
          <Dialog open={isAddingManual} onOpenChange={setIsAddingManual}>
            <DialogTrigger asChild>
              <Button>Add Lead Manually</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <ManualLeadForm 
                onSuccess={handleFormSuccess}
                onCancel={() => setIsAddingManual(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Niche Cooldowns */}
      <Card>
        <CardHeader>
          <CardTitle>Niche Cooldowns</CardTitle>
          <CardDescription>
            Current active cooldowns for different business niches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCooldowns ? (
            <p>Loading cooldowns...</p>
          ) : nicherCooldowns.length === 0 ? (
            <p className="text-muted-foreground">No active cooldowns - all niches are available!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {nicherCooldowns.map((cooldown, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{cooldown.niche}</p>
                    <p className="text-sm text-muted-foreground">
                      {cooldown.used_today}/{cooldown.daily_limit} used today
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {Math.ceil(cooldown.cooldown_remaining_ms / (1000 * 60 * 60))}h remaining
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Generation Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Generation Tools</CardTitle>
          <CardDescription>
            Use these tools to generate leads automatically or manually
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Automated Lead Generation</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Generate leads automatically using AI and web scraping
              </p>
              <Button disabled className="w-full">
                Coming Soon
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Manual Lead Entry</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Add leads manually with our comprehensive form
              </p>
              <Dialog open={isAddingManual} onOpenChange={setIsAddingManual}>
                <DialogTrigger asChild>
                  <Button className="w-full">Add Lead</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Lead</DialogTitle>
                  </DialogHeader>
                  <ManualLeadForm 
                    onSuccess={handleFormSuccess}
                    onCancel={() => setIsAddingManual(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 