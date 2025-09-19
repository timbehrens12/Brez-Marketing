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
  const [versionString, setVersionString] = useState("v0.1.0.5357")
  
  useEffect(() => {
    // Update version string on client side only
    const packageVersion = "0.1.0"
    const deploymentNumber = process.env.NEXT_PUBLIC_DEPLOYMENT_NUMBER || "5357"
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
    <footer className={`w-full bg-[#1A1A1A]/80 backdrop-blur-sm border-t border-[#333] px-4 lg:px-6 transition-all duration-300 mt-auto ${
      sidebarExpanded ? 'py-3' : 'py-2.5'
    }`}>
      <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-2 lg:gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="text-white">
              <img 
                src="https://i.imgur.com/j4AQPxj.png" 
                alt="[bm] dashboard" 
                className="h-6 lg:h-8 w-auto"
              />
            </div>
            <span className="text-xs lg:text-sm text-zinc-400 whitespace-nowrap">
              © {currentYear} Brez Marketing
            </span>
          </div>
          
          {/* Version indicator */}
          <div className="hidden sm:flex items-center">
            <span className="text-xs text-zinc-500 px-2 py-0.5 bg-[#2A2A2A] rounded border border-[#444]">
              {versionString}
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-1.5 lg:gap-3">
          {/* Direct Feedback Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleFeedback}
            className="bg-[#2A2A2A] border-[#444] text-zinc-300 hover:bg-[#333] hover:text-white text-xs px-2 py-1 h-auto"
          >
            <MessageSquare className="w-3 h-3 mr-1.5" />
            Feedback
          </Button>
          
          {/* Legal links - more compact */}
          <Link 
            href="/terms" 
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors whitespace-nowrap"
          >
            Terms
          </Link>
          <Link 
            href="/privacy" 
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors whitespace-nowrap"
          >
            Privacy
          </Link>
          <Link 
            href="/data-security" 
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors whitespace-nowrap"
          >
            Security
          </Link>
          <a 
            href="https://www.instagram.com/brezmarketing/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <Instagram className="w-3 h-3" />
            <span className="hidden lg:inline">IG</span>
          </a>
          <a 
            href="https://brezmarketing.net" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden lg:inline">Site</span>
          </a>
        </div>
        
        {/* Version indicator for mobile */}
        <div className="sm:hidden flex items-center justify-center w-full mt-1">
          <span className="text-xs text-zinc-500 px-2 py-0.5 bg-[#2A2A2A] rounded border border-[#444]">
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