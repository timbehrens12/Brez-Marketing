"use client"

import { useEffect, useState } from "react"
import { useSupabase } from "@/lib/hooks/useSupabase"
import { useBrandContext } from "@/lib/context/BrandContext"
import { useAgency } from "@/contexts/AgencyContext"
import { Users, Database, TrendingUp, UserCheck, Heart, Target } from "lucide-react"

export default function CustomersPage() {
  const { selectedBrandId } = useBrandContext()
  const supabase = useSupabase()
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState<string>('Initializing Customer Analytics')
  const [loadingProgress, setLoadingProgress] = useState(0)
  const { agencySettings } = useAgency()

  useEffect(() => {
    // Progressive loading simulation for customers
    const loadCustomerData = async () => {
      // Phase 1: Initialize Customer Analytics
      setLoadingPhase('Initializing Customer Analytics')
      setLoadingProgress(15)
      await new Promise(resolve => setTimeout(resolve, 600))

      // Phase 2: Loading Customer Database
      setLoadingPhase('Loading customer database')
      setLoadingProgress(35)
      await new Promise(resolve => setTimeout(resolve, 800))

      // Phase 3: Analyzing Customer Segments
      setLoadingPhase('Analyzing customer segments')
      setLoadingProgress(60)
      await new Promise(resolve => setTimeout(resolve, 700))

      // Phase 4: Processing Behavior Data
      setLoadingPhase('Processing behavior patterns')
      setLoadingProgress(80)
      await new Promise(resolve => setTimeout(resolve, 600))

      // Phase 5: Finalizing
      setLoadingPhase('Preparing customer insights')
      setLoadingProgress(95)
      await new Promise(resolve => setTimeout(resolve, 400))

      setLoadingProgress(100)
      setLoadingPhase('Customer analytics ready!')
      
      // Brief pause to show completion
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setIsLoadingPage(false)
    }

    loadCustomerData()
  }, [])

  // Show progressive loading state
  if (isLoadingPage) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A] flex items-center justify-center z-50">
        <div className="text-center space-y-8 max-w-md mx-auto px-6">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            {agencySettings?.agency_logo_url ? (
              <img 
                src={agencySettings.agency_logo_url} 
                alt={agencySettings.agency_name || 'Agency'}
                className="h-12 w-auto"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          {/* Main Loading Animation */}
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
              <div className="absolute inset-2 bg-gradient-to-br from-green-500/20 to-blue-600/20 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-white animate-pulse" />
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            
            {/* Loading Phase */}
            <h2 className="text-xl font-semibold text-white mb-2 animate-pulse">
              {loadingPhase}
            </h2>
            <p className="text-gray-400 text-sm mb-6">
              {loadingProgress}% complete
            </p>
          </div>

          {/* Loading Steps */}
          <div className="text-left space-y-2 text-sm text-gray-400">
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 15 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 15 ? 'bg-green-400' : 'bg-white/20'}`}></div>
              <Database className="w-4 h-4" />
              <span>Loading customer database</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 35 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 35 ? 'bg-green-400' : 'bg-white/20'}`}></div>
              <Target className="w-4 h-4" />
              <span>Analyzing customer segments</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 60 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 60 ? 'bg-green-400' : 'bg-white/20'}`}></div>
              <TrendingUp className="w-4 h-4" />
              <span>Processing behavior patterns</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 80 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 80 ? 'bg-green-400' : 'bg-white/20'}`}></div>
              <UserCheck className="w-4 h-4" />
              <span>Preparing customer insights</span>
            </div>
            <div className={`flex items-center gap-3 transition-colors duration-300 ${loadingProgress >= 95 ? 'text-gray-300' : ''}`}>
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${loadingProgress >= 95 ? 'bg-green-400' : 'bg-white/20'}`}></div>
              <Heart className="w-4 h-4" />
              <span>Customer analytics ready</span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Customers</h1>
      {/* Add your customers content here */}
    </div>
  )
} 