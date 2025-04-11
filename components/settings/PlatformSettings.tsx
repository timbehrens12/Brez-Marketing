"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-hot-toast"
import { supabase } from "@/lib/supabaseClient"
import { Settings, RefreshCw, Database, BarChart2 } from "lucide-react"

interface PlatformSettingsProps {
  platformType: 'shopify' | 'meta'
  connectionId: string
  brandId: string
}

export function PlatformSettings({ platformType, connectionId, brandId }: PlatformSettingsProps) {
  const [autoSync, setAutoSync] = useState(true)
  const [dataRetention, setDataRetention] = useState('90')
  const [isLoading, setIsLoading] = useState(false)

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      // Update the connection settings in the database
      const { error } = await supabase
        .from('platform_connections')
        .update({
          auto_sync: autoSync,
          data_retention_days: parseInt(dataRetention),
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)

      if (error) throw error
      
      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDataClear = async () => {
    // Implement data clearing functionality
    // Show confirmation dialog first
    const confirmClear = confirm(
      'Are you sure you want to clear all data for this platform? This action cannot be undone.'
    )

    if (!confirmClear) return

    setIsLoading(true)
    try {
      // Clear data based on platform type
      if (platformType === 'shopify') {
        await supabase
          .from('shopify_orders')
          .delete()
          .eq('brand_id', brandId)
        
        await supabase
          .from('shopify_customers')
          .delete()
          .eq('brand_id', brandId)
      } else if (platformType === 'meta') {
        await supabase
          .from('meta_ad_insights')
          .delete()
          .eq('brand_id', brandId)
      }

      toast.success('Data cleared successfully')
    } catch (error) {
      console.error('Error clearing data:', error)
      toast.error('Failed to clear data')
    } finally {
      setIsLoading(false)
    }
  }

  const renderPlatformSpecificSettings = () => {
    if (platformType === 'shopify') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Sync Product Data</h3>
              <p className="text-xs text-gray-400">Include product details in syncs</p>
            </div>
            <Switch checked={true} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Sync Customer Profiles</h3>
              <p className="text-xs text-gray-400">Include customer data in syncs</p>
            </div>
            <Switch checked={true} />
          </div>
        </div>
      )
    } else if (platformType === 'meta') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Sync Ad Creative Data</h3>
              <p className="text-xs text-gray-400">Include creative assets metadata</p>
            </div>
            <Switch checked={false} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Sync Audience Insights</h3>
              <p className="text-xs text-gray-400">Include audience metadata (no PII)</p>
            </div>
            <Switch checked={false} />
          </div>
        </div>
      )
    }
    
    return null
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#2A2A2A] mt-4">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-white flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          {platformType === 'shopify' ? 'Shopify Settings' : 'Meta Ads Settings'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general">
          <TabsList className="bg-[#222] mb-4">
            <TabsTrigger value="general" className="data-[state=active]:bg-[#333]">
              General
            </TabsTrigger>
            <TabsTrigger value="sync" className="data-[state=active]:bg-[#333]">
              Sync Options
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-[#333]">
              Advanced
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Auto Sync</h3>
                <p className="text-xs text-gray-400">Automatically sync data daily</p>
              </div>
              <Switch 
                checked={autoSync} 
                onCheckedChange={setAutoSync} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataRetention" className="text-sm">Data Retention</Label>
              <Select 
                value={dataRetention} 
                onValueChange={setDataRetention}
              >
                <SelectTrigger id="dataRetention" className="bg-[#222] border-[#333]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-[#333]">
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleSaveSettings}
              className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
              disabled={isLoading}
            >
              Save Settings
            </Button>
          </TabsContent>
          
          <TabsContent value="sync" className="space-y-4">
            {renderPlatformSpecificSettings()}
            
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full border-[#333] text-gray-300 flex items-center justify-center"
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Manual Sync
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Data Management
              </h3>
              <p className="text-xs text-gray-400 mb-2">
                Clear all data for this platform connection. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDataClear}
                disabled={isLoading}
              >
                Clear All Data
              </Button>
            </div>
            
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-medium text-white flex items-center">
                <BarChart2 className="h-4 w-4 mr-2" />
                Analytics Options
              </h3>
              <p className="text-xs text-gray-400">
                Configure how data appears in dashboards
              </p>
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-300">Include in main dashboard</span>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-300">Enable advanced metrics</span>
                <Switch defaultChecked />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 