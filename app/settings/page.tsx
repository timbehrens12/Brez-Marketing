"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useBrandContext } from "@/lib/context/BrandContext"
import { Trash2, Edit2, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"

export default function SettingsPage() {
  const { brands, selectedBrandId, setSelectedBrandId } = useBrandContext()
  const [isAddingBrand, setIsAddingBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandImage, setNewBrandImage] = useState<File | null>(null)

  const handleAddBrand = async () => {
    if (!newBrandName) return

    try {
      let imageUrl = null
      if (newBrandImage) {
        const { data, error } = await supabase.storage
          .from('brand-images')
          .upload(`${Date.now()}-${newBrandImage.name}`, newBrandImage)
        
        if (!error) {
          imageUrl = data.path
        }
      }

      const { data, error } = await supabase
        .from('brands')
        .insert([{ 
          name: newBrandName,
          image_url: imageUrl,
          user_id: userId // Get this from Clerk
        }])

      if (error) throw error
      
      setIsAddingBrand(false)
      setNewBrandName("")
      setNewBrandImage(null)
    } catch (error) {
      console.error('Error adding brand:', error)
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
      </div>

      <div className="grid gap-6">
        <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-medium text-white">Brand Management</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-[#2A2A2A] hover:bg-[#333]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Brand
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#2A2A2A] border-[#333] text-white">
                <DialogHeader>
                  <DialogTitle>Add New Brand</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Brand Name</Label>
                    <Input 
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      className="bg-[#333] border-[#444] text-white"
                    />
                  </div>
                  <div>
                    <Label>Brand Logo</Label>
                    <Input 
                      type="file"
                      onChange={(e) => setNewBrandImage(e.target.files?.[0] || null)}
                      className="bg-[#333] border-[#444] text-white"
                      accept="image/*"
                    />
                  </div>
                  <Button 
                    onClick={handleAddBrand}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Add Brand
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            {brands.map(brand => (
              <div 
                key={brand.id}
                className="flex items-center justify-between p-4 rounded-lg bg-[#2A2A2A]"
              >
                <div className="flex items-center gap-3">
                  {brand.image_url ? (
                    <img src={brand.image_url} alt={brand.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center">
                      {brand.name[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-white">{brand.name}</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    className="hover:bg-[#333]"
                    onClick={() => handleEditBrand(brand.id)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="hover:bg-[#333] text-red-400 hover:text-red-300"
                    onClick={() => handleDeleteBrand(brand.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Platform Connections Card */}
        <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white">Platform Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedBrandId ? (
              <>
                <div className="flex items-center justify-between p-4 rounded-lg bg-[#2A2A2A]">
                  <div className="flex items-center gap-3">
                    <img src="/shopify-icon.png" alt="Shopify" className="w-6 h-6" />
                    <span className="text-white">Shopify</span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-[#333] text-gray-400 hover:text-white"
                    onClick={() => handleConnect('shopify')}
                  >
                    Connect
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-[#2A2A2A]">
                  <div className="flex items-center gap-3">
                    <img src="/meta-icon.png" alt="Meta" className="w-6 h-6" />
                    <span className="text-white">Meta Ads</span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-[#333] text-gray-400 hover:text-white"
                    onClick={() => handleConnect('meta')}
                  >
                    Connect
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 py-4">
                Select a brand to manage platform connections
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Settings Card */}
        <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white">Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-200">Email Notifications</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Daily Reports</span>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Weekly Analytics</span>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}