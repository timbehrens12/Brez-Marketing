"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Store, ArrowRight, BarChart3, Brain, Zap } from "lucide-react"

function ShopifySuccessContent() {
  const searchParams = useSearchParams()
  const shop = searchParams.get('shop')

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white relative">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <Card className="bg-[#1A1A1A] border-[#333] max-w-2xl w-full">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-green-600/30 border border-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold mb-4 text-green-400">
              Installation Successful!
            </CardTitle>
            <p className="text-gray-400 text-lg">
              Brez Marketing has been successfully installed to your Shopify store
            </p>
            {shop && (
              <div className="mt-4 p-3 bg-[#222] border border-[#333] rounded-lg">
                <p className="text-sm text-gray-300">
                  Connected store: <span className="font-semibold text-white">{shop}</span>
                </p>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Next Steps */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">What's next?</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-[#222] border border-[#333] rounded-lg">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">1</div>
                  <div>
                    <p className="font-medium">Data Sync Starting</p>
                    <p className="text-sm text-gray-400">We're now importing your store data and will have insights ready within 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-[#222] border border-[#333] rounded-lg">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">2</div>
                  <div>
                    <p className="font-medium">Create Your Account</p>
                    <p className="text-sm text-gray-400">Sign up for Brez Marketing to access your analytics dashboard</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-[#222] border border-[#333] rounded-lg">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">3</div>
                  <div>
                    <p className="font-medium">Start Optimizing</p>
                    <p className="text-sm text-gray-400">Get AI-powered recommendations to improve your store performance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-4">
              <Button 
                className="w-full bg-white text-black hover:bg-gray-200 py-3 text-lg font-semibold"
                onClick={() => window.location.href = `/shopify/link?shop=${shop}`}
              >
                Link to Your Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button 
                variant="outline"
                className="w-full border-[#333] text-gray-300 hover:bg-[#222] py-3"
                onClick={() => window.open(`https://${shop}/admin/apps`, '_blank')}
              >
                <Store className="w-5 h-5 mr-2" />
                Back to Shopify Admin
              </Button>
            </div>

            {/* Features Preview */}
            <div className="border-t border-[#333] pt-6">
              <h3 className="font-semibold mb-4">Available in your dashboard:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-sm font-medium">Analytics</p>
                </div>
                
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-purple-600/30 border border-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-sm font-medium">AI Insights</p>
                </div>
                
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-green-600/30 border border-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-sm font-medium">Automation</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ShopifySuccessPage() {
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
      <ShopifySuccessContent />
    </Suspense>
  )
}
