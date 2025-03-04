'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth as useClerkAuth } from '@clerk/nextjs'
import { supabase } from '@/lib/supabase'
import { usePathname, useRouter } from 'next/navigation'

export const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId, sessionId, getToken } = useClerkAuth()
  const [isSupabaseAuthenticated, setIsSupabaseAuthenticated] = useState(false)
  const [jwtTemplateError, setJwtTemplateError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  
  // Redirect to setup page if there's a JWT template error
  useEffect(() => {
    if (jwtTemplateError && isLoaded && userId && pathname !== '/setup-jwt') {
      // Only redirect if we're not already on the setup page and not on a public route
      if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
        router.push('/setup-jwt')
      }
    }
  }, [jwtTemplateError, isLoaded, userId, router, pathname])
  
  useEffect(() => {
    // Only run this effect if Clerk auth is loaded and we have a userId
    if (!isLoaded || !userId) {
      setIsSupabaseAuthenticated(false);
      return
    }

    const setupSupabaseAuth = async () => {
      try {
        // Get a JWT from Clerk
        const token = await getToken({ template: 'supabase' })
          .catch(error => {
            console.error('Error getting Supabase token:', error)
            if (error.errors?.[0]?.code === 'resource_not_found') {
              setJwtTemplateError('JWT template "supabase" not found in Clerk. Please create it in your Clerk dashboard.')
            }
            return null
          })
        
        if (token) {
          // Set the Supabase session with the Clerk JWT
          const { error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: '',
          })
          
          if (error) {
            console.error('Error setting Supabase session:', error)
            setIsSupabaseAuthenticated(false)
          } else {
            console.log('Supabase session set successfully')
            setIsSupabaseAuthenticated(true)
            setJwtTemplateError(null)
          }
        } else {
          console.error('No token received from Clerk')
          setIsSupabaseAuthenticated(false)
        }
      } catch (error) {
        console.error('Error authenticating with Supabase:', error)
        setIsSupabaseAuthenticated(false)
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
      isSupabaseAuthenticated,
      jwtTemplateError
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 