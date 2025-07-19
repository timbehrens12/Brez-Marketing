"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit2, Trash2, ChevronDown, ChevronUp, Save, X, Camera, Info, AlertTriangle, CheckCircle, Shield } from "lucide-react"

import { cn } from "@/lib/utils"

// Brand niches for the select dropdown
const FLAT_NICHES = [
  'Construction', 'Roofing', 'HVAC', 'Plumbing', 'Electrical Services', 
  'Painting', 'Flooring', 'Windows & Doors', 'Fencing', 'Concrete & Masonry',
  'Appliance Repair', 'Locksmith', 'Cleaning Services', 'Landscaping', 
  'Pool Services', 'Tree Services', 'General Dentistry', 'Orthodontics', 
  'Healthcare', 'Chiropractic', 'Physical Therapy', 'Mental Health', 
  'Optometry', 'Med Spas', 'Massage Therapy', 'Beauty Salons', 'Tattoo Shops', 
  'Personal Training', 'Fitness Centers', 'Photography', 'Pet Services',
  'Auto Services', 'Auto Repair', 'Towing Services', 'Professional Services', 
  'Marketing Agency', 'Real Estate', 'Insurance', 'Financial Services', 
  'Computer Repair', 'Food Services', 'Wedding Services', 'Event Planning', 
  'Moving Services', 'Security Services', 'Pest Control', 'Senior Care', 
  'Child Care', 'Tutoring', 'Clothing & Apparel', 'Jewelry & Accessories', 
  'Electronics', 'Home & Garden', 'Beauty & Cosmetics', 'Health & Supplements', 
  'Sports & Outdoors', 'Books & Media', 'Art & Crafts', 'Food & Beverages'
].sort()

interface BrandManagementDropdownProps {
  brand: any
  connections: any[]
  onEdit: () => void
  onDelete: () => void
  onConnect: (platform: 'shopify' | 'meta', brandId: string) => void
  onDisconnect: (platform: 'shopify' | 'meta', brandId: string) => void
  disconnectingPlatforms: Record<string, boolean>
  editingBrand: string | null
  editBrandName: string
  editBrandNiche: string
  editBrandImagePreview: string | null
  setEditBrandName: (name: string) => void
  setEditBrandNiche: (niche: string) => void
  editCustomNiche?: string
  setEditCustomNiche?: (niche: string) => void
  showEditCustomNicheInput?: boolean
  onBrandImageChange: (file: File | null) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  renderBrandAvatar: (brand: any, size?: 'sm' | 'md') => React.ReactNode
  getMetaConnectionInfo: (connections: any[], brandId: string) => any
  currentUserId?: string
}

