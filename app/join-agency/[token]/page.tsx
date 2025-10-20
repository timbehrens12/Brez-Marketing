'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users, 
  Building2, 
  Crown, 
  Shield, 
  Edit3, 
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Mail
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface InvitationDetails {
  email: string
  role: {
    name: string
    description: string
    permissions: any
  }
  agencyName: string
  agencyLogo?: string
  invitedAt: string
  expiresAt: string
}

export default function JoinAgencyPage() {
  const params = useParams()
  const router = useRouter()
  const { userId, isLoaded } = useAuth()
  const token = params.token as string

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      loadInvitation()
    }
  }, [token])

  const loadInvitation = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/agency-team/join/${token}`)
      const data = await response.json()

      if (data.success) {
        setInvitation(data.invitation)
      } else {
        setError(data.error || 'Invalid invitation')
      }
    } catch (error) {
      console.error('Error loading invitation:', error)
      setError('Failed to load invitation details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!userId) {
      toast.error('Please sign in to accept the invitation')
      return
    }

    try {
      setIsAccepting(true)
      
      const response = await fetch(`/api/agency-team/join/${token}`, {
        method: 'POST'
      })
      
      const data = await response.json()

      if (data.success) {
        toast.success(data.message || 'Welcome to the team!')
        // Redirect to dashboard after successful join
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        toast.error(data.error || 'Failed to accept invitation')
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error('Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'owner':
        return <Crown className="h-5 w-5" />
      case 'admin':
        return <Shield className="h-5 w-5" />
      case 'media_buyer':
        return <Edit3 className="h-5 w-5" />
      case 'analyst':
        return <Eye className="h-5 w-5" />
      default:
        return <Users className="h-5 w-5" />
    }
  }

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-blue-500'
      case 'media_buyer':
        return 'bg-green-500'
      case 'analyst':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] flex items-center justify-center">
        <Card className="w-full max-w-md bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333]">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
            <p className="text-white">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] flex items-center justify-center">
        <Card className="w-full max-w-md bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333]">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <CardTitle className="text-xl text-white">Invalid Invitation</CardTitle>
            <CardDescription className="text-gray-400">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  const isExpired = new Date() > new Date(invitation.expiresAt)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#333] shadow-2xl">
        <CardHeader className="text-center space-y-4">
          {/* Agency Logo/Icon */}
          <div className="flex justify-center">
            {invitation.agencyLogo ? (
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#333]">
                <Image 
                  src={invitation.agencyLogo} 
                  alt={invitation.agencyName}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-[#333] to-[#222] rounded-full flex items-center justify-center border-2 border-[#333]">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl text-white">
              Join {invitation.agencyName}
            </CardTitle>
            <CardDescription className="text-gray-400">
              You've been invited to join this agency team
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
            <h3 className="text-lg font-semibold text-white mb-4">Invitation Details</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Invited Email:</span>
                <span className="text-white font-medium">{invitation.email}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Your Role:</span>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-white", getRoleBadgeColor(invitation.role.name))}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(invitation.role.name)}
                      <span className="capitalize">
                        {invitation.role.name.replace('_', ' ')}
                      </span>
                    </div>
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Invited:</span>
                <span className="text-white font-medium">
                  {format(new Date(invitation.invitedAt), 'MMM d, yyyy')}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Expires:</span>
                <span className={cn(
                  "font-medium",
                  isExpired ? "text-red-400" : "text-white"
                )}>
                  {format(new Date(invitation.expiresAt), 'MMM d, yyyy')}
                  {isExpired && " (Expired)"}
                </span>
              </div>
            </div>
          </div>

          {/* Role Description */}
          <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#333]">
            <h3 className="text-lg font-semibold text-white mb-2">
              {invitation.role.name.replace('_', ' ').toUpperCase()} Role
            </h3>
            <p className="text-gray-400 text-sm mb-3">
              {invitation.role.description}
            </p>
            
            {/* Role Permissions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">What you'll have access to:</h4>
                             <ul className="text-sm text-gray-400 space-y-1">
                 {Object.entries(invitation.role.permissions || {}).map(([key, value]) => (
                   <li key={key} className="flex items-center gap-2">
                     <CheckCircle className="h-3 w-3 text-green-400" />
                     <span className="capitalize">
                       {key.replace('_', ' ')}: {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                     </span>
                   </li>
                 ))}
              </ul>
            </div>
          </div>

          {/* Expiry Warning */}
          {isExpired && (
            <Alert className="border-red-800/50 bg-red-950/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                This invitation has expired. Please contact the agency owner for a new invitation.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {!isExpired && (
              <>
                {!isLoaded ? (
                  <Button disabled className="flex-1">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </Button>
                ) : !userId ? (
                  <Button 
                    onClick={() => router.push('/login')}
                    className="flex-1 bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black"
                  >
                    Sign In to Accept
                  </Button>
                ) : (
                  <Button 
                    onClick={handleAcceptInvitation}
                    disabled={isAccepting}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept Invitation
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
            
            <Button 
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="flex-1 border-[#333] bg-[#1a1a1a] text-gray-300 hover:bg-[#333] hover:text-white"
            >
              Go to Dashboard
            </Button>
          </div>

          {/* Footer Info */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              By accepting this invitation, you'll gain access to all brands under {invitation.agencyName}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 