"use client"

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, Zap, Sparkles } from 'lucide-react'

export default function SiteOptimizerPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Globe className="h-8 w-8 text-blue-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Site Optimizer</h1>
          <p className="text-gray-400">AI-powered website optimization and conversion tools</p>
        </div>
      </div>

      <Card className="bg-[#1A1A1A] border-[#333]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            Coming Soon
          </CardTitle>
          <CardDescription className="text-gray-400">
            The Site Optimizer is currently under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-gray-300">
              <h3 className="font-semibold text-lg mb-2">What's Coming:</h3>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  Website performance analysis
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  Conversion rate optimization suggestions
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  SEO improvement recommendations
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-400" />
                  Real-time optimization monitoring
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 