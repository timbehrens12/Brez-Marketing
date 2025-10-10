'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Lock, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import type { Tier } from '@/lib/subscription/tier-access'

interface UpgradePromptProps {
  feature: string
  reason: string
  currentTier?: Tier
  recommendedTier?: Tier
  currentUsage?: number
  limit?: number
  fullPage?: boolean // If true, renders as full page. If false, renders as card
}

export function UpgradePrompt({
  feature,
  reason,
  currentTier,
  recommendedTier,
  currentUsage,
  limit,
  fullPage = true
}: UpgradePromptProps) {
  const tierNames: Record<Tier, string> = {
    dtc_owner: 'DTC Owner',
    beginner: 'Beginner',
    growing: 'Growing',
    scaling: 'Scaling',
    agency: 'Agency'
  }

  const tierPrices: Record<Tier, number> = {
    dtc_owner: 67,
    beginner: 97,
    growing: 397,
    scaling: 997,
    agency: 2997
  }

  const tierColors: Record<Tier, string> = {
    dtc_owner: '#6366f1',
    beginner: '#8b5cf6',
    growing: '#ec4899',
    scaling: '#f59e0b',
    agency: '#ef4444'
  }

  const content = (
    <div className={`${fullPage ? 'min-h-screen' : ''} flex items-center justify-center bg-[#0B0B0B] ${fullPage ? 'p-8' : ''}`}>
      {/* Glassmorphic card with red aura - matching loading pages */}
      <div className="relative z-10 w-full max-w-2xl mx-4">
        <div className="relative border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl shadow-[#FF2A2A]/20 bg-[#1f1f1f]">
          {/* Red aura glow around the card */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#FF2A2A]/20 via-[#FF2A2A]/30 to-[#FF2A2A]/20 blur-xl -z-10"></div>
          
          <div className="relative z-10">
            {/* Lock Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-[#FF2A2A]/20 blur-2xl rounded-full"></div>
                <div className="relative p-6 bg-[#2A2A2A] rounded-full border-2 border-[#FF2A2A]/30">
                  <Lock className="w-12 h-12 text-[#FF2A2A]" />
                </div>
              </div>
            </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
          {feature} Locked
        </h1>

        {/* Reason */}
        <p className="text-gray-400 text-center text-lg mb-8">
          {reason}
        </p>

        {/* Current Tier Badge */}
        {currentTier && (
          <div className="flex justify-center mb-8">
            <Badge 
              variant="outline" 
              className="px-4 py-2 text-sm"
              style={{ 
                borderColor: tierColors[currentTier],
                color: tierColors[currentTier]
              }}
            >
              Current Plan: {tierNames[currentTier]}
            </Badge>
          </div>
        )}

        {/* Usage Info (if provided) */}
        {typeof currentUsage !== 'undefined' && typeof limit !== 'undefined' && (
          <div className="bg-[#0B0B0B] border border-[#2A2A2A] rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Current Usage</span>
              <span className="text-white font-bold text-xl">
                {currentUsage} / {limit === 0 ? 'Not Available' : limit}
              </span>
            </div>
            {limit === 0 && (
              <p className="text-sm text-gray-500 mt-2">
                This feature is not included in your current plan
              </p>
            )}
          </div>
        )}

        {/* Recommended Tier */}
        {recommendedTier && (
          <div className="bg-gradient-to-br from-[#FF2A2A]/10 to-[#FF2A2A]/5 border-2 border-[#FF2A2A]/30 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-[#FF2A2A]" />
              <h3 className="text-xl font-bold text-white">Recommended Upgrade</h3>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-white font-bold text-2xl">{tierNames[recommendedTier]}</p>
                <p className="text-gray-400 text-sm">Unlock {feature} and more</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-2xl">${tierPrices[recommendedTier]}</p>
                <p className="text-gray-400 text-sm">/month</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span>Access to {feature}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span>All features from lower tiers</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span>30% off launch special pricing</span>
              </div>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/#pricing" className="flex-1">
            <Button 
              className="w-full bg-[#FF2A2A] hover:bg-[#ff4444] text-white font-bold py-6 text-lg"
            >
              View Pricing & Upgrade
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button 
              variant="outline"
              className="w-full border-[#2A2A2A] hover:bg-[#2A2A2A] text-white py-6 text-lg"
            >
              Back to Dashboard
            </Button>
          </Link>
        </div>

            {/* Help Text */}
            <p className="text-center text-gray-500 text-sm mt-6">
              Questions? <Link href="/help" className="text-[#FF2A2A] hover:underline">Contact Support</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  if (fullPage) {
    return content
  }

  return <div className="p-4">{content}</div>
}

