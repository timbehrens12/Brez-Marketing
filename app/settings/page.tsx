"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBrandContext, type Brand } from "@/lib/context/BrandContext"
import { Trash2, Edit2, Plus, Upload, X, ExternalLink, Save, Check, Info, Camera, Building2, Tag, Briefcase, Image, Users, Share2, Eye, UserX, Clock, Shield, Calendar, User, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useUser, UserButton } from "@clerk/nextjs"
import { PlatformConnection } from "@/types/platformConnection"
import { toast } from "react-hot-toast"
import { useSupabase } from '@/lib/hooks/useSupabase'
import { useRouter, useSearchParams } from "next/navigation"

import { useAgency } from "@/contexts/AgencyContext"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { BrandManagementDropdown } from "@/components/settings/BrandManagementDropdown"
import { Badge } from "@/components/ui/badge"



// Brand niches based on lead generator categories
// Brand Access Section Component
function BrandAccessSection({ type, connections }: { type: 'received' | 'shared' | 'share', connections: PlatformConnection[] }) {
  const { brands } = useBrandContext()
  const { user } = useUser()
  const supabase = useSupabase()
  const router = useRouter()
  const [sharedBrands, setSharedBrands] = useState<any[]>([])
  const [brandAccess, setBrandAccess] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingAccessId, setEditingAccessId] = useState<string | null>(null)
  
  // Get owned brands (brands that the user can share)
  const ownedBrands = brands.filter(brand => (brand as any).user_id === user?.id)

  useEffect(() => {
    loadBrandAccess()
  }, [user])

  const loadBrandAccess = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Get brands shared with this user
      const { data: accessData, error: accessError } = await supabase
        .from('brand_access')
        .select('*')
        .eq('user_id', user.id)
        .is('revoked_at', null)

      if (accessError) throw accessError

      // Get brand details for shared brands
      let sharedBrandsWithDetails = []
      if (accessData && accessData.length > 0) {
        const sharedBrandIds = accessData.map(access => access.brand_id)
        const { data: brandDetails, error: brandError } = await supabase
          .from('brands')
          .select('*')
          .in('id', sharedBrandIds)

        if (!brandError && brandDetails) {
          // Get agency information for who granted access
          const grantedByIds = [...new Set(accessData.map(access => access.granted_by))]
          const { data: agencyInfo, error: agencyError } = await supabase
            .from('agency_settings')
            .select('user_id, agency_name, agency_logo_url')
            .in('user_id', grantedByIds)

          if (agencyError) {
            console.error('Error loading agency info for granted_by:', agencyError)
          }

          sharedBrandsWithDetails = accessData.map(access => {
            const brand = brandDetails.find(brand => brand.id === access.brand_id)
            const agencyData = (agencyInfo || []).find(agency => agency.user_id === access.granted_by)
            
            return {
              ...access,
              brand,
              agency_info: agencyData ? {
                name: agencyData.agency_name,
                logo_url: agencyData.agency_logo_url ? agencyData.agency_logo_url : undefined,
                user_id: agencyData.user_id
              } : undefined
            }
          })
        }
      }

      // Get brands this user has shared with others
      const ownedBrandIds = brands.filter(b => (b as any).user_id === user.id).map(b => b.id)
      let brandAccessWithDetails = []
      
      if (ownedBrandIds.length > 0) {
        const { data: sharedData, error: sharedError } = await supabase
          .from('brand_access')
          .select('*')
          .in('brand_id', ownedBrandIds)
          .is('revoked_at', null)

        if (sharedError) throw sharedError

        // Get brand details for shared brands
        if (sharedData && sharedData.length > 0) {
          const sharedBrandIds = sharedData.map(access => access.brand_id)
          const { data: brandDetails, error: brandError } = await supabase
            .from('brands')
            .select('*')
            .in('id', sharedBrandIds)

          if (!brandError && brandDetails) {
            brandAccessWithDetails = sharedData.map(access => ({
              ...access,
              brand: brandDetails.find(brand => brand.id === access.brand_id)
            }))
          }
        }
      }

      // Fetch user information for all users who have brand access AND who granted access
      const sharedUserIds = sharedBrandsWithDetails.map((access: any) => access.user_id)
      const brandAccessUserIds = brandAccessWithDetails.map((access: any) => access.user_id)
      const grantedByUserIds = sharedBrandsWithDetails.map((access: any) => access.granted_by)
      const combinedUserIds = [...sharedUserIds, ...brandAccessUserIds, ...grantedByUserIds]
      const allUserIds = Array.from(new Set(combinedUserIds)).filter(Boolean)

      let userInfo: any = {}
      if (allUserIds.length > 0) {
        try {
          const userResponse = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userIds: allUserIds })
          })

          if (userResponse.ok) {
            const userData = await userResponse.json()
            if (userData.success) {
              userInfo = userData.users
            }
          } else {
            console.error('Failed to fetch user information:', userResponse.statusText)
          }
        } catch (error) {
          console.error('Error fetching user information:', error)
        }
      }

      // Add user information to the access records
      const sharedBrandsWithUserInfo = sharedBrandsWithDetails.map(access => ({
        ...access,
        userInfo: userInfo[access.user_id] || { fullName: 'Unknown User' },
        grantedByUserInfo: userInfo[access.granted_by] || { fullName: 'Unknown User' }
      }))

      const brandAccessWithUserInfo = brandAccessWithDetails.map(access => ({
        ...access,
        userInfo: userInfo[access.user_id] || { fullName: 'Unknown User' }
      }))

      setSharedBrands(sharedBrandsWithUserInfo || [])
      setBrandAccess(brandAccessWithUserInfo || [])
    } catch (error) {
      console.error('Error loading brand access:', error)
    } finally {
      setLoading(false)
    }
  }

  const revokeAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('brand_access')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', accessId)

      if (error) throw error
      
      toast.success('Access revoked successfully')
      loadBrandAccess()
    } catch (error) {
      console.error('Error revoking access:', error)
      toast.error('Failed to revoke access')
    }
  }

  const updatePlatformPermissions = async (accessId: string, canManagePlatforms: boolean) => {
    const action = canManagePlatforms ? 'allow' : 'deny'
    const confirmMessage = canManagePlatforms 
      ? 'Are you sure you want to allow this user to connect and disconnect platforms?'
      : 'Are you sure you want to deny this user permission to connect and disconnect platforms?'
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const { error } = await supabase
        .from('brand_access')
        .update({ can_manage_platforms: canManagePlatforms })
        .eq('id', accessId)

      if (error) throw error
      
      toast.success(`Platform permissions ${canManagePlatforms ? 'allowed' : 'denied'} successfully`)
      loadBrandAccess()
    } catch (error) {
      console.error('Error updating platform permissions:', error)
      toast.error('Failed to update platform permissions')
    }
  }

  const updateReportPermissions = async (accessId: string, canGenerateReports: boolean) => {
    const action = canGenerateReports ? 'allow' : 'deny'
    const confirmMessage = canGenerateReports 
      ? 'Are you sure you want to allow this user to generate AI marketing reports?'
      : 'Are you sure you want to deny this user permission to generate AI marketing reports?'
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const { error } = await supabase
        .from('brand_access')
        .update({ can_generate_reports: canGenerateReports })
        .eq('id', accessId)

      if (error) throw error
      
      toast.success(`Report permissions ${canGenerateReports ? 'allowed' : 'denied'} successfully`)
      loadBrandAccess()
    } catch (error) {
      console.error('Error updating report permissions:', error)
      toast.error('Failed to update report permissions')
    }
  }

  const leaveSharedBrand = async (accessId: string) => {
    if (!confirm('Are you sure you want to leave this shared brand? You will lose access to all its data.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('brand_access')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', accessId)

      if (error) throw error
      
      toast.success('Successfully left shared brand')
      loadBrandAccess()
      
      // Refresh the brand context
      window.dispatchEvent(new CustomEvent('brandAccessGranted'))
    } catch (error) {
      console.error('Error leaving shared brand:', error)
      toast.error('Failed to leave shared brand')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-300 border-red-500/40'
      case 'media_buyer':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      case 'viewer':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
      </div>
    )
  }

  // Render based on type
  if (type === 'received') {
    return (
      <div className="space-y-4">
        {sharedBrands.length > 0 ? (
          sharedBrands.map((access: any) => (
            <div key={access.id} className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-[#333] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              {/* Header with Brand Info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {access.brand?.image_url ? (
                    <img 
                      src={access.brand.image_url} 
                      alt={access.brand.name} 
                      className="w-14 h-14 rounded-xl object-cover border-2 border-[#444] shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-[#444] to-[#333] rounded-xl flex items-center justify-center text-white font-bold text-lg border-2 border-[#444] shadow-md">
                      {access.brand?.name?.charAt(0)?.toUpperCase() || 'B'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-xl">{access.brand?.name || 'Unknown Brand'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-gradient-to-r from-gray-700 to-gray-800 text-white border-0">
                        {access.role === 'media_buyer' ? 'Media Buyer' : access.role === 'admin' ? 'Admin' : 'Viewer'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => leaveSharedBrand(access.id)}
                  className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 px-4 py-2 rounded-xl transition-all duration-200 font-medium"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Leave Access
                </Button>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Access Info */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Access Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Granted:</span>
                      <span className="text-sm text-gray-300 font-medium">{formatDate(access.granted_at)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Role:</span>
                      <span className="text-sm text-gray-300 font-medium capitalize">{access.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Shared By */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Shared By
                  </h4>
                  <div className="space-y-2">
                    {access.agency_info ? (
                      <>
                        <div className="flex items-center gap-2">
                          {(access.agency_info.logo_url && access.agency_info.logo_url !== null) ? (
                            <div className="w-10 h-10 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                              <img 
                                src={access.agency_info.logo_url} 
                                alt={access.agency_info.name}
                                className="w-8 h-8 object-contain rounded"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <span className="text-sm text-white font-medium">
                            {access.agency_info.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 ml-10">
                          Agency • {access.grantedByUserInfo?.fullName || 'Unknown User'}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#444] to-[#333] rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-gray-300 font-medium">
                          Unknown User
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Platform Connections */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Connected Platforms
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const brandConnections = connections.filter(conn => conn.brand_id === access.brand?.id)
                      if (brandConnections.length === 0) {
                        return (
                          <div className="text-sm text-gray-500 italic">No platforms connected</div>
                        )
                      }
                      return brandConnections.map((conn, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {conn.platform_type === 'shopify' ? (
                            <div className="w-6 h-6 rounded-md border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
                              <img 
                                src="/shopify-icon.png" 
                                alt="Shopify" 
                                className="w-5 h-5 object-contain"
                              />
                            </div>
                          ) : conn.platform_type === 'meta' ? (
                            <div className="w-6 h-6 rounded-md border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
                              <img 
                                src="/meta-icon.png" 
                                alt="Meta" 
                                className="w-5 h-5 object-contain"
                              />
                            </div>
                          ) : null}
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-[#333]">
            <div className="w-16 h-16 bg-gradient-to-br from-[#333] to-[#222] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Brand Access</h3>
            <p className="text-gray-400 text-sm">You don't have access to any shared brands yet</p>
          </div>
        )}
      </div>
    )
  }

  if (type === 'shared') {
    return (
      <div className="space-y-4">
        {brandAccess.length > 0 ? (
          brandAccess.map((access: any) => (
            <div key={access.id} className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-[#333] p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              {/* Header with Brand Info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  {access.brand?.image_url ? (
                    <img 
                      src={access.brand.image_url} 
                      alt={access.brand.name} 
                      className="w-14 h-14 rounded-xl object-cover border-2 border-[#444] shadow-md"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-[#444] to-[#333] rounded-xl flex items-center justify-center text-white font-bold text-lg border-2 border-[#444] shadow-md">
                      {access.brand?.name?.charAt(0)?.toUpperCase() || 'B'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-bold text-xl">{access.brand?.name || 'Unknown Brand'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-gradient-to-r from-gray-700 to-gray-800 text-white border-0">
                        {access.role === 'media_buyer' ? 'Media Buyer' : access.role === 'admin' ? 'Admin' : 'Viewer'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAccessId(editingAccessId === access.id ? null : access.id)}
                    className="border-gray-500/30 bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 hover:text-gray-300 hover:border-gray-500/50 px-4 py-2 rounded-xl transition-all duration-200 font-medium"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Permissions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeAccess(access.id)}
                    className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/50 px-4 py-2 rounded-xl transition-all duration-200 font-medium"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Revoke Access
                  </Button>
                </div>
              </div>

              {/* Edit Platform Permissions */}
              {editingAccessId === access.id && (
                <div className="mb-6 p-6 bg-[#0f0f0f] rounded-xl border border-[#333]">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Platform Connection Permissions</h4>
                      <p className="text-sm text-gray-400">Control whether this user can connect and disconnect platforms for this brand</p>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#333]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#333] to-[#444] rounded-full flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-gray-300" />
                        </div>
                        <div>
                          <h5 className="text-white font-medium">Platform Management</h5>
                          <p className="text-sm text-gray-400">Connect/disconnect Shopify, Meta, and other platforms</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">Current Status:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${access.can_manage_platforms ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className={`text-sm font-medium ${access.can_manage_platforms ? 'text-green-400' : 'text-red-400'}`}>
                            {access.can_manage_platforms ? 'Allowed' : 'Denied'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#333]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#333] to-[#444] rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-gray-300" />
                        </div>
                        <div>
                          <h5 className="text-white font-medium">Report Generation</h5>
                          <p className="text-sm text-gray-400">Generate AI marketing reports and analysis</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400">Current Status:</span>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${access.can_generate_reports !== false ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span className={`text-sm font-medium ${access.can_generate_reports !== false ? 'text-green-400' : 'text-red-400'}`}>
                            {access.can_generate_reports !== false ? 'Allowed' : 'Denied'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-gray-500">Platform Management Permissions:</p>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePlatformPermissions(access.id, true)}
                          disabled={access.can_manage_platforms}
                          className={`px-4 py-2 rounded-xl transition-all duration-200 font-medium ${
                            access.can_manage_platforms
                              ? 'border-green-500/50 bg-green-500/20 text-green-300 cursor-not-allowed opacity-50'
                              : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:border-green-500/50'
                          }`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Allow
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updatePlatformPermissions(access.id, false)}
                          disabled={!access.can_manage_platforms}
                          className={`px-4 py-2 rounded-xl transition-all duration-200 font-medium ${
                            !access.can_manage_platforms
                              ? 'border-red-500/50 bg-red-500/20 text-red-300 cursor-not-allowed opacity-50'
                              : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50'
                          }`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Deny
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-gray-500">Report Generation Permissions:</p>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReportPermissions(access.id, true)}
                          disabled={access.can_generate_reports !== false}
                          className={`px-4 py-2 rounded-xl transition-all duration-200 font-medium ${
                            access.can_generate_reports !== false
                              ? 'border-green-500/50 bg-green-500/20 text-green-300 cursor-not-allowed opacity-50'
                              : 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20 hover:border-green-500/50'
                          }`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Allow
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReportPermissions(access.id, false)}
                          disabled={access.can_generate_reports === false}
                          className={`px-4 py-2 rounded-xl transition-all duration-200 font-medium ${
                            access.can_generate_reports === false
                              ? 'border-red-500/50 bg-red-500/20 text-red-300 cursor-not-allowed opacity-50'
                              : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50'
                          }`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Deny
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex justify-end pt-2 border-t border-[#333]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingAccessId(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Shared With */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Shared With
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#444] to-[#333] rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {(access.userInfo?.fullName || 'Unknown User').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-300 font-medium">
                      {access.userInfo?.fullName || 'Unknown User'}
                    </span>
                  </div>
                </div>

                {/* When */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Access Details
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Granted:</span>
                      <span className="text-sm text-gray-300 font-medium">{formatDate(access.granted_at)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Role:</span>
                      <span className="text-sm text-gray-300 font-medium capitalize">{access.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Platform Connections */}
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Connected Platforms
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const brandConnections = connections.filter(conn => conn.brand_id === access.brand?.id)
                      if (brandConnections.length === 0) {
                        return (
                          <div className="text-sm text-gray-500 italic">No platforms connected</div>
                        )
                      }
                      return brandConnections.map((conn, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {conn.platform_type === 'shopify' ? (
                            <div className="w-6 h-6 rounded-md border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
                              <img 
                                src="/shopify-icon.png" 
                                alt="Shopify" 
                                className="w-5 h-5 object-contain"
                              />
                            </div>
                          ) : conn.platform_type === 'meta' ? (
                            <div className="w-6 h-6 rounded-md border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
                              <img 
                                src="/meta-icon.png" 
                                alt="Meta" 
                                className="w-5 h-5 object-contain"
                              />
                            </div>
                          ) : null}
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl border border-[#333]">
            <div className="w-16 h-16 bg-gradient-to-br from-[#333] to-[#222] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Shared Brands</h3>
            <p className="text-gray-400 text-sm">You haven't shared any brands yet</p>
          </div>
        )}
      </div>
    )
  }

  if (type === 'share') {
    return (
      <div className="space-y-4">
        <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
          <p className="text-sm text-gray-400 mb-1">
            <strong className="text-white">How it works:</strong>
          </p>
          <p className="text-xs text-gray-500">
            Create secure invitation links to give team members access to your brand data. You can set specific permissions and revoke access at any time.
          </p>
        </div>
        
        <div className="space-y-3">
          {ownedBrands.map((brand) => (
            <div key={brand.id} className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg border border-[#333] group hover:border-[#444] transition-colors">
              <div className="flex items-center gap-3">
                {brand.image_url ? (
                  <img 
                    src={brand.image_url} 
                    alt={brand.name} 
                    className="w-8 h-8 rounded-full object-cover border-2 border-[#444]"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-[#333] to-[#222] rounded-full flex items-center justify-center text-white font-medium text-sm border-2 border-[#444]">
                    {brand.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-sm">{brand.name}</p>
                  <p className="text-xs text-gray-400">Create invitation links for this brand</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/share-brands')}
                className="border-[#333] bg-[#0f0f0f] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Share2 className="h-3 w-3 mr-1" />
                Share Access
              </Button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

const BRAND_NICHES = {
  'Local Services': [
    'Construction', 'Roofing', 'HVAC', 'Plumbing', 'Electrical Services', 
    'Painting', 'Flooring', 'Windows & Doors', 'Fencing', 'Concrete & Masonry',
    'Appliance Repair', 'Locksmith', 'Cleaning Services', 'Landscaping', 
    'Pool Services', 'Tree Services'
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
  ],
  'E-commerce': [
    'Clothing & Apparel', 'Jewelry & Accessories', 'Electronics', 'Home & Garden',
    'Beauty & Cosmetics', 'Health & Supplements', 'Sports & Outdoors', 
    'Books & Media', 'Art & Crafts', 'Food & Beverages'
  ]
}

const FLAT_NICHES = Object.values(BRAND_NICHES).flat().sort()

// Helper function to get Meta connection info
const getMetaConnectionInfo = (connections: PlatformConnection[], brandId: string) => {
  const metaConnection = connections.find(c => c.brand_id === brandId && c.platform_type === 'meta')
  if (!metaConnection) return null
  
  const createdAt = new Date(metaConnection.created_at)
  const expirationDate = new Date(createdAt.getTime() + (60 * 24 * 60 * 60 * 1000)) // 60 days
  const now = new Date()
  const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    createdAt,
    expirationDate,
    daysUntilExpiration,
    isExpiring: daysUntilExpiration <= 7,
    isExpired: daysUntilExpiration <= 0
  }
}

export default function SettingsPage() {
  const { user } = useUser()
  const { brands, selectedBrandId, setSelectedBrandId, refreshBrands } = useBrandContext()
  const { agencySettings, updateAgencySettings, isLoading: agencyLoading } = useAgency()
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [activeTab, setActiveTab] = useState('agency-branding')
  const [isAddingBrand, setIsAddingBrand] = useState(false)
  const [isAddBrandDialogOpen, setIsAddBrandDialogOpen] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandImage, setNewBrandImage] = useState<File | null>(null)
  const [newBrandNiche, setNewBrandNiche] = useState("")
  const [customNiche, setCustomNiche] = useState("")
  const [showCustomNicheInput, setShowCustomNicheInput] = useState(false)
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const supabase = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [disconnectingPlatforms, setDisconnectingPlatforms] = useState<Record<string, boolean>>({})
  
  // Agency settings form state
  const [tempAgencyName, setTempAgencyName] = useState(agencySettings.agency_name)
  const [tempAgencyLogo, setTempAgencyLogo] = useState<File | null>(null)
  const [tempSignatureName, setTempSignatureName] = useState(agencySettings.signature_name || '')
  const [tempSignatureImage, setTempSignatureImage] = useState<File | null>(null)
  const [isSavingAgency, setIsSavingAgency] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [removeSignature, setRemoveSignature] = useState(false)

  // Brand editing state
  const [editingBrand, setEditingBrand] = useState<string | null>(null)
  const [editBrandName, setEditBrandName] = useState("")
  const [editBrandNiche, setEditBrandNiche] = useState("")
  const [editBrandImage, setEditBrandImage] = useState<File | null>(null)
  const [editBrandImagePreview, setEditBrandImagePreview] = useState<string | null>(null)
  const [editCustomNiche, setEditCustomNiche] = useState("")
  const [showEditCustomNicheInput, setShowEditCustomNicheInput] = useState(false)

  // Sync temp agency name with context when agency settings change
  useEffect(() => {
    setTempAgencyName(agencySettings.agency_name)
    setTempSignatureName(agencySettings.signature_name || '')
    setLogoPreview(null)
    setSignaturePreview(null)
    setRemoveLogo(false)
    setRemoveSignature(false)
  }, [agencySettings.agency_name, agencySettings.signature_name])

  // Handle tab parameter from URL
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['agency-branding', 'brand-management', 'brand-access', 'operator-account', 'legal-privacy'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Handle logo file selection
  const handleLogoChange = async (file: File | null) => {
    setTempAgencyLogo(file)
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setLogoPreview(base64)
      } catch (error) {
        console.error('Error converting file to base64:', error)
        toast.error('Failed to process image file')
      }
    } else {
      setLogoPreview(null)
    }
  }

  // Handle signature file selection
  const handleSignatureChange = async (file: File | null) => {
    setTempSignatureImage(file)
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setSignaturePreview(base64)
      } catch (error) {
        console.error('Error converting signature file to base64:', error)
        toast.error('Failed to process signature image')
      }
    } else {
      setSignaturePreview(null)
    }
  }

  // Handle logo removal
  const handleRemoveLogo = () => {
    if (logoPreview) {
      // If it's just a preview, clear it
      setLogoPreview(null)
      setTempAgencyLogo(null)
    } else {
      // If it's an existing logo, mark for removal
      setRemoveLogo(true)
    }
  }

  // Handle signature removal
  const handleRemoveSignature = () => {
    if (signaturePreview) {
      // If it's just a preview, clear it
      setSignaturePreview(null)
      setTempSignatureImage(null)
    } else {
      // If it's an existing signature, mark for removal
      setRemoveSignature(true)
    }
  }

  // Handle brand image change
  const handleBrandImageChange = async (file: File | null) => {
    setEditBrandImage(file)
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setEditBrandImagePreview(base64)
    } catch (error) {
        console.error('Error converting brand image to base64:', error)
        toast.error('Failed to process brand image')
      }
    } else {
      setEditBrandImagePreview(null)
    }
  }

  // Handle agency settings save
  const handleSaveAgencySettings = async () => {
    if (!tempAgencyName.trim()) {
      toast.error('Agency name is required')
      return
    }

    setIsSavingAgency(true)
    
    try {
      let logoUrl = agencySettings.agency_logo_url
      let signatureUrl = agencySettings.signature_image

      // Handle logo changes
      if (removeLogo) {
        logoUrl = null
      } else if (tempAgencyLogo) {
        logoUrl = await fileToBase64(tempAgencyLogo)
      }

      // Handle signature changes
      if (removeSignature) {
        signatureUrl = null
      } else if (tempSignatureImage) {
        signatureUrl = await fileToBase64(tempSignatureImage)
      }

      const success = await updateAgencySettings({
        agency_name: tempAgencyName.trim(),
        agency_logo_url: logoUrl,
        signature_name: tempSignatureName.trim() || undefined,
        signature_image: signatureUrl
      })

      if (success) {
        toast.success('Agency settings updated successfully!')
        setTempAgencyLogo(null)
        setTempSignatureImage(null)
        setLogoPreview(null)
        setSignaturePreview(null)
        setRemoveLogo(false)
        setRemoveSignature(false)
      } else {
        toast.error('Failed to update agency settings')
      }
    } catch (error) {
      console.error('Error saving agency settings:', error)
      toast.error('Failed to update agency settings')
    } finally {
      setIsSavingAgency(false)
    }
  }

  // Page loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Load connections for all accessible brands (both owned and shared)
  const loadConnections = useCallback(async () => {
    if (!user || brands.length === 0) return
    
    // Get all brand IDs from both owned and shared brands
    const brandIds = brands.map(brand => brand.id)
    
    const { data, error } = await supabase
      .from('platform_connections')
      .select('*')
      .in('brand_id', brandIds)
      .eq('status', 'active')

    if (error) {
      console.error('Error loading connections:', error)
      return
    }

    setConnections(data as PlatformConnection[] | [])
  }, [user, supabase, brands])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  // Handle niche selection change
  const handleNicheChange = (value: string) => {
    setNewBrandNiche(value)
    if (value === "other") {
      setShowCustomNicheInput(true)
    } else {
      setShowCustomNicheInput(false)
      setCustomNiche("")
    }
  }

  // Handle edit niche selection change
  const handleEditNicheChange = (value: string) => {
    setEditBrandNiche(value)
    if (value === "other") {
      setShowEditCustomNicheInput(true)
    } else {
      setShowEditCustomNicheInput(false)
      setEditCustomNiche("")
    }
  }

  // Handle adding brand
  const handleAddBrand = async () => {
    if (!newBrandName || !user) return

    setIsAddingBrand(true)
    try {
      let imageUrl = null
      if (newBrandImage) {
        imageUrl = await fileToBase64(newBrandImage)
      }

      // Use custom niche if "other" was selected and custom niche provided
      const finalNiche = newBrandNiche === "other" && customNiche.trim() 
        ? customNiche.trim() 
        : newBrandNiche || null

      const { data, error } = await supabase
        .from('brands')
        .insert({
          name: newBrandName,
          user_id: user.id,
          niche: finalNiche,
          image_url: imageUrl
        })
        .select()
        .single()

      if (error) throw error

      await refreshBrands()
      
      // Reset form and close dialog
      setNewBrandName("")
      setNewBrandNiche("")
      setNewBrandImage(null)
      setCustomNiche("")
      setShowCustomNicheInput(false)
      setIsAddBrandDialogOpen(false)
      
      toast.success('Brand added successfully!')
    } catch (error) {
      console.error('Error adding brand:', error)
      toast.error('Failed to add brand')
    } finally {
      setIsAddingBrand(false)
    }
  }

  // Handle editing brand
  const handleEditBrand = async (brandId: string) => {
    const brand = brands.find(b => b.id === brandId)
    if (!brand) return

    setEditingBrand(brandId)
    setEditBrandName(brand.name)
    
    // Check if niche is a predefined one or custom
    const brandNiche = (brand as any).niche || ""
    const isCustomNiche = brandNiche && !FLAT_NICHES.includes(brandNiche)
    
    if (isCustomNiche) {
      setEditBrandNiche("other")
      setEditCustomNiche(brandNiche)
      setShowEditCustomNicheInput(true)
        } else {
      setEditBrandNiche(brandNiche)
      setEditCustomNiche("")
      setShowEditCustomNicheInput(false)
    }
    
    setEditBrandImage(null)
    setEditBrandImagePreview(null)
  }

  // Handle saving brand edit
  const handleSaveBrandEdit = async () => {
    if (!editingBrand || !editBrandName.trim()) return

    try {
      let imageUrl = brands.find(b => b.id === editingBrand)?.image_url
      if (editBrandImage) {
        imageUrl = await fileToBase64(editBrandImage)
      }

      // Use custom niche if "other" was selected and custom niche provided
      const finalNiche = editBrandNiche === "other" && editCustomNiche.trim() 
        ? editCustomNiche.trim() 
        : editBrandNiche || null

      const { error } = await supabase
        .from('brands')
        .update({
          name: editBrandName.trim(),
          niche: finalNiche,
          image_url: imageUrl
        })
        .eq('id', editingBrand)

      if (error) throw error

      await refreshBrands()
      setEditingBrand(null)
      setEditBrandName("")
      setEditBrandNiche("")
      setEditBrandImage(null)
      setEditBrandImagePreview(null)
      setEditCustomNiche("")
      setShowEditCustomNicheInput(false)
      toast.success('Brand updated successfully!')
    } catch (error) {
      console.error('Error updating brand:', error)
      toast.error('Failed to update brand')
    }
  }

  // Handle deleting brand
  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand? This will also disconnect all platforms.')) return

    try {
      // First disconnect all platforms
      const brandConnections = connections.filter(c => c.brand_id === brandId)
      for (const connection of brandConnections) {
        await handleDisconnect(connection.platform_type as 'shopify' | 'meta', brandId)
      }

      // Then delete the brand
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId)

      if (error) throw error

      await refreshBrands()
      toast.success('Brand deleted successfully')
    } catch (error) {
      console.error('Error deleting brand:', error)
      toast.error('Failed to delete brand')
    }
  }

  // Handle platform disconnect
  const handleDisconnect = async (platform: 'shopify' | 'meta', brandId: string) => {
    const key = `${platform}-${brandId}`
    setDisconnectingPlatforms(prev => ({ ...prev, [key]: true }))
    
    try {
      const response = await fetch('/api/disconnect-platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, platformType: platform }),
      })
      
      if (!response.ok) {
        const responseData = await response.json()
        if (response.status === 409) {
          const forceDelete = confirm(
            `There are still related records for this ${platform} connection. ` +
            `Would you like to force delete it? This may result in orphaned data.`
          )
          
          if (forceDelete) {
            const { error } = await supabase
              .from('platform_connections')
              .delete()
              .eq('brand_id', brandId)
              .eq('platform_type', platform)
              
            if (error) throw new Error(`Force delete failed: ${error.message}`)
            
            await loadConnections()
            toast.success(`${platform} disconnected successfully (forced)`)
          } else {
            toast.error(`Disconnect cancelled. Please delete related data first.`)
          }
        } else {
          throw new Error(responseData.error || 'Failed to disconnect platform')
        }
      } else {
        await loadConnections()
        toast.success(`${platform} disconnected successfully`)
      }
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error)
      toast.error(`Failed to disconnect ${platform}: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setDisconnectingPlatforms(prev => ({ ...prev, [key]: false }))
    }
  }

  // Handle platform connect
  const handleConnect = async (platform: 'shopify' | 'meta', brandId: string) => {
    try {
      if (platform === 'shopify') {
        const { data: connection, error } = await supabase
          .from('platform_connections')
          .insert({
            platform_type: 'shopify',
            brand_id: brandId,
            user_id: user?.id,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single()
          
        if (error) {
          console.error('Error creating Shopify connection:', error)
          toast.error('Failed to create Shopify connection')
          return
        }
        
        const shop = prompt('Enter your Shopify store URL (e.g., your-store.myshopify.com):')
        if (!shop) {
          toast.error('Shop URL is required')
          return
        }
        
        window.location.href = `/api/shopify/auth?brandId=${brandId}&connectionId=${connection.id}&shop=${shop}`
      } else if (platform === 'meta') {
        window.location.href = `/api/auth/meta?brandId=${brandId}`
      }
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to initiate connection')
    }
  }

  // Handle clear all data
  const handleClearAllData = async () => {
    if (!confirm('WARNING: This will delete ALL brands and their platform connections for your account. This cannot be undone.')) return
    
    const confirmText = 'DELETE ALL DATA'
    const userInput = prompt(`To confirm, please type "${confirmText}" in all caps:`)
    if (userInput !== confirmText) {
      toast.error('Deletion cancelled - text did not match')
      return
    }
    
    try {
      if (!user?.id) throw new Error('No user ID found')

      await supabase.from('platform_connections').delete().eq('user_id', user.id)
      await supabase.from('brands').delete().eq('user_id', user.id)

      await refreshBrands()
      toast.success('All data has been cleared successfully')
    } catch (error) {
      console.error('Error clearing data:', error)
      toast.error('Failed to clear data. Please try again.')
    }
  }

  // Render brand avatar with modern styling
  const renderBrandAvatar = (brand: any, size: 'sm' | 'md' = 'md') => {
    const sizeClasses = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12'
    
    if (brand.image_url) {
      return (
        <img 
          src={brand.image_url} 
          alt={brand.name} 
          className={cn(sizeClasses, "rounded-xl object-cover border-2 border-[#444] shadow-lg")}
        />
      )
    }
    
    return (
      <div className={cn(
        sizeClasses,
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 text-white font-bold border-2 border-[#444] shadow-lg",
        size === 'sm' ? 'text-sm' : 'text-lg'
      )}>
        {brand.name.charAt(0).toUpperCase()}
      </div>
    )
  }

  // Show loading state with enhanced progress display
  if (isLoadingPage) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden" style={{ paddingBottom: '15vh' }}>
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
            <div className="absolute inset-0 rounded-full border-4 border-t-white/60 animate-spin"></div>
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
            Settings
          </h1>
          
          {/* Dynamic loading phase */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            Configuring your preferences
          </p>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Building your personalized settings dashboard...
          </div>
        </div>
      </div>
    )
  }

  // Define navigation items
  const navigationItems = [
    {
      id: 'agency-branding',
      label: 'Agency Branding',
      icon: Building2,
      description: 'Customize your agency identity'
    },

    {
      id: 'brand-management',
      label: 'Connection Management',
      icon: Tag,
      description: 'Manage brand profiles and connections'
    },
    {
      id: 'brand-access',
      label: 'Access Management',
      icon: Share2,
      description: 'Control brand sharing and permissions'
    },
    {
      id: 'operator-account',
      label: 'Operator Account',
      icon: Shield,
      description: 'Your account settings'
    },
    {
      id: 'legal-privacy',
      label: 'Legal & Privacy',
      icon: Info,
      description: 'Terms and privacy policies'
    }
  ]

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="px-6 py-8 border-b border-[#333]">
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-gray-400">Manage your agency, brands, and platform connections</p>
          </div>

          <div className="flex">
            {/* Sidebar Navigation */}
            <div className="w-96 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-r border-[#333] min-h-[calc(100vh-140px)]">
              <div className="p-6">
                <nav className="space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                          isActive 
                            ? "bg-gradient-to-r from-white to-gray-200 text-black shadow-lg" 
                            : "text-gray-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.label}</p>
                          <p className={cn(
                            "text-xs leading-tight",
                            isActive ? "text-gray-600" : "text-gray-500"
                          )}>
                            {item.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 min-h-[calc(100vh-140px)] overflow-y-auto">
              {/* Agency Branding Tab */}
              {activeTab === 'agency-branding' && (
                <div className="space-y-6">
                  {/* Hero Section */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-[#333] p-6 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-white/[0.01] to-white/[0.02]" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">Agency Branding</h2>
                          <p className="text-gray-400">Craft your professional identity across all touchpoints</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-green-400" />
                            </div>
                            <h3 className="text-white font-medium text-sm">Professional Reports</h3>
                          </div>
                          <p className="text-gray-400 text-xs">Your branding appears on all generated reports and analytics</p>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-blue-400" />
                            </div>
                            <h3 className="text-white font-medium text-sm">Client Contracts</h3>
                          </div>
                          <p className="text-gray-400 text-xs">Digital signatures automatically added to client agreements</p>
                        </div>
                        <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-gray-400" />
                            </div>
                            <h3 className="text-white font-medium text-sm">Platform Wide</h3>
                          </div>
                          <p className="text-gray-400 text-xs">Consistent branding throughout the entire platform</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agency Identity Section */}
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardHeader className="border-b border-[#333] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
                          <Tag className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-white">Agency Identity</CardTitle>
                          <p className="text-gray-400 text-sm">Define your agency's core identity and visual presence</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Agency Name */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-medium text-white">Agency Name</Label>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">
                              Required
                            </Badge>
                          </div>
                          <div className="relative">
                            <Input 
                              value={tempAgencyName}
                              onChange={(e) => setTempAgencyName(e.target.value)}
                              placeholder="Enter your agency name"
                              className="h-11 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 rounded-xl"
                              disabled={agencyLoading || isSavingAgency}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {tempAgencyName && (
                                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-green-400" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                            <p className="text-sm text-gray-400 mb-2">
                              <strong className="text-white">Preview:</strong> How your agency name will appear
                            </p>
                            <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#333]">
                              <p className="text-white font-medium">
                                {tempAgencyName || "Your Agency Name"}
                              </p>
                              <p className="text-gray-400 text-sm">Marketing Dashboard Report</p>
                            </div>
                          </div>
                        </div>

                        {/* Agency Logo */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-medium text-white">Agency Logo</Label>
                            <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/30 text-xs">
                              Optional
                            </Badge>
                          </div>
                          
                          {(agencySettings.agency_logo_url || logoPreview) && !removeLogo ? (
                            <div className="space-y-3">
                              <div className="relative group">
                                <div className="w-full h-36 rounded-xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center p-4 overflow-hidden">
                                  <img 
                                    src={logoPreview || agencySettings.agency_logo_url!} 
                                    alt="Agency Logo" 
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={handleRemoveLogo}
                                  disabled={agencyLoading || isSavingAgency}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                                className="h-10 bg-[#1a1a1a] border-[#333] text-white file:bg-[#333] file:text-gray-300 file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 rounded-xl"
                                disabled={agencyLoading || isSavingAgency}
                              />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="relative group cursor-pointer">
                                <div className="w-full h-36 rounded-xl bg-[#1a1a1a] border-2 border-dashed border-[#333] flex items-center justify-center p-4 transition-all duration-200 hover:border-[#444] hover:bg-[#222]">
                                  <div className="text-center max-w-full">
                                    <div className="w-12 h-12 rounded-xl bg-[#333] flex items-center justify-center mx-auto mb-3 group-hover:bg-[#444] transition-colors">
                                      <Upload className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-white font-medium mb-1 text-sm">Upload Agency Logo</p>
                                    <p className="text-gray-400 text-xs mb-2">
                                      Drag & drop or click to browse
                                    </p>
                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                      <Badge variant="outline" className="bg-[#333] text-gray-300 border-[#444] text-xs">
                                        PNG
                                      </Badge>
                                      <Badge variant="outline" className="bg-[#333] text-gray-300 border-[#444] text-xs">
                                        JPG
                                      </Badge>
                                      <Badge variant="outline" className="bg-[#333] text-gray-300 border-[#444] text-xs">
                                        SVG
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  disabled={agencyLoading || isSavingAgency}
                                />
                              </div>
                              <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                                <p className="text-sm text-gray-400 mb-1">
                                  <strong className="text-white">Recommended:</strong> Square format (1:1 ratio) for best results
                                </p>
                                <p className="text-xs text-gray-500">
                                  Maximum file size: 2MB • Optimal dimensions: 400x400px
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Digital Signature Section */}
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardHeader className="border-b border-[#333] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
                          <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-white">Digital Signature</CardTitle>
                          <p className="text-gray-400 text-sm">Professional signature for client contracts and agreements</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Signature Name */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-medium text-white">Signature Name</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-gray-400 hover:text-gray-300 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm bg-[#1a1a1a] border-[#333] text-gray-200">
                                  <p className="text-sm">
                                    This name will appear on all generated contracts and legal documents
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Input 
                            value={tempSignatureName}
                            onChange={(e) => setTempSignatureName(e.target.value)}
                            placeholder="Enter your full legal name"
                            className="h-11 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 rounded-xl"
                            disabled={agencyLoading || isSavingAgency}
                          />
                          <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                            <p className="text-sm text-gray-400 mb-2">
                              <strong className="text-white">Contract Preview:</strong>
                            </p>
                            <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#333]">
                              <div className="flex items-end justify-between">
                                <div>
                                  <p className="text-gray-400 text-sm mb-1">Electronically signed by:</p>
                                  <p className="text-white font-medium">
                                    {tempSignatureName || "Your Name"}
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                    {tempAgencyName || "Your Agency"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-gray-400 text-xs">Date:</p>
                                  <p className="text-white text-sm font-medium">
                                    {new Date().toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Signature Image */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-base font-medium text-white">Signature Image</Label>
                            <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/30 text-xs">
                              Optional
                            </Badge>
                          </div>
                          
                          {(agencySettings.signature_image || signaturePreview) && !removeSignature ? (
                            <div className="space-y-3">
                              <div className="relative group">
                                <div className="w-full h-24 rounded-xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center p-3 overflow-hidden">
                                  <img 
                                    src={signaturePreview || agencySettings.signature_image!} 
                                    alt="Digital Signature" 
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={handleRemoveSignature}
                                  disabled={agencyLoading || isSavingAgency}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSignatureChange(e.target.files?.[0] || null)}
                                className="h-10 bg-[#1a1a1a] border-[#333] text-white file:bg-[#333] file:text-gray-300 file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 rounded-xl"
                                disabled={agencyLoading || isSavingAgency}
                              />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="relative group cursor-pointer">
                                <div className="w-full h-24 rounded-xl bg-[#1a1a1a] border-2 border-dashed border-[#333] flex items-center justify-center p-3 transition-all duration-200 hover:border-[#444] hover:bg-[#222]">
                                  <div className="text-center max-w-full">
                                    <div className="w-8 h-8 rounded-lg bg-[#333] flex items-center justify-center mx-auto mb-2 group-hover:bg-[#444] transition-colors">
                                      <Upload className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <p className="text-white font-medium text-xs mb-1">Upload Signature</p>
                                    <p className="text-gray-400 text-xs">
                                      Handwritten signature
                                    </p>
                                  </div>
                                </div>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSignatureChange(e.target.files?.[0] || null)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  disabled={agencyLoading || isSavingAgency}
                                />
                              </div>
                              <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                                <p className="text-sm text-gray-400 mb-1">
                                  <strong className="text-white">Tips for best results:</strong>
                                </p>
                                <ul className="text-xs text-gray-500 space-y-1">
                                  <li>• Use a white or transparent background</li>
                                  <li>• Ensure signature is clearly visible and high contrast</li>
                                  <li>• Recommended dimensions: 400x150px</li>
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Save Settings */}
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">Save Your Changes</h3>
                          <p className="text-gray-400 text-sm">
                            Apply your branding across all reports, contracts, and platform features
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {(tempAgencyName !== agencySettings.agency_name || tempAgencyLogo || tempSignatureImage || tempSignatureName !== (agencySettings.signature_name || '') || removeLogo || removeSignature) && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                              <Clock className="w-3 h-3 text-orange-400" />
                              <span className="text-orange-400 text-sm">Unsaved changes</span>
                            </div>
                          )}
                          <Button
                            onClick={handleSaveAgencySettings}
                            disabled={agencyLoading || isSavingAgency || (tempAgencyName === agencySettings.agency_name && !tempAgencyLogo && !tempSignatureImage && tempSignatureName === (agencySettings.signature_name || '') && !removeLogo && !removeSignature)}
                            className="bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-medium px-6 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSavingAgency ? (
                              <>
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                Saving Changes...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Agency Settings
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}


              {/* Connection Management Tab */}
              {activeTab === 'brand-management' && (
                <div className="space-y-8">
                  {/* Header Section */}
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Connection Management</h2>
                    <p className="text-gray-400">Manage brand profiles and connections</p>
                  </div>

                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-blue-400" />
                          </div>
                          <h3 className="text-white font-semibold text-sm">Total Brands</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{brands.length}</p>
                        <p className="text-xs text-gray-500 mt-1">Brands in your portfolio</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-400" />
                          </div>
                          <h3 className="text-white font-semibold text-sm">Platforms Connected</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{connections.length}</p>
                        <p className="text-xs text-gray-500 mt-1">Active platform integrations</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                            <Users className="w-4 h-4 text-purple-400" />
                          </div>
                          <h3 className="text-white font-semibold text-sm">Owned by You</h3>
                        </div>
                        <p className="text-3xl font-bold text-white">{brands.filter(brand => (brand as any).user_id === user?.id).length}</p>
                        <p className="text-xs text-gray-500 mt-1">Brands you manage</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-5 flex flex-col justify-center">
                        <Dialog open={isAddBrandDialogOpen} onOpenChange={setIsAddBrandDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl w-full">
                              <Plus className="h-4 w-4 mr-2" />
                              Add New Brand
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] text-white max-w-2xl">
                            <DialogHeader className="space-y-3 pb-6">
                              <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-white" />
                                </div>
                                Create New Brand
                              </DialogTitle>
                              <p className="text-sm text-gray-400">
                                Add a new brand to manage its marketing campaigns and platform connections
                              </p>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                  <Tag className="w-4 h-4" />
                                  Brand Name
                                </Label>
                                <Input 
                                  required
                                  value={newBrandName}
                                  onChange={(e) => setNewBrandName(e.target.value)}
                                  className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 h-11 rounded-xl"
                                  placeholder="Enter your brand name"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                  <Briefcase className="w-4 h-4" />
                                  Brand Niche
                                </Label>
                                <Select value={newBrandNiche} onValueChange={handleNicheChange}>
                                  <SelectTrigger className="bg-[#1a1a1a] border-[#333] text-white h-11 rounded-xl">
                                    <SelectValue placeholder="Select your industry (optional)" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#1a1a1a] border-[#333] text-white max-h-[300px]">
                                    {Object.entries(BRAND_NICHES).map(([category, niches]) => (
                                      <div key={category}>
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-gradient-to-r from-[#0f0f0f] to-transparent uppercase tracking-wider">
                                          {category}
                                        </div>
                                        {niches.map((niche) => (
                                          <SelectItem key={niche} value={niche} className="pl-6 text-white hover:bg-[#333] rounded-lg mx-1">
                                            {niche}
                                          </SelectItem>
                                        ))}
                                      </div>
                                    ))}
                                    <div className="border-t border-[#333] mt-2 pt-2">
                                      <SelectItem value="other" className="text-white hover:bg-[#333] rounded-lg mx-1 font-medium">
                                        <span className="flex items-center gap-2">
                                          <Plus className="w-4 h-4" />
                                          Other (specify custom)
                                        </span>
                                      </SelectItem>
                                    </div>
                                  </SelectContent>
                                </Select>
                                {showCustomNicheInput && (
                                  <div className="animate-in slide-in-from-top-2 duration-200">
                                    <Input 
                                      value={customNiche}
                                      onChange={(e) => setCustomNiche(e.target.value)}
                                      placeholder="Enter your custom industry niche"
                                      className="bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 h-11 rounded-xl"
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 flex items-start gap-1.5">
                                  <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  This helps our AI provide industry-specific recommendations
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                  <Image className="w-4 h-4" />
                                  Brand Logo
                                </Label>
                                <div className="flex items-center gap-4">
                                  <div className="relative group">
                                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-2 border-dashed border-[#333] flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-[#444]">
                                      {newBrandImage ? (
                                        <img 
                                          src={URL.createObjectURL(newBrandImage)} 
                                          alt="Brand preview" 
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Camera className="w-6 h-6 text-gray-500 group-hover:text-gray-400 transition-colors" />
                                      )}
                                    </div>
                                    <Input 
                                      type="file"
                                      onChange={(e) => setNewBrandImage(e.target.files?.[0] || null)}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      accept="image/*"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-white font-medium mb-1">Upload brand logo</p>
                                    <p className="text-xs text-gray-500">
                                      PNG, JPG or GIF (max. 2MB)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-[#333]">
                              <Button 
                                onClick={handleAddBrand}
                                disabled={isAddingBrand || !newBrandName.trim()}
                                className="flex-1 bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-medium py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isAddingBrand ? (
                                  <>
                                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                                    Creating Brand...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Brand
                                  </>
                                )}
                              </Button>
                              <Button 
                                onClick={() => {
                                  setIsAddBrandDialogOpen(false)
                                  setNewBrandName("")
                                  setNewBrandNiche("")
                                  setNewBrandImage(null)
                                  setCustomNiche("")
                                  setShowCustomNicheInput(false)
                                }}
                                variant="outline"
                                className="border-[#333] bg-[#2A2A2A] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl"
                              >
                                Cancel
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Brands List */}
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardHeader className="border-b border-[#333] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
                          <Briefcase className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-white">Your Brand Portfolio</CardTitle>
                          <p className="text-gray-400 text-sm">Manage brand profiles and platform connections</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {brands.length > 0 ? (
                        <div className="space-y-3">
                          {brands.map(brand => (
                            <BrandManagementDropdown 
                              key={brand.id}
                              brand={brand}
                              connections={connections}
                              onEdit={() => handleEditBrand(brand.id)}
                              onDelete={() => handleDeleteBrand(brand.id)}
                              onConnect={handleConnect}
                              onDisconnect={handleDisconnect}
                              disconnectingPlatforms={disconnectingPlatforms}
                              editingBrand={editingBrand}
                              editBrandName={editBrandName}
                              editBrandNiche={editBrandNiche}
                              editBrandImagePreview={editBrandImagePreview}
                              setEditBrandName={setEditBrandName}
                              setEditBrandNiche={handleEditNicheChange}
                              editCustomNiche={editCustomNiche}
                              setEditCustomNiche={setEditCustomNiche}
                              showEditCustomNicheInput={showEditCustomNicheInput}
                              onBrandImageChange={handleBrandImageChange}
                              onSaveEdit={handleSaveBrandEdit}
                              onCancelEdit={() => {
                                setEditingBrand(null)
                                setEditBrandImagePreview(null)
                                setEditCustomNiche("")
                                setShowEditCustomNicheInput(false)
                              }}
                              renderBrandAvatar={renderBrandAvatar}
                              getMetaConnectionInfo={getMetaConnectionInfo}
                              currentUserId={user?.id}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#333] to-[#222] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Tag className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2">No Brands Yet</h3>
                          <p className="text-gray-400 text-sm mb-4">Create your first brand to start managing platform connections</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Brand Access Tab */}
              {activeTab === 'brand-access' && (
                <div className="space-y-6">
                  {/* Overview Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                            <Eye className="w-3 h-3 text-gray-400" />
                          </div>
                          <h3 className="text-white font-medium text-sm">Brands Received</h3>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {brands.filter(brand => (brand as any).user_id !== user?.id).length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                            <Share2 className="w-3 h-3 text-gray-400" />
                          </div>
                          <h3 className="text-white font-medium text-sm">Brands Shared</h3>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {connections.filter(conn => brands.some(brand => brand.id === conn.brand_id && (brand as any).user_id === user?.id)).length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-gray-500/20 flex items-center justify-center">
                            <Users className="w-3 h-3 text-gray-400" />
                          </div>
                          <h3 className="text-white font-medium text-sm">Your Brands</h3>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {brands.filter(brand => (brand as any).user_id === user?.id).length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Access Management */}
                  <div className="space-y-6">
                    {/* Brands You've Shared */}
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardHeader className="border-b border-[#333] pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                            <Share2 className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-white">Brands You Share</CardTitle>
                            <p className="text-gray-400 text-sm">Your brands shared with team members</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <BrandAccessSection type="shared" connections={connections} />
                      </CardContent>
                    </Card>

                    {/* Share Brand Access Button */}
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardContent className="p-5 flex flex-col justify-center">
                        <Button 
                          onClick={() => router.push('/share-brands')}
                          className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl w-full"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share Brand Access
                        </Button>
                        <p className="text-xs text-gray-500 mt-2 text-center">Share one or multiple brands with team members</p>
                      </CardContent>
                    </Card>

                    {/* Brands You Have Access To */}
                    <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                      <CardHeader className="border-b border-[#333] pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center">
                            <Eye className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-white">Brands You Access</CardTitle>
                            <p className="text-gray-400 text-sm">Brands shared with you by others</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <BrandAccessSection type="received" connections={connections} />
                      </CardContent>
                    </Card>
                    </div>
                  </div>
              )}

              {/* Operator Account Tab */}
              {activeTab === 'operator-account' && (
                <div className="space-y-8">
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardHeader className="border-b border-[#333]">
                      <CardTitle className="text-lg font-semibold text-white">Operator Account</CardTitle>
                      <p className="text-sm text-gray-400">Manage your account settings and profile</p>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <UserButton appearance={{
                          elements: {
                            avatarBox: "w-12 h-12 shadow-lg",
                            userButtonPopoverCard: "bg-[#1a1a1a] border-[#333]",
                            userButtonPopoverFooter: "hidden"
                          }
                        }} />
                        <div>
                          <p className="font-medium text-white">{user?.fullName || user?.emailAddresses[0]?.emailAddress}</p>
                          <p className="text-sm text-gray-400">{user?.emailAddresses[0]?.emailAddress}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Click your avatar to manage account settings, security, and profile information
                      </p>
                    </CardContent>
                  </Card>

                  {/* Data Management Section */}
                  <Card className="bg-gradient-to-br from-red-950/20 to-red-900/10 border-red-800/30 shadow-xl">
                    <CardHeader className="border-b border-red-800/30">
                      <CardTitle className="text-lg font-semibold text-red-400">Data Management</CardTitle>
                      <p className="text-sm text-red-300/80">Permanently delete all your data</p>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Button
                        variant="destructive"
                        onClick={handleClearAllData}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All Data
                      </Button>
                      <p className="text-xs text-red-400 mt-2">
                        ⚠️ This action cannot be undone. All brands, connections, and data will be permanently deleted.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Legal & Privacy Tab */}
              {activeTab === 'legal-privacy' && (
                <div className="space-y-8">
                  <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
                    <CardHeader className="border-b border-[#333]">
                      <CardTitle className="text-lg font-semibold text-white">Legal & Privacy</CardTitle>
                      <p className="text-sm text-gray-400">Review our terms and privacy policies</p>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-[#333] bg-[#1a1a1a] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        onClick={() => window.open('/privacy', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Privacy Policy
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-[#333] bg-[#1a1a1a] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        onClick={() => window.open('/terms', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Terms of Service
                      </Button>
                      <p className="text-xs text-gray-500 mt-3">
                        Last updated: {new Date().toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
