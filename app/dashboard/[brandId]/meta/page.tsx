"use client"

import React, { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { MetaTab } from '@/components/dashboard/platforms/tabs/MetaTab'
import { useRouter } from 'next/navigation'

interface MetaDashboardPageProps {
  params: {
    brandId: string
  }
}

export default function MetaDashboardPage({ params }: MetaDashboardPageProps) {
  const { userId, isLoaded } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    // Dispatch custom event when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Meta dashboard page became visible, refreshing data');
        window.dispatchEvent(new CustomEvent('metaDataRefreshed', {
          detail: { brandId: params.brandId }
        }));
      }
    };
    
    // Register visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial load - trigger immediate refresh 
    window.dispatchEvent(new CustomEvent('metaDataRefreshed', {
      detail: { brandId: params.brandId }
    }));
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [params.brandId]);
  
  if (!userId && isLoaded) {
    redirect('/sign-in')
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Meta Ads Dashboard</h1>
      <MetaTab brandId={params.brandId} />
    </div>
  )
} 