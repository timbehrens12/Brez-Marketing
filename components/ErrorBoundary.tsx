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
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-red-500/5 animate-pulse"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.05),rgba(0,0,0,0.8))]"></div>

          <div className="relative z-10 bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 max-w-lg shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-red-400/30 rounded-2xl animate-ping"></div>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center relative z-10">
                  <span className="text-red-600 text-lg font-bold">⚠️</span>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h1>
              <p className="text-slate-400 text-base">We encountered an unexpected error while loading your dashboard</p>
            </div>

            {/* Error Description */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mb-6">
              <p className="text-slate-300 text-sm leading-relaxed">
                This is usually a temporary issue related to data loading or component initialization.
                Don't worry - your data is safe and you can try again.
              </p>
            </div>

            {/* Specific Error Handling */}
            {this.state.error?.message.includes('310') && (
              <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                  <p className="text-amber-200 font-medium text-sm">React Error #310 Detected</p>
                </div>
                <p className="text-amber-300/80 text-xs">
                  This is typically caused by useEffect dependency issues or multiple Supabase client instances.
                  A retry should resolve this automatically.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                onClick={this.handleRetry}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium h-12 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex-1 border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white h-12 rounded-xl transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Page
              </Button>
            </div>

            {/* Help Section */}
            <div className="bg-slate-900/30 border border-slate-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <p className="text-green-300 font-medium text-sm">Need Help?</p>
              </div>
              <p className="text-slate-400 text-xs">
                If this problem persists, try clearing your browser cache or contact our support team.
              </p>
            </div>

            {/* Dev Error Details */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                  🔧 Error Details (Development Only)
                </summary>
                <div className="mt-3 bg-slate-950/50 border border-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 font-mono space-y-1">
                    <div><strong>ID:</strong> {this.state.errorId}</div>
                    <div><strong>Message:</strong> {this.state.error?.message}</div>
                    {this.state.error?.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <div className="mt-1 bg-slate-900/50 p-2 rounded text-xs overflow-auto max-h-20">
                          {this.state.error.stack.slice(0, 300)}...
                        </div>
                      </div>
                    )}
                  </div>
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

