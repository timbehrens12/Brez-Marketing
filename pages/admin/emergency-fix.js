import { useState } from 'react'
import Head from 'next/head'

export default function EmergencyFix() {
  const [brandId, setBrandId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleResync = async () => {
    if (!brandId) {
      setError('Brand ID is required')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/emergency-resync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ brandId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resync data')
      }

      setResult(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Head>
        <title>Emergency Meta Data Recovery</title>
      </Head>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🚨 Emergency Meta Data Recovery</h1>
        <p className="text-gray-600 dark:text-gray-300">This tool will perform a complete resync of Meta Ads data for the specified brand.</p>
      </div>

      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <p className="font-bold">WARNING</p>
        <p>This is an emergency recovery tool. It will attempt to restore your Meta data by:</p>
        <ul className="list-disc ml-5 mt-2">
          <li>Checking the database structure and making needed repairs</li>
          <li>Syncing Meta data for the last 90 days</li>
          <li>Ensuring views data is properly populated</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <div className="mb-4">
          <label htmlFor="brandId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Brand ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="brandId"
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
            placeholder="Enter your Brand ID"
          />
        </div>

        <button
          onClick={handleResync}
          disabled={isLoading}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            isLoading ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isLoading ? 'Processing...' : 'Run Emergency Recovery'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p className="font-bold">Success!</p>
          <p>{result.message}</p>
          <div className="mt-2">
            <p>Records before sync: {result.recordsBeforeSync}</p>
            <p>Records after sync: {result.recordsAfterSync}</p>
            <p>Net change: {result.netChange} records</p>
          </div>
          <div className="mt-4">
            <p>What to do next:</p>
            <ol className="list-decimal ml-5">
              <li>Return to your dashboard</li>
              <li>Hard refresh your browser (Ctrl+F5)</li>
              <li>Check if your data is now showing correctly</li>
            </ol>
          </div>
        </div>
      )}

      <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
        <p className="font-bold">Need to run database migrations?</p>
        <p>If you need to run the views column migration first, use this command in your terminal:</p>
        <div className="bg-gray-800 text-white p-3 rounded mt-2 overflow-x-auto">
          <code>export SUPABASE_DB_URL=postgresql://postgres:password@localhost:5432/postgres</code><br />
          <code>psql $SUPABASE_DB_URL -f scripts/database_functions.sql</code>
        </div>
      </div>
    </div>
  )
} 