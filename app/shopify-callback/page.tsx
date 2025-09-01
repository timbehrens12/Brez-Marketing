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
            
            // Trigger immediate inventory refresh
            // This will ensure inventory data is loaded right after reconnection
            setTimeout(() => {
              console.log('Triggering inventory refresh after Shopify connection')
              window.dispatchEvent(new CustomEvent('refreshInventory', { 
                detail: { brandId } 
              }))
            }, 1000)
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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-8 text-center">
          
          {/* Logo/Icon Section */}
          <div className="mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-600/20 to-green-700/30 border border-green-600/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.8 4.4c-.7-.4-1.2-.4-1.4-.4s-.3-.2-.4-.5c-.4-.7-1.1-1.2-1.9-1.2s-1.5.5-1.9 1.2c-.1.3-.2.5-.4.5s-.7 0-1.4.4c-.6.4-1.4 1.1-1.4 2.1 0 .3.1.6.2.9l1.8 11.2c.1.7.7 1.3 1.4 1.3h6.8c.7 0 1.3-.6 1.4-1.3l1.8-11.2c.1-.3.2-.6.2-.9 0-1-.8-1.7-1.4-2.1zM12 3.5c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5zm0 3c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Connecting Shopify</h1>
            <p className="text-gray-400 text-sm">Setting up your store integration</p>
          </div>

          {/* Status Section */}
          <div className="mb-8">
            {status === 'processing' && (
              <div className="space-y-6">
                {/* Animated Dots */}
                <div className="flex justify-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
                </div>
              </div>
            )}
            
            {status === 'success' && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="mb-6">
            <p className={`text-lg font-medium mb-2 ${
              status === 'error' ? 'text-red-400' : 
              status === 'success' ? 'text-green-400' : 
              'text-white'
            }`}>
              {message}
            </p>
            <p className="text-gray-400 text-sm">
              {status === 'processing' 
                ? 'Please wait while we complete your Shopify connection...' 
                : status === 'success'
                  ? 'Redirecting you to the dashboard...'
                  : 'Redirecting you back to settings...'}
            </p>
          </div>

          {/* Powered by */}
          <div className="flex items-center justify-center space-x-2 text-gray-500 text-xs">
            <span>Powered by</span>
            <span className="font-semibold text-green-400">Brez Marketing</span>
          </div>
        </div>

        {/* Debug Info (only show in development or if error) */}
        {(debugInfo && (status === 'error' || process.env.NODE_ENV === 'development')) && (
          <div className="mt-6 bg-gray-900/50 backdrop-blur border border-gray-700 rounded-xl p-4">
            <details className="cursor-pointer">
              <summary className="text-gray-400 text-sm font-medium mb-2">Debug Information</summary>
              <div className="text-xs font-mono text-gray-500 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {debugInfo}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  )
} 