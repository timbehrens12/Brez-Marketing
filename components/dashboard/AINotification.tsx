"use client"

import { BrainCircuit, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AINotificationProps {
  lastAnalyzedDate?: Date
}

export function AINotification({ lastAnalyzedDate = new Date() }: AINotificationProps) {
  return (
    <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-3 flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-500/20 rounded-full p-1.5">
          <BrainCircuit className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm text-gray-300">Your daily AI analysis is ready to view</p>
          <p className="text-xs text-gray-500">
            Last analyzed: {lastAnalyzedDate.toLocaleDateString()} at {lastAnalyzedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      <Link href="/ai-dashboard">
        <Button variant="outline" size="sm" className="bg-indigo-800/50 border-indigo-700 hover:bg-indigo-700 text-indigo-200">
          View Analysis
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </Link>
    </div>
  )
} 