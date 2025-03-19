"use client"

import React from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { useNotifications } from '@/contexts/NotificationContext'

interface AINotificationProps {
  lastAnalyzedDate: Date
}

export function AINotification({ lastAnalyzedDate }: AINotificationProps) {
  const { addNotification } = useNotifications()
  
  // Format the date as "Month Day, Year"
  const formattedDate = format(lastAnalyzedDate, 'MMMM d, yyyy')
  
  // Add notification when user clicks on "View Analysis"
  const handleViewAnalysis = () => {
    addNotification({
      title: "AI Analysis Ready",
      message: `Your AI-powered performance analysis for ${formattedDate} has been viewed.`,
      type: 'ai',
      icon: <Sparkles className="h-4 w-4" />,
      link: '/dashboard/ai-analysis'
    })
  }
  
  return (
    <div className="bg-[#1E1E30] border border-[#2A2A40] rounded-lg p-4 mb-6 text-white">
      <div className="flex items-start">
        <div className="mr-4 p-2 bg-indigo-600/20 rounded-lg">
          <Sparkles className="h-6 w-6 text-indigo-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-medium mb-1">AI Analysis Ready</h3>
          <p className="text-sm text-gray-300 mb-3">
            Your AI-powered performance analysis for {formattedDate} is ready to view. 
            Our AI has analyzed your data and generated insights about your marketing performance.
          </p>
          <Link href="/dashboard/ai-analysis" onClick={handleViewAnalysis}>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none" 
              size="sm"
            >
              View Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 