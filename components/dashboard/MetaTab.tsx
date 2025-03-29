"use client"

import React, { useState } from 'react'
import MetaBaselineMetrics from './MetaBaselineMetrics'
import MetaResyncButton from '@/components/meta-resync-button'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface MetaTabProps {
  brandId: string
}

const MetaTab: React.FC<MetaTabProps> = ({ brandId }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    toast.info("Refreshing Meta metrics...");
    
    try {
      const response = await fetch(`/api/metrics/meta?brandId=${brandId}&force_refresh=true&t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to refresh: ${response.status}`);
      }
      
      toast.success("Meta metrics refreshed successfully!");
      
    } catch (error) {
      console.error("Error refreshing Meta metrics:", error);
      toast.error("Failed to refresh Meta metrics. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Meta Ads Performance</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <MetaResyncButton 
            brandId={brandId} 
            days={90} 
            onSuccess={() => {
              // Trigger a refresh of the metrics after resync
              handleRefresh();
            }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <MetaBaselineMetrics brandId={brandId} />
      </div>
      
      <div className="mt-6">
        <p className="text-sm text-gray-400">
          Note: This dashboard shows baseline metrics for your Meta Ads campaigns. 
          The "Refresh" button updates metrics using cached data, while "Resync Meta Data" 
          pulls fresh data directly from the Meta API into your database.
        </p>
      </div>
    </div>
  )
}

export default MetaTab 