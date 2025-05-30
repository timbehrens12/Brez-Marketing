"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/error-boundary'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [resetKey, setResetKey] = useState(0)

  // Custom fallback UI specifically for dashboard errors
  const DashboardErrorFallback = (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="max-w-md p-6 border border-red-800 bg-red-900/10 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-4 text-red-400">Dashboard Error</h2>
        <p className="mb-6">We encountered an error while loading your dashboard. This could be due to temporary issues with data processing.</p>
        <div className="flex justify-center space-x-4">
          <Button 
            onClick={() => {
              // Reset the error boundary and force a re-render
              setResetKey(prev => prev + 1)
            }}
            variant="destructive"
          >
            Retry Dashboard
          </Button>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Reload Page
          </Button>
          <Button 
            onClick={() => {
              window.location.href = "/"
            }}
            variant="outline"
          >
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-8">
      <ErrorBoundary 
        key={resetKey} 
        fallback={DashboardErrorFallback}
        onError={(error) => {
          // You could send this error to your analytics or error tracking service
          console.error("Dashboard error caught:", error)
        }}
      >
        {children}
      </ErrorBoundary>
    </div>
  )
} 