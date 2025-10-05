"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Loader2, Send, MessageSquare, Phone, Mail, Calendar, 
  CheckCircle, Clock, AlertCircle, Star, TrendingUp,
  Plus, Edit, Copy, Sparkles, Target, Users, BarChart3,
  Building2, ExternalLink, Linkedin, Twitter, Instagram,
  Facebook, ChevronRight, ChevronLeft, Filter, RefreshCw, DollarSign,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Search, Trash2,
  XCircle, MessageCircle, MailOpen, PhoneCall, User,
  Share2, Globe, MapPin, Zap, CircleDot, CheckCircle2,
  Calculator, TrendingDown, Award, Settings, Info, ChevronUp, ChevronDown,
    CheckSquare, Square, Brain, ArrowRight, X, FileText, Building,
    Eye, RotateCcw, Download
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getAuthenticatedSupabaseClient, getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { useAgency } from "@/contexts/AgencyContext"
import { GridOverlay } from '@/components/GridOverlay'

interface Lead {
  id: string
  business_name: string
  owner_name?: string
  email?: string
  phone?: string
  website?: string
  city?: string
  state_province?: string
  business_type?: string
  niche_name?: string
  instagram_handle?: string
  facebook_page?: string
  linkedin_profile?: string
  twitter_handle?: string
  lead_score?: number
  created_at?: string
}

interface OutreachCampaign {
  id: string
  name: string
  description?: string
  campaign_type: string
  status: 'active' | 'paused' | 'completed'
  max_leads: number
  leads_contacted: number
  response_rate: string
  conversion_rate: string
  created_at: string
  updated_at: string
}

interface CampaignLead {
  id: string
  campaign_id: string
  lead_id: string
  status: 'pending' | 'contacted' | 'responded' | 'qualified' | 'signed' | 'rejected'
  added_at: string
  last_contacted_at?: string
  next_follow_up_date?: string
  notes?: string
  lead?: Lead
  campaign?: OutreachCampaign
  outreach_method?: 'email' | 'phone' | 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'x'
  dm_sent?: number
  dm_responded?: number
  email_sent?: number
  email_responded?: number
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
  statusFilter: string
  minScore: number
  hasOwnerName: boolean
  businessTypeFilter: string[]
  locationFilter: {
    city: string
    state: string
  }
  outreachMethodFilter: string[]
  lastContactedFilter: string // 'today', 'yesterday', 'week', 'month', 'never'
  scoreRange: {
    min: number
    max: number
  }
}

interface ActionItem {
  id: string
  type: 'urgent' | 'opportunity' | 'insight' | 'optimization'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action: string
  leads?: string[]
  completed?: boolean
  completedAt?: string
}

interface TodoItem {
  id: string
  type: 'new_leads' | 'follow_up' | 'hot_leads' | 'going_cold' | 'responded'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  count: number
  action: string
  filterAction: () => void
}

// Lead management constants
const MAX_PENDING_LEADS = 75 // Maximum pending leads allowed
const MAX_TOTAL_LEADS = 200 // Maximum total leads in outreach
const WARNING_THRESHOLD = 0.8 // Show warning at 80% of limit

export default function OutreachToolPage() {
  const { userId, getToken } = useAuth()
  const { agencySettings } = useAgency()
  const { selectedBrandId } = useBrandContext()
  
  // Unified Supabase client function
  const getSupabaseClient = async () => {
    try {
      // console.log('🔗 Getting Supabase client...')
      const token = await getToken({ template: 'supabase' })
      if (token) {
        // console.log('✅ Using authenticated client')
        return getAuthenticatedSupabaseClient(token)
      } else {
        // console.log('⚠️ Using standard client (no token)')
        return getStandardSupabaseClient()
      }
    } catch (error) {
      console.error('❌ Error getting Supabase client:', error)
      return getStandardSupabaseClient()
    }
  }

  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([])
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([])
  const [selectedCampaignLead, setSelectedCampaignLead] = useState<CampaignLead | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [messageUsage, setMessageUsage] = useState<{
    hourly: { used: number; limit: number; remaining: number }
    daily: { used: number; limit: number; remaining: number }
  } | null>(null)
  const [messageType, setMessageType] = useState<'email' | 'phone' | 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'x'>('email')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [showMessageComposer, setShowMessageComposer] = useState(false)
    const [messageMarkedAsContacted, setMessageMarkedAsContacted] = useState(false) // Track if user marked message as contacted
    const [showCloseWarning, setShowCloseWarning] = useState(false) // Show warning when closing without marking as contacted
    const [methodUsageTimestamp, setMethodUsageTimestamp] = useState(Date.now()) // Force re-render when methods are used
    const [showOutreachOptions, setShowOutreachOptions] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [justCopied, setJustCopied] = useState(false)
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [selectedScoreBreakdown, setSelectedScoreBreakdown] = useState<any>(null)
  const [showScoreManager, setShowScoreManager] = useState(false)
  const [isRecalculatingScores, setIsRecalculatingScores] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
  const [showLoadingOverride, setShowLoadingOverride] = useState(false)
  const [showContractGenerator, setShowContractGenerator] = useState(false)
  const [contractData, setContractData] = useState({
    pricingModel: 'retainer', // 'retainer', 'revenue_share', or 'per_lead'
    monthlyRetainer: '',
    adSpend: '',
    revenueSharePercentage: '',
    minimumAdSpend: '',
    pricePerLead: '',
    estimatedMonthlyLeads: '',
    leadQualifications: '',
    setupFee: '',
    contractLength: '6',
    servicesIncluded: {
      metaAds: false,
      creativeDesign: false,
      analytics: false,
      monthlyReports: false
    },
    startDate: '',
    paymentTerms: 'net-30',
    cancellationNotice: '30'
  })
  
  // Contract editor state
  const [contractEditingMode, setContractEditingMode] = useState(false)
  const [generatedContractText, setGeneratedContractText] = useState('')
  const [editableContractText, setEditableContractText] = useState('')
  const [contractHtmlContent, setContractHtmlContent] = useState('')
  const [contractPreviewMode, setContractPreviewMode] = useState(false)
  
  // Contract validation state
  const [flashingFields, setFlashingFields] = useState<string[]>([])
  
  // Simple Todo state
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [completedTodos, setCompletedTodos] = useState<Set<string>>(new Set())
  
  // Smart Response state
  const [showSmartResponse, setShowSmartResponse] = useState(false)
  const [leadResponse, setLeadResponse] = useState('')
  const [responseMethod, setResponseMethod] = useState<'email' | 'phone' | 'linkedin' | 'instagram' | 'facebook' | 'twitter'>('email')
  const [generatedSmartResponse, setGeneratedSmartResponse] = useState('')
  const [isGeneratingSmartResponse, setIsGeneratingSmartResponse] = useState(false)
  const [smartResponseCopied, setSmartResponseCopied] = useState(false)
  const [smartResponsesRemaining, setSmartResponsesRemaining] = useState<number | null>(null)
  
  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false)

  // Platform connections state
  const [platformConnections, setPlatformConnections] = useState<any[]>([])
  const [isLoadingConnections, setIsLoadingConnections] = useState(false)
  
  // Bulk Outreach state
  const [pendingOutreachQueue, setPendingOutreachQueue] = useState<CampaignLead[]>([])
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  
  // Bulk Follow-up state for contacted leads
  const [contactedFollowUpQueue, setContactedFollowUpQueue] = useState<CampaignLead[]>([])
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0)
  const [isFollowUpMode, setIsFollowUpMode] = useState(false)
  
  // Bulk Smart Response state for responded leads
  const [respondedQueue, setRespondedQueue] = useState<CampaignLead[]>([])
  const [currentRespondedIndex, setCurrentRespondedIndex] = useState(0)
  const [isRespondedMode, setIsRespondedMode] = useState(false)
  
  // Bulk Contract Generation state for qualified leads
  const [qualifiedContractQueue, setQualifiedContractQueue] = useState<CampaignLead[]>([])
  const [currentContractIndex, setCurrentContractIndex] = useState(0)
  const [isContractMode, setIsContractMode] = useState(false)
  
  // Advanced filters state
  const [filters, setFilters] = useState<LeadFilters>({
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false,
    hasSocials: false,
    socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
    selectedNicheFilter: [],
    statusFilter: 'all',
    minScore: 0,
    hasOwnerName: false,
    businessTypeFilter: [],
    locationFilter: { city: '', state: '' },
    outreachMethodFilter: [],
    lastContactedFilter: 'all',
    scoreRange: { min: 0, max: 100 }
  })
  
  // Temporary filters state for pending changes
  const [tempFilters, setTempFilters] = useState<LeadFilters>({
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false,
    hasSocials: false,
    socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
    selectedNicheFilter: [],
    statusFilter: 'all',
    minScore: 0,
    hasOwnerName: false,
    businessTypeFilter: [],
    locationFilter: { city: '', state: '' },
    outreachMethodFilter: [],
    lastContactedFilter: 'all',
    scoreRange: { min: 0, max: 100 }
  })

  const [mounted, setMounted] = useState(false)
  
  // Define refs first to be available for all hooks and callbacks
  const campaignCountRef = useRef(0)
  const campaignLeadCountRef = useRef(0)
  const mountedRef = useRef(true)

  // Define all callbacks before useEffect hooks to avoid linter errors
  const loadCampaigns = useCallback(async () => {
    if (!userId) return

    try {
      // console.log('Loading campaigns for user:', userId)
      const supabase = await getSupabaseClient()
      
      let query = supabase
        .from('outreach_campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      // console.log('Loaded campaigns:', data?.length || 0)
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
      toast.error('Failed to load campaigns')
      setCampaigns([]) // Set empty array on error
    }
  }, [userId])

  const loadCampaignLeads = useCallback(async () => {
    if (!userId) return

    try {
      // console.log('Loading campaign leads for user:', userId)
      const supabase = await getSupabaseClient()
      
      const { data: userCampaigns, error: campaignsError } = await supabase
        .from('outreach_campaigns')
        .select('id')
        .eq('user_id', userId)

      if (campaignsError) throw campaignsError

      if (!userCampaigns || userCampaigns.length === 0) {
        // console.log('No campaigns found, setting empty campaign leads')
        setCampaignLeads([])
        return
      }

      const campaignIds = userCampaigns.map(c => c.id)

      const { data, error } = await supabase
        .from('outreach_campaign_leads')
        .select(`
          *,
          lead:leads(*),
          campaign:outreach_campaigns(*)
        `)
        .in('campaign_id', campaignIds)
        .order('added_at', { ascending: false })

      if (error) throw error
      
      // console.log('Loaded campaign leads:', data?.length || 0)
      setCampaignLeads(data || [])
    } catch (error) {
      console.error('Error loading campaign leads:', error)
      toast.error('Failed to load campaign leads')
      setCampaignLeads([]) // Set empty array on error
    }
  }, [userId])

  const loadMessageUsage = useCallback(async () => {
    if (!userId) return

    try {
      // Send user's timezone to API for accurate daily reset calculation
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const response = await fetch('/api/outreach/usage', {
        headers: {
          'x-user-timezone': userTimezone
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMessageUsage(data.usage)
      }
    } catch (error) {
      console.error('Error loading message usage:', error)
    }
  }, [userId])

  const loadPlatformConnections = useCallback(async () => {
    if (!userId) return

    try {
      setIsLoadingConnections(true)
      // console.log('Loading platform connections for user:', userId)
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (error) throw error
      
      // console.log('Loaded platform connections:', data?.length || 0)
      setPlatformConnections(data || [])
    } catch (error) {
      console.error('Error loading platform connections:', error)
      setPlatformConnections([])
    } finally {
      setIsLoadingConnections(false)
    }
  }, [userId])

  const loadInitialData = useCallback(async () => {
    // console.log('🔄 loadInitialData called, userId:', userId)
    
    if (!userId) {
      // console.log('❌ No userId in loadInitialData, stopping loading')
      setIsLoadingPage(false)
      return
    }
    
    try {
      // console.log('📡 Starting to load campaigns and leads...')
      setIsLoadingPage(true)
      setIsLoading(true)
      
      // Load campaigns, leads, message usage, and platform connections in parallel with timeout
      const loadPromises = Promise.all([
        loadCampaigns(),
        loadCampaignLeads(),
        loadMessageUsage(),
        loadPlatformConnections()
      ])
      
      // Add a timeout to the loading process
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Loading timeout')), 15000)
      )
      
      await Promise.race([loadPromises, timeoutPromise])
      // console.log('✅ Initial data loading completed')
      
    } catch (error) {
      console.error('❌ Error loading initial data:', error)
      toast.error('Failed to load outreach data: ' + (error as Error).message)
      // Set empty arrays to ensure we have some state
      setCampaigns([])
      setCampaignLeads([])
    } finally {
      // console.log('🏁 loadInitialData finally block - stopping loading')
      setIsLoadingPage(false)
      setIsLoading(false)
    }
  }, [userId, loadCampaigns, loadCampaignLeads, loadMessageUsage, loadPlatformConnections])

  const generateTodos = useCallback(() => {
    if (!campaignLeads.length) {
      setTodos([])
        return
      }

    const newTodos: TodoItem[] = []
    
    // Count leads by status
    const pendingLeads = campaignLeads.filter(cl => cl.status === 'pending')
    const contactedLeads = campaignLeads.filter(cl => cl.status === 'contacted')
    const respondedLeads = campaignLeads.filter(cl => cl.status === 'responded')
    const qualifiedLeads = campaignLeads.filter(cl => cl.status === 'qualified')
    
    // Get current date for comparisons
    const now = new Date()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(now.getDate() - 3)
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(now.getDate() - 5)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(now.getDate() - 7)
    
    // Get leads that need follow-up (5+ days old and still contacted, not snoozed)
    const needsFollowUp = contactedLeads.filter(cl => {
      if (!cl.last_contacted_at) return false
      // Exclude snoozed leads (those with future next_follow_up_date)
      if (cl.next_follow_up_date && new Date(cl.next_follow_up_date) > now) return false
      return new Date(cl.last_contacted_at) < fiveDaysAgo
    })
    
    // Get leads going cold (7+ days old, not snoozed)
    const goingCold = contactedLeads.filter(cl => {
      if (!cl.last_contacted_at) return false
      // Exclude snoozed leads (those with future next_follow_up_date)
      if (cl.next_follow_up_date && new Date(cl.next_follow_up_date) > now) return false
      return new Date(cl.last_contacted_at) < sevenDaysAgo
    })



    // Generate specific todo items for individual leads
    
    // High priority - Responded leads (need immediate attention)
    if (respondedLeads.length > 1) {
      // If 2+ responded leads, show bulk action instead of individual items
      newTodos.push({
        id: 'bulk_responded_many',
        type: 'responded',
        priority: 'high',
        title: `${respondedLeads.length} leads have responded and need immediate attention`,
        description: 'Use the bulk smart response tool to efficiently process all responded leads in sequence',
        count: respondedLeads.length,
        action: 'Start Bulk Smart Response',
        filterAction: () => {
          if (respondedLeads.length > 0) {
            setRespondedQueue(respondedLeads)
            setCurrentRespondedIndex(0)
            setSelectedCampaignLead(respondedLeads[0])
            setIsRespondedMode(true)
            setShowSmartResponse(true)
          }
        }
      })
    } else {
      // Show individual responded leads if only 1
    respondedLeads.forEach(cl => {
      if (cl.lead) {
      newTodos.push({
          id: `respond_${cl.id}`,
          type: 'responded',
        priority: 'high',
          title: `Respond to ${cl.lead.business_name}`,
          description: `${cl.lead.business_name} responded to your outreach - follow up now!`,
          count: 1,
          action: 'Smart Response',
          filterAction: () => {
            setFilters(prev => ({ ...prev, statusFilter: 'responded' }))
            // Also select this specific lead
            setSelectedCampaignLead(cl)
              setIsRespondedMode(false)
            setShowSmartResponse(true)
          }
      })
    }
    })
    }

    // High priority - Qualified leads (ready to close)
    if (qualifiedLeads.length > 1) {
      // If 2+ qualified leads, show bulk contract generation instead of individual items
      newTodos.push({
        id: 'bulk_contracts_many',
        type: 'hot_leads',
        priority: 'high',
        title: `${qualifiedLeads.length} qualified leads are ready for contracts`,
        description: 'Use the bulk contract generator to efficiently create contracts for all qualified leads in sequence',
        count: qualifiedLeads.length,
        action: 'Generate Contracts',
        filterAction: () => {
          if (qualifiedLeads.length > 0) {
            setQualifiedContractQueue(qualifiedLeads)
            setCurrentContractIndex(0)
            setSelectedCampaignLead(qualifiedLeads[0])
            setIsContractMode(true)
            setShowContractGenerator(true)
          }
        }
      })
    } else {
      // Show individual qualified leads if only 1
      qualifiedLeads.forEach(cl => {
        if (cl.lead) {
        newTodos.push({
            id: `close_${cl.id}`,
            type: 'hot_leads',
          priority: 'high',
            title: `Send proposal to ${cl.lead.business_name}`,
            description: `${cl.lead.business_name} is qualified and ready for your proposal`,
            count: 1,
            action: 'Send Proposal',
            filterAction: () => {
              setFilters(prev => ({ ...prev, statusFilter: 'qualified' }))
              // Also select this specific lead
              setSelectedCampaignLead(cl)
              setIsContractMode(false)
              setShowContractGenerator(true)
            }
        })
      }
      })
    }

    // Medium priority - Pending leads (need initial outreach)
    if (pendingLeads.length > 1) {
      // If 2+ pending leads, show bulk action instead of individual items
      newTodos.push({
        id: 'bulk_pending_many',
        type: 'new_leads',
        priority: 'medium',
        title: `${pendingLeads.length} leads are pending and awaiting outreach`,
        description: 'Use the bulk outreach tool to efficiently process all pending leads in sequence',
        count: pendingLeads.length,
        action: 'Start Bulk Outreach',
        filterAction: () => {
          const pendingLeads = campaignLeads.filter(lead => lead.status === 'pending')
          if (pendingLeads.length > 0) {
            setPendingOutreachQueue(pendingLeads)
            setCurrentQueueIndex(0)
            setSelectedCampaignLead(pendingLeads[0])
            setIsFollowUpMode(false)
            setShowContractGenerator(false) // Clear contract state
            setShowOutreachOptions(true)
          }
        }
      })
    } else if (pendingLeads.length === 1) {
      // Show individual pending lead if only 1
      const cl = pendingLeads[0]
      if (cl.lead) {
        newTodos.push({
          id: `outreach_${cl.id}`,
          type: 'new_leads',
          priority: 'medium',
          title: `Start outreach to ${cl.lead.business_name}`,
          description: `${cl.lead.business_name} is ready for personalized outreach`,
          count: 1,
          action: 'Start Outreach',
          filterAction: () => {
            setSelectedCampaignLead(cl)
            setIsFollowUpMode(false)
            setShowContractGenerator(false) // Clear contract state
            setShowOutreachOptions(true)
          }
      })
    }
    }

    // Medium priority - Contacted leads needing follow-up (7+ days old)
    if (goingCold.length > 1) {
      // If 2+ contacted leads are 7+ days old, show bulk follow-up option
      newTodos.push({
        id: 'bulk_contacted_followup',
        type: 'follow_up',
        priority: 'medium',
        title: `${goingCold.length} leads have been marked as contacted for 7+ days with no updates`,
        description: 'These leads need follow-up outreach or status updates. Use bulk follow-up to process efficiently.',
        count: goingCold.length,
        action: 'Start Bulk Follow-up',
        filterAction: () => {
          const oldContactedLeads = campaignLeads.filter(cl => {
            if (!cl.last_contacted_at || cl.status !== 'contacted') return false
            // Exclude snoozed leads
            if (cl.next_follow_up_date && new Date(cl.next_follow_up_date) > now) return false
            return new Date(cl.last_contacted_at) < sevenDaysAgo
          })
          if (oldContactedLeads.length > 0) {
            setContactedFollowUpQueue(oldContactedLeads)
            setCurrentFollowUpIndex(0)
            setSelectedCampaignLead(oldContactedLeads[0])
            setIsFollowUpMode(true)
            setShowOutreachOptions(true)
          }
        }
      })
    } else if (goingCold.length === 1) {
      // Show individual contacted lead if only 1
      const cl = goingCold[0]
      if (cl.lead) {
        const daysSince = Math.floor((now.getTime() - new Date(cl.last_contacted_at!).getTime()) / (1000 * 60 * 60 * 24))
        newTodos.push({
          id: `followup_${cl.id}`,
          type: 'follow_up',
          priority: 'medium',
          title: `Follow up with ${cl.lead.business_name}`,
          description: `No response from ${cl.lead.business_name} in ${daysSince} days - send follow-up`,
          count: 1,
          action: 'Re-reach Out',
          filterAction: () => {
            setSelectedCampaignLead(cl)
            setIsFollowUpMode(true)
            setShowOutreachOptions(true)
          }
        })
      }
    }

    // Medium priority - General follow-up needed (5+ days old) - only show if not covered by 7+ day bulk
    if (needsFollowUp.length > goingCold.length && needsFollowUp.length > 1) {
      const remainingFollowUps = needsFollowUp.filter(cl => !goingCold.includes(cl))
      if (remainingFollowUps.length > 0) {
        newTodos.push({
          id: 'bulk_followup_5days',
          type: 'follow_up',
          priority: 'medium',
          title: `${remainingFollowUps.length} leads were contacted 5+ days ago - time for follow-up`,
          description: 'These leads need follow-up outreach or status updates. Use bulk follow-up to process efficiently.',
          count: remainingFollowUps.length,
          action: 'Start Bulk Follow-up',
          filterAction: () => {
            const fiveDayOldLeads = campaignLeads.filter(cl => {
              if (!cl.last_contacted_at || cl.status !== 'contacted') return false
              // Exclude snoozed leads
              if (cl.next_follow_up_date && new Date(cl.next_follow_up_date) > now) return false
              const fiveDaysAgo = new Date()
              fiveDaysAgo.setDate(new Date().getDate() - 5)
              const sevenDaysAgo = new Date()
              sevenDaysAgo.setDate(new Date().getDate() - 7)
              const contactDate = new Date(cl.last_contacted_at)
              // Only include leads that are 5+ days old but not 7+ days old (those are handled separately)
              return contactDate < fiveDaysAgo && contactDate >= sevenDaysAgo
            })
            if (fiveDayOldLeads.length > 0) {
              setContactedFollowUpQueue(fiveDayOldLeads)
              setCurrentFollowUpIndex(0)
              setSelectedCampaignLead(fiveDayOldLeads[0])
              setIsFollowUpMode(true)
              setShowOutreachOptions(true)
            }
          }
        })
      }
    }

    // Note: Going cold leads are now handled in the bulk follow-up section above
    // This keeps the todo list cleaner and more action-oriented



    // Check for leads whose snooze period has expired
    const unsnoozedLeads = contactedLeads.filter(cl => {
      if (!cl.next_follow_up_date) return false
      return new Date(cl.next_follow_up_date) <= now
    })

    if (unsnoozedLeads.length > 1) {
      newTodos.push({
        id: 'bulk_unsnoozed',
        type: 'follow_up',
        priority: 'high',
        title: `${unsnoozedLeads.length} snoozed leads are ready for follow-up`,
        description: 'These leads were snoozed and are now ready for re-engagement. Time to follow up!',
        count: unsnoozedLeads.length,
        action: 'Start Bulk Follow-up',
        filterAction: () => {
          if (unsnoozedLeads.length > 0) {
            setContactedFollowUpQueue(unsnoozedLeads)
            setCurrentFollowUpIndex(0)
            setSelectedCampaignLead(unsnoozedLeads[0])
            setIsFollowUpMode(true)
            setShowOutreachOptions(true)
          }
        }
      })
    } else if (unsnoozedLeads.length === 1) {
      const cl = unsnoozedLeads[0]
      if (cl.lead) {
        newTodos.push({
          id: `unsnoozed_${cl.id}`,
          type: 'follow_up',
          priority: 'high',
          title: `Follow up with ${cl.lead.business_name} (snooze expired)`,
          description: `${cl.lead.business_name} was snoozed and is now ready for re-engagement`,
          count: 1,
          action: 'Follow Up',
          filterAction: () => {
            setSelectedCampaignLead(cl)
            setIsFollowUpMode(true)
            setShowOutreachOptions(true)
          }
        })
      }
    }

    // Add status update reminders
    const oldContactedLeads = contactedLeads.filter(cl => {
      if (!cl.last_contacted_at) return false
      // Exclude snoozed leads and leads that are already covered by unsnoozed todos
      if (cl.next_follow_up_date && new Date(cl.next_follow_up_date) > now) return false
      if (unsnoozedLeads.includes(cl)) return false
      return new Date(cl.last_contacted_at) < threeDaysAgo
    })

    if (oldContactedLeads.length > 0) {
      newTodos.push({
        id: 'update_status',
        type: 'follow_up',
        priority: 'low',
        title: `Update status for ${oldContactedLeads.length} leads`,
        description: `Some leads may have responded but status hasn't been updated`,
        count: oldContactedLeads.length,
        action: 'Review Status',
        filterAction: () => setFilters(prev => ({ ...prev, statusFilter: 'contacted' }))
      })
    }

    setTodos(newTodos)
  }, [campaignLeads, setFilters, setSelectedCampaignLead, setShowOutreachOptions, setShowSmartResponse, setPendingOutreachQueue, setCurrentQueueIndex, setContactedFollowUpQueue, setCurrentFollowUpIndex, setIsFollowUpMode, setRespondedQueue, setCurrentRespondedIndex, setIsRespondedMode, setQualifiedContractQueue, setCurrentContractIndex, setIsContractMode, setShowContractGenerator])

  // Component mount tracking and cleanup
  useEffect(() => {
    // console.log('🔄 Component mounting...')
    setMounted(true)
    
    // Clean up old message count tracking from localStorage (older than 2 days)
    const cleanupOldMessageCounts = () => {
      const keys = Object.keys(localStorage)
      const trackingKeys = keys.filter(key => key.startsWith('msg_count_') || key.startsWith('method_used_'))
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      
      trackingKeys.forEach(key => {
        const parts = key.split('_')
        if (parts.length >= 3) {
          // Get the date part - last element for both key types
          const dateStr = parts[parts.length - 1]
          const keyDate = new Date(dateStr)
          if (keyDate < twoDaysAgo) {
            localStorage.removeItem(key)
          }
        }
      })
    }
    
    cleanupOldMessageCounts()
    
    return () => {
      // console.log('🧹 Component unmounting...')
    }
  }, [])

  // Show loading override button after 8 seconds
  useEffect(() => {
    if (isLoadingPage) {
      const timer = setTimeout(() => {
        setShowLoadingOverride(true)
      }, 8000)
      return () => clearTimeout(timer)
    }
    // Return empty cleanup function when not loading to avoid React error #310
    return () => {}
  }, [isLoadingPage])

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    // console.log('⏱️ Setting up safety timeout for loading')
    const safetyTimeout = setTimeout(() => {
      // console.log('🚨 Safety timeout triggered - forcing loading to stop')
      setIsLoadingPage(false)
      setIsLoading(false)
    }, 10000) // 10 second safety timeout

    return () => {
      // console.log('🧹 Cleaning up safety timeout')
      clearTimeout(safetyTimeout)
    }
  }, [])

  // Main initialization effect - only runs once when userId changes
  useEffect(() => {
    // console.log('🔄 Main useEffect triggered, userId:', userId)
    if (userId) {
      // console.log('✅ Starting data load for user:', userId)
      loadInitialData()
    } else {
      // console.log('❌ No userId found, stopping loading state')
      setIsLoadingPage(false)
    }
  }, [userId, loadInitialData])

  // Load cached completed todos - only runs once when userId changes
  useEffect(() => {
    if (!userId) {
      return () => {}
    }

    // Check for daily refresh on page load
    const today = new Date().toISOString().split('T')[0]
    const lastRefresh = localStorage.getItem(`last-todo-refresh-${userId}`)
    const lastUsageRefresh = localStorage.getItem(`last-recommendation-refresh-${userId}`)
    
    // If it's a new day, clear completed todos and refresh usage
    if (lastRefresh && lastRefresh !== today) {
      setCompletedTodos(new Set())
      localStorage.removeItem(`completed-todos-${userId}`)
      localStorage.setItem(`last-todo-refresh-${userId}`, today)
    }
    
    // If it's a new day for usage, refresh message usage
    if (lastUsageRefresh && lastUsageRefresh !== today) {
      loadMessageUsage()
      localStorage.setItem(`last-recommendation-refresh-${userId}`, today)
      // console.log('🌅 New day detected on page load - refreshing usage counters')
    }

    // Load completed todos
    const stored = localStorage.getItem(`completed-todos-${userId}`)
    if (stored) {
      try {
        const completed = JSON.parse(stored)
        setCompletedTodos(new Set(completed))
      } catch (error) {
        console.error('Error loading completed todos:', error)
      }
    }
  }, [userId, loadMessageUsage])

  // Generate todos when data is ready - runs when campaign leads change
  useEffect(() => {
    if (userId && campaignLeads.length > 0) {
      generateTodos()
    }
  }, [userId, campaignLeads, generateTodos])

  // Update refs when state changes
  useEffect(() => {
    campaignCountRef.current = campaigns.length
    campaignLeadCountRef.current = campaignLeads.length
  }, [campaigns.length, campaignLeads.length])

  // Set up daily refresh check - runs once on component mount
  useEffect(() => {
    if (!userId) {
      // Return empty cleanup function to avoid React error #310
      return () => {}
    }

    const checkForNewDay = () => {
      // Don't run if component is unmounted
      if (!mountedRef.current) return

      const today = new Date().toISOString().split('T')[0]
      const lastRefresh = localStorage.getItem(`last-recommendation-refresh-${userId}`)
      
      // If it's a new day and we have data loaded, refresh todos and usage
      if (lastRefresh !== today && campaignCountRef.current > 0 && campaignLeadCountRef.current > 0) {
        // Check again if still mounted before setting state
        if (mountedRef.current) {
          setCompletedTodos(new Set()) // Clear completed todos for new day
          localStorage.removeItem(`completed-todos-${userId}`)
          generateTodos() // Generate fresh todos for new day
          loadMessageUsage() // Refresh usage counter for new day
          localStorage.setItem(`last-recommendation-refresh-${userId}`, today)
          // console.log('🌅 New day detected - refreshing todos and usage counters')
        }
      }
    }

    // Calculate milliseconds until next midnight
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0) // Set to midnight
    const msUntilMidnight = tomorrow.getTime() - now.getTime()

    let hourlyInterval: NodeJS.Timeout | null = null

    // Set initial timeout for midnight, then check every hour after that
    const midnightTimeout = setTimeout(() => {
      if (!mountedRef.current) return
      checkForNewDay()
      
      // After midnight, check every hour in case user keeps app open
      hourlyInterval = setInterval(() => {
        if (!mountedRef.current) {
          if (hourlyInterval) clearInterval(hourlyInterval)
          return
        }
        checkForNewDay()
      }, 60 * 60 * 1000)
    }, msUntilMidnight)

    // Also check immediately on mount in case it's already a new day
    checkForNewDay()
    
    return () => {
      clearTimeout(midnightTimeout)
      if (hourlyInterval) clearInterval(hourlyInterval)
    }
  }, [userId, generateTodos])

  // Track component mount/unmount status
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Load platform connections when component mounts (independent of brand selection)
  useEffect(() => {
    // Only load once when userId is available, not when brand changes
    if (userId) {
      loadPlatformConnections()
    } else {
      setPlatformConnections([])
    }
  }, [userId, loadPlatformConnections])

  // Auto-set responseMethod to first available platform when lead is selected
  useEffect(() => {
    if (selectedCampaignLead?.lead && showSmartResponse) {
      const availablePlatforms = getAvailablePlatforms()
      if (availablePlatforms.length > 0) {
        setResponseMethod(availablePlatforms[0].type as any)
      }
    }
  }, [selectedCampaignLead, showSmartResponse, platformConnections])

  const forceLoadPage = () => {
    // console.log('🔧 Force loading page override triggered')
    setIsLoadingPage(false)
    setIsLoading(false)
    setShowLoadingOverride(false)
  }

  // Show loading state with enhanced progress display
  if (isLoadingPage) {
    return (
      <div className="w-full min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden py-8 animate-in fade-in duration-300">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Main loading icon */}
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-[#FF2A2A] animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              {agencySettings.agency_logo_url && (
                <img 
                  src={agencySettings.agency_logo_url} 
                  alt={`${agencySettings.agency_name} Logo`} 
                  className="w-12 h-12 object-contain rounded" 
                />
              )}
            </div>
          </div>
          
          {/* Loading title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Outreach Tool
          </h1>
          
          {/* Dynamic loading phase */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            Preparing outreach campaigns
          </p>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Building your personalized outreach dashboard...
          </div>
        </div>
        
        {showLoadingOverride && (
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={forceLoadPage}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Force Load Page
            </button>
          </div>
        )}
      </div>
    )
  }

  // Calculate simplified statistics
  const stats = {
    totalLeads: campaignLeads.length,
    pending: campaignLeads.filter(cl => cl.status === 'pending').length,
    contacted: campaignLeads.filter(cl => cl.status === 'contacted').length,
    responded: campaignLeads.filter(cl => cl.status === 'responded').length,
    qualified: campaignLeads.filter(cl => cl.status === 'qualified').length,
    signed: campaignLeads.filter(cl => cl.status === 'signed').length,
    rejected: campaignLeads.filter(cl => cl.status === 'rejected').length,
    conversionRate: campaignLeads.length > 0 ? 
      (campaignLeads.filter(cl => cl.status === 'signed').length / campaignLeads.length * 100).toFixed(1) : '0',
    responseRate: campaignLeads.filter(cl => cl.status === 'contacted').length > 0 ?
      (campaignLeads.filter(cl => cl.status === 'responded').length / 
       campaignLeads.filter(cl => cl.status === 'contacted').length * 100).toFixed(1) : '0'
  }

  // Get unique niches from leads
  const availableNichesInLeads = [...new Set(campaignLeads.map(cl => cl.lead?.niche_name).filter(Boolean))]

  const completeTodo = async (todoId: string) => {
    try {
      // Add to completed todos set
      setCompletedTodos(prev => new Set([...prev, todoId]))
      
      // Store in localStorage for persistence
      const completed = Array.from(completedTodos)
      completed.push(todoId)
      localStorage.setItem(`completed-todos-${userId}`, JSON.stringify(completed))
      
      toast.success('Task marked as completed!')
    } catch (error) {
      console.error('Error completing todo:', error)
      toast.error('Failed to complete task')
    }
  }

  const generateContract = async (lead: Lead) => {
    const currentDate = new Date().toLocaleDateString()
    const startDate = contractData.startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    
    const servicesString = Object.entries(contractData.servicesIncluded)
      .filter(([_, included]) => included)
      .map(([service, _]) => {
        const serviceNames = {
          metaAds: 'Meta (Facebook/Instagram) Advertising Management',
          creativeDesign: 'Creative Design & Ad Copy',
          analytics: 'Analytics & Performance Tracking',
          monthlyReports: 'Monthly Performance Reports'
        }
        return serviceNames[service as keyof typeof serviceNames]
      })
      .join(', ')

    // Generate pricing section based on model
    const pricingSection = contractData.pricingModel === 'revenue_share' ? `
2. COMPENSATION (REVENUE SHARE MODEL)
Revenue Share: ${contractData.revenueSharePercentage || '[Percentage]'}% of attributable revenue generated through advertising campaigns
${contractData.minimumAdSpend ? `Minimum Monthly Ad Spend: $${contractData.minimumAdSpend}` : ''}
Revenue Attribution: Revenue will be tracked through UTM parameters, conversion tracking, and platform analytics
Payment Terms: Revenue share payments due ${contractData.paymentTerms === 'net-30' ? '30 days' : contractData.paymentTerms === 'net-15' ? '15 days' : 'immediately'} after month-end reporting
Reporting: Detailed revenue attribution reports provided monthly

REVENUE SHARE SPECIFIC TERMS:
- Revenue share applies only to sales directly attributable to paid advertising campaigns
- Client must provide full access to analytics platforms and sales data for accurate tracking
- Disputed revenue attributions will be resolved through third-party analytics verification
- Revenue share payments are in addition to actual ad spend, which remains client's responsibility
- Service Provider will optimize campaigns for maximum profitable revenue generation
` : contractData.pricingModel === 'per_lead' ? `
2. COMPENSATION (PERFORMANCE-BASED LEAD GENERATION)
Price Per Lead: $${contractData.pricePerLead || '[Amount]'} per qualified lead
Estimated Monthly Leads: ${contractData.estimatedMonthlyLeads || '[Number]'} qualified leads
${contractData.setupFee ? `Setup Fee: $${contractData.setupFee}` : ''}
Payment Terms: ${contractData.paymentTerms === 'net-30' ? 'Net 30 days' : contractData.paymentTerms === 'net-15' ? 'Net 15 days' : 'Due upon receipt'}

LEAD QUALIFICATION CRITERIA:
${contractData.leadQualifications || '[Define what constitutes a qualified lead]'}

PERFORMANCE-BASED SPECIFIC TERMS:
- Payment is due only for leads that meet the agreed qualification criteria
- Service Provider will implement lead tracking and verification systems
- All leads will be delivered with complete contact information and verification
- Client has 7 days to dispute lead qualification after delivery
- Service Provider optimizes campaigns for lead quality and cost-effectiveness
- Monthly reporting includes lead sources, conversion rates, and cost per lead analysis
- Lead attribution tracked through dedicated landing pages and phone numbers
` : `
2. COMPENSATION (RETAINER MODEL)
Monthly Retainer Fee: $${contractData.monthlyRetainer || '[Amount]'}
Monthly Ad Spend Budget: $${contractData.adSpend || '[Amount]'}
Payment Terms: ${contractData.paymentTerms === 'net-30' ? 'Net 30 days' : contractData.paymentTerms === 'net-15' ? 'Net 15 days' : 'Due upon receipt'}

RETAINER SPECIFIC TERMS:
- Retainer fee covers management, optimization, and reporting services
- Ad spend is separate and billed directly to client's advertising accounts
- Unused ad spend does not roll over to subsequent months
- Service Provider will optimize campaigns within approved budget parameters
`

    const contract = `
DIGITAL MARKETING SERVICES AGREEMENT

This Digital Marketing Services Agreement ("Agreement") is entered into on ${currentDate} ("Effective Date") between:

CLIENT:
Business Name: ${lead.business_name}
Owner/Authorized Representative: ${lead.owner_name || '[Owner Name Required]'}
Email: ${lead.email || '[Email Required]'}
Phone: ${lead.phone || '[Phone Required]'}
Address: ${lead.city ? `${lead.city}, ${lead.state_province || '[State]'}` : '[Address Required]'}

SERVICE PROVIDER:
${agencySettings?.agency_name || '[Agency Name]'}
[Agency Address]
[Agency Phone]
[Agency Email]

TERMS AND CONDITIONS:

1. SERVICES TO BE PROVIDED
The Service Provider agrees to provide the following digital marketing services:
${servicesString}

${pricingSection}

3. TERM AND TERMINATION
Initial Term: ${contractData.contractLength} months
Start Date: ${startDate}
Either party may terminate this agreement with ${contractData.cancellationNotice} days written notice.

4. PERFORMANCE EXPECTATIONS
- Service Provider will manage advertising campaigns to industry best practices
- Monthly performance reports will be provided within 5 business days of month-end
- Client will provide necessary assets and approvals within 48 hours
- Service Provider is not responsible for ad platform policy changes or account suspensions
- All campaign optimizations will be made with client's business objectives in mind

5. DATA AND ANALYTICS ACCESS
- Client agrees to provide full access to necessary analytics platforms
- Service Provider will maintain confidentiality of all client data
- Performance tracking and attribution methods will be established within first 30 days
- Client retains full ownership of all data and analytics accounts

6. CONFIDENTIALITY
Both parties agree to maintain confidentiality of proprietary information shared during the engagement.

7. LIMITATION OF LIABILITY
Service Provider's liability is limited to ${contractData.pricingModel === 'revenue_share' ? 'the average monthly revenue share payment' : contractData.pricingModel === 'per_lead' ? 'the cost of qualified leads delivered in the previous month' : 'the monthly retainer fee'}. No guarantees are made regarding specific performance metrics or ROI.

8. INTELLECTUAL PROPERTY
All creative materials developed remain property of the Client. Service Provider retains rights to campaign strategies and methodologies.

9. GOVERNING LAW
This Agreement shall be governed by the laws of [State/Province].

By signing below, both parties agree to the terms and conditions outlined in this Agreement.

CLIENT SIGNATURE: _________________________ DATE: _____________
${lead.owner_name || '[Owner Name]'}, ${lead.business_name}

SERVICE PROVIDER SIGNATURE: _________________________ DATE: _____________
${agencySettings?.signature_name || '[Representative Name]'}, ${agencySettings?.agency_name || '[Agency Name]'}
${agencySettings?.signature_image ? `
[DIGITAL SIGNATURE APPLIED]
Signature on file: ${agencySettings?.signature_name}
` : ''}

---
This contract was generated on ${currentDate} for ${lead.business_name}
Contract ID: ${lead.id}-${Date.now()}
Pricing Model: ${contractData.pricingModel === 'revenue_share' ? 'Revenue Share' : contractData.pricingModel === 'per_lead' ? 'Performance-Based Lead Generation' : 'Monthly Retainer'}
`

    return contract
  }

  const validateContractData = () => {
    const errors = []
    
    // Validate pricing model specific fields
    if (contractData.pricingModel === 'retainer') {
      if (!contractData.monthlyRetainer || contractData.monthlyRetainer.trim() === '') {
        errors.push('Monthly retainer amount is required')
      }
      if (!contractData.adSpend || contractData.adSpend.trim() === '') {
        errors.push('Ad spend budget is required')
      }
    } else if (contractData.pricingModel === 'revenue_share') {
      if (!contractData.revenueSharePercentage || contractData.revenueSharePercentage.trim() === '') {
        errors.push('Revenue share percentage is required')
      }
    } else if (contractData.pricingModel === 'per_lead') {
      if (!contractData.pricePerLead || contractData.pricePerLead.trim() === '') {
        errors.push('Price per lead is required')
      }
      if (!contractData.estimatedMonthlyLeads || contractData.estimatedMonthlyLeads.trim() === '') {
        errors.push('Estimated monthly leads is required')
      }
      if (!contractData.leadQualifications || contractData.leadQualifications.trim() === '') {
        errors.push('Lead qualification criteria is required')
      }
    }
    
    // Validate at least one service is selected
    const hasSelectedService = Object.values(contractData.servicesIncluded).some(included => included)
    if (!hasSelectedService) {
      errors.push('At least one service must be selected')
    }
    
    // Validate additional required fields
    if (!contractData.startDate || contractData.startDate.trim() === '') {
      errors.push('Start date is required')
    }
    
    if (!contractData.contractLength || contractData.contractLength.trim() === '') {
      errors.push('Contract length is required')
    }
    
    if (!contractData.paymentTerms || contractData.paymentTerms.trim() === '') {
      errors.push('Payment terms are required')
    }
    
    if (!contractData.cancellationNotice || contractData.cancellationNotice.trim() === '') {
      errors.push('Cancellation notice is required')
    }
    
    return errors
  }

  const generateContractForEditing = async (lead: Lead) => {
    try {
      const validationErrors = validateContractData()
      if (validationErrors.length > 0) {
        // Flash required fields
        const fieldsToFlash = []
        if (contractData.pricingModel === 'retainer') {
          if (!contractData.monthlyRetainer || contractData.monthlyRetainer.trim() === '') {
            fieldsToFlash.push('monthlyRetainer')
          }
          if (!contractData.adSpend || contractData.adSpend.trim() === '') {
            fieldsToFlash.push('adSpend')
          }
        } else if (contractData.pricingModel === 'revenue_share') {
          if (!contractData.revenueSharePercentage || contractData.revenueSharePercentage.trim() === '') {
            fieldsToFlash.push('revenueSharePercentage')
          }
        } else if (contractData.pricingModel === 'per_lead') {
          if (!contractData.pricePerLead || contractData.pricePerLead.trim() === '') {
            fieldsToFlash.push('pricePerLead')
          }
          if (!contractData.estimatedMonthlyLeads || contractData.estimatedMonthlyLeads.trim() === '') {
            fieldsToFlash.push('estimatedMonthlyLeads')
          }
          if (!contractData.leadQualifications || contractData.leadQualifications.trim() === '') {
            fieldsToFlash.push('leadQualifications')
          }
        }
        
        const hasSelectedService = Object.values(contractData.servicesIncluded).some(included => included)
        if (!hasSelectedService) {
          fieldsToFlash.push('servicesIncluded')
        }
        
        // Flash additional required fields
        if (!contractData.startDate || contractData.startDate.trim() === '') {
          fieldsToFlash.push('startDate')
        }
        
        if (!contractData.contractLength || contractData.contractLength.trim() === '') {
          fieldsToFlash.push('contractLength')
        }
        
        if (!contractData.paymentTerms || contractData.paymentTerms.trim() === '') {
          fieldsToFlash.push('paymentTerms')
        }
        
        if (!contractData.cancellationNotice || contractData.cancellationNotice.trim() === '') {
          fieldsToFlash.push('cancellationNotice')
        }
        
        setFlashingFields(fieldsToFlash)
        
        // Clear flashing after 2 seconds
        setTimeout(() => {
          setFlashingFields([])
        }, 2000)
        
        toast.error('Please fill in all required fields')
        return
      }
      
      const contractText = await generateContract(lead)
      setGeneratedContractText(contractText)
      setEditableContractText(contractText)
      setContractEditingMode(true)
      setContractPreviewMode(false)
      toast.success('Contract generated! You can now edit it before downloading.')
    } catch (error) {
      console.error('Error generating contract:', error)
      toast.error('Failed to generate contract')
    }
  }

  const generateContractHTML = (lead: Lead, contractText: string) => {
    const currentDate = new Date().toLocaleDateString()
    
    // Enhanced professional HTML format with DocuSign compatibility
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digital Marketing Services Agreement - ${lead.business_name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            line-height: 1.6;
            color: #333;
            background: #ffffff;
            padding: 40px 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .document-header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 8px;
            border: 2px solid #333;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .document-title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .document-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 15px;
        }
        
        .contract-date {
            font-size: 14px;
            color: #333;
            font-weight: bold;
            background: #fff;
            padding: 8px 16px;
            border-radius: 4px;
            display: inline-block;
            border: 1px solid #ddd;
        }
        
        .parties-section {
            display: flex;
            justify-content: space-between;
            margin: 40px 0;
            gap: 40px;
        }
        
        .party-block {
            flex: 1;
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            border-left: 4px solid #333;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .party-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .party-info {
            font-size: 14px;
            line-height: 1.8;
        }
        
        .party-info div {
            margin-bottom: 8px;
        }
        
        .party-info strong {
            color: #333;
            font-weight: 600;
        }
        
        .contract-content {
            background: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            border: 1px solid #e9ecef;
            margin: 30px 0;
        }
        
        .contract-text {
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.7;
            color: #333;
        }
        
        .section-break {
            margin: 25px 0;
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 25px;
        }
        
        .signature-section {
            margin-top: 50px;
            padding: 30px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 2px solid #333;
        }
        
        .signature-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 30px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .signature-blocks {
            display: flex;
            justify-content: space-between;
            gap: 40px;
        }
        
        .signature-block {
            flex: 1;
            background: #ffffff;
            padding: 25px;
            border-radius: 8px;
            border: 1px solid #ddd;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .signature-label {
            font-size: 16px;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
            text-transform: uppercase;
        }
        
        .signature-line {
            border-bottom: 2px solid #333;
            height: 50px;
            margin: 20px 0;
            position: relative;
        }
        
        .signature-image {
            max-height: 60px;
            max-width: 200px;
            border: 1px solid #ddd;
            padding: 5px;
            background: #fff;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .signature-info {
            font-size: 12px;
            color: #666;
            margin-top: 10px;
        }
        
        .date-line {
            font-size: 14px;
            color: #333;
            margin: 15px 0;
        }
        
        .name-line {
            font-size: 14px;
            color: #333;
            font-weight: 600;
        }
        
        .document-footer {
            margin-top: 40px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            text-align: center;
        }
        
        .footer-content {
            font-size: 12px;
            color: #666;
            line-height: 1.8;
        }
        
        .footer-content div {
            margin-bottom: 5px;
        }
        
        .contract-id {
            font-weight: bold;
            color: #333;
        }
        
        .docusign-marker {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0,0,0,0);
        }
        
        @media print {
            body {
                padding: 20px;
                font-size: 12px;
            }
            
            .document-header {
                box-shadow: none;
                border: 2px solid #000;
            }
            
            .signature-section {
                border: 2px solid #000;
                box-shadow: none;
            }
            
            .party-block,
            .contract-content,
            .signature-block {
                box-shadow: none;
                border: 1px solid #000;
            }
        }
        
        @page {
            margin: 1in;
        }
    </style>
