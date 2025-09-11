"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetaSyncStatus } from '@/components/MetaSyncStatus'

export default function MetaTestPage() {
  const [syncing, setSyncing] = useState(false)
  const [syncStarted, setSyncStarted] = useState(false)
  const brandId = '0da80e8f-2df3-468d-9053-08fa4d24e6e8' // Your brand ID

  const startSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/meta/queue-historical-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId })
      })
      
      const result = await response.json()
      console.log('Sync started:', result)
      setSyncStarted(true)
    } catch (error) {
      console.error('Error starting sync:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncComplete = () => {
    console.log('Sync completed!')
    // You could refresh the page or update other components here
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meta Historical Sync Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            This will queue 12 months of Meta historical data sync jobs and show real-time progress.
          </p>
          
          <Button 
            onClick={startSync} 
            disabled={syncing || syncStarted}
            className="w-full"
          >
            {syncing ? 'Starting Sync...' : syncStarted ? 'Sync Started' : 'Start 12-Month Meta Sync'}
          </Button>
          
          {syncStarted && (
            <MetaSyncStatus 
              brandId={brandId} 
              onSyncComplete={handleSyncComplete}
            />
          )}
          
          <div className="text-sm text-gray-600">
            <p><strong>What this does:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Clears existing Meta data</li>
              <li>Queues 12 months of historical sync jobs</li>
              <li>Shows "Syncing..." status with progress</li>
              <li>Jobs run in background via Redis/Upstash</li>
              <li>When complete, dashboard will show all historical data</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}