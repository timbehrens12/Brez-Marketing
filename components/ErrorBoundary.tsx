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
        <div className="w-full min-h-screen bg-[#0A0A0A] flex items-center justify-center relative overflow-hidden">
          {/* Background pattern - same as all other pages */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '20px 20px'
            }}></div>
          </div>

          <div className="relative z-10 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333] rounded-2xl p-8 max-w-lg shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-red-500/20 to-red-600/30 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden border border-red-500/20">
                <div className="absolute inset-0 bg-red-400/10 rounded-2xl animate-pulse"></div>
                <div className="relative z-10">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h1>
              <p className="text-[#9ca3af] text-base">We encountered an unexpected error while loading your dashboard</p>
            </div>

            {/* Error Description */}
            <div className="bg-[#0f0f0f] border border-[#333] rounded-xl p-4 mb-6">
              <p className="text-gray-300 text-sm leading-relaxed">
                This is usually a temporary issue related to data loading or component initialization.
                Don't worry - your data is safe and you can try again.
              </p>
            </div>

            {/* Specific Error Handling */}
            {this.state.error?.message.includes('310') && (
              <div className="bg-orange-950/20 border border-orange-700/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <p className="text-orange-200 font-medium text-sm">React Error #310 Detected</p>
                </div>
                <p className="text-orange-300/80 text-xs">
                  This is typically caused by useEffect dependency issues or multiple Supabase client instances.
                  A retry should resolve this automatically.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                onClick={this.handleRetry}
                className="flex-1 bg-[#2A2A2A] hover:bg-[#333] text-white font-medium h-12 rounded-xl shadow-lg border border-[#444] transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex-1 border-[#333] bg-[#1a1a1a] text-[#9ca3af] hover:bg-[#333] hover:text-white h-12 rounded-xl transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Page
              </Button>
            </div>

            {/* Help Section */}
            <div className="bg-[#0f0f0f] border border-[#333] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <p className="text-green-300 font-medium text-sm">Need Help?</p>
              </div>
              <p className="text-[#9ca3af] text-xs">
                If this problem persists, try clearing your browser cache or contact our support team.
              </p>
            </div>

            {/* Dev Error Details */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-xs text-[#9ca3af] cursor-pointer hover:text-gray-300 transition-colors">
                  🔧 Error Details (Development Only)
                </summary>
                <div className="mt-3 bg-[#0f0f0f] border border-[#333] rounded-lg p-3">
                  <div className="text-xs text-[#9ca3af] font-mono space-y-1">
                    <div><strong>ID:</strong> {this.state.errorId}</div>
                    <div><strong>Message:</strong> {this.state.error?.message}</div>
                    {this.state.error?.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <div className="mt-1 bg-[#1a1a1a] border border-[#333] p-2 rounded text-xs overflow-auto max-h-20">
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

