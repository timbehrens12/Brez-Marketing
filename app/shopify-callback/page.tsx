"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function ShopifyCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState<string>('Processing your Shopify connection...')
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get all the params
        const code = searchParams.get('code')
        const shop = searchParams.get('shop')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // Log the parameters
        console.log('Shopify callback params:', { 
          code: code?.substring(0, 5) + '...',
          shop, 
          state,
          error,
          errorDescription
        })

        // Add to debug info
        setDebugInfo(prev => prev + `Received callback with params: code=${!!code}, shop=${shop}, state=${!!state}\n`)

        // If Shopify returned an error, handle it
        if (error) {
          console.error('Shopify returned an error:', error, errorDescription)
          setDebugInfo(prev => prev + `Shopify error: ${error}\nDescription: ${errorDescription || 'No description provided'}\n`)
          setStatus('error')
          setMessage(`Error from Shopify: ${error}`)
          
          // Redirect after a delay
          setTimeout(() => {
            router.push(`/settings?error=shopify_error&description=${encodeURIComponent(errorDescription || '')}`)
          }, 2000)
          return
        }

        if (!code || !shop || !state) {
          setDebugInfo(prev => prev + `Missing required parameters\n`)
          setStatus('error')
          setMessage('Missing required parameters')
          
          // Redirect after a delay
          setTimeout(() => {
            router.push('/settings?error=missing_params')
          }, 2000)
          return
        }

        // Parse state to get brandId and connectionId
        let brandId: string, connectionId: string;
        try {
          const stateObj = JSON.parse(state) as { brandId: string; connectionId: string };
          brandId = stateObj.brandId;
          connectionId = stateObj.connectionId;
          setDebugInfo(prev => prev + `Parsed state: brandId=${brandId}, connectionId=${connectionId}\n`);
        } catch (error) {
          console.error('Error parsing state:', error)
          setDebugInfo(prev => prev + `Error parsing state: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
          setStatus('error')
          setMessage('Invalid state parameter')
          
          // Redirect after a delay
          setTimeout(() => {
            router.push('/settings?error=invalid_state')
          }, 2000)
          return
        }

        // Process the callback using our server-side API
        setDebugInfo(prev => prev + `Processing callback via server API...\n`)
        
        try {
          const processResponse = await fetch('/api/shopify/callback/process', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              shop,
              connectionId
            }),
          })

          const processData = await processResponse.json()
          
          if (!processResponse.ok) {
            console.error('Callback processing failed:', processData)
            setDebugInfo(prev => prev + `Processing error: ${processData.error}\nDetails: ${processData.details || 'No details provided'}\n`)
            setStatus('error')
            setMessage(`Error: ${processData.error}`)
            
            // Redirect after a delay
            setTimeout(() => {
              router.push(`/settings?error=${processData.error.replace(/\s+/g, '_').toLowerCase()}&details=${encodeURIComponent(processData.details || '')}`)
            }, 2000)
            return
          }

          setDebugInfo(prev => prev + `Callback processed successfully: ${processData.message}\n`)
          
          // Set success status
          setStatus('success')
          setMessage('Shopify store connected successfully!')
          
          // Store connection data in localStorage
          try {
            localStorage.setItem('shopifyConnectionComplete', 'true')
            localStorage.setItem('shopifyConnectionTimestamp', Date.now().toString())
          } catch (e) {
            console.error('Failed to store data in localStorage:', e)
          }
          
          // Redirect after a delay
          setTimeout(() => {
            router.push(`/settings?success=true&connectionId=${connectionId}`)
          }, 2000)
          
        } catch (error) {
          console.error('Error processing callback:', error)
          setDebugInfo(prev => prev + `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
          setStatus('error')
          setMessage('Error processing callback')
          
          // Redirect after a delay
          setTimeout(() => {
            router.push('/settings?error=callback_failed')
          }, 2000)
        }
      } catch (error) {
        console.error('Unhandled error in callback:', error)
        setDebugInfo(prev => prev + `Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
        setStatus('error')
        setMessage('An unexpected error occurred')
        
        // Redirect after a delay
        setTimeout(() => {
          router.push('/settings?error=unhandled_error')
        }, 2000)
      }
    }

    processCallback()
  }, [searchParams, router])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <div className={`text-2xl font-bold mb-4 ${status === 'error' ? 'text-red-500' : status === 'success' ? 'text-green-500' : 'text-blue-500'}`}>
        {message}
      </div>
      
      {status === 'processing' && (
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      )}
      
      <div className="text-gray-400 mb-8">
        {status === 'processing' 
          ? 'Please wait while we complete your Shopify connection...' 
          : status === 'success'
            ? 'Redirecting you to the dashboard...'
            : 'Redirecting you back to settings...'}
      </div>
      
      <div className="w-full max-w-2xl bg-gray-900 rounded-lg p-4 mt-8">
        <div className="text-sm font-mono text-gray-400 whitespace-pre-wrap">
          {debugInfo}
        </div>
      </div>
    </div>
  )
} 