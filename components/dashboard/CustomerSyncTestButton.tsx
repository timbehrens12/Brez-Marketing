"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Bug } from 'lucide-react'
import { toast } from 'sonner'

export function CustomerSyncTestButton({ className }: { className?: string }) {
  const [isTesting, setIsTesting] = useState(false)

  const handleTest = async () => {
    if (isTesting) return
    
    setIsTesting(true)
    console.log('Testing shopify_customers table access')
    
    try {
      console.log('Sending request to /api/shopify/customers/test')
      const response = await fetch('/api/shopify/customers/test')
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to test customer data access')
      }
      
      toast.success('Successfully tested shopify_customers table access')
      
    } catch (error) {
      console.error('Error testing customer data access:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to test customer data access')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Button 
      onClick={handleTest} 
      variant="outline" 
      size="sm" 
      className={className}
      disabled={isTesting}
    >
      {isTesting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Testing...
        </>
      ) : (
        <>
          <Bug className="h-4 w-4 mr-2" />
          Test Customers DB
        </>
      )}
    </Button>
  )
} 