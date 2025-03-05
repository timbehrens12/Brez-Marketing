"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Metrics } from "@/types/metrics"
import type { DateRange } from "react-day-picker"
import { useState, useEffect } from "react"
import { DollarSign, TrendingUp, Target, MousePointer, BarChart2, Activity, Users } from "lucide-react"
import Image from "next/image"
import { MetricCard } from "@/components/metrics/MetricCard"

interface TikTokTabProps {
  dateRange: DateRange | undefined
  metrics: any
  isLoading: boolean
  isRefreshingData?: boolean
  brandId: string
}

export function TikTokTab({ dateRange, metrics, isLoading, isRefreshingData = false, brandId }: TikTokTabProps) {
  return (
    <div className="space-y-8">
      {/* Platform Indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative flex items-center justify-center w-16 h-16 bg-[#111111] rounded-full border-2 border-[#FF0050] shadow-[0_0_15px_rgba(255,0,80,0.5)]">
          <Image 
            src="https://i.imgur.com/Jpip3Yl.png" 
            alt="TikTok" 
            width={40} 
            height={40} 
            className="object-contain"
          />
          <div className="absolute inset-0 rounded-full border-2 border-[#FF0050] animate-pulse"></div>
        </div>
      </div>
      
      {/* Coming Soon Message */}
      <div className="flex flex-col items-center justify-center p-12 bg-[#111111] border border-[#222222] rounded-lg">
        <Image 
          src="https://i.imgur.com/Jpip3Yl.png" 
          alt="TikTok logo" 
          width={64} 
          height={64} 
          className="mb-4"
        />
        <h2 className="text-2xl font-bold text-white mb-2">TikTok Analytics Coming Soon</h2>
        <p className="text-gray-400 text-center max-w-md">
          We're working on integrating TikTok analytics to provide you with comprehensive insights for your marketing campaigns.
        </p>
      </div>
    </div>
  )
} 