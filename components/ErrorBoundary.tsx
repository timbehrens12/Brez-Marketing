"use client"

import React from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  errorId: string
}

export class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { 
    hasError: false,
      errorId: Math.random().toString(36).substr(2, 9)
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    console.error('🚨 Error Boundary - getDerivedStateFromError:', error)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Dashboard Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    })

    // Log specific React error #310 details
    if (error.message.includes('310') || error.message.includes('useEffect')) {
      console.error('🔥 REACT ERROR #310 DETECTED:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        possibleCause: 'useEffect dependency or cleanup issue',
        supabaseClients: {
          multipleInstancesWarning: 'Check for Multiple GoTrueClient instances',
          currentClients: Object.keys(window).filter(key => key.includes('supabase') || key.includes('gotrue'))
        }
      })
    }

    this.setState({ error, errorInfo })
  }

  handleRetry = () => {
    console.log('🔄 Retrying dashboard - resetting error boundary')
    
    // Clear any problematic state
        if (typeof window !== 'undefined') {
      // Clear Meta-related flags
      window._blockMetaApiCalls = false
      window._disableAutoMetaFetch = false
      window._metaTabSwitchInProgress = false
      window._metaFetchLock = false
          
          // Clear any timeouts
      if (window._metaTimeouts) {
        window._metaTimeouts.forEach(timeout => clearTimeout(timeout))
        window._metaTimeouts = []
      }
    }
    
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: Math.random().toString(36).substr(2, 9)
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-6 max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <h2 className="text-lg font-semibold text-red-300">Dashboard Error</h2>
            </div>
            
            <p className="text-red-200 text-sm mb-4">
              Something went wrong loading the dashboard. This is usually a temporary issue 
              related to data loading or component initialization.
            </p>
            
            {this.state.error?.message.includes('310') && (
              <div className="bg-yellow-950/30 border border-yellow-900/50 rounded p-3 mb-4">
                <p className="text-yellow-200 text-xs">
                  <strong>React Error #310 detected:</strong> This is typically caused by 
                  useEffect dependency issues or multiple Supabase client instances.
                  </p>
                </div>
              )}
              
            <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry}
                className="bg-red-600 hover:bg-red-700"
                >
                Retry Dashboard
                </Button>
                
                <Button 
                onClick={() => window.location.reload()}
                  variant="outline"
                className="border-red-700 text-red-300 hover:bg-red-950"
                >
                  Refresh Page
                </Button>
              </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-xs text-gray-400 cursor-pointer">
                  Error Details (Dev Only)
                  </summary>
                <div className="mt-2 text-xs text-gray-300 font-mono bg-gray-900 p-2 rounded overflow-auto max-h-32">
                  <div>Error ID: {this.state.errorId}</div>
                  <div>Message: {this.state.error?.message}</div>
                  <div>Stack: {this.state.error?.stack?.slice(0, 200)}...</div>
                </div>
                </details>
              )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

