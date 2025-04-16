"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface BrandDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBrandCreate: (brand: { id: string; name: string }) => void
}

export function BrandDialog({ open, onOpenChange, onBrandCreate }: BrandDialogProps) {
  const [brandName, setBrandName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onBrandCreate({
      id: crypto.randomUUID(),
      name: brandName,
    })
    setBrandName("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border-[#222222] text-white">
        <DialogHeader>
          <DialogTitle>Create New Brand</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="brandName">Brand Name</Label>
            <Input
              id="brandName"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="bg-[#222222] border-[#333333] text-white"
              placeholder="Enter brand name"
            />
          </div>

          <Button 
            type="submit"
            className="w-full bg-[#222222] hover:bg-[#333333]"
            disabled={!brandName}
          >
            Create Brand
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
