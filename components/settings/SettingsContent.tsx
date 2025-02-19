"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetaConnectButton } from "@/components/dashboard/platforms/MetaConnectButton"
import { StoreConnectButton } from "@/components/dashboard/platforms/StoreConnectButton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { BrandDialog } from "@/components/settings/BrandDialog"

interface Brand {
  id: string
  name: string
}

export function SettingsContent() {
  const [selectedBrand, setSelectedBrand] = useState<string>("")
  const [isNewBrandDialogOpen, setIsNewBrandDialogOpen] = useState(false)
  const [brands, setBrands] = useState<Brand[]>([])

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <Button 
          onClick={() => setIsNewBrandDialogOpen(true)}
          className="bg-[#111111] text-white hover:bg-[#222222]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Brand
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <Select value={selectedBrand} onValueChange={setSelectedBrand}>
          <SelectTrigger className="w-[300px] bg-[#111111] text-white border-[#222222]">
            <SelectValue placeholder="Select a brand to manage" />
          </SelectTrigger>
          <SelectContent className="bg-[#111111] border-[#222222]">
            {brands.map((brand) => (
              <SelectItem 
                key={brand.id} 
                value={brand.id}
                className="text-white hover:bg-[#222222]"
              >
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBrand && (
        <div className="grid gap-6">
          <Card className="bg-[#111111] border-[#222222]">
            <CardHeader>
              <CardTitle className="text-white">Platform Integrations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="flex items-center justify-between p-4 border border-[#222222] rounded-lg">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Di8NeCzywloJqM3PWXj5VGVChVgmxi.png"
                    alt="Shopify"
                    className="h-8 w-8"
                  />
                  <div>
                    <h3 className="text-white font-medium">Shopify</h3>
                    <p className="text-sm text-gray-400">Connect your Shopify store</p>
                  </div>
                </div>
                <StoreConnectButton />
              </div>

              <div className="flex items-center justify-between p-4 border border-[#222222] rounded-lg">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-xNnLSFG1hEPttp3zbiVUSkeeKN3EXY.png"
                    alt="Meta"
                    className="h-8 w-8"
                  />
                  <div>
                    <h3 className="text-white font-medium">Meta Ads</h3>
                    <p className="text-sm text-gray-400">Connect your Meta Ads account</p>
                  </div>
                </div>
                <MetaConnectButton />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <BrandDialog 
        open={isNewBrandDialogOpen} 
        onOpenChange={setIsNewBrandDialogOpen}
        onBrandCreate={(brand) => {
          setBrands([...brands, brand])
          setIsNewBrandDialogOpen(false)
        }}
      />
    </div>
  )
}