'use client'

import { useState, useEffect, useRef, useMemo } from "react"
import { Check, ChevronDown, Building2, Store, Briefcase, Tag, Search } from "lucide-react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useUser } from "@clerk/nextjs"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { cn } from "@/lib/utils"
import { PlatformConnection } from "@/types/platformConnection"

interface BrandSelectorProps {
  onSelect: (brandId: string) => void
  selectedBrandId?: string | null
  className?: string
  isVisible?: boolean // Add prop to control visibility/closing
}

export default function BrandSelector({ onSelect, selectedBrandId, className, isVisible = true }: BrandSelectorProps) {
  const { brands } = useBrandContext()
  const { user } = useUser()
  const supabase = useSupabase()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Use all brands from context (includes both owned and shared)
  const allBrands = brands

  // Group brands by agency
  const groupedBrands = useMemo(() => {
    const ownedBrands = allBrands.filter((brand: any) => !brand.shared_access)
    const sharedBrands = allBrands.filter((brand: any) => brand.shared_access)

    // Group shared brands by agency
    const agencyGroups: Record<string, { agency: any, brands: any[] }> = {}
    sharedBrands.forEach((brand: any) => {
      if (brand.agency_info && brand.agency_info.name) {
        const agencyKey = brand.agency_info.owner_id
        if (!agencyGroups[agencyKey]) {
          agencyGroups[agencyKey] = {
            agency: brand.agency_info,
            brands: []
          }
        }
        agencyGroups[agencyKey].brands.push(brand)
      } else {
        // If no agency_info, create a fallback group
        const fallbackKey = brand.user_id || 'unknown'
        if (!agencyGroups[fallbackKey]) {
          agencyGroups[fallbackKey] = {
            agency: {
              name: 'Shared Brands',
              logo_url: null,
              owner_id: fallbackKey
            },
            brands: []
          }
        }
        agencyGroups[fallbackKey].brands.push(brand)
      }
    })

    return {
      owned: ownedBrands,
      agencies: Object.values(agencyGroups)
    }
  }, [allBrands])

  // Filter brands based on search query (search across all brands)
  const filteredBrands = allBrands.filter((brand: any) => 
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Also create filtered grouped brands for the dropdown
  const filteredGroupedBrands = useMemo(() => {
    if (!searchQuery) return groupedBrands

    const ownedBrands = groupedBrands.owned.filter((brand: any) => 
      brand.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    const agencies = groupedBrands.agencies.map((agencyGroup: any) => ({
      ...agencyGroup,
      brands: agencyGroup.brands.filter((brand: any) => 
        brand.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter((agencyGroup: any) => agencyGroup.brands.length > 0)

    return {
      owned: ownedBrands,
      agencies
    }
  }, [groupedBrands, searchQuery])

  // Load platform connections for all brands (not filtered by user_id)
  useEffect(() => {
    const loadConnections = async () => {
      if (!user || allBrands.length === 0) return
      
      // Get all brand IDs from both owned and shared brands
      const brandIds = allBrands.map(brand => brand.id)
      
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .in('brand_id', brandIds)
        .eq('status', 'active')

      if (!error && data) {
        setConnections(data as PlatformConnection[])
      }
    }

    loadConnections()
  }, [user, supabase, allBrands])

  // Listen for brand context refresh events to update connections
  useEffect(() => {
    const handleBrandRefresh = () => {
      // Reload connections when brands are refreshed
      if (user && allBrands.length > 0) {
        const brandIds = allBrands.map(brand => brand.id)
        
        supabase
          .from('platform_connections')
          .select('*')
          .in('brand_id', brandIds)
          .eq('status', 'active')
          .then(({ data, error }) => {
            if (!error && data) {
              setConnections(data as PlatformConnection[])
            }
          })
      }
    }

    // Listen for custom events that indicate brand data has been refreshed
    window.addEventListener('brandDataRefreshed', handleBrandRefresh)
    
    return () => {
      window.removeEventListener('brandDataRefreshed', handleBrandRefresh)
    }
  }, [user, supabase, allBrands])

  // Find the selected brand when selectedBrandId changes
  useEffect(() => {
    if (selectedBrandId) {
      const brand = allBrands.find((b: any) => b.id === selectedBrandId)
      setSelectedBrand(brand || null)
    } else {
      setSelectedBrand(null)
    }
  }, [selectedBrandId, allBrands])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    } else {
      setSearchQuery("")
    }
  }, [isOpen])

  // Close dropdown when component becomes invisible (sidebar minimized)
  useEffect(() => {
    if (!isVisible && isOpen) {
      setIsOpen(false)
    }
  }, [isVisible, isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (brand: any) => {
    setSelectedBrand(brand)
    onSelect(brand.id)
    setIsOpen(false)
  }

  // Get connected platforms for a brand
  const getBrandConnections = (brandId: string) => {
    return connections.filter(conn => conn.brand_id === brandId)
  }

  // Render brand avatar
  const renderBrandAvatar = (brand: any, size: 'sm' | 'md' = 'sm') => {
    const sizeClasses = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
    
    if (brand.image_url) {
      return (
        <img 
          src={brand.image_url} 
          alt={brand.name} 
          className={cn(sizeClasses, "rounded-full object-cover border border-[#444]")}
        />
      )
    }
    
    return (
      <div className={cn(
        sizeClasses,
        "flex items-center justify-center rounded-full bg-gradient-to-br from-gray-600 to-gray-700 text-white font-medium text-xs border border-[#444]"
      )}>
        {brand.name.charAt(0).toUpperCase()}
      </div>
    )
  }

  // Render platform connection icons with real logos
  const renderConnectionIcons = (brandId: string) => {
    const brandConnections = getBrandConnections(brandId)
    
    // Remove duplicates by platform_type
    const uniqueConnections = brandConnections.filter((connection, index, arr) => 
      arr.findIndex(c => c.platform_type === connection.platform_type) === index
    )
    
    return (
      <div className="flex items-center gap-1">
        {uniqueConnections.map((connection) => (
          <div
            key={`${connection.platform_type}-${brandId}`}
            className="w-4 h-4 rounded-sm overflow-hidden border border-white/30 bg-white/10"
            title={`${connection.platform_type.charAt(0).toUpperCase() + connection.platform_type.slice(1)} connected`}
          >
            {connection.platform_type === 'shopify' && (
              <img 
                src="https://i.imgur.com/cnCcupx.png" 
                alt="Shopify" 
                className="w-full h-full object-contain"
              />
            )}
            {connection.platform_type === 'meta' && (
              <img 
                src="https://i.imgur.com/VAR7v4w.png" 
                alt="Meta" 
                className="w-full h-full object-contain"
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className={cn("relative w-full min-w-0", className)}>
      <button
        type="button"
        className={cn(
          "flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-xl overflow-hidden",
          "bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333] text-white hover:from-[#252525] hover:to-[#1a1a1a]",
          "focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 shadow-lg",
          "transition-all duration-300 ease-out will-change-transform",
          isOpen && "ring-2 ring-white/20 border-white/30 shadow-xl"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {selectedBrand ? (
            <>
              <div className="flex-shrink-0 transition-opacity duration-300 ease-out">
                {renderBrandAvatar(selectedBrand, 'md')}
              </div>
              <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
                <div className="w-full overflow-hidden">
                  <span className="block truncate font-medium transition-opacity duration-300 ease-out whitespace-nowrap">{selectedBrand.name}</span>
                </div>
                {(selectedBrand as any).niche && (
                  <div className="w-full overflow-hidden">
                    <span className="block text-xs text-gray-400 truncate transition-opacity duration-300 ease-out whitespace-nowrap">{(selectedBrand as any).niche}</span>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 ml-2 transition-opacity duration-300 ease-out">
                {renderConnectionIcons(selectedBrand.id)}
              </div>
            </>
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0 transition-opacity duration-300 ease-out">
                <Tag className="w-3 h-3 text-gray-300" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <span className="block text-gray-400 transition-opacity duration-300 ease-out whitespace-nowrap">Select a brand</span>
              </div>
            </>
          )}
        </div>
        <ChevronDown 
          className={cn(
            "ml-2 h-4 w-4 text-gray-400 transition-transform duration-300",
            isOpen && "transform rotate-180"
          )} 
        />
      </button>

      {isOpen && (
        <div 
          className="absolute z-[9999] w-full mt-2 origin-top-right rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
        >
          <div className="py-2 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333] rounded-xl shadow-2xl max-h-80 overflow-hidden">
            {/* Search input */}
            <div className="sticky top-0 p-3 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-b border-[#333]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search brands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-[#252525] border border-[#333] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all duration-200"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {(filteredGroupedBrands.owned.length > 0 || filteredGroupedBrands.agencies.length > 0) ? (
                <>
                  {/* Your Brands Section */}
                  {filteredGroupedBrands.owned.length > 0 && (
                    <div>
                      <div className="px-3 py-2 text-xs font-medium text-gray-400 bg-[#0f0f0f] sticky top-0 z-10 border-b border-[#333]">
                        Your Brands
                      </div>
                      {filteredGroupedBrands.owned.map((brand: any) => (
                        <button
                          key={brand.id}
                          className={cn(
                            "flex items-center w-full px-3 py-3 text-sm text-left transition-all duration-200 group",
                            brand.id === selectedBrandId 
                              ? "bg-gradient-to-r from-white/10 to-white/5 text-white border-l-2 border-white/30" 
                              : "text-gray-300 hover:bg-gradient-to-r hover:from-white/5 hover:to-white/2 hover:text-white"
                          )}
                          onClick={() => handleSelect(brand)}
                        >
                          <div className="flex items-center gap-3 w-full min-w-0">
                            {renderBrandAvatar(brand, 'md')}
                            <div className="flex flex-col items-start min-w-0 flex-1">
                              <span className="truncate font-medium max-w-full">{brand.name}</span>
                              {brand.niche && (
                                <span className="text-xs text-gray-400 truncate max-w-full">{brand.niche}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {renderConnectionIcons(brand.id)}
                              {brand.id === selectedBrandId && (
                                <Check className="w-4 h-4 text-blue-400 ml-1" />
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Agency Sections */}
                  {filteredGroupedBrands.agencies.map((agencyGroup: any) => (
                    <div key={agencyGroup.agency.owner_id}>
                      <div className="px-3 py-3 text-sm font-medium text-white bg-[#0f0f0f] sticky top-0 z-10 border-b border-[#333] flex items-center gap-3">
                        {agencyGroup.agency.logo_url ? (
                          <div className="w-10 h-10 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                            <img 
                              src={agencyGroup.agency.logo_url} 
                              alt={agencyGroup.agency.name} 
                              className="w-8 h-8 object-contain rounded"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <span className="font-semibold">{agencyGroup.agency.name}</span>
                      </div>
                      {agencyGroup.brands.map((brand: any) => (
                        <button
                          key={brand.id}
                          className={cn(
                            "flex items-center w-full px-3 py-3 text-sm text-left transition-all duration-200 group",
                            brand.id === selectedBrandId 
                              ? "bg-gradient-to-r from-white/10 to-white/5 text-white border-l-2 border-white/30" 
                              : "text-gray-300 hover:bg-gradient-to-r hover:from-white/5 hover:to-white/2 hover:text-white"
                          )}
                          onClick={() => handleSelect(brand)}
                        >
                          <div className="flex items-center gap-3 w-full min-w-0">
                            {renderBrandAvatar(brand, 'md')}
                            <div className="flex flex-col items-start min-w-0 flex-1">
                              <span className="truncate font-medium max-w-full">{brand.name}</span>
                              {brand.niche && (
                                <span className="text-xs text-gray-400 truncate max-w-full">{brand.niche}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {renderConnectionIcons(brand.id)}
                              {brand.id === selectedBrandId && (
                                <Check className="w-4 h-4 text-blue-400 ml-1" />
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </>
              ) : searchQuery ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No brands found matching "{searchQuery}"
                </div>
              ) : (
                <div className="px-3 py-4 text-sm text-gray-500 text-center space-y-3">
                  <div>No brands available</div>
                  <div className="border-t border-gray-700 pt-3">
                    <a 
                      href="/lead-generator" 
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Find Leads to Sign
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
