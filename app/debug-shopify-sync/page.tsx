"use client"

import { ShopifySyncMonitor } from '@/components/debug/ShopifySyncMonitor'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function DebugShopifySyncContent() {
  const searchParams = useSearchParams()
  const brandId = searchParams.get('brandId')



  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="border-b border-gray-700 pb-4">
        <h1 className="text-2xl font-bold">🔍 Shopify Sync Debug Console</h1>
        <p className="text-gray-400 mt-2">
          Monitor Shopify sync operations, ETL jobs, and database population in real-time
        </p>
        {brandId && (
          <p className="text-sm text-blue-400 mt-1">
            Filtering for Brand ID: {brandId}
          </p>
        )}
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <h3 className="font-medium text-yellow-400 mb-2">🚨 Debug Console Active</h3>
        <p className="text-sm text-gray-300">
          This page shows comprehensive logging for Shopify sync operations. 
          All sync steps are tracked with unique IDs that appear in both frontend and backend logs.
        </p>
        <div className="mt-2 text-xs text-gray-400">
          <p>• <strong>Frontend logs:</strong> Look for [FRONTEND-xxxxx] prefixes</p>
          <p>• <strong>Queue logs:</strong> Look for [QUEUE-xxxxx] prefixes</p>
          <p>• <strong>Worker logs:</strong> Look for [WORKER-xxxxx] prefixes</p>
          <p>• <strong>GraphQL logs:</strong> Look for [GRAPHQL-xxxxx] prefixes</p>
          <p>• <strong>Database logs:</strong> Look for [PROCESS-xxxxx] prefixes</p>
        </div>
      </div>

      <ShopifySyncMonitor brandId={brandId || undefined} />
    </div>
  )
}

export default function DebugShopifySyncPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading debug console...</div>}>
      <DebugShopifySyncContent />
    </Suspense>
  )
}
