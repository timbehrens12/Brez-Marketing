'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function MetaCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Processing connection...')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('Establishing connection')

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

        setStatus('Syncing your Meta advertising data...')
        setCurrentStep('Connecting to Meta Business API')
        setProgress(10)
        
        // Redirect to the proper callback route which handles everything
        window.location.href = `/api/auth/meta/callback?code=${code}&state=${state}`
        
      } catch (error) {
        console.error('Callback error:', error)
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setTimeout(() => router.push('/settings?error=exchange_failed'), 2000)
      }
    }

    // Simulate progress while redirecting
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev < 20) {
          return prev + 2
        }
        return prev
      })
    }, 200)

    handleCallback()
    
    return () => clearInterval(progressTimer)
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main Card */}
        <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-8 text-center">
          
          {/* Logo/Icon Section */}
          <div className="mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Syncing Meta Data</h1>
            <p className="text-gray-400 text-sm">Importing 90 days of advertising data - this may take 5-10 minutes</p>
          </div>

          {/* Status Section */}
          <div className="mb-8">
            {status.includes('Processing') || status.includes('Syncing') && (
              <div className="space-y-6">
                {/* Animated Spinner */}
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{width: `${progress}%`}}
                  ></div>
                </div>
                
                {/* Current Step */}
                <p className="text-sm text-blue-400 text-center">{currentStep}</p>
              </div>
            )}
            
            {status.includes('Success') && (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
            
            {status.includes('Error') && (
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
              status.includes('Error') ? 'text-red-400' : 
              status.includes('Success') ? 'text-green-400' : 
              'text-white'
            }`}>
              {status}
            </p>
            <p className="text-gray-400 text-sm">
              {status.includes('Processing') 
                ? 'Please wait while we complete your Meta account connection...' 
                : status.includes('Success')
                  ? 'Redirecting you to the dashboard...'
                  : 'Redirecting you back to settings...'}
            </p>
          </div>

          {/* Connection Steps */}
          {status.includes('Processing') && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-gray-300">Verifying permissions</span>
                <div className="w-4 h-4 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <span className="text-sm text-gray-300">Exchanging access token</span>
                <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
                <span className="text-sm text-gray-500">Finalizing setup</span>
                <div className="w-4 h-4 bg-gray-600 rounded-full"></div>
              </div>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-blue-300 font-medium mb-1">Initial Data Sync</p>
                <p className="text-xs text-blue-400/80 leading-relaxed">
                  We're importing 90 days of campaign data, performance metrics, and audience insights. 
                  This ensures your dashboard is ready with comprehensive analytics from day one.
                </p>
              </div>
            </div>
          </div>

          {/* Powered by */}
          <div className="flex items-center justify-center space-x-2 text-gray-500 text-xs">
            <span>Powered by</span>
            <span className="font-semibold text-green-400">Brez Marketing</span>
          </div>
        </div>
      </div>
    </div>
  )
} 