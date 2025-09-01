import { auth } from '@clerk/nextjs'

/**
 * Retrieves the currently authenticated user from Clerk
 * Returns null if no user is authenticated
 */
export async function getUser() {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return null
    }
    
    return { id: userId }
  } catch (error) {
    console.error('Error getting user session:', error)
    return null
  }
} 