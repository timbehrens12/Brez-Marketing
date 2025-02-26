'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useUser } from "@clerk/nextjs"
import { Building2 } from "lucide-react"

export default function BrandSelector({ onSelect }: { onSelect: (brandId: string) => void }) {
  const { brands } = useBrandContext()
  const { user } = useUser()

  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger 
        className="w-[240px] bg-[#1A1A1A] border-[#333333] text-white hover:bg-[#222222] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <SelectValue placeholder="Select brand" />
        </div>
      </SelectTrigger>
      <SelectContent 
        className="bg-[#1A1A1A] border-[#333333] min-w-[240px] shadow-lg"
      >
        {brands.map((brand: any) => (
          <SelectItem 
            key={brand.id} 
            value={brand.id}
            className="text-white hover:bg-[#2A2A2A] focus:bg-[#2A2A2A] cursor-pointer"
          >
            <div className="flex items-center gap-3 py-2">
              {brand.image_url ? (
                <img 
                  src={brand.image_url} 
                  alt={brand.name}
                  className="w-8 h-8 rounded-md object-cover bg-[#222222]"
                />
              ) : (
                <div className="w-8 h-8 rounded-md bg-[#2563eb] flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {brand.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-medium text-sm">{brand.name}</span>
                {brand.description && (
                  <span className="text-xs text-gray-400">{brand.description}</span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
