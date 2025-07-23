'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Clock,
  Shield,
  Building2,
  Store,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

interface InvitationData {
  id: string
  brand_id: string
  platform_type: 'shopify' | 'meta'
  expires_at: string
  brand_owner_email: string | null
  status: string
  brands: {
    id: string
    name: string
    image_url: string | null
    niche: string | null
  }
  created_by: string
  created_at: string
}

export default function ConnectPlatformPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shopifyUrl, setShopifyUrl] = useState('')
  const [step, setStep] = useState<'details' | 'connecting' | 'success'>('details')

  // Load invitation data
  useEffect(() => {
    if (token) {
      loadInvitation()
    }
  }, [token])

  const loadInvitation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/connect-platform/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load invitation')
      }

      setInvitation(data.invitation)
    } catch (error) {
      console.error('Error loading invitation:', error)
      setError(error instanceof Error ? error.message : 'Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!invitation) return

    setConnecting(true)
    setStep('connecting')

    try {
      if (invitation.platform_type === 'shopify') {
        if (!shopifyUrl.trim()) {
          toast.error('Please enter your Shopify store URL')
          setConnecting(false)
          setStep('details')
          return
        }

        // Store the invitation info in session storage for the callback
        sessionStorage.setItem('platformInvitation', JSON.stringify({
          token,
          brandId: invitation.brand_id,
          platformType: invitation.platform_type
        }))

        // Redirect to Shopify OAuth
        const authUrl = new URL(`https://${shopifyUrl.replace('.myshopify.com', '')}.myshopify.com/admin/oauth/authorize`)
        authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID!)
        authUrl.searchParams.set('scope', 'read_products,read_orders,read_customers,read_inventory')
        authUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/platform-connection/shopify/callback`)
        authUrl.searchParams.set('state', token) // Use the invitation token as state

        window.location.href = authUrl.toString()
      } else if (invitation.platform_type === 'meta') {
        // Store the invitation info in session storage for the callback
        sessionStorage.setItem('platformInvitation', JSON.stringify({
          token,
          brandId: invitation.brand_id,
          platformType: invitation.platform_type
        }))

        // Redirect to Meta OAuth
        const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
        authUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_META_APP_ID!)
        authUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/platform-connection/meta/callback`)
        authUrl.searchParams.set('scope', 'ads_management,ads_read,business_management')
        authUrl.searchParams.set('state', token) // Use the invitation token as state
        authUrl.searchParams.set('response_type', 'code')

        window.location.href = authUrl.toString()
      }
    } catch (error) {
      console.error('Error initiating connection:', error)
      toast.error('Failed to initiate connection')
      setConnecting(false)
      setStep('details')
    }
  }

  const getPlatformDisplayName = (platform: string) => {
    return platform === 'shopify' ? 'Shopify' : 'Meta Ads'
  }

  const getPlatformIcon = (platform: string) => {
    return platform === 'shopify' ? '/shopify-icon.png' : '/meta-icon.png'
  }

  const isExpired = invitation && new Date(invitation.expires_at) < new Date()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading invitation...</span>
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-[#1a1a1a] border-[#333]">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h1 className="text-xl font-semibold text-white">Invalid Invitation</h1>
              <p className="text-gray-400">
                {error || 'This invitation link is invalid or has expired.'}
              </p>
              <Button 
                onClick={() => router.push('/')}
                className="w-full"
              >
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-[#1a1a1a] border-[#333]">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Clock className="w-12 h-12 text-yellow-500 mx-auto" />
              <h1 className="text-xl font-semibold text-white">Invitation Expired</h1>
              <p className="text-gray-400">
                This invitation expired on {new Date(invitation.expires_at).toLocaleDateString()}.
                Please request a new invitation from your marketing team.
              </p>
              <Button 
                onClick={() => router.push('/')}
                className="w-full"
              >
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-[#1a1a1a] border-[#333]">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-semibold text-white">Successfully Connected!</h1>
              <p className="text-gray-400">
                Your {getPlatformDisplayName(invitation.platform_type)} account has been connected to {invitation.brands.name}.
              </p>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  Your marketing team can now access your platform data to provide better insights and management.
                </p>
              </div>
              <Button 
                onClick={() => router.push('/')}
                className="w-full"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Platform Connection Invitation
          </h1>
          <p className="text-gray-400">
            Connect your {getPlatformDisplayName(invitation.platform_type)} account securely
          </p>
        </div>

        {/* Main Card */}
        <Card className="bg-[#1a1a1a] border-[#333] shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                <img 
                  src={getPlatformIcon(invitation.platform_type)} 
                  alt={getPlatformDisplayName(invitation.platform_type)}
                  className="w-8 h-8"
                />
              </div>
              <div>
                <CardTitle className="text-white text-xl">
                  Connect {getPlatformDisplayName(invitation.platform_type)}
                </CardTitle>
                <p className="text-gray-400 text-sm">
                  For: {invitation.brands.name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Brand Info */}
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                  {invitation.brands.image_url ? (
                    <img 
                      src={invitation.brands.image_url} 
                      alt={invitation.brands.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    invitation.brands.name[0].toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{invitation.brands.name}</h3>
                  {invitation.brands.niche && (
                    <p className="text-xs text-gray-400">{invitation.brands.niche}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Secure Connection</p>
                  <p className="text-blue-700">
                    Your login credentials are processed directly by {getPlatformDisplayName(invitation.platform_type)} 
                    and are never stored or seen by the marketing team. Only authorized data access is granted.
                  </p>
                </div>
              </div>
            </div>

            {/* Connection Form */}
            {invitation.platform_type === 'shopify' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shopify-url" className="text-white font-medium">
                    Shopify Store URL
                  </Label>
                  <div className="mt-2">
                    <Input
                      id="shopify-url"
                      placeholder="your-store.myshopify.com"
                      value={shopifyUrl}
                      onChange={(e) => setShopifyUrl(e.target.value)}
                      disabled={connecting}
                      className="bg-[#0f0f0f] border-[#333] text-white"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Enter your Shopify store URL (e.g., mystore.myshopify.com)
                  </p>
                </div>
              </div>
            )}

            {/* What happens next */}
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#333]">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                What happens next:
              </h4>
              <ol className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  You'll be redirected to {getPlatformDisplayName(invitation.platform_type)} to sign in
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  Authorize limited read-only access for marketing analytics
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  Your platform will be connected to the marketing dashboard
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">4.</span>
                  Marketing team gets access to performance data only
                </li>
              </ol>
            </div>

            {/* Connect Button */}
            <Button
              onClick={handleConnect}
              disabled={connecting || (invitation.platform_type === 'shopify' && !shopifyUrl.trim())}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3"
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting to {getPlatformDisplayName(invitation.platform_type)}...
                </>
              ) : (
                <>
                  Connect {getPlatformDisplayName(invitation.platform_type)}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            {/* Expiration Info */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                This invitation expires on {new Date(invitation.expires_at).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 