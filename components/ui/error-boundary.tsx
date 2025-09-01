"use client"

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './button'
import { AlertCircle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    })

    // Log the error
    console.error('Error caught by error boundary:', error, errorInfo)
    
    // Call the onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })

    // Call the onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Use the fallback component if provided
      if (fallback) {
        return fallback
      }

      // Default error UI
      return (
        <div className="p-6 border border-red-800 bg-red-900/10 rounded-lg text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-4 text-red-400">Something went wrong</h2>
          <p className="mb-6">There was an error in this component. This could be due to a temporary issue.</p>
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mb-4 text-left p-3 bg-black/30 rounded text-xs overflow-auto max-h-32 text-red-300">
              <p className="font-semibold">{error.toString()}</p>
              {errorInfo && (
                <p className="mt-2 font-mono">{errorInfo.componentStack}</p>
              )}
            </div>
          )}
          <div className="flex justify-center">
            <Button 
              onClick={this.handleReset}
              variant="destructive"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="ml-3"
            >
              Reload Page
            </Button>
          </div>
        </div>
      )
    }

    return children
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
} 