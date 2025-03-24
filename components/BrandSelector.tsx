'use client'

import { useState, useEffect } from "react"
import { Check, ChevronDown, Building2 } from "lucide-react"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

interface BrandSelectorProps {
  onSelect: (brandId: string) => void
  selectedBrandId?: string | null
  className?: string
}

export default function BrandSelector({ onSelect, selectedBrandId, className }: BrandSelectorProps) {
  const { brands } = useBrandContext()
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<any>(null)

  // Additional safety check to filter brands by user
  const userBrands = brands.filter((brand: any) => brand.user_id === user?.id)

  // Find the selected brand when selectedBrandId changes
  useEffect(() => {
    if (selectedBrandId) {
      const brand = userBrands.find((b: any) => b.id === selectedBrandId)
      setSelectedBrand(brand || null)
    } else {
      setSelectedBrand(null)
    }
  }, [selectedBrandId, userBrands])

  const handleSelect = (brand: any) => {
    setSelectedBrand(brand)
    onSelect(brand.id)
    setIsOpen(false)
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
          "bg-[#1E1E1E] border border-[#333] text-white hover:bg-[#252525]",
          "focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500",
          isOpen && "ring-1 ring-gray-500 border-gray-500"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedBrand ? (
            <>
              <div className="flex items-center justify-center w-5 h-5 rounded-sm bg-gray-700 text-white">
                {selectedBrand.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{selectedBrand.name}</span>
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Select a brand</span>
            </>
          )}
        </div>
        <ChevronDown 
          className={cn(
            "ml-2 h-4 w-4 text-gray-400 transition-transform duration-200",
            isOpen && "transform rotate-180"
          )} 
        />
      </button>

      {isOpen && (
        <div 
          className="absolute z-10 w-full mt-1 origin-top-right rounded-md shadow-lg animate-in fade-in-50 zoom-in-95 duration-100"
        >
          <div className="py-1 bg-[#1A1A1A] border border-[#333] rounded-md shadow-xs max-h-60 overflow-auto">
            {userBrands.length > 0 ? (
              userBrands.map((brand: any) => (
                <button
                  key={brand.id}
                  className={cn(
                    "flex items-center w-full px-3 py-2 text-sm text-left transition-colors",
                    brand.id === selectedBrandId 
                      ? "bg-[#2A2A2A] text-white" 
                      : "text-gray-300 hover:bg-[#252525] hover:text-white"
                  )}
                  onClick={() => handleSelect(brand)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex items-center justify-center w-5 h-5 rounded-sm bg-gray-700 text-white">
                      {brand.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 truncate">{brand.name}</span>
                    {brand.id === selectedBrandId && (
                      <Check className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                No brands available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
