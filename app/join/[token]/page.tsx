'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, Users, Calendar, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ShareLinkData {
  id: string
  brand_id: string
  role: 'admin' | 'media_buyer' | 'viewer'
  expires_at: string
  max_uses: number
  current_uses: number
  created_at: string
  brand: {
    id: string
    name: string
    image_url?: string
    niche?: string
  }
  created_by_user: {
    email: string
    first_name: string
    last_name: string
  }
}

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const { userId, isLoaded } = useAuth()
  const [shareData, setShareData] = useState<ShareLinkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const token = params.token as string

  useEffect(() => {
    if (!token) return

    const fetchShareLink = async () => {
      try {
        const response = await fetch(`/api/join/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid or expired link')
          return
        }

        setShareData(data)
      } catch (err) {
        setError('Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }

    fetchShareLink()
  }, [token])

  const handleJoin = async () => {
    if (!userId || !shareData) return

    setJoining(true)
    setError(null)

    try {
      const response = await fetch(`/api/join/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to join brand')
        return
      }

      setSuccess(true)
      
      // Add a small delay to ensure database transaction is complete
      setTimeout(() => {
        // Dispatch custom event to refresh brand context
        console.log('Dispatching brandAccessGranted event for brand:', data.brandId)
        window.dispatchEvent(new CustomEvent('brandAccessGranted', { 
          detail: { brandId: data.brandId } 
        }))
      }, 500)
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err) {
      setError('Failed to join brand')
    } finally {
      setJoining(false)
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access to brand management and settings'
      case 'media_buyer':
        return 'Access to campaigns, reports, and marketing tools'
      case 'viewer':
        return 'View-only access to reports and brand information'
      default:
        return 'Access to brand'
    }
  }

  const getRoleBadgeColor = (role: string) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1A1A1A] border-[#333] shadow-xl">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
            <p className="text-gray-300">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1A1A1A] border-[#333] shadow-xl">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <XCircle className="h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Invalid Invitation</h2>
            <p className="text-gray-400 text-center mb-6">{error}</p>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="bg-white hover:bg-gray-100 text-black font-medium"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1A1A1A] border-[#333] shadow-xl">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Successfully Joined!</h2>
            <p className="text-gray-400 text-center mb-4">
              You now have access to <strong className="text-white">{shareData?.brand.name}</strong>
            </p>
            <p className="text-sm text-gray-500">Redirecting you to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1A1A1A] border-[#333] shadow-xl">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
            <p className="text-gray-300">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1A1A1A] border-[#333] shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Sign In Required</CardTitle>
            <CardDescription className="text-gray-400">
              You need to sign in to accept this brand invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => router.push('/sign-in')}
              className="w-full bg-white hover:bg-gray-100 text-black font-medium"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => router.push('/sign-up')}
              variant="outline"
              className="w-full border-[#333] bg-[#2A2A2A] text-gray-300 hover:bg-[#333] hover:text-white"
            >
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!shareData) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1A1A1A] border-[#333] shadow-xl">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <XCircle className="h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Invitation Not Found</h2>
            <p className="text-gray-400 text-center">This invitation link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const expiresAt = new Date(shareData.expires_at)
  const isExpired = expiresAt < new Date()
  const isMaxUsesReached = shareData.current_uses >= shareData.max_uses

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-[#1A1A1A] border-[#333] shadow-xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            {shareData.brand.image_url ? (
              <img 
                src={shareData.brand.image_url} 
                alt={shareData.brand.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#333]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#333] to-[#444] flex items-center justify-center border-2 border-[#555]">
                <span className="text-white font-bold text-xl">
                  {shareData.brand.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <CardTitle className="text-white text-xl">
            Join {shareData.brand.name}
          </CardTitle>
          <CardDescription className="text-gray-400">
            You've been invited to collaborate on this brand
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Role Badge */}
          <div className="flex justify-center">
            <Badge className={`${getRoleBadgeColor(shareData.role)} border`}>
              <Users className="w-3 h-3 mr-1" />
              {shareData.role.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* Role Description */}
          <div className="text-center">
            <p className="text-gray-300 text-sm">
              {getRoleDescription(shareData.role)}
            </p>
          </div>

          {/* Brand Info */}
          <div className="bg-[#2A2A2A] rounded-lg p-4 space-y-2 border border-[#333]">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Brand:</span>
              <span className="text-white font-medium">{shareData.brand.name}</span>
            </div>
            {shareData.brand.niche && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Niche:</span>
                <span className="text-gray-300">{shareData.brand.niche}</span>
              </div>
            )}
          </div>

          {/* Expiration Info */}
          <div className="bg-[#2A2A2A] rounded-lg p-4 space-y-2 border border-[#333]">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Expires:
              </span>
              <span className={`text-sm ${isExpired ? 'text-red-400' : 'text-gray-300'}`}>
                {expiresAt.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Uses:
              </span>
              <span className={`text-sm ${isMaxUsesReached ? 'text-red-400' : 'text-gray-300'}`}>
                {shareData.current_uses} / {shareData.max_uses}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            {isExpired ? (
              <Button disabled className="w-full bg-[#333] text-gray-500">
                <XCircle className="w-4 h-4 mr-2" />
                Invitation Expired
              </Button>
            ) : isMaxUsesReached ? (
              <Button disabled className="w-full bg-[#333] text-gray-500">
                <XCircle className="w-4 h-4 mr-2" />
                Maximum Uses Reached
              </Button>
            ) : (
              <Button 
                onClick={handleJoin}
                disabled={joining}
                className="w-full bg-white hover:bg-gray-100 text-black font-medium"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Cancel Button */}
          <Button 
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="w-full border-[#333] bg-[#2A2A2A] text-gray-300 hover:bg-[#333] hover:text-white"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 