"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
      </div>

      <div className="grid gap-6">
        <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white">Account Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-200">Email Notifications</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Daily Reports</span>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Weekly Analytics</span>
                <Switch />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-200">API Keys</Label>
              <div className="flex gap-2">
                <Input 
                  className="bg-[#2A2A2A] border-[#333] text-white" 
                  placeholder="Enter API key"
                />
                <Button 
                  className="bg-[#2A2A2A] text-white hover:bg-[#333]"
                >
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white">Platform Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <img src="/shopify-icon.png" alt="Shopify" className="w-6 h-6" />
                <span className="text-white">Shopify</span>
              </div>
              <Button variant="outline" className="border-[#333] text-gray-400 hover:text-white">
                Connect
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-[#2A2A2A]">
              <div className="flex items-center gap-3">
                <img src="/meta-icon.png" alt="Meta" className="w-6 h-6" />
                <span className="text-white">Meta Ads</span>
              </div>
              <Button variant="outline" className="border-[#333] text-gray-400 hover:text-white">
                Connect
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}