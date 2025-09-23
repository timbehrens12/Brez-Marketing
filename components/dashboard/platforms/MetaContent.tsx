"use client"

import { useEffect } from "react"
import { MetaTab2 } from "./tabs/MetaTab2"
import { PlatformConnection } from "@/types/platformConnection"

interface MetaContentProps {
  brandId: string | null
  dateRange: {
    from: Date
    to: Date
  }
  connections: PlatformConnection[]
  brands: any[]
}

export function MetaContent({ brandId, dateRange, connections, brands }: MetaContentProps) {
  // 🚨 AUTO-REFRESH: Trigger fresh budget data when Meta tab loads
  useEffect(() => {
    if (brandId) {
      // Add a small delay to ensure components are mounted
      const timeoutId = setTimeout(() => {
        console.log('[MetaContent] Triggering automatic budget refresh on Meta tab load');
        // Dispatch globalRefresh event to refresh all budget widgets
        window.dispatchEvent(new CustomEvent('globalRefresh', {
          detail: { 
            source: 'meta-tab-mount',
            brandId: brandId,
            reason: 'auto-refresh-on-load'
          }
        }));
      }, 1000); // 1 second delay to ensure everything is mounted
      
      return () => clearTimeout(timeoutId);
    }
  }, [brandId]);

  if (!brandId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Please select a brand to view Meta data</p>
      </div>
    )
  }

  // Explicitly unblock Meta API calls when on the Meta tab
  if (typeof window !== 'undefined' && window._blockMetaApiCalls !== undefined) {
    window._blockMetaApiCalls = false;
  }
  
  return (
    <MetaTab2 
      brandId={brandId}
      brandName={brands?.find(b => b.id === brandId)?.name || "Your Brand"}
      dateRange={dateRange}
      connections={connections}
    />
  )
}