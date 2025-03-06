"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ShopifyAuthRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'preparing' | 'redirecting' | 'error'>('preparing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const prepareAuth = async () => {
      try {
        // Get all the params
        const brandId = searchParams.get('brandId')
        const connectionId = searchParams.get('connectionId')
        const shop = searchParams.get('shop')
        
        if (!brandId || !connectionId || !shop) {
          setStatus('error')
          setErrorMessage('Missing required parameters')
          return
        }
        
        console.log('Preparing Shopify auth with params:', { 
          brandId, 
          connectionId,
          shop
        })
        
        // Clear any Shopify-related cookies and localStorage
        try {
          // Clear localStorage items
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes('shopify') || key.includes('Shopify'))) {
              localStorage.removeItem(key)
              console.log('Removed localStorage item:', key)
            }
          }
          
          // Clear sessionStorage items
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && (key.includes('shopify') || key.includes('Shopify'))) {
              sessionStorage.removeItem(key)
              console.log('Removed sessionStorage item:', key)
            }
          }
          
          // Try to clear cookies for the Shopify domain
          const cookies = document.cookie.split(";")
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i]
            const eqPos = cookie.indexOf("=")
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
            
            // Try to delete the cookie with various domain options
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;"
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + shop
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + shop
          }
          
          console.log('Cleared cookies and storage')
        } catch (e) {
          console.error('Error clearing cookies and storage:', e)
          // Continue anyway
        }
        
        // Generate a unique nonce for this connection attempt
        const nonce = Math.random().toString(36).substring(2, 15)
        
        // Create state with nonce and timestamp to prevent caching
        const stateObj = {
          brandId,
          connectionId,
          nonce,
          timestamp: Date.now()
        }
        
        // Get the host for the callback URL
        const host = window.location.host
        const protocol = window.location.protocol
        
        // Build the callback URL - this must match what's registered with Shopify
        // Use the API route for the callback as that's likely what's registered
        const callbackUrl = `${protocol}//${host}/api/shopify/callback`
        
        console.log('Using callback URL:', callbackUrl)
        
        // Use a more limited set of scopes to reduce permission requirements
        const scopes = [
          'read_products',
          'read_orders',
          'read_customers',
          'read_inventory'
        ].join(',')
        
        // Construct auth URL with explicit parameters
        const authUrl = new URL(`https://${shop}/admin/oauth/authorize`)
        
        // Use the correct client ID - hardcoded for testing
        // This should match the client ID registered with Shopify
        const clientId = 'cf8e763ebf00bb4be4319e5bfa7ceb47' // This is from your URL
        authUrl.searchParams.set('client_id', clientId)
        
        authUrl.searchParams.set('scope', scopes)
        authUrl.searchParams.set('redirect_uri', callbackUrl)
        authUrl.searchParams.set('state', JSON.stringify(stateObj))
        
        // Add auth_mode=per_user_oauth to force re-authentication
        authUrl.searchParams.set('auth_mode', 'per_user_oauth')
        
        // Add a grant_options parameter to force the consent screen
        authUrl.searchParams.set('grant_options[]', 'per_user')
        
        // Add a cache-busting parameter to prevent browser caching
        authUrl.searchParams.set('_', Date.now().toString())
        
        console.log('Auth URL:', authUrl.toString())
        
        // Update status
        setStatus('redirecting')
        
        // Redirect to Shopify auth URL
        window.location.href = authUrl.toString()
      } catch (error) {
        console.error('Error preparing auth:', error)
        setStatus('error')
        setErrorMessage('Error preparing authentication')
      }
    }
    
    prepareAuth()
  }, [searchParams, router])
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
      <div className="text-2xl font-bold mb-4">
        {status === 'preparing' && 'Preparing Shopify Authentication...'}
        {status === 'redirecting' && 'Redirecting to Shopify...'}
        {status === 'error' && 'Authentication Error'}
      </div>
      
      {(status === 'preparing' || status === 'redirecting') && (
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      )}
      
      {status === 'error' && (
        <div className="text-red-500 mb-4">{errorMessage}</div>
      )}
      
      <div className="text-gray-400 mb-8">
        {status === 'preparing' && 'Please wait while we prepare your Shopify connection...'}
        {status === 'redirecting' && 'You will be redirected to Shopify to authorize access...'}
        {status === 'error' && 'There was an error preparing your Shopify authentication.'}
      </div>
      
      {status === 'error' && (
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => router.push('/settings')}
        >
          Return to Settings
        </button>
      )}
    </div>
  )
} 