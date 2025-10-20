"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Settings, Store, Save, Bell, BarChart3, Brain } from "lucide-react"

interface ShopifyAppPreferences {
  enableAnalytics: boolean
  enableAIInsights: boolean
  enableWeeklyReports: boolean
  enableNotifications: boolean
}

function ShopifyPreferencesContent() {
  const searchParams = useSearchParams()
  const shop = searchParams.get('shop')
  
  const [preferences, setPreferences] = useState<ShopifyAppPreferences>({
    enableAnalytics: true,
    enableAIInsights: true,
    enableWeeklyReports: false,
    enableNotifications: true
  })
  
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch('/api/shopify/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop,
          preferences
        }),
      })

      if (response.ok) {
        setSaveMessage('Preferences saved successfully!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage('Failed to save preferences')
      }
    } catch (error) {
      setSaveMessage('Error saving preferences')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
      
      <div className="relative z-10 p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/20 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">App Preferences</h1>
            <p className="text-gray-400">Configure Brez Marketing for your store</p>
          </div>
        </div>

        {shop && (
          <div className="mb-8 p-4 bg-[#1A1A1A] border border-[#333] rounded-lg">
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-gray-400" />
              <span className="text-gray-300">Store: <span className="font-semibold text-white">{shop}</span></span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Analytics Settings */}
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Analytics & Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analytics" className="text-base font-medium">
                    Enable Analytics Dashboard
                  </Label>
                  <p className="text-sm text-gray-400">
                    Track sales, orders, and performance metrics
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.enableAnalytics}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, enableAnalytics: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reports" className="text-base font-medium">
                    Weekly Performance Reports
                  </Label>
                  <p className="text-sm text-gray-400">
                    Automated weekly summary emails
                  </p>
                </div>
                <Switch
                  id="reports"
                  checked={preferences.enableWeeklyReports}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, enableWeeklyReports: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Settings */}
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-purple-400" />
                AI Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ai-insights" className="text-base font-medium">
                    AI Optimization Insights
                  </Label>
                  <p className="text-sm text-gray-400">
                    Get AI-powered recommendations for your store
                  </p>
                </div>
                <Switch
                  id="ai-insights"
                  checked={preferences.enableAIInsights}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, enableAIInsights: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications" className="text-base font-medium">
                    Smart Notifications
                  </Label>
                  <p className="text-sm text-gray-400">
                    Get alerts for important performance changes
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={preferences.enableNotifications}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({ ...prev, enableNotifications: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-center">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
          >
            {isSaving ? (
              <>
                <Save className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="mt-4 text-center">
            <p className={`text-sm ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
              {saveMessage}
            </p>
          </div>
        )}

        {/* Info Section */}
        <Card className="bg-[#1A1A1A] border-[#333] mt-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">About Brez Marketing</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Brez Marketing provides advanced analytics and AI-powered insights for your Shopify store. 
              Our proprietary algorithms analyze your store performance and provide actionable recommendations 
              to help you grow your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="outline" 
                className="border-[#333] text-gray-300 hover:bg-[#222]"
                onClick={() => window.open('https://www.brezmarketingdashboard.com/dashboard', '_blank')}
              >
                Open Full Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="border-[#333] text-gray-300 hover:bg-[#222]"
                onClick={() => window.open('https://www.brezmarketingdashboard.com/support', '_blank')}
              >
                Get Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ShopifyPreferencesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <ShopifyPreferencesContent />
    </Suspense>
  )
}