export function BrandManagementDropdown({
  brand,
  connections,
  onEdit,
  onDelete,
  onConnect,
  onDisconnect,
  disconnectingPlatforms,
  editingBrand,
  editBrandName,
  editBrandNiche,
  editBrandImagePreview,
  setEditBrandName,
  setEditBrandNiche,
  editCustomNiche = "",
  setEditCustomNiche,
  showEditCustomNicheInput = false,
  onBrandImageChange,
  onSaveEdit,
  onCancelEdit,
  renderBrandAvatar,
  getMetaConnectionInfo,
  currentUserId
}: BrandManagementDropdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [pixelStatus, setPixelStatus] = useState<any>(null)
  const [loadingPixelStatus, setLoadingPixelStatus] = useState(false)

  const shopifyConnection = connections.find(c => c.brand_id === brand.id && c.platform_type === 'shopify')
  const metaConnection = connections.find(c => c.brand_id === brand.id && c.platform_type === 'meta')
  const metaConnectionInfo = getMetaConnectionInfo(connections, brand.id)

  // Check if current user can manage platforms for this brand
  const isOwner = brand.user_id === currentUserId
  const isSharedBrand = brand.shared_access && !isOwner
  const canManagePlatforms = isOwner || (isSharedBrand && brand.shared_access?.can_manage_platforms)

  // Check Meta pixel status when component mounts and Meta connection exists
  useEffect(() => {
    if (metaConnection && !pixelStatus && !loadingPixelStatus) {
      checkMetaPixelStatus()
    }
  }, [metaConnection])

  const checkMetaPixelStatus = async () => {
    if (!metaConnection) return
    
    setLoadingPixelStatus(true)
    try {
      const response = await fetch(`/api/meta/pixel-check?brandId=${brand.id}`)
      if (response.ok) {
        const data = await response.json()
        setPixelStatus(data)
      }
    } catch (error) {
      console.error('Error checking pixel status:', error)
    } finally {
      setLoadingPixelStatus(false)
    }
  }

  // Render platform logo - only show if connected
  const renderPlatformLogo = (platform: 'shopify' | 'meta', isConnected: boolean) => {
    if (!isConnected) return null

    const logos = {
      shopify: '/shopify-icon.png',
      meta: '/meta-icon.png'
    }

    return (
      <div className="w-5 h-5 rounded-md border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
        <img 
          src={logos[platform]} 
          alt={platform} 
          className="w-4 h-4 object-contain"
        />
      </div>
    )
  }

  if (editingBrand === brand.id) {
    // Edit mode - always expanded
    return (
      <div className="border border-[#333] rounded-xl p-6 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] shadow-lg">
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              {editBrandImagePreview || brand.image_url ? (
                <img 
                  src={editBrandImagePreview || brand.image_url} 
                  alt={brand.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-[#444]"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-white font-bold text-xl border-2 border-[#444]">
                  {editBrandName.charAt(0).toUpperCase() || brand.name.charAt(0).toUpperCase()}
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-gray-200 to-gray-300 text-black rounded-full flex items-center justify-center cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-colors shadow-lg">
                <Camera className="w-3 h-3" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onBrandImageChange(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">Edit Brand</h3>
              <p className="text-sm text-gray-400">Update brand information and profile picture</p>
            </div>
          </div>
          
          <div>
            <Label className="text-sm text-gray-300">Brand Name</Label>
            <Input
              value={editBrandName}
              onChange={(e) => setEditBrandName(e.target.value)}
              className="mt-1 bg-[#0f0f0f] border-[#333] text-white rounded-xl"
            />
          </div>
          <div>
            <Label className="text-sm text-gray-300">Brand Niche</Label>
            <Select value={editBrandNiche} onValueChange={setEditBrandNiche}>
              <SelectTrigger className="mt-1 bg-[#0f0f0f] border-[#333] text-white rounded-xl">
                <SelectValue placeholder="Select a niche" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-[#333] text-white">
                {FLAT_NICHES.map((niche) => (
                  <SelectItem key={niche} value={niche} className="text-white hover:bg-[#333]">{niche}</SelectItem>
                ))}
                <SelectItem value="other" className="text-white hover:bg-[#333]">Other (specify custom)</SelectItem>
              </SelectContent>
            </Select>
            {showEditCustomNicheInput && setEditCustomNiche && (
              <Input
                placeholder="Enter custom niche..."
                value={editCustomNiche}
                onChange={(e) => setEditCustomNiche(e.target.value)}
                className="mt-2 bg-[#0f0f0f] border-[#333] text-white rounded-xl"
              />
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={onSaveEdit} 
              className="bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-black rounded-xl shadow-lg hover:shadow-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button 
              onClick={onCancelEdit} 
              variant="outline" 
              className="border-[#333] bg-[#0f0f0f] text-white hover:bg-[#333] rounded-xl"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[#333] rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] shadow-lg overflow-hidden">
      {/* Collapsed State - Brand Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          {renderBrandAvatar(brand, 'sm')}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-white truncate">{brand.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                {renderPlatformLogo('shopify', !!shopifyConnection)}
                {renderPlatformLogo('meta', !!metaConnection)}
              </div>
              {(brand as any).niche && (
                <span className="text-xs text-gray-400 bg-[#333] px-2 py-1 rounded-full">
                  {(brand as any).niche}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400">
            {[shopifyConnection, metaConnection].filter(Boolean).length} of 2 connected
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded State - Platform Management */}
      {isExpanded && (
        <div className="border-t border-[#333] p-4 space-y-4">
          {/* Brand Actions */}
          <div className="flex gap-2 pb-3 border-b border-[#333]">
            {isOwner && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); onEdit(); }} 
                  className="border-[#333] bg-[#0f0f0f] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl shadow-lg hover:shadow-xl"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit Brand
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                  className="border-[#444] bg-[#0f0f0f] text-gray-400 hover:bg-[#333] hover:text-gray-300 rounded-xl shadow-lg hover:shadow-xl"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </>
            )}
            {isSharedBrand && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Shield className="w-4 h-4" />
                <span>Shared brand - {brand.shared_access?.role.replace('_', ' ')}</span>
              </div>
            )}
          </div>

          {/* Platform Connections */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Platform Connections</h4>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Shopify */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-[#333]">
                <div className="flex items-center gap-3">
                  <img src="/shopify-icon.png" alt="Shopify" className="w-6 h-6" />
                  <div>
                    <span className="text-white font-medium text-sm">Shopify</span>
                    <p className="text-xs text-gray-400">E-commerce platform</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {shopifyConnection ? (
                    <>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-green-400 font-medium">Connected</span>
                      </div>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); canManagePlatforms && onDisconnect('shopify', brand.id); }}
                            disabled={disconnectingPlatforms[`shopify-${brand.id}`] || !canManagePlatforms}
                            className={cn(
                              "border-[#444] bg-[#0f0f0f] text-gray-400 text-xs py-1 px-2 rounded-md",
                              canManagePlatforms ? "hover:bg-[#333] hover:text-gray-300" : "cursor-not-allowed opacity-50"
                            )}
                          >
                            {disconnectingPlatforms[`shopify-${brand.id}`] ? 'Disconnecting...' : 'Disconnect'}
                          </Button>
                        </TooltipTrigger>
                        {!canManagePlatforms && (
                          <TooltipContent>
                            <p>You do not have permission to edit the connection status</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-xs text-gray-400 font-medium">Not connected</span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); canManagePlatforms && onConnect('shopify', brand.id); }}
                            disabled={!canManagePlatforms}
                            className={cn(
                              "text-black text-xs py-1 px-2 rounded-md shadow-lg",
                              canManagePlatforms 
                                ? "bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 hover:shadow-xl" 
                                : "bg-gray-500 cursor-not-allowed opacity-50"
                            )}
                          >
                            Connect
                          </Button>
                        </TooltipTrigger>
                        {!canManagePlatforms && (
                          <TooltipContent>
                            <p>You do not have permission to edit the connection status</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-[#333]">
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <img src="/meta-icon.png" alt="Meta" className="w-6 h-6" />
                    <div>
                      <span className="text-white font-medium text-sm">Meta Ads</span>
                      <p className="text-xs text-gray-400">Facebook & Instagram</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {metaConnection && metaConnectionInfo ? (
                      <>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            metaConnectionInfo.isExpired ? 'bg-red-400' : 
                            metaConnectionInfo.isExpiring ? 'bg-yellow-400' : 'bg-green-400'
                          }`}></div>
                          <span className={`text-xs font-medium ${
                            metaConnectionInfo.isExpired ? 'text-red-400' : 
                            metaConnectionInfo.isExpiring ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {metaConnectionInfo.isExpired ? 'Expired' : 
                             metaConnectionInfo.isExpiring ? `${metaConnectionInfo.daysUntilExpiration}d left` : 'Connected'}
                          </span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3 text-gray-500" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#1a1a1a] border-[#333] text-white p-3 max-w-xs">
                            <div className="space-y-1 text-sm">
                              <p className="font-medium">Connected: {metaConnectionInfo.createdAt.toLocaleDateString()}</p>
                              <p>Expires: {metaConnectionInfo.expirationDate.toLocaleDateString()}</p>
                              <p className="text-xs text-gray-400">Meta tokens expire every 60 days for security</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); canManagePlatforms && onDisconnect('meta', brand.id); }}
                              disabled={disconnectingPlatforms[`meta-${brand.id}`] || !canManagePlatforms}
                              className={cn(
                                "border-[#444] bg-[#0f0f0f] text-gray-400 text-xs py-1 px-2 rounded-md",
                                canManagePlatforms ? "hover:bg-[#333] hover:text-gray-300" : "cursor-not-allowed opacity-50"
                              )}
                            >
                              {disconnectingPlatforms[`meta-${brand.id}`] ? 'Disconnecting...' : 'Disconnect'}
                            </Button>
                          </TooltipTrigger>
                          {!canManagePlatforms && (
                            <TooltipContent>
                              <p>You do not have permission to edit the connection status</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-xs text-gray-400 font-medium">Not connected</span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); canManagePlatforms && onConnect('meta', brand.id); }}
                              disabled={!canManagePlatforms}
                              className={cn(
                                "text-black text-xs py-1 px-2 rounded-md shadow-lg",
                                canManagePlatforms 
                                  ? "bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 hover:shadow-xl" 
                                  : "bg-gray-500 cursor-not-allowed opacity-50"
                              )}
                            >
                              Connect
                            </Button>
                          </TooltipTrigger>
                          {!canManagePlatforms && (
                            <TooltipContent>
                              <p>You do not have permission to edit the connection status</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>

                {/* Pixel Status Section */}
                {metaConnection && (
                  <div className="border-t border-[#333] p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-300 font-medium">Pixel Status:</span>
                        {loadingPixelStatus ? (
                          <div className="w-3 h-3 animate-spin rounded-full border border-gray-400 border-t-transparent"></div>
                        ) : pixelStatus ? (
                          <div className="flex items-center gap-1">
                            {pixelStatus.recommendation.color === 'green' && (
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            )}
                            {pixelStatus.recommendation.color === 'yellow' && (
                              <AlertTriangle className="w-3 h-3 text-yellow-400" />
                            )}
                            {pixelStatus.recommendation.color === 'red' && (
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                            )}
                            <span className={`text-xs font-medium ${
                              pixelStatus.recommendation.color === 'green' ? 'text-green-400' :
                              pixelStatus.recommendation.color === 'yellow' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {pixelStatus.recommendation.message}
                            </span>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); checkMetaPixelStatus(); }}
                            className="text-xs py-0.5 px-2 h-6 border-[#444] bg-[#0f0f0f] text-gray-400 hover:bg-[#333] hover:text-gray-300"
                          >
                            Check Pixel
                          </Button>
                        )}
                      </div>
                      {pixelStatus && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3 h-3 text-gray-500" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-[#1a1a1a] border-[#333] text-white p-3 max-w-xs">
                            <div className="space-y-2 text-sm">
                              <p className="font-medium">{pixelStatus.recommendation.action}</p>
                              {pixelStatus.pixelCount > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-400">Found {pixelStatus.pixelCount} pixel(s)</p>
                                  {pixelStatus.pixels.slice(0, 3).map((pixel: any) => (
                                    <p key={pixel.id} className="text-xs">
                                      {pixel.name} - {pixel.isActive ? 'Active' : 'Inactive'}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {pixelStatus.hasConversionTracking && (
                                <p className="text-xs text-green-400">✓ Conversion tracking detected</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 