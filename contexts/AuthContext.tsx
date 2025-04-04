'use client'

import { createContext, useContext } from 'react'
import { useAuth as useClerkAuth } from '@clerk/nextjs'

export const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId, sessionId } = useClerkAuth()
  
  return (
    <AuthContext.Provider value={{ isLoaded, userId, sessionId }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 