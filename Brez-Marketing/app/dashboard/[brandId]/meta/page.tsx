import React from 'react'
import { Metadata } from 'next'
import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import MetaTab from '@/components/dashboard/MetaTab'

export const metadata: Metadata = {
  title: 'Meta Ads Dashboard',
  description: 'View your Meta Ads performance metrics and insights',
}

interface MetaDashboardPageProps {
  params: {
    brandId: string
  }
}

export default function MetaDashboardPage({ params }: MetaDashboardPageProps) {
  const { userId } = auth()
  
  if (!userId) {
    redirect('/login')
  }
  
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Meta Ads Dashboard</h1>
      <MetaTab brandId={params.brandId} />
    </div>
  )
} 