'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X } from 'lucide-react'
import { useUser } from '@clerk/nextjs'

type Tier = 'dtc_owner' | 'beginner' | 'growing' | 'scaling' | 'agency'
type BillingInterval = 'week' | 'month'

interface Subscription {
  tier: Tier
  tier_display_name: string
  status: string
  billing_interval: BillingInterval
  amount: number
  currency: string
  current_period_start: string
  current_period_end: string
}

interface TierLimits {
  tier: Tier
  max_brands: number
  lead_gen_monthly: number
  outreach_messages_monthly: number
  ai_chats_daily: number
  creative_gen_monthly: number
}

export default function TestTierPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [limits, setLimits] = useState<TierLimits | null>(null)
  const [selectedTier, setSelectedTier] = useState<Tier>('beginner')
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('month')

  const tiers: { value: Tier; label: string; price: number }[] = [
    { value: 'dtc_owner', label: 'DTC Owner', price: 67 },
    { value: 'beginner', label: 'Beginner', price: 97 },
    { value: 'growing', label: 'Growing', price: 397 },
    { value: 'scaling', label: 'Scaling', price: 997 },
    { value: 'agency', label: 'Agency', price: 2997 }
  ]

  const loadSubscription = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/test/set-tier')
      const data = await response.json()
      
      if (data.subscription) {
        setSubscription(data.subscription)
        setSelectedTier(data.subscription.tier)
        setSelectedInterval(data.subscription.billing_interval)
      }
      
      if (data.limits) {
        setLimits(data.limits)
      }
    } catch (error) {
      console.error('Error loading subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [])

  const handleSetTier = async () => {
    try {
      setUpdating(true)
      const response = await fetch('/api/test/set-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, billingInterval: selectedInterval })
      })

      const data = await response.json()
      
      if (data.success) {
        await loadSubscription()
        alert(`✅ ${data.message}`)
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error setting tier:', error)
      alert('❌ Failed to set tier')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF2A2A]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Tier Testing Dashboard</h1>
          <p className="text-gray-400">Test different subscription tiers and billing intervals</p>
          {user && (
            <Badge variant="outline" className="mt-2">
              User ID: {user.id}
            </Badge>
          )}
        </div>

        {/* Current Subscription */}
        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Current Subscription</h2>
          {subscription ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Tier</p>
                <p className="text-white font-bold text-lg">{subscription.tier_display_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Billing</p>
                <p className="text-white font-bold text-lg capitalize">{subscription.billing_interval}ly</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Price</p>
                <p className="text-white font-bold text-lg">${subscription.amount}/{subscription.billing_interval === 'week' ? 'wk' : 'mo'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                  {subscription.status}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No active subscription</p>
          )}
        </Card>

        {/* Usage Limits */}
        {limits && (
          <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Usage Limits</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Max Brands</p>
                <p className="text-white font-bold text-2xl">{limits.max_brands}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Leads/Month</p>
                <p className="text-white font-bold text-2xl">{limits.lead_gen_monthly}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Outreach/Month</p>
                <p className="text-white font-bold text-2xl">{limits.outreach_messages_monthly}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">AI Chats/Day</p>
                <p className="text-white font-bold text-2xl">{limits.ai_chats_daily}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Creatives/Month</p>
                <p className="text-white font-bold text-2xl">{limits.creative_gen_monthly}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Set Tier */}
        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Change Tier (Test Mode)</h2>
          
          {/* Tier Selection */}
          <div className="space-y-4 mb-6">
            <label className="text-gray-400 text-sm">Select Tier</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {tiers.map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => setSelectedTier(tier.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedTier === tier.value
                      ? 'border-[#FF2A2A] bg-[#FF2A2A]/10'
                      : 'border-[#2A2A2A] bg-[#0B0B0B] hover:border-[#3A3A3A]'
                  }`}
                >
                  <div className="text-white font-bold">{tier.label}</div>
                  <div className="text-gray-400 text-sm">${tier.price}/mo</div>
                  {selectedTier === tier.value && (
                    <Check className="w-4 h-4 text-[#FF2A2A] mx-auto mt-2" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Billing Interval Selection */}
          <div className="space-y-4 mb-6">
            <label className="text-gray-400 text-sm">Billing Interval</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedInterval('week')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedInterval === 'week'
                    ? 'border-[#FF2A2A] bg-[#FF2A2A]/10'
                    : 'border-[#2A2A2A] bg-[#0B0B0B] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="text-white font-bold">Weekly</div>
                <div className="text-gray-400 text-sm">10% premium</div>
                {selectedInterval === 'week' && (
                  <Check className="w-4 h-4 text-[#FF2A2A] mx-auto mt-2" />
                )}
              </button>
              <button
                onClick={() => setSelectedInterval('month')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedInterval === 'month'
                    ? 'border-[#FF2A2A] bg-[#FF2A2A]/10'
                    : 'border-[#2A2A2A] bg-[#0B0B0B] hover:border-[#3A3A3A]'
                }`}
              >
                <div className="text-white font-bold">Monthly</div>
                <div className="text-gray-400 text-sm">Standard pricing</div>
                {selectedInterval === 'month' && (
                  <Check className="w-4 h-4 text-[#FF2A2A] mx-auto mt-2" />
                )}
              </button>
            </div>
          </div>

          <Button
            onClick={handleSetTier}
            disabled={updating}
            className="w-full bg-[#FF2A2A] hover:bg-[#ff4444] text-white"
          >
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Apply Tier Change'
            )}
          </Button>
        </Card>

        {/* Instructions */}
        <Card className="bg-[#1A1A1A] border-[#2A2A2A] p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Testing Instructions</h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p>Select a tier and billing interval above, then click "Apply Tier Change"</p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p>Your usage limits will update immediately based on the selected tier</p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p>Test features like Lead Generator, Creative Studio, and Outreach Tool to see tier limits in action</p>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p>Weekly billing charges 10% more but provides the same monthly usage limits</p>
            </div>
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-400">This is a TEST endpoint - it does NOT process real payments</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

