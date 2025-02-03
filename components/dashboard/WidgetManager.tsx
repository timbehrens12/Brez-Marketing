"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Settings2, Plus, X, Pin } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWidgets } from "@/context/WidgetContext"

type Widget = {
  id: string
  name: string
  platform: string
  isPinned: boolean
  isEnabled: boolean
  type: string
}

const defaultWidgets: Widget[] = [
  { id: "shopify-orders", name: "Orders", platform: "Shopify", isPinned: false, isEnabled: true, type: "orders" },
  { id: "shopify-revenue", name: "Revenue", platform: "Shopify", isPinned: false, isEnabled: true, type: "revenue" },
  {
    id: "shopify-customers",
    name: "Customers",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "customers",
  },

  // Meta Ads widgets
  { id: "meta-spend", name: "Ad Spend", platform: "Meta Ads", isPinned: false, isEnabled: true, type: "spend" },
  {
    id: "meta-impressions",
    name: "Impressions",
    platform: "Meta Ads",
    isPinned: false,
    isEnabled: true,
    type: "impressions",
  },
  { id: "meta-clicks", name: "Clicks", platform: "Meta Ads", isPinned: false, isEnabled: true, type: "clicks" },
  { id: "meta-ctr", name: "Click-Through Rate", platform: "Meta Ads", isPinned: false, isEnabled: true, type: "ctr" },

  // TikTok Ads widgets
  { id: "tiktok-spend", name: "Ad Spend", platform: "TikTok Ads", isPinned: false, isEnabled: true, type: "spend" },
  {
    id: "tiktok-impressions",
    name: "Impressions",
    platform: "TikTok Ads",
    isPinned: false,
    isEnabled: true,
    type: "impressions",
  },
  { id: "tiktok-clicks", name: "Clicks", platform: "TikTok Ads", isPinned: false, isEnabled: true, type: "clicks" },
  {
    id: "tiktok-ctr",
    name: "Click-Through Rate",
    platform: "TikTok Ads",
    isPinned: false,
    isEnabled: true,
    type: "ctr",
  },

  // Google Ads widgets
  { id: "google-spend", name: "Ad Spend", platform: "Google Ads", isPinned: false, isEnabled: true, type: "spend" },
  {
    id: "google-impressions",
    name: "Impressions",
    platform: "Google Ads",
    isPinned: false,
    isEnabled: true,
    type: "impressions",
  },
  { id: "google-clicks", name: "Clicks", platform: "Google Ads", isPinned: false, isEnabled: true, type: "clicks" },
  {
    id: "google-ctr",
    name: "Click-Through Rate",
    platform: "Google Ads",
    isPinned: false,
    isEnabled: true,
    type: "ctr",
  },

  // Pinterest Ads widgets
  {
    id: "pinterest-spend",
    name: "Ad Spend",
    platform: "Pinterest Ads",
    isPinned: false,
    isEnabled: true,
    type: "spend",
  },
  {
    id: "pinterest-impressions",
    name: "Impressions",
    platform: "Pinterest Ads",
    isPinned: false,
    isEnabled: true,
    type: "impressions",
  },
  {
    id: "pinterest-clicks",
    name: "Clicks",
    platform: "Pinterest Ads",
    isPinned: false,
    isEnabled: true,
    type: "clicks",
  },
  {
    id: "pinterest-ctr",
    name: "Click-Through Rate",
    platform: "Pinterest Ads",
    isPinned: false,
    isEnabled: true,
    type: "ctr",
  },

  // LinkedIn Ads widgets
  { id: "linkedin-spend", name: "Ad Spend", platform: "LinkedIn Ads", isPinned: false, isEnabled: true, type: "spend" },
  {
    id: "linkedin-impressions",
    name: "Impressions",
    platform: "LinkedIn Ads",
    isPinned: false,
    isEnabled: true,
    type: "impressions",
  },
  { id: "linkedin-clicks", name: "Clicks", platform: "LinkedIn Ads", isPinned: false, isEnabled: true, type: "clicks" },
  {
    id: "linkedin-ctr",
    name: "Click-Through Rate",
    platform: "LinkedIn Ads",
    isPinned: false,
    isEnabled: true,
    type: "ctr",
  },
  {
    id: "shopify-cart-abandonment",
    name: "Cart Abandonment Rate",
    platform: "Shopify",
    isPinned: true,
    isEnabled: true,
    type: "cartAbandonment",
  },
]

export function WidgetManager() {
  const { widgets, togglePin, toggleWidget } = useWidgets()
  const [open, setOpen] = useState(false)

  const platforms = Array.from(new Set(widgets.map((w) => w.platform)))
  const pinnedWidgets = widgets.filter((w) => w.isPinned)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="h-4 w-4" />
          <span className="sr-only">Manage widgets</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Manage Dashboard Widgets</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="space-y-6 py-6">
            {/* Pinned Section */}
            <div>
              <h3 className="mb-4 text-sm font-medium text-muted-foreground">📌 Pinned Widgets</h3>
              {pinnedWidgets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pinned widgets</p>
              ) : (
                <div className="space-y-2">
                  {pinnedWidgets.map((widget) => (
                    <div key={widget.id} className="flex items-center justify-between rounded-md border px-4 py-2">
                      <span className="text-sm font-medium">{widget.name}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => togglePin(widget.id)}
                        >
                          <Pin className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Sections */}
            {platforms.map((platform) => (
              <div key={platform}>
                <h3 className="mb-4 text-sm font-medium text-muted-foreground">
                  {platform === "Shopify" ? (
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Di8NeCzywloJqM3PWXj5VGVChVgmxi.png"
                      alt="Shopify"
                      className="h-4 w-4 mr-2"
                    />
                  ) : platform === "Meta Ads" ? (
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-xNnLSFG1hEPttp3zbiVUSkeeKN3EXY.png"
                      alt="Meta"
                      className="h-4 w-4 mr-2"
                    />
                  ) : platform === "TikTok Ads" ? (
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-6b0DRGOsMSYXXuhMUx5EKJlWjubxxT.png"
                      alt="TikTok"
                      className="h-4 w-4 mr-2"
                    />
                  ) : platform === "Google Ads" ? (
                    "🔍"
                  ) : platform === "Pinterest Ads" ? (
                    "📌"
                  ) : platform === "LinkedIn Ads" ? (
                    "💼"
                  ) : (
                    ""
                  )}{" "}
                  {platform}
                </h3>
                <div className="space-y-2">
                  {widgets
                    .filter((w) => w.platform === platform)
                    .map((widget) => (
                      <div
                        key={widget.id}
                        className={cn(
                          "flex items-center justify-between rounded-md border px-4 py-2",
                          widget.isEnabled && "bg-muted/50",
                        )}
                      >
                        <span className="text-sm font-medium">{widget.name}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 text-muted-foreground hover:text-foreground",
                              widget.isPinned && "text-foreground",
                            )}
                            onClick={() => togglePin(widget.id)}
                          >
                            <Pin className={cn("h-4 w-4", widget.isPinned && "fill-current")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleWidget(widget.id)}
                          >
                            {widget.isEnabled ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

