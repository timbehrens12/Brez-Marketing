"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabaseClient"
import { toast } from "react-hot-toast"
import type { Brand } from "@/lib/context/BrandContext"

interface EditBrandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brand: Brand | null
  onBrandUpdate: () => Promise<void>
}

export function EditBrandDialog({ open, onOpenChange, brand, onBrandUpdate }: EditBrandDialogProps) {
  const [brandName, setBrandName] = useState("")
  const [brandImage, setBrandImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (brand) {
      setBrandName(brand.name)
      setPreviewUrl(brand.image_url || null)
    }
  }, [brand, open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setBrandImage(file)
    
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brand) return
    
    setIsLoading(true)
    try {
      // First, update the basic brand info
      const { error } = await supabase
        .from('brands')
        .update({ name: brandName })
        .eq('id', brand.id)

      if (error) throw error

      // If a new image is uploaded, store it
      if (brandImage) {
        const fileName = `brand-${brand.id}-${Date.now()}`
        const { error: uploadError } = await supabase.storage
          .from('brand-logos')
          .upload(fileName, brandImage, {
            upsert: true,
          })

        if (uploadError) throw uploadError

        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('brand-logos')
          .getPublicUrl(fileName)

        // Update the brand with the new image URL
        if (publicUrlData) {
          await supabase
            .from('brands')
            .update({ image_url: publicUrlData.publicUrl })
            .eq('id', brand.id)
        }
      }

      await onBrandUpdate()
      toast.success('Brand updated successfully')
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating brand:', error)
      toast.error('Failed to update brand')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1A1A1A] border-[#2A2A2A] text-white">
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="bg-[#222] border-[#333] text-white"
                placeholder="Enter brand name"
              />
            </div>
            
            <div>
              <Label htmlFor="brandLogo">Brand Logo</Label>
              <div className="flex items-center space-x-4 mt-2">
                {previewUrl && (
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-[#222] flex items-center justify-center">
                    <img src={previewUrl} alt="Brand logo" className="w-full h-full object-cover" />
                  </div>
                )}
                <Input
                  id="brandLogo"
                  type="file"
                  onChange={handleFileChange}
                  className="bg-[#222] border-[#333] text-white flex-1"
                  accept="image/*"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-[#333] text-gray-300 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || !brandName.trim()}
            >
              {isLoading ? 'Updating...' : 'Update Brand'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 