"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Database, TestTube } from 'lucide-react'

interface WidgetTesterProps {
  brandId: string
}

interface TestResult {
  name: string
  status: 'success' | 'error'
  hasData: boolean
  dataCount: number
  message: string
}

export function WidgetTester({ brandId }: WidgetTesterProps) {
  const [isPopulating, setIsPopulating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [summary, setSummary] = useState<any>(null)

  const populateTestData = async () => {
    setIsPopulating(true)
    try {
      const response = await fetch('/api/shopify/test-widgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId })
      })

      const result = await response.json()
      
      if (response.ok) {
        alert(`✅ Sample data created successfully!\n\nOrders: ${result.data.ordersCreated}\nCustomers: ${result.data.customersCreated}\nInventory Items: ${result.data.inventoryItems}`)
      } else {
        alert(`❌ Failed to create sample data: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsPopulating(false)
    }
  }

  const testAllWidgets = async () => {
    setIsTesting(true)
    try {
      const response = await fetch('/api/shopify/test-all-widgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId })
      })

      const result = await response.json()
      
      if (response.ok) {
        setResults(result.results)
        setSummary(result.summary)
      } else {
        alert(`❌ Test failed: ${result.error}`)
      }
    } catch (error) {
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#333]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Widget Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={populateTestData}
            disabled={isPopulating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Database className={`h-4 w-4 mr-2 ${isPopulating ? 'animate-spin' : ''}`} />
            {isPopulating ? 'Creating Data...' : 'Create Test Data'}
          </Button>
          
          <Button 
            onClick={testAllWidgets}
            disabled={isTesting}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
            {isTesting ? 'Testing...' : 'Test Widgets'}
          </Button>
        </div>

        {summary && (
          <div className="bg-[#222] rounded-lg p-4 border border-[#333]">
            <h3 className="text-white font-medium mb-2">Test Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Total Widgets:</span>
                <div className="text-white font-medium">{summary.totalWidgets}</div>
              </div>
              <div>
                <span className="text-gray-400">Working:</span>
                <div className="text-green-400 font-medium">{summary.workingWidgets}</div>
              </div>
              <div>
                <span className="text-gray-400">Success Rate:</span>
                <div className="text-blue-400 font-medium">{summary.successRate}</div>
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-white font-medium">Widget Status</h3>
            {results.map((result, index) => (
              <div 
                key={index} 
                className="flex justify-between items-center p-3 bg-[#222] rounded-lg border border-[#333]"
              >
                <div>
                  <div className="text-white font-medium">{result.name}</div>
                  <div className="text-xs text-gray-400">{result.message}</div>
                </div>
                <div className="flex items-center gap-2">
                  {result.hasData && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      {result.dataCount} records
                    </span>
                  )}
                  <div className={`w-3 h-3 rounded-full ${
                    result.status === 'success' && result.hasData
                      ? 'bg-green-400'
                      : result.status === 'success'
                        ? 'bg-yellow-400'
                        : 'bg-red-400'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-gray-400 bg-[#222] p-3 rounded border border-[#333]">
          <strong>Instructions:</strong>
          <ol className="mt-2 space-y-1 list-decimal list-inside">
            <li>Click "Create Test Data" to populate sample data including the San Francisco sale</li>
            <li>Click "Test Widgets" to verify all analytics widgets are working</li>
            <li>Check the dashboard to see if widgets now show data</li>
            <li>For repeat customers, create another order from the same email to test repeat functionality</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
