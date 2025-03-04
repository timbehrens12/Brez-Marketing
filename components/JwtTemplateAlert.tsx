'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function JwtTemplateAlert() {
  const { jwtTemplateError } = useAuth()
  const [visible, setVisible] = useState(false)
  
  useEffect(() => {
    if (jwtTemplateError) {
      setVisible(true)
    }
  }, [jwtTemplateError])
  
  if (!visible || !jwtTemplateError) return null
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Authentication Error</AlertTitle>
      <AlertDescription>
        {jwtTemplateError}
        <div className="mt-2">
          <p className="text-sm">
            You need to set up a JWT template in your Clerk dashboard to connect with Supabase.
          </p>
          <div className="mt-3">
            <Link href="/setup-jwt">
              <Button variant="outline" size="sm">
                View Setup Guide
              </Button>
            </Link>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
} 