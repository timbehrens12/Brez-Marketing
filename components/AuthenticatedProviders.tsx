"use client"

import { useAuth } from '@clerk/nextjs'
import { BrandProvider } from '@/lib/context/BrandContext'
import { AgencyProvider } from '@/contexts/AgencyContext'
import { MetricsProvider } from '@/lib/contexts/MetricsContext'

import { WidgetProvider } from '@/context/WidgetContext'
import { AuthProvider } from '@/contexts/AuthContext'

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  // The provider tree MUST be static and not change between renders.
  // The internal components can handle their own loading states.
  return (
    <AgencyProvider>
      <BrandProvider>
        <MetricsProvider>
          <WidgetProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </WidgetProvider>
        </MetricsProvider>
      </BrandProvider>
    </AgencyProvider>
  )
} 