'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global Error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-red-500/5 animate-pulse"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.05),rgba(0,0,0,0.8))]"></div>

          <div className="relative z-10 bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 max-w-lg shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl flex items-center justify-center shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-red-400/30 rounded-3xl animate-ping"></div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center relative z-10">
                  <span className="text-red-600 text-xl font-bold">🚨</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Oops! Page Error</h1>
              <p className="text-slate-400 text-lg">Something unexpected happened</p>
            </div>

            {/* Error Description */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mb-6">
              <p className="text-slate-300 text-sm leading-relaxed">
                We encountered an error while loading this page. This could be due to a temporary issue
                with our servers or an unexpected error in the application.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => reset()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-12 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </Button>

              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white h-12 rounded-xl transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go Home
              </Button>

              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white h-12 rounded-xl transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Page
              </Button>
            </div>

            {/* Help Section */}
            <div className="mt-6 bg-slate-900/30 border border-slate-700/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <p className="text-green-300 font-medium text-sm">Need Help?</p>
              </div>
              <p className="text-slate-400 text-xs">
                If this error continues, please contact our support team or try again later.
                Your data and settings are safe.
              </p>
            </div>

            {/* Error Details (Dev Only) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                  🔧 Error Details (Development Only)
                </summary>
                <div className="mt-3 bg-slate-950/50 border border-slate-800/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 font-mono space-y-1">
                    <div><strong>Message:</strong> {error.message}</div>
                    <div><strong>Digest:</strong> {error.digest}</div>
                    {error.stack && (
                      <div>
                        <strong>Stack:</strong>
                        <div className="mt-1 bg-slate-900/50 p-2 rounded text-xs overflow-auto max-h-20">
                          {error.stack.slice(0, 300)}...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
