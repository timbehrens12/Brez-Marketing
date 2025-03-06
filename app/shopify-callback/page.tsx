"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export default function ShopifyCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get all the params
        const code = searchParams.get('code')
        const shop = searchParams.get('shop')
        const state = searchParams.get('state')
        const hmac = searchParams.get('hmac')
        const host = searchParams.get('host')
        const timestamp = searchParams.get('timestamp')

        if (!code || !shop || !state) {
          setStatus('error')
          setErrorMessage('Missing required parameters')
          return
        }

        // Forward these params to our API route
        const response = await fetch(`/api/shopify/callback/process?code=${code}&shop=${shop}&state=${state}&hmac=${hmac}&host=${host}&timestamp=${timestamp}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to process callback')
        }
        
        const data = await response.json()
        
        setStatus('success')
        
        // Redirect to settings page after a short delay
        setTimeout(() => {
          router.push('/settings?success=true')
        }, 1500)
      } catch (error) {
        console.error('Error processing callback:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')
      }
    }

    processCallback()
  }, [searchParams, router])

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <div className="bg-red-900/30 border border-red-700 p-4 rounded-md text-red-200 mb-4 max-w-md">
          <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
          <p>{errorMessage || 'There was an error connecting your Shopify store.'}</p>
        </div>
        <button 
          onClick={() => router.push('/settings')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Return to Settings
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black">
      {status === 'processing' ? (
        <>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <h1 className="text-xl font-semibold text-white">Connecting your Shopify store...</h1>
          <p className="text-gray-400 mt-2">Please wait while we complete the connection process.</p>
        </>
      ) : (
        <>
          <div className="bg-green-900/30 border border-green-700 p-4 rounded-md text-green-200 mb-4 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Connection Successful!</h2>
            <p>Your Shopify store has been connected successfully.</p>
          </div>
          <p className="text-gray-400 mt-2">Redirecting to dashboard...</p>
        </>
      )}
    </div>
  )
} 