</head>
<body>
    <div class="document-header">
        <div class="document-title">Digital Marketing Services Agreement</div>
        <div class="document-subtitle">Professional Services Contract</div>
        <div class="contract-date">Contract Date: ${currentDate}</div>
    </div>
    
    <div class="parties-section">
        <div class="party-block">
            <div class="party-title">Client</div>
            <div class="party-info">
            <div><strong>Business Name:</strong> ${lead.business_name}</div>
            <div><strong>Representative:</strong> ${lead.owner_name || '[Name Required]'}</div>
            <div><strong>Email:</strong> ${lead.email || '[Email Required]'}</div>
            <div><strong>Phone:</strong> ${lead.phone || '[Phone Required]'}</div>
            <div><strong>Address:</strong> ${lead.city ? `${lead.city}, ${lead.state_province || '[State]'}` : '[Address Required]'}</div>
            </div>
        </div>
        
        <div class="party-block">
            <div class="party-title">Service Provider</div>
            <div class="party-info">
            <div><strong>Agency:</strong> ${agencySettings?.agency_name || '[Agency Name]'}</div>
            <div><strong>Representative:</strong> ${agencySettings?.signature_name || '[Representative Name]'}</div>
                <div><strong>Email:</strong> [Agency Email]</div>
            <div><strong>Phone:</strong> [Agency Phone]</div>
            <div><strong>Address:</strong> [Agency Address]</div>
            </div>
        </div>
    </div>
    
    <div class="contract-content">
        <div class="contract-text">${contractText.replace(/DIGITAL MARKETING SERVICES AGREEMENT[\s\S]*?TERMS AND CONDITIONS:/, 'TERMS AND CONDITIONS:').replace(/---[\s\S]*$/, '')}</div>
    </div>
    
    <div class="signature-section">
        <div class="signature-title">Signatures</div>
        <div class="signature-blocks">
            <div class="signature-block">
                <div class="signature-label">Client Signature</div>
            <div class="signature-line"></div>
                <div class="date-line">Date: _____________</div>
                <div class="name-line">${lead.owner_name || '[Owner Name]'}</div>
                <div class="name-line">${lead.business_name}</div>
        </div>
        
            <div class="signature-block">
                <div class="signature-label">Service Provider Signature</div>
            ${agencySettings?.signature_image ? `
                    <div style="margin: 20px 0;">
                        <img src="${agencySettings.signature_image}" alt="Digital Signature" class="signature-image" />
                </div>
                    <div class="date-line">Date: ${currentDate}</div>
            ` : `
                <div class="signature-line"></div>
                    <div class="date-line">Date: _____________</div>
            `}
                <div class="name-line">${agencySettings?.signature_name || '[Representative Name]'}</div>
                <div class="name-line">${agencySettings?.agency_name || '[Agency Name]'}</div>
            </div>
        </div>
    </div>
    
    <div class="document-footer">
        <div class="footer-content">
            <div class="contract-id">Contract ID: ${lead.id}-${Date.now()}</div>
        <div>Generated: ${new Date().toLocaleString()}</div>
        <div>Pricing Model: ${contractData.pricingModel === 'revenue_share' ? 'Revenue Share' : 'Monthly Retainer'}</div>
            <div>Document Type: Digital Marketing Services Agreement</div>
    </div>
    </div>
    
    <!-- DocuSign compatibility markers -->
    <div class="docusign-marker" id="client-signature-anchor">CLIENT_SIGNATURE_HERE</div>
    <div class="docusign-marker" id="provider-signature-anchor">PROVIDER_SIGNATURE_HERE</div>
    <div class="docusign-marker" id="date-anchor">DATE_HERE</div>
