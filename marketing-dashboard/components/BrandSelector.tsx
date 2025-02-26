'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useUser } from "@clerk/nextjs"

interface BrandSelectorProps {
  onSelect: (brandId: string) => void
}

export default function BrandSelector({ onSelect }: BrandSelectorProps) {
  const { brands } = useBrandContext()
  const { user } = useUser()

  // Additional safety check to filter brands by user
  const userBrands = brands.filter((brand: any) => brand.user_id === user?.id)

  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger className="w-full bg-[#222222] border-[#333333] text-white">
        <SelectValue placeholder="Select a brand" />
      </SelectTrigger>
      <SelectContent className="bg-[#111111] border-[#222222]">
        {userBrands.map((brand: any) => (
          <SelectItem 
            key={brand.id} 
            value={brand.id}
            className="text-white hover:bg-[#222222] focus:bg-[#222222]"
          >
            {brand.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
