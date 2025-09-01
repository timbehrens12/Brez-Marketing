"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, Database, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface SyncDebugData {
  debug_id: string
  timestamp: string
  brand_id: string
  connections: Array<{
    id: string
    brand_id: string
    shop: string
    status: string
    sync_status: string
    created_at: string
    updated_at: string
    last_synced_at: string
    metadata: any
  }>
  etl_jobs: Array<{
    id: number
    brand_id: string
    entity: string
    job_type: string
    status: string
    progress_pct: number
    rows_written: number
    total_rows: number
    shopify_bulk_id: string
    error_message: string
    started_at: string
    completed_at: string
    updated_at: string
  }>
  recent_data: {
    orders: Array<{
      id: string
      order_id: string
      brand_id: string
      name: string
      total_price: number
      created_at: string
      synced_at: string
    }>
    customers: Array<{
      id: string
      customer_id: string
      brand_id: string
      email: string
      name: string
      created_at: string
      synced_at: string
    }>
    products: Array<{
      id: string
      product_id: string
      brand_id: string
      title: string
      vendor: string
      created_at: string
      synced_at: string
    }>
  }
  summary: {
    total_connections: number
    active_connections: number
    syncing_connections: number
    total_etl_jobs: number
    running_etl_jobs: number
    completed_etl_jobs: number
    failed_etl_jobs: number
    recent_orders_count: number
    recent_customers_count: number
    recent_products_count: number
  }
}

interface ShopifySyncMonitorProps {
  brandId?: string
}

