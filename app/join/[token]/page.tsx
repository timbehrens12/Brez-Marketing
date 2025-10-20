'use client'

export const runtime = 'edge'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, Users, Calendar, Clock, Building2, User, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ShareLinkData {
  id: string
  brand_id?: string
  role: 'admin' | 'media_buyer' | 'viewer'
  expires_at: string
  max_uses: number
  current_uses: number
  created_at: string
  is_multi_brand?: boolean
  brands: Array<{
    id: string
    name: string
    image_url?: string
    niche?: string
    agency_info?: {
      name: string
      logo_url?: string
      user_id: string
    }
    connections: string[]
  }>
  created_by_user?: {
    fullName: string
    firstName?: string
    lastName?: string
    emailAddress?: string
  }
  // Legacy fields for backward compatibility
  brand?: {
    id: string
    name: string
    image_url?: string
    niche?: string
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
  const [joinResponse, setJoinResponse] = useState<any>(null)

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

  // No auto-join - let users manually accept invitations

  const handleJoin = async () => {
    if (!shareData) return

    // If user is not authenticated, don't redirect - they need to sign in first
    if (!userId) {
      return
    }

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
        // Handle specific error cases with better messaging
        if (response.status === 400) {
          if (data.error?.includes('already have access') || data.error?.includes('already own')) {
            setError(data.message || data.error || 'You already have access to this brand')
          } else if (data.error?.includes('No new brand access')) {
            setError('You already have access to all brands in this invitation')
          } else {
            setError(data.error || 'Cannot accept this invitation')
          }
        } else {
          setError(data.error || 'Failed to join brand')
        }
        return
      }

      setSuccess(true)
      setJoinResponse(data)
      
      // Add a small delay to ensure database transaction is complete
      setTimeout(() => {
        // Dispatch custom event to refresh brand context
        console.log('Dispatching brandAccessGranted event for brand:', data.brandId || data.brandIds?.[0])
        window.dispatchEvent(new CustomEvent('brandAccessGranted', { 
          detail: { brandId: data.brandId || data.brandIds?.[0] } 
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
            <div className="text-gray-400 text-center mb-4">
              {joinResponse?.message ? (
                <p className="text-sm text-gray-300 mb-3">{joinResponse.message}</p>
              ) : (
                <>
                  You now have access to{' '}
                  {shareData?.is_multi_brand ? (
                    <>
                      <strong className="text-white">{shareData.brands.length} brands</strong>
                      <div className="mt-2 space-y-1">
                        {shareData.brands.map((brand, index) => (
                          <div key={brand.id} className="text-sm text-gray-300">
                            {brand.name}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <strong className="text-white">{shareData?.brands[0]?.name || shareData?.brand?.name}</strong>
                  )}
                </>
              )}
              
              {/* Show skipped brands information if any */}
              {joinResponse?.skipped_brands && (
                <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-300 font-medium">
                    Note: {joinResponse.skipped_brands.count} brand{joinResponse.skipped_brands.count > 1 ? 's' : ''} 
                    {joinResponse.skipped_brands.reason === 'owned' ? ' you own were' : ' you already have access to were'} skipped.
                  </p>
                </div>
              )}
            </div>
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
          {shareData.is_multi_brand ? (
            <>
              {/* Multi-brand header */}
              <div className="flex items-center justify-center mb-4">
                <div className="flex -space-x-2">
                  {shareData.brands.slice(0, 3).map((brand, index) => (
                    <div key={brand.id} className="relative">
                      {brand.image_url ? (
                        <img 
                          src={brand.image_url} 
                          alt={brand.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#333] bg-[#1a1a1a]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#333] to-[#444] flex items-center justify-center border-2 border-[#555] text-white font-bold text-sm">
                          {brand.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  {shareData.brands.length > 3 && (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#333] to-[#444] flex items-center justify-center border-2 border-[#555] text-white font-bold text-xs">
                      +{shareData.brands.length - 3}
                    </div>
                  )}
                </div>
              </div>
              <CardTitle className="text-white text-xl">
                Join {shareData.brands.length} Brands
              </CardTitle>
              <CardDescription className="text-gray-400">
                {shareData.created_by_user?.fullName 
                  ? `${shareData.created_by_user.fullName} has invited you to collaborate on ${shareData.brands.length} brands`
                  : `You've been invited to collaborate on ${shareData.brands.length} brands`
                }
              </CardDescription>
            </>
          ) : (
            <>
              {/* Single brand header */}
              <div className="flex items-center justify-center mb-4">
                {shareData.brands[0]?.image_url ? (
                  <img 
                    src={shareData.brands[0].image_url} 
                    alt={shareData.brands[0].name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#333]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#333] to-[#444] flex items-center justify-center border-2 border-[#555]">
                    <span className="text-white font-bold text-xl">
                      {shareData.brands[0]?.name?.charAt(0)?.toUpperCase() || 'B'}
                    </span>
                  </div>
                )}
              </div>
              <CardTitle className="text-white text-xl">
                Join {shareData.brands[0]?.name || 'Brand'}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {shareData.created_by_user?.fullName 
                  ? `${shareData.created_by_user.fullName} has invited you to collaborate on this brand`
                  : 'You\'ve been invited to collaborate on this brand'
                }
              </CardDescription>
            </>
          )}
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

          {/* Brand Information */}
          <div className="bg-[#2A2A2A] rounded-lg p-4 space-y-4 border border-[#333] max-h-64 overflow-y-auto">
            <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Brand{shareData.is_multi_brand ? 's' : ''} Details
            </h4>
            
            {shareData.brands.map((brand, index) => (
              <div key={brand.id} className="space-y-3 border-b border-[#333] last:border-b-0 pb-3 last:pb-0">
                {/* Brand Header */}
                <div className="flex items-center gap-3">
                  {brand.image_url ? (
                    <img 
                      src={brand.image_url} 
                      alt={brand.name}
                      className="w-10 h-10 rounded-xl object-cover border border-[#444]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#444] to-[#333] flex items-center justify-center text-white font-bold border border-[#444]">
                      {brand.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h5 className="text-white font-medium truncate">{brand.name}</h5>
                    {brand.niche && (
                      <p className="text-xs text-gray-400">{brand.niche}</p>
                    )}
                  </div>
                </div>

                {/* Agency Info */}
                {brand.agency_info && (
                  <div className="flex items-center gap-2 pl-2 py-2 bg-[#1a1a1a] rounded-lg">
                    {brand.agency_info.logo_url ? (
                      <div className="w-6 h-6 bg-[#2A2A2A] border border-[#333] rounded-lg flex items-center justify-center p-1 overflow-hidden flex-shrink-0">
                        <img 
                          src={brand.agency_info.logo_url} 
                          alt={brand.agency_info.name}
                          className="w-4 h-4 object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-[#333] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <span className="text-sm text-gray-300 font-medium">{brand.agency_info.name}</span>
                    <span className="text-xs text-gray-500">Agency</span>
                  </div>
                )}

                {/* Connected Platforms */}
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-xs text-gray-400">Platforms:</span>
                  <div className="flex items-center gap-1">
                    {brand.connections.length > 0 ? (
                      brand.connections.map((platform, platIndex) => (
                        <div key={`${brand.id}-${platform}-${platIndex}`} className="w-5 h-5 rounded border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center">
                          <img 
                            src={platform === 'shopify' ? '/shopify-icon.png' : '/meta-icon.png'} 
                            alt={platform} 
                            className="w-4 h-4 object-contain"
                          />
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">None connected</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Shared By Information */}
          {shareData.created_by_user && (
            <div className="bg-[#2A2A2A] rounded-lg p-4 space-y-2 border border-[#333]">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Shared By:</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-[#444] to-[#333] rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-white font-medium">{shareData.created_by_user.fullName}</span>
                </div>
              </div>
              {shareData.created_by_user.emailAddress && (
                <div className="text-right">
                  <span className="text-xs text-gray-400">{shareData.created_by_user.emailAddress}</span>
                </div>
              )}
            </div>
          )}

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

          {/* Auth Info for Unauthenticated Users */}
          {isLoaded && !userId && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
              <div className="text-center space-y-3">
                <p className="text-blue-300 text-sm font-medium">
                  🔐 Sign in required to accept this invitation
                </p>
                <p className="text-gray-400 text-xs">
                  Please sign in or create an account to continue.
                </p>
                <div className="flex gap-2 justify-center pt-2">
                  <Button 
                    onClick={() => router.push('/login')}
                    className="bg-white hover:bg-gray-100 text-black text-sm px-4 py-2 h-auto"
                  >
                    Sign In
                  </Button>
                  <Button 
                    onClick={() => router.push('/sign-up')}
                    variant="outline"
                    className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black text-sm px-4 py-2 h-auto"
                  >
                    Create Account
                  </Button>
                </div>
              </div>
            </div>
          )}

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
            ) : isLoaded && userId ? (
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
            ) : !isLoaded ? (
              <Button disabled className="w-full bg-[#333] text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </Button>
            ) : null}
          </div>


        </CardContent>
      </Card>
    </div>
  )
} 