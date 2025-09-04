"use client"

import { useEffect, useState } from 'react'
import { Footer } from './Footer'

export function ConditionalFooter() {
  const [isLoadingPage, setIsLoadingPage] = useState(false)

  useEffect(() => {
    // Check if the current page is showing a loading screen
    const checkLoadingState = () => {
      // Look for common loading screen indicators
      const loadingIndicators = [
        '.min-h-screen .animate-spin', // Loading spinner in full screen
        '[class*="loading"]',
        '.w-20.h-20 .animate-spin', // Specific loading spinner pattern
        'div:has(.animate-spin)[class*="min-h-screen"]' // Full screen with spinner
      ]
      
      let hasLoadingScreen = false
      
      // Check for loading screen patterns
      for (const selector of loadingIndicators) {
        try {
          if (document.querySelector(selector)) {
            hasLoadingScreen = true
            break
          }
        } catch (e) {
          // Ignore selector errors
        }
      }
      
      // Also check for specific loading screen text content
      const bodyText = document.body.textContent || ''
      const hasLoadingText = (
        bodyText.includes('Loading workspace data') ||
        bodyText.includes('Analyzing your brand') ||
        bodyText.includes('AI Dashboard') && bodyText.includes('Connecting') ||
        bodyText.includes('Marketing Assistant') && bodyText.includes('Loading')
      )
      
      setIsLoadingPage(hasLoadingScreen || hasLoadingText)
    }
    
    // Check immediately
    checkLoadingState()
    
    // Set up observer to watch for DOM changes
    const observer = new MutationObserver(checkLoadingState)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })
    
    return () => observer.disconnect()
  }, [])

  // Hide footer on loading pages
  if (isLoadingPage) {
    return null
  }

  return <Footer />
} 