export function ShopifySyncMonitor({ brandId }: ShopifySyncMonitorProps) {
  const [debugData, setDebugData] = useState<SyncDebugData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchDebugData = async () => {
    const fetchId = `fetch_${Date.now()}`
    
    console.log(`🔍 [MONITOR-${fetchId}] Fetching Shopify sync debug data...`)
    console.log(`🔍 [MONITOR-${fetchId}] Brand ID: ${brandId || 'ALL'}`)
    
    setIsLoading(true)
    setError(null)

    try {
      const url = `/api/debug/shopify-sync-logs${brandId ? `?brandId=${brandId}` : ''}`
      console.log(`📡 [MONITOR-${fetchId}] Making request to: ${url}`)
      
      const response = await fetch(url)
      console.log(`📡 [MONITOR-${fetchId}] Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ [MONITOR-${fetchId}] Request failed: ${errorText}`)
        throw new Error(`Failed to fetch debug data: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log(`✅ [MONITOR-${fetchId}] Debug data received:`)
      console.log(`📊 [MONITOR-${fetchId}] Summary:`, data.summary)
      
      setDebugData(data)
    } catch (err) {
      console.error(`❌ [MONITOR-${fetchId}] Error:`, err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const triggerManualSync = async () => {
    if (!brandId) {
      console.error('❌ [MONITOR] Cannot trigger manual sync - no brand ID')
      return
    }

    const manualId = `manual_${Date.now()}`
    
    console.log(`🚀 [MONITOR-${manualId}] Triggering manual sync for brand: ${brandId}`)
    
    try {
      const response = await fetch('/api/debug/shopify-sync-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brandId,
          force: true
        })
      })

      console.log(`📡 [MONITOR-${manualId}] Manual sync response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ [MONITOR-${manualId}] Manual sync failed: ${errorText}`)
        throw new Error(`Manual sync failed: ${response.status}`)
      }

      const result = await response.json()
      console.log(`✅ [MONITOR-${manualId}] Manual sync triggered:`, result)
      
      // Refresh debug data after triggering sync
      setTimeout(fetchDebugData, 1000)
    } catch (err) {
      console.error(`❌ [MONITOR-${manualId}] Error:`, err)
      setError(err instanceof Error ? err.message : 'Failed to trigger manual sync')
    }
  }

  useEffect(() => {
    fetchDebugData()
  }, [brandId])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDebugData, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ {status}</Badge>
      case 'syncing':
      case 'running':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">🔄 {status}</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">❌ {status}</Badge>
      case 'pending':
      case 'queued':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⏳ {status}</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">🔍 Shopify Sync Monitor</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-blue-500/20 border-blue-500/30' : ''}
          >
            {autoRefresh ? '⏸️ Stop Auto' : '▶️ Auto Refresh'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDebugData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {brandId && (
            <Button
              variant="outline"
              size="sm"
              onClick={triggerManualSync}
              className="bg-green-500/20 border-green-500/30 text-green-400"
            >
              🚀 Trigger Sync
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-4">
            <p className="text-red-400">❌ Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {debugData && (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="summary">📊 Summary</TabsTrigger>
            <TabsTrigger value="connections">🔗 Connections</TabsTrigger>
            <TabsTrigger value="jobs">⚙️ ETL Jobs</TabsTrigger>
            <TabsTrigger value="data">💾 Recent Data</TabsTrigger>
            <TabsTrigger value="raw">🔧 Raw Debug</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Sync Status Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Connections</p>
                    <p className="text-lg font-semibold">{debugData.summary.active_connections}/{debugData.summary.total_connections} Active</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Currently Syncing</p>
                    <p className="text-lg font-semibold text-blue-400">{debugData.summary.syncing_connections}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">ETL Jobs</p>
                    <p className="text-lg font-semibold">{debugData.summary.completed_etl_jobs}/{debugData.summary.total_etl_jobs} Complete</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Running Jobs</p>
                    <p className="text-lg font-semibold text-blue-400">{debugData.summary.running_etl_jobs}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Failed Jobs</p>
                    <p className="text-lg font-semibold text-red-400">{debugData.summary.failed_etl_jobs}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-400">Recent Orders</p>
                    <p className="text-lg font-semibold text-green-400">{debugData.summary.recent_orders_count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="connections">
            <Card>
              <CardHeader>
                <CardTitle>🔗 Platform Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {debugData.connections.map((conn) => (
                    <div key={conn.id} className="border border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{conn.shop}</h3>
                        <div className="flex gap-2">
                          {getStatusBadge(conn.status)}
                          {getStatusBadge(conn.sync_status)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>ID: {conn.id}</p>
                        <p>Brand: {conn.brand_id}</p>
                        <p>Created: {new Date(conn.created_at).toLocaleString()}</p>
                        <p>Last Synced: {conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleString() : 'Never'}</p>
                        {conn.metadata && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-blue-400">View Metadata</summary>
                            <pre className="mt-1 text-xs bg-gray-800 p-2 rounded overflow-auto">
                              {JSON.stringify(conn.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                  {debugData.connections.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No Shopify connections found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle>⚙️ ETL Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {debugData.etl_jobs.map((job) => (
                    <div key={job.id} className="border border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{job.entity} ({job.job_type})</h3>
                          <p className="text-sm text-gray-400">ID: {job.id}</p>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-gray-400">Progress</p>
                          <p className="font-medium">{job.progress_pct || 0}%</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Rows Written</p>
                          <p className="font-medium">{job.rows_written || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Total Rows</p>
                          <p className="font-medium">{job.total_rows || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Shopify Bulk ID</p>
                          <p className="font-mono text-xs">{job.shopify_bulk_id || 'None'}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">
                        <p>Started: {job.started_at ? new Date(job.started_at).toLocaleString() : 'Not started'}</p>
                        <p>Updated: {job.updated_at ? new Date(job.updated_at).toLocaleString() : 'Never'}</p>
                        {job.completed_at && <p>Completed: {new Date(job.completed_at).toLocaleString()}</p>}
                        {job.error_message && (
                          <p className="text-red-400 mt-1">Error: {job.error_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {debugData.etl_jobs.length === 0 && (
                    <p className="text-gray-400 text-center py-4">No ETL jobs found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">📊 Recent Orders ({debugData.recent_data.orders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {debugData.recent_data.orders.map((order) => (
                      <div key={order.id} className="text-xs border border-gray-700 rounded p-2">
                        <p className="font-medium">{order.name}</p>
                        <p className="text-gray-400">${order.total_price}</p>
                        <p className="text-gray-500">Synced: {new Date(order.synced_at).toLocaleString()}</p>
                      </div>
                    ))}
                    {debugData.recent_data.orders.length === 0 && (
                      <p className="text-gray-400 text-center py-2">No orders synced yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Customers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">👥 Recent Customers ({debugData.recent_data.customers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {debugData.recent_data.customers.map((customer) => (
                      <div key={customer.id} className="text-xs border border-gray-700 rounded p-2">
                        <p className="font-medium">{customer.name || customer.email}</p>
                        <p className="text-gray-400">{customer.email}</p>
                        <p className="text-gray-500">Synced: {new Date(customer.synced_at).toLocaleString()}</p>
                      </div>
                    ))}
                    {debugData.recent_data.customers.length === 0 && (
                      <p className="text-gray-400 text-center py-2">No customers synced yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">📦 Recent Products ({debugData.recent_data.products.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {debugData.recent_data.products.map((product) => (
                      <div key={product.id} className="text-xs border border-gray-700 rounded p-2">
                        <p className="font-medium">{product.title}</p>
                        <p className="text-gray-400">{product.vendor}</p>
                        <p className="text-gray-500">Synced: {new Date(product.synced_at).toLocaleString()}</p>
                      </div>
                    ))}
                    {debugData.recent_data.products.length === 0 && (
                      <p className="text-gray-400 text-center py-2">No products synced yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>🔧 Raw Debug Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-900 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading debug data...
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