</body>
</html>`
    
    return htmlContent
  }

  const downloadContract = async (lead: Lead) => {
    try {
      const contractText = contractEditingMode ? editableContractText : await generateContract(lead)
      const htmlContent = generateContractHTML(lead, contractText)
      
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${lead.business_name?.replace(/[^a-zA-Z0-9]/g, '_')}_Marketing_Contract.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Professional contract downloaded! Open in browser to print or save as PDF.')
    } catch (error) {
      console.error('Error generating contract:', error)
      toast.error('Failed to generate contract')
    }
  }

  const previewContract = (lead: Lead) => {
    const htmlContent = generateContractHTML(lead, editableContractText)
    setContractHtmlContent(htmlContent)
    setContractPreviewMode(true)
  }

  const resetContractEditor = () => {
    setContractEditingMode(false)
    setContractPreviewMode(false)
    setGeneratedContractText('')
    setEditableContractText('')
    setContractHtmlContent('')
  }

  const copyContractToClipboard = async (lead: Lead) => {
    try {
      const contractText = contractEditingMode ? editableContractText : await generateContract(lead)
      await navigator.clipboard.writeText(contractText)
      toast.success('Contract copied to clipboard!')
    } catch (error) {
      console.error('Error copying contract:', error)
      toast.error('Failed to copy contract')
    }
  }



  const generateSmartResponse = async (leadResponse: string, method: string, leadInfo: Lead) => {
    setIsGeneratingSmartResponse(true)
    setGeneratedSmartResponse('')
    
    try {
      const response = await fetch('/api/ai/smart-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadResponse: leadResponse.trim(),
          platform: method,
          leadInfo: {
            business_name: leadInfo.business_name,
            owner_name: leadInfo.owner_name,
            niche_name: leadInfo.niche_name
          },
          userId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate smart response')
      }

      const data = await response.json()
      setGeneratedSmartResponse(data.smartResponse)
      setSmartResponsesRemaining(data.remaining)
      
      // Refresh usage after generating a smart response to update daily counts
      loadMessageUsage()
      
      toast.success('✨ Smart response generated successfully!')
      
    } catch (error) {
      console.error('Error generating smart response:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to generate smart response')
      }
    } finally {
      setIsGeneratingSmartResponse(false)
    }
  }

  const generatePersonalizedMessage = async (lead: Lead, method: string, retryCount = 0, isFollowUp = false) => {
    setIsGeneratingMessage(true)
    setGeneratedMessage('') // Clear previous message
    setMessageSubject('') // Clear previous subject
    setJustCopied(false) // Reset copy state
    
    try {
      // 🔥 FIX: Fetch previous messages for follow-up context
      let previousMessages = ''
      if (isFollowUp && selectedCampaignLead?.campaign_id) {
        try {
          const supabase = await getSupabaseClient()
          const { data: messages, error: messagesError } = await supabase
            .from('outreach_messages')
            .select('message_type, subject, content, sent_at')
            .eq('campaign_id', selectedCampaignLead.campaign_id)
            .order('sent_at', { ascending: false })
            .limit(3) // Get last 3 messages
          
          if (!messagesError && messages && messages.length > 0) {
            previousMessages = messages.map((msg, index) => 
              `Previous ${msg.message_type} (${new Date(msg.sent_at).toLocaleDateString()}):
              ${msg.subject ? `Subject: ${msg.subject}` : ''}
              ${msg.content}
              ---`
            ).join('\n\n')
            
            // console.log('📨 Retrieved previous messages for follow-up context:', messages.length)
          } else {
            // console.log('📭 No previous messages found for this campaign')
          }
        } catch (error) {
          console.error('Error fetching previous messages:', error)
          // Continue without previous messages
        }
      }
      // Enhanced AI context with correct API format
      const aiContext = {
        lead: {
          id: lead.id,
          business_name: lead.business_name,
          owner_name: lead.owner_name,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
          city: lead.city,
          state_province: lead.state_province,
          niche_name: lead.niche_name,
          business_type: lead.business_type,
          instagram_handle: lead.instagram_handle,
          facebook_page: lead.facebook_page,
          linkedin_profile: lead.linkedin_profile,
          twitter_handle: lead.twitter_handle,
          lead_score: lead.lead_score,
          industry: lead.niche_name,
          location: `${lead.city || ''}, ${lead.state_province || ''}`.replace('undefined', '').replace(/^, |, $/, ''),
          hasWebsite: !!lead.website,
          socialPresence: {
            instagram: !!lead.instagram_handle,
            facebook: !!lead.facebook_page,
            linkedin: !!lead.linkedin_profile,
            twitter: !!lead.twitter_handle
          }
        },
        messageType: method, // Fixed: API expects messageType, not outreachMethod
        brandInfo: {
          name: agencySettings?.agency_name || 'Your Agency',
          industry: 'Digital Marketing',
          value_prop: 'We help businesses scale their online presence and generate more leads through targeted marketing strategies'
        },
        campaign_context: {
          total_leads: campaignLeads.length,
          response_rate: stats.responseRate,
          conversion_rate: stats.conversionRate,
          recent_success: campaignLeads.filter(cl => cl.status === 'signed').length
        },
        ai_instructions: {
          tone: method === 'phone' ? 'conversational and professional' : 'friendly but business-focused',
          personalization_level: 'high',
          call_to_action: method === 'email' ? 'schedule a brief call' : method === 'phone' ? 'book a strategy session' : 'connect for collaboration opportunities',
          urgency: lead.lead_score && lead.lead_score > 70 ? 'medium' : 'low',
          message_type: isFollowUp ? 'follow_up' : 'initial_outreach',
          agency_name: agencySettings?.agency_name || 'Your Agency',
          context: isFollowUp ? `This is a follow-up message for a lead that was previously contacted but has not responded. Use a friendly "Hi [Name], I'm reaching out again..." approach to acknowledge this is a follow-up. 
            
            Previous outreach details:
            - Last contacted: ${selectedCampaignLead?.last_contacted_at ? new Date(selectedCampaignLead.last_contacted_at).toLocaleDateString() : 'Unknown'}
            - Previous method: ${selectedCampaignLead?.outreach_method || 'Unknown'}
            - Days since contact: ${selectedCampaignLead?.last_contacted_at ? Math.floor((new Date().getTime() - new Date(selectedCampaignLead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)) : 'Unknown'}
            
            ${previousMessages ? `PREVIOUS MESSAGES SENT:
            ${previousMessages}
            
            ` : ''}Focus on re-engaging without being pushy. Reference the previous outreach and provide additional value or a different angle. Do NOT repeat the same messaging - be creative with a fresh approach.` 
            : 'This is an initial outreach message to a new lead.'
        }
      }

      const response = await fetch('/api/outreach/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiContext),
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Handle rate limiting errors with specific messages
        if (response.status === 429) {
          const { reason, message, resetTime } = data
          let errorMessage = message
          
          if (reason === 'HOURLY_LIMIT') {
            errorMessage = `⏰ Rate limit: You can generate up to 15 messages per hour. Try again in ${Math.ceil((new Date(resetTime).getTime() - Date.now()) / (1000 * 60))} minutes.`
          } else if (reason === 'DAILY_LIMIT') {
            errorMessage = `📅 Daily limit reached: You can generate up to 25 messages per day. Limit resets at midnight.`
          } else if (reason === 'METHOD_LIMIT') {
            errorMessage = `🚫 You've already generated a ${method.charAt(0).toUpperCase() + method.slice(1)} message for "${lead.business_name}" today. Try a different outreach method (Email, LinkedIn, Instagram, etc.) or wait until tomorrow.`
          } else if (reason === 'COOLDOWN') {
            errorMessage = `⏱️ Please wait a few seconds between message generations to prevent spam.`
          } else {
            // Generic 429 - try retry with exponential backoff
            if (retryCount < 2) {
              const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000 // 1-2s, 2-3s, 4-5s
              toast.loading(`Rate limited. Retrying in ${Math.ceil(delay/1000)} seconds...`)
              setTimeout(() => {
                generatePersonalizedMessage(lead, method, retryCount + 1, isFollowUp)
              }, delay)
              return
            } else {
              errorMessage = `⚠️ Server is busy. Please wait a moment and try again.`
            }
          }
          
          // console.log(`🚨 Rate limit error for lead ${lead.business_name}:`, reason, 'Lead ID:', lead.id)
          toast.error(errorMessage)
          return
        }
        
        throw new Error(data.error || 'Failed to generate AI message')
      }

      setGeneratedMessage(data.message)
      setMessageSubject(data.subject || '')
      setMessageType(method as any)
      
      // Track message generation locally to help with rate limiting UI
      if (lead.business_name) {
        const today = new Date().toDateString()
        const methodKey = `method_used_${lead.business_name}_${method}_${today}`
        localStorage.setItem(methodKey, 'true')
        
        // Also track total count for backwards compatibility
        const currentCount = parseInt(localStorage.getItem(`msg_count_${lead.business_name}_${today}`) || '0')
        localStorage.setItem(`msg_count_${lead.business_name}_${today}`, (currentCount + 1).toString())
        
        // Force re-render of method switcher to update "used" state immediately
        setMethodUsageTimestamp(Date.now())
      }
      
      if (data.ai_generated) {
        toast.success('✨ Personalized message generated successfully!')
        
        // Refresh usage after generating a message
        loadMessageUsage()
        
        // Show usage info if available
        if (data.usage?.messagesRemaining) {
          const { hourly, daily } = data.usage.messagesRemaining
          // console.log(`📊 Messages remaining: ${hourly}/hour, ${daily}/day`)
        }
      } else {
        toast.success('Message generated (template used)')
      }
    } catch (error) {
      console.error('Error generating message:', error)
      
      // Retry on network errors
      if (retryCount < 2 && (error instanceof TypeError || (error as Error)?.message?.includes('fetch'))) {
        const delay = Math.pow(2, retryCount) * 1000
        toast.loading(`Connection error. Retrying in ${Math.ceil(delay/1000)} seconds...`)
        setTimeout(() => {
          generatePersonalizedMessage(lead, method, retryCount + 1, isFollowUp)
        }, delay)
        return
      }
      
      toast.error('Failed to generate message. Please try again.')
    } finally {
      setIsGeneratingMessage(false)
    }
  }

  // Get available status options based on current status (chronological progression)
  const getAvailableStatuses = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return ['pending', 'contacted']
      case 'contacted':
        return ['contacted', 'responded', 'rejected']
      case 'responded':
        return ['responded', 'qualified', 'rejected']
      case 'qualified':
        return ['qualified', 'signed', 'rejected']
      case 'signed':
        return ['signed'] // Can't change from signed
      case 'rejected':
        return ['rejected'] // Can't change from rejected (but this shouldn't show anyway)
      default:
        return ['pending', 'contacted', 'responded', 'qualified', 'signed', 'rejected']
    }
  }

  const snoozeLead = async (campaignLeadId: string, days: number) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Calculate the snooze date
      const snoozeDate = new Date()
      snoozeDate.setDate(snoozeDate.getDate() + days)
      
      const { error } = await supabase
        .from('outreach_campaign_leads')
        .update({ 
          next_follow_up_date: snoozeDate.toISOString()
        })
        .eq('id', campaignLeadId)

      if (error) throw error
      
      // Update local state
      setCampaignLeads(prev => prev.map(cl => 
        cl.id === campaignLeadId 
          ? { ...cl, next_follow_up_date: snoozeDate.toISOString() }
          : cl
      ))
      
      toast.success(`Lead snoozed for ${days} days! Will reappear in follow-up queue on ${snoozeDate.toLocaleDateString()}`)
      
      // If in bulk mode, move to next lead or finish queue
      if (contactedFollowUpQueue.length > 0) {
        const remainingLeads = contactedFollowUpQueue.filter(cl => cl.id !== campaignLeadId)
        setContactedFollowUpQueue(remainingLeads)
        
        if (remainingLeads.length > 0) {
          // If there are more leads, stay at same index (which becomes the next lead)
          const newIndex = Math.min(currentFollowUpIndex, remainingLeads.length - 1)
          setCurrentFollowUpIndex(newIndex)
          setSelectedCampaignLead(remainingLeads[newIndex])
        } else {
          // No more leads in queue
          setShowOutreachOptions(false)
          setContactedFollowUpQueue([])
          setCurrentFollowUpIndex(0)
          setIsFollowUpMode(false)
          toast.success('All follow-ups processed!')
        }
      }
    } catch (error) {
      console.error('Error snoozing lead:', error)
      toast.error('Failed to snooze lead. Please try again.')
    }
  }

  // Function to save outreach message to database
  const saveOutreachMessage = async (campaignId: string, messageType: string, subject: string, content: string, campaignLeadId?: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('outreach_messages')
        .insert({
          user_id: userId, // Required field
          campaign_id: campaignId,
          message_type: messageType,
          subject: subject || null,
          content: content,
          status: 'sent',
          sent_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('Error saving outreach message:', error)
        // Don't throw - just log, as this shouldn't block the workflow
      } else {
        // console.log('✅ Outreach message saved to database')
        
        // Auto-mark lead as contacted when message is saved
        if (campaignLeadId) {
          await updateCampaignLeadStatus(campaignLeadId, 'contacted', messageType)
        }
      }
    } catch (error) {
      console.error('Error saving outreach message:', error)
      // Don't throw - just log, as this shouldn't block the workflow
    }
  }

  const updateCampaignLeadStatus = async (campaignLeadId: string, newStatus: string, outreachMethod?: string) => {
    // Show confirmation dialog for rejected status
    if (newStatus === 'rejected') {
      const confirmed = window.confirm(
        'Marking this lead as "Rejected" will remove it from your outreach pipeline permanently. Are you sure you want to continue?'
      )
      if (!confirmed) {
        return // Cancel the status update
      }
    }

    try {
      // console.log('🔄 Updating campaign lead status:', { campaignLeadId, newStatus, outreachMethod })
      const supabase = await getSupabaseClient()
      
      if (newStatus === 'rejected') {
        // Delete the lead from outreach when marked as rejected
        const { error } = await supabase
          .from('outreach_campaign_leads')
          .delete()
          .eq('id', campaignLeadId)

        if (error) {
          console.error('❌ Delete error:', error)
          throw error
        }
        
        setCampaignLeads(prev => prev.filter(cl => cl.id !== campaignLeadId))
        toast.success('Lead marked as rejected and removed from outreach!')
      } else {
        // Regular status update
        const updateData: any = { 
          status: newStatus,
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Store outreach method if provided and status is contacted
        if (outreachMethod && newStatus === 'contacted') {
          updateData.outreach_method = outreachMethod
        }
        
        // console.log('📤 Sending update data:', updateData)
        
        const { data, error } = await supabase
          .from('outreach_campaign_leads')
          .update(updateData)
          .eq('id', campaignLeadId)
          .select()

        if (error) {
          console.error('❌ Update error details:')
          console.error('  Message:', error.message)
          console.error('  Details:', error.details)
          console.error('  Hint:', error.hint)
          console.error('  Code:', error.code)
          console.error('  Full error:', JSON.stringify(error, null, 2))
          throw error
        }
        
        // console.log('✅ Update successful:', data)
      
        // Update state locally instead of reloading to prevent page jump
        setCampaignLeads(prev => prev.map(cl => 
          cl.id === campaignLeadId 
            ? { 
                ...cl, 
                status: newStatus as any, 
                last_contacted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...(outreachMethod && newStatus === 'contacted' ? { outreach_method: outreachMethod as any } : {})
              }
            : cl
        ))
      toast.success('Status updated successfully!')
      }
    } catch (error) {
      console.error('❌ Error updating status:', error)
      toast.error('Failed to update status: ' + (error as any)?.message || 'Unknown error')
    }
  }

  const deleteCampaignLead = async (campaignLeadId: string) => {
    if (!confirm('Are you sure you want to remove this lead from outreach?')) {
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('outreach_campaign_leads')
        .delete()
        .eq('id', campaignLeadId)

      if (error) throw error
      
      setCampaignLeads(prev => prev.filter(cl => cl.id !== campaignLeadId))
      toast.success('Lead removed from outreach!')
    } catch (error) {
      console.error('Error deleting campaign lead:', error)
      toast.error('Failed to remove lead')
    }
  }

  const deleteBulkCampaignLeads = async () => {
    if (selectedLeads.length === 0) return
    
    if (!confirm(`Are you sure you want to remove ${selectedLeads.length} leads from outreach?`)) {
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('outreach_campaign_leads')
        .delete()
        .in('id', selectedLeads)

      if (error) throw error
      
      setCampaignLeads(prev => prev.filter(cl => !selectedLeads.includes(cl.id)))
      setSelectedLeads([])
      setIsSelectAll(false)
      toast.success(`${selectedLeads.length} leads removed from outreach!`)
    } catch (error) {
      console.error('Error deleting campaign leads:', error)
      toast.error('Failed to remove leads')
    }
  }

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId])
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId))
      setIsSelectAll(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(cl => cl.id))
      setIsSelectAll(true)
    } else {
      setSelectedLeads([])
      setIsSelectAll(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <CircleDot className="h-4 w-4" />
      case 'contacted': return <MessageCircle className="h-4 w-4" />
      case 'responded': return <MessageSquare className="h-4 w-4" />
      case 'qualified': return <Star className="h-4 w-4" />
      case 'signed': return <CheckCircle2 className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <CircleDot className="h-4 w-4" />
    }
  }

  const getOutreachMethods = (lead: Lead) => {
    const methods = []
    if (lead.email) methods.push({ type: 'email', icon: Mail, label: 'Email' })
    if (lead.phone) methods.push({ type: 'phone', icon: Phone, label: 'Call' })
    if (lead.linkedin_profile) methods.push({ type: 'linkedin', icon: Linkedin, label: 'LinkedIn' })
    if (lead.instagram_handle) methods.push({ type: 'instagram', icon: Instagram, label: 'Instagram' })
    if (lead.facebook_page) methods.push({ type: 'facebook', icon: Facebook, label: 'Facebook' })
    if (lead.twitter_handle) methods.push({ type: 'twitter', icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ), label: 'X/Twitter' })
    return methods
  }

  const getSocialMediaLink = (platform: string, handle: string) => {
    if (!handle) return undefined
    
    switch (platform) {
      case 'instagram':
        return `https://instagram.com/${handle.replace('@', '')}`
      case 'facebook':
        return handle.startsWith('http') ? handle : `https://facebook.com/${handle}`
      case 'linkedin':
        return handle.startsWith('http') ? handle : `https://linkedin.com/in/${handle}`
      case 'twitter':
        return `https://twitter.com/${handle.replace('@', '')}`
      default:
        return undefined
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

  const getOutreachMethodIcon = (method: string, size: string = "h-3 w-3") => {
    switch (method) {
      case 'email':
        return <Mail className={`${size} text-gray-400`} />
      case 'phone':
        return <Phone className={`${size} text-gray-400`} />
      case 'linkedin':
        return <Linkedin className={`${size} text-gray-400`} />
      case 'instagram':
        return <Instagram className={`${size} text-gray-400`} />
      case 'facebook':
        return <Facebook className={`${size} text-gray-400`} />
      case 'twitter':
      case 'x':
        return (
          <svg className={`${size} text-gray-300`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        )
      default:
        return <MessageCircle className={`${size} text-gray-400`} />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const contactTime = new Date(timestamp)
    const diffMs = now.getTime() - contactTime.getTime()
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays >= 1) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours >= 1) {
      return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`
    } else if (diffMinutes >= 1) {
      return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  const copyToClipboard = async (text: string, type: string, fieldId?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`✓ ${type} copied to clipboard!`, {
        style: {
          background: '#1a2f1a',
          color: '#4ade80',
          border: '1px solid #22c55e',
        },
        duration: 2000,
      })
      
      // Add visual feedback
      if (fieldId) {
        setCopiedField(fieldId)
        setTimeout(() => setCopiedField(null), 2000) // Clear after 2 seconds
      }
    } catch (err) {
      toast.error(`Failed to copy ${type}`)
    }
  }

  const applyFilters = (leads: CampaignLead[]) => {
    let filtered = leads.filter(cl => {
      // Status filter
      if (filters.statusFilter !== 'all' && cl.status !== filters.statusFilter) return false
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        if (
          !(cl.lead?.business_name?.toLowerCase().includes(query) ||
            cl.lead?.owner_name?.toLowerCase().includes(query))
        ) return false
      }
      
      // Score filter
      if (filters.minScore > 0 && cl.lead) {
        const score = calculateLeadScore(cl.lead).total
        if (score < filters.minScore) return false
      }
      
      // Contact filters
      if (filters.hasPhone && !cl.lead?.phone) return false
      if (filters.hasEmail && !cl.lead?.email) return false
      if (filters.hasWebsite && !cl.lead?.website) return false
      
      // Social filters
      const hasSpecificSocialFilters = filters.socialPlatforms.instagram || 
                                       filters.socialPlatforms.facebook || 
                                       filters.socialPlatforms.linkedin || 
                                       filters.socialPlatforms.twitter;
      
      if (hasSpecificSocialFilters) {
        // If specific social platforms are selected, filter by those
        const hasInstagram = filters.socialPlatforms.instagram && cl.lead?.instagram_handle;
        const hasFacebook = filters.socialPlatforms.facebook && cl.lead?.facebook_page;
        const hasLinkedin = filters.socialPlatforms.linkedin && cl.lead?.linkedin_profile;
        const hasTwitter = filters.socialPlatforms.twitter && cl.lead?.twitter_handle;
        
        if (!(hasInstagram || hasFacebook || hasLinkedin || hasTwitter)) return false;
      } else if (filters.hasSocials) {
        // If only general "has socials" is checked, filter for any social media
        const hasSocial = cl.lead?.instagram_handle || cl.lead?.facebook_page || 
                         cl.lead?.linkedin_profile || cl.lead?.twitter_handle;
        if (!hasSocial) return false;
      }
      
      // Niche filter
      if (filters.selectedNicheFilter.length > 0 && cl.lead?.niche_name) {
        if (!filters.selectedNicheFilter.includes(cl.lead.niche_name)) return false
      }

      // Last contacted filter
      if (filters.lastContactedFilter !== 'all') {
        const lastContacted = cl.last_contacted_at;
        
        if (filters.lastContactedFilter === 'never') {
          if (lastContacted) return false;
        } else if (filters.lastContactedFilter === 'today') {
          if (!lastContacted) return false;
          const contactDate = new Date(lastContacted);
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          if (contactDate < todayStart) return false;
        } else if (filters.lastContactedFilter === 'yesterday') {
          if (!lastContacted) return false;
          const contactDate = new Date(lastContacted);
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
          const yesterdayEnd = new Date(yesterdayStart.getTime() + 24 * 60 * 60 * 1000);
          if (contactDate < yesterdayStart || contactDate >= yesterdayEnd) return false;
        } else if (filters.lastContactedFilter === 'week') {
          if (!lastContacted) return false;
          const contactDate = new Date(lastContacted);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (contactDate < weekAgo) return false;
        } else if (filters.lastContactedFilter === 'month') {
          if (!lastContacted) return false;
          const contactDate = new Date(lastContacted);
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (contactDate < monthAgo) return false;
        }
      }
      
      return true
    })

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        if (sortConfig.key === 'status') {
          const statusOrder = { 'pending': 1, 'contacted': 2, 'responded': 3, 'qualified': 4, 'signed': 5, 'rejected': 0 }
          const statusA = statusOrder[a.status as keyof typeof statusOrder] || 0
          const statusB = statusOrder[b.status as keyof typeof statusOrder] || 0
          return sortConfig.direction === 'desc' ? statusB - statusA : statusA - statusB
        } else if (sortConfig.key === 'score') {
                  const scoreA = a.lead ? calculateLeadScore(a.lead).total : 0
        const scoreB = b.lead ? calculateLeadScore(b.lead).total : 0
          return sortConfig.direction === 'desc' ? scoreB - scoreA : scoreA - scoreB
        }
        return 0
      })
    }

    return filtered
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc'
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    
    setSortConfig({ key, direction })
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

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'urgent': return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'opportunity': return <Target className="h-4 w-4 text-blue-400" />
      case 'insight': return <Info className="h-4 w-4 text-yellow-400" />
      case 'optimization': return <TrendingUp className="h-4 w-4 text-green-400" />
      default: return <CircleDot className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-500/10'
      case 'medium': return 'border-yellow-500 bg-yellow-500/10'
      case 'low': return 'border-green-500 bg-green-500/10'
              default: return 'border-[#2A2A2A] bg-[#1A1A1A]'
    }
  }

  // Action recommendations would be implemented here

  const recalculateAllScores = async () => {
    setIsRecalculatingScores(true)
    try {
      const supabase = await getSupabaseClient()
      const updates = []
      
      for (const campaignLead of campaignLeads) {
        if (campaignLead.lead) {
          const scoreData = calculateLeadScore(campaignLead.lead)
          updates.push({
            id: campaignLead.lead.id,
            lead_score: scoreData.total
          })
        }
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
      
      // Reload data to show updated scores
      await loadCampaignLeads()
      toast.success(`Updated ${updates.length} lead scores!`)
    } catch (error) {
      console.error('Error recalculating scores:', error)
      toast.error('Failed to update lead scores')
    } finally {
      setIsRecalculatingScores(false)
    }
  }

  // Functions to handle temporary filters
  const openFiltersPanel = () => {
    setTempFilters(filters) // Initialize temp filters with current filters
    setShowFilters(true)
  }

  const applyTempFilters = () => {
    setFilters({...tempFilters}) // Apply temporary filters to actual filters
    setShowFilters(false) // Close filter panel
  }

  const cancelFilters = () => {
    setTempFilters({...filters}) // Reset temp filters to current filters
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
      statusFilter: 'all',
      minScore: 0,
      hasOwnerName: false,
      businessTypeFilter: [],
      locationFilter: { city: '', state: '' },
      outreachMethodFilter: [],
      lastContactedFilter: 'all',
      scoreRange: { min: 0, max: 100 }
    }
    setTempFilters(clearedFilters)
  }

  // Get available platforms based on brand connections
  const getAvailablePlatforms = () => {
    if (!selectedCampaignLead?.lead) return []

    const lead = selectedCampaignLead.lead
    const availablePlatforms = []

    // Debug: Log lead data to see what's available
    // console.log('🔍 Lead data for platform detection:', {
    //   business_name: lead.business_name,
    //   email: lead.email,
    //   phone: lead.phone,
    //   website: lead.website,
    //   instagram_handle: lead.instagram_handle,
    //   facebook_page: lead.facebook_page,
    //   linkedin_profile: lead.linkedin_profile,
    //   twitter_handle: lead.twitter_handle,
    //   platformConnections: platformConnections
    // })

    // Check each platform based on what the lead actually has
    if (lead.email) {
      // console.log('✅ Adding Email platform')
      availablePlatforms.push({
        type: 'email',
        icon: Mail,
        label: 'Email Response',
        description: 'Professional email follow-up'
      })
    }

    if (lead.phone) {
      // console.log('✅ Adding Phone platform')
      availablePlatforms.push({
        type: 'phone',
        icon: Phone,
        label: 'Phone Call',
        description: 'Direct phone conversation'
      })
    }

    // Instagram - show if they have a handle (manual outreach possible)
    if (lead.instagram_handle) {
      // console.log('✅ Adding Instagram platform')
      availablePlatforms.push({
        type: 'instagram',
        icon: Instagram,
        label: 'Instagram DM',
        description: 'Social media engagement'
      })
    }

    // Facebook - show if they have a page (manual outreach possible)
    if (lead.facebook_page) {
      // console.log('✅ Adding Facebook platform')
      availablePlatforms.push({
        type: 'facebook',
        icon: Facebook,
        label: 'Facebook Message',
        description: 'Social connection response'
      })
    }

    // LinkedIn - show if they have a profile
    if (lead.linkedin_profile) {
      // console.log('✅ Adding LinkedIn platform')
      availablePlatforms.push({
        type: 'linkedin',
        icon: Linkedin,
        label: 'LinkedIn Message',
        description: 'Professional networking'
      })
    }

    // Twitter/X - show if they have a handle
    if (lead.twitter_handle) {
      // console.log('✅ Adding Twitter platform')
      availablePlatforms.push({
        type: 'twitter',
        icon: Twitter,
        label: 'Twitter/X DM',
        description: 'Social media outreach'
      })
    }



    // Fallback: If no platforms detected, show email and manual outreach options
    if (availablePlatforms.length === 0) {
      // console.log('⚠️ No platforms detected, adding fallbacks')
      
      // Always offer email as fallback
      availablePlatforms.push({
        type: 'email',
        icon: Mail,
        label: 'Email Outreach',
        description: 'General email outreach'
      })
      
      // Add phone if it might exist
      availablePlatforms.push({
        type: 'phone',
        icon: Phone,
        label: 'Phone Outreach',
        description: 'Cold calling approach'
      })
      
      // Add social media research option
      availablePlatforms.push({
        type: 'linkedin',
        icon: Linkedin,
        label: 'LinkedIn Search',
        description: 'Find them on LinkedIn'
      })
    }

    // console.log('🎯 Final available platforms:', availablePlatforms.map(p => p.type))
    return availablePlatforms
  }

  // Create optimized grid layout for odd numbers - puts odd platform in center
  const createPlatformGrid = (platforms: any[]) => {
    if (platforms.length === 0) return platforms

    // If odd number of platforms, arrange to put one in the middle
    if (platforms.length % 2 === 1) {
      // For odd numbers, arrange as: 
      // First half | Center item | Second half
      const centerIndex = Math.floor(platforms.length / 2)
      const reorderedPlatforms = [
        ...platforms.slice(0, centerIndex),
        platforms[centerIndex], // Center item
        ...platforms.slice(centerIndex + 1)
      ]
      return reorderedPlatforms
    }
    
    return platforms
  }

  const filteredLeads = applyFilters(campaignLeads)

  if (isLoading) {
  return (
      <div className="h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading outreach data...</span>
          </div>
          </div>
    )
  }

  return (
    <div className="h-screen bg-[#0B0B0B] text-white overflow-hidden animate-in fade-in duration-300 relative">
      <GridOverlay />
      <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto relative z-10">


        {/* Lead Limit Warning */}
        {(stats.pending >= MAX_PENDING_LEADS * WARNING_THRESHOLD || stats.totalLeads >= MAX_TOTAL_LEADS * WARNING_THRESHOLD) && (
          <Card className="bg-yellow-900/20 border-yellow-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-yellow-300 font-medium text-sm">
                    {stats.pending >= MAX_PENDING_LEADS ? 
                      'Lead Limit Reached' : 
                      stats.totalLeads >= MAX_TOTAL_LEADS ? 
                        'Total Lead Limit Reached' :
                        'Approaching Lead Limits'
                    }
                  </div>
                  <div className="text-yellow-400/80 text-xs mt-1">
                    {stats.pending >= MAX_PENDING_LEADS && (
                      <span>You have {stats.pending} pending leads (max: {MAX_PENDING_LEADS}). </span>
                    )}
                    {stats.totalLeads >= MAX_TOTAL_LEADS && (
                      <span>You have {stats.totalLeads} total leads (max: {MAX_TOTAL_LEADS}). </span>
                    )}
                    {(stats.pending < MAX_PENDING_LEADS && stats.totalLeads < MAX_TOTAL_LEADS) && (
                      <span>
                        Pending: {stats.pending}/{MAX_PENDING_LEADS} • Total: {stats.totalLeads}/{MAX_TOTAL_LEADS}
                      </span>
                    )}
                    <br />Complete outreach to existing leads before adding more.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clean Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 min-w-0">
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors min-w-0">
            <CardContent className="p-4 min-w-0">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-3xl font-bold text-white flex-shrink-0">{stats.totalLeads}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-300 truncate">Total Leads</div>
                    <div className="text-xs text-gray-500 truncate">In pipeline</div>
                  </div>
                </div>
                <Users className="h-6 w-6 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors min-w-0">
            <CardContent className="p-4 min-w-0">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-3xl font-bold text-white flex-shrink-0">{stats.pending}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-300 truncate">Pending</div>
                    <div className="text-xs text-gray-500 truncate">Need outreach</div>
                  </div>
                </div>
                <CircleDot className="h-6 w-6 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors min-w-0">
            <CardContent className="p-4 min-w-0">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-3xl font-bold text-white flex-shrink-0">{stats.contacted}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-300 truncate">Contacted</div>
                    <div className="text-xs text-gray-500 truncate">{stats.responseRate}% response</div>
                  </div>
                </div>
                <MessageCircle className="h-6 w-6 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors min-w-0">
            <CardContent className="p-4 min-w-0">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-3xl font-bold text-white flex-shrink-0">{stats.responded}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-300 truncate">Responded</div>
                    <div className="text-xs text-gray-500 truncate">Active conversations</div>
                  </div>
                </div>
                <MessageSquare className="h-6 w-6 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors min-w-0">
            <CardContent className="p-4 min-w-0">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-3xl font-bold text-white flex-shrink-0">{stats.qualified}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-300 truncate">Qualified</div>
                    <div className="text-xs text-gray-500 truncate">Ready to close</div>
                  </div>
                </div>
                <Star className="h-6 w-6 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors min-w-0">
            <CardContent className="p-4 min-w-0">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-3xl font-bold text-white flex-shrink-0">{stats.conversionRate}%</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-300 truncate">Conversion</div>
                    <div className="text-xs text-gray-500 truncate">{stats.signed} signed</div>
                  </div>
                </div>
                <TrendingUp className="h-6 w-6 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
          
          {/* Message Usage Card */}
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors min-w-0">
            <CardContent className="p-4 min-w-0">
              <div className="flex items-center justify-between min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-3xl font-bold text-white flex-shrink-0">
                    {messageUsage ? `${messageUsage.daily.used}/${messageUsage.daily.limit}` : '...'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-300 truncate">AI Messages</div>
                    <div className="text-xs text-gray-500 truncate">
                      {messageUsage ? `${messageUsage.daily.used} used today` : 'Loading...'}
                    </div>
                  </div>
                </div>
                <MessageSquare className="h-6 w-6 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 flex-1 min-h-0">
          
          {/* Enhanced Lead Pipeline - Takes up 4 columns */}
          <div className="xl:col-span-4 flex flex-col min-h-0">
            <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] border-[#2A2A2A] shadow-2xl flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-400" />
                      Lead Pipeline
                    </CardTitle>
                    <CardDescription className="text-gray-400">Click outreach to see available contact methods</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowTutorial(true)}
                      variant="outline"
                      size="sm"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Help & Tutorial
                    </Button>
                    <Button
                      onClick={() => setShowScoreManager(true)}
                      variant="outline"
                      size="sm"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Scoring
                    </Button>
                    <Button
                      onClick={openFiltersPanel}
                      variant="outline"
                      size="sm"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {(filters.hasPhone || filters.hasEmail || filters.hasWebsite || filters.hasSocials ||
                        filters.statusFilter !== 'all' || filters.selectedNicheFilter.length > 0 || filters.minScore > 0) && (
                        <Badge className="ml-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400" variant="secondary">
                          Active
                        </Badge>
                      )}
                    </Button>

                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 h-0">
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

                {/* Quick Status Filters */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, statusFilter: 'all' }))}
                      variant={filters.statusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 text-xs ${
                        filters.statusFilter === 'all'
                          ? 'bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#E02424]'
                          : 'bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                      }`}
                    >
                      All ({stats.totalLeads})
                    </Button>
                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, statusFilter: 'pending' }))}
                      variant={filters.statusFilter === 'pending' ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 text-xs ${
                        filters.statusFilter === 'pending'
                          ? 'bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#E02424]'
                          : 'bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                      }`}
                    >
                      <CircleDot className="h-3 w-3 mr-1" />
                      Pending ({stats.pending})
                    </Button>
                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, statusFilter: 'contacted' }))}
                      variant={filters.statusFilter === 'contacted' ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 text-xs ${
                        filters.statusFilter === 'contacted'
                          ? 'bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#E02424]'
                          : 'bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                      }`}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Contacted ({stats.contacted})
                    </Button>
                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, statusFilter: 'responded' }))}
                      variant={filters.statusFilter === 'responded' ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 text-xs ${
                        filters.statusFilter === 'responded'
                          ? 'bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#E02424]'
                          : 'bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                      }`}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Responded ({stats.responded})
                    </Button>
                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, statusFilter: 'qualified' }))}
                      variant={filters.statusFilter === 'qualified' ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 text-xs ${
                        filters.statusFilter === 'qualified'
                          ? 'bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#E02424]'
                          : 'bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                      }`}
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Qualified ({stats.qualified})
                    </Button>
                    <Button
                      onClick={() => setFilters(prev => ({ ...prev, statusFilter: 'signed' }))}
                      variant={filters.statusFilter === 'signed' ? 'default' : 'outline'}
                      size="sm"
                      className={`h-8 text-xs ${
                        filters.statusFilter === 'signed'
                          ? 'bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#E02424]'
                          : 'bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Signed ({stats.signed})
                    </Button>
                  </div>
                </div>

                {/* Advanced Filters Panel */}
                {showFilters && (
                  <div className="mb-4 p-4 bg-[#2A2A2A] border border-[#444] rounded-lg space-y-4">
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
                                ? 'bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#E02424]'
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
                    
                    {/* Contact Filters */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-400">Contact Methods</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasPhone"
                            checked={tempFilters.hasPhone}
                            onCheckedChange={(checked) => setTempFilters(prev => ({ ...prev, hasPhone: checked as boolean }))}
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
                            onCheckedChange={(checked) => setTempFilters(prev => ({ ...prev, hasEmail: checked as boolean }))}
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
                            onCheckedChange={(checked) => setTempFilters(prev => ({ ...prev, hasWebsite: checked as boolean }))}
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
                            onCheckedChange={(checked) => setTempFilters(prev => ({ ...prev, hasSocials: checked as boolean }))}
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
                              onCheckedChange={(checked) => setTempFilters(prev => ({ 
                                ...prev, 
                                socialPlatforms: { ...prev.socialPlatforms, instagram: checked as boolean }
                              }))}
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
                              onCheckedChange={(checked) => setTempFilters(prev => ({ 
                                ...prev, 
                                socialPlatforms: { ...prev.socialPlatforms, facebook: checked as boolean }
                              }))}
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
                              onCheckedChange={(checked) => setTempFilters(prev => ({ 
                                ...prev, 
                                socialPlatforms: { ...prev.socialPlatforms, linkedin: checked as boolean }
                              }))}
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
                              onCheckedChange={(checked) => setTempFilters(prev => ({ 
                                ...prev, 
                                socialPlatforms: { ...prev.socialPlatforms, twitter: checked as boolean }
                              }))}
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
                    
                    {/* Niche Filter */}
                    {availableNichesInLeads.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-400">Filter by Niche</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                          {availableNichesInLeads.map((nicheName) => (
                            <div key={nicheName || 'unknown'} className="flex items-center space-x-2">
                              <Checkbox
                                id={`niche-${nicheName}`}
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
                              <label htmlFor={`niche-${nicheName}`} className="text-sm text-gray-400 cursor-pointer">
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
                        className="bg-[#1A1A1A] border border-[#2A2A2A] hover:bg-[#2A2A2A] text-white"
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                )}

                {/* Bulk Actions Bar */}
                {selectedLeads.length > 0 && (
                  <div className="mb-4 p-3 bg-[#2A2A2A] border border-[#444] rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-sm font-medium">
                          {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            setSelectedLeads([])
                            setIsSelectAll(false)
                          }}
                          variant="outline"
                          size="sm"
                          className="bg-[#1A1A1A] border-[#333] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={deleteBulkCampaignLeads}
                          variant="outline"
                          size="sm"
                          className="bg-red-900/20 border-red-500/50 text-red-300 hover:bg-red-900/30 hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Lead Table */}
                <div className="overflow-x-auto flex-1 overflow-y-auto border border-[#333] rounded-md">
                  <Table>
                    <TableHeader className="sticky top-0 bg-[#1A1A1A] z-10">
                      <TableRow className="border-[#333] hover:bg-transparent">
                        <TableHead className="w-12 text-gray-400">
                          <Checkbox
                            checked={isSelectAll && filteredLeads.length > 0}
                            onCheckedChange={handleSelectAll}
                            className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                        </TableHead>
                        <TableHead className="text-gray-400">Business</TableHead>
                        <TableHead className="text-gray-400">Owner</TableHead>
                        <TableHead className="text-gray-400">
                          Status
                        </TableHead>
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
                        <TableHead className="text-gray-400">Contact Info</TableHead>
                        <TableHead className="text-gray-400">Last Contact</TableHead>
                        <TableHead className="text-gray-400">Outreach</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((campaignLead) => {
                        const outreachMethods = campaignLead.lead ? getOutreachMethods(campaignLead.lead) : []
                        
                        // Check which methods have been used for this lead today
                        const today = new Date().toDateString()
                        const getMethodsUsed = (): string[] => {
                          if (!campaignLead.lead?.business_name) return []
                          const methods = ['email', 'phone', 'linkedin', 'instagram', 'facebook', 'twitter']
                          return methods.filter(method => 
                            localStorage.getItem(`method_used_${campaignLead.lead!.business_name}_${method}_${today}`)
                          )
                        }
                        const methodsUsed = getMethodsUsed()
                        const availableMethods = outreachMethods.length - methodsUsed.length
                        
                            return (
                        <TableRow key={campaignLead.id} className="border-[#333] hover:bg-[#2A2A2A]">
                          <TableCell className="w-12">
                            <Checkbox
                              checked={selectedLeads.includes(campaignLead.id)}
                              onCheckedChange={(checked) => handleSelectLead(campaignLead.id, checked as boolean)}
                              className="border-[#444] data-[state=checked]:bg-gray-600"
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-white">{campaignLead.lead?.business_name}</div>
                              <div className="text-sm text-gray-400">{campaignLead.lead?.niche_name}</div>
                              {campaignLead.lead?.website && (
                                <a
                                  href={campaignLead.lead.website.startsWith('http') ? campaignLead.lead.website : `https://${campaignLead.lead.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1 mt-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                    Website
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                              <div className="text-sm">
                                {campaignLead.lead?.owner_name ? (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-300">{campaignLead.lead.owner_name}</span>
                                </div>
                                ) : (
                                  <span className="text-gray-500">No owner info</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={campaignLead.status}
                              onValueChange={(value) => updateCampaignLeadStatus(campaignLead.id, value)}
                            >
                                <SelectTrigger className="w-36 h-8 bg-[#2A2A2A] border-[#444] text-gray-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#1A1A1A] border-[#333]">
                                {getAvailableStatuses(campaignLead.status).map((status) => (
                                  <SelectItem key={status} value={status}>
                                    <div className="flex items-center gap-2">
                                      {status === 'pending' && <CircleDot className="h-3 w-3" />}
                                      {status === 'contacted' && <MessageCircle className="h-3 w-3" />}
                                      {status === 'responded' && <MessageSquare className="h-3 w-3" />}
                                      {status === 'qualified' && <Star className="h-3 w-3" />}
                                      {status === 'signed' && <CheckCircle2 className="h-3 w-3" />}
                                      {status === 'rejected' && <XCircle className="h-3 w-3" />}
                                      {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                                    <div className="flex items-center gap-2">
                              {campaignLead.lead ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 p-1 hover:bg-[#333] text-gray-300 hover:text-white"
                                    onClick={() => {
                                      const scoreData = calculateLeadScore(campaignLead.lead!)
                                      setSelectedScoreBreakdown({
                                        lead: campaignLead.lead,
                                        scoreData
                                      })
                                      setShowScoreBreakdown(true)
                                    }}
                                  >
                                    <div className="flex items-center gap-1">
                                      <Calculator className="h-3 w-3" />
                                      <span className="font-mono text-sm">
                                        {calculateLeadScore(campaignLead.lead).total}
                                      </span>
                                    </div>
                                  </Button>
                                  <div className="text-xs text-gray-500">/100</div>
                                </>
                              ) : (
                                <span className="text-gray-500 text-sm">N/A</span>
                              )}
                                    </div>
                          </TableCell>
                          <TableCell>
                              <div className="space-y-1 text-sm">
                                {campaignLead.lead?.email && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <Mail className="h-3 w-3" />
                                    <span 
                                      className={`text-xs cursor-pointer hover:text-gray-300 transition-colors ${
                                        copiedField === `email-${campaignLead.id}` ? 'text-gray-300' : ''
                                      }`}
                                      onClick={() => copyToClipboard(campaignLead.lead!.email!, 'Email', `email-${campaignLead.id}`)}
                                      title="Click to copy email"
                                    >
                                      {copiedField === `email-${campaignLead.id}` ? '✓ Copied!' : campaignLead.lead.email}
                                    </span>
                            </div>
                                )}
                                {campaignLead.lead?.phone && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <Phone className="h-3 w-3" />
                                    <span 
                                      className={`text-xs cursor-pointer hover:text-gray-300 transition-colors ${
                                        copiedField === `phone-${campaignLead.id}` ? 'text-gray-300' : ''
                                      }`}
                                      onClick={() => copyToClipboard(campaignLead.lead!.phone!, 'Phone', `phone-${campaignLead.id}`)}
                                      title="Click to copy phone"
                                    >
                                      {copiedField === `phone-${campaignLead.id}` ? '✓ Copied!' : campaignLead.lead.phone}
                                    </span>
                                  </div>
                                )}
                                {/* Social Media Icons - Overlapping Style */}
                                <div className="flex items-center relative max-w-[80px]">
                              {campaignLead.lead?.instagram_handle && (
                                <a
                                  href={getSocialMediaLink('instagram', campaignLead.lead.instagram_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                      className="relative z-10 text-gray-400 hover:text-gray-300 hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-gray-500/50 hover:z-20"
                                      onClick={(e) => e.stopPropagation()}
                                  title={`Instagram: ${campaignLead.lead.instagram_handle}`}
                                  style={{ marginLeft: '0px' }}
                                >
                                      <Instagram className="h-3 w-3" />
                                </a>
                              )}
                                  {campaignLead.lead?.facebook_page && getSocialMediaLink('facebook', campaignLead.lead.facebook_page) && (
                                <a
                                  href={getSocialMediaLink('facebook', campaignLead.lead.facebook_page)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                      className="relative z-10 text-gray-400 hover:text-gray-300 hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-gray-500/50 hover:z-20"
                                      onClick={(e) => e.stopPropagation()}
                                  title={`Facebook: ${campaignLead.lead.facebook_page}`}
                                      style={{ marginLeft: campaignLead.lead.instagram_handle ? '-6px' : '0px' }}
                                >
                                      <Facebook className="h-3 w-3" />
                                </a>
                              )}
                              {campaignLead.lead?.linkedin_profile && (
                                <a
                                  href={getSocialMediaLink('linkedin', campaignLead.lead.linkedin_profile)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                      className="relative z-10 text-gray-400 hover:text-gray-300 hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-gray-500/50 hover:z-20"
                                      onClick={(e) => e.stopPropagation()}
                                  title={`LinkedIn: ${campaignLead.lead.linkedin_profile}`}
                                      style={{ marginLeft: (campaignLead.lead.instagram_handle || campaignLead.lead.facebook_page) ? '-6px' : '0px' }}
                                >
                                      <Linkedin className="h-3 w-3" />
                                </a>
                              )}
                              {campaignLead.lead?.twitter_handle && (
                                <a
                                  href={getSocialMediaLink('twitter', campaignLead.lead.twitter_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                      className="relative z-10 text-gray-300 hover:text-white hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-gray-300/50 hover:z-20"
                                      onClick={(e) => e.stopPropagation()}
                                  title={`X/Twitter: ${campaignLead.lead.twitter_handle}`}
                                      style={{ marginLeft: (campaignLead.lead.instagram_handle || campaignLead.lead.facebook_page || campaignLead.lead.linkedin_profile) ? '-6px' : '0px' }}
                                >
                                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                      </svg>
                                </a>
                              )}
                              {!campaignLead.lead?.instagram_handle && !campaignLead.lead?.facebook_page && !campaignLead.lead?.linkedin_profile && !campaignLead.lead?.twitter_handle && (
                                    <span className="text-gray-500 text-xs">No socials found</span>
                                  )}
                                </div>
                                {campaignLead.lead?.city && campaignLead.lead?.state_province && (
                                  <div className="flex items-center gap-1 text-gray-400">
                                    <MapPin className="h-3 w-3" />
                                    <span className="text-xs">{campaignLead.lead.city}, {campaignLead.lead.state_province}</span>
                                  </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {/* Last Contact Time */}
                              <div className="text-sm text-gray-300">
                                {campaignLead.last_contacted_at 
                                  ? formatTimeAgo(campaignLead.last_contacted_at)
                                  : <span className="text-gray-500">Never</span>
                                }
                              </div>
                              
                              {/* Platform Icons - Only show if lead was actually contacted */}
                              <div className="flex items-center relative max-w-[80px]">
                                {(() => {
                                  // Only show method icons if the lead has been contacted
                                  if (!campaignLead.last_contacted_at) {
                                    return <span className="text-gray-500 text-xs">No contact made</span>
                                  }

                                  // Check which outreach methods have been used for this lead (last 7 days)
                                  const usedMethods: string[] = []
                                  
                                  if (campaignLead.lead?.business_name) {
                                    const methods = ['email', 'phone', 'linkedin', 'instagram', 'facebook', 'twitter']
                                    
                                    // Check last 7 days for any outreach
                                    for (let i = 0; i < 7; i++) {
                                      const checkDate = new Date()
                                      checkDate.setDate(checkDate.getDate() - i)
                                      const dateString = checkDate.toDateString()
                                      
                                      for (const method of methods) {
                                        if (localStorage.getItem(`method_used_${campaignLead.lead.business_name}_${method}_${dateString}`) && 
                                            !usedMethods.includes(method)) {
                                          usedMethods.push(method)
                                        }
                                      }
                                    }
                                  }

                                  // Also check the outreach_method field from the database
                                  if (campaignLead.outreach_method && !usedMethods.includes(campaignLead.outreach_method)) {
                                    usedMethods.push(campaignLead.outreach_method)
                                  }
                                  
                                  if (usedMethods.length === 0) {
                                    return <span className="text-gray-500 text-xs">Method unknown</span>
                                  }
                                  
                                  return usedMethods.map((method, index) => (
                                    <div
                                      key={method}
                                      className="relative z-10 p-1 bg-[#2A2A2A] border border-[#444] rounded hover:bg-[#333] hover:z-20 transition-all duration-200"
                                      title={`${method.charAt(0).toUpperCase() + method.slice(1)} outreach completed`}
                                      style={{ marginLeft: index > 0 ? '-6px' : '0px' }}
                                    >
                                      {getOutreachMethodIcon(method, "h-3 w-3")}
                                    </div>
                                  ))
                                })()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                              {campaignLead.status === 'responded' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                                  onClick={() => {
                                    setSelectedCampaignLead(campaignLead)
                                    setShowSmartResponse(true)
                                    setLeadResponse('')
                                    setGeneratedSmartResponse('')
                                  }}
                                >
                                  <Brain className="h-3 w-3 mr-1" />
                                  Smart Response
                                </Button>
                              ) : campaignLead.status === 'qualified' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs bg-gradient-to-r from-green-900/30 to-green-800/30 border-green-600/50 text-green-300 hover:bg-green-800/50 hover:text-green-200"
                                  onClick={() => {
                                    // Only open contract generator for qualified leads
                                    if (campaignLead.status === 'qualified') {
                                      setSelectedCampaignLead(campaignLead)
                                      setIsContractMode(false) // Single contract mode
                                      setShowOutreachOptions(false) // Clear outreach state
                                      setShowContractGenerator(true)
                                    }
                                  }}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Generate Contract
                                </Button>
                              ) : campaignLead.status === 'signed' ? (
                                <div className="flex items-center gap-2 text-green-400">
                                  <CheckCircle className="h-3 w-3" />
                                  <span className="text-xs font-medium">Deal Closed</span>
                                </div>
                              ) : campaignLead.status === 'rejected' ? (
                                <div className="flex items-center gap-2 text-red-400">
                                  <XCircle className="h-3 w-3" />
                                  <span className="text-xs">Rejected</span>
                                </div>
                              ) : (campaignLead.status === 'pending' || (campaignLead.status === 'contacted' && methodsUsed.length < outreachMethods.length)) ? (
                                (() => {
                                  // Calculate days until follow-up if at least 1 method was used
                                  let followUpMessage = null
                                  if (campaignLead.status === 'contacted' && campaignLead.last_contacted_at) {
                                    const contactDate = new Date(campaignLead.last_contacted_at)
                                    const now = new Date()
                                    const daysSinceContact = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24))
                                    const daysUntilFollowUp = 3 - daysSinceContact
                                    if (daysUntilFollowUp > 0) {
                                      followUpMessage = `Follow-up in ${daysUntilFollowUp} day${daysUntilFollowUp === 1 ? '' : 's'}`
                                    }
                                  }
                                  
                                  return (
                                    <div className="flex flex-col items-center gap-1">
                                      {followUpMessage && (
                                        <div className="text-[10px] text-gray-500 flex items-center">
                                          <Clock className="h-2.5 w-2.5 mr-1" />
                                          {followUpMessage}
                                        </div>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                                        onClick={() => {
                                          setSelectedCampaignLead(campaignLead)
                                          setIsFollowUpMode(false) // Not follow-up mode
                                          setShowContractGenerator(false) // Clear contract state
                                          setMethodUsageTimestamp(Date.now()) // Force method switcher to check usage
                                          setShowOutreachOptions(true)
                                        }}
                                        disabled={outreachMethods.length === 0}
                                        title={`${methodsUsed.length} of ${outreachMethods.length} methods used today`}
                                      >
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Outreach ({methodsUsed.length}/{outreachMethods.length})
                                        {methodsUsed.length > 0 && <Info className="h-3 w-3 ml-1" />}
                                      </Button>
                                    </div>
                                  )
                                })()
                              ) : (
                                // For 'contacted' status with all methods used - show follow-up option only after 3+ days
                                (() => {
                                  // Check if enough time has passed for follow-up
                                  if (!campaignLead.last_contacted_at) return null;
                                  
                                  const contactDate = new Date(campaignLead.last_contacted_at);
                                  const now = new Date();
                                  const daysSinceContact = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));
                                  
                                  // Only show Follow Up button if 3+ days have passed since last contact
                                  if (daysSinceContact < 3) {
                                    return (
                                      <div className="h-8 text-xs text-gray-500 flex items-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Follow-up in {3 - daysSinceContact} day{3 - daysSinceContact === 1 ? '' : 's'}
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs bg-[#2A2A2A] border-[#444] text-yellow-300 hover:bg-[#333] hover:text-yellow-200"
                                      onClick={() => {
                                        setSelectedCampaignLead(campaignLead)
                                        setIsFollowUpMode(true)
                                        setShowContractGenerator(false) // Clear contract state
                                        setMethodUsageTimestamp(Date.now()) // Force method switcher to check usage
                                        setShowOutreachOptions(true)
                                      }}
                                    >
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Follow Up ({daysSinceContact}d)
                                    </Button>
                                  );
                                })()
                              )}
                          </TableCell>
                        </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  
                  {filteredLeads.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      {campaignLeads.length === 0 ? (
                        <>
                          <p>No leads in outreach yet</p>
                          <p className="text-sm">Add leads from the Lead Generator to start outreaching</p>
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

                    {/* Todo List */}
          <div className="xl:col-span-1 flex flex-col min-h-0 min-w-0">
            <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0f0f0f] border-[#2A2A2A] shadow-2xl h-full flex flex-col min-w-0">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <CheckSquare className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <CardTitle className="text-white truncate">Outreach Tasks</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-[#2A2A2A] text-gray-300 flex-shrink-0 whitespace-nowrap">
                    {todos.length - completedTodos.size}/{todos.length}
                  </Badge>
                </div>
                <CardDescription className="text-gray-400 truncate">
                  Your personalized outreach task list
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {/* Progress Today */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Progress Today</span>
                      <span className="text-gray-200">
                        {completedTodos.size} / {todos.length} completed
                      </span>
                    </div>
                    {todos.length > 0 && (
                      <div className="w-full bg-[#2A2A2A] rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-gray-600 to-gray-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(completedTodos.size / todos.length) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Todo List */}
                  <div className="pt-3 border-t border-[#333]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-medium text-gray-400">Todo List</h4>
                      {completedTodos.size > 0 && (
                        <Button
                          onClick={() => {
                            setCompletedTodos(new Set())
                            localStorage.removeItem(`completed-todos-${userId}`)
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-xs text-gray-500 hover:text-gray-300 h-6"
                        >
                          Clear Done
                        </Button>
                      )}
                    </div>
                    
                    {todos.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="p-3 bg-[#2A2A2A] rounded-full w-fit mx-auto mb-3">
                          <CheckCircle className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-400 mb-1">All caught up!</p>
                        <p className="text-xs text-gray-500">No pending tasks right now</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {todos
                          .sort((a, b) => {
                            // Sort by priority (high -> medium -> low) then by completion status
                            const priorityOrder = { high: 3, medium: 2, low: 1 }
                            const aCompleted = completedTodos.has(a.id)
                            const bCompleted = completedTodos.has(b.id)
                            
                            if (aCompleted && !bCompleted) return 1
                            if (!aCompleted && bCompleted) return -1
                            
                            return priorityOrder[b.priority] - priorityOrder[a.priority]
                          })
                          .map((todo) => {
                            const isCompleted = completedTodos.has(todo.id)
                            const priorityInfo = {
                              high: { color: 'bg-red-400', label: 'High Priority', borderColor: 'border-red-500/20' },
                              medium: { color: 'bg-yellow-400', label: 'Medium Priority', borderColor: 'border-yellow-500/20' },
                              low: { color: 'bg-[#2A2A2A]', label: 'Low Priority', borderColor: 'border-[#333]' }
                            }
                            
                            return (
                              <div
                                key={todo.id}
                                className={`relative p-2 rounded-lg border transition-all ${
                                  isCompleted 
                                    ? 'border-green-500/30 bg-green-500/5 opacity-60' 
                                    : `border-[#333] bg-[#1A1A1A]/50 hover:bg-[#2A2A2A]/50 hover:${priorityInfo[todo.priority].borderColor}`
                                }`}
                              >
                                {/* Priority indicator dot in top-right corner */}
                                {!isCompleted && (
                                  <div 
                                    className={`absolute top-2 right-2 w-2 h-2 rounded-full ${priorityInfo[todo.priority].color} group`}
                                    title={priorityInfo[todo.priority].label}
                                  >
                                    {/* Hover tooltip */}
                                    <div className="absolute right-0 top-4 px-2 py-1 bg-black text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                      {priorityInfo[todo.priority].label}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 mt-0.5">
                                    <Checkbox
                                      checked={isCompleted}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          completeTodo(todo.id)
                            } else {
                                          // Remove from completed
                                          setCompletedTodos(prev => {
                                            const newSet = new Set(prev)
                                            newSet.delete(todo.id)
                                            return newSet
                                          })
                                          const completed = Array.from(completedTodos).filter(id => id !== todo.id)
                                          localStorage.setItem(`completed-todos-${userId}`, JSON.stringify(completed))
                            }
                          }}
                                      className="border-[#2A2A2A] data-[state=checked]:bg-[#1A1A1A] data-[state=checked]:border-[#333]"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-sm font-medium ${
                                        isCompleted ? 'line-through text-gray-500' : 'text-gray-200'
                                      }`}>
                                        {todo.title}
                                      </span>
                                    </div>
                                    <p className={`text-xs ${
                                      isCompleted ? 'text-gray-600' : 'text-gray-400'
                                    } mb-3`}>
                                      {todo.description}
                                    </p>
                                    {!isCompleted && (
                                      <div className="flex justify-start mt-1">
                                        <Button
                                          onClick={() => {
                                            todo.filterAction()
                                          }}
                                          size="sm"
                                          variant="outline"
                                          className="h-6 text-[10px] px-2 bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white break-words text-left leading-tight w-full max-w-full"
                                        >
                                          <span className="block truncate">{todo.action}</span>
                                        </Button>
                                      </div>
                                    )}
                      </div>
                    </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      </div>

                    {/* Quick Actions */}
                  <div className="pt-3 border-t border-[#333] space-y-2">
                      <h4 className="text-xs font-medium text-gray-400 mb-2">Quick Actions</h4>
                      <div className="space-y-2">
                        <Button
                          onClick={() => {
                            // Reset all filters first, then apply specific ones
                            setFilters({
                              hasPhone: false,
                              hasEmail: false,
                              hasWebsite: false,
                              hasSocials: false,
                              socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
                              selectedNicheFilter: [],
                              statusFilter: 'all',
                              minScore: 80,
                              hasOwnerName: false,
                              businessTypeFilter: [],
                              locationFilter: { city: '', state: '' },
                              outreachMethodFilter: [],
                              lastContactedFilter: 'all',
                              scoreRange: { min: 0, max: 100 }
                            });
                            setSortConfig({ key: 'lead_score', direction: 'desc' });
                            setSearchQuery('');
                            toast.success(`Showing ${campaignLeads.filter(l => l.lead?.lead_score && l.lead.lead_score >= 80).length} high-score leads`);
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-[10px] h-6 px-2 bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          <Star className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">High-Score Leads ({campaignLeads.filter(l => l.lead?.lead_score && l.lead.lead_score >= 80).length})</span>
                        </Button>
                        
                        <Button
                          onClick={() => {
                            setFilters({
                              hasPhone: false,
                              hasEmail: false,
                              hasWebsite: false,
                              hasSocials: false,
                              socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
                              selectedNicheFilter: [],
                              statusFilter: 'pending',
                              minScore: 0,
                              hasOwnerName: false,
                              businessTypeFilter: [],
                              locationFilter: { city: '', state: '' },
                              outreachMethodFilter: [],
                              lastContactedFilter: 'all',
                              scoreRange: { min: 0, max: 100 }
                            });
                            setSearchQuery('');
                            toast.success(`Showing ${campaignLeads.filter(l => l.status === 'pending').length} leads ready for outreach`);
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-[10px] h-6 px-2 bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Ready to Contact ({campaignLeads.filter(l => l.status === 'pending').length})</span>
                        </Button>

                        <Button
                          onClick={() => {
                            setFilters({
                              hasPhone: false,
                              hasEmail: false,
                              hasWebsite: false,
                              hasSocials: false,
                              socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
                              selectedNicheFilter: [],
                              statusFilter: 'responded',
                              minScore: 0,
                              hasOwnerName: false,
                              businessTypeFilter: [],
                              locationFilter: { city: '', state: '' },
                              outreachMethodFilter: [],
                              lastContactedFilter: 'all',
                              scoreRange: { min: 0, max: 100 }
                            });
                            setSearchQuery('');
                            toast.success(`Showing ${campaignLeads.filter(l => l.status === 'responded').length} hot leads that responded`);
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-[10px] h-6 px-2 bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          <MessageCircle className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Hot Responses ({campaignLeads.filter(l => l.status === 'responded').length})</span>
                        </Button>

                        <Button
                          onClick={() => {
                            setFilters({
                              hasPhone: false,
                              hasEmail: false,
                              hasWebsite: false,
                              hasSocials: false,
                              socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
                              selectedNicheFilter: [],
                              statusFilter: 'all',
                              minScore: 0,
                              hasOwnerName: false,
                              businessTypeFilter: [],
                              locationFilter: { city: '', state: '' },
                              outreachMethodFilter: [],
                              lastContactedFilter: 'today',
                              scoreRange: { min: 0, max: 100 }
                            });
                            setSearchQuery('');
                            
                            // Calculate count for toast message
                            const today = new Date();
                            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            const todayContacted = campaignLeads.filter(l => {
                              if (!l.last_contacted_at) return false;
                              const contactDate = new Date(l.last_contacted_at);
                              return contactDate >= todayStart;
                            });
                            
                            toast.success(`Showing ${todayContacted.length} leads contacted since midnight today`);
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-[10px] h-6 px-2 bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Today's Outreach ({(() => {
                            const today = new Date();
                            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            return campaignLeads.filter(l => {
                              if (!l.last_contacted_at) return false;
                              const contactDate = new Date(l.last_contacted_at);
                              return contactDate >= todayStart;
                            }).length;
                          })()})</span>
                        </Button>

                        <Button
                          onClick={() => {
                            // Clear all filters and search
                            setFilters({
                              hasPhone: false,
                              hasEmail: false,
                              hasWebsite: false,
                              hasSocials: false,
                              socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
                              selectedNicheFilter: [],
                              statusFilter: 'all',
                              minScore: 0,
                              hasOwnerName: false,
                              businessTypeFilter: [],
                              locationFilter: { city: '', state: '' },
                              outreachMethodFilter: [],
                              lastContactedFilter: 'all',
                              scoreRange: { min: 0, max: 100 }
                            });
                            setSearchQuery('');
                            setSortConfig({ key: '', direction: 'asc' });
                            toast.success(`Showing all ${campaignLeads.length} leads`);
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-[10px] h-6 px-2 bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          <RotateCcw className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">Show All Leads ({campaignLeads.length})</span>
                        </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Advanced Outreach Options Dialog */}
        <Dialog open={showOutreachOptions} onOpenChange={(open) => {
          setShowOutreachOptions(open)
          if (!open) {
            // Clear bulk queues when closing
            setPendingOutreachQueue([])
            setCurrentQueueIndex(0)
            setContactedFollowUpQueue([])
            setCurrentFollowUpIndex(0)
            setIsFollowUpMode(false)
          }
        }}>
          <DialogContent className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-[#333] max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-3 text-xl">
                <div className="p-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span>{qualifiedContractQueue.length > 0 ? 'AI Contract Generator' : isFollowUpMode ? '🔄 AI Follow-up Studio' : '🚀 AI Outreach Studio'}</span>
                  {(pendingOutreachQueue.length > 0 || contactedFollowUpQueue.length > 0 || qualifiedContractQueue.length > 0) && (
                    <span className="text-sm text-gray-400 font-normal">
                      {qualifiedContractQueue.length > 0 
                        ? `Contract ${currentContractIndex + 1} of ${qualifiedContractQueue.length}`
                        : isFollowUpMode 
                          ? `Follow-up ${currentFollowUpIndex + 1} of ${contactedFollowUpQueue.length}`
                          : `Lead ${currentQueueIndex + 1} of ${pendingOutreachQueue.length}`
                      }
                    </span>
                  )}
                </div>
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="font-semibold text-white text-lg">{selectedCampaignLead?.lead?.business_name}</span>
                  </div>
                {selectedCampaignLead?.lead?.owner_name && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="h-4 w-4" />
                      <span>Owner: {selectedCampaignLead.lead.owner_name}</span>
                    </div>
                )}
                  {selectedCampaignLead?.lead?.niche_name && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Building className="h-4 w-4" />
                      <span>Industry: {selectedCampaignLead.lead.niche_name}</span>
                    </div>
                  )}
                  
                  {/* Lead Contact Information with Clickable Icons */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-600">
                    <span className="text-sm text-gray-400">Contact Options:</span>
                    <div className="flex items-center gap-2">
                      {selectedCampaignLead?.lead?.email && (
                        <Button
                          onClick={() => copyToClipboard(selectedCampaignLead.lead?.email!, 'Email', 'email-copy')}
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 group transition-all duration-200 ${
                            copiedField === 'email-copy' 
                              ? 'bg-green-500/20 border border-green-500/30' 
                              : 'hover:bg-blue-500/20'
                          }`}
                          title={copiedField === 'email-copy' ? 'Copied!' : 'Copy Email'}
                        >
                          {copiedField === 'email-copy' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400 animate-bounce" />
                          ) : (
                            <Mail className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                          )}
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.phone && (
                        <Button
                          onClick={() => copyToClipboard(selectedCampaignLead.lead?.phone!, 'Phone', 'phone-copy')}
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 group transition-all duration-200 ${
                            copiedField === 'phone-copy' 
                              ? 'bg-green-500/20 border border-green-500/30' 
                              : 'hover:bg-gray-500/20'
                          }`}
                          title={copiedField === 'phone-copy' ? 'Copied!' : 'Copy Phone'}
                        >
                          {copiedField === 'phone-copy' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400 animate-bounce" />
                          ) : (
                            <Phone className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                          )}
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.linkedin_profile && (
                        <Button
                          onClick={() => {
                            const url = selectedCampaignLead.lead?.linkedin_profile!.startsWith('http') 
                              ? selectedCampaignLead.lead?.linkedin_profile! 
                              : `https://linkedin.com/in/${selectedCampaignLead.lead?.linkedin_profile!}`
                            window.open(url, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-500/20 group"
                          title="Open LinkedIn"
                        >
                          <Linkedin className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.instagram_handle && (
                        <Button
                          onClick={() => {
                            const handle = selectedCampaignLead.lead?.instagram_handle!.replace('@', '')
                            window.open(`https://instagram.com/${handle}`, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-pink-500/20 group"
                          title="Open Instagram"
                        >
                          <Instagram className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.facebook_page && (
                        <Button
                          onClick={() => {
                            const url = selectedCampaignLead.lead?.facebook_page!.startsWith('http') 
                              ? selectedCampaignLead.lead?.facebook_page! 
                              : `https://facebook.com/${selectedCampaignLead.lead?.facebook_page!}`
                            window.open(url, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-500/20 group"
                          title="Open Facebook"
                        >
                          <Facebook className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.twitter_handle && (
                        <Button
                          onClick={() => {
                            const handle = selectedCampaignLead.lead?.twitter_handle!.replace('@', '')
                            window.open(`https://twitter.com/${handle}`, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-300/20 group"
                          title="Open X/Twitter"
                        >
                          <svg className="h-4 w-4 text-gray-300 group-hover:text-gray-200" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.website && (
                        <Button
                          onClick={() => {
                            const url = selectedCampaignLead.lead?.website!.startsWith('http') 
                              ? selectedCampaignLead.lead?.website! 
                              : `https://${selectedCampaignLead.lead?.website!}`
                            window.open(url, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-400/20 group"
                          title="Open Website"
                        >
                          <Globe className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            {/* Bulk Progress Bar (only show when in bulk mode) */}
            {(pendingOutreachQueue.length > 0 || contactedFollowUpQueue.length > 0 || qualifiedContractQueue.length > 0) && (
              <div className="px-6 pb-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium text-sm">
                      {qualifiedContractQueue.length > 0 ? 'Contract Generation Progress' : 
                       isFollowUpMode ? 'Follow-up Progress' : 'Outreach Progress'}
                    </span>
                    <span className="text-gray-200 bg-[#2A2A2A] px-3 py-1 rounded-full text-sm font-medium">
                      {qualifiedContractQueue.length > 0 
                        ? `${currentContractIndex + 1} / ${qualifiedContractQueue.length}`
                        : isFollowUpMode 
                          ? `${currentFollowUpIndex + 1} / ${contactedFollowUpQueue.length}`
                          : `${currentQueueIndex + 1} / ${pendingOutreachQueue.length}`
                      }
                    </span>
                  </div>
                  <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-gray-500 to-gray-400 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${qualifiedContractQueue.length > 0 
                          ? ((currentContractIndex + 1) / qualifiedContractQueue.length) * 100
                          : isFollowUpMode 
                            ? ((currentFollowUpIndex + 1) / contactedFollowUpQueue.length) * 100
                            : ((currentQueueIndex + 1) / pendingOutreachQueue.length) * 100
                        }%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-6 py-4">
              {/* AI Usage Status Bar */}
              <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-600/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
                    <span className="font-medium text-gray-200">AI Generation Status</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>Resets daily at midnight</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {messageUsage ? `${messageUsage.daily.used}` : '...'}
                      </div>
                      <div className="text-xs text-gray-400">Used Today</div>
                    </div>
                    <div className="text-gray-500">/</div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-300">
                        {messageUsage ? `${messageUsage.daily.limit}` : '...'}
                      </div>
                      <div className="text-xs text-gray-400">Daily Limit</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-200">
                      {messageUsage ? `${messageUsage.daily.remaining}` : '...'}
                    </div>
                    <div className="text-xs text-gray-400">Remaining</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-[#2A2A2A] rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-gray-500 to-gray-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${messageUsage ? (messageUsage.daily.used / messageUsage.daily.limit) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* AI Information Banner */}
              <div className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 border border-gray-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-600/30 rounded-lg">
                    <Zap className="h-5 w-5 text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-200 mb-1">
                      {isFollowUpMode ? '🔄 AI-Powered Follow-up Messages' : '🚀 AI-Powered Personalization'}
                    </h3>
                                          <p className="text-sm text-gray-400 leading-relaxed">
                        {isFollowUpMode
                          ? '🎯 Advanced AI generates strategic follow-up messages that re-engage previously contacted leads without being pushy, acknowledging your prior outreach to maximize response rates.'
                        : 'Advanced AI analyzes this lead\'s profile, industry, and social presence to generate highly personalized outreach messages with superior conversion rates.'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Contract Generation or Outreach Method Selection */}
              {qualifiedContractQueue.length > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Generate Contract for {selectedCampaignLead?.lead?.business_name}
                  </h3>
                  
                  {/* Contract Generator Content */}
                  <div className="space-y-6 bg-[#2A2A2A] p-6 rounded-lg border border-[#444]">
                    {/* Pricing Model Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-300">
                        Pricing Model <span className="text-red-500 text-xs">*</span>
                      </Label>
                      <div className="grid grid-cols-3 gap-3">
                        <Button
                          onClick={() => setContractData(prev => ({ ...prev, pricingModel: 'retainer' }))}
                          variant={contractData.pricingModel === 'retainer' ? 'default' : 'outline'}
                          className={`h-12 text-xs ${
                            contractData.pricingModel === 'retainer'
                              ? 'bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#E02424]'
                              : 'bg-[#1A1A1A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                          }`}
                        >
                          Monthly Retainer
                        </Button>
                        <Button
                          onClick={() => setContractData(prev => ({ ...prev, pricingModel: 'revenue_share' }))}
                          variant={contractData.pricingModel === 'revenue_share' ? 'default' : 'outline'}
                          className={`h-12 text-xs ${
                            contractData.pricingModel === 'revenue_share'
                              ? 'bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#E02424]'
                              : 'bg-[#1A1A1A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                          }`}
                        >
                          Revenue Share
                        </Button>
                        <Button
                          onClick={() => setContractData(prev => ({ ...prev, pricingModel: 'per_lead' }))}
                          variant={contractData.pricingModel === 'per_lead' ? 'default' : 'outline'}
                          className={`h-12 text-xs ${
                            contractData.pricingModel === 'per_lead'
                              ? 'bg-[#FF2A2A] text-black border-[#FF2A2A] hover:bg-[#E02424]'
                              : 'bg-[#1A1A1A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                          }`}
                        >
                          Pay Per Lead
                        </Button>
                      </div>
                    </div>

                    {/* Pricing Fields */}
                    {contractData.pricingModel === 'retainer' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="monthlyRetainer" className="text-sm font-medium text-gray-300">
                            Monthly Retainer <span className="text-red-500 text-xs">*</span>
                          </Label>
                          <Input
                            id="monthlyRetainer"
                            value={contractData.monthlyRetainer}
                            onChange={(e) => setContractData(prev => ({ ...prev, monthlyRetainer: e.target.value }))}
                            placeholder="5000"
                            className="bg-[#1A1A1A] border-[#444] text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="adSpend" className="text-sm font-medium text-gray-300">
                            Monthly Ad Spend <span className="text-red-500 text-xs">*</span>
                          </Label>
                          <Input
                            id="adSpend"
                            value={contractData.adSpend}
                            onChange={(e) => setContractData(prev => ({ ...prev, adSpend: e.target.value }))}
                            placeholder="10000"
                            className="bg-[#1A1A1A] border-[#444] text-white"
                          />
                        </div>
                      </div>
                    )}

                    {contractData.pricingModel === 'revenue_share' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="revenueSharePercentage" className="text-sm font-medium text-gray-300">
                            Revenue Share Percentage <span className="text-red-500 text-xs">*</span>
                          </Label>
                          <Input
                            id="revenueSharePercentage"
                            value={contractData.revenueSharePercentage}
                            onChange={(e) => setContractData(prev => ({ ...prev, revenueSharePercentage: e.target.value }))}
                            placeholder="15"
                            className="bg-[#1A1A1A] border-[#444] text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="minimumAdSpend" className="text-sm font-medium text-gray-300">
                            Minimum Monthly Ad Spend
                          </Label>
                          <Input
                            id="minimumAdSpend"
                            value={contractData.minimumAdSpend}
                            onChange={(e) => setContractData(prev => ({ ...prev, minimumAdSpend: e.target.value }))}
                            placeholder="5000"
                            className="bg-[#1A1A1A] border-[#444] text-white"
                          />
                        </div>
                      </div>
                    )}

                    {contractData.pricingModel === 'per_lead' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="pricePerLead" className="text-sm font-medium text-gray-300">
                              Price Per Lead <span className="text-red-500 text-xs">*</span>
                            </Label>
                            <Input
                              id="pricePerLead"
                              value={contractData.pricePerLead}
                              onChange={(e) => setContractData(prev => ({ ...prev, pricePerLead: e.target.value }))}
                              placeholder="50"
                              className={`bg-[#1A1A1A] border-[#444] text-white ${
                                flashingFields.includes('pricePerLead') 
                                  ? 'animate-pulse border-red-500 bg-red-900/20' 
                                  : ''
                              }`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="estimatedMonthlyLeads" className="text-sm font-medium text-gray-300">
                              Est. Monthly Leads <span className="text-red-500 text-xs">*</span>
                            </Label>
                            <Input
                              id="estimatedMonthlyLeads"
                              value={contractData.estimatedMonthlyLeads}
                              onChange={(e) => setContractData(prev => ({ ...prev, estimatedMonthlyLeads: e.target.value }))}
                              placeholder="20"
                              className={`bg-[#1A1A1A] border-[#444] text-white ${
                                flashingFields.includes('estimatedMonthlyLeads') 
                                  ? 'animate-pulse border-red-500 bg-red-900/20' 
                                  : ''
                              }`}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="setupFee" className="text-sm font-medium text-gray-300">
                            Setup Fee (Optional)
                          </Label>
                          <Input
                            id="setupFee"
                            value={contractData.setupFee}
                            onChange={(e) => setContractData(prev => ({ ...prev, setupFee: e.target.value }))}
                            placeholder="500"
                            className="bg-[#1A1A1A] border-[#444] text-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="leadQualifications" className="text-sm font-medium text-gray-300">
                            Lead Qualification Criteria <span className="text-red-500 text-xs">*</span>
                          </Label>
                          <textarea
                            id="leadQualifications"
                            value={contractData.leadQualifications}
                            onChange={(e) => setContractData(prev => ({ ...prev, leadQualifications: e.target.value }))}
                            placeholder="e.g., Homeowners with properties built before 2010, located within 25 miles of contractor, with household income $50K+, expressing interest in roofing services"
                            className={`w-full min-h-[80px] bg-[#1A1A1A] border-[#444] text-white rounded-md px-3 py-2 text-sm resize-y ${
                              flashingFields.includes('leadQualifications') 
                                ? 'animate-pulse border-red-500 bg-red-900/20' 
                                : ''
                            }`}
                            rows={3}
                          />
                          <p className="text-xs text-gray-500">Define specific criteria that qualify a lead for payment</p>
                        </div>
                      </div>
                    )}

                    {/* Generate Contract Button */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          if (selectedCampaignLead?.lead) {
                            generateContractForEditing(selectedCampaignLead.lead)
                          }
                        }}
                        disabled={validateContractData().length > 0}
                        className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white"
                      >
                        Generate Contract
                      </Button>
                      

                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {isFollowUpMode ? 'Choose Your Follow-up Method' : 'Choose Your Outreach Method'}
                  </h3>
              {selectedCampaignLead && selectedCampaignLead.lead && getOutreachMethods(selectedCampaignLead.lead).map((method) => {
                // Check if this method has been used today
                const today = new Date().toDateString()
                const methodUsedToday = !!(selectedCampaignLead.lead?.business_name && 
                  localStorage.getItem(`method_used_${selectedCampaignLead.lead.business_name}_${method.type}_${today}`))
                const methodLabel = isFollowUpMode 
                  ? (method.type === 'email' ? 'Email Follow-up' :
                     method.type === 'phone' ? 'Follow-up Call Script' :
                     method.type === 'linkedin' ? 'LinkedIn Follow-up' :
                     method.type === 'instagram' ? 'Instagram Follow-up' :
                     method.type === 'facebook' ? 'Facebook Follow-up' : 
                     `${method.label} Follow-up`)
                  : (method.type === 'email' ? 'Email Outreach' :
                  method.type === 'phone' ? 'Cold Call Script' :
                  method.type === 'linkedin' ? 'LinkedIn Message' :
                  method.type === 'instagram' ? 'Instagram DM' :
                     method.type === 'facebook' ? 'Facebook Message' : method.label)
                
                const recommendation = isFollowUpMode
                  ? (method.type === 'email' ? 
                     'Strategic follow-up - rekindle the conversation' : 
                     method.type === 'phone' ? 
                     'Personal touch - direct reconnection' :
                     method.type === 'linkedin' ?
                       'Professional follow-up - maintain relationship' :
                     method.type === 'instagram' ?
                       'Casual re-engagement - friendly approach' :
                     method.type === 'facebook' ?
                       'Social follow-up - personal connection' :
                     method.type === 'twitter' || method.type === 'x' ?
                       'Quick re-engagement - brief touchpoint' :
                       'AI-powered follow-up message')
                  : (method.type === 'email' ? 
                  'Direct & professional - highest response rates' : 
                  method.type === 'phone' ? 
                  'Immediate connection - qualify leads instantly' :
                  method.type === 'linkedin' ?
                    'Professional networking - builds trust' :
                  method.type === 'instagram' ?
                    'Visual engagement - casual approach' :
                  method.type === 'facebook' ?
                    'Social connection - personal touch' :
                  method.type === 'twitter' || method.type === 'x' ?
                    'Quick engagement - viral potential' :
                       'AI-powered personalization')
                  
                return (
                <Button
                  key={method.type}
                  onClick={() => {
                    if (!methodUsedToday) {
                      setShowOutreachOptions(false)
                      setShowMessageComposer(true)
                      setMessageType(method.type as any)
                      // Clear previous message when starting new generation
                      setGeneratedMessage('')
                      setMessageSubject('')
                      if (selectedCampaignLead.lead) {
                        generatePersonalizedMessage(selectedCampaignLead.lead, method.type, 0, isFollowUpMode)
                      }
                    }
                  }}
                                         disabled={messageUsage?.daily.remaining === 0 || !!methodUsedToday}
                    className={`w-full justify-start p-6 h-auto border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group ${
                      methodUsedToday 
                        ? 'bg-gradient-to-r from-gray-600/20 to-gray-700/20 border-gray-500/30 text-gray-400'
                        : 'bg-gradient-to-r from-[#2A2A2A] to-[#333] hover:from-[#333] hover:to-[#444] text-white border-[#444] hover:border-[#555]'
                    }`}
                >
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-gradient-to-r from-gray-600/30 to-gray-700/30 rounded-lg group-hover:from-gray-600/40 group-hover:to-gray-700/40 transition-all duration-200">
                            <method.icon className="h-6 w-6" />
                          </div>
                        <div className="text-left">
                            <div className="font-semibold text-lg">{methodLabel}</div>
                            <div className="text-sm text-gray-400 mt-1">{recommendation}</div>
                        </div>
                      </div>
                        <div className="flex items-center gap-2">
                          {methodUsedToday && (
                            <div className="text-xs bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 px-2 py-1 rounded flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Used Today
                            </div>
                          )}
                          {!methodUsedToday && messageUsage?.daily.remaining === 0 && (
                            <div className="text-xs bg-[#1A1A1A] border border-[#2A2A2A] text-gray-300 px-2 py-1 rounded">
                              Daily Limit Reached
                            </div>
                          )}
                          <ChevronRight className={`h-5 w-5 transition-colors ${
                            methodUsedToday ? 'text-gray-500' : 'text-gray-400 group-hover:text-white'
                          }`} />
                        </div>
                    </div>
                </Button>
                )
              })}
              </div>
              )}
              
              {/* Bulk Navigation Controls (only show when in bulk mode) */}
              {(pendingOutreachQueue.length > 0 || contactedFollowUpQueue.length > 0 || qualifiedContractQueue.length > 0) && (
                <div className="px-6 pt-4 border-t border-[#444] space-y-3">
                  {/* Snooze Options (only show for follow-up mode) */}
                  {isFollowUpMode && (
                    <div className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 border border-gray-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-300">Snooze this lead</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => selectedCampaignLead && snoozeLead(selectedCampaignLead.id, 5)}
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-yellow-200 hover:border-yellow-300"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          5 Days
                        </Button>
                        <Button
                          onClick={() => selectedCampaignLead && snoozeLead(selectedCampaignLead.id, 7)}
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-yellow-200 hover:border-yellow-300"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          7 Days
                        </Button>
                        <Button
                          onClick={() => selectedCampaignLead && snoozeLead(selectedCampaignLead.id, 14)}
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-yellow-200 hover:border-yellow-300"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          14 Days
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Lead will reappear in follow-up queue after snooze period</p>
                    </div>
                  )}
                  
                  {/* Navigation Controls */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        if (qualifiedContractQueue.length > 0) {
                          // Contract mode navigation
                          if (currentContractIndex > 0) {
                            const newIndex = currentContractIndex - 1
                            setCurrentContractIndex(newIndex)
                            setSelectedCampaignLead(qualifiedContractQueue[newIndex])
                          }
                        } else if (isFollowUpMode) {
                          if (currentFollowUpIndex > 0) {
                            const newIndex = currentFollowUpIndex - 1
                            setCurrentFollowUpIndex(newIndex)
                            setSelectedCampaignLead(contactedFollowUpQueue[newIndex])
                            // Clear any generated messages
                            setGeneratedMessage('')
                            setMessageSubject('')
                          }
                        } else {
                          if (currentQueueIndex > 0) {
                            const newIndex = currentQueueIndex - 1
                            setCurrentQueueIndex(newIndex)
                            setSelectedCampaignLead(pendingOutreachQueue[newIndex])
                            // Clear any generated messages
                            setGeneratedMessage('')
                            setMessageSubject('')
                          }
                        }
                      }}
                      disabled={
                        qualifiedContractQueue.length > 0 ? currentContractIndex === 0 :
                        isFollowUpMode ? currentFollowUpIndex === 0 : currentQueueIndex === 0
                      }
                      variant="outline"
                      size="sm"
                      className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white disabled:opacity-50"
                    >
                      ← Previous
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (qualifiedContractQueue.length > 0) {
                          // Contract mode navigation
                          if (currentContractIndex < qualifiedContractQueue.length - 1) {
                            const newIndex = currentContractIndex + 1
                            setCurrentContractIndex(newIndex)
                            setSelectedCampaignLead(qualifiedContractQueue[newIndex])
                          } else {
                            // Reached end of contract queue
                            setShowOutreachOptions(false)
                            setQualifiedContractQueue([])
                            setCurrentContractIndex(0)
                            setIsContractMode(false)
                            setShowContractGenerator(false)
                            toast.success('All contracts processed!')
                          }
                        } else if (isFollowUpMode) {
                          if (currentFollowUpIndex < contactedFollowUpQueue.length - 1) {
                            const newIndex = currentFollowUpIndex + 1
                            setCurrentFollowUpIndex(newIndex)
                            setSelectedCampaignLead(contactedFollowUpQueue[newIndex])
                            // Clear any generated messages
                            setGeneratedMessage('')
                            setMessageSubject('')
                          } else {
                            // Reached end of queue
                            setShowOutreachOptions(false)
                            setContactedFollowUpQueue([])
                            setCurrentFollowUpIndex(0)
                            setIsFollowUpMode(false)
                            setGeneratedMessage('')
                            setMessageSubject('')
                            toast.success('All follow-ups processed!')
                          }
                        } else {
                          if (currentQueueIndex < pendingOutreachQueue.length - 1) {
                            const newIndex = currentQueueIndex + 1
                            setCurrentQueueIndex(newIndex)
                            setSelectedCampaignLead(pendingOutreachQueue[newIndex])
                            // Clear any generated messages
                            setGeneratedMessage('')
                            setMessageSubject('')
                          } else {
                            // Reached end of queue
                            setShowOutreachOptions(false)
                            setPendingOutreachQueue([])
                            setCurrentQueueIndex(0)
                            setGeneratedMessage('')
                            setMessageSubject('')
                            toast.success('All pending leads processed!')
                          }
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                    >
                      {qualifiedContractQueue.length > 0
                        ? (currentContractIndex < qualifiedContractQueue.length - 1 ? 'Skip to Next →' : 'Finish Contracts')
                        : isFollowUpMode 
                          ? (currentFollowUpIndex < contactedFollowUpQueue.length - 1 ? 'Skip to Next →' : 'Finish Follow-ups')
                          : (currentQueueIndex < pendingOutreachQueue.length - 1 ? 'Skip to Next →' : 'Finish Queue')
                      }
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setShowOutreachOptions(false)
                        setPendingOutreachQueue([])
                        setCurrentQueueIndex(0)
                        setContactedFollowUpQueue([])
                        setCurrentFollowUpIndex(0)
                        setIsFollowUpMode(false)
                        setQualifiedContractQueue([])
                        setCurrentContractIndex(0)
                        setIsContractMode(false)
                        setShowContractGenerator(false)
                        setGeneratedMessage('')
                        setMessageSubject('')
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                    >
                      <X className="h-4 w-4 mr-1" />
                      {qualifiedContractQueue.length > 0 ? 'Exit Contracts' : 
                       isFollowUpMode ? 'Exit Follow-ups' : 'Exit Queue'}
                    </Button>
                  </div>
                </div>
              )}
          </div>
          </DialogContent>
        </Dialog>

          {/* Premium Message Composer Dialog */}
          <Dialog open={showMessageComposer} onOpenChange={(open) => {
            if (!open && generatedMessage && !messageMarkedAsContacted) {
              // User is trying to close with a generated message that wasn't marked as contacted
              setShowCloseWarning(true)
            } else {
              setShowMessageComposer(open)
              if (!open) {
                // Reset state when closing
                setMessageMarkedAsContacted(false)
                setGeneratedMessage('')
                setMessageSubject('')
              }
            }
          }}>
          <DialogContent className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-[#333] max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-3 text-xl">
                <div className="p-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg">
                  {messageType === 'email' && <Mail className="h-6 w-6 text-white" />}
                  {messageType === 'phone' && <Phone className="h-6 w-6 text-white" />}
                  {messageType === 'linkedin' && <Linkedin className="h-6 w-6 text-white" />}
                  {messageType === 'instagram' && <Instagram className="h-6 w-6 text-white" />}
                  {messageType === 'facebook' && <Facebook className="h-6 w-6 text-white" />}
                {(messageType === 'twitter' || messageType === 'x') && (
                    <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.80l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                )}
                </div>
                <div className="flex flex-col">
                  <span>
                    {isFollowUpMode
                      ? (messageType === 'phone' ? 'AI Follow-up Call Script' : 
                         messageType === 'email' ? 'AI Email Follow-up' :
                         messageType === 'linkedin' ? 'AI LinkedIn Follow-up' :
                         messageType === 'instagram' ? 'AI Instagram Follow-up' :
                         messageType === 'facebook' ? 'AI Facebook Follow-up' :
                         (messageType === 'twitter' || messageType === 'x') ? 'AI X/Twitter Follow-up' :
                         'AI Follow-up Message')
                      : (messageType === 'phone' ? 'AI Cold Call Script' : 
                 messageType === 'email' ? 'AI Email Outreach' :
                 messageType === 'linkedin' ? 'AI LinkedIn Message' :
                 messageType === 'instagram' ? 'AI Instagram DM' :
                 messageType === 'facebook' ? 'AI Facebook Message' :
                 (messageType === 'twitter' || messageType === 'x') ? 'AI X/Twitter DM' :
                         'AI Outreach Message')
                    }
                  </span>
                  {(pendingOutreachQueue.length > 0 || contactedFollowUpQueue.length > 0) && (
                    <span className="text-sm text-gray-400 font-normal">
                      {isFollowUpMode
                        ? `Follow-up ${currentFollowUpIndex + 1} of ${contactedFollowUpQueue.length}`
                        : `Lead ${currentQueueIndex + 1} of ${pendingOutreachQueue.length}`
                      }
                    </span>
                  )}
                </div>
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                <div className="space-y-3 mt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="font-semibold text-white">{selectedCampaignLead?.lead?.business_name}</span>
                    </div>
                    {selectedCampaignLead?.lead?.owner_name && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{selectedCampaignLead.lead.owner_name}</span>
                      </div>
                    )}
                    {selectedCampaignLead?.lead?.niche_name && (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Building className="h-4 w-4" />
                        <span>Industry: {selectedCampaignLead.lead.niche_name}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Lead Contact Information with Clickable Icons */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-600">
                    <span className="text-sm text-gray-400">Contact Options:</span>
                    <div className="flex items-center gap-2">
                      {selectedCampaignLead?.lead?.email && (
                        <Button
                          onClick={() => copyToClipboard(selectedCampaignLead.lead?.email!, 'Email', 'email-copy-single')}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-500/20 group"
                          title="Copy Email"
                        >
                          <Mail className={`h-4 w-4 text-gray-400 group-hover:text-gray-300 ${copiedField === 'email-copy-single' ? 'animate-pulse' : ''}`} />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.phone && (
                        <Button
                          onClick={() => copyToClipboard(selectedCampaignLead.lead?.phone!, 'Phone', 'phone-copy-single')}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-500/20 group"
                          title="Copy Phone"
                        >
                          <Phone className={`h-4 w-4 text-gray-400 group-hover:text-gray-300 ${copiedField === 'phone-copy-single' ? 'animate-pulse' : ''}`} />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.linkedin_profile && (
                        <Button
                          onClick={() => {
                            const url = selectedCampaignLead.lead?.linkedin_profile!.startsWith('http') 
                              ? selectedCampaignLead.lead?.linkedin_profile! 
                              : `https://linkedin.com/in/${selectedCampaignLead.lead?.linkedin_profile!}`
                            window.open(url, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-500/20 group"
                          title="Open LinkedIn"
                        >
                          <Linkedin className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.instagram_handle && (
                        <Button
                          onClick={() => {
                            const handle = selectedCampaignLead.lead?.instagram_handle!.replace('@', '')
                            window.open(`https://instagram.com/${handle}`, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-pink-500/20 group"
                          title="Open Instagram"
                        >
                          <Instagram className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.facebook_page && (
                        <Button
                          onClick={() => {
                            const url = selectedCampaignLead.lead?.facebook_page!.startsWith('http') 
                              ? selectedCampaignLead.lead?.facebook_page! 
                              : `https://facebook.com/${selectedCampaignLead.lead?.facebook_page!}`
                            window.open(url, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-500/20 group"
                          title="Open Facebook"
                        >
                          <Facebook className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.twitter_handle && (
                        <Button
                          onClick={() => {
                            const handle = selectedCampaignLead.lead?.twitter_handle!.replace('@', '')
                            window.open(`https://twitter.com/${handle}`, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-300/20 group"
                          title="Open X/Twitter"
                        >
                          <svg className="h-4 w-4 text-gray-300 group-hover:text-gray-200" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.website && (
                        <Button
                          onClick={() => {
                            const url = selectedCampaignLead.lead?.website!.startsWith('http') 
                              ? selectedCampaignLead.lead?.website! 
                              : `https://${selectedCampaignLead.lead?.website!}`
                            window.open(url, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-400/20 group"
                          title="Open Website"
                        >
                          <Globe className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-6">
              {/* AI Generation Status */}
              <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-600/50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
                    <span className="font-medium text-gray-200">AI Generation Status</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-400">
                      {messageUsage ? `${messageUsage.daily.used}/${messageUsage.daily.limit}` : '...'}
                    </span>
                    <span className="text-gray-200 font-medium">
                      {messageUsage ? `${messageUsage.daily.remaining} remaining` : 'Loading...'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Method Switcher (Only show after first generation) */}
              {generatedMessage && (
              <div key={methodUsageTimestamp} className="bg-gradient-to-r from-[#2A2A2A]/50 to-[#3A3A3A]/50 border border-[#444]/50 rounded-xl p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-400 flex-shrink-0">Switch Outreach Method:</span>
                  <div className="flex gap-2 flex-wrap">
                    {selectedCampaignLead?.lead?.email && (() => {
                      const today = new Date().toDateString()
                      const isUsed = !!(selectedCampaignLead.lead?.business_name && 
                        localStorage.getItem(`method_used_${selectedCampaignLead.lead.business_name}_email_${today}`))
                      const isCurrentMethod = messageType === 'email'
                      
                      return (
                        <Button
                          onClick={async () => {
                            if (isUsed && !isCurrentMethod) {
                              toast.error('📧 Email message already generated for this lead today. Try a different method.')
                              return
                            }
                            // Check if switching away from a generated message that wasn't marked as contacted
                            if (!isCurrentMethod && generatedMessage && !messageMarkedAsContacted) {
                              setShowCloseWarning(true)
                              return
                            }
                            setMessageType('email')
                            if (!isCurrentMethod) {
                              setGeneratedMessage(null)
                              setMessageSubject(null)
                              setMessageMarkedAsContacted(false)
                              // Auto-generate message after switching
                              if (selectedCampaignLead?.lead) {
                                setTimeout(() => generatePersonalizedMessage(selectedCampaignLead.lead, 'email'), 100)
                              }
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className={`flex items-center gap-2 transition-all ${isCurrentMethod ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : isUsed ? 'text-gray-500 hover:bg-gray-600/20 border border-gray-600/30' : 'text-gray-400 hover:bg-gray-500/20'}`}
                        >
                          <Mail className="h-4 w-4" />
                          <span className="text-xs sm:text-sm">Email{isUsed && !isCurrentMethod ? ' ✓' : ''}</span>
                        </Button>
                      )
                    })()}
                    {selectedCampaignLead?.lead?.phone && (() => {
                      const today = new Date().toDateString()
                      const isUsed = !!(selectedCampaignLead.lead?.business_name && 
                        localStorage.getItem(`method_used_${selectedCampaignLead.lead.business_name}_phone_${today}`))
                      const isCurrentMethod = messageType === 'phone'
                      
                      return (
                        <Button
                          onClick={async () => {
                            if (isUsed && !isCurrentMethod) {
                              toast.error('📞 Phone script already generated for this lead today. Try a different method.')
                              return
                            }
                            // Check if switching away from a generated message that wasn't marked as contacted
                            if (!isCurrentMethod && generatedMessage && !messageMarkedAsContacted) {
                              setShowCloseWarning(true)
                              return
                            }
                            setMessageType('phone')
                            if (!isCurrentMethod) {
                              setGeneratedMessage(null)
                              setMessageSubject(null)
                              setMessageMarkedAsContacted(false)
                              // Auto-generate message after switching
                              if (selectedCampaignLead?.lead) {
                                setTimeout(() => generatePersonalizedMessage(selectedCampaignLead.lead, 'phone'), 100)
                              }
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className={`flex items-center gap-2 transition-all ${isCurrentMethod ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : isUsed ? 'text-gray-500 hover:bg-gray-600/20 border border-gray-600/30' : 'text-gray-400 hover:bg-gray-500/20'}`}
                        >
                          <Phone className="h-4 w-4" />
                          <span className="text-xs sm:text-sm">Phone{isUsed && !isCurrentMethod ? ' ✓' : ''}</span>
                        </Button>
                      )
                    })()}
                    {selectedCampaignLead?.lead?.linkedin_profile && (() => {
                      const today = new Date().toDateString()
                      const isUsed = !!(selectedCampaignLead.lead?.business_name && 
                        localStorage.getItem(`method_used_${selectedCampaignLead.lead.business_name}_linkedin_${today}`))
                      const isCurrentMethod = messageType === 'linkedin'
                      
                      return (
                        <Button
                          onClick={async () => {
                            if (isUsed && !isCurrentMethod) {
                              toast.error('💼 LinkedIn message already generated for this lead today. Try a different method.')
                              return
                            }
                            setMessageType('linkedin')
                            if (!isCurrentMethod) {
                              setGeneratedMessage(null)
                              setMessageSubject(null)
                              // Auto-generate message after switching
                              if (selectedCampaignLead?.lead) {
                                setTimeout(() => generatePersonalizedMessage(selectedCampaignLead.lead, 'linkedin'), 100)
                              }
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className={`flex items-center gap-2 transition-all ${isCurrentMethod ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : isUsed ? 'text-gray-500 hover:bg-gray-600/20 border border-gray-600/30' : 'text-gray-400 hover:bg-gray-500/20'}`}
                        >
                          <Linkedin className="h-4 w-4" />
                          <span className="text-xs sm:text-sm">LinkedIn{isUsed && !isCurrentMethod ? ' ✓' : ''}</span>
                        </Button>
                      )
                    })()}
                    {selectedCampaignLead?.lead?.instagram_handle && (() => {
                      const today = new Date().toDateString()
                      const isUsed = !!(selectedCampaignLead.lead?.business_name && 
                        localStorage.getItem(`method_used_${selectedCampaignLead.lead.business_name}_instagram_${today}`))
                      const isCurrentMethod = messageType === 'instagram'
                      
                      return (
                        <Button
                          onClick={async () => {
                            if (isUsed && !isCurrentMethod) {
                              toast.error('📸 Instagram message already generated for this lead today. Try a different method.')
                              return
                            }
                            setMessageType('instagram')
                            if (!isCurrentMethod) {
                              setGeneratedMessage(null)
                              setMessageSubject(null)
                              // Auto-generate message after switching
                              if (selectedCampaignLead?.lead) {
                                setTimeout(() => generatePersonalizedMessage(selectedCampaignLead.lead, 'instagram'), 100)
                              }
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className={`flex items-center gap-2 transition-all ${isCurrentMethod ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : isUsed ? 'text-gray-500 hover:bg-gray-600/20 border border-gray-600/30' : 'text-gray-400 hover:bg-gray-500/20'}`}
                        >
                          <Instagram className="h-4 w-4" />
                          <span className="text-xs sm:text-sm">Instagram{isUsed && !isCurrentMethod ? ' ✓' : ''}</span>
                        </Button>
                      )
                    })()}
                    {selectedCampaignLead?.lead?.facebook_page && (() => {
                      const today = new Date().toDateString()
                      const isUsed = !!(selectedCampaignLead.lead?.business_name && 
                        localStorage.getItem(`method_used_${selectedCampaignLead.lead.business_name}_facebook_${today}`))
                      const isCurrentMethod = messageType === 'facebook'
                      
                      return (
                        <Button
                          onClick={async () => {
                            if (isUsed && !isCurrentMethod) {
                              toast.error('👥 Facebook message already generated for this lead today. Try a different method.')
                              return
                            }
                            setMessageType('facebook')
                            if (!isCurrentMethod) {
                              setGeneratedMessage(null)
                              setMessageSubject(null)
                              // Auto-generate message after switching
                              if (selectedCampaignLead?.lead) {
                                setTimeout(() => generatePersonalizedMessage(selectedCampaignLead.lead, 'facebook'), 100)
                              }
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className={`flex items-center gap-2 transition-all ${isCurrentMethod ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : isUsed ? 'text-gray-500 hover:bg-gray-600/20 border border-gray-600/30' : 'text-gray-400 hover:bg-gray-500/20'}`}
                        >
                          <Facebook className="h-4 w-4" />
                          <span className="text-xs sm:text-sm">Facebook{isUsed && !isCurrentMethod ? ' ✓' : ''}</span>
                        </Button>
                      )
                    })()}
                    {selectedCampaignLead?.lead?.twitter_handle && (() => {
                      const today = new Date().toDateString()
                      const isUsed = !!(selectedCampaignLead.lead?.business_name && 
                        (localStorage.getItem(`method_used_${selectedCampaignLead.lead.business_name}_x_${today}`) ||
                         localStorage.getItem(`method_used_${selectedCampaignLead.lead.business_name}_twitter_${today}`)))
                      const isCurrentMethod = messageType === 'x' || messageType === 'twitter'
                      
                      return (
                        <Button
                          onClick={async () => {
                            if (isUsed && !isCurrentMethod) {
                              toast.error('🐦 X/Twitter message already generated for this lead today. Try a different method.')
                              return
                            }
                            setMessageType('x')
                            if (!isCurrentMethod) {
                              setGeneratedMessage(null)
                              setMessageSubject(null)
                              // Auto-generate message after switching
                              if (selectedCampaignLead?.lead) {
                                setTimeout(() => generatePersonalizedMessage(selectedCampaignLead.lead, 'x'), 100)
                              }
                            }
                          }}
                          variant="ghost"
                          size="sm"
                          className={`flex items-center gap-2 transition-all ${isCurrentMethod ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : isUsed ? 'text-gray-500 hover:bg-gray-600/20 border border-gray-600/30' : 'text-gray-400 hover:bg-gray-500/20'}`}
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          <span className="text-xs sm:text-sm">X/Twitter{isUsed && !isCurrentMethod ? ' ✓' : ''}</span>
                        </Button>
                      )
                    })()}
                  </div>
                </div>
              </div>
              )}

              {messageType === 'phone' ? (
                // Enhanced Call Script Display
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-6 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-lg">
                          <Phone className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">AI Cold Call Script</h3>
                      </div>
                      {generatedMessage && (
                        <div className="flex gap-3">
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(generatedMessage)
                              setJustCopied(true)
                              setTimeout(() => setJustCopied(false), 2000)
                              toast.success('✅ Call script copied! Ready to make your call.')
                            }}
                            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            {justCopied ? 'Copied!' : 'Copy'}
                          </Button>
                          <Button
                            onClick={async () => {
                              setMessageMarkedAsContacted(true)
                              await updateCampaignLeadStatus(selectedCampaignLead!.id, 'contacted', messageType)
                              // Force reload campaign leads to ensure UI is in sync with database
                              await loadCampaignLeads()
                              toast.success('✅ Lead marked as contacted! Status updated.')
                              
                              // Handle bulk mode navigation
                              if (pendingOutreachQueue.length > 0) {
                                if (currentQueueIndex < pendingOutreachQueue.length - 1) {
                                  // Move to next lead in queue
                                  const newIndex = currentQueueIndex + 1
                                  setCurrentQueueIndex(newIndex)
                                  setSelectedCampaignLead(pendingOutreachQueue[newIndex])
                                  setShowOutreachOptions(true)
                                  toast.success('Lead marked as contacted! Moving to next lead...')
                                } else {
                                  // Reached end of queue
                                  setShowOutreachOptions(false)
                                  setPendingOutreachQueue([])
                                  setCurrentQueueIndex(0)
                                  toast.success('Lead marked as contacted! All pending leads processed!')
                                }
                              } else if (contactedFollowUpQueue.length > 0) {
                                if (currentFollowUpIndex < contactedFollowUpQueue.length - 1) {
                                  const newIndex = currentFollowUpIndex + 1
                                  setCurrentFollowUpIndex(newIndex)
                                  setSelectedCampaignLead(contactedFollowUpQueue[newIndex])
                                  setShowOutreachOptions(true)
                                  toast.success('Follow-up marked as sent! Moving to next lead...')
                                } else {
                                  setShowOutreachOptions(false)
                                  setContactedFollowUpQueue([])
                                  setCurrentFollowUpIndex(0)
                                  toast.success('Follow-up marked as sent! All follow-ups processed!')
                                }
                              } else {
                                toast.success(isFollowUpMode ? 'Follow-up sent!' : 'Lead marked as contacted!')
                              }
                            }}
                            className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {isFollowUpMode 
                              ? (contactedFollowUpQueue.length > 0 ? 'Mark Sent & Next' : 'Mark as Contacted')
                              : (pendingOutreachQueue.length > 0 ? 'Mark Contacted & Next' : 'Mark as Contacted')
                            }
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4 text-gray-300 whitespace-pre-wrap font-mono text-sm bg-[#1A1A1A] rounded-lg p-6 border border-[#333]">
                      {isGeneratingMessage ? (
                        <div className="text-center py-12">
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-gray-600/30 rounded-full animate-spin border-t-gray-400"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="h-6 w-6 text-gray-300" />
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-white mb-1">AI is crafting your call script...</div>
                              <div className="text-sm text-gray-400">Analyzing lead profile and industry insights</div>
                            </div>
                          </div>
                  </div>
                      ) : generatedMessage ? (
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-gray-600/10 to-gray-700/10 border border-gray-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-gray-300" />
                              <span className="text-gray-300 font-medium">Script Generated Successfully</span>
                            </div>
                            <p className="text-sm text-gray-400">AI-personalized for maximum impact and conversion</p>
                          </div>
                          <div className="text-gray-300 leading-relaxed">
                            {generatedMessage}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-gradient-to-r from-gray-600/20 to-gray-700/20 rounded-full">
                              <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-medium text-gray-300 mb-1">Your AI call script will appear here</div>
                              <div className="text-sm text-gray-500">Personalized for this specific lead</div>
                            </div>
                          </div>
                  </div>
                      )}
                  </div>
                  </div>
                </div>
              ) : (
                // Enhanced Message Display
                <div className="space-y-6">
                  {messageType === 'email' && messageSubject && (
                    <div className="space-y-3">
                      <Label className="text-gray-300 font-medium text-lg">Subject Line</Label>
                      <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4 shadow-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-lg">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                          <p className="text-gray-300 font-medium">{messageSubject}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-300 font-medium text-lg">AI Generated Message</Label>
                      {generatedMessage && (
                        <div className="flex gap-3">
                          <Button
                            onClick={() => {
                              const fullMessage = messageType === 'email' && messageSubject 
                                ? `Subject: ${messageSubject}\n\n${generatedMessage}`
                                : generatedMessage
                              
                              navigator.clipboard.writeText(fullMessage)
                              setJustCopied(true)
                              setTimeout(() => setJustCopied(false), 2000)
                              toast.success('✅ Message copied! Ready to send your outreach.')
                            }}
                            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            {justCopied ? 'Copied!' : 'Copy'}
                          </Button>
                          <Button
                            onClick={async () => {
                              setMessageMarkedAsContacted(true)
                              // Save the message to database and auto-update status
                              if (generatedMessage && selectedCampaignLead?.campaign_id) {
                                await saveOutreachMessage(
                                  selectedCampaignLead.campaign_id, 
                                  messageType, 
                                  messageSubject || '', 
                                  generatedMessage,
                                  selectedCampaignLead.id // Pass campaign_lead_id for auto-status update
                                )
                              }
                              // Force reload campaign leads to ensure UI is in sync with database
                              await loadCampaignLeads()
                              toast.success('✅ Lead marked as contacted! Status updated.')
                            }}
                            className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark as Contacted
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="bg-gradient-to-br from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-6 min-h-[300px] shadow-xl">
                      {isGeneratingMessage ? (
                        <div className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                              <div className="w-16 h-16 border-4 border-gray-600/30 rounded-full animate-spin border-t-gray-400"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="h-6 w-6 text-gray-300" />
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-semibold text-white mb-1">AI is crafting your message...</div>
                              <div className="text-sm text-gray-400">Analyzing lead profile and personalizing content</div>
                            </div>
                          </div>
                        </div>
                      ) : generatedMessage ? (
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-gray-600/10 to-gray-700/10 border border-gray-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-gray-300" />
                              <span className="text-gray-300 font-medium">Message Generated Successfully</span>
                            </div>
                            <p className="text-sm text-gray-400">AI-personalized for maximum engagement and response rate</p>
                          </div>
                          <div className="text-gray-300 whitespace-pre-wrap leading-relaxed bg-[#1A1A1A] rounded-lg p-4 border border-[#333]">
                            {generatedMessage}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-gradient-to-r from-gray-600/20 to-gray-700/20 rounded-full">
                              <MessageSquare className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-medium text-gray-300 mb-1">Your AI message will appear here</div>
                              <div className="text-sm text-gray-500">Personalized for this specific lead and platform</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  </div>
              )}
              
              {/* Bulk Navigation Controls (only show when in bulk mode) */}
              {(pendingOutreachQueue.length > 0 || contactedFollowUpQueue.length > 0) && (
                <div className="px-6 pt-4 border-t border-[#444]">
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        if (isFollowUpMode) {
                          if (currentFollowUpIndex > 0) {
                            const newIndex = currentFollowUpIndex - 1
                            setCurrentFollowUpIndex(newIndex)
                            setSelectedCampaignLead(contactedFollowUpQueue[newIndex])
                            // Clear any generated messages
                            setGeneratedMessage('')
                            setMessageSubject('')
                            setShowMessageComposer(false)
                            setShowOutreachOptions(true)
                          }
                        } else {
                          if (currentQueueIndex > 0) {
                            const newIndex = currentQueueIndex - 1
                            setCurrentQueueIndex(newIndex)
                            setSelectedCampaignLead(pendingOutreachQueue[newIndex])
                            // Clear any generated messages
                            setGeneratedMessage('')
                            setMessageSubject('')
                            setShowMessageComposer(false)
                            setShowOutreachOptions(true)
                          }
                        }
                      }}
                      disabled={isFollowUpMode ? currentFollowUpIndex === 0 : currentQueueIndex === 0}
                      variant="outline"
                      size="sm"
                      className="border-[#444] hover:bg-[#333] text-gray-300 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {isFollowUpMode ? 'Previous Follow-up' : 'Previous Lead'}
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (isFollowUpMode) {
                          if (currentFollowUpIndex < contactedFollowUpQueue.length - 1) {
                            const newIndex = currentFollowUpIndex + 1
                            setCurrentFollowUpIndex(newIndex)
                            setSelectedCampaignLead(contactedFollowUpQueue[newIndex])
                            // Clear any generated messages
                            setGeneratedMessage('')
                            setMessageSubject('')
                            setShowMessageComposer(false)
                            setShowOutreachOptions(true)
                          } else {
                            // Reached end of queue
                            setShowOutreachOptions(false)
                            setShowMessageComposer(false)
                            setContactedFollowUpQueue([])
                            setCurrentFollowUpIndex(0)
                            setIsFollowUpMode(false)
                            setGeneratedMessage('')
                            setMessageSubject('')
                            toast.success('All follow-ups processed!')
                          }
                        } else {
                          if (currentQueueIndex < pendingOutreachQueue.length - 1) {
                            const newIndex = currentQueueIndex + 1
                            setCurrentQueueIndex(newIndex)
                            setSelectedCampaignLead(pendingOutreachQueue[newIndex])
                            // Clear any generated messages
                            setGeneratedMessage('')
                            setMessageSubject('')
                            setShowMessageComposer(false)
                            setShowOutreachOptions(true)
                          } else {
                            // Reached end of queue
                            setShowOutreachOptions(false)
                            setShowMessageComposer(false)
                            setPendingOutreachQueue([])
                            setCurrentQueueIndex(0)
                            setGeneratedMessage('')
                            setMessageSubject('')
                            toast.success('All pending leads processed!')
                          }
                        }
                      }}
                      disabled={isFollowUpMode 
                        ? currentFollowUpIndex === contactedFollowUpQueue.length - 1
                        : currentQueueIndex === pendingOutreachQueue.length - 1
                      }
                      variant="outline"
                      size="sm"
                      className="border-[#444] hover:bg-[#333] text-gray-300 hover:text-white"
                    >
                      {isFollowUpMode ? 'Next Follow-up' : 'Next Lead'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setShowMessageComposer(false)
                        setShowOutreachOptions(false)
                        setPendingOutreachQueue([])
                        setCurrentQueueIndex(0)
                        setContactedFollowUpQueue([])
                        setCurrentFollowUpIndex(0)
                        setIsFollowUpMode(false)
                        setGeneratedMessage('')
                        setMessageSubject('')
                      }}
                      variant="outline"
                      size="sm"
                      className="border-[#444] hover:bg-[#333] text-gray-300 hover:text-white ml-auto"
                    >
                      <X className="h-4 w-4 mr-1" />
                      {isFollowUpMode ? 'Exit Follow-ups' : 'Exit Bulk Mode'}
                    </Button>
                  </div>
                  </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Warning Dialog - Closing without marking as contacted */}
        <Dialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
          <DialogContent className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-[#333] max-w-lg shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <span className="text-lg">Close Without Marking as Contacted?</span>
              </DialogTitle>
              <DialogDescription className="text-gray-300 mt-4">
                <div className="space-y-4">
                  <p className="text-gray-300 leading-relaxed text-sm">
                    You have a generated message that hasn't been marked as contacted. If you close now, <span className="font-semibold text-white">the lead's status will NOT be updated to "Contacted"</span> and you won't be able to track this outreach.
                  </p>
                  
                  <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-600/50 rounded-lg p-4">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium text-gray-200">Recommendation:</span> Click "Mark as Contacted" to properly track this outreach and update the lead's status.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button
                onClick={() => {
                  setShowCloseWarning(false)
                  // Don't close the message composer - let them go back
                }}
                className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 rounded-lg transition-all duration-200 whitespace-nowrap"
              >
                <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="truncate">Go Back & Mark as Contacted</span>
              </Button>
              
              <Button
                onClick={() => {
                  setShowCloseWarning(false)
                  setShowMessageComposer(false)
                  setMessageMarkedAsContacted(false)
                  setGeneratedMessage('')
                  setMessageSubject('')
                  toast.info('Message closed without updating lead status')
                }}
                variant="outline"
                className="flex-1 bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white font-medium py-3 rounded-lg transition-all duration-200"
              >
                Close Anyway
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
                                  item.has ? 'bg-white' : 'bg-[#2A2A2A]'
                                }`}></div>
                                <span className={item.has ? 'text-gray-300' : 'text-gray-500'}>
                                  {item.name}
                                </span>
                              </div>
                              <span className={`font-mono ${item.has ? 'text-gray-200' : 'text-gray-500'}`}>
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
                        <div className="text-gray-300">
                          • This lead needs significant data enrichment before outreach
                        </div>
                      )}
                      {!selectedScoreBreakdown.lead.email && (
                        <div>• Find email address for direct outreach (+18 points)</div>
                      )}
                      {!selectedScoreBreakdown.lead.phone && (
                        <div>• Locate phone number for call outreach (+17 points)</div>
                      )}
                      {!selectedScoreBreakdown.lead.website && (
                        <div>• Find business website for context (+10 points)</div>
                      )}
                      {!selectedScoreBreakdown.lead.owner_name && (
                        <div>• Identify business owner/decision maker (+10 points)</div>
                      )}
                      {(!selectedScoreBreakdown.lead.linkedin_profile && !selectedScoreBreakdown.lead.instagram_handle) && (
                        <div>• Research social media presence for personalization (+9-19 points)</div>
                      )}
                      {selectedScoreBreakdown.scoreData.total >= 80 && (
                        <div className="text-gray-200">
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

        {/* Score Manager Dialog */}
        <Dialog open={showScoreManager} onOpenChange={setShowScoreManager}>
          <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-400" />
                Lead Scoring System
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Manage and test your lead scoring algorithm
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-6">
              {/* Scoring Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-[#2A2A2A] border-[#444]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Award className="h-6 w-6 text-gray-300" />
                      <div>
                        <div className="text-lg font-semibold text-white">
                          {campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total >= 80).length}
                        </div>
                        <div className="text-sm text-gray-400">High Quality (80+)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-[#2A2A2A] border-[#444]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-6 w-6 text-gray-400" />
                      <div>
                        <div className="text-lg font-semibold text-white">
                          {campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total >= 60 && calculateLeadScore(cl.lead).total < 80).length}
                        </div>
                        <div className="text-sm text-gray-400">Medium Quality (60-79)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-[#2A2A2A] border-[#444]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingDown className="h-6 w-6 text-gray-500" />
                      <div>
                        <div className="text-lg font-semibold text-white">
                          {campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total < 60).length}
                        </div>
                        <div className="text-sm text-gray-400">Low Quality (&lt;60)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Scoring Rules */}
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-400" />
                  Scoring Algorithm
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-white mb-2">Contact Information (45 pts)</h4>
                      <div className="space-y-1 text-sm text-gray-300">
                        <div>• Email Address: 18 points</div>
                        <div>• Phone Number: 17 points</div>
                        <div>• Website: 10 points</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-white mb-2">Social Presence (30 pts)</h4>
                      <div className="space-y-1 text-sm text-gray-300">
                        <div>• Instagram: 10 points</div>
                        <div>• LinkedIn: 9 points</div>
                        <div>• Facebook: 8 points</div>
                        <div>• Twitter/X: 3 points</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-white mb-2">Business Info (15 pts)</h4>
                      <div className="space-y-1 text-sm text-gray-300">
                        <div>• Owner Name: 10 points</div>
                        <div>• Industry/Niche: 7 points</div>
                        <div>• Business Name: 5 points</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-white mb-2">Geographic (10 pts)</h4>
                      <div className="space-y-1 text-sm text-gray-300">
                        <div>• State/Province: 4 points</div>
                        <div>• City: 3 points</div>
                        <div>• Complete Location: +3 bonus</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>



              {/* Score Distribution Chart */}
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Score Distribution</h3>
                <div className="space-y-3">
                  {[
                    { range: '90-100', count: campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total >= 90).length, color: 'bg-gray-300' },
                    { range: '80-89', count: campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total >= 80 && calculateLeadScore(cl.lead).total < 90).length, color: 'bg-gray-400' },
                    { range: '70-79', count: campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total >= 70 && calculateLeadScore(cl.lead).total < 80).length, color: 'bg-gray-500' },
                    { range: '60-69', count: campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total >= 60 && calculateLeadScore(cl.lead).total < 70).length, color: 'bg-gray-600' },
                    { range: '0-59', count: campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total < 60).length, color: 'bg-gray-700' }
                  ].map((bucket) => (
                    <div key={bucket.range} className="flex items-center gap-3">
                      <div className="w-16 text-sm text-gray-300">{bucket.range}</div>
                      <div className="flex-1 bg-[#333] rounded-full h-6 relative">
                        <div 
                          className={`${bucket.color} h-6 rounded-full transition-all duration-500`}
                          style={{ width: `${campaignLeads.length > 0 ? (bucket.count / campaignLeads.length) * 100 : 0}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {bucket.count} leads
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Smart Response Dialog */}
        <Dialog open={showSmartResponse} onOpenChange={(open) => {
          setShowSmartResponse(open)
          if (!open) {
            // Clear bulk queue when closing
            setRespondedQueue([])
            setCurrentRespondedIndex(0)
            setIsRespondedMode(false)
          }
        }}>
          <DialogContent className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-[#333] w-[95vw] max-w-7xl h-[95vh] max-h-[900px] shadow-2xl flex flex-col overflow-hidden p-0">
            <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-[#333]">
              <DialogTitle className="text-white flex items-center gap-3 text-xl">
                <div className="p-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <span>{selectedCampaignLead?.lead?.business_name}</span>
                    {selectedCampaignLead?.lead?.niche_name && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-300">{selectedCampaignLead.lead.niche_name}</span>
                      </>
                    )}
                  </div>
                  {respondedQueue.length > 0 && (
                  <span className="text-sm text-gray-400 font-normal">
                      Response {currentRespondedIndex + 1} of {respondedQueue.length}
                  </span>
                  )}
                </div>
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                <div className="space-y-3 mt-2">
                  {selectedCampaignLead?.lead?.owner_name && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="h-4 w-4" />
                      <span>Owner: {selectedCampaignLead.lead.owner_name}</span>
                    </div>
                  )}
                  
                  {/* Lead Contact Information with Clickable Icons */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-600">
                    <span className="text-sm text-gray-400">Contact Options:</span>
                    <div className="flex items-center gap-2">
                      {selectedCampaignLead?.lead?.email && (
                        <Button
                          onClick={() => copyToClipboard(selectedCampaignLead.lead?.email!, 'Email', 'email-copy-smart')}
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 group transition-all duration-200 ${
                            copiedField === 'email-copy-smart' 
                              ? 'bg-green-500/20 border border-green-500/30' 
                              : 'hover:bg-blue-500/20'
                          }`}
                          title={copiedField === 'email-copy-smart' ? 'Copied!' : 'Copy Email'}
                        >
                          {copiedField === 'email-copy-smart' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400 animate-bounce" />
                          ) : (
                            <Mail className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                          )}
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.phone && (
                        <Button
                          onClick={() => copyToClipboard(selectedCampaignLead.lead?.phone!, 'Phone', 'phone-copy-smart')}
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 group transition-all duration-200 ${
                            copiedField === 'phone-copy-smart' 
                              ? 'bg-green-500/20 border border-green-500/30' 
                              : 'hover:bg-gray-500/20'
                          }`}
                          title={copiedField === 'phone-copy-smart' ? 'Copied!' : 'Copy Phone'}
                        >
                          {copiedField === 'phone-copy-smart' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400 animate-bounce" />
                          ) : (
                            <Phone className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                          )}
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.linkedin_profile && (
                        <Button
                          onClick={() => {
                            const url = selectedCampaignLead.lead?.linkedin_profile!.startsWith('http') 
                              ? selectedCampaignLead.lead?.linkedin_profile! 
                              : `https://linkedin.com/in/${selectedCampaignLead.lead?.linkedin_profile!}`
                            window.open(url, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-500/20 group"
                          title="Open LinkedIn"
                        >
                          <Linkedin className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.instagram_handle && (
                        <Button
                          onClick={() => {
                            const handle = selectedCampaignLead.lead?.instagram_handle!.replace('@', '')
                            window.open(`https://instagram.com/${handle}`, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-pink-500/20 group"
                          title="Open Instagram"
                        >
                          <Instagram className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.facebook_page && (
                        <Button
                          onClick={() => {
                            const url = selectedCampaignLead.lead?.facebook_page!.startsWith('http') 
                              ? selectedCampaignLead.lead?.facebook_page! 
                              : `https://facebook.com/${selectedCampaignLead.lead?.facebook_page!}`
                            window.open(url, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-500/20 group"
                          title="Open Facebook"
                        >
                          <Facebook className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.twitter_handle && (
                        <Button
                          onClick={() => {
                            const handle = selectedCampaignLead.lead?.twitter_handle!.replace('@', '')
                            window.open(`https://twitter.com/${handle}`, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-300/20 group"
                          title="Open X/Twitter"
                        >
                          <svg className="h-4 w-4 text-gray-300 group-hover:text-gray-200" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        </Button>
                      )}
                      {selectedCampaignLead?.lead?.website && (
                        <Button
                          onClick={() => {
                            const url = selectedCampaignLead.lead?.website!.startsWith('http') 
                              ? selectedCampaignLead.lead?.website! 
                              : `https://${selectedCampaignLead.lead?.website!}`
                            window.open(url, '_blank')
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-400/20 group"
                          title="Open Website"
                        >
                          <Globe className="h-4 w-4 text-gray-400 group-hover:text-gray-300" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            {/* Bulk Progress Bar (only show when in bulk mode) */}
            {respondedQueue.length > 0 && (
              <div className="px-6 py-4 border-b border-[#333]">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-medium text-sm">
                      Smart Response Progress
                    </span>
                    <span className="text-gray-200 bg-[#2A2A2A] px-3 py-1 rounded-full text-sm font-medium">
                      {currentRespondedIndex + 1} / {respondedQueue.length}
                    </span>
                  </div>
                  <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-gray-500 to-gray-400 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${((currentRespondedIndex + 1) / respondedQueue.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Two-Column Layout */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* LEFT COLUMN - Input Section */}
              <div className="overflow-y-auto border-r border-[#333] p-6 space-y-6">
              {/* AI Information Banner */}
              <div className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 border border-gray-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-600/30 rounded-lg">
                    <Zap className="h-5 w-5 text-gray-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-200 mb-1">
                      AI-Powered Response Generation
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Advanced AI analyzes their response context and generates strategic follow-up messages that maintain engagement while moving the conversation toward your business goals.
                    </p>
                  </div>
                </div>
              </div>

              {/* Platform Selection */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Which platform did they respond on?
                </h3>
                {(() => {
                  const availablePlatforms = getAvailablePlatforms()
                  const optimizedPlatforms = createPlatformGrid(availablePlatforms)
                  
                  // Always use single column layout for better mobile compatibility
                  // and to prevent clipping issues with multiple platforms
                  return (
                    <div className="space-y-3">
                      {optimizedPlatforms.map((platform) => (
                    <Button
                      key={platform.type}
                      onClick={() => setResponseMethod(platform.type as any)}
                      className={`w-full justify-start p-4 h-auto border transition-all duration-200 group ${
                        responseMethod === platform.type
                          ? 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500 text-white'
                          : 'bg-gradient-to-r from-[#2A2A2A] to-[#333] hover:from-[#333] hover:to-[#444] text-white border-[#444] hover:border-[#555]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg transition-all duration-200 ${
                            responseMethod === platform.type
                              ? 'bg-gray-500/30'
                              : 'bg-gray-600/30 group-hover:bg-gray-600/40'
                          }`}>
                            <platform.icon className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold">{platform.label}</div>
                            <div className="text-sm text-gray-400">{platform.description}</div>
                          </div>
                        </div>
                        {responseMethod === platform.type && (
                          <CheckCircle className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
                  )
                })()}
              </div>

              {/* Response Input */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-white">
                  Paste their response below:
                </Label>
                <div className="bg-gradient-to-br from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-6 shadow-lg">
                <Textarea
                  value={leadResponse}
                  onChange={(e) => setLeadResponse(e.target.value)}
                    placeholder="Paste their exact response here... For example:

'Thanks for reaching out! I'm interested in learning more about your services. Can you tell me about pricing and how this could help my business grow?'"
                    className="bg-[#1A1A1A] border-[#333] text-gray-300 min-h-[140px] resize-none rounded-lg focus:border-gray-300 transition-colors"
                  maxLength={2000}
                />
                  <div className="flex justify-between items-center mt-3">
                    <div className="text-xs text-gray-500">
                      Paste their exact message for the most accurate AI response
                    </div>
                    <div className="text-xs text-gray-400">
                  {leadResponse.length}/2000 characters
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={() => {
                  if (selectedCampaignLead?.lead) {
                    generateSmartResponse(leadResponse, responseMethod, selectedCampaignLead.lead)
                  }
                }}
                disabled={!leadResponse.trim() || leadResponse.length < 10 || isGeneratingSmartResponse}
                className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-4 rounded-lg text-lg transition-all duration-200 shadow-lg"
              >
                {isGeneratingSmartResponse ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    AI is analyzing their response and generating your reply...
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5 mr-3" />
                    Generate Smart Response with AI
                  </>
                )}
              </Button>

              {/* Security Notice & Rate Limit */}
              <div className="bg-gradient-to-r from-gray-800/30 to-gray-900/30 border border-gray-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm text-gray-300 mb-2">
                      <span className="font-medium">Security & Privacy:</span> All responses are filtered for security and appropriateness. Only business-related content is generated.
                    </div>
                    {smartResponsesRemaining !== null && (
                      <div className="text-xs text-gray-500">
                        {smartResponsesRemaining} smart responses remaining today
                      </div>
                    )}
                  </div>
                </div>
              </div>
              </div>
              
              {/* RIGHT COLUMN - Response Display */}
              <div className="overflow-y-auto p-6 bg-gradient-to-br from-[#1A1A1A]/50 to-[#2A2A2A]/50">
                {!generatedSmartResponse && !isGeneratingSmartResponse && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4 max-w-md">
                      <div className="p-4 bg-gradient-to-r from-gray-600/20 to-gray-700/20 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                        <MessageCircle className="h-10 w-10 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">
                          Your AI Response Will Appear Here
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          Fill in the details on the left and click "Generate Smart Response with AI" to create a personalized, strategic follow-up message.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {isGeneratingSmartResponse && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Loader2 className="h-12 w-12 animate-spin text-gray-400 mx-auto" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">
                          AI is Crafting Your Response...
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Analyzing context and generating strategic reply
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {generatedSmartResponse && (
                  <div className="space-y-4 h-full flex flex-col">
                    <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-600/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-gray-300" />
                        <span className="text-gray-300 font-medium">Smart Response Generated Successfully</span>
                      </div>
                      <p className="text-sm text-gray-400">AI-crafted response optimized for engagement and conversion</p>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      <Label className="text-lg font-semibold text-white mb-3">
                        Your AI-Generated Response:
                      </Label>
                      <div className="flex-1 bg-gradient-to-br from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-6 shadow-lg overflow-y-auto">
                        <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {generatedSmartResponse}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={() => {
                          copyToClipboard(generatedSmartResponse, 'Smart Response')
                          setSmartResponseCopied(true)
                          setTimeout(() => setSmartResponseCopied(false), 2000)
                        }}
                        className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200"
                      >
                        {smartResponseCopied ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2 text-gray-200" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Response
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Bulk Navigation Controls (only show when in bulk mode) */}
            {respondedQueue.length > 0 && (
              <div className="flex-shrink-0 px-6 py-4 border-t border-[#2A2A2A] bg-gradient-to-r from-[#1A1A1A] to-[#0f0f0f]">
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      if (currentRespondedIndex > 0) {
                        const newIndex = currentRespondedIndex - 1
                        setCurrentRespondedIndex(newIndex)
                        setSelectedCampaignLead(respondedQueue[newIndex])
                        // Clear any generated responses
                        setGeneratedSmartResponse('')
                        setLeadResponse('')
                      }
                    }}
                    disabled={currentRespondedIndex === 0}
                    variant="outline"
                    size="sm"
                    className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white disabled:opacity-50"
                  >
                    ← Previous
                  </Button>
                  
                  <Button
                    onClick={() => {
                      if (currentRespondedIndex < respondedQueue.length - 1) {
                        const newIndex = currentRespondedIndex + 1
                        setCurrentRespondedIndex(newIndex)
                        setSelectedCampaignLead(respondedQueue[newIndex])
                        // Clear any generated responses
                        setGeneratedSmartResponse('')
                        setLeadResponse('')
                      } else {
                        // Reached end of queue
                        setShowSmartResponse(false)
                        setRespondedQueue([])
                        setCurrentRespondedIndex(0)
                        setIsRespondedMode(false)
                        setGeneratedSmartResponse('')
                        setLeadResponse('')
                        toast.success('All responded leads processed!')
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                  >
                    {currentRespondedIndex < respondedQueue.length - 1 ? 'Skip to Next →' : 'Finish Responses'}
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setShowSmartResponse(false)
                      setRespondedQueue([])
                      setCurrentRespondedIndex(0)
                      setIsRespondedMode(false)
                      setGeneratedSmartResponse('')
                      setLeadResponse('')
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Exit Responses
                  </Button>
                </div>
              </div>
            )}
            </DialogContent>
          </Dialog>

        {/* Comprehensive Tutorial Modal */}
        <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
          <DialogContent className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-[#333] w-[95vw] max-w-4xl h-[95vh] max-h-[900px] shadow-2xl flex flex-col overflow-hidden p-0">
            <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-[#333]">
              <DialogTitle className="text-white flex items-center gap-3 text-2xl">
                <div className="p-2 bg-[#333] rounded-lg">
                  <Info className="h-6 w-6 text-gray-400" />
                </div>
                <span>Complete Outreach Tool Guide</span>
              </DialogTitle>
              <DialogDescription className="text-gray-300 text-lg">
                Master every feature and workflow to maximize your outreach success
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-8">
              {/* Overview Section */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-gray-400" />
                  Overview & Workflow
                </h3>
                <div className="bg-[#2A2A2A] border border-[#444] rounded-xl p-6">
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    The Outreach Tool is your command center for managing leads through the entire sales pipeline. 
                    Import leads from the Lead Generator, then systematically move them from pending → contacted → responded → qualified → signed.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-white">Lead Statuses:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CircleDot className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-300"><strong>Pending:</strong> Ready for initial outreach</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-300"><strong>Contacted:</strong> Outreach sent, awaiting response</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-300"><strong>Responded:</strong> They replied, needs smart response</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Star className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-300"><strong>Qualified:</strong> Ready for contract/proposal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-300"><strong>Signed:</strong> Deal closed successfully</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-white">Daily Limits:</h4>
                      <div className="space-y-2 text-sm text-gray-300">
                        <div>• <strong>25 AI messages</strong> per day total</div>
                        <div>• <strong>15 messages</strong> per hour max</div>
                        <div>• <strong>1 message per lead</strong> per method per day</div>
                        <div>• Smart responses: separate limit</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard & Analytics */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-gray-400" />
                  Dashboard & Analytics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3">Statistics Cards</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• <strong>Total Leads:</strong> All leads in your pipeline</div>
                      <div>• <strong>Pending:</strong> Awaiting initial outreach</div>
                      <div>• <strong>Contacted:</strong> Outreach sent + response rate</div>
                      <div>• <strong>Responded:</strong> Active conversations</div>
                      <div>• <strong>Qualified:</strong> Ready to close</div>
                      <div>• <strong>Conversion Rate:</strong> % of leads that signed</div>
                      <div>• <strong>AI Messages:</strong> Daily usage tracker</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3">Performance Tracking</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• Monitor response rates by platform</div>
                      <div>• Track conversion funnel progression</div>
                      <div>• Identify high-performing lead sources</div>
                      <div>• Optimize outreach timing & messaging</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Outreach Features */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-gray-400" />
                  Outreach Features
                </h3>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-gray-400" />
                      AI-Powered Message Generation
                    </h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• Click "Outreach" button for any pending lead</div>
                      <div>• AI analyzes business info, industry, location, social presence</div>
                      <div>• Generates personalized messages for each platform</div>
                      <div>• <strong>Available platforms:</strong> Email, Phone, LinkedIn, Instagram, Facebook, Twitter</div>
                      <div>• Platform selection based on lead's available contact methods</div>
                      <div>• Messages include compelling hooks, value propositions, clear CTAs</div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-gray-400" />
                      Bulk Outreach
                    </h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• Process multiple leads in sequence efficiently</div>
                      <div>• Click "Outreach All Pending" in Todo section</div>
                      <div>• Navigate through leads with Previous/Next buttons</div>
                      <div>• Skip leads or exit bulk mode anytime</div>
                      <div>• Progress tracking shows current lead number</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Smart Response System */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Brain className="h-5 w-5 text-gray-400" />
                  Smart Response System
                </h3>
                <div className="bg-[#2A2A2A] border border-[#444] rounded-xl p-6">
                  <h4 className="font-semibold text-white mb-3">When Leads Respond</h4>
                  <div className="space-y-3 text-sm text-gray-300">
                    <div>1. <strong>Update Status:</strong> Change lead to "Responded"</div>
                    <div>2. <strong>Click "Smart Response":</strong> Opens AI response generator</div>
                    <div>3. <strong>Select Platform:</strong> Choose where they responded (shows only available platforms)</div>
                    <div>4. <strong>Paste Response:</strong> Copy their exact message</div>
                    <div>5. <strong>Generate:</strong> AI analyzes context and creates strategic reply</div>
                    <div>6. <strong>Copy & Send:</strong> Use generated response to continue conversation</div>
                  </div>
                  <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg">
                    <p className="text-gray-300 text-sm">
                      <strong>Pro Tip:</strong> The AI considers their response sentiment, business context, and relationship stage to craft the most effective reply.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lead Management */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-400" />
                  Lead Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3">Filtering & Search</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• <strong>Quick Filters:</strong> Status buttons (All, Pending, etc.)</div>
                      <div>• <strong>Search Bar:</strong> Find by business name or owner</div>
                      <div>• <strong>Advanced Filters:</strong> Contact info, socials, location, scores</div>
                      <div>• <strong>Score Range:</strong> Filter by lead quality (0-100)</div>
                      <div>• <strong>Niche Filter:</strong> Industry-specific targeting</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3">Lead Actions</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• <strong>Status Updates:</strong> Move leads through pipeline</div>
                      <div>• <strong>Bulk Operations:</strong> Select multiple leads</div>
                      <div>• <strong>Delete Leads:</strong> Remove unqualified prospects</div>
                      <div>• <strong>Score Viewing:</strong> Click score to see breakdown</div>
                      <div>• <strong>Social Links:</strong> Direct access to profiles</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contract Generation */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  Contract Generation
                </h3>
                <div className="bg-[#2A2A2A] border border-[#444] rounded-xl p-6">
                  <h4 className="font-semibold text-white mb-3">Professional Contract System</h4>
                  <div className="space-y-3 text-sm text-gray-300">
                    <div>1. <strong>Qualify Leads:</strong> Update lead status to "Qualified" when ready to close</div>
                    <div>2. <strong>Generate Contract:</strong> Click "Generate Contract" button for qualified leads</div>
                    <div>3. <strong>Choose Pricing Model:</strong> Select between Monthly Retainer, Revenue Share, or Pay Per Lead</div>
                    <div>4. <strong>Configure Terms:</strong> Set pricing, contract length, payment terms, and services</div>
                    <div>5. <strong>Professional Download:</strong> Export as HTML format for PDF conversion</div>
                    <div>6. <strong>Digital Signatures:</strong> Automatic signature inclusion from Settings</div>
                  </div>
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-900/30 to-green-900/30 rounded-lg">
                    <p className="text-blue-200 text-sm">
                      <strong>Pricing Models:</strong> Monthly Retainer (fixed fee), Revenue Share (% of sales), or Pay Per Lead (perfect for roofing, landscaping, and local service businesses requiring qualified leads).
                    </p>
                  </div>
                </div>
              </div>

              {/* Lead Scoring */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-gray-400" />
                  Lead Scoring System
                </h3>
                <div className="bg-[#2A2A2A] border border-[#444] rounded-xl p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-white mb-3">Scoring Factors</h4>
                      <div className="space-y-2 text-sm text-gray-300">
                        <div>• <strong>Contact Info (40 pts):</strong> Email, phone availability</div>
                        <div>• <strong>Business Info (30 pts):</strong> Owner name, website quality</div>
                        <div>• <strong>Social Presence (20 pts):</strong> Active profiles</div>
                        <div>• <strong>Location (10 pts):</strong> Specific geography data</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-3">Score Ranges</h4>
                      <div className="space-y-2 text-sm text-gray-300">
                        <div>• <strong>90-100:</strong> Excellent (all info available)</div>
                        <div>• <strong>70-89:</strong> Good (most info available)</div>
                        <div>• <strong>50-69:</strong> Fair (basic info available)</div>
                        <div>• <strong>Below 50:</strong> Poor (limited info)</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg">
                    <p className="text-gray-300 text-sm">
                      <strong>Note:</strong> Use "Scoring" button to recalculate all scores or view detailed breakdowns.
                    </p>
                  </div>
                </div>
              </div>

              {/* Todo System */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-green-400" />
                  Smart Todo System
                </h3>
                <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-3">Automated Task Generation</h4>
                  <div className="space-y-3 text-sm text-gray-300">
                    <div>• <strong>High Priority:</strong> Responded leads needing immediate attention</div>
                    <div>• <strong>High Priority:</strong> Qualified leads ready for contracts</div>
                    <div>• <strong>Medium Priority:</strong> Pending leads needing initial outreach</div>
                    <div>• <strong>Medium Priority:</strong> Old contacted leads needing follow-up (7+ days)</div>
                    <div>• <strong>Quick Actions:</strong> Bulk processing shortcuts</div>
                    <div>• <strong>Progress Tracking:</strong> Mark tasks complete as you work</div>
                  </div>
                </div>
              </div>

              {/* Platform-Specific Actions */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-violet-400" />
                  Platform-Specific Guidance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Outreach
                      </h4>
                      <div className="text-sm text-gray-300">Professional, detailed messages with clear value propositions and meeting CTAs.</div>
                    </div>
                    <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Outreach
                      </h4>
                      <div className="text-sm text-gray-300">Conversational scripts for cold calling with objection handling.</div>
                    </div>
                    <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn Outreach
                      </h4>
                      <div className="text-sm text-gray-300">Professional networking messages focused on business growth.</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <Instagram className="h-4 w-4" />
                        Instagram DMs
                      </h4>
                      <div className="text-sm text-gray-300">Casual, visual-focused messages that feel authentic and engaging.</div>
                    </div>
                    <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <Facebook className="h-4 w-4" />
                        Facebook Messages
                      </h4>
                      <div className="text-sm text-gray-300">Community-focused outreach that builds local business relationships.</div>
                    </div>
                    <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <Twitter className="h-4 w-4" />
                        Twitter/X DMs
                      </h4>
                      <div className="text-sm text-gray-300">Concise, trend-aware messages that respect platform culture.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Practices */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-gray-400" />
                  Best Practices & Tips
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3">Outreach Strategy</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• Start with high-score leads (70+ points)</div>
                      <div>• Use different platforms for follow-ups</div>
                      <div>• Space messages 3-5 days apart</div>
                      <div>• Track response patterns by industry</div>
                      <div>• Personalize based on social media activity</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3">Response Management</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• Respond to interested leads within 2 hours</div>
                      <div>• Use Smart Response for consistent quality</div>
                      <div>• Move qualified leads to contract stage quickly</div>
                      <div>• Set follow-up reminders for warm leads</div>
                      <div>• Archive rejected leads to focus on active prospects</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-3">Contract & Closing</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• Upload signature in Settings for professional contracts</div>
                      <div>• Choose revenue share or pay-per-lead for performance-based deals</div>
                      <div>• Set realistic expectations in contract terms</div>
                      <div>• Send contracts within 24 hours of lead qualification</div>
                      <div>• Follow up if contract isn't signed within 3 days</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-400" />
                  Troubleshooting
                </h3>
                <div className="bg-gradient-to-r from-[#2A2A2A] to-[#3A3A3A] border border-[#444] rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-white mb-3">Common Issues</h4>
                      <div className="space-y-2 text-sm text-gray-300">
                        <div>• <strong>Rate Limits:</strong> Wait for reset or try different platforms</div>
                        <div>• <strong>No Platforms:</strong> Lead missing contact info</div>
                        <div>• <strong>Poor Quality:</strong> Recalculate lead scores</div>
                        <div>• <strong>Loading Issues:</strong> Use refresh button</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white mb-3">Quick Fixes</h4>
                      <div className="space-y-2 text-sm text-gray-300">
                        <div>• Clear browser cache if data seems stale</div>
                        <div>• Check console logs for platform detection issues</div>
                        <div>• Verify lead data completeness before outreach</div>
                        <div>• Use bulk operations for efficiency</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex justify-center p-6 border-t border-[#2A2A2A] bg-gradient-to-r from-[#1A1A1A] to-[#0f0f0f]">
              <Button
                onClick={() => setShowTutorial(false)}
                className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium py-3 px-8 rounded-lg"
              >
                Got It! Let's Start Outreaching
              </Button>
            </div>
          </DialogContent>
                 </Dialog>

        {/* Contract Generator Dialog */}
        <Dialog open={showContractGenerator} onOpenChange={(open) => {
          if (!open) resetContractEditor()
          setShowContractGenerator(open)
        }}>
          <DialogContent className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-[#333] w-[95vw] max-w-6xl h-[95vh] max-h-[900px] shadow-2xl flex flex-col overflow-hidden p-0">
            <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-[#333]">
              <DialogTitle className="text-white flex items-center gap-3 text-xl">
                <div className="p-2 bg-[#333] rounded-lg">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <span>
                  {contractEditingMode ? 'Edit Contract' : contractPreviewMode ? 'Contract Preview' : 'Generate Marketing Contract'}
                </span>
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                {contractEditingMode ? 'Edit the contract text before downloading' : 
                 contractPreviewMode ? 'Preview the final contract' :
                 `Create a professional digital marketing services agreement for ${selectedCampaignLead?.lead?.business_name}`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-6">
              {!contractEditingMode && !contractPreviewMode ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Contract Details */}
                <div className="space-y-6">
                  <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Contract Details</h3>
                    
                    <div className="space-y-4">
                      {/* Pricing Model Selection */}
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Pricing Model</Label>
                        <Select value={contractData.pricingModel} onValueChange={(value) => setContractData(prev => ({ ...prev, pricingModel: value }))}>
                          <SelectTrigger className="bg-[#1A1A1A] border-[#444] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1A1A] border-[#444]">
                            <SelectItem value="retainer">Monthly Retainer</SelectItem>
                            <SelectItem value="revenue_share">Revenue Share</SelectItem>
                            <SelectItem value="per_lead">Pay Per Lead</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Conditional Fields Based on Pricing Model */}
                      {contractData.pricingModel === 'retainer' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-400">
                              Monthly Retainer 
                              <span className="text-red-400 ml-1 text-xs">*</span>
                            </Label>
                            <Input
                              type="number"
                              placeholder="2500"
                              value={contractData.monthlyRetainer}
                              onChange={(e) => setContractData(prev => ({ ...prev, monthlyRetainer: e.target.value }))}
                              className={`bg-[#1A1A1A] border-[#444] text-white placeholder-gray-500 ${
                                flashingFields.includes('monthlyRetainer') 
                                  ? 'animate-pulse border-red-500 bg-red-900/20' 
                                  : ''
                              }`}
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-400">
                              Monthly Ad Spend 
                              <span className="text-red-400 ml-1 text-xs">*</span>
                            </Label>
                            <Input
                              type="number"
                              placeholder="5000"
                              value={contractData.adSpend}
                              onChange={(e) => setContractData(prev => ({ ...prev, adSpend: e.target.value }))}
                              className={`bg-[#1A1A1A] border-[#444] text-white placeholder-gray-500 ${
                                flashingFields.includes('adSpend') 
                                  ? 'animate-pulse border-red-500 bg-red-900/20' 
                                  : ''
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {contractData.pricingModel === 'revenue_share' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-400">
                              Revenue Share % 
                              <span className="text-red-400 ml-1 text-xs">*</span>
                            </Label>
                            <Input
                              type="number"
                              placeholder="15"
                              value={contractData.revenueSharePercentage}
                              onChange={(e) => setContractData(prev => ({ ...prev, revenueSharePercentage: e.target.value }))}
                              className={`bg-[#1A1A1A] border-[#444] text-white placeholder-gray-500 ${
                                flashingFields.includes('revenueSharePercentage') 
                                  ? 'animate-pulse border-red-500 bg-red-900/20' 
                                  : ''
                              }`}
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-400">Minimum Ad Spend (Optional)</Label>
                            <Input
                              type="number"
                              placeholder="2000"
                              value={contractData.minimumAdSpend}
                              onChange={(e) => setContractData(prev => ({ ...prev, minimumAdSpend: e.target.value }))}
                              className="bg-[#1A1A1A] border-[#444] text-white placeholder-gray-500"
                            />
                          </div>
                        </div>
                      )}

                      {contractData.pricingModel === 'per_lead' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-gray-400">
                                Price Per Lead 
                                <span className="text-red-400 ml-1 text-xs">*</span>
                              </Label>
                              <Input
                                type="number"
                                placeholder="50"
                                value={contractData.pricePerLead}
                                onChange={(e) => setContractData(prev => ({ ...prev, pricePerLead: e.target.value }))}
                                className={`bg-[#1A1A1A] border-[#444] text-white placeholder-gray-500 ${
                                  flashingFields.includes('pricePerLead') 
                                    ? 'animate-pulse border-red-500 bg-red-900/20' 
                                    : ''
                                }`}
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-gray-400">
                                Est. Monthly Leads 
                                <span className="text-red-400 ml-1 text-xs">*</span>
                              </Label>
                              <Input
                                type="number"
                                placeholder="20"
                                value={contractData.estimatedMonthlyLeads}
                                onChange={(e) => setContractData(prev => ({ ...prev, estimatedMonthlyLeads: e.target.value }))}
                                className={`bg-[#1A1A1A] border-[#444] text-white placeholder-gray-500 ${
                                  flashingFields.includes('estimatedMonthlyLeads') 
                                    ? 'animate-pulse border-red-500 bg-red-900/20' 
                                    : ''
                                }`}
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-400">Setup Fee (Optional)</Label>
                            <Input
                              type="number"
                              placeholder="500"
                              value={contractData.setupFee}
                              onChange={(e) => setContractData(prev => ({ ...prev, setupFee: e.target.value }))}
                              className="bg-[#1A1A1A] border-[#444] text-white placeholder-gray-500"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-400">
                              Lead Qualification Criteria 
                              <span className="text-red-400 ml-1 text-xs">*</span>
                            </Label>
                            <textarea
                              value={contractData.leadQualifications}
                              onChange={(e) => setContractData(prev => ({ ...prev, leadQualifications: e.target.value }))}
                              placeholder="e.g., Homeowners with properties built before 2010, located within 25 miles of contractor, with household income $50K+, expressing interest in roofing services"
                              className={`w-full min-h-[80px] bg-[#1A1A1A] border border-[#444] text-white rounded-md px-3 py-2 text-sm placeholder-gray-500 resize-y ${
                                flashingFields.includes('leadQualifications') 
                                  ? 'animate-pulse border-red-500 bg-red-900/20' 
                                  : ''
                              }`}
                              rows={3}
                            />
                            <p className="text-xs text-gray-500 mt-1">Define specific criteria that qualify a lead for payment</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-400">
                            Contract Length: {contractData.contractLength} months
                            <span className="text-red-400 ml-1 text-xs">*</span>
                          </Label>
                          <div className={`space-y-3 ${
                            flashingFields.includes('contractLength') 
                              ? 'animate-pulse' 
                              : ''
                          }`}>
                            <Slider
                              value={[parseInt(contractData.contractLength) || 6]}
                              onValueChange={(value) => setContractData(prev => ({ ...prev, contractLength: value[0].toString() }))}
                              max={36}
                              min={1}
                              step={1}
                              className="w-full"
                            />
                            <div className="flex flex-wrap gap-2">
                              {[3, 6, 12, 15, 24, 36].map(months => (
                                <Button
                                  key={months}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setContractData(prev => ({ ...prev, contractLength: months.toString() }))}
                                  className={`text-xs px-2 py-1 ${
                                    parseInt(contractData.contractLength) === months
                                      ? 'bg-gray-600 text-white border-gray-600'
                                      : 'bg-[#1A1A1A] border-[#444] text-gray-300 hover:bg-[#333]'
                                  } ${
                                    flashingFields.includes('contractLength') 
                                      ? 'border-red-500 bg-red-900/20' 
                                      : ''
                                  }`}
                                >
                                  {months}m
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">
                            Start Date
                            <span className="text-red-400 ml-1 text-xs">*</span>
                          </Label>
                          <Input
                            type="date"
                            value={contractData.startDate}
                            onChange={(e) => setContractData(prev => ({ ...prev, startDate: e.target.value }))}
                            className={`bg-[#1A1A1A] border-[#444] text-white ${
                              flashingFields.includes('startDate') 
                                ? 'animate-pulse border-red-500 bg-red-900/20' 
                                : ''
                            }`}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-400">
                            Payment Terms
                            <span className="text-red-400 ml-1 text-xs">*</span>
                          </Label>
                          <Select value={contractData.paymentTerms} onValueChange={(value) => setContractData(prev => ({ ...prev, paymentTerms: value }))}>
                            <SelectTrigger className={`bg-[#1A1A1A] border-[#444] text-white ${
                              flashingFields.includes('paymentTerms') 
                                ? 'animate-pulse border-red-500 bg-red-900/20' 
                                : ''
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1A1A1A] border-[#444]">
                              <SelectItem value="due-on-receipt">Due on Receipt</SelectItem>
                              <SelectItem value="net-15">Net 15 days</SelectItem>
                              <SelectItem value="net-30">Net 30 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-400">
                            Cancellation Notice (days)
                            <span className="text-red-400 ml-1 text-xs">*</span>
                          </Label>
                          <Input
                            type="number"
                            placeholder="30"
                            value={contractData.cancellationNotice}
                            onChange={(e) => setContractData(prev => ({ ...prev, cancellationNotice: e.target.value }))}
                            className={`bg-[#1A1A1A] border-[#444] text-white placeholder-gray-500 ${
                              flashingFields.includes('cancellationNotice') 
                                ? 'animate-pulse border-red-500 bg-red-900/20' 
                                : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`bg-[#2A2A2A] border border-[#444] rounded-lg p-4 ${
                    flashingFields.includes('servicesIncluded') 
                      ? 'animate-pulse border-red-500 bg-red-900/20' 
                      : ''
                  }`}>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Services Included 
                      <span className="text-red-400 ml-1 text-xs">*</span>
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(contractData.servicesIncluded).map(([service, included]) => (
                        <div key={service} className="flex items-center space-x-3">
                          <Checkbox
                            id={service}
                            checked={included}
                            onCheckedChange={(checked) => 
                              setContractData(prev => ({
                                ...prev,
                                servicesIncluded: { ...prev.servicesIncluded, [service]: checked as boolean }
                              }))
                            }
                              className="border-[#444] data-[state=checked]:bg-gray-600"
                          />
                          <label htmlFor={service} className="text-sm text-gray-300 cursor-pointer">
                            {service === 'metaAds' && 'Meta (Facebook/Instagram) Advertising Management'}
                            {service === 'creativeDesign' && 'Creative Design & Ad Copy'}
                            {service === 'analytics' && 'Analytics & Performance Tracking'}
                            {service === 'monthlyReports' && 'Monthly Performance Reports'}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Lead Information & Preview */}
                <div className="space-y-6">
                  <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Lead Information</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Business:</span>
                        <span className="text-white">{selectedCampaignLead?.lead?.business_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Owner:</span>
                        <span className="text-white">{selectedCampaignLead?.lead?.owner_name || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{selectedCampaignLead?.lead?.email || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Phone:</span>
                        <span className="text-white">{selectedCampaignLead?.lead?.phone || 'Not provided'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Location:</span>
                        <span className="text-white">
                          {selectedCampaignLead?.lead?.city ? `${selectedCampaignLead.lead.city}, ${selectedCampaignLead.lead.state_province || ''}` : 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Industry:</span>
                        <span className="text-white">{selectedCampaignLead?.lead?.niche_name || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Contract Summary</h3>
                    <div className="space-y-2 text-sm">
                        {contractData.pricingModel === 'retainer' ? (
                          <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Monthly Retainer:</span>
                        <span className="text-green-400">${contractData.monthlyRetainer || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Ad Spend Budget:</span>
                        <span className="text-green-400">${contractData.adSpend || '0'}</span>
                      </div>
                            <div className="pt-2 border-t border-[#444]">
                              <div className="flex justify-between font-semibold">
                                <span className="text-gray-400">Total Contract Value:</span>
                                <span className="text-gray-300">
                                  ${((parseInt(contractData.monthlyRetainer) || 0) * (parseInt(contractData.contractLength) || 0)).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Revenue Share:</span>
                              <span className="text-gray-300">{contractData.revenueSharePercentage || '0'}%</span>
                            </div>
                            {contractData.minimumAdSpend && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Minimum Ad Spend:</span>
                                <span className="text-gray-300">${contractData.minimumAdSpend}</span>
                              </div>
                            )}
                          </>
                        )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Contract Length:</span>
                        <span className="text-white">{contractData.contractLength} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Payment Terms:</span>
                        <span className="text-white">{contractData.paymentTerms.replace('-', ' ').toUpperCase()}</span>
                      </div>
                        </div>
                      </div>
                    </div>
                  </div>
              ) : contractEditingMode ? (
                /* Contract Editor */
                <div className="space-y-6">
                  <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Edit Contract</h3>
                </div>
                    
                    <div className="space-y-4">
                      <div className="bg-[#1A1A1A] border border-[#444] rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-300 mb-2">
                          <Edit className="h-4 w-4" />
                          <span className="font-medium">Editing Instructions</span>
              </div>
                        <p className="text-sm text-gray-400">
                          Edit the contract text below to customize it for your client. You can modify any section, add custom clauses, or update terms as needed. The contract will maintain professional formatting when downloaded.
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-400 mb-3 block">Contract Text</Label>
                        <textarea
                          value={editableContractText}
                          onChange={(e) => setEditableContractText(e.target.value)}
                          className="w-full h-96 bg-[#1A1A1A] border border-[#444] rounded-lg p-4 text-white text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                          placeholder="Contract text will appear here..."
                        />
                      </div>
                      
                      <div className="text-xs text-gray-500 bg-[#1A1A1A] border border-[#444] rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="h-3 w-3" />
                          <span className="font-medium">DocuSign Compatibility</span>
                        </div>
                        <p>This contract is formatted for DocuSign compatibility. Signature fields and professional styling will be applied automatically when you download the contract.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Contract Preview */
                <div className="space-y-6">
                  <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Contract Preview</h3>
                      <Button
                        onClick={() => {
                          setContractPreviewMode(false)
                          setContractEditingMode(true)
                        }}
                        variant="outline"
                        size="sm"
                        className="bg-[#1A1A1A] border-[#444] text-gray-300 hover:bg-[#333]"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                    
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: contractHtmlContent }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Independent Navigation Controls for Bulk Contract Mode */}
            {qualifiedContractQueue.length > 0 && (
              <div className="px-6 pt-4 border-t border-[#444] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    Contract {currentContractIndex + 1} of {qualifiedContractQueue.length}
                  </span>
                  <div className="w-48 bg-[#444] rounded-full h-2">
                    <div 
                      className="bg-gray-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentContractIndex + 1) / qualifiedContractQueue.length) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      if (currentContractIndex > 0) {
                        const newIndex = currentContractIndex - 1
                        setCurrentContractIndex(newIndex)
                        setSelectedCampaignLead(qualifiedContractQueue[newIndex])
                        // Reset states for new lead
                        resetContractEditor()
                      }
                    }}
                    disabled={currentContractIndex === 0}
                    variant="outline"
                    className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] disabled:opacity-50"
                  >
                    ← Previous
                  </Button>
                  
                  <Button
                    onClick={() => {
                      if (currentContractIndex < qualifiedContractQueue.length - 1) {
                        const newIndex = currentContractIndex + 1
                        setCurrentContractIndex(newIndex)
                        setSelectedCampaignLead(qualifiedContractQueue[newIndex])
                        // Reset states for new lead
                        resetContractEditor()
                      } else {
                        // Finished all contracts
                        setQualifiedContractQueue([])
                        setCurrentContractIndex(0)
                        setIsContractMode(false)
                        setShowContractGenerator(false)
                        toast.success(`Completed all contracts! Generated ${qualifiedContractQueue.length} contracts.`)
                      }
                    }}
                    className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white flex-1"
                  >
                    {currentContractIndex < qualifiedContractQueue.length - 1 ? 'Skip to Next →' : 'Finish Contracts'}
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setQualifiedContractQueue([])
                      setCurrentContractIndex(0)
                      setIsContractMode(false)
                      resetContractEditor()
                      setShowContractGenerator(false)
                      toast.success('Exited bulk contract generation')
                    }}
                    variant="outline"
                    className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333]"
                  >
                    ✕ Exit Contracts
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-shrink-0 flex justify-between items-center p-6 border-t border-[#2A2A2A] bg-gradient-to-r from-[#1A1A1A] to-[#0f0f0f]">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Info className="h-4 w-4" />
                <span>
                  {contractEditingMode ? 'Edit and download your contract' : 
                   contractPreviewMode ? 'Final preview - ready to download' :
                   'Professional contract with DocuSign compatibility'}
                </span>
              </div>
              <div className="flex gap-3">
                {/* Only show Cancel button when NOT in bulk mode */}
                {qualifiedContractQueue.length === 0 && (
                  <Button
                    onClick={() => {
                      resetContractEditor()
                      setShowContractGenerator(false)
                    }}
                    variant="outline"
                    className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                  >
                    Cancel
                  </Button>
                )}
                
                {!contractEditingMode && !contractPreviewMode && (
                  <Button
                    onClick={() => {
                      if (selectedCampaignLead?.lead) {
                        generateContractForEditing(selectedCampaignLead.lead)
                      }
                    }}
                    disabled={validateContractData().length > 0}
                    className="bg-[#FF2A2A] hover:bg-[#E02424] text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Contract
                  </Button>
                )}
                
                {(contractEditingMode || contractPreviewMode) && (
                  <>
                <Button
                  onClick={() => {
                    if (selectedCampaignLead?.lead) {
                      copyContractToClipboard(selectedCampaignLead.lead)
                    }
                  }}
                  variant="outline"
                      className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-gray-200"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={() => {
                    if (selectedCampaignLead?.lead) {
                      downloadContract(selectedCampaignLead.lead)
                    }
                  }}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white"
                >
                      <Download className="h-4 w-4 mr-2" />
                  Download Contract
                </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>




                    </div>
      </div>
    )
  } 