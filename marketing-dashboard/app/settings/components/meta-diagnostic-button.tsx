'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function MetaDiagnosticButton({ brandId }: { brandId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function runDiagnostic() {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/meta/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId }),
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: 'Request failed',
        details: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button 
        onClick={runDiagnostic} 
        disabled={loading}
        variant="outline"
        className="flex items-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Diagnose Meta Connection
      </Button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md">
          <h3 className="font-medium mb-2">
            {result.success ? '✅ Connection Working' : '❌ Connection Issue'}
          </h3>
          
          {result.success ? (
            <div className="space-y-2">
              <p>Connected to Meta as: <strong>{result.user.name}</strong> (ID: {result.user.id})</p>
              <p>{result.message}</p>
              
              {result.hasAdAccounts && (
                <div>
                  <p className="font-medium mt-2">Ad Accounts:</p>
                  <ul className="list-disc pl-5">
                    {result.adAccounts.map(account => (
                      <li key={account.id}>{account.name} (ID: {account.id})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-red-500">{result.error}</p>
              {result.details && (
                <pre className="mt-2 text-xs bg-gray-200 p-2 rounded overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 