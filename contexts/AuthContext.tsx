'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth as useClerkAuth } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'

export const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId, sessionId, getToken } = useClerkAuth()
  const [isSupabaseAuthenticated, setIsSupabaseAuthenticated] = useState(false)
  
  useEffect(() => {
    // Only run this effect if Clerk auth is loaded and we have a userId
    if (!isLoaded || !userId) {
      return
    }

    const setupSupabaseAuth = async () => {
      try {
        // Get a JWT from Clerk
        const token = await getToken({ template: 'supabase' })
        
        if (token) {
          // Set the Supabase session with the Clerk JWT
          const { error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: '',
          })
          
          if (error) {
            console.error('Error setting Supabase session:', error)
          } else {
            console.log('Supabase session set successfully')
            setIsSupabaseAuthenticated(true)
          }
        }
      } catch (error) {
        console.error('Error authenticating with Supabase:', error)
      }
    }

    setupSupabaseAuth()

    // Set up a timer to refresh the token periodically
    const intervalId = setInterval(setupSupabaseAuth, 10 * 60 * 1000) // Refresh every 10 minutes

    return () => clearInterval(intervalId)
  }, [getToken, userId, isLoaded])
  
  return (
    <AuthContext.Provider value={{ 
      isLoaded, 
      userId, 
      sessionId, 
      isSupabaseAuthenticated 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 