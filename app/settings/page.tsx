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
import { getToken } from "@clerk/nextjs"
import { createClient } from "@supabase/supabase-js"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { JwtTemplateAlert } from '@/components/JwtTemplateAlert'

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
  const { toast } = useToast()
  const { isSupabaseAuthenticated, jwtTemplateError } = useAuth()
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

  // Display an error message if the JWT template is missing
  useEffect(() => {
    if (jwtTemplateError) {
      toast({
        title: "Authentication Error",
        description: jwtTemplateError,
        variant: "destructive",
      })
    }
  }, [jwtTemplateError, toast])

  const loadConnections = async () => {
    if (!user) {
      console.warn('No user found, cannot load connections')
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('user_id', user.id)
      
      if (error) {
        console.error('Error loading connections:', error)
        
        // Check if it's an authentication error
        if (error.code === '401' || error.message.includes('JWT')) {
          toast.error('Authentication error. Please refresh the page or sign out and sign in again.')
        } else {
          toast.error('Failed to load connections')
        }
        return
      }
      
      if (data) {
        console.log('Loaded connections:', data)
        setConnections(data)
      }
    } catch (err) {
      console.error('Exception loading connections:', err)
      toast.error('An unexpected error occurred')
    }
  }

  useEffect(() => {
    loadConnections()
  }, [user, supabase])

  const handleAddBrand = async () => {
    if (!newBrandName || !user) return

    try {
      console.log('Adding brand:', { name: newBrandName, user_id: user.id })
      
      // Get the Clerk token for Supabase
      const token = await getToken({ template: 'supabase' })
      
      if (!token) {
        console.error('Failed to get Supabase token from Clerk')
        toast({
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
      const { data: connections } = await supabase
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
      const { error } = await supabase
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
            const { error } = await supabase
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
    const userInput = prompt(`Please type "${confirmText}" to confirm:`)
    if (userInput === confirmText) {
      // First, clean up any associated Meta data
      await cleanupStaleMetaData()

      // Then delete all brands and their connections
      await supabase
        .from('brands')
        .delete()
        .eq('user_id', user.id)

      await loadConnections()
      toast.success('All data deleted successfully')
    } else {
      toast.error('Deletion cancelled. No data was deleted.')
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <JwtTemplateAlert />
      
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        {/* ... rest of the code ... */}
    </div>
  )
}