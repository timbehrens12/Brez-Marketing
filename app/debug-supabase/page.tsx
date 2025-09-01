"use client"

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import { supabase } from '@/lib/supabase'
import { useSupabase } from '@/lib/hooks/useSupabase'

export default function DebugSupabasePage() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  
  useEffect(() => {
    console.log('🔍 SUPABASE CLIENT DEBUG TEST')
    
    // Test all three client sources
    const client1 = getSupabaseClient()
    const client2 = supabase
    const client3 = useSupabase()
    
    console.log('Client 1 (getSupabaseClient):', client1)
    console.log('Client 2 (supabase):', client2)
    console.log('Client 3 (useSupabase):', client3)
    
    // Check if they're the same instance
    const areClient1And2Same = client1 === client2
    const areClient1And3Same = client1 === client3
    const areClient2And3Same = client2 === client3
    
    console.log('Are client1 and client2 the same instance?', areClient1And2Same)
    console.log('Are client1 and client3 the same instance?', areClient1And3Same)
    console.log('Are client2 and client3 the same instance?', areClient2And3Same)
    
    // Check for GoTrue clients on window
    const windowKeys = Object.keys(window).filter(key => 
      key.includes('supabase') || key.includes('gotrue') || key.includes('GoTrue')
    )
    
    console.log('Window keys related to Supabase/GoTrue:', windowKeys)
    
    setDebugInfo({
      areClient1And2Same,
      areClient1And3Same,
      areClient2And3Same,
      allSameInstance: areClient1And2Same && areClient1And3Same && areClient2And3Same,
      windowKeys,
      clientCount: new Set([client1, client2, client3]).size
    })
  }, [])
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase Client Debug</h1>
      
      <div className="bg-gray-900 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Client Instance Test</h2>
        
        <div className="space-y-2 text-sm font-mono">
          <div>
            <span className="text-gray-400">Client 1 === Client 2:</span>{' '}
            <span className={debugInfo.areClient1And2Same ? 'text-green-400' : 'text-red-400'}>
              {debugInfo.areClient1And2Same ? '✅ Same' : '❌ Different'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-400">Client 1 === Client 3:</span>{' '}
            <span className={debugInfo.areClient1And3Same ? 'text-green-400' : 'text-red-400'}>
              {debugInfo.areClient1And3Same ? '✅ Same' : '❌ Different'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-400">Client 2 === Client 3:</span>{' '}
            <span className={debugInfo.areClient2And3Same ? 'text-green-400' : 'text-red-400'}>
              {debugInfo.areClient2And3Same ? '✅ Same' : '❌ Different'}
            </span>
          </div>
          
          <div className="pt-2 border-t border-gray-700">
            <span className="text-gray-400">All Same Instance:</span>{' '}
            <span className={debugInfo.allSameInstance ? 'text-green-400' : 'text-red-400'}>
              {debugInfo.allSameInstance ? '✅ SUCCESS' : '❌ FAILED'}
            </span>
          </div>
          
          <div>
            <span className="text-gray-400">Unique Client Count:</span>{' '}
            <span className={debugInfo.clientCount === 1 ? 'text-green-400' : 'text-red-400'}>
              {debugInfo.clientCount} {debugInfo.clientCount === 1 ? '(Good)' : '(Bad - Multiple instances!)'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Window Object Analysis</h2>
        
        <div className="text-sm font-mono">
          <div className="text-gray-400 mb-2">Supabase/GoTrue related keys:</div>
          {debugInfo.windowKeys?.length > 0 ? (
            <ul className="list-disc list-inside text-gray-300">
              {debugInfo.windowKeys.map((key: string, index: number) => (
                <li key={index}>{key}</li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500">None found</div>
          )}
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-blue-950/30 border border-blue-900/50 rounded">
        <h3 className="font-semibold text-blue-300 mb-2">Expected Result:</h3>
        <p className="text-blue-200 text-sm">
          All client instances should be the same object (✅ SUCCESS) and unique client count should be 1. 
          This will eliminate the "Multiple GoTrueClient instances" warning and help fix React error #310.
        </p>
      </div>
    </div>
  )
} 