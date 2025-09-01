'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface MetaConnectionStatusProps {
  brandId: string;
  className?: string;
}

export function MetaConnectionStatus({ brandId, className = '' }: MetaConnectionStatusProps) {
  const [connectionStatus, setConnectionStatus] = useState<{
    isExpired: boolean;
    isChecking: boolean;
    lastError: string | null;
  }>({
    isExpired: false,
    isChecking: true,
    lastError: null
  });

  // Check Meta connection status
  const checkConnectionStatus = async () => {
    if (!brandId) return;

    setConnectionStatus(prev => ({ ...prev, isChecking: true }));

    try {
      // Test Meta connection with a simple API call
      const response = await fetch(`/api/meta/test?brandId=${brandId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        // Check if this is a token expiration error
        const isTokenError = 
          data.error?.includes('token has expired') ||
          data.error?.includes('token is invalid') ||
          data.error?.includes('OAuthException') ||
          data.details?.error?.code === 190;

        setConnectionStatus({
          isExpired: isTokenError,
          isChecking: false,
          lastError: data.error || 'Connection test failed'
        });
      } else {
        setConnectionStatus({
          isExpired: false,
          isChecking: false,
          lastError: null
        });
      }
    } catch (error) {
      console.error('Error checking Meta connection:', error);
      setConnectionStatus({
        isExpired: false,
        isChecking: false,
        lastError: 'Failed to check connection status'
      });
    }
  };

  // Check status on mount and set up periodic checks
  useEffect(() => {
    checkConnectionStatus();

    // Check every 5 minutes
    const interval = setInterval(checkConnectionStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [brandId]);

  // Listen for global Meta API errors from other components
  useEffect(() => {
    const handleMetaError = (event: CustomEvent) => {
      const { error } = event.detail;
      
      const isTokenError = 
        error?.includes('token has expired') ||
        error?.includes('token is invalid') ||
        error?.includes('OAuthException') ||
        error?.code === 190;

      if (isTokenError) {
        setConnectionStatus(prev => ({
          ...prev,
          isExpired: true,
          lastError: error
        }));
      }
    };

    window.addEventListener('meta-api-error', handleMetaError as EventListener);
    return () => window.removeEventListener('meta-api-error', handleMetaError as EventListener);
  }, []);

  // Don't show anything if still checking or no issues
  if (connectionStatus.isChecking || (!connectionStatus.isExpired && !connectionStatus.lastError)) {
    return null;
  }

  if (connectionStatus.isExpired) {
    return (
      <div className={`mb-6 ${className}`}>
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-red-200 font-medium mb-2">
                Meta Connection Expired
              </p>
              <p className="text-red-300 text-sm">
                Your Meta (Facebook/Instagram) connection has expired. Advertising data cannot be displayed until you reconnect.
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                onClick={checkConnectionStatus}
                variant="outline"
                size="sm"
                className="border-red-500/30 text-red-300 hover:bg-red-500/20"
                disabled={connectionStatus.isChecking}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${connectionStatus.isChecking ? 'animate-spin' : ''}`} />
                Recheck
              </Button>
              <Link href="/settings">
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Reconnect Meta
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}

// Utility function for other components to emit Meta API errors
export function emitMetaApiError(error: any) {
  const event = new CustomEvent('meta-api-error', {
    detail: { error }
  });
  window.dispatchEvent(event);
} 