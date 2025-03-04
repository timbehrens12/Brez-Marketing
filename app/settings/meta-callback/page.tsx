'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function MetaCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Processing...')

  useEffect(() => {
    async function handleCallback() {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        if (!code || !state) {
          setStatus('Error: Missing parameters')
          setTimeout(() => router.push('/settings?error=missing_params'), 2000)
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
          const error = await response.text()
          throw new Error(error || 'Failed to exchange token')
        }

        const result = await response.json()
        
        if (result.success) {
          setStatus('Success! Redirecting...')
          setTimeout(() => router.push('/settings?success=true'), 1000)
        } else {
          throw new Error(result.error || 'Unknown error')
        }
      } catch (error) {
        console.error('Callback error:', error)
        setStatus(`Error: ${error.message}`)
        setTimeout(() => router.push('/settings?error=exchange_failed'), 2000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-bold mb-4">Connecting Meta Account</h1>
      <p className="text-gray-600 mb-8">{status}</p>
    </div>
  )
} 