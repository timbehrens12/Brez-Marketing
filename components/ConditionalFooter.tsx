"use client"

import { Footer } from './Footer'
import { useEffect, useState } from 'react'

export function ConditionalFooter() {
  const [isPageLoading, setIsPageLoading] = useState(false)

  useEffect(() => {
    // Listen for page loading events
    const handleLoadingStart = () => setIsPageLoading(true)
    const handleLoadingEnd = () => setIsPageLoading(false)

    // Check if any UnifiedLoading component with page variant is currently mounted
    const checkForPageLoading = () => {
      const pageLoadingElements = document.querySelectorAll('[data-loading-variant="page"]')
      setIsPageLoading(pageLoadingElements.length > 0)
    }

    // Initial check
    checkForPageLoading()

    // Set up a MutationObserver to watch for loading components
    const observer = new MutationObserver(checkForPageLoading)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-loading-variant']
    })

    // Custom events for manual control
    window.addEventListener('page-loading-start', handleLoadingStart)
    window.addEventListener('page-loading-end', handleLoadingEnd)

    return () => {
      observer.disconnect()
      window.removeEventListener('page-loading-start', handleLoadingStart)
      window.removeEventListener('page-loading-end', handleLoadingEnd)
    }
  }, [])

  // Don't show footer during page loading
  if (isPageLoading) {
    return null
  }

  return <Footer />
} 