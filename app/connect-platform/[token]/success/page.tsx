'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Shield,
  ArrowRight
} from 'lucide-react'

interface SuccessData {
  platformType: 'shopify' | 'meta'
  brandName: string
  brandImage?: string
}

export default function ConnectionSuccessPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  
  const [loading, setLoading] = useState(true)
  const [successData, setSuccessData] = useState<SuccessData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      loadSuccessData()
    }
  }, [token])

  const loadSuccessData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/connect-platform/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load success data')
      }

      setSuccessData({
        platformType: data.invitation.platform_type,
        brandName: data.invitation.brands.name,
        brandImage: data.invitation.brands.image_url
      })
    } catch (error) {
      console.error('Error loading success data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const getPlatformDisplayName = (platform: string) => {
    return platform === 'shopify' ? 'Shopify' : 'Meta Ads'
  }

  const getPlatformIcon = (platform: string) => {
    return platform === 'shopify' ? '/shopify-icon.png' : '/meta-icon.png'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (error || !successData) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-[#1a1a1a] border-[#333]">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <h1 className="text-xl font-semibold text-white">Error Loading Page</h1>
              <p className="text-gray-400">
                {error || 'Unable to load connection details.'}
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <Card className="w-full max-w-lg bg-[#1a1a1a] border-[#333] shadow-2xl">
        <CardContent className="pt-8">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center border-2 border-green-500/30">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>

            {/* Success Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white">
                Successfully Connected!
              </h1>
              <p className="text-gray-400">
                Your {getPlatformDisplayName(successData.platformType)} account has been securely connected
              </p>
            </div>

            {/* Platform and Brand Info */}
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                    <img 
                      src={getPlatformIcon(successData.platformType)} 
                      alt={getPlatformDisplayName(successData.platformType)}
                      className="w-6 h-6"
                    />
                  </div>
                  <span className="text-white font-medium">
                    {getPlatformDisplayName(successData.platformType)}
                  </span>
                </div>
                
                <ArrowRight className="w-5 h-5 text-green-500" />
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                    {successData.brandImage ? (
                      <img 
                        src={successData.brandImage} 
                        alt={successData.brandName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      successData.brandName[0].toUpperCase()
                    )}
                  </div>
                  <span className="text-white font-medium">
                    {successData.brandName}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800 text-left">
                  <p className="font-medium mb-1">Connection Secured</p>
                  <p className="text-green-700">
                    Your marketing team now has authorized access to {getPlatformDisplayName(successData.platformType)} analytics. 
                    Your login credentials remain secure and private.
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#333] text-left">
              <h3 className="text-white font-medium mb-3">What happens next:</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">•</span>
                  Your marketing team will sync platform data
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">•</span>
                  Analytics and insights will appear in their dashboard
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">•</span>
                  They can now provide better optimization recommendations
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">•</span>
                  You'll receive reports and updates as usual
                </li>
              </ul>
            </div>

            {/* Action Button */}
            <Button 
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3"
            >
              All Done
            </Button>

            {/* Footer Note */}
            <p className="text-xs text-gray-500">
              You can close this page. Your marketing team has been notified of the successful connection.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 