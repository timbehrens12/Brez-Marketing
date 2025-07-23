"use client"

import { useState } from 'react'
import { BrainCircuit, ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { format } from 'date-fns'
import { useNotifications } from '@/contexts/NotificationContext'

interface AINotificationProps {
  lastAnalyzedDate: Date
}

export function AINotification({ lastAnalyzedDate }: AINotificationProps) {
  const [dismissed, setDismissed] = useState(false)
  const { addNotification } = useNotifications()
  
  // Format the date for display
  const formattedDate = format(lastAnalyzedDate, 'MMMM d, yyyy')
  const formattedTime = format(lastAnalyzedDate, 'h:mm a')
  
  if (dismissed) {
    return null
  }
  
  const handleViewAnalysis = () => {
    // Add a notification about viewing the AI analysis
    addNotification({
      title: "AI Analysis Viewed",
      message: "You've viewed your latest AI-powered performance analysis.",
      type: "ai",
      icon: <BrainCircuit className="h-4 w-4" />,
      link: "/dashboard/analysis"
    })
    
    // Dismiss the notification
    setDismissed(true)
  }
  
  return (
    <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-lg p-4 mb-6 relative overflow-hidden">
      <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600/30 p-2 rounded-full">
            <BrainCircuit className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">Your daily AI analysis is ready to view</h3>
            <p className="text-sm text-indigo-200/70">
              Last updated: {formattedDate} at {formattedTime}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setDismissed(true)} 
            variant="ghost" 
            size="sm"
            className="bg-indigo-950/50 hover:bg-indigo-900/50 text-indigo-200"
          >
            Dismiss
          </Button>
          <Link href="/dashboard/analysis">
            <Button 
              onClick={handleViewAnalysis}
              variant="secondary"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
            >
              View Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Abstract decorative elements */}
      <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-600/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -top-6 -left-6 w-24 h-24 bg-indigo-600/10 rounded-full blur-xl pointer-events-none" />
    </div>
  )
} 