'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Crown, 
  Eye,
  Edit3,
  Trash2,

  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Check,
  Building2,
  Calendar,
  Plus,
  Share2,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AgencyRole {
  id: string
  name: string
  description: string
  permissions: any
  is_default: boolean
}

interface TeamMember {
  id: string
  member_email: string
  member_user_id?: string
  status: 'pending' | 'active' | 'inactive'
  invitation_token?: string
  invitation_expires_at?: string
  invited_at: string
  joined_at?: string
  invited_by_user_id?: string
  invited_by_name?: string
  invited_by_email?: string
  agency_roles: AgencyRole
}

interface InviteLink {
  id: string
  token: string
  role_id: string
  role_name: string
  expires_at: string
  max_uses: number
  current_uses: number
  created_at: string
  is_active: boolean
}

interface AgencyTeamManagementProps {
  agencyName: string
  agencyLogo?: string
}

export default function AgencyTeamManagement({ agencyName, agencyLogo }: AgencyTeamManagementProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [roles, setRoles] = useState<AgencyRole[]>([])
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  // Invite form state
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [maxUses, setMaxUses] = useState(1)

  useEffect(() => {
    loadTeamData()
  }, [])

  const loadTeamData = async () => {
    try {
      const response = await fetch('/api/agency-team')
      const data = await response.json()

      if (data.success) {
        setTeamMembers(data.teamMembers)
        setRoles(data.roles)
        setInviteLinks(data.inviteLinks || [])
        // Set default role
        const defaultRole = data.roles.find((role: AgencyRole) => role.is_default)
        if (defaultRole) {
          setSelectedRoleId(defaultRole.id)
        }
      } else {
        toast.error('Failed to load team data')
      }
    } catch (error) {
      toast.error('Error loading team data')
    }
  }

  const createInviteLink = async () => {
    if (!selectedRoleId) {
      toast.error('Please select a role')
      return
    }

    try {
      setIsCreating(true)
      const response = await fetch('/api/agency-team/invite-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId: selectedRoleId,
          expiresInDays,
          maxUses
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Invitation link created successfully!')
        // Copy to clipboard
        await navigator.clipboard.writeText(data.inviteUrl)
        toast.success('Link copied to clipboard!')
        
        // Refresh the list
        loadTeamData()
        setShowInviteDialog(false)
      } else {
        toast.error(data.error || 'Failed to create invitation link')
      }
    } catch (error) {
      toast.error('Error creating invitation link')
    } finally {
      setIsCreating(false)
    }
  }

  const copyInviteLink = (token: string) => {
    const inviteLink = `${window.location.origin}/join-agency/${token}`
    navigator.clipboard.writeText(inviteLink)
    toast.success('Invite link copied to clipboard!')
  }

  const revokeInviteLink = async (linkId: string) => {
    try {
      const response = await fetch('/api/agency-team/invite-link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Invitation link revoked successfully!')
        loadTeamData()
      } else {
        toast.error(data.error || 'Failed to revoke invitation link')
      }
    } catch (error) {
      toast.error('Error revoking invitation link')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return
    }

    try {
      const response = await fetch('/api/agency-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          memberId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Team member removed successfully!')
        loadTeamData()
      } else {
        toast.error(data.error || 'Failed to remove team member')
      }
    } catch (error) {
      toast.error('Error removing team member')
    }
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'owner':
        return <Crown className="h-4 w-4" />
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'media_buyer':
        return <Edit3 className="h-4 w-4" />
      case 'analyst':
        return <Eye className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-red-500/20 text-red-300 border-red-500/40'
      case 'media_buyer':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
      case 'analyst':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
    }
  }

  const getStatusBadge = (member: TeamMember) => {
    switch (member.status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/40 border">Active</Badge>
      case 'pending':
        const isExpired = member.invitation_expires_at && new Date() > new Date(member.invitation_expires_at)
        return (
          <Badge className={cn(
            "border",
            isExpired ? "bg-red-500/20 text-red-300 border-red-500/40" : "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
          )}>
            {isExpired ? 'Expired' : 'Pending'}
          </Badge>
        )
      case 'inactive':
        return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/40 border">Inactive</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/40 border">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isExpired = (dateString: string) => {
    return new Date(dateString) < new Date()
  }

  const isMaxUsesReached = (link: InviteLink) => {
    return link.current_uses >= link.max_uses
  }



  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-[#333] p-6 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] via-white/[0.01] to-white/[0.02]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Team Management</h2>
              <p className="text-gray-400">Create invitation links to add team members to {agencyName}. No email required!</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-blue-400" />
                </div>
                <h3 className="text-white font-medium text-sm">Full Brand Access</h3>
              </div>
              <p className="text-gray-400 text-xs">Team members get access to all agency brands automatically</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-400" />
                </div>
                <h3 className="text-white font-medium text-sm">Shareable Links</h3>
              </div>
              <p className="text-gray-400 text-xs">Generate invite links to share via Slack, email, or any platform</p>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-purple-400" />
                </div>
                <h3 className="text-white font-medium text-sm">Secure & Controlled</h3>
              </div>
              <p className="text-gray-400 text-xs">Set expiration dates and usage limits for each invitation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-3 h-3 text-blue-400" />
              </div>
              <h3 className="text-white font-medium text-sm">Active Members</h3>
            </div>
            <p className="text-2xl font-bold text-white">{teamMembers.filter(m => m.status === 'active').length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-3 h-3 text-yellow-400" />
              </div>
              <h3 className="text-white font-medium text-sm">Active Links</h3>
            </div>
            <p className="text-2xl font-bold text-white">{inviteLinks.filter(l => l.is_active && !isExpired(l.expires_at) && !isMaxUsesReached(l)).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Building2 className="w-3 h-3 text-green-400" />
              </div>
              <h3 className="text-white font-medium text-sm">Total (inc. you)</h3>
            </div>
            <p className="text-2xl font-bold text-white">{teamMembers.length + 1}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
          <CardContent className="p-4 flex items-center justify-center">
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-medium px-4 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl w-full">
                  <Share2 className="h-4 w-4 mr-2" />
                  Create Invite Link
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] text-white max-w-2xl">
                <DialogHeader className="space-y-3 pb-6">
                  <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-white" />
                    </div>
                    Create Invitation Link
                  </DialogTitle>
                  <p className="text-sm text-gray-400">
                    Generate a shareable link to invite team members. No email setup required!
                  </p>
                </DialogHeader>
                
                {/* Access Disclosure */}
                <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#333] mb-6">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    What access are you granting?
                  </h4>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p>Team members invited to <span className="text-white font-medium">{agencyName}</span> will be able to:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4 text-gray-400 text-xs">
                      <li>Access all brands in your agency automatically</li>
                      <li>View dashboard metrics and analytics for all brands</li>
                      <li>Generate reports and use AI marketing tools</li>
                      <li>Collaborate on campaigns and marketing strategies</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Role
                      </Label>
                    <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                        <SelectTrigger className="h-11 bg-[#1a1a1a] border-[#333] text-white rounded-xl hover:bg-[#2A2A2A] focus:ring-2 focus:ring-white/20">
                          <SelectValue placeholder="Select a role" className="text-white" />
                      </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-[#333] shadow-xl rounded-xl">
                        {roles.filter(role => role.name !== 'owner').map((role) => (
                            <SelectItem 
                              key={role.id} 
                              value={role.id} 
                              className="text-white hover:bg-[#2A2A2A] focus:bg-[#333] cursor-pointer py-3 px-3 rounded-lg mx-1 my-1"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className="flex-shrink-0">
                              {getRoleIcon(role.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium capitalize text-white text-sm">
                                    {role.name.replace('_', ' ')}
                                  </div>
                                  <div className="text-xs text-gray-400 truncate">
                                  {role.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Expires In (Days)
                      </Label>
                      <Input
                        type="number"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(Number(e.target.value))}
                        min="1"
                        max="365"
                        className="h-11 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Max Uses
                      </Label>
                      <Input
                        type="number"
                        value={maxUses}
                        onChange={(e) => setMaxUses(Number(e.target.value))}
                        min="1"
                        max="100"
                        className="h-11 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 rounded-xl"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={createInviteLink} 
                      disabled={isCreating}
                      className="flex-1 bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-medium rounded-xl transition-all duration-300"
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Share2 className="h-4 w-4 mr-2" />
                      )}
                      Create & Copy Link
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowInviteDialog(false)}
                      className="border-[#333] bg-[#1a1a1a] text-gray-300 hover:bg-[#333] hover:text-white rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* Active Invitation Links */}
      {inviteLinks.length > 0 && (
        <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
          <CardHeader className="border-b border-[#333] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
                <Share2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">Active Invitation Links</CardTitle>
                <p className="text-gray-400 text-sm">Manage and share your invitation links</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {inviteLinks.map((link) => {
                const expired = isExpired(link.expires_at)
                const maxUsed = isMaxUsesReached(link)
                const inactive = expired || maxUsed || !link.is_active

                return (
                  <div
                    key={link.id}
                    className={`p-4 rounded-xl border ${
                      inactive 
                        ? 'bg-[#1a1a1a] border-[#333] opacity-60' 
                        : 'bg-[#1a1a1a] border-[#333] hover:bg-[#222]'
                    } transition-colors`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Badge className={`${getRoleColor(link.role_name)} border`}>
                          {getRoleIcon(link.role_name)}
                          <span className="ml-1 capitalize">
                            {link.role_name.replace('_', ' ')}
                          </span>
                        </Badge>
                        
                        {inactive && (
                          <Badge className="bg-red-500/20 text-red-300 border-red-500/40 border">
                            {expired ? 'Expired' : maxUsed ? 'Max Uses Reached' : 'Inactive'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => copyInviteLink(link.token)}
                          size="sm"
                          variant="outline"
                          className="border-[#333] bg-[#1a1a1a] text-gray-300 hover:bg-[#333] hover:text-white rounded-lg"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          onClick={() => revokeInviteLink(link.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 rounded-lg"
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
          </CardContent>
        </Card>
      )}

      {/* Team Members Section */}
      <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
        <CardHeader className="border-b border-[#333] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">Team Members</CardTitle>
              <p className="text-gray-400 text-sm">Manage your agency team and their permissions</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No team members yet</h3>
              <p className="text-gray-400 mb-6">
                Create an invitation link to invite team members to collaborate on all your brands
              </p>
              <Button 
                onClick={() => setShowInviteDialog(true)} 
                className="bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-medium px-6 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Create Your First Invite Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
                  {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-[#333] hover:bg-[#222] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center">
                      <Users className="h-6 w-6 text-gray-400" />
                          </div>
                          <div>
                      <div className="font-medium text-white text-base">{member.member_email}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-gray-400">
                          {getRoleIcon(member.agency_roles.name)}
                          <span className="text-sm capitalize">
                            {member.agency_roles.name.replace('_', ' ')}
                          </span>
                        </div>
                        {member.joined_at && (
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <Calendar className="w-3 h-3" />
                            Joined {format(new Date(member.joined_at), 'MMM d, yyyy')}
                          </div>
                        )}
                        {member.invited_by_name && (
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <UserPlus className="w-3 h-3" />
                            Added by {member.invited_by_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(member)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#333]">
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.id)}
                          className="text-red-400 hover:bg-[#333]"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                  </div>
                </div>
                  ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Information */}
      <Card className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-xl">
        <CardHeader className="border-b border-[#333] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center shadow-lg">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-white">Role Permissions</CardTitle>
              <p className="text-gray-400 text-sm">Understanding what each role can do in your agency</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4">
            {roles.filter(role => role.name !== 'owner').map((role) => (
              <div key={role.id} className="flex items-start gap-4 p-4 bg-[#1a1a1a] rounded-xl border border-[#333]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center flex-shrink-0">
                  {getRoleIcon(role.name)}
                </div>
                <div className="flex-1">
                  <div className="font-medium capitalize text-white text-base mb-1">
                      {role.name.replace('_', ' ')}
                    </div>
                  <div className="text-sm text-gray-400">
                      {role.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 