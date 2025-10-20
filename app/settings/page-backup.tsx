"use client"

export const runtime = 'edge'

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBrandContext, type Brand } from "@/lib/context/BrandContext"
import { Trash2, Edit2, Plus, Upload, X, Info, Settings, Building2, FileText, Shield, User, ChevronDown, AlertTriangle, Check } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useUser } from "@clerk/nextjs"
import { PlatformConnection } from "@/types/platformConnection"
import { toast } from "react-hot-toast"
import { useSupabase } from '@/lib/hooks/useSupabase'
import { MetaConnectButton } from "@/components/dashboard/platforms/MetaConnectButton"
import { useRouter, useSearchParams } from "next/navigation"
import { CustomerSyncButton } from "@/components/dashboard/CustomerSyncButton"
import { useAgency } from "@/contexts/AgencyContext"
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { usePathname } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { BRAND_NICHES, getBrandNichesByCategory, getBrandNicheLabel } from "@/lib/constants/brand-niches"
import Link from "next/link"

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
  const { agencySettings, updateAgencySettings, isLoading: agencyLoading } = useAgency()
  const pathname = usePathname()
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isAddingBrand, setIsAddingBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState("")
  const [newBrandImage, setNewBrandImage] = useState<File | null>(null)
  const [newBrandNiche, setNewBrandNiche] = useState("")
  const [newCustomNiche, setNewCustomNiche] = useState("")
  const [connections, setConnections] = useState<PlatformConnection[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const supabase = useSupabase()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [disconnectingPlatforms, setDisconnectingPlatforms] = useState<Record<string, boolean>>({});
  
  // Agency settings form state
  const [tempAgencyName, setTempAgencyName] = useState(agencySettings.agency_name)
  const [tempAgencyLogo, setTempAgencyLogo] = useState<File | null>(null)
  const [tempSignatureName, setTempSignatureName] = useState(agencySettings.signature_name || '')
  const [tempSignatureImage, setTempSignatureImage] = useState<File | null>(null)
  const [isSavingAgency, setIsSavingAgency] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)

  // Sync temp agency name with context when agency settings change
  useEffect(() => {
    setTempAgencyName(agencySettings.agency_name)
    setTempSignatureName(agencySettings.signature_name || '')
    setLogoPreview(null) // Clear preview when agency settings change
    setSignaturePreview(null) // Clear signature preview when agency settings change
  }, [agencySettings.agency_name, agencySettings.signature_name])

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Handle logo file selection
  const handleLogoChange = async (file: File | null) => {
    setTempAgencyLogo(file)
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setLogoPreview(base64)
      } catch (error) {
        console.error('Error converting file to base64:', error)
        toast.error('Failed to process image file')
      }
    } else {
      setLogoPreview(null)
    }
  }

  // Handle logo deletion
  const handleDeleteLogo = async () => {
    try {
      const success = await updateAgencySettings({
        agency_name: agencySettings.agency_name,
        agency_logo_url: null,
        signature_name: agencySettings.signature_name,
        signature_image: agencySettings.signature_image
      })

      if (success) {
        setTempAgencyLogo(null)
        setLogoPreview(null)
        toast.success('Logo removed successfully!')
      } else {
        toast.error('Failed to remove logo')
      }
    } catch (error) {
      console.error('Error removing logo:', error)
      toast.error('Failed to remove logo')
    }
  }

  // Handle signature file selection
  const handleSignatureChange = async (file: File | null) => {
    setTempSignatureImage(file)
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setSignaturePreview(base64)
      } catch (error) {
        console.error('Error converting signature file to base64:', error)
        toast.error('Failed to process signature image')
      }
    } else {
      setSignaturePreview(null)
    }
  }

  // Handle signature deletion
  const handleDeleteSignature = async () => {
    try {
      const success = await updateAgencySettings({
        agency_name: agencySettings.agency_name,
        agency_logo_url: agencySettings.agency_logo_url,
        signature_name: undefined,
        signature_image: null
      })

      if (success) {
        setTempSignatureImage(null)
        setTempSignatureName('')
        setSignaturePreview(null)
        toast.success('Signature removed successfully!')
      } else {
        toast.error('Failed to remove signature')
      }
    } catch (error) {
      console.error('Error removing signature:', error)
      toast.error('Failed to remove signature')
    }
  }

  // Handle agency settings save
  const handleSaveAgencySettings = async () => {
    if (!tempAgencyName.trim()) {
      toast.error('Agency name is required')
      return
    }

    setIsSavingAgency(true)
    
    try {
      let logoUrl = agencySettings.agency_logo_url
      let signatureUrl = agencySettings.signature_image

      // Handle logo upload if a new file was selected
      if (tempAgencyLogo) {
        logoUrl = await fileToBase64(tempAgencyLogo)
      }

      // Handle signature upload if a new file was selected
      if (tempSignatureImage) {
        signatureUrl = await fileToBase64(tempSignatureImage)
      }

      const success = await updateAgencySettings({
        agency_name: tempAgencyName.trim(),
        agency_logo_url: logoUrl,
        signature_name: tempSignatureName.trim() || undefined,
        signature_image: signatureUrl
      })

      if (success) {
        toast.success('Agency settings updated successfully!')
        setTempAgencyLogo(null)
        setTempSignatureImage(null)
        setLogoPreview(null)
        setSignaturePreview(null)
      } else {
        toast.error('Failed to update agency settings')
      }
    } catch (error) {
      console.error('Error saving agency settings:', error)
      toast.error('Failed to update agency settings')
    } finally {
      setIsSavingAgency(false)
    }
  }

  // Page loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Define loadConnections with useCallback to prevent unnecessary re-renders
  const loadConnections = useCallback(async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading connections:', error)
      return
    }

    console.log('Loaded connections:', data)
    const typedData = data as PlatformConnection[] | null
    setConnections(typedData || [])
  }, [user, supabase, setConnections])

  // Add back the useEffect to load connections on mount
  useEffect(() => {
    loadConnections()
  }, [user, supabase])

  // Handle loading state from Shopify callback
  useEffect(() => {
    const loading = searchParams.get('loading')
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (loading === 'true' && success === 'true') {
      // Wait a moment then refresh the page without the loading parameter
      const timer = setTimeout(() => {
        router.replace('/settings?success=true')
      }, 500)
      
      return () => clearTimeout(timer)
    } else if (success === 'true') {
      // Show success notification
      toast.success('Shopify store connected successfully! Your store data is now being synced.', {
        duration: 5000,
      })
      
      // Force inventory refresh
      const connectionId = searchParams.get('connectionId')
      if (connectionId) {
        console.log('Connection successful, triggering inventory refresh')
        
        // Dispatch event for local component updates
        window.dispatchEvent(new CustomEvent('refreshInventory', { 
          detail: { brandId: searchParams.get('brandId') || selectedBrandId } 
        }))
        
        // Also explicitly call the inventory refresh API
        fetch('/api/shopify/inventory/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            connectionId,
            forceRefresh: true
          })
        }).catch(err => console.error('Error triggering inventory sync:', err))
      }
      
      // Clear the success parameter after showing the notification
      const timer = setTimeout(() => {
        router.replace('/settings')
      }, 500)
      
      return () => clearTimeout(timer)
    } else if (error) {
      // Show error notification
      let errorMessage = 'Failed to connect Shopify store.';
      
      // Map error codes to user-friendly messages
      if (error === 'brand_not_found') {
        errorMessage = 'Brand not found. Please try again with a valid brand.';
      } else if (error === 'connection_create_failed') {
        errorMessage = 'Failed to create connection. Please try again.';
      } else if (error === 'connection_create_error') {
        errorMessage = 'Error creating connection. Please try again.';
      } else if (error === 'auth_required') {
        errorMessage = 'Authentication required. Please log in first.';
      } else if (error === 'shopify_error') {
        errorMessage = `Error from Shopify: ${searchParams.get('description') || 'Unknown error'}`;
      } else if (error === 'token_exchange_failed') {
        errorMessage = 'Failed to exchange token with Shopify. Please try again.';
      }
      
      toast.error(errorMessage, {
        duration: 5000,
      })
      
      // Clear the error parameter after showing the notification
      const timer = setTimeout(() => {
        router.replace('/settings')
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [searchParams, router])

  // Check for Shopify connection completion in localStorage
  useEffect(() => {
    // Only run after loadConnections is defined and in browser environment
    if (typeof window !== 'undefined') {
      const connectionComplete = localStorage.getItem('shopifyConnectionComplete')
      const connectionTimestamp = localStorage.getItem('shopifyConnectionTimestamp')
      
      if (connectionComplete === 'true') {
        // Clear the flag
        localStorage.removeItem('shopifyConnectionComplete')
        localStorage.removeItem('shopifyConnectionTimestamp')
        
        // Refresh connections
        loadConnections()
        
        // Show success notification
        toast.success('Shopify store connected successfully! Your store data is now being synced.', {
          duration: 5000,
        })
      }
    }
  }, [loadConnections])

  // Define a function to check a specific connection
  const checkConnection = useCallback(async (connectionId: string) => {
    if (!user) return false;
    
    try {
      console.log(`Checking connection status for ID: ${connectionId}`);
      
      const { data, error } = await supabase
        .from('platform_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        console.error('Error checking connection:', error);
        return false;
      }
      
      if (!data) {
        console.log('Connection not found');
        return false;
      }
      
      console.log('Connection found:', data);
      
      // Refresh all connections to update the UI
      loadConnections();
      
      return true;
    } catch (err) {
      console.error('Error in checkConnection:', err);
      return false;
    }
  }, [user, supabase, loadConnections]);

  // Check for connectionId in URL - this is a fallback for when localStorage doesn't work
  useEffect(() => {
    const connectionId = searchParams.get('connectionId')
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('description')
    let cleanupTimer: NodeJS.Timeout | null = null;
    
    if (connectionId && success === 'true') {
      console.log('Found connectionId in URL, checking connection:', connectionId)
      
      // Check the specific connection
      checkConnection(connectionId).then(found => {
        if (found) {
          // Show success notification
          toast.success('Shopify store connected successfully! Your store data is now being synced.', {
            duration: 5000,
          });
        } else {
          // If connection check failed, try refreshing all connections anyway
          loadConnections();
          
          // Use success toast instead of info
          toast.success('Connection process completed. Refreshing data...', {
            duration: 5000,
          });
        }
        
        // Clear the parameters after showing the notification
        cleanupTimer = setTimeout(() => {
          router.replace('/settings')
        }, 500);
      });
    } else if (error) {
      let errorMessage = 'Failed to connect Shopify store.';
      
      // Map error codes to user-friendly messages
      if (error === 'brand_not_found') {
        errorMessage = 'Brand not found. Please try again with a valid brand.';
      } else if (error === 'connection_create_failed') {
        errorMessage = 'Failed to create connection. Please try again.';
      } else if (error === 'connection_create_error') {
        errorMessage = 'Error creating connection. Please try again.';
      } else if (error === 'auth_required') {
        errorMessage = 'Authentication required. Please log in first.';
      } else if (error === 'shopify_error') {
        errorMessage = `Error from Shopify: ${errorDescription || 'Unknown error'}`;
      } else if (error === 'token_exchange_failed') {
        errorMessage = 'Failed to exchange token with Shopify. Please try again.';
      }
      
      toast.error(errorMessage, {
        duration: 5000,
      });
      
      // Clear the error parameter after showing the notification
      cleanupTimer = setTimeout(() => {
        router.replace('/settings')
      }, 500);
    }
    
    // Cleanup function
    return () => {
      if (cleanupTimer) clearTimeout(cleanupTimer);
    };
  }, [searchParams, router, loadConnections, checkConnection]);

  useEffect(() => {
    console.log('Current brands:', brands)
    console.log('Selected brand:', selectedBrandId)
  }, [brands, selectedBrandId])

  const handleAddBrand = async () => {
    if (!newBrandName || !user) return

    try {
      console.log('Adding brand:', { name: newBrandName, user_id: user.id })
      
      let imageUrl = undefined
      if (newBrandImage) {
        imageUrl = await fileToBase64(newBrandImage)
      }
      
      const { data, error } = await supabase
        .from('brands')
        .insert({
          name: newBrandName,
          user_id: user.id,
          image_url: imageUrl,
          niche: newBrandNiche === 'other' ? null : newBrandNiche,
          custom_niche: newBrandNiche === 'other' ? newCustomNiche.trim() : null
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
      setNewBrandNiche("")
      setNewCustomNiche("")
      toast.success('Brand added successfully')
    } catch (error) {
      console.error('Error adding brand:', error)
      toast.error('Failed to add brand. Please try again.')
    }
  }

  // Edit brand state
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null)
  const [editBrandName, setEditBrandName] = useState("")
  const [editBrandImage, setEditBrandImage] = useState<File | null>(null)
  const [editBrandNiche, setEditBrandNiche] = useState("")
  const [editCustomNiche, setEditCustomNiche] = useState("")
  const [isEditingBrand, setIsEditingBrand] = useState(false)

  const handleEditBrand = async (brandId: string) => {
    const brand = brands.find(b => b.id === brandId)
    if (brand) {
      setEditingBrand(brand)
      setEditBrandName(brand.name)
      setEditBrandNiche(brand.niche || "")
      setEditCustomNiche(brand.custom_niche || "")
      setEditBrandImage(null)
    }
  }

  const handleSaveEditBrand = async () => {
    if (!editingBrand) return
    
    setIsEditingBrand(true)
    try {
      let imageUrl = editingBrand.image_url
      
      if (editBrandImage) {
        imageUrl = await fileToBase64(editBrandImage)
      }
      
      const { error } = await supabase
        .from('brands')
        .update({
          name: editBrandName.trim(),
          image_url: imageUrl,
          niche: editBrandNiche === 'other' ? null : editBrandNiche,
          custom_niche: editBrandNiche === 'other' ? editCustomNiche.trim() : null
        })
        .eq('id', editingBrand.id)
      
      if (error) throw error
      
      await refreshBrands()
      toast.success('Brand updated successfully')
      setEditingBrand(null)
      setEditBrandImage(null)
    } catch (error) {
      console.error('Error updating brand:', error)
      toast.error('Failed to update brand')
    } finally {
      setIsEditingBrand(false)
    }
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
      // Set loading state for this specific platform/brand combination
      const key = `${platform}-${brandId}`;
      setDisconnectingPlatforms(prev => ({ ...prev, [key]: true }));
      
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
            // Use the force delete API endpoint instead of direct database access
            const forceResponse = await fetch('/api/disconnect-platform/force', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ brandId, platformType: platform }),
            })
            
            if (!forceResponse.ok) {
              const forceData = await forceResponse.json()
              throw new Error(`Force delete failed: ${forceData.error}`)
            }
            
            console.log('Force delete successful')
            await loadConnections();
            toast.success(`${platform} disconnected successfully (forced)`);
          } else {
            console.log('User cancelled force delete')
            toast.error(`Disconnect cancelled. Please delete related data first.`);
          }
        } else {
          throw new Error(responseData.error || 'Failed to disconnect platform');
        }
      } else {
        console.log('Disconnect successful, reloading connections')
        await loadConnections();
        toast.success(`${platform} disconnected successfully`);
      }
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error);
      toast.error(`Failed to disconnect ${platform}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clear loading state
      const key = `${platform}-${brandId}`;
      setDisconnectingPlatforms(prev => ({ ...prev, [key]: false }));
    }
  }

  // Track Meta data access for retention purposes
  const updateMetaDataAccess = async (brandId: string) => {
    try {
      // This functionality is now handled through the meta_ad_insights table
      // No need to track it separately in the deprecated meta_data_tracking table
      console.log('Meta data access tracking is now handled through meta_ad_insights')
      
      // If needed, we could add a flag or entry in the new table
      // await supabase
      //   .from('meta_ad_insights')
      //   .upsert({
      //     brand_id: brandId,
      //     last_accessed: new Date().toISOString(),
      //     timestamp: new Date().toISOString(),
      //     is_access_tracking: true
      //   })
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
      
      // Delete stale Meta insights data
      await supabase
        .from('meta_ad_insights')
        .delete()
        .lt('date', cutoffDate.toISOString())
      
      console.log(`Cleaned up Meta data older than ${META_DATA_RETENTION_DAYS} days`)

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

  // Helper function to calculate Meta token expiration
  const getMetaConnectionInfo = (connection: PlatformConnection) => {
    if (!connection) return null
    
    const connectedDate = new Date(connection.created_at)
    const expirationDate = new Date(connectedDate)
    expirationDate.setDate(expirationDate.getDate() + 60) // Meta tokens expire in 60 days
    
    const now = new Date()
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      connectedDate: connectedDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      expirationDate: expirationDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      daysUntilExpiration,
      isExpiringSoon: daysUntilExpiration <= 7,
      isExpired: daysUntilExpiration <= 0
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

  // Show loading state
  if (isLoadingPage) {
    const loadingConfig = getPageLoadingConfig(pathname)
    
    return (
      <UnifiedLoading
        variant="page"
        size="lg"
        message={loadingConfig.message}
        subMessage={loadingConfig.subMessage}
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                            flex items-center justify-center border border-white/10">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 text-sm">Manage your account, brands, and preferences</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-[#0f0f0f] border border-[#333] rounded-lg p-4 sticky top-8">
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#1a1a1a] text-white hover:bg-[#2a2a2a] transition-colors">
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium">Agency Branding</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors">
                  <User className="w-5 h-5" />
                  <span className="font-medium">Brand Management</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors">
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Account & Security</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Legal</span>
                </button>
              </nav>
              
              <div className="mt-6 pt-6 border-t border-[#333]">
                <Button 
                  variant="destructive"
                  className="w-full bg-red-600/10 border border-red-600/20 text-red-400 hover:bg-red-600/20 hover:text-red-300"
                  onClick={handleClearAllData}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Clear All Data
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Agency Branding Section */}
            <div className="bg-[#0f0f0f] border border-[#333] rounded-lg">
              <div className="p-6 border-b border-[#333]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-white/5 to-white/10 rounded-lg 
                                flex items-center justify-center border border-white/10">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Agency Branding</h2>
                    <p className="text-sm text-gray-400">Customize your agency name and logo throughout the platform</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
              <div>
                <Label className="text-gray-200">Agency Name</Label>
                <Input 
                  value={tempAgencyName}
                  onChange={(e) => setTempAgencyName(e.target.value)}
                  placeholder="Your Agency Name"
                  className="bg-[#2A2A2A] border-[#333] text-white mt-2"
                  disabled={agencyLoading || isSavingAgency}
                />
                <p className="text-xs text-gray-400 mt-1">
                  This will appear in reports, PDFs, and throughout the platform
                </p>
              </div>

              <div>
                <Label className="text-gray-200">Agency Logo</Label>
                <div className="mt-2">
                  {agencySettings.agency_logo_url || logoPreview ? (
                    <div className="flex items-center space-x-4">
                      <div className="relative group">
                        <div className="w-16 h-16 rounded-lg bg-[#1A1A1A] border border-[#333] flex items-center justify-center p-2 overflow-hidden">
                          <img 
                            src={logoPreview || agencySettings.agency_logo_url!} 
                            alt="Agency Logo" 
                            className="max-w-full max-h-full object-contain rounded"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => logoPreview ? setLogoPreview(null) : handleDeleteLogo()}
                          disabled={agencyLoading || isSavingAgency}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                          className="bg-[#2A2A2A] border-[#333] text-white file:bg-[#333] file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
                          disabled={agencyLoading || isSavingAgency}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Upload a new logo to replace the current one
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-lg bg-[#2A2A2A] border-2 border-dashed border-[#444] flex items-center justify-center">
                        <div className="text-center">
                          <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                          <span className="text-xs text-gray-400 font-medium">
                            {tempAgencyName.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                          className="bg-[#2A2A2A] border-[#333] text-white file:bg-[#333] file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
                          disabled={agencyLoading || isSavingAgency}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Upload your agency logo (PNG, JPG, or SVG). Without a logo, we'll show your agency initials.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Digital Signature Section */}
              <div>
                <Label className="text-gray-200">Digital Signature</Label>
                <div className="mt-2 space-y-3">
                  <div>
                    <Label className="text-sm text-gray-400">Signature Name</Label>
                    <Input 
                      value={tempSignatureName}
                      onChange={(e) => setTempSignatureName(e.target.value)}
                      placeholder="Your Full Name"
                      className="bg-[#2A2A2A] border-[#333] text-white mt-1"
                      disabled={agencyLoading || isSavingAgency}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      This name will appear on generated contracts
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-400">Signature Image</Label>
                    <div className="mt-1">
                      {agencySettings.signature_image || signaturePreview ? (
                        <div className="flex items-center space-x-4">
                          <div className="relative group">
                            <div className="w-32 h-16 rounded-lg bg-[#1A1A1A] border border-[#333] flex items-center justify-center p-2 overflow-hidden">
                              <img 
                                src={signaturePreview || agencySettings.signature_image!} 
                                alt="Digital Signature" 
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => signaturePreview ? setSignaturePreview(null) : handleDeleteSignature()}
                              disabled={agencyLoading || isSavingAgency}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSignatureChange(e.target.files?.[0] || null)}
                              className="bg-[#2A2A2A] border-[#333] text-white file:bg-[#333] file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
                              disabled={agencyLoading || isSavingAgency}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Upload a new signature to replace the current one
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-4">
                          <div className="w-32 h-16 rounded-lg bg-[#2A2A2A] border-2 border-dashed border-[#444] flex items-center justify-center">
                            <div className="text-center">
                              <Upload className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                              <span className="text-xs text-gray-400 font-medium">
                                Signature
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleSignatureChange(e.target.files?.[0] || null)}
                              className="bg-[#2A2A2A] border-[#333] text-white file:bg-[#333] file:text-white file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
                              disabled={agencyLoading || isSavingAgency}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                              Upload your signature image (PNG, JPG, or SVG) for contracts
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#333]">
                <div className="flex space-x-3">
                  <Button
                    onClick={handleSaveAgencySettings}
                    disabled={agencyLoading || isSavingAgency || (tempAgencyName === agencySettings.agency_name && !tempAgencyLogo && !tempSignatureImage && tempSignatureName === (agencySettings.signature_name || ''))}
                    className="bg-[#333] hover:bg-[#444] text-white"
                  >
                    {isSavingAgency ? (
                      <>
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Agency Settings'
                    )}
                  </Button>
                  {(agencySettings.agency_logo_url || logoPreview) && (
                    <Button
                      variant="outline"
                      onClick={handleDeleteLogo}
                      disabled={agencyLoading || isSavingAgency}
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      Remove Logo
                    </Button>
                  )}
                  {(agencySettings.signature_image || signaturePreview) && (
                    <Button
                      variant="outline"
                      onClick={handleDeleteSignature}
                      disabled={agencyLoading || isSavingAgency}
                      className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                    >
                      Remove Signature
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Changes will be applied across all reports, PDFs, contracts, and platform branding
                </p>
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
                      className="w-full bg-[#333] hover:bg-[#444]"
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
                            disabled={disconnectingPlatforms[`shopify-${brand.id}`]}
                          >
                            {disconnectingPlatforms[`shopify-${brand.id}`] ? (
                              <>
                                <span className="mr-2">Disconnecting</span>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              </>
                            ) : (
                              'Disconnect'
                            )}
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

                      <div className="p-3 rounded bg-[#2A2A2A] space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src="/meta-icon.png" alt="Meta" className="w-6 h-6" />
                            <span className="text-white">Meta Ads</span>
                          </div>
                          {connections.find(c => c.brand_id === brand.id && c.platform_type === 'meta') ? (
                            <Button 
                              variant="outline" 
                              className="border-[#333] text-red-400 hover:text-red-300"
                              onClick={() => handleDisconnect('meta', brand.id)}
                              disabled={disconnectingPlatforms[`meta-${brand.id}`]}
                            >
                              {disconnectingPlatforms[`meta-${brand.id}`] ? (
                                <>
                                  <span className="mr-2">Disconnecting</span>
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                </>
                              ) : (
                                'Disconnect'
                              )}
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

                        {(() => {
                          const metaConnection = connections.find(c => c.brand_id === brand.id && c.platform_type === 'meta')
                          const connectionInfo = metaConnection ? getMetaConnectionInfo(metaConnection) : null
                          
                          if (connectionInfo) {
                            return (
                              <TooltipProvider>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-green-400">Connected on:</span>
                                  <span className="text-gray-300">{connectionInfo.connectedDate}</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 cursor-help">
                                        <Info className="h-3 w-3 text-gray-400" />
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          connectionInfo.isExpired 
                                            ? 'bg-red-500/20 text-red-400' 
                                            : connectionInfo.isExpiringSoon 
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-green-500/20 text-green-400'
                                        }`}>
                                          {connectionInfo.isExpired 
                                            ? 'Expired' 
                                            : connectionInfo.isExpiringSoon 
                                            ? `${connectionInfo.daysUntilExpiration} days left`
                                            : `${connectionInfo.daysUntilExpiration} days left`
                                          }
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#1a1a1a] border-[#333] text-white max-w-xs">
                                      <div className="space-y-1 text-xs">
                                        <p className="font-medium">Meta Token Information:</p>
                                        <p>• Meta tokens expire every 60 days for security</p>
                                        <p>• Current token expires on: <span className="font-medium">{connectionInfo.expirationDate}</span></p>
                                        <p>• {connectionInfo.isExpired ? 'Reconnection required immediately' : `Reconnection required in ${connectionInfo.daysUntilExpiration} days`}</p>
                                        {connectionInfo.isExpiringSoon && (
                                          <p className="text-yellow-400 font-medium">⚠️ Expiring soon - consider reconnecting</p>
                                        )}
                                        {connectionInfo.isExpired && (
                                          <p className="text-red-400 font-medium">🚨 Token expired - reconnect to restore data access</p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            )
                          }
                          return null
                        })()}
                      </div>

                      {connections.find(c => c.brand_id === brand.id && c.platform_type === 'shopify') && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-[#333] text-green-400 hover:text-green-300"
                            onClick={() => handleSync(connections.find(c => 
                              c.brand_id === brand.id && 
                              c.platform_type === 'shopify'
                            )?.id!)}
                            disabled={isSyncing}
                          >
                            {isSyncing ? 'Syncing Orders...' : 'Sync Orders'}
                          </Button>
                          
                          <CustomerSyncButton 
                            connectionId={connections.find(c => 
                              c.brand_id === brand.id && 
                              c.platform_type === 'shopify'
                            )?.id!}
                            className="border-[#333] text-blue-400 hover:text-blue-300"
                          />
                        </div>
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
    </div>
  )
}
