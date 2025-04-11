"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetaConnectButton } from "@/components/dashboard/platforms/MetaConnectButton"
import { StoreConnectButton } from "@/components/dashboard/platforms/StoreConnectButton"

export function SettingsContent() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Store Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Shopify Store</label>
              <StoreConnectButton />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Meta Ads</label>
              <MetaConnectButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}