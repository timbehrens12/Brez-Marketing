'use client'

import { useState, useEffect } from 'react'

export default function MetaTestPage() {
  const [brandId, setBrandId] = useState('9f958c0f-d4f7-49c2-bbbb-0db0be4aa751')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function testConnection() {
    setLoading(true)
    setError(null)
    
    try {
      // Direct database query using Supabase client
      const res = await fetch('/api/meta/direct-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId }),
      })
      
      const data = await res.json()
      console.log('Test result:', data)
      setResult(data)
    } catch (err: unknown) {
      console.error('Test error:', err)
      setError(typeof err === 'object' && err !== null && 'message' in err 
        ? (err.message as string) 
        : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Meta Connection Test</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Brand ID:</label>
        <input 
          type="text" 
          value={brandId} 
          onChange={(e) => setBrandId(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-black">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 