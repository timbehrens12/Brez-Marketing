'use client'

import { useErrorBoundaryFix, useSupabaseErrorHandler } from '@/lib/utils'

export function ErrorHandlers() {
  // Apply the error boundary fixes
  useErrorBoundaryFix();
  useSupabaseErrorHandler();
  
  // This component doesn't render anything visible
  return null;
} 