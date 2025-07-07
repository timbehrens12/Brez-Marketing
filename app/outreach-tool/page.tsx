"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
  Facebook, ChevronRight, Filter, RefreshCw, DollarSign,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Search, Trash2,
  XCircle, MessageCircle, MailOpen, PhoneCall, User,
  Share2, Globe, MapPin, Zap, CircleDot, CheckCircle2,
  Calculator, TrendingDown, Award, Settings, Info, ChevronUp, ChevronDown,
  CheckSquare, Square, Lightbulb, Brain, ArrowRight, X
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getAuthenticatedSupabaseClient, getStandardSupabaseClient } from '@/lib/utils/unified-supabase'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useAuth } from '@clerk/nextjs'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"

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

// Lead management constants
const MAX_PENDING_LEADS = 75 // Maximum pending leads allowed
const MAX_TOTAL_LEADS = 200 // Maximum total leads in outreach
const WARNING_THRESHOLD = 0.8 // Show warning at 80% of limit

export default function OutreachToolPage() {
  const { userId, getToken } = useAuth()
  const { agencySettings } = useAgency()
  const pathname = usePathname()
  
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

  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([])
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([])
  const [selectedCampaignLead, setSelectedCampaignLead] = useState<CampaignLead | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false)
  const [messageType, setMessageType] = useState<'email' | 'phone' | 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'x'>('email')
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [messageSubject, setMessageSubject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showMessageComposer, setShowMessageComposer] = useState(false)
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
  
  // AI Action Center state
  const [actionRecommendations, setActionRecommendations] = useState<ActionItem[]>([])
  const [isLoadingActions, setIsLoadingActions] = useState(false)
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())
  const [lastRecommendationRefresh, setLastRecommendationRefresh] = useState<string | null>(null)
  const [canRefreshRecommendations, setCanRefreshRecommendations] = useState(true)
  
  // Smart Response state
  const [showSmartResponse, setShowSmartResponse] = useState(false)
  const [leadResponse, setLeadResponse] = useState('')
  const [responseMethod, setResponseMethod] = useState<'email' | 'linkedin' | 'instagram' | 'facebook' | 'twitter'>('email')
  const [generatedSmartResponse, setGeneratedSmartResponse] = useState('')
  const [isGeneratingSmartResponse, setIsGeneratingSmartResponse] = useState(false)
  const [smartResponseCopied, setSmartResponseCopied] = useState(false)
  const [smartResponsesRemaining, setSmartResponsesRemaining] = useState<number | null>(null)
  
  // Bulk Outreach state
  const [showBulkOutreach, setShowBulkOutreach] = useState(false)
  const [pendingOutreachQueue, setPendingOutreachQueue] = useState<CampaignLead[]>([])
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  
  // Advanced filters state
  const [filters, setFilters] = useState<LeadFilters>({
    hasPhone: false,
    hasEmail: false,
    hasWebsite: false,
    hasSocials: false,
    socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
    selectedNicheFilter: [],
    statusFilter: 'all',
    minScore: 0
  })

  // Show loading state
  if (isLoadingPage) {
    const loadingConfig = getPageLoadingConfig(pathname)
    
    return (
      <UnifiedLoading
        variant="page"
        size="lg"
        message={loadingConfig.message}
        subMessage={loadingConfig.subMessage}
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
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

  useEffect(() => {
    if (userId) {
      loadInitialData()
    } else {
      // If no userId, set loading to false after short delay
      const timer = setTimeout(() => {
        setIsLoadingPage(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [userId])

  const loadInitialData = async () => {
    if (!userId) return
    
    try {
      setIsLoadingPage(true)
      setIsLoading(true)
      
      // Load campaigns and leads in parallel
      await Promise.all([
        loadCampaigns(),
        loadCampaignLeads()
      ])
      
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setIsLoadingPage(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (campaignLeads.length > 0 && campaigns.length > 0) {
      loadActionRecommendations(false)
    }
  }, [campaignLeads, campaigns])

  // Load cached data on mount
  useEffect(() => {
    if (userId) {
      const lastRefreshTime = localStorage.getItem(`last-recommendation-refresh-time-${userId}`)
      const cachedRecommendations = localStorage.getItem(`cached-recommendations-${userId}`)
      
      if (lastRefreshTime && cachedRecommendations) {
        const timestamp = parseInt(lastRefreshTime)
        const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000)
        
        setCanRefreshRecommendations(timestamp < twelveHoursAgo)
        setLastRecommendationRefresh(new Date(timestamp).toLocaleString())
        setActionRecommendations(JSON.parse(cachedRecommendations))
      }
    }
  }, [userId])

  // Check for daily refresh on component mount
  useEffect(() => {
    if (userId) {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format to match API
      const lastRefresh = localStorage.getItem(`last-recommendation-refresh-${userId}`)
      setLastRecommendationRefresh(lastRefresh)
      
      // If it's a new day, clear completed actions
      if (lastRefresh && lastRefresh !== today) {
        setCompletedActions(new Set())
        localStorage.removeItem(`completed-actions-${userId}`)
      }
    }
  }, [userId])

  // Set up automatic daily refresh check
  useEffect(() => {
    if (!userId) return

    const checkForNewDay = () => {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format to match API
      const lastRefresh = localStorage.getItem(`last-recommendation-refresh-${userId}`)
      
      // If it's a new day and we have campaigns/leads, refresh recommendations
      if (lastRefresh !== today && campaigns.length > 0 && campaignLeads.length > 0) {
        setCompletedActions(new Set()) // Clear completed actions for new day
        localStorage.removeItem(`completed-actions-${userId}`)
        loadActionRecommendations(true) // Force refresh for new day
        console.log('🌅 New day detected - refreshing AI recommendations')
      }
    }

    // Calculate milliseconds until next midnight
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0) // Set to midnight
    const msUntilMidnight = tomorrow.getTime() - now.getTime()

    // Set initial timeout for midnight, then check every hour after that
    const midnightTimeout = setTimeout(() => {
      checkForNewDay()
      
      // After midnight, check every hour in case user keeps app open
      const hourlyInterval = setInterval(checkForNewDay, 60 * 60 * 1000)
      
      // Cleanup function will clear this interval
      return () => clearInterval(hourlyInterval)
    }, msUntilMidnight)

    // Also check immediately on mount in case it's already a new day
    checkForNewDay()
    
    return () => clearTimeout(midnightTimeout)
  }, [userId, campaigns, campaignLeads])

  const loadCampaigns = async () => {
    if (!userId) return

    try {
      const supabase = await getSupabaseClient()
      
      let query = supabase
        .from('outreach_campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
      toast.error('Failed to load campaigns')
    }
  }

  const loadActionRecommendations = async (forceRefresh = false) => {
    if (!userId || campaigns.length === 0) return

    // Check if we can refresh (every 12 hours)
    const now = new Date()
    const lastRefreshTime = localStorage.getItem(`last-recommendation-refresh-time-${userId}`)
    const lastRefreshTimestamp = lastRefreshTime ? parseInt(lastRefreshTime) : 0
    const twelveHoursAgo = now.getTime() - (12 * 60 * 60 * 1000)
    
    const canRefresh = !lastRefreshTime || lastRefreshTimestamp < twelveHoursAgo
    setCanRefreshRecommendations(canRefresh)
    
    if (!forceRefresh && !canRefresh) {
      // Load from cache if available and can't refresh yet
      const cachedRecommendations = localStorage.getItem(`cached-recommendations-${userId}`)
      if (cachedRecommendations) {
        setActionRecommendations(JSON.parse(cachedRecommendations))
        setLastRecommendationRefresh(new Date(lastRefreshTimestamp).toLocaleString())
        return
      }
    }
    
    if (forceRefresh && !canRefresh) {
      const hoursUntilRefresh = Math.ceil((lastRefreshTimestamp + (12 * 60 * 60 * 1000) - now.getTime()) / (1000 * 60 * 60))
      toast.error(`Can only refresh every 12 hours. Try again in ${hoursUntilRefresh} hour${hoursUntilRefresh > 1 ? 's' : ''}.`)
      return
    }

    try {
      setIsLoadingActions(true)
      const activeCampaign = campaigns.find(c => c.status === 'active') || campaigns[0]
      
      if (!activeCampaign) return

      const response = await fetch('/api/ai/action-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaignId: activeCampaign.id, 
          userId 
        })
      })

      if (response.status === 429) {
        // Rate limited - already generated recently
        console.log('Recommendations already generated recently')
        return
      }

      if (!response.ok) throw new Error('Failed to load recommendations')

      const data = await response.json()
      setActionRecommendations(data.recommendations || [])
      
      // Store the refresh timestamp and cache the recommendations
      const refreshTime = now.getTime()
      localStorage.setItem(`last-recommendation-refresh-time-${userId}`, refreshTime.toString())
      localStorage.setItem(`cached-recommendations-${userId}`, JSON.stringify(data.recommendations || []))
      setLastRecommendationRefresh(now.toLocaleString())
      setCanRefreshRecommendations(false) // Can't refresh again for 12 hours
      
    } catch (error) {
      console.error('Error loading action recommendations:', error)
    } finally {
      setIsLoadingActions(false)
    }
  }

  const loadCampaignLeads = async () => {
    if (!userId) return

    try {
      const supabase = await getSupabaseClient()
      
      const { data: userCampaigns, error: campaignsError } = await supabase
        .from('outreach_campaigns')
        .select('id')
        .eq('user_id', userId)

      if (campaignsError) throw campaignsError

      if (!userCampaigns || userCampaigns.length === 0) {
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
      
      setCampaignLeads(data || [])
    } catch (error) {
      console.error('Error loading campaign leads:', error)
      toast.error('Failed to load campaign leads')
    }
  }

  const completeAction = async (actionId: string) => {
    try {
      const response = await fetch('/api/ai/action-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          actionId, 
          userId,
          campaignId: campaigns.find(c => c.status === 'active')?.id || campaigns[0]?.id
        })
      })

      if (!response.ok) throw new Error('Failed to complete action')

      // Add to completed actions set
      setCompletedActions(prev => new Set([...prev, actionId]))
      
      // Store in localStorage for persistence
      const completed = Array.from(completedActions)
      completed.push(actionId)
      localStorage.setItem(`completed-actions-${userId}`, JSON.stringify(completed))
      
      toast.success('Action marked as completed!')
    } catch (error) {
      console.error('Error completing action:', error)
      toast.error('Failed to complete action')
    }
  }

  // Load completed actions from localStorage on mount
  useEffect(() => {
    if (userId) {
      const stored = localStorage.getItem(`completed-actions-${userId}`)
      if (stored) {
        try {
          const completed = JSON.parse(stored)
          setCompletedActions(new Set(completed))
        } catch (error) {
          console.error('Error loading completed actions:', error)
        }
      }
    }
  }, [userId])

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

  const generatePersonalizedMessage = async (lead: Lead, method: string, retryCount = 0) => {
    setIsGeneratingMessage(true)
    setGeneratedMessage('') // Clear previous message
    setMessageSubject('') // Clear previous subject
    setJustCopied(false) // Reset copy state
    
    try {
      // Enhanced AI context with correct API format
      const aiContext = {
        lead: {
          ...lead,
          industry: lead.niche_name,
          location: `${lead.city}, ${lead.state_province}`.replace('undefined', '').replace(', ', ''),
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
          name: 'Your Agency',
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
          urgency: lead.lead_score && lead.lead_score > 70 ? 'medium' : 'low'
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
            errorMessage = `📅 Daily limit reached: You can generate up to 50 messages per day. Limit resets at midnight.`
          } else if (reason === 'LEAD_LIMIT') {
            errorMessage = `🚫 You've already generated 3 messages for this lead today. This prevents spam and maintains professional standards.`
          } else if (reason === 'COOLDOWN') {
            errorMessage = `⏱️ Please wait 30 seconds between message generations to prevent spam.`
          } else if (reason === 'COST_LIMIT') {
            errorMessage = `💰 Daily cost limit reached ($5.00). This prevents excessive API charges. Limit resets at midnight.`
          } else {
            // Generic 429 - try retry with exponential backoff
            if (retryCount < 2) {
              const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000 // 1-2s, 2-3s, 4-5s
              toast.loading(`Rate limited. Retrying in ${Math.ceil(delay/1000)} seconds...`)
              setTimeout(() => {
                generatePersonalizedMessage(lead, method, retryCount + 1)
              }, delay)
              return
            } else {
              errorMessage = `⚠️ Server is busy. Please wait a moment and try again.`
            }
          }
          
          toast.error(errorMessage)
          return
        }
        
        throw new Error(data.error || 'Failed to generate AI message')
      }

      setGeneratedMessage(data.message)
      setMessageSubject(data.subject || '')
      setMessageType(method as any)
      
      if (data.ai_generated) {
        toast.success('✨ Personalized message generated successfully!')
        
        // Show usage info if available
        if (data.usage?.messagesRemaining) {
          const { hourly, daily } = data.usage.messagesRemaining
          console.log(`📊 Messages remaining: ${hourly}/hour, ${daily}/day`)
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
          generatePersonalizedMessage(lead, method, retryCount + 1)
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

  const updateCampaignLeadStatus = async (campaignLeadId: string, newStatus: string) => {
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
      const supabase = await getSupabaseClient()
      
      if (newStatus === 'rejected') {
        // Delete the lead from outreach when marked as rejected
        const { error } = await supabase
          .from('outreach_campaign_leads')
          .delete()
          .eq('id', campaignLeadId)

        if (error) throw error
        
        setCampaignLeads(prev => prev.filter(cl => cl.id !== campaignLeadId))
        toast.success('Lead marked as rejected and removed from outreach!')
      } else {
        // Regular status update
      const { error } = await supabase
        .from('outreach_campaign_leads')
        .update({ 
          status: newStatus,
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignLeadId)

      if (error) throw error
      
        // Update state locally instead of reloading to prevent page jump
        setCampaignLeads(prev => prev.map(cl => 
          cl.id === campaignLeadId 
            ? { 
                ...cl, 
                status: newStatus as any, 
                last_contacted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            : cl
        ))
      toast.success('Status updated successfully!')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
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

  const copyToClipboard = async (text: string, type: string, fieldId?: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${type} copied to clipboard!`)
      
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
      case 'insight': return <Lightbulb className="h-4 w-4 text-yellow-400" />
      case 'optimization': return <TrendingUp className="h-4 w-4 text-green-400" />
      default: return <CircleDot className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-500/10'
      case 'medium': return 'border-yellow-500 bg-yellow-500/10'
      case 'low': return 'border-green-500 bg-green-500/10'
      default: return 'border-gray-500 bg-gray-500/10'
    }
  }

  const getFilteredActions = () => {
    return actionRecommendations.filter(action => !completedActions.has(action.id))
  }

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
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4">
      <div className="flex flex-col space-y-4">


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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 min-w-0">
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-white">{stats.totalLeads}</div>
                  <div>
                    <div className="text-sm font-medium text-gray-300">Total Leads</div>
                    <div className="text-xs text-gray-500">In pipeline</div>
                  </div>
                </div>
                <Users className="h-6 w-6 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-white">{stats.pending}</div>
                  <div>
                    <div className="text-sm font-medium text-gray-300">Pending</div>
                    <div className="text-xs text-gray-500">Need outreach</div>
                  </div>
                </div>
                <CircleDot className="h-6 w-6 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-white">{stats.contacted}</div>
                  <div>
                    <div className="text-sm font-medium text-gray-300">Contacted</div>
                    <div className="text-xs text-gray-500">{stats.responseRate}% response</div>
                  </div>
                </div>
                <MessageCircle className="h-6 w-6 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-white">{stats.responded}</div>
                  <div>
                    <div className="text-sm font-medium text-gray-300">Responded</div>
                    <div className="text-xs text-gray-500">Active conversations</div>
                  </div>
                </div>
                <MessageSquare className="h-6 w-6 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1A1A1A] border-[#333] hover:bg-[#222] transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-white">{stats.qualified}</div>
                  <div>
                    <div className="text-sm font-medium text-gray-300">Qualified</div>
                    <div className="text-xs text-gray-500">Ready to close</div>
                  </div>
                </div>
                <Star className="h-6 w-6 text-gray-400" />
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
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          
          {/* Enhanced Lead Pipeline - Takes up 4 columns */}
          <div className="xl:col-span-4 flex flex-col h-[calc(100vh-100px)]">
            <Card className="bg-[#1A1A1A] border-[#333] flex flex-col h-full">
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
                      onClick={() => setShowScoreManager(true)}
                      variant="outline"
                      size="sm"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Scoring
                    </Button>
                    <Button
                      onClick={() => setShowFilters(!showFilters)}
                      variant="outline"
                      size="sm"
                      className="bg-[#1A1A1A] text-gray-400 border-[#333] hover:bg-[#222] hover:text-white"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                      {(filters.hasPhone || filters.hasEmail || filters.hasWebsite || filters.hasSocials ||
                        filters.statusFilter !== 'all' || filters.selectedNicheFilter.length > 0 || filters.minScore > 0) && (
                        <Badge className="ml-2 bg-blue-600/20 text-blue-300" variant="secondary">
                          Active
                        </Badge>
                      )}
                    </Button>
                    <Button 
                      onClick={() => { loadCampaignLeads(); loadCampaigns(); }}
                      variant="outline" 
                      size="sm"
                      className="bg-[#1A1A1A] border-[#333] hover:bg-[#2A2A2A] text-gray-400 hover:text-white"
                    >
                      <RefreshCw className="h-4 w-4" />
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
                          ? 'bg-gray-600 text-white border-gray-600 hover:bg-gray-700'
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
                          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
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
                          ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
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
                          ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
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
                          ? 'bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700'
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
                          ? 'bg-green-700 text-white border-green-700 hover:bg-green-800'
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
                        onClick={() => setFilters({
                          hasPhone: false, hasEmail: false, hasWebsite: false, hasSocials: false,
                          socialPlatforms: { instagram: false, facebook: false, linkedin: false, twitter: false },
                          selectedNicheFilter: [], statusFilter: 'all', minScore: 0
                        })}
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
                            onClick={() => setFilters(prev => ({ ...prev, minScore: score }))}
                            variant={filters.minScore === score ? 'default' : 'outline'}
                            size="sm"
                            className={`h-8 text-xs ${
                              filters.minScore === score
                                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                                : 'bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white'
                            }`}
                          >
                            {score === 0 ? 'All' : `${score}+`}
                          </Button>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Showing leads with score {filters.minScore === 0 ? 'of any value' : `${filters.minScore} or higher`}
                      </div>
                    </div>
                    
                    {/* Contact Filters */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-400">Contact Methods</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="hasPhone"
                            checked={filters.hasPhone}
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasPhone: checked as boolean }))}
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
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasEmail: checked as boolean }))}
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
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasWebsite: checked as boolean }))}
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
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasSocials: checked as boolean }))}
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
                    {filters.hasSocials && (
                      <div className="ml-6 p-3 bg-[#333]/30 rounded-lg border border-[#555]">
                        <Label className="text-xs font-medium text-gray-500 mb-2 block">Social Platform Filters</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="socialInstagram"
                              checked={filters.socialPlatforms.instagram}
                              onCheckedChange={(checked) => setFilters(prev => ({ 
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
                              checked={filters.socialPlatforms.facebook}
                              onCheckedChange={(checked) => setFilters(prev => ({ 
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
                              checked={filters.socialPlatforms.linkedin}
                              onCheckedChange={(checked) => setFilters(prev => ({ 
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
                              checked={filters.socialPlatforms.twitter}
                              onCheckedChange={(checked) => setFilters(prev => ({ 
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
                              <label htmlFor={`niche-${nicheName}`} className="text-sm text-gray-400 cursor-pointer">
                                {nicheName || 'Unknown'}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                          Clear Selection
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
                                        copiedField === `email-${campaignLead.id}` ? 'text-green-400' : ''
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
                                        copiedField === `phone-${campaignLead.id}` ? 'text-green-400' : ''
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
                                      className="relative z-10 text-pink-500 hover:text-pink-400 hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-pink-500/50 hover:z-20"
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
                                      className="relative z-10 text-blue-500 hover:text-blue-400 hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-blue-500/50 hover:z-20"
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
                                      className="relative z-10 text-blue-600 hover:text-blue-500 hover:scale-110 p-1 rounded transition-all duration-200 bg-[#2A2A2A] border border-[#444] hover:border-blue-600/50 hover:z-20"
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
                              <div className="text-sm text-gray-400">
                                {campaignLead.last_contacted_at ? (
                                  <div>
                                    <div>{new Date(campaignLead.last_contacted_at).toLocaleDateString()}</div>
                                    <div className="text-xs text-gray-500">
                                      {Math.floor((Date.now() - new Date(campaignLead.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24))} days ago
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">Never</span>
                              )}
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
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                                  onClick={() => {
                                    setSelectedCampaignLead(campaignLead)
                                    setShowOutreachOptions(true)
                                  }}
                                  disabled={outreachMethods.length === 0}
                                >
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Outreach ({outreachMethods.length})
                                </Button>
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

                    {/* AI Outreach Assistant */}
          <div className="xl:col-span-1 h-[calc(100vh-100px)]">
            <Card className="bg-[#1A1A1A] border-[#333] h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-white">Outreach Tasks</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    {isLoadingActions ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : lastRecommendationRefresh ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span>Last updated: {lastRecommendationRefresh}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        <span>Click refresh to load</span>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => loadActionRecommendations(true)}
                      className={`p-1 h-5 w-5 ml-1 ${canRefreshRecommendations ? 'text-gray-400 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                      title={canRefreshRecommendations ? "Refresh recommendations now" : "Can only refresh every 12 hours"}
                      disabled={isLoadingActions || !canRefreshRecommendations}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-gray-400">
                  Smart outreach recommendations based on your pipeline
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {isLoadingActions ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Analyzing pipeline...</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getFilteredActions().length === 0 ? (
                      <div className="p-4 text-center">
                        <Target className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <h4 className="text-sm font-medium text-white mb-1">Pipeline Analysis</h4>
                        <p className="text-xs text-gray-400 mb-3">
                          {stats.totalLeads === 0 
                            ? "Add leads to get AI-powered outreach recommendations"
                            : "Your pipeline is up to date. Keep monitoring for new opportunities."
                          }
                        </p>
                        <div className="text-xs text-gray-500 bg-[#2A2A2A] p-2 rounded">
                          💡 AI recommendations refresh automatically at midnight based on your latest pipeline data
                        </div>
                      </div>
                    ) : (
                      getFilteredActions()
                        .sort((a, b) => {
                          const priorityOrder = { high: 3, medium: 2, low: 1 }
                          return priorityOrder[b.priority as keyof typeof priorityOrder] - 
                                 priorityOrder[a.priority as keyof typeof priorityOrder]
                        })
                        .map((action) => (
                          <div 
                            key={action.id} 
                            className="p-3 bg-[#2A2A2A] border border-[#444] rounded-lg hover:bg-[#333] transition-all"
                          >
                            <div className="flex items-start gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-white text-sm">
                                    {action.title}
                                  </h4>
                                  {action.priority === 'high' && (
                                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed mb-2">
                                  {action.description}
                                </p>
                                {action.leads && action.leads.length > 0 && (
                                  <div className="mb-2">
                                    <div className="text-xs text-gray-500 mb-1">
                                      {action.leads.length} lead{action.leads.length > 1 ? 's' : ''}:
                                    </div>
                                    <div className="space-y-1">
                                      {action.leads.slice(0, 3).map((leadName, idx) => (
                                        <div key={idx} className="text-xs text-gray-300 bg-[#1A1A1A] px-2 py-1 rounded">
                                          {leadName}
                                        </div>
                                      ))}
                                      {action.leads.length > 3 && (
                                        <div className="text-xs text-gray-500">
                                          +{action.leads.length - 3} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  completeAction(action.id);
                                  // Show a brief success indication
                                  const button = document.activeElement as HTMLButtonElement;
                                  if (button) {
                                    button.style.color = '#10b981';
                                    setTimeout(() => {
                                      button.style.color = '';
                                    }, 1000);
                                  }
                                }}
                                className="p-1 h-6 w-6 text-gray-400 hover:text-green-400 hover:bg-green-500/10 flex-shrink-0 transition-colors"
                                title="Mark as completed"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full text-xs bg-[#444] hover:bg-[#555] text-gray-300 hover:text-white"
                              onClick={() => {
                                // Perform real outreach actions based on the action type
                                const actionText = action.action.toLowerCase();
                                if (actionText.includes('start outreach') || actionText.includes('send message')) {
                                  // Find pending leads and start outreach for the first one
                                  const pendingLeads = campaignLeads.filter(lead => lead.status === 'pending');
                                  if (pendingLeads.length > 0) {
                                    setFilters(prev => ({ ...prev, statusFilter: 'pending' }));
                                    setSelectedCampaignLead(pendingLeads[0]);
                                    setShowOutreachOptions(true);
                                  } else {
                                    toast.error('No pending leads found to start outreach');
                                  }
                                } else if (actionText.includes('follow-up') || actionText.includes('follow up')) {
                                  // Find contacted leads and start follow-up for the first one
                                  const contactedLeads = campaignLeads.filter(lead => lead.status === 'contacted');
                                  if (contactedLeads.length > 0) {
                                    setFilters(prev => ({ ...prev, statusFilter: 'contacted' }));
                                    setSelectedCampaignLead(contactedLeads[0]);
                                    setShowOutreachOptions(true);
                                  } else {
                                    toast.error('No contacted leads found for follow-up');
                                  }
                                } else if (actionText.includes('send proposal') || actionText.includes('proposal')) {
                                  // Find qualified leads and start proposal for the first one
                                  const qualifiedLeads = campaignLeads.filter(lead => lead.status === 'qualified');
                                  if (qualifiedLeads.length > 0) {
                                    setFilters(prev => ({ ...prev, statusFilter: 'qualified' }));
                                    setSelectedCampaignLead(qualifiedLeads[0]);
                                    setShowOutreachOptions(true);
                                  } else {
                                    toast.error('No qualified leads found for proposals');
                                  }
                                } else if (actionText.includes('review') || actionText.includes('check') || actionText.includes('schedule')) {
                                  // Filter to the relevant status for review
                                  const titleText = action.title.toLowerCase();
                                  if (titleText.includes('responded')) {
                                    setFilters(prev => ({ ...prev, statusFilter: 'responded' }));
                                  } else if (titleText.includes('qualified')) {
                                    setFilters(prev => ({ ...prev, statusFilter: 'qualified' }));
                                  } else if (titleText.includes('high-score') || titleText.includes('high-value')) {
                                    setFilters(prev => ({ ...prev, statusFilter: 'pending', minScore: 80 }));
                                  }
                                } else {
                                  // Default filter behavior
                                  if (action.type === 'urgent' && action.title.includes('Follow-up')) {
                                    setFilters(prev => ({ ...prev, statusFilter: 'contacted' }));
                                  } else if (action.title.includes('responded')) {
                                    setFilters(prev => ({ ...prev, statusFilter: 'responded' }));
                                  } else if (action.title.includes('qualified')) {
                                    setFilters(prev => ({ ...prev, statusFilter: 'qualified' }));
                                  } else if (action.title.includes('High-score')) {
                                    setFilters(prev => ({ ...prev, statusFilter: 'pending', minScore: 80 }));
                                  }
                                }
                              }}
                            >
                              {action.action}
                            </Button>
                          </div>
                        ))
                    )}

                    {/* Quick Actions */}
                    <div className="pt-3 border-t border-[#333]">
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
                              minScore: 80
                            });
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          <Star className="h-3 w-3 mr-2" />
                          View High-Score Leads
                        </Button>
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
                              statusFilter: 'responded',
                              minScore: 0
                            });
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          <MessageSquare className="h-3 w-3 mr-2" />
                          Hot Conversations
                        </Button>
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
                              statusFilter: 'contacted',
                              minScore: 0
                            });
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          <Clock className="h-3 w-3 mr-2" />
                          Follow-up Needed
                        </Button>
                        <Button
                          onClick={() => {
                            const pendingLeads = campaignLeads.filter(lead => lead.status === 'pending');
                            if (pendingLeads.length > 0) {
                              setPendingOutreachQueue(pendingLeads);
                              setCurrentQueueIndex(0);
                              setShowBulkOutreach(true);
                            } else {
                              toast.error('No pending leads found');
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs bg-[#2A2A2A] border-[#444] text-gray-400 hover:bg-[#333] hover:text-white"
                        >
                          <Zap className="h-3 w-3 mr-2" />
                          Outreach All Pending ({stats.pending})
                        </Button>
                      </div>
                    </div>

                    {/* Update Info & Stats */}
                    <div className="pt-3 border-t border-[#333] space-y-2">
                      {completedActions.size > 0 && (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <CheckSquare className="h-3 w-3" />
                          <span>{completedActions.size} tasks completed today</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 bg-[#2A2A2A] p-2 rounded">
                        🔄 AI recommendations refresh every 12 hours • Click {' '}
                        <RefreshCw className="h-3 w-3 inline" /> {canRefreshRecommendations ? 'to refresh now' : 'when available'}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Outreach Options Dialog */}
        <Dialog open={showOutreachOptions} onOpenChange={setShowOutreachOptions}>
          <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-gray-400" />
                Outreach Options
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                <div className="space-y-1">
                  <span className="font-medium text-gray-300">{selectedCampaignLead?.lead?.business_name}</span>
                {selectedCampaignLead?.lead?.owner_name && (
                    <span className="block">Owner: {selectedCampaignLead.lead.owner_name}</span>
                )}
                  {selectedCampaignLead?.lead?.niche_name && (
                    <span className="block">Industry: {selectedCampaignLead.lead.niche_name}</span>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 py-4">
              <div className="text-xs text-gray-400 mb-3 p-2 bg-[#2A2A2A] rounded">
                📋 Generate personalized outreach content based on this lead's profile, industry, and social presence.
              </div>
              
              {selectedCampaignLead && selectedCampaignLead.lead && getOutreachMethods(selectedCampaignLead.lead).map((method) => {
                const methodLabel = method.type === 'email' ? 'Email Outreach' :
                  method.type === 'phone' ? 'Cold Call Script' :
                  method.type === 'linkedin' ? 'LinkedIn Message' :
                  method.type === 'instagram' ? 'Instagram DM' :
                  method.type === 'facebook' ? 'Facebook Message' : method.label
                
                const recommendation = method.type === 'email' ? 
                  'Direct & professional - highest response rates' : 
                  method.type === 'phone' ? 
                  'Immediate connection - qualify leads instantly' :
                  method.type === 'linkedin' ?
                  'Generate LinkedIn AI message' :
                  method.type === 'instagram' ?
                  'Generate Instagram AI message' :
                  method.type === 'facebook' ?
                  'Generate Facebook AI message' :
                  method.type === 'twitter' || method.type === 'x' ?
                  'Generate Twitter AI message' :
                  'Generate AI message'
                  
                return (
                <Button
                  key={method.type}
                  onClick={() => {
                    setShowOutreachOptions(false)
                    setShowMessageComposer(true)
                    setMessageType(method.type as any)
                    if (selectedCampaignLead.lead) {
                      generatePersonalizedMessage(selectedCampaignLead.lead, method.type)
                    }
                  }}
                    className="w-full bg-[#2A2A2A] hover:bg-[#333] text-white justify-start p-4 h-auto"
                >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <method.icon className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">{methodLabel}</div>
                          <div className="text-xs text-gray-400 mt-1">{recommendation}</div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                </Button>
                )
              })}
          </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Message Composer Dialog */}
        <Dialog open={showMessageComposer} onOpenChange={setShowMessageComposer}>
          <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                {messageType === 'email' && <Mail className="h-5 w-5 text-gray-400" />}
                {messageType === 'phone' && <Phone className="h-5 w-5 text-gray-400" />}
                {messageType === 'linkedin' && <Linkedin className="h-5 w-5 text-gray-400" />}
                {messageType === 'instagram' && <Instagram className="h-5 w-5 text-gray-400" />}
                {messageType === 'facebook' && <Facebook className="h-5 w-5 text-gray-400" />}
                {(messageType === 'twitter' || messageType === 'x') && (
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                )}
                {messageType === 'phone' ? 'Cold Call Script' : 
                 messageType === 'email' ? 'Email Outreach' :
                 messageType === 'linkedin' ? 'LinkedIn Message' :
                 messageType === 'instagram' ? 'Instagram DM' :
                 messageType === 'facebook' ? 'Facebook Message' :
                 (messageType === 'twitter' || messageType === 'x') ? 'X/Twitter DM' :
                 'Outreach Message'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedCampaignLead?.lead?.business_name} - {selectedCampaignLead?.lead?.owner_name || 'No owner info'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6">
              {messageType === 'phone' ? (
                // Call Script Display
              <div className="space-y-4">
                  <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-300 mb-4">Call Script</h3>
                    <div className="space-y-4 text-gray-300 whitespace-pre-wrap font-mono text-sm">
                      {isGeneratingMessage ? (
                        <div className="text-center py-8 text-gray-500">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                          Generating personalized call script...
                  </div>
                      ) : generatedMessage ? (
                        generatedMessage
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-gray-400">Call script will appear here...</div>
                  </div>
                      )}
                  </div>
                  </div>
                  {generatedMessage && (
                  <Button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedMessage)
                          setJustCopied(true)
                          setTimeout(() => setJustCopied(false), 2000)
                          toast.success('✅ Call script copied! Ready to make your call.')
                      }}
                  className="w-full bg-[#444] hover:bg-[#555] text-white"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {justCopied ? 'Copied!' : 'Copy Script'}
                  </Button>
                )}
              </div>
              ) : (
                // Message Display
              <div className="space-y-4">
                  {messageType === 'email' && messageSubject && (
                  <div>
                      <Label className="text-gray-400 mb-2">Subject Line</Label>
                      <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-3">
                        <p className="text-gray-300">{messageSubject}</p>
                      </div>
                    </div>
                  )}

                <div>
                    <Label className="text-gray-400 mb-2">Message</Label>
                    <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4 min-h-[200px]">
                      {isGeneratingMessage ? (
                        <div className="text-center py-8 text-gray-500">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                          Generating personalized message...
                        </div>
                      ) : generatedMessage ? (
                        <p className="text-gray-300 whitespace-pre-wrap">{generatedMessage}</p>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-gray-400">Message will appear here...</div>
                        </div>
                      )}
                    </div>
                  </div>

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
                        className="flex-1 bg-[#444] hover:bg-[#555] text-white"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {justCopied ? 'Copied!' : 'Copy Message'}
                  </Button>
                  <Button
                        onClick={() => {
                          updateCampaignLeadStatus(selectedCampaignLead!.id, 'contacted')
                          setShowMessageComposer(false)
                          toast.success('Lead marked as contacted!')
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                        Mark as Sent
                    </Button>
                    </div>
                  )}
                  </div>
              )}
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
                      <Award className="h-6 w-6 text-yellow-400" />
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
                      <TrendingUp className="h-6 w-6 text-blue-400" />
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
                      <TrendingDown className="h-6 w-6 text-red-400" />
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

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={recalculateAllScores}
                  disabled={isRecalculatingScores}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isRecalculatingScores ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recalculating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Recalculate All Scores
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => {
                    // Show sample scoring for testing
                    const sampleLead: Lead = {
                      id: 'sample',
                      business_name: 'Test Business Inc.',
                      owner_name: 'John Smith',
                      email: 'john@testbusiness.com',
                      phone: '+1-555-123-4567',
                      website: 'https://testbusiness.com',
                      city: 'New York',
                      state_province: 'NY',
                      niche_name: 'Technology',
                      instagram_handle: '@testbusiness',
                      linkedin_profile: 'https://linkedin.com/company/testbusiness',
                      facebook_page: 'https://facebook.com/testbusiness',
                      twitter_handle: '@testbiz'
                    }
                    
                    const scoreData = calculateLeadScore(sampleLead)
                    setSelectedScoreBreakdown({ lead: sampleLead, scoreData })
                    setShowScoreBreakdown(true)
                    setShowScoreManager(false)
                  }}
                  variant="outline"
                  className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Test Perfect Score
                </Button>
              </div>

              {/* Score Distribution Chart */}
              <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Score Distribution</h3>
                <div className="space-y-3">
                  {[
                    { range: '90-100', count: campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total >= 90).length, color: 'bg-green-500' },
                    { range: '80-89', count: campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total >= 80 && calculateLeadScore(cl.lead).total < 90).length, color: 'bg-blue-500' },
                    { range: '70-79', count: campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total >= 70 && calculateLeadScore(cl.lead).total < 80).length, color: 'bg-yellow-500' },
                    { range: '60-69', count: campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total >= 60 && calculateLeadScore(cl.lead).total < 70).length, color: 'bg-orange-500' },
                    { range: '0-59', count: campaignLeads.filter(cl => cl.lead && calculateLeadScore(cl.lead).total < 60).length, color: 'bg-red-500' }
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
        <Dialog open={showSmartResponse} onOpenChange={setShowSmartResponse}>
          <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Brain className="h-5 w-5 text-gray-400" />
                Smart Response Generator
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedCampaignLead?.lead?.business_name && (
                  <>Generate a smart response for <span className="text-white">{selectedCampaignLead.lead.business_name}</span></>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-6">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">They responded on:</Label>
                <Select value={responseMethod} onValueChange={(value: any) => setResponseMethod(value)}>
                  <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-[#333]">
                    <SelectItem value="email">📧 Email</SelectItem>
                    <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                    <SelectItem value="instagram">📸 Instagram</SelectItem>
                    <SelectItem value="facebook">👥 Facebook</SelectItem>
                    <SelectItem value="twitter">🐦 Twitter/X</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Response Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-300">
                  Paste their response here:
                </Label>
                <Textarea
                  value={leadResponse}
                  onChange={(e) => setLeadResponse(e.target.value)}
                  placeholder="Paste their exact response here... (e.g., 'Thanks for reaching out! I'm interested in learning more about your services. Can you tell me about pricing?')"
                  className="bg-[#2A2A2A] border-[#444] text-gray-300 min-h-[120px] resize-none"
                  maxLength={2000}
                />
                <div className="text-xs text-gray-500 text-right">
                  {leadResponse.length}/2000 characters
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
                className="w-full bg-gray-600 hover:bg-gray-700 text-white"
              >
                {isGeneratingSmartResponse ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Smart Response...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Smart Response
                  </>
                )}
              </Button>

              {/* Generated Response */}
              {generatedSmartResponse && (
                <div className="space-y-3">
                  <div className="border-t border-[#444] pt-4">
                    <Label className="text-sm font-medium text-gray-300 mb-2 block">
                      Your smart response:
                    </Label>
                    <div className="bg-[#2A2A2A] border border-[#444] rounded-lg p-4">
                      <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                        {generatedSmartResponse}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        copyToClipboard(generatedSmartResponse, 'Smart Response')
                        setSmartResponseCopied(true)
                        setTimeout(() => setSmartResponseCopied(false), 2000)
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                    >
                      {smartResponseCopied ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Response
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedCampaignLead?.lead) {
                          generateSmartResponse(leadResponse, responseMethod, selectedCampaignLead.lead)
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-[#2A2A2A] border-[#444] text-gray-300 hover:bg-[#333] hover:text-white"
                      disabled={isGeneratingSmartResponse}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Regenerate
                    </Button>
                  </div>
                </div>
              )}

              {/* Security Notice & Rate Limit */}
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-gray-400">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-300">Security & Privacy:</span> Your responses are filtered for security. Inappropriate content will be blocked. Only business-related responses are generated.
                  </div>
                </div>
                {smartResponsesRemaining !== null && (
                  <div className="text-xs text-gray-500 text-center">
                    {smartResponsesRemaining} smart responses remaining today
                  </div>
                )}
                              </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Bulk Outreach Dialog */}
          <Dialog open={showBulkOutreach} onOpenChange={setShowBulkOutreach}>
            <DialogContent className="bg-[#1A1A1A] border-[#333] max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <DialogHeader className="border-b border-[#333] pb-4">
                <DialogTitle className="text-white flex items-center gap-3 text-xl font-semibold">
                  <div className="p-2 bg-[#2A2A2A] rounded-lg">
                    <Send className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex flex-col">
                    <span>Lead Processing Workflow</span>
                    <span className="text-sm text-gray-400 font-normal">
                      Lead {currentQueueIndex + 1} of {pendingOutreachQueue.length}
                    </span>
                  </div>
                </DialogTitle>
                <DialogDescription className="text-gray-400 mt-2">
                  Systematically process pending leads with AI-generated personalized outreach messages
                </DialogDescription>
              </DialogHeader>
              
              {pendingOutreachQueue.length > 0 && currentQueueIndex < pendingOutreachQueue.length && (
                <div className="py-6 space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 font-medium">Progress</span>
                      <span className="text-gray-200 bg-[#2A2A2A] px-3 py-1 rounded-full text-sm font-medium">
                        {currentQueueIndex + 1} / {pendingOutreachQueue.length}
                      </span>
                    </div>
                    <div className="w-full bg-[#2A2A2A] rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-gray-500 to-gray-400 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentQueueIndex + 1) / pendingOutreachQueue.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Current Lead Info */}
                  {(() => {
                    const currentLead = pendingOutreachQueue[currentQueueIndex]
                    const lead = currentLead?.lead
                    if (!lead) return null

                    return (
                      <div className="bg-[#2A2A2A] border border-[#444] rounded-xl p-6 shadow-lg">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-white mb-2">{lead.business_name}</h3>
                            {lead.owner_name && (
                              <p className="text-gray-300 flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                {lead.owner_name}
                              </p>
                            )}
                            {lead.city && lead.state_province && (
                              <p className="text-gray-400 flex items-center gap-2 mt-1">
                                <MapPin className="h-4 w-4 text-gray-500" />
                                {lead.city}, {lead.state_province}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {lead.lead_score && (
                              <div className="bg-[#333] text-gray-200 px-3 py-2 rounded-lg text-sm font-medium border border-[#555]">
                                Score: {lead.lead_score}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Contact Methods */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          {lead.email && (
                            <div className="bg-[#333] rounded-lg p-3 border border-[#555]">
                              <Label className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                Email
                              </Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-200 truncate flex-1">{lead.email}</span>
                                                                 <Button
                                   onClick={() => copyToClipboard(lead.email || '', 'Email')}
                                   size="sm"
                                   variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-[#444] text-gray-400 hover:text-gray-200"
                                 >
                                   <Copy className="h-3 w-3" />
                                 </Button>
                              </div>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="bg-[#333] rounded-lg p-3 border border-[#555]">
                              <Label className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                Phone
                              </Label>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-200">{lead.phone}</span>
                                                                 <Button
                                   onClick={() => copyToClipboard(lead.phone || '', 'Phone')}
                                   size="sm"
                                   variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-[#444] text-gray-400 hover:text-gray-200"
                                 >
                                   <Copy className="h-3 w-3" />
                                 </Button>
                              </div>
                            </div>
                          )}
                          {lead.website && (
                            <div className="bg-[#333] rounded-lg p-3 border border-[#555]">
                              <Label className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Website
                              </Label>
                              <div className="flex items-center gap-2">
                                <a 
                                  href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-gray-300 hover:text-white truncate flex-1 transition-colors"
                                >
                                  {lead.website}
                                </a>
                                                                 <Button
                                   onClick={() => copyToClipboard(lead.website || '', 'Website')}
                                   size="sm"
                                   variant="ghost"
                                  className="h-7 w-7 p-0 hover:bg-[#444] text-gray-400 hover:text-gray-200"
                                 >
                                   <Copy className="h-3 w-3" />
                                 </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Social Media */}
                        {(lead.instagram_handle || lead.facebook_page || lead.linkedin_profile || lead.twitter_handle) && (
                          <div className="space-y-3">
                            <Label className="text-xs font-medium text-gray-400 flex items-center gap-1">
                              <Share2 className="h-3 w-3" />
                              Social Presence
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {lead.instagram_handle && (
                                <a
                                  href={getSocialMediaLink('instagram', lead.instagram_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs bg-[#333] border border-[#555] text-gray-200 px-3 py-2 rounded-lg hover:bg-[#444] hover:border-[#666] transition-all"
                                >
                                  {getSocialMediaIcon('instagram')}
                                  <span>{lead.instagram_handle}</span>
                                  <ExternalLink className="h-3 w-3 text-gray-400" />
                                </a>
                              )}
                              {lead.facebook_page && (
                                <a
                                  href={getSocialMediaLink('facebook', lead.facebook_page)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs bg-[#333] border border-[#555] text-gray-200 px-3 py-2 rounded-lg hover:bg-[#444] hover:border-[#666] transition-all"
                                >
                                  {getSocialMediaIcon('facebook')}
                                  <span>Facebook</span>
                                  <ExternalLink className="h-3 w-3 text-gray-400" />
                                </a>
                              )}
                              {lead.linkedin_profile && (
                                <a
                                  href={getSocialMediaLink('linkedin', lead.linkedin_profile)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs bg-[#333] border border-[#555] text-gray-200 px-3 py-2 rounded-lg hover:bg-[#444] hover:border-[#666] transition-all"
                                >
                                  {getSocialMediaIcon('linkedin')}
                                  <span>LinkedIn</span>
                                  <ExternalLink className="h-3 w-3 text-gray-400" />
                                </a>
                              )}
                              {lead.twitter_handle && (
                                <a
                                  href={getSocialMediaLink('twitter', lead.twitter_handle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs bg-[#333] border border-[#555] text-gray-200 px-3 py-2 rounded-lg hover:bg-[#444] hover:border-[#666] transition-all"
                                >
                                  {getSocialMediaIcon('twitter')}
                                  <span>{lead.twitter_handle}</span>
                                  <ExternalLink className="h-3 w-3 text-gray-400" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Message Generation Section */}
                  <div className="bg-[#2A2A2A] border border-[#444] rounded-xl p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        AI Message Generation
                      </Label>
                      <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                        <SelectTrigger className="w-44 bg-[#333] border-[#555] text-gray-200 hover:bg-[#444]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2A2A2A] border-[#555]">
                          <SelectItem value="email" className="text-gray-200">Email</SelectItem>
                          <SelectItem value="linkedin" className="text-gray-200">LinkedIn</SelectItem>
                          <SelectItem value="instagram" className="text-gray-200">Instagram</SelectItem>
                          <SelectItem value="facebook" className="text-gray-200">Facebook</SelectItem>
                          <SelectItem value="twitter" className="text-gray-200">Twitter/X</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={() => {
                        const currentLead = pendingOutreachQueue[currentQueueIndex]?.lead
                        if (currentLead) {
                          generatePersonalizedMessage(currentLead, messageType)
                        }
                      }}
                      disabled={isGeneratingMessage}
                      className="w-full bg-[#444] hover:bg-[#555] text-white border border-[#666] hover:border-[#777] transition-all py-3"
                    >
                      {isGeneratingMessage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating personalized {messageType} message...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Generate {messageType.charAt(0).toUpperCase() + messageType.slice(1)} Message
                        </>
                      )}
                    </Button>

                    {/* Generated Message Display */}
                    {generatedMessage && (
                      <div className="space-y-4 mt-6">
                        {messageSubject && (
                          <div>
                            <Label className="text-xs font-medium text-gray-400 mb-2 block flex items-center gap-1">
                              <MailOpen className="h-3 w-3" />
                              Subject Line
                            </Label>
                            <div className="bg-[#333] border border-[#555] rounded-lg p-4">
                              <div className="text-gray-200 text-sm font-medium leading-relaxed">{messageSubject}</div>
                              <Button
                                onClick={() => copyToClipboard(messageSubject, 'Subject')}
                                size="sm"
                                variant="ghost"
                                className="mt-3 text-xs bg-[#444] hover:bg-[#555] text-gray-300 hover:text-white"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy Subject
                              </Button>
                            </div>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs font-medium text-gray-400 mb-2 block flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            Generated Message
                          </Label>
                          <div className="bg-[#333] border border-[#555] rounded-lg p-4">
                            <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{generatedMessage}</div>
                            <Button
                              onClick={() => copyToClipboard(generatedMessage, 'Message')}
                              size="sm"
                              variant="ghost"
                              className="mt-3 text-xs bg-[#444] hover:bg-[#555] text-gray-300 hover:text-white"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy Message
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-6 border-t border-[#444] mt-6">
                    <Button
                      onClick={() => {
                        const currentLead = pendingOutreachQueue[currentQueueIndex]
                        if (currentLead) {
                          updateCampaignLeadStatus(currentLead.id, 'contacted')
                          if (currentQueueIndex < pendingOutreachQueue.length - 1) {
                            setCurrentQueueIndex(currentQueueIndex + 1)
                            setGeneratedMessage('')
                            setMessageSubject('')
                          } else {
                            setShowBulkOutreach(false)
                            setPendingOutreachQueue([])
                            setCurrentQueueIndex(0)
                            setGeneratedMessage('')
                            setMessageSubject('')
                            toast.success('All pending leads processed successfully!')
                          }
                        }
                      }}
                      className="flex-1 bg-[#444] hover:bg-[#555] text-white border border-[#666] hover:border-[#777] transition-all py-3"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Contacted & Continue
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (currentQueueIndex < pendingOutreachQueue.length - 1) {
                          setCurrentQueueIndex(currentQueueIndex + 1)
                          setGeneratedMessage('')
                          setMessageSubject('')
                        } else {
                          setShowBulkOutreach(false)
                          setPendingOutreachQueue([])
                          setCurrentQueueIndex(0)
                          setGeneratedMessage('')
                          setMessageSubject('')
                          toast.success('Bulk outreach session completed')
                        }
                      }}
                      variant="outline"
                      className="bg-[#2A2A2A] border-[#555] text-gray-300 hover:bg-[#333] hover:text-white hover:border-[#666] transition-all py-3"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                       Skip to Next
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setShowBulkOutreach(false)
                        setPendingOutreachQueue([])
                        setCurrentQueueIndex(0)
                        setGeneratedMessage('')
                        setMessageSubject('')
                      }}
                      variant="outline"
                      className="bg-[#2A2A2A] border-[#555] text-gray-300 hover:bg-[#333] hover:text-white hover:border-[#666] transition-all py-3"
                    >
                      <X className="h-4 w-4 mr-2" />
                       Exit
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  } 