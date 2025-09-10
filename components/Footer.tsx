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

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  // Version information
  const packageVersion = "0.1.0" // This could be imported from package.json in a real setup
  const deploymentNumber = process.env.NEXT_PUBLIC_DEPLOYMENT_NUMBER || "5357"
  const gitHash = process.env.NEXT_PUBLIC_GIT_HASH || ""
  
  const versionString = `v${packageVersion}${deploymentNumber ? `.${deploymentNumber}` : ''}${gitHash ? ` (${gitHash.slice(0, 7)})` : ''}`
  
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
    <footer className="w-full bg-[#1A1A1A]/80 backdrop-blur-sm border-t border-[#333] pt-4 pb-4 px-6">
      <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="text-white">
            <img 
              src="https://i.imgur.com/PZCtbwG.png" 
              alt="[bm] dashboard" 
              className="h-8 w-auto"
            />
          </div>
          <span className="text-sm text-zinc-400">
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
        
        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 lg:gap-4">
          {/* Direct Feedback Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleFeedback}
            className="bg-[#2A2A2A] border-[#444] text-zinc-300 hover:bg-[#333] hover:text-white text-xs lg:text-sm"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Feedback
          </Button>
          
          {/* Legal links */}
          <Link 
            href="/terms" 
            className="text-xs lg:text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Terms of Service
          </Link>
          <Link 
            href="/privacy" 
            className="text-xs lg:text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Privacy Policy
          </Link>
          <Link 
            href="/data-security" 
            className="text-xs lg:text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Data Security
          </Link>
          <a 
            href="https://www.instagram.com/brezmarketing/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs lg:text-sm text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <Instagram className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="hidden md:inline">Instagram</span>
          </a>
          <a 
            href="https://brezmarketing.net" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs lg:text-sm text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3 lg:w-4 lg:h-4" />
            <span className="hidden md:inline">Website</span>
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