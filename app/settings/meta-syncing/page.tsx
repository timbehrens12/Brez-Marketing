'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Loader2, CheckCircle, Clock, Database, TrendingUp } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SyncStep {
  id: string
  name: string
  description: string
  completed: boolean
  inProgress: boolean
}

export default function MetaSyncing() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const brandId = searchParams.get('brandId')
  
  const [syncStatus, setSyncStatus] = useState<'in_progress' | 'completed' | 'failed' | 'pending'>('pending')
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedTime] = useState(120) // 2 minutes estimated
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([
    { id: 'connection', name: 'Establishing Connection', description: 'Connecting to Meta Business API', completed: false, inProgress: false },
    { id: 'accounts', name: 'Fetching Ad Accounts', description: 'Discovering your advertising accounts', completed: false, inProgress: false },
    { id: 'campaigns', name: 'Syncing Campaigns', description: 'Importing campaign data and settings', completed: false, inProgress: false },
    { id: 'insights', name: 'Historical Data (90 days)', description: 'Downloading performance metrics and analytics', completed: false, inProgress: false },
    { id: 'demographics', name: 'Audience Data', description: 'Processing demographic insights', completed: false, inProgress: false },
    { id: 'finalizing', name: 'Finalizing Setup', description: 'Preparing your dashboard', completed: false, inProgress: false }
  ])

  // Check sync status periodically
  useEffect(() => {
    if (!brandId) {
      router.push('/settings?error=missing_brand')
      return
    }

    let interval: NodeJS.Timeout

    const checkSyncStatus = async () => {
      try {
        const { data: connection } = await supabase
          .from('platform_connections')
          .select('sync_status, last_synced_at')
          .eq('brand_id', brandId)
          .eq('platform_type', 'meta')
          .single()

        if (connection) {
          setSyncStatus(connection.sync_status || 'pending')
          
          if (connection.sync_status === 'completed') {
            // Mark all steps as completed
            setSyncSteps(steps => steps.map(step => ({ ...step, completed: true, inProgress: false })))
            setProgress(100)
            
            // Redirect to settings after a brief delay
            setTimeout(() => {
              router.push('/settings?success=meta_connected&data_synced=true')
            }, 2000)
          } else if (connection.sync_status === 'failed') {
            router.push('/settings?error=sync_failed')
          }
        }
      } catch (error) {
        console.error('Error checking sync status:', error)
      }
    }

    // Start checking immediately and then every 3 seconds
    checkSyncStatus()
    interval = setInterval(checkSyncStatus, 3000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [brandId, router])

  // Timer and progress simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Simulate progress and step updates
  useEffect(() => {
    if (syncStatus === 'in_progress' || syncStatus === 'pending') {
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = Math.min(prev + Math.random() * 3, 95) // Cap at 95% until actually complete
          
          // Update steps based on progress
          setSyncSteps(steps => {
            const updatedSteps = [...steps]
            
            if (newProgress > 10) {
              updatedSteps[0] = { ...updatedSteps[0], completed: true, inProgress: false }
            }
            if (newProgress > 25) {
              updatedSteps[1] = { ...updatedSteps[1], completed: true, inProgress: false }
            }
            if (newProgress > 40) {
              updatedSteps[2] = { ...updatedSteps[2], completed: true, inProgress: false }
            }
            if (newProgress > 65) {
              updatedSteps[3] = { ...updatedSteps[3], completed: true, inProgress: false }
            }
            if (newProgress > 80) {
              updatedSteps[4] = { ...updatedSteps[4], completed: true, inProgress: false }
            }
            if (newProgress > 90) {
              updatedSteps[5] = { ...updatedSteps[5], completed: true, inProgress: false }
            }
            
            // Set current step as in progress
            const nextIncompleteIndex = updatedSteps.findIndex(step => !step.completed)
            if (nextIncompleteIndex !== -1) {
              updatedSteps[nextIncompleteIndex] = { ...updatedSteps[nextIncompleteIndex], inProgress: true }
            }
            
            return updatedSteps
          })
          
          return newProgress
        })
      }, 2000 + Math.random() * 1000) // Vary timing to feel more realistic

      return () => clearInterval(progressInterval)
    }
  }, [syncStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Main Card */}
        <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-8">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Syncing Meta Data</h1>
            <p className="text-gray-400 text-sm">Importing 90 days of advertising data</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">Progress</span>
              <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Time Info */}
            <div className="flex justify-between text-xs text-gray-500">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Elapsed: {formatTime(elapsedTime)}
              </span>
              <span>Est. Total: {formatTime(estimatedTime)}</span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-8">
            {syncSteps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : step.inProgress ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.completed ? 'text-green-400' : step.inProgress ? 'text-blue-400' : 'text-gray-500'}`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Info Message */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Database className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-300 font-medium mb-1">Initial Data Sync</p>
                <p className="text-xs text-blue-400/80 leading-relaxed">
                  We're importing 90 days of campaign data, performance metrics, and audience insights. 
                  This ensures your dashboard is ready with comprehensive analytics from day one.
                </p>
              </div>
            </div>
          </div>

          {/* Warning - Don't close */}
          <div className="mt-4 text-center">
            <p className="text-xs text-amber-400/80">
              ⚠️ Please keep this page open during the sync process
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
