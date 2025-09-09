'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { 
  Share2, 
  Copy, 
  Trash2, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Plus,
  Settings,
  FileText
} from 'lucide-react'
import { toast } from 'sonner'
import { Brand } from '@/lib/context/BrandContext'

interface ShareLink {
  id: string
  token: string
  role: 'admin' | 'media_buyer' | 'viewer'
  expires_at: string
  max_uses: number
  current_uses: number
  created_at: string
  is_active: boolean
}

interface BrandSharingDialogProps {
  brand: Brand
  trigger?: React.ReactNode
}

export default function BrandSharingDialog({ brand, trigger }: BrandSharingDialogProps) {
  const [open, setOpen] = useState(false)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  
  // Form state
  const [role, setRole] = useState<'admin' | 'media_buyer' | 'viewer'>('media_buyer')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [maxUses, setMaxUses] = useState(1)
  const [canManagePlatforms, setCanManagePlatforms] = useState(false)
  const [canGenerateReports, setCanGenerateReports] = useState(true)

  useEffect(() => {
    if (open) {
      loadShareLinks()
    }
  }, [open])

  const loadShareLinks = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/brands/${brand.id}/share-link`)
      if (response.ok) {
        const data = await response.json()
        setShareLinks(data.shareLinks || [])
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const createShareLink = async () => {
    setCreating(true)
    try {
      const response = await fetch(`/api/brands/${brand.id}/share-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          expiresInDays,
          maxUses,
          canManagePlatforms,
          canGenerateReports
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Share link created successfully!')
        // Copy to clipboard
        await navigator.clipboard.writeText(data.shareUrl)
        toast.success('Link copied to clipboard!')
        
        // Refresh the list
        loadShareLinks()
      } else {
        toast.error(data.error || 'Failed to create share link')
      }
    } catch (error) {
      toast.error('Failed to create share link')
    } finally {
      setCreating(false)
    }
  }

  const copyShareLink = async (token: string) => {
    const shareUrl = `${window.location.origin}/join/${token}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const revokeShareLink = async (token: string) => {
    try {
      const response = await fetch(`/api/brands/${brand.id}/share-link`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      })

      if (response.ok) {
        toast.success('Share link revoked successfully!')
        loadShareLinks()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to revoke share link')
      }
    } catch (error) {
      toast.error('Failed to revoke share link')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-300 border-red-500/40'
      case 'media_buyer':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      case 'viewer':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  const isMaxUsesReached = (link: ShareLink) => {
    return link.current_uses >= link.max_uses
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="border-[#333] bg-[#2A2A2A] text-gray-300 hover:bg-[#333] hover:text-white">
            <Share2 className="w-4 h-4 mr-2" />
            Share Access
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#1A1A1A] border-[#333]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <Share2 className="w-5 h-5 mr-2" />
            Share Brand Access - {brand.name}
          </DialogTitle>
        </DialogHeader>

        {/* Access Disclosure */}
        <div className="p-4 bg-[#0f0f0f] rounded-lg border border-[#333]">
          <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            What access are you sharing?
          </h4>
          <div className="text-sm text-gray-300 space-y-3">
            <p>When you share access to <span className="text-white font-medium">{brand.name}</span>, the user will be able to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-gray-400">
              <li>View all dashboard metrics and analytics</li>
              <li>Access marketing assistant page with AI insights</li>
              <li>See all connected platform data (Shopify, Meta Ads, etc.)</li>
              <li>View and generate brand performance reports</li>
              <li>Access historical data and trends</li>
              <li>Use AI-powered marketing recommendations</li>
            </ul>
            <div className="mt-3 p-3 bg-[#1a1a1a] rounded-md border border-[#444]">
              <p className="text-xs text-gray-400">
                <strong className="text-yellow-400">Important:</strong> Shared users cannot modify brand settings, disconnect platforms, or manage other users' access. They can only view and analyze data.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Create New Share Link */}
          <Card className="bg-[#2A2A2A] border-[#333]">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Create New Share Link
              </CardTitle>
              <CardDescription className="text-gray-400">
                Generate a link to invite collaborators to this brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="role" className="text-gray-300">Role</Label>
                  <Select value={role} onValueChange={(value: any) => setRole(value)}>
                    <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-[#333]">
                      <SelectItem value="admin" className="text-white hover:bg-[#2A2A2A]">Admin</SelectItem>
                      <SelectItem value="media_buyer" className="text-white hover:bg-[#2A2A2A]">Media Buyer</SelectItem>
                      <SelectItem value="viewer" className="text-white hover:bg-[#2A2A2A]">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="expires" className="text-gray-300">Expires In (Days)</Label>
                  <Input
                    id="expires"
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    min="1"
                    max="365"
                    className="bg-[#1A1A1A] border-[#333] text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="maxUses" className="text-gray-300">Max Uses</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="bg-[#1A1A1A] border-[#333] text-white"
                  />
                </div>
              </div>

              {/* Platform Management Permission */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-gray-400" />
                    <Label htmlFor="platform-management" className="text-gray-300 font-medium">
                      Platform Management
                    </Label>
                  </div>
                  <Switch
                    id="platform-management"
                    checked={canManagePlatforms}
                    onCheckedChange={setCanManagePlatforms}
                  />
                </div>
                <p className="text-xs text-gray-400 ml-6">
                  Allow user to connect and disconnect platforms (Shopify, Meta Ads, etc.)
                </p>
              </div>

              {/* Report Generation Permission */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <Label htmlFor="report-generation" className="text-gray-300 font-medium">
                      Report Generation
                    </Label>
                  </div>
                  <Switch
                    id="report-generation"
                    checked={canGenerateReports}
                    onCheckedChange={setCanGenerateReports}
                  />
                </div>
                <p className="text-xs text-gray-400 ml-6">
                  Allow user to generate AI marketing reports and analysis
                </p>
              </div>

              <Button 
                onClick={createShareLink}
                disabled={creating}
                className="w-full bg-white hover:bg-gray-100 text-black font-medium"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Create Share Link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Share Links */}
          <Card className="bg-[#2A2A2A] border-[#333]">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Active Share Links
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage existing invitation links
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              ) : shareLinks.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No active share links found
                </div>
              ) : (
                <div className="space-y-4">
                  {shareLinks.map((link) => {
                    const expired = isExpired(link.expires_at)
                    const maxUsed = isMaxUsesReached(link)
                    const inactive = expired || maxUsed || !link.is_active

                    return (
                      <div
                        key={link.id}
                        className={`p-4 rounded-lg border ${
                          inactive 
                            ? 'bg-[#1A1A1A] border-[#333] opacity-60' 
                            : 'bg-[#333] border-[#444]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Badge className={`${getRoleColor(link.role)} border`}>
                              <Users className="w-3 h-3 mr-1" />
                              {link.role.replace('_', ' ').toUpperCase()}
                            </Badge>
                            
                            {inactive && (
                              <Badge variant="secondary" className="bg-[#444] text-gray-300 border-[#555]">
                                {expired ? 'Expired' : maxUsed ? 'Max Uses Reached' : 'Inactive'}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => copyShareLink(link.token)}
                              size="sm"
                              variant="outline"
                              className="border-[#333] bg-[#2A2A2A] text-gray-300 hover:bg-[#333] hover:text-white"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              onClick={() => revokeShareLink(link.token)}
                              size="sm"
                              variant="outline"
                              className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center text-gray-400">
                            <Calendar className="w-4 h-4 mr-1" />
                            Expires: {formatDate(link.expires_at)}
                          </div>
                          
                          <div className="flex items-center text-gray-400">
                            <Clock className="w-4 h-4 mr-1" />
                            Uses: {link.current_uses}/{link.max_uses}
                          </div>
                          
                          <div className="flex items-center text-gray-400">
                            <Calendar className="w-4 h-4 mr-1" />
                            Created: {formatDate(link.created_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 