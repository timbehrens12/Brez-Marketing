"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useBrandContext, type Brand } from "@/lib/context/BrandContext"
import { Trash2, Edit2, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { useUser } from "@clerk/nextjs"

export default function SettingsPage() {
  const { user } = useUser()
  const { brands, selectedBrandId, setSelectedBrandId, refreshBrands } = useBrandContext()
  const [isAddingBrand, setIsAddingBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandImage, setNewBrandImage] = useState<File | null>(null)

  useEffect(() => {
    console.log('Current brands:', brands)
    console.log('Selected brand:', selectedBrandId)
  }, [brands, selectedBrandId])

  const handleAddBrand = async () => {
    if (!newBrandName || !user) return

    try {
      let imageUrl = null
      if (newBrandImage) {
        const { data, error } = await supabase.storage
          .from('brand-images')
          .upload(`${Date.now()}-${newBrandImage.name}`, newBrandImage)
        
        if (!error && data) {
          imageUrl = data.path
        }
      }

      const { error } = await supabase
        .from('brands')
        .insert([{ 
          name: newBrandName,
          image_url: imageUrl,
          user_id: user.id
        }])

      if (error) throw error
      
      // Refresh the brands list
      await refreshBrands()
      
      // Reset form
      setIsAddingBrand(false)
      setNewBrandName("")
      setNewBrandImage(null)
    } catch (error) {
      console.error('Error adding brand:', error)
    }
  }

  const handleEditBrand = async (brandId: string) => {
    // Implement edit functionality
    console.log('Edit brand:', brandId)
  }

  const handleDeleteBrand = async (brandId: string) => {
    try {
      // First delete all related records
      await Promise.all([
        // Delete metrics
        supabase
          .from('metrics')
          .delete()
          .eq('brand_id', brandId),
        
        // Delete platform connections
        supabase
          .from('platform_connections')
          .delete()
          .eq('brand_id', brandId),
        
        // Delete any other related tables...
      ])

      // Then delete the brand
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId)

      if (error) throw error

      // Refresh the brands list
      refreshBrands()
    } catch (error) {
      console.error('Error deleting brand:', error)
    }
  }

  const handleConnect = async (platform: 'shopify' | 'meta') => {
    // Implement platform connection
    console.log('Connect platform:', platform)
  }

  const handleClearAllData = async () => {
    if (!confirm('Are you sure? This will delete ALL brands and connections.')) return;
    
    try {
      console.log('Starting data clear...')
      
      // Delete metrics first
      const { error: metricsError } = await supabase
        .from('metrics')
        .delete()
        .not('id', 'is', null) // Delete all rows

      if (metricsError) throw metricsError
      console.log('Metrics deleted')

      // Delete platform connections
      const { error: connectionsError } = await supabase
        .from('platform_connections')
        .delete()
        .not('id', 'is', null)

      if (connectionsError) throw connectionsError
      console.log('Connections deleted')

      // Finally delete brands
      const { error: brandsError } = await supabase
        .from('brands')
        .delete()
        .not('id', 'is', null)

      if (brandsError) throw brandsError
      console.log('Brands deleted')

      await refreshBrands()
      alert('All data cleared successfully!')
    } catch (error) {
      console.error('Error clearing data:', error)
      alert('Error clearing data. Check console for details.')
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <Button 
          variant="destructive"
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={handleClearAllData}
        >
          Clear All Data
        </Button>
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
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  console.log('Form submitted, brand name:', newBrandName)
                  try {
                    await handleAddBrand()
                    console.log('Brand added successfully')
                  } catch (error) {
                    console.error('Error adding brand:', error)
                  }
                }}>
                  <div className="space-y-4">
                    <div>
                      <Label>Brand Name</Label>
                      <Input 
                        required
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        className="bg-[#333] border-[#444] text-white"
                      />
                    </div>
                    <div>
                      <Label>Brand Logo (optional)</Label>
                      <Input 
                        type="file"
                        onChange={(e) => setNewBrandImage(e.target.files?.[0] || null)}
                        className="bg-[#333] border-[#444] text-white"
                        accept="image/*"
                      />
                    </div>
                    <Button 
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Add Brand
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Brand Selector */}
            <div className="mb-4">
              <Label className="text-gray-200">Selected Brand</Label>
              <select
                value={selectedBrandId || ''}
                onChange={(e) => setSelectedBrandId(e.target.value || null)}
                className="w-full mt-1 bg-[#2A2A2A] border-[#333] text-white rounded-md p-2"
              >
                <option value="">Select a brand</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Brands List */}
            {brands.length > 0 ? (
              brands.map(brand => (
                <div 
                  key={brand.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-[#2A2A2A]"
                >
                  <div className="flex items-center gap-3">
                    {brand.image_url ? (
                      <img src={brand.image_url} alt={brand.name} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-white">
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
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                No brands added yet
              </div>
            )}
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