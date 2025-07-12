"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  Calendar,
  Zap
} from "lucide-react"

interface CampaignRecommendationModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: {
    campaign_name: string
    campaign_id: string
    recommendation?: {
      action: string
      reasoning: string
      impact: string
      confidence: number
      implementation: string
      forecast: string
    }
  } | null
}

export default function CampaignRecommendationModal({ 
  isOpen, 
  onClose, 
  campaign 
}: CampaignRecommendationModalProps) {
  const [isImplementing, setIsImplementing] = useState(false)

  if (!campaign?.recommendation) return null

  const { recommendation } = campaign
  
  const getActionIcon = (action: string) => {
    const actionLower = action.toLowerCase()
    
    if (actionLower.includes('increase')) return <TrendingUp className="w-5 h-5 text-green-400" />
    if (actionLower.includes('reduce')) return <TrendingDown className="w-5 h-5 text-red-400" />
    if (actionLower.includes('optimize')) return <Target className="w-5 h-5 text-blue-400" />
    if (actionLower.includes('budget')) return <DollarSign className="w-5 h-5 text-yellow-400" />
    if (actionLower.includes('pause')) return <AlertCircle className="w-5 h-5 text-orange-400" />
    
    return <BarChart3 className="w-5 h-5 text-purple-400" />
  }

  const getActionColor = (action: string) => {
    const actionLower = action.toLowerCase()
    
    if (actionLower.includes('increase')) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (actionLower.includes('reduce')) return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (actionLower.includes('optimize')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    if (actionLower.includes('budget')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    if (actionLower.includes('pause')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    
    return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) return 'text-green-400'
    if (confidence >= 6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 8) return 'High Confidence'
    if (confidence >= 6) return 'Medium Confidence'
    return 'Low Confidence'
  }

  const handleImplement = async () => {
    setIsImplementing(true)
    
    // Simulate implementation process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsImplementing(false)
    // In a real implementation, this would trigger the actual campaign changes
    // For now, we'll just show success and close the modal
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-[#333]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Lightbulb className="w-6 h-6 text-yellow-400" />
            AI Campaign Recommendation
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Detailed analysis and implementation guidance for <span className="font-semibold text-white">{campaign.campaign_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Recommendation Summary */}
          <Card className="bg-[#111] border-[#333]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  {getActionIcon(recommendation.action)}
                  Recommended Action
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={`${getActionColor(recommendation.action)} text-sm px-3 py-1`}
                >
                  {recommendation.action}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Confidence Level</p>
                  <p className={`text-lg font-semibold ${getConfidenceColor(recommendation.confidence)}`}>
                    {recommendation.confidence}/10 - {getConfidenceLabel(recommendation.confidence)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${recommendation.confidence * 10}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400">{recommendation.confidence * 10}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis & Reasoning */}
          <Card className="bg-[#111] border-[#333]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Analysis & Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">
                {recommendation.reasoning}
              </p>
            </CardContent>
          </Card>

          {/* Expected Impact */}
          <Card className="bg-[#111] border-[#333]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Expected Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">
                {recommendation.impact}
              </p>
            </CardContent>
          </Card>

          {/* Implementation Guide */}
          <Card className="bg-[#111] border-[#333]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Implementation Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  {recommendation.implementation}
                </p>
                
                <Separator className="bg-[#333]" />
                
                <div className="bg-[#0a0a0a] p-4 rounded-lg border border-[#333]">
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    Important Note
                  </h4>
                  <p className="text-sm text-gray-400">
                    Always monitor campaign performance closely after implementing changes. 
                    Allow 3-5 days for data to stabilize before making additional adjustments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Forecast */}
          <Card className="bg-[#111] border-[#333]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                Performance Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">
                {recommendation.forecast}
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-[#333] text-gray-400 hover:text-white hover:bg-[#333]"
            >
              Close
            </Button>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="border-[#333] text-gray-400 hover:text-white hover:bg-[#333]"
                onClick={() => {
                  // In a real implementation, this would save the recommendation for later
                  console.log('Recommendation saved for later review')
                }}
              >
                Save for Later
              </Button>
              
              <Button 
                onClick={handleImplement}
                disabled={isImplementing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isImplementing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Implementing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Implement Recommendation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 