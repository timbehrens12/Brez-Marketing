"use client"

import { Instagram, ExternalLink } from "lucide-react"
import Link from "next/link"

export function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="w-full bg-[#1A1A1A] border-t border-[#333] pt-4 pb-4 px-6">
      <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
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
        
        <div className="flex flex-wrap items-center gap-6">
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
            <span>Instagram</span>
          </a>
          <a 
            href="https://brezmarketing.net" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Website</span>
          </a>
        </div>
      </div>
    </footer>
  )
} 