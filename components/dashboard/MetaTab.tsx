"use client"

import React from 'react'
import MetaBaselineMetrics from './MetaBaselineMetrics'

interface MetaTabProps {
  brandId: string
}

const MetaTab: React.FC<MetaTabProps> = ({ brandId }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Meta Ads Performance</h2>
      
      <div className="grid grid-cols-1 gap-4">
        <MetaBaselineMetrics brandId={brandId} />
      </div>
      
      <div className="mt-6">
        <p className="text-sm text-gray-400">
          Note: This dashboard shows baseline metrics for your Meta Ads campaigns. 
          The dashboard refresh button will perform a complete Meta API data resync to ensure metrics are accurate.
        </p>
      </div>
    </div>
  )
}

export default MetaTab 