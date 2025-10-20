"use client"

export const runtime = 'edge'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Store, Link, CheckCircle } from "lucide-react"

function ShopifyLinkContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()
  const shop = searchParams.get('shop')
  
  const [brands, setBrands] = useState<any[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [isLinking, setIsLinking] = useState(false)
  const [isLinked, setIsLinked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      // Fetch user's brands
      fetch('/api/brands')
        .then(res => res.json())
        .then(data => {
          setBrands(data.brands || [])
          if (data.brands?.length === 1) {
            setSelectedBrandId(data.brands[0].id)
          }
        })
        .catch(err => {
          console.error('Error fetching brands:', err)
          setError('Failed to load brands')
        })
    }
  }, [user])

  const handleLink = async () => {
    if (!selectedBrandId || !shop) {
      setError('Please select a brand')
      return
    }

    setIsLinking(true)
    setError(null)

    try {
      const response = await fetch('/api/shopify/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop,
          brandId: selectedBrandId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link store')
      }

      setIsLinked(true)
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err: any) {
      console.error('Error linking store:', err)
      setError(err.message || 'Failed to link store')
    } finally {
      setIsLinking(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <Card className="bg-[#1A1A1A] border-[#333]">
          <CardContent className="p-6">
            <p>Please sign in to link your Shopify store.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLinked) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <Card className="bg-[#1A1A1A] border-[#333] max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">Store Linked!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-400 mb-6">
                Your Shopify store <span className="text-white font-medium">{shop}</span> has been successfully linked to your Brez Marketing account.
              </p>
              <p className="text-sm text-gray-500">
                Redirecting to dashboard...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <Card className="bg-[#1A1A1A] border-[#333] max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <Link className="w-8 h-8 text-blue-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Link Your Store</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-400 mb-2">
                  Connect <span className="text-white font-medium">{shop}</span> to your Brez Marketing account
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Brand
                  </label>
                  <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                    <SelectTrigger className="bg-[#2A2A2A] border-[#444] text-white">
                      <SelectValue placeholder="Choose a brand..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2A2A2A] border-[#444]">
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id} className="text-white hover:bg-[#3A3A3A]">
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <Button 
                  onClick={handleLink}
                  disabled={!selectedBrandId || isLinking}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Linking Store...
                    </>
                  ) : (
                    <>
                      <Store className="w-4 h-4 mr-2" />
                      Link Store to Brand
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ShopifyLinkPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <ShopifyLinkContent />
    </Suspense>
  )
}
