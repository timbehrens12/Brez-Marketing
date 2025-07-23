"use client"

import React from 'react'

export function LoadingSkeleton() {
  return (
    <div className="w-full animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-800/50 p-4 rounded-lg h-24">
            <div className="h-3 w-24 bg-gray-700 rounded mb-2"></div>
            <div className="h-6 w-16 bg-gray-700 rounded mb-2"></div>
            <div className="h-3 w-20 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
      
      <div className="bg-gray-800/50 p-4 rounded-lg mb-6 h-48">
        <div className="h-4 w-32 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 w-full bg-gray-700 rounded"></div>
          <div className="h-3 w-full bg-gray-700 rounded"></div>
          <div className="h-3 w-3/4 bg-gray-700 rounded"></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800/50 p-4 rounded-lg h-64">
          <div className="h-4 w-32 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-24 bg-gray-700 rounded"></div>
                <div className="h-3 w-16 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg h-64">
          <div className="h-4 w-32 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-24 bg-gray-700 rounded"></div>
                <div className="h-3 w-16 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 