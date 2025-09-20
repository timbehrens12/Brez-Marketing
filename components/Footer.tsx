"use client"

import { Instagram, ExternalLink, MessageSquare, Bug } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import dynamic from 'next/dynamic'

// Suppress hydration warnings for this component
const FooterContent = dynamic(() => Promise.resolve(FooterContentComponent), {
  ssr: false
})

function FooterContentComponent() {
  // Use a static year or suppress hydration warning
  const [currentYear, setCurrentYear] = useState(2025)
  
  // Track sidebar state for dynamic footer height
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  
  // Update year on client side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])
  
  // Listen for sidebar state changes
  useEffect(() => {
    const handleSidebarStateChange = (event: CustomEvent) => {
      setSidebarExpanded(event.detail.expanded)
    }
    
    window.addEventListener('sidebarStateChange', handleSidebarStateChange as EventListener)
    
    return () => {
      window.removeEventListener('sidebarStateChange', handleSidebarStateChange as EventListener)
    }
  }, [])
  
  // Version information - use static values to avoid hydration mismatch
  const [versionString, setVersionString] = useState("v0.1.0.7174")
  
  useEffect(() => {
    // Update version string on client side only
    const packageVersion = "0.1.0"
    const deploymentNumber = process.env.NEXT_PUBLIC_DEPLOYMENT_NUMBER || "7174"
    const gitHash = process.env.NEXT_PUBLIC_GIT_HASH || ""
    setVersionString(`v${packageVersion}${deploymentNumber ? `.${deploymentNumber}` : ''}${gitHash ? ` (${gitHash.slice(0, 7)})` : ''}`)
  }, [])
  
  const handleFeatureRequest = () => {
    // Option 1: GitHub Issues (replace with your actual repo)
    window.open('https://github.com/your-org/brez-marketing/issues/new?template=feature_request.md&labels=enhancement', '_blank')
  }
  
  const handleBugReport = () => {
    // Option 1: GitHub Issues (replace with your actual repo)
    window.open('https://github.com/your-org/brez-marketing/issues/new?template=bug_report.md&labels=bug', '_blank')
  }
  
  const handleFeedback = () => {
    // Open Typeform feedback form
    window.open('https://form.typeform.com/to/ohOKhC39', '_blank')
  }
  
  return (
    <footer 
      className={`w-full backdrop-blur-sm border-t border-[#2A2A2A] transition-all duration-300 mt-auto ${
        sidebarExpanded ? 'px-4 py-[18px]' : 'p-4'
      }`}
      style={{
        background: `rgba(128,128,128,0.15)`
      }}
    >
      <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-white">
              <img 
                src="https://i.imgur.com/j4AQPxj.png" 
                alt="[bm] dashboard" 
                className="h-8 w-auto"
              />
            </div>
            <span className="text-sm text-zinc-400 whitespace-nowrap">
              © {currentYear} Brez Marketing. All rights reserved.
            </span>
          </div>
          
          {/* Version indicator */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-zinc-500 px-2 py-1 bg-[#2A2A2A] rounded border border-[#444]">
              {versionString}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-center lg:justify-end gap-1 lg:gap-2 xl:gap-3 overflow-hidden">
          {/* Direct Feedback Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleFeedback}
            className="bg-[#2A2A2A] border-[#444] text-zinc-300 hover:bg-[#333] hover:text-white text-xs px-2 py-1 h-7 flex-shrink-0"
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Feedback
          </Button>
          
          {/* Legal links */}
          <Link 
            href="/terms" 
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            Terms of Service
          </Link>
          <Link 
            href="/privacy" 
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            Privacy Policy
          </Link>
          <Link 
            href="/data-security" 
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            Data Security
          </Link>
          <a 
            href="https://www.instagram.com/brezmarketing/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1 flex-shrink-0"
          >
            <Instagram className="w-3 h-3" />
            <span className="hidden xl:inline">Instagram</span>
          </a>
          <a 
            href="https://brezmarketing.net" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1 flex-shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden xl:inline">Website</span>
          </a>
        </div>
        
        {/* Version indicator for mobile */}
        <div className="sm:hidden flex items-center justify-center w-full">
          <span className="text-xs text-zinc-500 px-2 py-1 bg-[#2A2A2A] rounded border border-[#444]">
            {versionString}
          </span>
        </div>
      </div>
    </footer>
  )
}

export function Footer() {
  return (
    <FooterContent />
  )
} 