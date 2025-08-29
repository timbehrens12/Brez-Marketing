import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, CheckCircle, Clock, XCircle, Database, Zap } from 'lucide-react'

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  category: 'sync' | 'ui' | 'data' | 'api'
  message: string
  details?: any
}

interface SyncLoggerProps {
  brandId: string
  isVisible?: boolean
}

export function SyncLogger({ brandId, isVisible = true }: SyncLoggerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const logCounter = useRef(0)

  // Function to add a log entry
  const addLog = (level: LogEntry['level'], category: LogEntry['category'], message: string, details?: any) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${logCounter.current++}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    }

    setLogs(prev => [...prev.slice(-99), newLog]) // Keep last 100 entries
  }

  // Log UI state changes
  useEffect(() => {
    addLog('info', 'ui', `🔍 SyncLogger initialized for brand: ${brandId}`)
  }, [brandId])

  // Monitor sync status changes
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const response = await fetch(`/api/sync/${brandId}/status`)
        if (response.ok) {
          const status = await response.json()
          addLog('info', 'sync', `📊 Sync status update: ${status.shopify?.overall_status || 'unknown'}`, {
            milestones: status.shopify?.milestones?.length || 0,
            lastUpdate: status.shopify?.last_update
          })
        }
      } catch (error) {
        addLog('error', 'api', `❌ Failed to check sync status: ${error}`)
      }
    }

    const interval = setInterval(checkSyncStatus, 10000) // Check every 10 seconds
    checkSyncStatus() // Initial check

    return () => clearInterval(interval)
  }, [brandId])

  // Monitor data changes
  useEffect(() => {
    const checkDataCounts = async () => {
      try {
        // Check orders count
        const ordersResponse = await fetch('/api/shopify/orders?limit=1')
        const ordersData = await ordersResponse.json()
        addLog('info', 'data', `📦 Orders in database: ${ordersData.total || 0}`)

        // Check customers count
        const customersResponse = await fetch('/api/shopify/analytics/customer-segments')
        if (customersResponse.ok) {
          const customersData = await customersResponse.json()
          addLog('info', 'data', `👥 Customer segments loaded: ${customersData.length || 0}`)
        }

        // Check inventory
        const inventoryResponse = await fetch('/api/shopify/inventory')
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json()
          addLog('info', 'data', `📦 Inventory items: ${inventoryData.total || 0}`)
        }

      } catch (error) {
        addLog('error', 'api', `❌ Failed to check data counts: ${error}`)
      }
    }

    const interval = setInterval(checkDataCounts, 15000) // Check every 15 seconds
    checkDataCounts() // Initial check

    return () => clearInterval(interval)
  }, [brandId])

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAutoScroll && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [logs, isAutoScroll])

  // Global error logging
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addLog('error', 'ui', `🚨 JavaScript Error: ${event.message}`, {
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addLog('error', 'ui', `🚨 Unhandled Promise Rejection: ${event.reason}`)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error': return <XCircle className="h-3 w-3 text-red-500" />
      case 'warn': return <AlertCircle className="h-3 w-3 text-yellow-500" />
      default: return <Clock className="h-3 w-3 text-blue-500" />
    }
  }

  const getCategoryIcon = (category: LogEntry['category']) => {
    switch (category) {
      case 'sync': return <Zap className="h-3 w-3" />
      case 'data': return <Database className="h-3 w-3" />
      case 'api': return <AlertCircle className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  const clearLogs = () => {
    setLogs([])
    addLog('info', 'ui', '🧹 Logs cleared')
  }

  if (!isVisible) return null

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Database className="h-4 w-4" />
          Sync Logger - Brand: {brandId}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {logs.length} entries
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className="text-xs"
          >
            {isAutoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
            className="text-xs"
          >
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 w-full" ref={scrollAreaRef}>
          <div className="space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2 p-2 rounded text-xs ${
                  log.level === 'error' ? 'bg-red-50 border border-red-200' :
                  log.level === 'success' ? 'bg-green-50 border border-green-200' :
                  log.level === 'warn' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                  {getLevelIcon(log.level)}
                  {getCategoryIcon(log.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-gray-500 mb-1">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="break-words">{log.message}</div>
                  {log.details && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                        Show details
                      </summary>
                      <pre className="text-xs mt-1 p-1 bg-gray-100 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
