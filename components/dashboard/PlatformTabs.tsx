"use client"

import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Music, Search, Pin, Linkedin } from "lucide-react"

export function PlatformTabs() {
  return (
    <TabsList className="grid w-full grid-cols-6 mb-8">
      <TabsTrigger value="shopify" className="flex items-center gap-2">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Di8NeCzywloJqM3PWXj5VGVChVgmxi.png"
          alt="Shopify"
          className="h-4 w-4"
        />
        <span className="hidden md:inline">Shopify</span>
      </TabsTrigger>
      <TabsTrigger value="meta" className="flex items-center gap-2">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-xNnLSFG1hEPttp3zbiVUSkeeKN3EXY.png"
          alt="Meta"
          className="h-4 w-4"
        />
        <span className="hidden md:inline">Meta Ads</span>
      </TabsTrigger>
      <TabsTrigger value="tiktok" className="flex items-center gap-2">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kQNBaAXHdkQfjbkUEzr7W0yvQmt22Z.png"
          alt="TikTok"
          className="h-4 w-4"
        />
        <span className="hidden md:inline">TikTok</span>
      </TabsTrigger>
      <TabsTrigger value="google" className="flex items-center gap-2">
        <Search className="h-4 w-4 text-[#4285F4]" />
        <span className="hidden md:inline">Google</span>
      </TabsTrigger>
      <TabsTrigger value="pinterest" className="flex items-center gap-2">
        <Pin className="h-4 w-4 text-[#E60023]" />
        <span className="hidden md:inline">Pinterest</span>
      </TabsTrigger>
      <TabsTrigger value="linkedin" className="flex items-center gap-2">
        <Linkedin className="h-4 w-4 text-[#0A66C2]" />
        <span className="hidden md:inline">LinkedIn</span>
      </TabsTrigger>
    </TabsList>
  )
}

