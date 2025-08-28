"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Rocket, 
  Settings, 
  Building2, 
  FileSignature, 
  Link2, 
  Users, 
  CheckCircle,
  ArrowRight,
  Sparkles,
  Target,
  TrendingUp,
  FileText,
  Calendar,
  Upload,
  Check,
  X,
  Image,
  User
} from 'lucide-react'
import Link from 'next/link'
import { useAgency } from "@/contexts/AgencyContext"
import { toast } from "react-hot-toast"

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)
  
  // Agency context and settings
  const { agencySettings, updateAgencySettings, agencyLoading } = useAgency()
  
  // Form state for embedded functionality
  const [tempAgencyName, setTempAgencyName] = useState(agencySettings.agency_name || '')
  const [tempAgencyLogo, setTempAgencyLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [tempSignatureImage, setTempSignatureImage] = useState<File | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)
  const [tempSignatureName, setTempSignatureName] = useState(agencySettings.signature_name || '')
  const [isSaving, setIsSaving] = useState(false)

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  // Handle logo file selection
  const handleLogoChange = async (file: File | null) => {
    setTempAgencyLogo(file)
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setLogoPreview(base64)
      } catch (error) {
        console.error('Error converting file to base64:', error)
        toast.error('Failed to process image file')
      }
    } else {
      setLogoPreview(null)
    }
  }

  // Handle signature file selection
  const handleSignatureChange = async (file: File | null) => {
    setTempSignatureImage(file)
    if (file) {
      try {
        const base64 = await fileToBase64(file)
        setSignaturePreview(base64)
      } catch (error) {
        console.error('Error converting file to base64:', error)
        toast.error('Failed to process image file')
      }
    } else {
      setSignaturePreview(null)
    }
  }

  // Save agency settings
  const handleSaveAgencySettings = async () => {
    if (!tempAgencyName.trim()) {
      toast.error('Agency name is required')
      return false
    }

    setIsSaving(true)
    
    try {
      let logoUrl = agencySettings.agency_logo_url
      let signatureUrl = agencySettings.signature_image

      // Handle logo changes
      if (tempAgencyLogo) {
        logoUrl = await fileToBase64(tempAgencyLogo)
      }

      // Handle signature changes
      if (tempSignatureImage) {
        signatureUrl = await fileToBase64(tempSignatureImage)
      }

      const success = await updateAgencySettings({
        agency_name: tempAgencyName.trim(),
        agency_logo_url: logoUrl,
        signature_name: tempSignatureName.trim() || undefined,
        signature_image: signatureUrl
      })

      if (success) {
        toast.success('Agency settings saved successfully!')
        return true
      } else {
        toast.error('Failed to save agency settings')
        return false
      }
    } catch (error) {
      console.error('Error saving agency settings:', error)
      toast.error('An error occurred while saving')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  // Sync temp values with agency settings when they change
  useEffect(() => {
    setTempAgencyName(agencySettings.agency_name || '')
    setTempSignatureName(agencySettings.signature_name || '')
  }, [agencySettings.agency_name, agencySettings.signature_name])

  // Redirect if not authenticated and clear the showOnboarding flag
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/login')
      return
    }

    // Clear the showOnboarding flag when user visits onboarding page
    if (isLoaded && user && user.unsafeMetadata?.showOnboarding === true) {
      console.log('[Onboarding] Clearing showOnboarding flag')
      user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          showOnboarding: false
        }
      }).catch(error => {
        console.error('[Onboarding] Error clearing showOnboarding flag:', error)
      })
    }
  }, [isLoaded, user, router])

  const handleCompleteOnboarding = async () => {
    setIsCompleting(true)
    
    // Mark onboarding as completed in user metadata
    try {
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString()
        }
      })
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    } catch (error) {
      console.error('Error completing onboarding:', error)
      // Still redirect even if metadata update fails
      router.push('/dashboard')
    }
  }

  const additionalSteps = [
    {
      icon: <Link2 className="w-6 h-6" />,
      title: "Connect Your First Brand",
      description: "Link Meta Ads and Shopify accounts to start analyzing performance",
      action: "Connect Platforms",
      priority: "High"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Invite Team Members",
      description: "Add team members and manage permissions for collaborative work",
      action: "Manage Team",
      priority: "Optional"
    }
  ]

  const features = [
    {
      icon: <Target className="w-5 h-5" />,
      title: "AI Marketing Consultant",
      description: "Get real-time insights and recommendations for every client"
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Automated Reporting",
      description: "Generate professional reports with your branding automatically"
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "AI Creative Generation",
      description: "Create stunning ad backgrounds and visuals with AI"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Lead Outreach Tools",
      description: "Find and convert high-quality prospects with automated outreach"
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Brand Performance Analytics",
      description: "Deep insights into Meta Ads, Shopify, and cross-platform data"
    },
    {
      icon: <Calendar className="w-5 h-5" />,
      title: "Scheduled Reports",
      description: "Automatically send branded reports to clients on schedule"
    }
  ]

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] flex items-center justify-center animate-in fade-in duration-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] py-12 px-4 animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#333] to-[#222] rounded-2xl flex items-center justify-center shadow-2xl border border-[#444]">
              <Rocket className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Welcome to Brez Marketing! 🚀
          </h1>
          
          <p className="text-xl text-gray-300 mb-2">
            You're just <span className="text-white font-semibold">one click away</span> from becoming a 
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent font-bold"> full-scale marketing agency</span>
          </p>
          
          <p className="text-gray-400 max-w-2xl mx-auto">
            Let's get your agency set up with everything you need to impress clients, 
            automate workflows, and scale your business like never before.
          </p>
        </div>

        {/* Agency Setup Section */}
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333] rounded-2xl mb-8 shadow-2xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <Building2 className="w-6 h-6 text-blue-400" />
              Agency Setup
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">Essential</Badge>
            </CardTitle>
            <p className="text-gray-400">
              Set up your agency identity - this will be used across all reports and client materials
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Agency Name Input */}
            <div className="space-y-3">
              <Label htmlFor="agency-name" className="text-white font-medium">
                Agency Name *
              </Label>
              <Input 
                id="agency-name"
                value={tempAgencyName}
                onChange={(e) => setTempAgencyName(e.target.value)}
                placeholder="Enter your agency name"
                className="h-11 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 rounded-xl"
                disabled={agencyLoading || isSaving}
              />
              {tempAgencyName && (
                <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#333]">
                  <p className="text-white font-medium">
                    {tempAgencyName}
                  </p>
                  <p className="text-gray-400 text-sm">Marketing Dashboard Report</p>
                </div>
              )}
            </div>

            {/* Agency Logo Upload */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="text-white font-medium">Agency Logo</Label>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/30 text-xs">
                  High Priority
                </Badge>
              </div>
              <p className="text-gray-400 text-sm">
                If you don't upload a logo, we'll use your agency name initials as a fallback
              </p>
              
              {(agencySettings.agency_logo_url || logoPreview) ? (
                <div className="space-y-3">
                  <div className="relative group">
                    <div className="w-full h-36 rounded-xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center p-4 overflow-hidden">
                      <img 
                        src={logoPreview || agencySettings.agency_logo_url!} 
                        alt="Agency Logo" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTempAgencyLogo(null)
                        setLogoPreview(null)
                      }}
                      className="absolute top-2 right-2 bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 w-8 h-8 p-0"
                      disabled={agencyLoading || isSaving}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                    className="h-10 bg-[#1a1a1a] border-[#333] text-white file:bg-[#333] file:text-gray-300 file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 rounded-xl"
                    disabled={agencyLoading || isSaving}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative group cursor-pointer">
                    <div className="w-full h-36 rounded-xl bg-[#1a1a1a] border-2 border-dashed border-[#333] flex items-center justify-center p-4 transition-all duration-200 hover:border-[#444] hover:bg-[#222]">
                      <div className="text-center max-w-full">
                        <div className="w-12 h-12 rounded-xl bg-[#333] flex items-center justify-center mx-auto mb-3 group-hover:bg-[#444] transition-colors">
                          <Upload className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-white font-medium mb-1">Upload Agency Logo</p>
                        <p className="text-gray-400 text-sm">
                          Click to browse or drag and drop
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          PNG, JPG up to 2MB
                        </p>
                      </div>
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={agencyLoading || isSaving}
                    />
                  </div>
                  <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                    <p className="text-sm text-gray-400 mb-1">
                      <strong className="text-white">Recommended:</strong> Square format (1:1 ratio) for best results
                    </p>
                    <p className="text-xs text-gray-500">
                      Maximum file size: 2MB • Optimal dimensions: 400x400px
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Digital Signature Setup */}
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333] rounded-2xl mb-8 shadow-2xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <FileSignature className="w-6 h-6 text-blue-400" />
              Digital Signature
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">High Priority</Badge>
            </CardTitle>
            <p className="text-gray-400">
              Add your signature for professional contracts and proposals
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Signature Name Input */}
            <div className="space-y-3">
              <Label htmlFor="signature-name" className="text-white font-medium">
                Your Name
              </Label>
              <Input 
                id="signature-name"
                value={tempSignatureName}
                onChange={(e) => setTempSignatureName(e.target.value)}
                placeholder="Enter your full name"
                className="h-11 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500 focus:border-white/30 rounded-xl"
                disabled={agencyLoading || isSaving}
              />
            </div>

            {/* Signature Image Upload */}
            <div className="space-y-3">
              <Label className="text-white font-medium">Signature Image</Label>
              
              {(agencySettings.signature_image || signaturePreview) ? (
                <div className="space-y-3">
                  <div className="relative group">
                    <div className="w-full h-32 rounded-xl bg-white border border-[#333] flex items-center justify-center p-4 overflow-hidden">
                      <img 
                        src={signaturePreview || agencySettings.signature_image!} 
                        alt="Signature" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTempSignatureImage(null)
                        setSignaturePreview(null)
                      }}
                      className="absolute top-2 right-2 bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30 w-8 h-8 p-0"
                      disabled={agencyLoading || isSaving}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSignatureChange(e.target.files?.[0] || null)}
                    className="h-10 bg-[#1a1a1a] border-[#333] text-white file:bg-[#333] file:text-gray-300 file:border-0 file:rounded-lg file:px-3 file:py-1 file:mr-3 rounded-xl"
                    disabled={agencyLoading || isSaving}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative group cursor-pointer">
                    <div className="w-full h-32 rounded-xl bg-white border-2 border-dashed border-[#333] flex items-center justify-center p-4 transition-all duration-200 hover:border-[#444]">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-[#f0f0f0] flex items-center justify-center mx-auto mb-3 group-hover:bg-[#e0e0e0] transition-colors">
                          <FileSignature className="w-6 h-6 text-gray-600" />
                        </div>
                        <p className="text-gray-800 font-medium mb-1">Upload Signature</p>
                        <p className="text-gray-600 text-sm">
                          Click to browse or drag and drop
                        </p>
                      </div>
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSignatureChange(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={agencyLoading || isSaving}
                    />
                  </div>
                  <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#333]">
                    <p className="text-sm text-gray-400 mb-1">
                      <strong className="text-white">Tips:</strong> Use a white background with dark signature
                    </p>
                    <p className="text-xs text-gray-500">
                      Maximum file size: 1MB • Recommended format: PNG
                    </p>
                  </div>
                </div>
              )}

              {/* Signature Preview */}
              {(tempSignatureName || tempAgencyName) && (
                <div className="bg-[#0f0f0f] rounded-xl p-4 border border-[#333]">
                  <p className="text-gray-400 text-sm mb-3">Preview:</p>
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-gray-800 font-medium">
                          {tempSignatureName || "Your Name"}
                        </p>
                        <p className="text-gray-600 text-sm">
                          {tempAgencyName || "Your Agency"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-600 text-xs">Date: {new Date().toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t border-[#333]">
              <p className="text-gray-400 text-sm">
                Complete your agency setup to unlock all features
              </p>
              <Button
                onClick={handleSaveAgencySettings}
                disabled={!tempAgencyName.trim() || isSaving}
                className="bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-medium px-6 py-2 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Agency Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Setup Steps */}
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333] rounded-2xl mb-8 shadow-2xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
              <Settings className="w-6 h-6 text-blue-400" />
              Additional Setup Steps
            </CardTitle>
            <p className="text-gray-400">
              Complete these next to unlock your agency's full potential
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {additionalSteps.map((step, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0f0f0f] to-[#1a1a1a] rounded-xl border border-[#333] hover:border-[#444] transition-all duration-300 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#333]/20 to-[#222]/20 rounded-xl flex items-center justify-center border border-[#444] group-hover:border-[#555] transition-all duration-300">
                    <div className="text-white group-hover:text-gray-200 transition-colors duration-300">
                      {step.icon}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white group-hover:text-gray-100 transition-colors duration-300">
                        {step.title}
                      </h3>
                      <Badge 
                        variant={step.priority === 'Essential' ? 'destructive' : step.priority === 'High' ? 'default' : 'secondary'}
                        className={`text-xs ${
                          step.priority === 'Essential' 
                            ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                            : step.priority === 'High'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                        }`}
                      >
                        {step.priority}
                      </Badge>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-[#333]/20 border-[#444] text-gray-300 hover:bg-[#333]/40 hover:border-[#555] hover:text-white transition-all duration-300"
                  asChild
                >
                  <Link href="/settings">
                    {step.action}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Features Preview */}
        <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#333] rounded-2xl mb-8 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-white" />
              What You'll Get Access To
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="p-4 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl border border-[#333] hover:border-[#444] transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-white">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-white text-sm">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-gray-400 text-xs">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg"
            className="bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            asChild
          >
            <Link href="/settings">
              <Settings className="w-5 h-5 mr-2" />
              Complete Additional Setup
            </Link>
          </Button>
          
          <Button 
            variant="outline"
            size="lg"
            className="bg-[#1a1a1a] border-[#333] text-gray-300 hover:bg-[#222] hover:border-[#444] hover:text-white px-8 py-3 rounded-xl transition-all duration-300"
            onClick={handleCompleteOnboarding}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Skip for Now
              </>
            )}
          </Button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Don't worry - you can always complete these steps later from your settings page
          </p>
        </div>
      </div>
    </div>
  )
}
