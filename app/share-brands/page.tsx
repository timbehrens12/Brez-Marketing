'use client'

export const runtime = 'edge'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  ArrowLeft, 
  Share2, 
  Building2, 
  Check, 
  Users, 
  Calendar,
  Clock,
  Tag,
  Link as LinkIcon,
  Copy,
  Eye,
  UserPlus,
  Shield,
  X,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useSupabase } from '@/lib/hooks/useSupabase'

interface PlatformConnection {
  id: string
  brand_id: string
  platform_type: 'shopify' | 'meta'
  status: string
  created_at: string
}

interface SelectedBrand {
  id: string
  name: string
  image_url?: string
  niche?: string
  agency_info?: {
    name: string
    logo_url?: string
    user_id: string
  }
  connections: PlatformConnection[]
}

interface ShareLinkData {
  id: string
  token: string
  expires_at: string
  max_uses: number
  current_uses: number
  role: string
  brand_ids: string[]
  created_at: string
}

const ROLES = [
  {
    id: 'media_buyer',
    name: 'Media Buyer',
    description: 'Full access to campaigns, reports, marketing tools, and brand management',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  }
]

export default function ShareBrandsPage() {
  const router = useRouter()
  const { user } = useUser()
  const { brands: allBrands } = useBrandContext()
  const supabase = useSupabase()
  
  const [ownedBrands, setOwnedBrands] = useState<SelectedBrand[]>([])
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([])
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [shareLinks, setShareLinks] = useState<ShareLinkData[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null)
  const [removingAll, setRemovingAll] = useState(false)
  
  // Form data
  const [selectedRole, setSelectedRole] = useState<string>('media_buyer')
  const [expiresInDays, setExpiresInDays] = useState<number>(7)
  const [maxUses, setMaxUses] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [canManagePlatforms, setCanManagePlatforms] = useState<boolean>(true)

  useEffect(() => {
    loadData()
  }, [user, allBrands])

  // Cleanup selected brands when owned brands change
  useEffect(() => {
    if (ownedBrands.length > 0) {
      const validSelectedIds = selectedBrandIds.filter(id => 
        ownedBrands.some(brand => brand.id === id)
      )
      if (validSelectedIds.length !== selectedBrandIds.length) {
        // console.log('🧹 Cleaning up invalid brand selections:', {
          // before: selectedBrandIds.length,
          // after: validSelectedIds.length,
          // removed: selectedBrandIds.filter(id => !ownedBrands.some(b => b.id === id))
        // })
        setSelectedBrandIds(validSelectedIds)
      }
    }
  }, [ownedBrands])

  const loadData = async () => {
    if (!user || !allBrands.length) return
    
    setLoading(true)
    try {
      // Get owned brands (all brands you own, regardless of sharing status)
      const owned = allBrands.filter(brand => (brand as any).user_id === user.id)
      
      // Debug logging for development
      console.log('🔍 Share-brands debugging:', {
        totalBrands: allBrands.length,
        ownedBrands: owned.length,
        ownedBrandNames: owned.map(b => b.name),
        userId: user.id,
        allBrandUserIds: allBrands.map(b => ({ name: b.name, userId: (b as any).user_id })),
        currentSelectedBrands: selectedBrandIds.length
      })
      
      // Get connections for owned brands
      const brandIds = owned.map(brand => brand.id)
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('platform_connections')
        .select('*')
        .in('brand_id', brandIds)
        .eq('status', 'active')

      if (connectionsError) throw connectionsError

      // Get agency information for owned brands
      const { data: agencyInfo, error: agencyError } = await supabase
        .from('agency_settings')
        .select('user_id, agency_name, agency_logo_url')
        .eq('user_id', user.id)
        .single()

      // Transform brands with agency info and connections
      const brandsWithInfo: SelectedBrand[] = owned.map(brand => ({
        id: brand.id,
        name: brand.name,
        image_url: brand.image_url,
        niche: (brand as any).niche,
        agency_info: agencyInfo ? {
          name: agencyInfo.agency_name,
          logo_url: agencyInfo.agency_logo_url,
          user_id: agencyInfo.user_id
        } : undefined,
        connections: (connectionsData || []).filter(conn => conn.brand_id === brand.id)
      }))

      setOwnedBrands(brandsWithInfo)
      setConnections(connectionsData || [])
      
      // Clean up any invalid selected brands
      const validSelectedIds = selectedBrandIds.filter(id => 
        brandsWithInfo.some(brand => brand.id === id)
      )
      if (validSelectedIds.length !== selectedBrandIds.length) {
        // console.log('🧹 Cleaning up invalid selections during load:', {
          // before: selectedBrandIds.length,
          // after: validSelectedIds.length,
          // invalid: selectedBrandIds.filter(id => !brandsWithInfo.some(b => b.id === id))
        // })
        setSelectedBrandIds(validSelectedIds)
      }
      
      // Load existing share links
      loadShareLinks()
    } catch (error) {
      console.error('Error loading brand sharing data:', error)
      toast.error('Failed to load brand data', {
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const loadShareLinks = async () => {
    if (!user) return

    try {
      console.log('🔍 Loading share links for user:', user.id)
      
      const { data, error } = await supabase
        .from('brand_share_links')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      console.log('📊 Share links query result:', { 
        error: error ? { code: error.code, message: error.message } : null,
        dataCount: data?.length || 0,
        data: data?.slice(0, 3)?.map(link => ({
          id: link.id,
          token: link.token?.substring(0, 8) + '...',
          created_at: link.created_at,
          role: link.role,
          is_active: link.is_active
        }))
      })

      if (error) throw error
      setShareLinks(data || [])
      
    } catch (error) {
      console.error('Error loading share links:', error)
    }
  }

  const handleBrandSelect = (brandId: string, checked: boolean) => {
    // Verify the brand exists in our owned brands
    const brandExists = ownedBrands.some(brand => brand.id === brandId)
    if (!brandExists) {
      console.log('⚠️ Brand not found in owned brands:', brandId)
      return
    }
    
    if (checked) {
      setSelectedBrandIds(prev => {
        // Prevent duplicates
        if (prev.includes(brandId)) {
          console.log('⚠️ Brand already selected, skipping:', brandId)
          return prev
        }
        const newSelection = [...prev, brandId]
        console.log('✅ Brand selected:', brandId, 'Total selected:', newSelection.length)
        return newSelection
      })
    } else {
      setSelectedBrandIds(prev => {
        const newSelection = prev.filter(id => id !== brandId)
        console.log('❌ Brand deselected:', brandId, 'Total selected:', newSelection.length)
        return newSelection
      })
    }
  }

  const handleSelectAll = () => {
    const filteredBrands = getFilteredBrands()
    console.log('🔄 Select All clicked:', {
      currentSelected: selectedBrandIds.length,
      filteredBrandsCount: filteredBrands.length,
      action: selectedBrandIds.length === filteredBrands.length ? 'deselect' : 'select'
    })
    
    if (selectedBrandIds.length === filteredBrands.length) {
      setSelectedBrandIds([])
    } else {
      setSelectedBrandIds(filteredBrands.map(brand => brand.id))
    }
  }

  const getFilteredBrands = () => {
    if (!searchQuery) return ownedBrands
    return ownedBrands.filter(brand => 
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.niche?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      brand.agency_info?.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const createShareLink = async () => {
    if (selectedBrandIds.length === 0) {
      toast.error('Please select at least one brand to share', {
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333'
        }
      })
      return
    }

    setCreating(true)
    try {
      // Filter out any invalid brand IDs and deduplicate
      const uniqueValidBrandIds = [...new Set(selectedBrandIds.filter(id => 
        ownedBrands.some(brand => brand.id === id)
      ))]
      
      if (uniqueValidBrandIds.length === 0) {
        toast.error('No valid brands selected. Please try again.', {
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333'
          }
        })
        return
      }
      
      if (uniqueValidBrandIds.length !== selectedBrandIds.length) {
        // Update the UI to reflect only valid selections
        // console.log('🧹 Cleaning up selections before API call:', {
          // original: selectedBrandIds.length,
          // cleaned: uniqueValidBrandIds.length,
          // duplicatesRemoved: selectedBrandIds.length - uniqueValidBrandIds.length,
          // invalidRemoved: selectedBrandIds.filter(id => !ownedBrands.some(b => b.id === id))
        // })
        setSelectedBrandIds(uniqueValidBrandIds)
      }
      
      console.log('🚀 Frontend sending to API:', {
        brandIds: uniqueValidBrandIds,
        role: selectedRole,
        expiresInDays,
        maxUses,
        originalSelectedBrandIds: selectedBrandIds,
        brandDetails: uniqueValidBrandIds.map(id => {
          const brand = ownedBrands.find(b => b.id === id)
          return {
            id,
            name: brand?.name,
            found: !!brand,
            userIdFromBrand: (brand as any)?.user_id
          }
        }),
        ownedBrandIds: ownedBrands.map(b => b.id)
      })

      const response = await fetch('/api/brand-access/multi-share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandIds: uniqueValidBrandIds,
          role: selectedRole,
          expiresInDays,
          maxUses,
          canManagePlatforms
        })
      })

      console.log('🔄 API Response:', {
        status: response.status,
        ok: response.ok
      })

      const data = await response.json()
      console.log('📦 API Response Data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create share link')
      }
      


      toast.success(`✓ Invitation created for ${uniqueValidBrandIds.length} brand${uniqueValidBrandIds.length > 1 ? 's' : ''}`, {
        description: 'You can share the same brands with multiple people',
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333'
        }
      })
      
      // Reset form
      setSelectedBrandIds([])
      setSelectedRole('media_buyer')
      setExpiresInDays(7)
      setMaxUses(1)
      setCanManagePlatforms(true)
      
      // Reload share links
      loadShareLinks()
    } catch (error) {
      console.error('Error creating share link:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create share link', {
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333'
        }
      })
    } finally {
      setCreating(false)
    }
  }

  const copyShareLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/join/${token}`
    
    // Show copying animation
    setCopiedToken(token)
    
    try {
      if (!navigator.clipboard) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      } else {
        await navigator.clipboard.writeText(shareUrl)
      }
      
      toast.success('✓ Invitation link copied to clipboard!', {
        description: 'Share this link with your team member to grant access',
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333'
        }
      })
    } catch (error) {
      console.error('Copy failed:', error)
      toast.error('Failed to copy invitation link', {
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333'
        }
      })
    } finally {
      // Reset animation after 2 seconds
      setTimeout(() => setCopiedToken(null), 2000)
    }
  }

  const revokeShareLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this invitation link?\n\n⚠️ This will immediately deactivate the link and prevent anyone from using it to join. People who have already joined will keep their access.\n\nThis action cannot be undone.')) {
      return
    }
    
    setDeletingLinkId(linkId)
    try {
      const response = await fetch('/api/brand-access/multi-share', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linkId })
      })

      if (!response.ok) {
        throw new Error('Failed to revoke share link')
      }

      toast.success('✓ Invitation link deleted', {
        description: 'The link is now deactivated. Existing access remains unchanged.',
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333'
        }
      })
      loadShareLinks()
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete invitation link', {
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333'
        }
      })
    } finally {
      setDeletingLinkId(null)
    }
  }

  const revokeAllShareLinks = async () => {
    if (!confirm(`Are you sure you want to delete all ${shareLinks.length} invitation links?\n\n⚠️ This will immediately deactivate ALL links and prevent anyone from using them to join. People who have already joined will keep their access.\n\nThis action cannot be undone.`)) {
      return
    }
    
    setRemovingAll(true)
    let successCount = 0
    let errorCount = 0

    try {
      // Revoke all links in parallel
      await Promise.allSettled(
        shareLinks.map(async (link) => {
          try {
            const response = await fetch('/api/brand-access/multi-share', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ linkId: link.id })
            })
            
            if (response.ok) {
              successCount++
            } else {
              errorCount++
            }
          } catch (error) {
            errorCount++
          }
        })
      )

      if (successCount > 0) {
        toast.success(`✓ ${successCount} invitation link${successCount > 1 ? 's' : ''} deleted`, {
          description: 'All links are now deactivated. Existing access remains unchanged.',
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333'
          }
        })
      }
      if (errorCount > 0) {
        toast.error(`Failed to delete ${errorCount} invitation link${errorCount > 1 ? 's' : ''}`, {
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333'
          }
        })
      }
      
      loadShareLinks()
    } catch (error) {
      console.error('Error revoking all share links:', error)
      toast.error('Failed to delete invitation links', {
        duration: 3000,
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid #333'
        }
      })
    } finally {
      setRemovingAll(false)
    }
  }

  const renderPlatformIcon = (platform: string) => {
    const iconMap = {
      shopify: '/shopify-icon.png',
      meta: '/meta-icon.png'
    }

    return (
      <div className="w-5 h-5 rounded border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
        <img 
          src={iconMap[platform as keyof typeof iconMap]} 
          alt={platform} 
          className="w-4 h-4 object-contain"
        />
      </div>
    )
  }

  const renderBrandWidget = (brand: SelectedBrand) => {
    const isSelected = selectedBrandIds.includes(brand.id)
    
    return (
      <div 
        key={brand.id}
        className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:bg-white/5 ${
          isSelected 
            ? 'border-white bg-white/10 shadow-lg' 
            : 'border-[#333] bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]'
        }`}
        onClick={() => handleBrandSelect(brand.id, !isSelected)}
      >
        <div className="flex items-start gap-4">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={(checked) => handleBrandSelect(brand.id, !!checked)}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            {/* Brand Header */}
            <div className="flex items-center gap-3 mb-3">
              {brand.image_url ? (
                <img 
                  src={brand.image_url} 
                  alt={brand.name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-[#444]"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#444] to-[#333] flex items-center justify-center text-white font-bold text-lg border-2 border-[#444]">
                  {brand.name.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-lg truncate">{brand.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {brand.niche && (
                    <Badge variant="secondary" className="bg-[#333] text-gray-300 text-xs">
                      {brand.niche}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Agency Info */}
            {brand.agency_info && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-[#0f0f0f] rounded-lg border border-[#333]">
                {brand.agency_info.logo_url ? (
                  <div className="w-6 h-6 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                    <img 
                      src={brand.agency_info.logo_url} 
                      alt={brand.agency_info.name}
                      className="w-4 h-4 object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-[#333] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3 h-3 text-white" />
                  </div>
                )}
                <span className="text-sm text-gray-300 font-medium">{brand.agency_info.name}</span>
                <span className="text-xs text-gray-500">Agency</span>
              </div>
            )}

            {/* Connected Platforms */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Connected:</span>
              <div className="flex items-center gap-1">
                {brand.connections.length > 0 ? (
                  brand.connections.map((conn, index) => (
                    <div key={index} title={conn.platform_type}>
                      {renderPlatformIcon(conn.platform_type)}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-gray-500 italic">No platforms connected</span>
                )}
              </div>
              {brand.connections.length > 0 && (
                <span className="text-xs text-gray-500">
                  ({brand.connections.length} platform{brand.connections.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 flex items-center justify-center animate-in fade-in duration-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  const filteredBrands = getFilteredBrands()

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6 animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings?tab=brand-access')}
              className="border-[#333] bg-[#1a1a1a] text-gray-300 hover:bg-[#333] hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Share Brand Access</h1>
              <p className="text-gray-400 mt-1">Select brands to share and create invitation links</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Top Row - Brand Selection and Share Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Brand Selection */}
            <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
              <CardHeader className="border-b border-[#333] pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-white">Select Brands</CardTitle>
                      <p className="text-gray-400 text-sm">Choose which brands to share access to</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                      {selectedBrandIds.length} of {filteredBrands.length} selected
                    </span>
                    {selectedBrandIds.length > filteredBrands.length && (
                      <span className="text-xs text-gray-400">⚠️ Invalid selection detected</span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="border-[#333] bg-[#1a1a1a] text-gray-300 hover:bg-[#333] hover:text-white"
                    >
                      {selectedBrandIds.length === filteredBrands.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Search */}
                <div className="mb-6">
                  <Input
                    placeholder="Search brands by name, niche, or agency..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Brand List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredBrands.length > 0 ? (
                    filteredBrands.map(brand => renderBrandWidget(brand))
                  ) : (
                    <div className="text-center py-8">
                      <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-400">No brands found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Share Settings */}
            <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
              <CardHeader className="border-b border-[#333] pb-4">
                <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                      <Share2 className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-white">Share Settings</CardTitle>
                    <p className="text-gray-400 text-sm">Configure access permissions</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Access Role - Fixed to Media Buyer */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">Access Role</Label>
                  <div className="p-3 bg-[#1a1a1a] border border-[#333] rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 border text-xs">
                        Media Buyer
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Full access to campaigns, reports, marketing tools, and brand management
                    </p>
                  </div>
                </div>

                {/* Expiration */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">Expires In</Label>
                  <Select value={expiresInDays.toString()} onValueChange={(value) => setExpiresInDays(parseInt(value))}>
                    <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                      <SelectItem value="1" className="text-white hover:bg-[#333]">1 day</SelectItem>
                      <SelectItem value="3" className="text-white hover:bg-[#333]">3 days</SelectItem>
                      <SelectItem value="7" className="text-white hover:bg-[#333]">1 week</SelectItem>
                      <SelectItem value="14" className="text-white hover:bg-[#333]">2 weeks</SelectItem>
                      <SelectItem value="30" className="text-white hover:bg-[#333]">1 month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Max Uses */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-300">Maximum Uses</Label>
                  <Select value={maxUses.toString()} onValueChange={(value) => setMaxUses(parseInt(value))}>
                    <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                      <SelectItem value="1" className="text-white hover:bg-[#333]">1 use</SelectItem>
                      <SelectItem value="5" className="text-white hover:bg-[#333]">5 uses</SelectItem>
                      <SelectItem value="10" className="text-white hover:bg-[#333]">10 uses</SelectItem>
                      <SelectItem value="25" className="text-white hover:bg-[#333]">25 uses</SelectItem>
                      <SelectItem value="100" className="text-white hover:bg-[#333]">100 uses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Platform Management Permission */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-300">Permissions</Label>
                  <div className="flex items-center justify-between p-3 bg-[#1a1a1a] border border-[#333] rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-white">Platform Management</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Allow user to connect/disconnect platform integrations (Meta, Shopify, etc.)
                      </p>
                    </div>
                    <Switch
                      checked={canManagePlatforms}
                      onCheckedChange={setCanManagePlatforms}
                    />
                  </div>
                </div>

                {/* Create Button */}
                <Button
                  onClick={createShareLink}
                  disabled={creating || selectedBrandIds.length === 0}
                  className="w-full bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                      Creating Link...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2" />
                      Create Share Link
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Active Share Links */}
          <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
              <CardHeader className="border-b border-[#333] pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                      <LinkIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-white">Active Links</CardTitle>
                      <p className="text-gray-400 text-sm">Manage existing share links</p>
                    </div>
                  </div>
                  {shareLinks.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={revokeAllShareLinks}
                      disabled={removingAll}
                      className="border-gray-600/40 bg-gray-900/20 text-gray-300 hover:bg-gray-800/30 hover:text-gray-200 disabled:opacity-50"
                    >
                      {removingAll ? (
                        <>
                          <div className="w-3 h-3 animate-spin rounded-full border border-current border-t-transparent mr-2" />
                          Removing All...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3 mr-2" />
                          Remove All
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {shareLinks.length > 0 ? (
                  <div className="space-y-4 max-h-[800px] overflow-y-auto">
                    {shareLinks.map(link => {
                      // Handle both single-brand (brand_id) and multi-brand (brand_ids) formats
                      const brandIds = link.brand_ids || (link.brand_id ? [link.brand_id] : [])
                      const linkBrands = ownedBrands.filter(brand => brandIds.includes(brand.id))
                      const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${link.token}`
                      

                      
                      return (
                        <div key={link.id} className="p-4 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl border border-[#333] hover:border-[#444] transition-colors">
                          {/* Header with Role and Actions */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/40 px-2 py-1">
                                {link.role.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                • {link.current_uses}/{link.max_uses} uses
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeShareLink(link.id)}
                                disabled={deletingLinkId === link.id}
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-300 hover:bg-gray-600/20 disabled:opacity-50 transition-colors"
                                title="Delete invitation link (deactivates the link but keeps existing access)"
                              >
                                {deletingLinkId === link.id ? (
                                  <div className="w-3 h-3 animate-spin rounded-full border border-current border-t-transparent" />
                                ) : (
                                  <X className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Brands List */}
                          <div className="mb-4">
                            <p className="text-xs text-gray-400 mb-3">Brands included in this invitation:</p>
                            <div className="space-y-3">
                              {linkBrands.map(brand => (
                                <div key={brand.id} className="p-3 rounded-lg bg-[#0f0f0f] border border-[#333]">
                                  {/* Brand Header */}
                                  <div className="flex items-center gap-3 mb-2">
                                    {brand.image_url ? (
                                      <img 
                                        src={brand.image_url} 
                                        alt={brand.name}
                                        className="w-10 h-10 rounded-lg object-cover border-2 border-[#444]"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#444] to-[#333] flex items-center justify-center text-white font-bold border-2 border-[#444]">
                                        {brand.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-white font-semibold text-sm truncate">{brand.name}</h4>
                                      {brand.niche && (
                                        <Badge variant="secondary" className="bg-[#333] text-gray-300 text-xs mt-1">
                                          {brand.niche}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Agency Info */}
                                  {brand.agency_info && (
                                    <div className="flex items-center gap-2 mb-2 p-2 bg-[#1a1a1a] rounded border border-[#444]">
                                      {brand.agency_info.logo_url ? (
                                        <div className="w-5 h-5 bg-[#1A1A1A] border border-[#333] rounded flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                                          <img 
                                            src={brand.agency_info.logo_url} 
                                            alt={brand.agency_info.name}
                                            className="w-3 h-3 object-contain rounded"
                                          />
                                        </div>
                                      ) : (
                                        <div className="w-5 h-5 bg-[#333] rounded flex items-center justify-center flex-shrink-0">
                                          <Building2 className="w-3 h-3 text-white" />
                                        </div>
                                      )}
                                      <span className="text-xs text-gray-300 font-medium">{brand.agency_info.name}</span>
                                      <span className="text-xs text-gray-500">Agency</span>
                                    </div>
                                  )}

                                  {/* Connected Platforms */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Connected:</span>
                                    <div className="flex items-center gap-1">
                                      {brand.connections && brand.connections.length > 0 ? (
                                        brand.connections.map((conn, index) => (
                                          <div key={index} title={conn.platform_type}>
                                            {renderPlatformIcon(conn.platform_type)}
                                          </div>
                                        ))
                                      ) : (
                                        <span className="text-xs text-gray-500 italic">No platforms connected</span>
                                      )}
                                    </div>
                                    {brand.connections && brand.connections.length > 0 && (
                                      <span className="text-xs text-gray-500">
                                        ({brand.connections.length} platform{brand.connections.length !== 1 ? 's' : ''})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Invitation Link */}
                          <div className="mb-3">
                            <p className="text-xs text-gray-400 mb-1">Invitation link:</p>
                            <div 
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                copyShareLink(link.token)
                              }}
                              className="p-2 bg-[#0f0f0f] rounded-lg border border-[#333] cursor-pointer hover:border-[#444] transition-colors group select-none"
                              title="Click to copy invitation link"
                            >
                              <div className="flex items-center gap-2">
                                <LinkIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-xs text-gray-300 font-mono truncate group-hover:text-white transition-colors">
                                  {shareUrl}
                                </span>
                                {copiedToken === link.token ? (
                                  <Check className="w-3 h-3 text-gray-300 transition-colors flex-shrink-0" />
                                ) : (
                                  <Copy className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Footer Info */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Expires {new Date(link.expires_at).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Created {new Date(link.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-400 mb-2">No active share links</p>
                    <p className="text-xs text-gray-500">Create a share link above to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
} 