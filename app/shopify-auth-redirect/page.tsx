"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ShopifyAuthRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'preparing' | 'redirecting' | 'error'>('preparing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [shop, setShop] = useState<string>('')
  const [authUrl, setAuthUrl] = useState<string>('')
  const [showManualButton, setShowManualButton] = useState<boolean>(false)

  useEffect(() => {
    const prepareAuth = async () => {
      try {
        // Get all the params
        const brandId = searchParams.get('brandId')
        const connectionId = searchParams.get('connectionId')
        const shopParam = searchParams.get('shop')
        
        if (!brandId || !connectionId || !shopParam) {
          setStatus('error')
          setErrorMessage('Missing required parameters')
          return
        }
        
        setShop(shopParam)
        
        console.log('Preparing Shopify auth with params:', { 
          brandId, 
          connectionId,
          shop: shopParam
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
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + shopParam
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + shopParam
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
        
        // First, try to log out of Shopify
        const logoutUrl = `https://${shopParam}/admin/auth/logout`
        
        // Construct auth URL with explicit parameters
        const shopifyAuthUrl = new URL(`https://${shopParam}/admin/oauth/authorize`)
        
        // Use the correct client ID - hardcoded for testing
        // This should match the client ID registered with Shopify
        const clientId = 'cf8e763ebf00bb4be4319e5bfa7ceb47' // This is from your URL
        shopifyAuthUrl.searchParams.set('client_id', clientId)
        
        shopifyAuthUrl.searchParams.set('scope', scopes)
        shopifyAuthUrl.searchParams.set('redirect_uri', callbackUrl)
        shopifyAuthUrl.searchParams.set('state', JSON.stringify(stateObj))
        
        // Add auth_mode=per_user_oauth to force re-authentication
        shopifyAuthUrl.searchParams.set('auth_mode', 'per_user_oauth')
        
        // Add a grant_options parameter to force the consent screen
        shopifyAuthUrl.searchParams.set('grant_options[]', 'per_user')
        
        // Add a cache-busting parameter to prevent browser caching
        shopifyAuthUrl.searchParams.set('_', Date.now().toString())
        
        console.log('Auth URL:', shopifyAuthUrl.toString())
        
        // Store the auth URL for the manual button
        setAuthUrl(shopifyAuthUrl.toString())
        
        // Update status
        setStatus('redirecting')
        
        // First, try to log out of Shopify in a hidden iframe
        const iframe = document.createElement('iframe')
        iframe.style.display = 'none'
        iframe.src = logoutUrl
        document.body.appendChild(iframe)
        
        // Wait a moment for the logout to complete
        setTimeout(() => {
          // Remove the iframe
          document.body.removeChild(iframe)
          
          // Open the auth URL in a popup window
          const authWindow = window.open(shopifyAuthUrl.toString(), 'shopifyAuth', 'width=800,height=600')
          
          if (!authWindow) {
            console.error('Popup blocked')
            setErrorMessage('Popup blocked. Please allow popups for this site.')
            setShowManualButton(true)
          } else {
            // Check if the popup was closed without completing auth
            const checkPopupInterval = setInterval(() => {
              if (authWindow.closed) {
                clearInterval(checkPopupInterval)
                setShowManualButton(true)
              }
            }, 1000)
          }
        }, 1000)
      } catch (error) {
        console.error('Error preparing auth:', error)
        setStatus('error')
        setErrorMessage('Error preparing authentication')
      }
    }
    
    prepareAuth()
  }, [searchParams, router])
  
  const handleManualAuth = () => {
    window.open(authUrl, '_blank')
  }
  
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
        {status === 'redirecting' && 'A popup window should open for Shopify authentication. Please check if it was blocked.'}
        {status === 'error' && 'There was an error preparing your Shopify authentication.'}
      </div>
      
      {showManualButton && (
        <div className="flex flex-col items-center mt-4">
          <p className="text-yellow-400 mb-4">If the popup didn't open or was closed, click the button below:</p>
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleManualAuth}
          >
            Authenticate with Shopify
          </button>
        </div>
      )}
      
      {status === 'redirecting' && (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg max-w-md">
          <p className="text-yellow-400 mb-2">Important:</p>
          <p className="text-gray-300">
            You <strong>must</strong> log out of Shopify and log in again to properly authenticate.
            If you're automatically connected without seeing a login page, please:
          </p>
          <ol className="list-decimal pl-5 mt-2 text-gray-300">
            <li>Go to <a href={`https://${shop}/admin/auth/logout`} target="_blank" className="text-blue-400 underline">Shopify Logout</a></li>
            <li>Then click the button below to try again</li>
          </ol>
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-4"
            onClick={handleManualAuth}
          >
            Authenticate with Shopify
          </button>
        </div>
      )}
      
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