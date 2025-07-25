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
  const deploymentNumber = process.env.NEXT_PUBLIC_DEPLOYMENT_NUMBER || "4481"
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
    // Option 2: Simple mailto for now
    window.open('mailto:support@brezmarketing.com?subject=Feedback - Brez Dashboard', '_blank')
  }
  
  return (
    <footer className="w-full bg-[#1A1A1A] border-t border-[#333] pt-4 pb-4 px-6">
      <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
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
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Feature Request/Bug Report Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-[#2A2A2A] border-[#444] text-zinc-300 hover:bg-[#333] hover:text-white"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Feedback
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#2A2A2A] border-[#444]">
              <DropdownMenuItem 
                onClick={handleFeatureRequest}
                className="text-zinc-300 hover:bg-[#333] hover:text-white cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Feature Request
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleBugReport}
                className="text-zinc-300 hover:bg-[#333] hover:text-white cursor-pointer"
              >
                <Bug className="w-4 h-4 mr-2" />
                Report Bug
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleFeedback}
                className="text-zinc-300 hover:bg-[#333] hover:text-white cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                General Feedback
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Existing links */}
          <Link 
            href="/terms" 
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Terms of Service
          </Link>
          <Link 
            href="/privacy" 
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Privacy Policy
          </Link>
          <a 
            href="https://www.instagram.com/brezmarketing/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <Instagram className="w-4 h-4" />
            <span className="hidden sm:inline">Instagram</span>
          </a>
          <a 
            href="https://brezmarketing.net" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Website</span>
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