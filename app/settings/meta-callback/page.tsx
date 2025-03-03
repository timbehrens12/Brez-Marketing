'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function MetaCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Processing...')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function handleCallback() {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        if (!code || !state) {
          setError('Missing parameters')
          return
        }

        setStatus('Exchanging code for token...')
        
        // Exchange code for token
        const response = await fetch('/api/auth/meta/exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        })

        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(errorData || 'Failed to exchange token')
        }

        const result = await response.json()
        
        if (result.success) {
          setStatus('Connected successfully!')
          setSuccess(true)
          
          // If this is a popup window, close it after a delay
          if (window.opener) {
            setTimeout(() => {
              window.close()
            }, 2000)
          } else {
            // Otherwise redirect
            setTimeout(() => router.push('/settings?success=true'), 2000)
          }
        } else {
          throw new Error(result.error || 'Unknown error')
        }
      } catch (error: any) {
        console.error('Callback error:', error)
        setError(error.message || 'Connection failed')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#1A1A1A] text-white">
      <div className="w-full max-w-md p-8 rounded-xl bg-[#2A2A2A] border border-[#333] shadow-xl">
        <h1 className="text-2xl font-bold mb-4 text-center">
          {error ? 'Connection Failed' : success ? 'Connection Successful!' : 'Connecting Meta Account'}
        </h1>
        
        {!error && !success && (
          <div className="flex justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {success && (
          <div className="flex justify-center mb-6 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center mb-6 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        
        <p className="text-center mb-6">
          {error ? error : status}
        </p>
        
        {error && (
          <div className="flex justify-center">
            <button 
              onClick={() => window.close()}
              className="px-4 py-2 bg-[#333] hover:bg-[#444] rounded text-white transition-colors"
            >
              Close
            </button>
          </div>
        )}
        
        {window.opener && (
          <p className="text-xs text-center text-gray-400 mt-4">
            This window will close automatically.
          </p>
        )}
      </div>
    </div>
  )
} 