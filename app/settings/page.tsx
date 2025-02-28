"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useBrandContext, type Brand } from "@/lib/context/BrandContext"
import { Trash2, Edit2, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useUser } from "@clerk/nextjs"
import { PlatformConnection } from "@/types/platformConnection"
import { toast } from "react-hot-toast"
import { useSupabase } from '@/lib/hooks/useSupabase'
import { MetaConnectButton } from "@/components/dashboard/platforms/MetaConnectButton"
import MetaDiagnosticButton from './components/meta-diagnostic-button'
import MetaMockDataButton from './components/meta-mock-data-button'

// Constants for data retention
const META_DATA_RETENTION_DAYS = 90
const META_SCOPE = ['read_insights', 'ads_read'] // Explicitly define minimum required permissions

// Add types for Meta data handling
interface MetaDataRetention {
  lastAccessed: Date;
  dataType: 'metrics' | 'insights';
}

export default function SettingsPage() {
  const { user } = useUser()
  const { brands, selectedBrandId, setSelectedBrandId, refreshBrands } = useBrandContext()
  const [isAddingBrand, setIsAddingBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandImage, setNewBrandImage] = useState<File | null>(null)
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const supabase = useSupabase()

  useEffect(() => {
    console.log('Current brands:', brands)
    console.log('Selected brand:', selectedBrandId)
  }, [brands, selectedBrandId])

  const loadConnections = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading connections:', error)
      return
    }

    const typedData = data as PlatformConnection[] | null
    setConnections(typedData || [])
  }

  useEffect(() => {
    loadConnections()
  }, [user, supabase])

  const handleAddBrand = async () => {
    if (!newBrandName || !user) return

    try {
      console.log('Adding brand:', { name: newBrandName, user_id: user.id })
      
      const { data, error } = await supabase
        .from('brands')
        .insert({
          name: newBrandName,
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Brand added:', data)
      await refreshBrands()
      
      // Close dialog
      const closeButton = document.querySelector('[aria-label="Close"]') as HTMLButtonElement
      closeButton?.click()
      
      // Reset form
      setNewBrandName("")
      setNewBrandImage(null)
    } catch (error) {
      console.error('Error adding brand:', error)
      alert('Failed to add brand. Please try again.')
    }
  }

  const handleEditBrand = async (brandId: string) => {
    // Implement edit functionality
    console.log('Edit brand:', brandId)
  }

  const handleDeleteBrand = async (brandId: string) => {
    try {
      // First delete all related records
      await Promise.all([
        // Delete metrics
        supabase
          .from('metrics')
          .delete()
          .eq('brand_id', brandId),
        
        // Delete platform connections
        supabase
          .from('platform_connections')
          .delete()
          .eq('brand_id', brandId),
        
        // Delete any other related tables...
      ])

      // Then delete the brand
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId)

      if (error) throw error

      // Refresh the brands list
      refreshBrands()
    } catch (error) {
      console.error('Error deleting brand:', error)
    }
  }

  const handleDisconnect = async (platform: 'shopify' | 'meta', brandId: string) => {
    try {
      const { error } = await supabase
        .from('platform_connections')
        .delete()
        .eq('brand_id', brandId)
        .eq('platform_type', platform)

      if (error) throw error
      
      await loadConnections()
      toast.success(`${platform} disconnected successfully`)
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error)
      toast.error(`Failed to disconnect ${platform}`)
    }
  }

  // Track Meta data access for retention purposes
  const updateMetaDataAccess = async (brandId: string) => {
    try {
      await supabase
        .from('meta_data_tracking')
        .upsert({
          brand_id: brandId,
          last_accessed: new Date().toISOString(),
          data_type: 'metrics'
        })
    } catch (error) {
      console.error('Error updating Meta data access:', error)
    }
  }

  // Modified handleMetaConnect to include explicit data usage notice
  const handleMetaConnect = async () => {
    try {
      // Show data usage notice before connection
      const userAcknowledged = await showDataUsageNotice()
      if (!userAcknowledged) {
        toast.error('You must acknowledge the data usage terms to continue')
        return
      }
      
      // Store only necessary connection metadata
      const connectionData = {
        platform_type: 'meta',
        brand_id: selectedBrandId,
        status: 'pending',
        scopes: META_SCOPE,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      }

      await supabase
        .from('platform_connections')
        .insert(connectionData)

      return Promise.resolve()
    } catch (error) {
      console.error('Meta connection error:', error)
      toast.error('Failed to initialize Meta connection')
    }
  }

  // Add data retention cleanup
  const cleanupStaleMetaData = async () => {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - META_DATA_RETENTION_DAYS)

      // Delete stale metrics data
      await supabase
        .from('metrics')
        .delete()
        .eq('platform', 'meta')
        .lt('created_at', cutoffDate.toISOString())

      // Delete inactive connections
      await supabase
        .from('platform_connections')
        .delete()
        .eq('platform_type', 'meta')
        .eq('status', 'inactive')
        .lt('last_accessed', cutoffDate.toISOString())

    } catch (error) {
      console.error('Error cleaning up stale data:', error)
    }
  }

  // Modified handleMetaDisconnect with proper data cleanup
  const handleMetaDisconnect = async () => {
    try {
      // First, clean up any associated Meta data
      await cleanupStaleMetaData()

      // Then disconnect
      await supabase
        .from('platform_connections')
        .update({ 
          status: 'inactive',
          disconnected_at: new Date().toISOString(),
          // Store minimal required metadata for audit purposes
          disconnection_reason: 'user_initiated'
        })
        .eq('brand_id', selectedBrandId)
        .eq('platform_type', 'meta')

      await loadConnections()
      toast.success('Meta Ads disconnected successfully')
    } catch (error) {
      console.error('Error disconnecting Meta:', error)
      toast.error('Failed to disconnect Meta Ads')
    }
  }

  // Add data usage notice
  const showDataUsageNotice = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const message = `By connecting to Meta Ads, you acknowledge that:
      - We only collect and display advertising metrics
      - Data is retained for ${META_DATA_RETENTION_DAYS} days
      - No data is shared with third parties
      - You can delete your data at any time
      - We comply with Meta Platform Terms and Developer Policies`

      const confirmed = window.confirm(message)
      resolve(confirmed)
    })
  }

  // Modified handleClearAllData with proper Meta data cleanup
  const handleClearAllData = async () => {
    // First confirmation
    if (!confirm('WARNING: This will delete ALL brands and their platform connections for your account. This cannot be undone.')) {
      return;
    }
    
    // Second confirmation requiring typing
    const confirmText = 'DELETE ALL DATA';
    const userInput = prompt(`To confirm, please type "${confirmText}" in all caps:`);
    if (userInput !== confirmText) {
      toast.error('Deletion cancelled - text did not match');
      return;
    }
    
    try {
      if (!user?.id) {
        throw new Error('No user ID found')
      }

      // First, clean up Meta-specific data
      await cleanupStaleMetaData()

      // Then proceed with existing cleanup
      await supabase
        .from('platform_connections')
        .delete()
        .eq('user_id', user.id)

      await supabase
        .from('brands')
        .delete()
        .eq('user_id', user.id)

      await refreshBrands()
      
      toast.success('All data has been cleared successfully')
    } catch (error) {
      console.error('Error clearing data:', error)
      toast.error('Failed to clear data. Please try again.')
    }
  }

  // Add automatic cleanup on component mount
  useEffect(() => {
    cleanupStaleMetaData()
    // Run cleanup periodically (e.g., daily)
    const cleanup = setInterval(cleanupStaleMetaData, 24 * 60 * 60 * 1000)
    return () => clearInterval(cleanup)
  }, [])

  const handleConnect = async (platform: 'shopify' | 'meta', brandId: string) => {
    try {
      if (platform === 'shopify') {
        // First create a connection record
        const { data: connection, error } = await supabase
          .from('platform_connections')
          .insert({
            platform_type: 'shopify',
            brand_id: brandId,
            user_id: user?.id,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error creating Shopify connection:', error);
          toast.error('Failed to create Shopify connection');
          return;
        }
        
        // Now redirect with both brandId and connectionId
        const shop = prompt('Enter your Shopify store URL (e.g., your-store.myshopify.com):');
        if (!shop) {
          toast.error('Shop URL is required');
          return;
        }
        
        window.location.href = `/api/shopify/auth?brandId=${brandId}&connectionId=${connection.id}&shop=${shop}`;
      } else if (platform === 'meta') {
        // Redirect to Meta auth endpoint
        window.location.href = `/api/auth/meta?brandId=${brandId}`;
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to initiate connection');
    }
  }

  const handleSync = async (connectionId: string) => {
    if (!connectionId) return
    setIsSyncing(true)
    try {
      const response = await fetch('/api/shopify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId })
      })
      if (!response.ok) throw new Error('Sync failed')
      toast.success('Sync completed successfully')
    } catch (error) {
      toast.error('Failed to sync data')
      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(selectedBrandId === brandId ? null : brandId)
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <Button 
          variant="destructive"
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={handleClearAllData}
        >
          Clear All Data
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Account Settings Card */}
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
          </CardContent>
        </Card>

        {/* Brand Management Card */}
        <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-medium text-white">Brand Management</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-[#2A2A2A] hover:bg-[#333]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Brand
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#2A2A2A] border-[#333] text-white">
                <DialogHeader>
                  <DialogTitle>Add New Brand</DialogTitle>
                </DialogHeader>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  console.log('Form submitted, brand name:', newBrandName)
                  try {
                    await handleAddBrand()
                    console.log('Brand added successfully')
                  } catch (error) {
                    console.error('Error adding brand:', error)
                  }
                }}>
                  <div className="space-y-4">
                    <div>
                      <Label>Brand Name</Label>
                      <Input 
                        required
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        className="bg-[#333] border-[#444] text-white"
                      />
                    </div>
                    <div>
                      <Label>Brand Logo (optional)</Label>
                      <Input 
                        type="file"
                        onChange={(e) => setNewBrandImage(e.target.files?.[0] || null)}
                        className="bg-[#333] border-[#444] text-white"
                        accept="image/*"
                      />
                    </div>
                    <Button 
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Add Brand
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-4">
            {brands.length > 0 ? (
              brands.map(brand => (
                <div key={brand.id} className="space-y-2">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                      {brand.image_url ? (
                        <img src={brand.image_url} alt={brand.name} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-white">
                          {brand.name[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="text-white">{brand.name}</span>
                        <div className="flex gap-2 mt-1">
                          {connections.filter(c => c.brand_id === brand.id).map(connection => (
                            <div key={connection.id} className="flex items-center gap-1 px-2 py-1 rounded bg-[#333] text-xs text-gray-300">
                              <img src={`/${connection.platform_type}-icon.png`} alt={connection.platform_type} className="w-3 h-3" />
                              {connection.platform_type === 'shopify' ? connection.shop : connection.platform_type}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        className="hover:bg-[#333]"
                        onClick={() => handleBrandSelect(brand.id)}
                      >
                        Manage Connections
                      </Button>
                      <Button variant="ghost" className="hover:bg-[#333]" onClick={() => handleEditBrand(brand.id)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" className="hover:bg-[#333] text-red-400 hover:text-red-300" onClick={() => handleDeleteBrand(brand.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Platform connections panel */}
                  {selectedBrandId === brand.id && (
                    <div className="ml-12 p-4 rounded-lg bg-[#222] space-y-3">
                      <div className="flex items-center justify-between p-3 rounded bg-[#2A2A2A]">
                        <div className="flex items-center gap-3">
                          <img src="/shopify-icon.png" alt="Shopify" className="w-6 h-6" />
                          <span className="text-white">Shopify</span>
                        </div>
                        {connections.find(c => c.brand_id === brand.id && c.platform_type === 'shopify') ? (
                          <Button 
                            variant="outline" 
                            className="border-[#333] text-red-400 hover:text-red-300"
                            onClick={() => handleDisconnect('shopify', brand.id)}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="border-[#333] text-gray-400 hover:text-white"
                            onClick={() => handleConnect('shopify', brand.id)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-3 rounded bg-[#2A2A2A]">
                        <div className="flex items-center gap-3">
                          <img src="/meta-icon.png" alt="Meta" className="w-6 h-6" />
                          <span className="text-white">Meta Ads</span>
                        </div>
                        {connections.find(c => c.brand_id === brand.id && c.platform_type === 'meta') ? (
                          <Button 
                            variant="outline" 
                            className="border-[#333] text-red-400 hover:text-red-300"
                            onClick={() => handleDisconnect('meta', brand.id)}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="border-[#333] text-gray-400 hover:text-white"
                            onClick={() => handleConnect('meta', brand.id)}
                          >
                            Connect
                          </Button>
                        )}
                      </div>

                      {connections.find(c => c.brand_id === brand.id && c.platform_type === 'shopify') && (
                        <Button 
                          variant="outline" 
                          className="border-[#333] text-blue-400 hover:text-blue-300"
                          onClick={() => handleSync(connections.find(c => 
                            c.brand_id === brand.id && 
                            c.platform_type === 'shopify'
                          )?.id!)}
                          disabled={isSyncing}
                        >
                          {isSyncing ? 'Syncing...' : 'Sync Data'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                No brands added yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Meta Connection Testing Tools */}
      {selectedBrandId && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium">Meta Connection Testing</h3>
          <div className="flex flex-wrap gap-4">
            <MetaDiagnosticButton brandId={selectedBrandId} />
            <MetaMockDataButton brandId={selectedBrandId} />
          </div>
        </div>
      )}
    </div>
  )
}