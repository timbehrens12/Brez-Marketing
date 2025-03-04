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
import { toast } from "react-hot-toast"
import { useSupabase } from '@/lib/hooks/useSupabase'
import { MetaConnectButton } from "@/components/dashboard/platforms/MetaConnectButton"
import { getToken } from "@clerk/nextjs"
import { createClient } from "@supabase/supabase-js"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { JwtTemplateAlert } from '@/components/JwtTemplateAlert'
import { supabase } from '@/lib/supabase'

// Constants for data retention
const META_DATA_RETENTION_DAYS = 90
const META_SCOPE = ['read_insights', 'ads_read'] // Explicitly define minimum required permissions

// Add types for Meta data handling
interface MetaDataRetention {
  lastAccessed: Date;
  dataType: 'metrics' | 'insights';
}

// Define the PlatformConnection type
interface PlatformConnection {
  id: string
  user_id: string
  brand_id: string
  platform_type: string
  status: string
  shop?: string | null
  access_token?: string | null
  refresh_token?: string | null
  expires_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  metadata?: any
}

export default function SettingsPage() {
  const { user } = useUser()
  const { toast: uiToast } = useToast()
  const { isSupabaseAuthenticated, jwtTemplateError } = useAuth()
  const { brands, selectedBrandId, setSelectedBrandId, refreshBrands } = useBrandContext()
  const [isAddingBrand, setIsAddingBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandImage, setNewBrandImage] = useState<File | null>(null)
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const supabaseClient = useSupabase()

  useEffect(() => {
    console.log('Current brands:', brands)
    console.log('Selected brand:', selectedBrandId)
  }, [brands, selectedBrandId])

  // Display an error message if the JWT template is missing
  useEffect(() => {
    if (jwtTemplateError) {
      uiToast({
        title: "Authentication Error",
        description: jwtTemplateError,
        variant: "destructive",
      })
    }
  }, [jwtTemplateError, uiToast])

  const loadConnections = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabaseClient
        .from('platform_connections')
        .select('*')
        .eq('user_id', user.id)
      
      if (error) throw error
      
      // Cast the data to match our PlatformConnection type
      setConnections((data || []) as PlatformConnection[])
    } catch (error) {
      console.error('Error loading connections:', error)
    }
  }

  useEffect(() => {
    loadConnections()
  }, [user])

  const handleAddBrand = async () => {
    if (!newBrandName || !user) return

    try {
      console.log('Adding brand:', { name: newBrandName, user_id: user.id })
      
      // Get the Clerk token for Supabase
      const token = await getToken({ template: 'supabase' })
      
      if (!token) {
        console.error('Failed to get Supabase token from Clerk')
        uiToast({
          title: "Authentication Error",
          description: "Failed to authenticate with the database. Please try again.",
          variant: "destructive"
        })
        return
      }
      
      // Create a Supabase client with the token
      const supabaseWithAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )
      
      const { data, error } = await supabaseWithAuth
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
      // First, disconnect all platforms for this brand
      const { data: connections } = await supabaseClient
        .from('platform_connections')
        .select('platform_type')
        .eq('brand_id', brandId);
      
      if (connections && connections.length > 0) {
        // Disconnect each platform
        for (const connection of connections) {
          await handleDisconnect(connection.platform_type as 'shopify' | 'meta', brandId);
        }
      }

      // Then delete the brand
      const { error } = await supabaseClient
        .from('brands')
        .delete()
        .eq('id', brandId);

      if (error) {
        console.error('Error deleting brand:', error);
        toast.error('Failed to delete brand');
        return;
      }

      // Refresh the brands list
      refreshBrands();
      toast.success('Brand deleted successfully');
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error('Failed to delete brand');
    }
  }

  const handleDisconnect = async (platform: 'shopify' | 'meta', brandId: string) => {
    try {
      console.log(`Disconnecting ${platform} for brand ${brandId}`)
      
      // Use the full URL to ensure it works in production
      const apiUrl = `${window.location.origin}/api/disconnect-platform`
      console.log('Using API URL:', apiUrl)
      
      // Use the existing API route
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          platformType: platform
        }),
      });
      
      console.log('Disconnect response status:', response.status)
      const responseData = await response.json();
      console.log('Disconnect response data:', responseData)
      
      if (!response.ok) {
        // Check if it's a foreign key constraint error
        if (response.status === 409) {
          // Ask the user if they want to force delete
          const forceDelete = confirm(
            `There are still related records for this ${platform} connection. ` +
            `Would you like to force delete it? This may result in orphaned data.`
          );
          
          if (forceDelete) {
            console.log('User confirmed force delete')
            // Try direct deletion from the database
            const { error } = await supabaseClient
              .from('platform_connections')
              .delete()
              .eq('brand_id', brandId)
              .eq('platform_type', platform);
              
            if (error) {
              console.error('Force delete failed:', error)
              throw new Error(`Force delete failed: ${error.message}`);
            }
            
            console.log('Force delete successful')
            await loadConnections();
            toast.success(`${platform} disconnected successfully (forced)`);
            return;
          } else {
            console.log('User cancelled force delete')
            toast.error(`Disconnect cancelled. Please delete related data first.`);
            return;
          }
        }
        
        throw new Error(responseData.error || 'Failed to disconnect platform');
      }
      
      console.log('Disconnect successful, reloading connections')
      await loadConnections();
      toast.success(`${platform} disconnected successfully`);
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error);
      toast.error(`Failed to disconnect ${platform}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Track Meta data access for retention purposes
  const updateMetaDataAccess = async (brandId: string) => {
    try {
      await supabaseClient
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
        created_at: new Date().toISOString()
      }

      await supabaseClient
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
      await supabaseClient
        .from('metrics')
        .delete()
        .eq('platform', 'meta')
        .lt('created_at', cutoffDate.toISOString())

      // Delete inactive connections
      await supabaseClient
        .from('platform_connections')
        .delete()
        .eq('platform_type', 'meta')
        .eq('status', 'inactive')
        .lt('updated_at', cutoffDate.toISOString())

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
      await supabaseClient
        .from('platform_connections')
        .update({ 
          status: 'inactive',
          disconnected_at: new Date().toISOString(),
          // Store minimal required metadata for audit purposes
          metadata: { disconnection_reason: 'user_initiated' }
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
    if (!user) return
    
    // First confirmation
    if (!confirm('Are you sure you want to delete ALL your data? This cannot be undone.')) {
      return
    }
    
    // Second confirmation requiring typing
    const confirmText = 'DELETE ALL DATA'
    const userInput = prompt(`Please type "${confirmText}" to confirm:`)
    if (userInput === confirmText) {
      try {
        // Delete all brands (which should cascade to connections)
        await supabaseClient
          .from('brands')
          .delete()
          .eq('user_id', user.id)
  
        await refreshBrands()
        
        uiToast({
          title: "Success",
          description: "All data has been deleted successfully",
        })
      } catch (error) {
        console.error('Error clearing data:', error)
        uiToast({
          title: "Error",
          description: "Failed to clear data. Please try again.",
          variant: "destructive",
        })
      }
    } else {
      uiToast({
        title: "Cancelled",
        description: "Deletion cancelled. No data was deleted.",
      })
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <JwtTemplateAlert />
      
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
        <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white">Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400">Your account settings will appear here.</p>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1A1A1A] border-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white">Brand Management</CardTitle>
          </CardHeader>
          <CardContent>
            {brands.length > 0 ? (
              <div className="space-y-4">
                {brands.map(brand => (
                  <div key={brand.id} className="p-4 rounded-lg bg-[#2A2A2A]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#333] flex items-center justify-center text-white">
                        {brand.name[0].toUpperCase()}
                      </div>
                      <span className="text-white">{brand.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No brands added yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}