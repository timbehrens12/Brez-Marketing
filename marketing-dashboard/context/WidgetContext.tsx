"use client"

import { createContext, useContext, useState, useEffect, useMemo } from "react"
import type { Widget } from "@/types/widgets"

const defaultWidgets: Widget[] = [
  // Shopify widgets
  {
    id: "shopify-total-sales",
    name: "Total Sales",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "totalSales",
  },
  {
    id: "shopify-aov",
    name: "Average Order Value",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "aov",
  },
  {
    id: "shopify-orders",
    name: "Orders Placed",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "orders",
  },
  {
    id: "shopify-units",
    name: "Units Sold",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "units",
  },
  {
    id: "shopify-conversion",
    name: "Online Store Conversion Rate",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "conversion",
  },
  {
    id: "shopify-retention",
    name: "Customer Retention Rate",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "retention",
  },
  {
    id: "shopify-top-products",
    name: "Top Selling Products",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "topProducts",
  },
  {
    id: "shopify-inventory",
    name: "Inventory Levels",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "inventory",
  },
  {
    id: "shopify-return-rate",
    name: "Return Rate",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "returnRate",
  },
  // New widgets
  {
    id: "shopify-categories",
    name: "Category Performance",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "categories",
  },
  {
    id: "shopify-shipping",
    name: "Shipping Analytics",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "shipping",
  },
  {
    id: "shopify-payment",
    name: "Payment Methods",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "payment",
  },
  {
    id: "shopify-discounts",
    name: "Discount Performance",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "discounts",
  },
  {
    id: "shopify-customer-segments",
    name: "Customer Segments",
    platform: "Shopify",
    isPinned: false,
    isEnabled: true,
    type: "customerSegments",
  },
]

interface WidgetContextType {
  widgets: Widget[]
  togglePin: (widgetId: string) => void
  toggleWidget: (widgetId: string) => void
}

const WidgetContext = createContext<WidgetContextType | undefined>(undefined)

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    // Clear existing localStorage data to force reset
    if (typeof window !== "undefined") {
      localStorage.removeItem("dashboardWidgets")
    }
    return defaultWidgets
  })

  // Save to localStorage whenever widgets change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboardWidgets", JSON.stringify(widgets))
    }
  }, [widgets])

  // Debug log to check widget initialization
  useEffect(() => {
    console.log("Current widgets:", widgets)
  }, [widgets])

  const togglePin = (widgetId: string) => {
    setWidgets((currentWidgets) => {
      const widget = currentWidgets.find((w) => w.id === widgetId)
      if (!widget) return currentWidgets

      if (widget.isPinned) {
        // If it's already pinned, just remove the pin
        return currentWidgets.map((w) => (w.id === widgetId ? { ...w, isPinned: false } : w))
      } else {
        // If it's not pinned, mark it as pinned but keep it in its original location
        return currentWidgets.map((w) => (w.id === widgetId ? { ...w, isPinned: true } : w))
      }
    })
  }

  const toggleWidget = (widgetId: string) => {
    setWidgets((currentWidgets) =>
      currentWidgets.map((widget) => (widget.id === widgetId ? { ...widget, isEnabled: !widget.isEnabled } : widget)),
    )
  }

  const contextValue = useMemo<WidgetContextType>(
    () => ({
      widgets,
      togglePin,
      toggleWidget,
    }),
    [widgets],
  )

  return <WidgetContext.Provider value={contextValue}>{children}</WidgetContext.Provider>
}

export const useWidgets = () => {
  const context = useContext(WidgetContext)
  if (context === undefined) {
    throw new Error("useWidgets must be used within a WidgetProvider")
  }
  return context
}

