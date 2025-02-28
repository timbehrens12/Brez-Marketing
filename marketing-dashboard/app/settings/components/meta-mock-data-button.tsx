'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function MetaMockDataButton({ brandId }: { brandId: string }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function generateMockData() {
    setLoading(true)
    setStatus('Generating mock data...')
    
    try {
      const response = await fetch('/api/meta/mock-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId }),
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error)
      }
      
      setStatus(`Success! ${data.message}`)
      setTimeout(() => setStatus(null), 3000)
    } catch (error) {
      setStatus(`Error: ${error.message || 'Unknown error'}`)
      setTimeout(() => setStatus(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button 
        onClick={generateMockData} 
        disabled={loading}
        variant="outline"
        className="flex items-center gap-2"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Generate Mock Data
      </Button>
      
      {status && (
        <p className="text-sm mt-2 text-gray-600">{status}</p>
      )}
    </div>
  )
} 