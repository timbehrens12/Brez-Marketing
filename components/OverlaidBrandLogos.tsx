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

  // Get all brands (both owned and managed)
  const allBrands = brands || []
  const ownedBrands = allBrands.filter((brand: any) => !brand.shared_access)
  const managedBrands = allBrands.filter((brand: any) => brand.shared_access)
  
  const visibleBrands = allBrands.slice(0, maxVisibleBrands)
  const remainingCount = Math.max(0, allBrands.length - maxVisibleBrands)

  const renderBrandAvatar = (brand: any, size: 'xs' | 'sm' = 'xs') => {
    const sizeClasses = size === 'xs' ? 'w-4 h-4' : 'w-5 h-5'
    
    if (brand.image_url) {
      return (
        <div className={cn(
          sizeClasses, 
          "rounded-full overflow-hidden border border-[#444] bg-[#2A2A2A] flex items-center justify-center flex-shrink-0"
        )}>
          <img 
            src={brand.image_url} 
            alt={brand.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )
    }
    
    return (
      <div className={cn(
        sizeClasses,
        "flex items-center justify-center rounded-full bg-[#4A5568] text-white font-bold text-[8px] border border-[#444] flex-shrink-0"
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
        <div className="w-10 h-10 bg-[#1A1A1A] border border-[#333] rounded-lg flex items-center justify-center p-2 overflow-hidden">
          <img 
            src={agencySettings.agency_logo_url} 
            alt={`${agencySettings.agency_name} Logo`} 
            className="w-6 h-6 object-contain rounded" 
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
        {allBrands.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#2A2A2A] border border-[#444] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-[10px]">
                    {allBrands.length}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1A1A1A] text-white text-xs border border-[#333]">
                <p>{ownedBrands.length} owned, {managedBrands.length} managed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  // Expanded view - show brand icons in a horizontal row
  if (allBrands.length === 0) {
    return (
      <div className="text-xs text-gray-400 flex items-center gap-1">
        <Building2 className="w-3 h-3" />
        <span>No brands</span>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Brand icons in a horizontal row */}
      <div className="flex items-center gap-1 flex-wrap">
        {visibleBrands.map((brand: any, index: number) => (
          <TooltipProvider key={brand.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative transition-transform hover:scale-110">
                  {renderBrandAvatar(brand)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-[#1A1A1A] text-white text-xs border border-[#333]">
                <p>{brand.name} - {brand.shared_access ? 'Managed' : 'Owned'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        
        {/* Plus indicator for remaining brands */}
        {remainingCount > 0 && (
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="w-4 h-4 rounded-full bg-[#4A5568] border border-[#444] flex items-center justify-center text-white font-bold text-[8px] hover:scale-110 transition-transform flex-shrink-0"
              >
                +{remainingCount}
              </button>
            </PopoverTrigger>
            <PopoverContent 
              side="right" 
              align="start" 
              className="w-64 p-2 bg-[#1A1A1A] border border-[#333] rounded-lg shadow-xl"
            >
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white mb-2">
                  All Brands ({allBrands.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {allBrands.map((brand: any) => (
                    <div key={brand.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors">
                      {renderBrandAvatar(brand, 'sm')}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white font-medium truncate">
                            {brand.name}
                          </p>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0",
                            brand.shared_access 
                              ? "bg-blue-500/20 text-blue-300" 
                              : "bg-green-500/20 text-green-300"
                          )}>
                            {brand.shared_access ? 'Managed' : 'Owned'}
                          </span>
                        </div>
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
    </div>
  )
} 