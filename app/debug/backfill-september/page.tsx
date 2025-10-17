"use client"

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useBrandContext } from '@/lib/context/BrandContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function BackfillSeptemberPage() {
  const { userId } = useAuth()
  const { selectedBrandId } = useBrandContext()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleBackfill = async () => {
    if (!selectedBrandId) {
      setError('Please select a brand first')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/meta/backfill-september', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrandId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Backfill failed')
        return
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return <div className="p-8">Please sign in to access this page.</div>
  }

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Backfill September 2025 Data</CardTitle>
          <CardDescription>
            This tool will sync all missing dates for September 2025 from Meta.
            Use this if "Last Month" is showing incorrect reach numbers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleBackfill}
            disabled={loading || !selectedBrandId}
          >
            {loading ? 'Backfilling...' : 'Start September Backfill'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  {result.message}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Before</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{result.before?.dates || 0}</p>
                    <p className="text-sm text-muted-foreground">dates synced</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Missing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{result.missing?.count || 0}</p>
                    <p className="text-sm text-muted-foreground">dates to sync</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">After</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{result.after?.dates || 0}</p>
                    <p className="text-sm text-muted-foreground">dates synced</p>
                  </CardContent>
                </Card>
              </div>

              {result.missing?.list && result.missing.list.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Missing Dates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{result.missing.list.join(', ')}</p>
                  </CardContent>
                </Card>
              )}

              {result.after?.list && result.after.list.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">All Synced Dates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-mono text-xs">
                      {result.after.list.join(', ')}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

