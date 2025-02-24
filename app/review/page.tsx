"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MetaConnectButton } from "@/components/dashboard/platforms/MetaConnectButton"

export default function ReviewPage() {
  const [selectedBrandId] = useState("demo-brand-123")
  
  return (
    <div className="container max-w-6xl mx-auto p-8 space-y-8">
      <div className="bg-[#111111] p-6 rounded-lg">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Meta App Review Demo</h1>
          <p className="text-sm text-gray-400">
            This is a demo page for Meta app review process
          </p>
        </div>
        
        <div className="mt-8">
          <div className="flex items-center justify-between p-4 bg-[#222222] rounded-lg">
            <div>
              <h3 className="font-medium">Meta Integration</h3>
              <p className="text-sm text-gray-400">
                Connect your Meta account to view ad performance
              </p>
            </div>
            <MetaConnectButton
              brandId={selectedBrandId}
              onConnect={async () => {}}
              isConnected={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 