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
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  Calendar,
  Clock,
  ArrowRight,
  Users,
  Zap,
  Settings,
  Info
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
      specific_actions?: {
        adsets_to_scale?: string[]
        adsets_to_optimize?: string[]
        adsets_to_pause?: string[]
        ads_to_pause?: string[]
        ads_to_duplicate?: string[]
      }
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
    
    if (actionLower.includes('increase')) return <TrendingUp className="w-4 h-4" />
    if (actionLower.includes('reduce')) return <TrendingDown className="w-4 h-4" />
    if (actionLower.includes('optimize')) return <Target className="w-4 h-4" />
    if (actionLower.includes('budget')) return <BarChart3 className="w-4 h-4" />
    if (actionLower.includes('pause')) return <Clock className="w-4 h-4" />
    
    return <Settings className="w-4 h-4" />
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 8) return 'High Confidence'
    if (confidence >= 6) return 'Medium Confidence'
    return 'Low Confidence'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 8) return 'text-green-400'
    if (confidence >= 6) return 'text-yellow-400'
    return 'text-red-400'
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-gray-400" />
            Campaign Recommendation
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            AI-powered optimization recommendations for <span className="font-medium text-white">{campaign.campaign_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recommendation Summary */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  {getActionIcon(recommendation.action)}
                  Recommended Action
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className="bg-gray-800/50 text-gray-300 border-gray-600"
                >
                  {recommendation.action}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Confidence Level</p>
                  <p className={`text-base font-medium ${getConfidenceColor(recommendation.confidence)}`}>
                    {recommendation.confidence}/10 - {getConfidenceLabel(recommendation.confidence)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-300"
                      style={{ width: `${recommendation.confidence * 10}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400">{recommendation.confidence * 10}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis & Reasoning */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-400" />
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
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-400" />
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
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gray-400" />
                Implementation Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  {recommendation.implementation}
                </p>
                
                <Separator className="bg-gray-700" />
                
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                  <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-400" />
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

          {/* Specific Actions for AdSets and Ads */}
          {recommendation.specific_actions && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  Specific Actions Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* AdSet Actions */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-white border-b border-gray-700 pb-2">
                      AdSet Actions
                    </h4>
                    
                    {recommendation.specific_actions.adsets_to_scale && recommendation.specific_actions.adsets_to_scale.length > 0 && (
                      <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700">
                        <h5 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                          <TrendingUp className="w-3 h-3 text-gray-400" />
                          Scale Budget ({recommendation.specific_actions.adsets_to_scale.length})
                        </h5>
                        <ul className="text-sm text-gray-300 space-y-1">
                          {recommendation.specific_actions.adsets_to_scale.map((adset, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              {adset}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendation.specific_actions.adsets_to_optimize && recommendation.specific_actions.adsets_to_optimize.length > 0 && (
                      <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700">
                        <h5 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                          <Settings className="w-3 h-3 text-gray-400" />
                          Optimize Settings ({recommendation.specific_actions.adsets_to_optimize.length})
                        </h5>
                        <ul className="text-sm text-gray-300 space-y-1">
                          {recommendation.specific_actions.adsets_to_optimize.map((adset, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              {adset}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendation.specific_actions.adsets_to_pause && recommendation.specific_actions.adsets_to_pause.length > 0 && (
                      <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700">
                        <h5 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          Pause AdSets ({recommendation.specific_actions.adsets_to_pause.length})
                        </h5>
                        <ul className="text-sm text-gray-300 space-y-1">
                          {recommendation.specific_actions.adsets_to_pause.map((adset, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              {adset}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Ad Actions */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-white border-b border-gray-700 pb-2">
                      Ad Actions
                    </h4>
                    
                    {recommendation.specific_actions.ads_to_duplicate && recommendation.specific_actions.ads_to_duplicate.length > 0 && (
                      <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700">
                        <h5 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          Duplicate Ads ({recommendation.specific_actions.ads_to_duplicate.length})
                        </h5>
                        <ul className="text-sm text-gray-300 space-y-1">
                          {recommendation.specific_actions.ads_to_duplicate.map((ad, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              {ad}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendation.specific_actions.ads_to_pause && recommendation.specific_actions.ads_to_pause.length > 0 && (
                      <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700">
                        <h5 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          Pause Ads ({recommendation.specific_actions.ads_to_pause.length})
                        </h5>
                        <ul className="text-sm text-gray-300 space-y-1">
                          {recommendation.specific_actions.ads_to_pause.map((ad, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full" />
                              {ad}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(!recommendation.specific_actions.ads_to_duplicate || recommendation.specific_actions.ads_to_duplicate.length === 0) && 
                     (!recommendation.specific_actions.ads_to_pause || recommendation.specific_actions.ads_to_pause.length === 0) && (
                      <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700">
                        <p className="text-sm text-gray-400">No specific ad actions required at this time.</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Forecast */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
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
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Close
            </Button>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
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
                className="bg-white text-gray-900 hover:bg-gray-200"
              >
                {isImplementing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-900 border-t-transparent mr-2" />
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