import { useState, useEffect } from "react"
import { Building2, Plus } from "lucide-react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface OverlaidBrandLogosProps {
  agencySettings: {
    agency_logo_url?: string | null
    agency_name?: string
  }
  agencyLoading: boolean
  maxVisibleBrands?: number
  showExpanded: boolean
}

export default function OverlaidBrandLogos({ 
  agencySettings, 
  agencyLoading, 
  maxVisibleBrands = 4,
  showExpanded 
}: OverlaidBrandLogosProps) {
  const { brands } = useBrandContext()
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  // Get user's own brands (not shared ones)
  const ownedBrands = brands.filter((brand: any) => !brand.shared_access)
  
  const visibleBrands = ownedBrands.slice(0, maxVisibleBrands)
  const remainingCount = Math.max(0, ownedBrands.length - maxVisibleBrands)

  const renderBrandAvatar = (brand: any, size: 'xs' | 'sm' = 'xs') => {
    const sizeClasses = size === 'xs' ? 'w-4 h-4' : 'w-5 h-5'
    
    if (brand.image_url) {
      return (
        <img 
          src={brand.image_url} 
          alt={brand.name} 
          className={cn(sizeClasses, "rounded-full object-cover border border-white/30")}
        />
      )
    }
    
    return (
      <div className={cn(
        sizeClasses,
        "flex items-center justify-center rounded-full bg-gradient-to-br from-gray-600 to-gray-700 text-white font-medium text-[10px] border border-white/30"
      )}>
        {brand.name.charAt(0).toUpperCase()}
      </div>
    )
  }

  const renderAgencyLogo = () => {
    if (agencyLoading) {
      return (
        <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center">
          <div className="w-6 h-6 animate-pulse bg-[#444] rounded"></div>
        </div>
      )
    }

    if (agencySettings.agency_logo_url) {
      return (
        <div className="w-10 h-10 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center p-1 overflow-hidden">
          <img 
            src={agencySettings.agency_logo_url} 
            alt={`${agencySettings.agency_name} Logo`} 
            className="w-8 h-8 object-contain rounded" 
          />
        </div>
      )
    }

    if (agencySettings.agency_name && agencySettings.agency_name.trim() !== 'Brez Marketing Assistant') {
      return (
        <div className="w-10 h-10 bg-[#333] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">
            {agencySettings.agency_name.slice(0, 2).toUpperCase()}
          </span>
        </div>
      )
    }

    return (
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: '#3a3a3a'}}>
        <Building2 className="w-5 h-5 text-gray-400" />
      </div>
    )
  }

  if (!showExpanded) {
    // When collapsed, show just agency logo with brand count overlay if there are brands
    return (
      <div className="relative">
        {renderAgencyLogo()}
        {ownedBrands.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">
              {ownedBrands.length}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Main container with agency logo and overlaid brands */}
      <div className="relative flex items-center">
        {/* Agency logo as the base */}
        <div className="relative z-0">
          {renderAgencyLogo()}
        </div>

        {/* Overlaid brand logos */}
        {ownedBrands.length > 0 && (
          <div className="absolute left-6 top-1 flex -space-x-1 z-10">
            {visibleBrands.map((brand: any, index: number) => (
              <TooltipProvider key={brand.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="relative transition-transform hover:scale-110"
                      style={{ zIndex: 10 + index }}
                    >
                      {renderBrandAvatar(brand)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-black text-white text-xs">
                    <p>{brand.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            
            {/* Plus indicator for remaining brands */}
            {remainingCount > 0 && (
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 border border-white/30 flex items-center justify-center text-white font-bold text-[8px] hover:scale-110 transition-transform z-20"
                    style={{ zIndex: 10 + maxVisibleBrands }}
                  >
                    <Plus className="w-2 h-2" />
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  side="right" 
                  align="start" 
                  className="w-64 p-2 bg-[#1A1A1A] border border-[#333] rounded-lg shadow-xl"
                >
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-white mb-2">
                      All Brands ({ownedBrands.length})
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {ownedBrands.map((brand: any) => (
                        <div key={brand.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                          {renderBrandAvatar(brand, 'sm')}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">
                              {brand.name}
                            </p>
                            {brand.niche && (
                              <p className="text-xs text-gray-400 truncate">
                                {brand.niche}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 