"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, Upload, X, ChevronRight, ChevronLeft, Mail, Home, Building2, Palette, Globe, MessageSquare, FileText } from 'lucide-react'
import { toast } from 'sonner'

type OnboardingData = {
  // Business
  businessName: string
  contactName: string
  businessEmail: string
  businessPhone: string
  businessAddress: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  businessNiche: string
  businessDescription: string
  servicesOffered: string
  operatingHours: {
    monday: { open: string; close: string; closed: boolean }
    tuesday: { open: string; close: string; closed: boolean }
    wednesday: { open: string; close: string; closed: boolean }
    thursday: { open: string; close: string; closed: boolean }
    friday: { open: string; close: string; closed: boolean }
    saturday: { open: string; close: string; closed: boolean }
    sunday: { open: string; close: string; closed: boolean }
  }
  serviceAreas: string
  
  // Branding
  logoFile: File | null
  photoFiles: File[]
  certFiles: File[]
  colorScheme: 'light' | 'dark' | 'neutral' | 'no-preference'
  slogan: string
  brandGuidelines: File | null
  hasAboutUs: boolean
  aboutUsText: string
  hasMeetTheTeam: boolean
  teamMembers: Array<{
    name: string
    role: string
    photo: File | null
  }>
  inspirationSites: string[]
  
  // Online Presence
  hasExistingWebsite: boolean
  currentDomain: string
  needDomainHelp: boolean
  desiredDomain: string
  hasGoogleBusiness: boolean
  googleBusinessEmail: string
  needGoogleSetup: boolean
  socialLinks: {
    facebook: string
    instagram: string
    tiktok: string
    linkedin: string
    yelp: string
    other: string
  }
  
  // Leads & Communication
  leadAlertMethod: 'text' | 'email' | 'both' | ''
  alertPhone: string
  alertEmail: string
  leadFormFields: string[]
  extraLeadFormRequests: string
  bookingsPayments: 'none' | 'booking' | 'payments' | 'both'
  bookingsPaymentsNotes: string
  hasPortfolio: boolean
  portfolioFiles: File[]
  hasReviews: boolean
  
  // Final Details
  ownsDomain: boolean
  ownedDomain: string
  dnsManager: 'client' | 'tluca' | ''
  complianceNeeds: string
  specialNotes: string
  
  // Consent
  consentConfirmed: boolean
}

const INITIAL_DATA: OnboardingData = {
  businessName: '',
  contactName: '',
  businessEmail: '',
  businessPhone: '',
  businessAddress: { street: '', city: '', state: '', zip: '', country: 'USA' },
  businessNiche: '',
  businessDescription: '',
  servicesOffered: '',
  operatingHours: {
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '17:00', closed: true },
    sunday: { open: '09:00', close: '17:00', closed: true },
  },
  serviceAreas: '',
  logoFile: null,
  photoFiles: [],
  certFiles: [],
  colorScheme: 'no-preference',
  slogan: '',
  brandGuidelines: null,
  hasAboutUs: false,
  aboutUsText: '',
  hasMeetTheTeam: false,
  teamMembers: [{ name: '', role: '', photo: null }],
  inspirationSites: ['', '', ''],
  hasExistingWebsite: false,
  currentDomain: '',
  needDomainHelp: false,
  desiredDomain: '',
  hasGoogleBusiness: false,
  googleBusinessEmail: '',
  needGoogleSetup: false,
  socialLinks: { facebook: '', instagram: '', tiktok: '', linkedin: '', yelp: '', other: '' },
  leadAlertMethod: '',
  alertPhone: '',
  alertEmail: '',
  leadFormFields: ['Name', 'Email', 'Phone', 'Service Interested In', 'Message'],
  extraLeadFormRequests: '',
  bookingsPayments: 'none',
  bookingsPaymentsNotes: '',
  hasPortfolio: false,
  portfolioFiles: [],
  hasReviews: false,
  ownsDomain: false,
  ownedDomain: '',
  dnsManager: '',
  complianceNeeds: '',
  specialNotes: '',
  consentConfirmed: false,
}

const SECTIONS = [
  { id: 'business', title: 'Business', icon: Building2 },
  { id: 'branding', title: 'Branding', icon: Palette },
  { id: 'online', title: 'Online Presence', icon: Globe },
  { id: 'leads', title: 'Leads & Communication', icon: MessageSquare },
  { id: 'final', title: 'Final Details', icon: FileText },
  { id: 'review', title: 'Review & Submit', icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('tluca-onboarding-draft')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        
        // Migrate old operatingHours format (string) to new format (object)
        if (typeof parsed.operatingHours === 'string') {
          parsed.operatingHours = {
            monday: { open: '09:00', close: '17:00', closed: false },
            tuesday: { open: '09:00', close: '17:00', closed: false },
            wednesday: { open: '09:00', close: '17:00', closed: false },
            thursday: { open: '09:00', close: '17:00', closed: false },
            friday: { open: '09:00', close: '17:00', closed: false },
            saturday: { open: '09:00', close: '17:00', closed: true },
            sunday: { open: '09:00', close: '17:00', closed: true },
          }
        }
        
        // Migrate old teamText/teamPhotos to new teamMembers format
        if (parsed.teamText || parsed.teamPhotos) {
          parsed.teamMembers = [{ name: '', role: '', photo: null }]
          delete parsed.teamText
          delete parsed.teamPhotos
        }
        
        // Ensure teamMembers exists
        if (!parsed.teamMembers) {
          parsed.teamMembers = [{ name: '', role: '', photo: null }]
        }
        
        setFormData({ ...INITIAL_DATA, ...parsed })
      } catch (e) {
        console.error('Failed to load draft', e)
      }
    }
  }, [])

  // Autosave to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('tluca-onboarding-draft', JSON.stringify(formData))
    }, 1000)
    return () => clearTimeout(timer)
  }, [formData])

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev as any)[parent], [field]: value }
    }))
  }

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const normalizeUrl = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `https://${url}`
  }

  const handleFileUpload = (field: keyof OnboardingData, files: FileList | null, multiple = false) => {
    if (!files || files.length === 0) return
    
    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(f => {
      const isValidSize = f.size <= 10 * 1024 * 1024 // 10MB
      const isValidType = f.type.startsWith('image/') || f.type === 'application/pdf'
      if (!isValidSize) toast.error(`${f.name} is too large (max 10MB)`)
      if (!isValidType) toast.error(`${f.name} must be an image or PDF`)
      return isValidSize && isValidType
    })

    if (multiple) {
      setFormData(prev => ({ ...prev, [field]: [...(prev[field] as File[]), ...validFiles] }))
    } else {
      setFormData(prev => ({ ...prev, [field]: validFiles[0] || null }))
    }
  }

  const removeFile = (field: keyof OnboardingData, index?: number) => {
    if (typeof index === 'number') {
      setFormData(prev => ({
        ...prev,
        [field]: (prev[field] as File[]).filter((_, i) => i !== index)
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: null }))
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 0) { // Business
      if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required'
      if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required'
      if (!formData.businessEmail.trim()) newErrors.businessEmail = 'Business email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail)) newErrors.businessEmail = 'Invalid email'
      if (!formData.businessPhone.trim()) newErrors.businessPhone = 'Business phone is required'
    }

    if (step === 3) { // Leads
      if (!formData.leadAlertMethod) newErrors.leadAlertMethod = 'Lead alert method is required'
      if (formData.leadAlertMethod === 'text' || formData.leadAlertMethod === 'both') {
        if (!formData.alertPhone.trim()) newErrors.alertPhone = 'Alert phone is required'
      }
      if (formData.leadAlertMethod === 'email' || formData.leadAlertMethod === 'both') {
        if (!formData.alertEmail.trim()) newErrors.alertEmail = 'Alert email is required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.alertEmail)) newErrors.alertEmail = 'Invalid email'
      }
    }

    if (step === 2) { // Branding
      if (formData.hasAboutUs && !formData.aboutUsText.trim()) newErrors.aboutUsText = 'About Us text is required'
      if (formData.hasMeetTheTeam && formData.teamMembers.some(m => m.name && !m.photo)) {
        newErrors.teamMembers = 'All team members with names must have photos'
      }
    }

    if (step === 5) { // Review
      if (!formData.consentConfirmed) newErrors.consentConfirmed = 'You must confirm the information is accurate'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, SECTIONS.length - 1))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      // Normalize URLs
      const normalizedData = {
        ...formData,
        inspirationSites: formData.inspirationSites.map(normalizeUrl).filter(Boolean),
        socialLinks: Object.fromEntries(
          Object.entries(formData.socialLinks).map(([k, v]) => [k, normalizeUrl(v)])
        ),
      }

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedData),
      })

      if (!response.ok) throw new Error('Submission failed')

      localStorage.removeItem('tluca-onboarding-draft')
      setIsSuccess(true)
      toast.success('Onboarding submitted successfully!')
    } catch (error) {
      toast.error('Failed to submit onboarding. Please try again.')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center border border-red-500/30">
              <CheckCircle2 className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-white mb-2">Congratulations! 🎉</CardTitle>
              <CardDescription className="text-gray-400 text-lg leading-relaxed">
                You'll receive a text message confirming your submission.
                <br />
                <br />
                We'll text you again when your site starts building!
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black text-white">
      {/* Hero */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/20 mb-6">
            <CheckCircle2 className="w-5 h-5 text-red-500" />
            <span className="text-red-400 font-semibold">Payment Confirmed</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Thanks for your payment — let's build your system.
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            This quick onboarding gives our team everything we need to launch your website, connect your lead system, and start your automations.
          </p>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {SECTIONS.map((section, idx) => {
              const Icon = section.icon
              const isActive = idx === currentStep
              const isCompleted = idx < currentStep
              
              return (
                <div key={section.id} className="flex items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted ? 'bg-red-600 border-red-600' :
                      isActive ? 'bg-red-600/20 border-red-600' :
                      'bg-black border-white/20'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isCompleted || isActive ? 'text-white' : 'text-gray-500'
                      }`} />
                    </div>
                    <span className={`text-xs font-medium hidden md:block ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}>
                      {section.title}
                    </span>
                  </div>
                  {idx < SECTIONS.length - 1 && (
                    <div className={`h-0.5 w-8 md:w-16 mx-2 ${
                      isCompleted ? 'bg-red-600' : 'bg-white/10'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-white">{SECTIONS[currentStep].title}</CardTitle>
            <CardDescription className="text-gray-400">
              {currentStep === 0 && "Tell us about your business"}
              {currentStep === 1 && "Share your brand identity"}
              {currentStep === 2 && "Your current online presence"}
              {currentStep === 3 && "How you want to capture and receive leads"}
              {currentStep === 4 && "Additional details and special requirements"}
              {currentStep === 5 && "Review your information before submitting"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 0: Business */}
            {currentStep === 0 && (
              <>
                <div>
                  <Label htmlFor="businessName" className="text-white">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => updateField('businessName', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., TLUCA Systems"
                  />
                  {errors.businessName && <p className="text-red-400 text-sm mt-1">{errors.businessName}</p>}
                </div>

                <div>
                  <Label htmlFor="contactName" className="text-white">Owner / Main Contact *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => updateField('contactName', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., John Doe"
                  />
                  {errors.contactName && <p className="text-red-400 text-sm mt-1">{errors.contactName}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessEmail" className="text-white">Business Email *</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={formData.businessEmail}
                      onChange={(e) => updateField('businessEmail', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="e.g., contact@business.com"
                    />
                    {errors.businessEmail && <p className="text-red-400 text-sm mt-1">{errors.businessEmail}</p>}
                  </div>

                  <div>
                    <Label htmlFor="businessPhone" className="text-white">Business Phone *</Label>
                    <Input
                      id="businessPhone"
                      type="tel"
                      value={formData.businessPhone}
                      onChange={(e) => updateField('businessPhone', formatPhoneNumber(e.target.value))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="(555) 123-4567"
                    />
                    {errors.businessPhone && <p className="text-red-400 text-sm mt-1">{errors.businessPhone}</p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white">Business Address</Label>
                  <Input
                    value={formData.businessAddress.street}
                    onChange={(e) => updateNestedField('businessAddress', 'street', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., 123 Main St"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={formData.businessAddress.city}
                      onChange={(e) => updateNestedField('businessAddress', 'city', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="City"
                    />
                    <Input
                      value={formData.businessAddress.state}
                      onChange={(e) => updateNestedField('businessAddress', 'state', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="State"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={formData.businessAddress.zip}
                      onChange={(e) => updateNestedField('businessAddress', 'zip', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="ZIP Code"
                    />
                    <Input
                      value={formData.businessAddress.country}
                      onChange={(e) => updateNestedField('businessAddress', 'country', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="Country"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="businessNiche" className="text-white">Business Niche/Industry</Label>
                  <Input
                    id="businessNiche"
                    value={formData.businessNiche}
                    onChange={(e) => updateField('businessNiche', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., Landscaping, Hair Salon, Plumbing, Real Estate, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="businessDescription" className="text-white">Short Business Description</Label>
                  <Textarea
                    id="businessDescription"
                    value={formData.businessDescription}
                    onChange={(e) => updateField('businessDescription', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-24"
                    placeholder="What do you do? (e.g., 'We provide residential plumbing services...')"
                  />
                </div>

                <div>
                  <Label htmlFor="servicesOffered" className="text-white">Services Offered</Label>
                  <Textarea
                    id="servicesOffered"
                    value={formData.servicesOffered}
                    onChange={(e) => updateField('servicesOffered', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-24"
                    placeholder="One service per line..."
                  />
                </div>

                <div>
                  <Label className="text-white mb-3 block">Operating Days/Hours</Label>
                  <div className="space-y-3">
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day, idx) => {
                      const dayData = formData.operatingHours?.[day] || { open: '09:00', close: '17:00', closed: false }
                      return (
                      <div key={day} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg">
                        <Checkbox
                          id={`${day}-closed`}
                          checked={dayData.closed}
                          onCheckedChange={(checked) => {
                            updateField('operatingHours', {
                              ...formData.operatingHours,
                              [day]: { ...dayData, closed: !!checked }
                            })
                          }}
                          className="border-white/20"
                        />
                        <Label htmlFor={`${day}-closed`} className="text-white capitalize w-24 cursor-pointer">
                          {day}
                        </Label>
                        
                        {!dayData.closed && (
                          <>
                            <select
                              value={dayData.open}
                              onChange={(e) => {
                                updateField('operatingHours', {
                                  ...formData.operatingHours,
                                  [day]: { ...dayData, open: e.target.value }
                                })
                              }}
                              className="bg-white/10 border border-white/10 text-white rounded px-2 py-1 text-sm"
                            >
                              {Array.from({ length: 24 }, (_, i) => {
                                const hour = i.toString().padStart(2, '0')
                                return ['00', '30'].map(min => (
                                  <option key={`${hour}:${min}`} value={`${hour}:${min}`}>
                                    {`${hour}:${min}`}
                                  </option>
                                ))
                              }).flat()}
                            </select>
                            <span className="text-gray-400">to</span>
                            <select
                              value={dayData.close}
                              onChange={(e) => {
                                updateField('operatingHours', {
                                  ...formData.operatingHours,
                                  [day]: { ...dayData, close: e.target.value }
                                })
                              }}
                              className="bg-white/10 border border-white/10 text-white rounded px-2 py-1 text-sm"
                            >
                              {Array.from({ length: 24 }, (_, i) => {
                                const hour = i.toString().padStart(2, '0')
                                return ['00', '30'].map(min => (
                                  <option key={`${hour}:${min}`} value={`${hour}:${min}`}>
                                    {`${hour}:${min}`}
                                  </option>
                                ))
                              }).flat()}
                            </select>
                            
                            {idx > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const prevDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][idx - 1] as keyof typeof formData.operatingHours
                                  const prevDayData = formData.operatingHours?.[prevDay] || { open: '09:00', close: '17:00', closed: false }
                                  updateField('operatingHours', {
                                    ...formData.operatingHours,
                                    [day]: { ...prevDayData }
                                  })
                                }}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Copy from {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][idx - 1]}
                              </Button>
                            )}
                          </>
                        )}
                        
                        {dayData.closed && (
                          <span className="text-gray-400 text-sm italic">Closed</span>
                        )}
                      </div>
                    )})}
                  </div>
                </div>

                <div>
                  <Label htmlFor="serviceAreas" className="text-white">Service Areas / Cities Served</Label>
                  <Input
                    id="serviceAreas"
                    value={formData.serviceAreas}
                    onChange={(e) => updateField('serviceAreas', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="Houston, Austin, Dallas..."
                  />
                </div>
              </>
            )}

            {/* Step 1: Branding */}
            {currentStep === 1 && (
              <>
                <div>
                  <Label className="text-white mb-2 block">Logo Upload (PNG/SVG preferred)</Label>
                  <div 
                    className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-red-500/50 transition-colors cursor-pointer bg-white/5"
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.add('border-red-500', 'bg-red-500/10')
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-red-500', 'bg-red-500/10')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('border-red-500', 'bg-red-500/10')
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFileUpload('logoFile', e.dataTransfer.files)
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('logoFile', e.target.files)}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload" className="cursor-pointer block">
                      {formData.logoFile ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-white">{formData.logoFile.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); removeFile('logoFile') }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-gray-400" />
                          <p className="text-gray-400">Click or drag & drop logo here</p>
                          <p className="text-gray-500 text-xs">PNG or SVG preferred</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-2 block">General Photos (Business, Location, Work)</Label>
                  <div 
                    className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-red-500/50 transition-colors cursor-pointer bg-white/5"
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.add('border-red-500', 'bg-red-500/10')
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-red-500', 'bg-red-500/10')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('border-red-500', 'bg-red-500/10')
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFileUpload('photoFiles', e.dataTransfer.files, true)
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileUpload('photoFiles', e.target.files, true)}
                      className="hidden"
                      id="photos-upload"
                    />
                    <label htmlFor="photos-upload" className="cursor-pointer block">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-400">Click or drag & drop photos here</p>
                      <p className="text-gray-500 text-xs">{formData.photoFiles.length} file(s) selected</p>
                    </label>
                  </div>
                  {formData.photoFiles.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {formData.photoFiles.map((file, idx) => (
                        <div key={idx} className="relative group">
                          <div className="aspect-square rounded bg-white/5 flex items-center justify-center text-xs text-gray-400">
                            {file.name}
                          </div>
                          <button
                            onClick={() => removeFile('photoFiles', idx)}
                            className="absolute top-1 right-1 bg-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-white mb-2 block">Certifications / Licenses</Label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-red-500/50 transition-colors cursor-pointer bg-white/5">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={(e) => handleFileUpload('certFiles', e.target.files, true)}
                      className="hidden"
                      id="certs-upload"
                    />
                    <label htmlFor="certs-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-400">Click to upload certificates ({formData.certFiles.length} selected)</p>
                    </label>
                  </div>
                </div>

                <div>
                  <Label className="text-white mb-2 block">Color Scheme Preference</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['light', 'dark', 'neutral', 'no-preference'].map((scheme) => (
                      <button
                        key={scheme}
                        type="button"
                        onClick={() => updateField('colorScheme', scheme)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          formData.colorScheme === scheme
                            ? 'border-red-600 bg-red-600/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="text-white capitalize">{scheme.replace('-', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="slogan" className="text-white">Slogan / Tagline (optional)</Label>
                  <Input
                    id="slogan"
                    value={formData.slogan}
                    onChange={(e) => updateField('slogan', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="Systems That Scale"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="hasAboutUs"
                      checked={formData.hasAboutUs}
                      onCheckedChange={(checked) => updateField('hasAboutUs', checked)}
                      className="border-white/20"
                    />
                    <Label htmlFor="hasAboutUs" className="text-white cursor-pointer">Include "About Us" section</Label>
                  </div>
                  {formData.hasAboutUs && (
                    <Textarea
                      value={formData.aboutUsText}
                      onChange={(e) => updateField('aboutUsText', e.target.value)}
                      className="bg-white/5 border-white/10 text-white min-h-32"
                      placeholder="Tell your story..."
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="hasMeetTheTeam"
                      checked={formData.hasMeetTheTeam}
                      onCheckedChange={(checked) => updateField('hasMeetTheTeam', checked)}
                      className="border-white/20"
                    />
                    <Label htmlFor="hasMeetTheTeam" className="text-white cursor-pointer">Include "Meet the Team" section</Label>
                  </div>
                  {formData.hasMeetTheTeam && (
                    <div className="space-y-4">
                      {formData.teamMembers.map((member, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-white/5 p-4 rounded-lg">
                          <div className="flex-1 space-y-3">
                            <Input
                              placeholder="Name"
                              value={member.name}
                              onChange={(e) => {
                                const newMembers = [...formData.teamMembers]
                                newMembers[idx].name = e.target.value
                                updateField('teamMembers', newMembers)
                              }}
                              className="bg-white/10 border-white/10 text-white"
                            />
                            <Input
                              placeholder="Role/Title"
                              value={member.role}
                              onChange={(e) => {
                                const newMembers = [...formData.teamMembers]
                                newMembers[idx].role = e.target.value
                                updateField('teamMembers', newMembers)
                              }}
                              className="bg-white/10 border-white/10 text-white"
                            />
                            <div className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-red-500/50 transition-colors cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    const newMembers = [...formData.teamMembers]
                                    newMembers[idx].photo = file
                                    updateField('teamMembers', newMembers)
                                  }
                                }}
                                className="hidden"
                                id={`team-photo-${idx}`}
                              />
                              <label htmlFor={`team-photo-${idx}`} className="cursor-pointer">
                                <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                                <p className="text-gray-400 text-sm">
                                  {member.photo ? member.photo.name : 'Upload photo'}
                                </p>
                              </label>
                            </div>
                          </div>
                          {formData.teamMembers.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newMembers = formData.teamMembers.filter((_, i) => i !== idx)
                                updateField('teamMembers', newMembers)
                              }}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          updateField('teamMembers', [...formData.teamMembers, { name: '', role: '', photo: null }])
                        }}
                        className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
                      >
                        + Add Team Member
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-white mb-2 block">Inspiration Sites (up to 3 URLs)</Label>
                  {formData.inspirationSites.map((url, idx) => (
                    <Input
                      key={idx}
                      value={url}
                      onChange={(e) => {
                        const newSites = [...formData.inspirationSites]
                        newSites[idx] = e.target.value
                        updateField('inspirationSites', newSites)
                      }}
                      className="bg-white/5 border-white/10 text-white mb-2"
                      placeholder={`Inspiration site ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Online Presence */}
            {currentStep === 2 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="hasExistingWebsite"
                      checked={formData.hasExistingWebsite}
                      onCheckedChange={(checked) => updateField('hasExistingWebsite', checked)}
                      className="border-white/20"
                    />
                    <Label htmlFor="hasExistingWebsite" className="text-white cursor-pointer">I have an existing website</Label>
                  </div>
                  {formData.hasExistingWebsite ? (
                    <Input
                      value={formData.currentDomain}
                      onChange={(e) => updateField('currentDomain', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="Current domain (e.g., example.com)"
                    />
                  ) : (
                    <div className="space-y-2 pl-7">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="needDomainHelp"
                          checked={formData.needDomainHelp}
                          onCheckedChange={(checked) => updateField('needDomainHelp', checked)}
                          className="border-white/20"
                        />
                        <Label htmlFor="needDomainHelp" className="text-white cursor-pointer">Need help purchasing a domain?</Label>
                      </div>
                      <Input
                        value={formData.desiredDomain}
                        onChange={(e) => updateField('desiredDomain', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        placeholder="Desired domain name"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="hasGoogleBusiness"
                      checked={formData.hasGoogleBusiness}
                      onCheckedChange={(checked) => updateField('hasGoogleBusiness', checked)}
                      className="border-white/20"
                    />
                    <Label htmlFor="hasGoogleBusiness" className="text-white cursor-pointer">I have a Google Business Profile</Label>
                  </div>
                  {formData.hasGoogleBusiness ? (
                    <Input
                      value={formData.googleBusinessEmail}
                      onChange={(e) => updateField('googleBusinessEmail', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="Gmail used to manage it"
                    />
                  ) : (
                    <div className="flex items-center gap-3 pl-7">
                      <Checkbox
                        id="needGoogleSetup"
                        checked={formData.needGoogleSetup}
                        onCheckedChange={(checked) => updateField('needGoogleSetup', checked)}
                        className="border-white/20"
                      />
                      <Label htmlFor="needGoogleSetup" className="text-white cursor-pointer">Need help setting one up?</Label>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-white mb-3 block">Social Media Links</Label>
                  <p className="text-gray-400 text-sm mb-3">Enter full URLs or just your handle (e.g., @yourbusiness)</p>
                  <div className="space-y-3">
                    {Object.entries(formData.socialLinks).map(([platform, url]) => (
                      <div key={platform}>
                        <Label htmlFor={`social-${platform}`} className="text-gray-400 capitalize text-sm">{platform}</Label>
                        <Input
                          id={`social-${platform}`}
                          value={url}
                          onChange={(e) => updateNestedField('socialLinks', platform, e.target.value)}
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                          placeholder={`https://${platform}.com/... or @handle`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Leads & Communication */}
            {currentStep === 3 && (
              <>
                <div>
                  <Label className="text-white mb-2 block">Lead Alert Method *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'text', label: 'Text' },
                      { value: 'email', label: 'Email' },
                      { value: 'both', label: 'Both' },
                    ].map((method) => (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => updateField('leadAlertMethod', method.value)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          formData.leadAlertMethod === method.value
                            ? 'border-red-600 bg-red-600/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="text-white">{method.label}</span>
                      </button>
                    ))}
                  </div>
                  {errors.leadAlertMethod && <p className="text-red-400 text-sm mt-1">{errors.leadAlertMethod}</p>}
                </div>

                {(formData.leadAlertMethod === 'text' || formData.leadAlertMethod === 'both') && (
                  <div>
                    <Label htmlFor="alertPhone" className="text-white">Best Phone for SMS Alerts *</Label>
                    <Input
                      id="alertPhone"
                      type="tel"
                      value={formData.alertPhone}
                      onChange={(e) => updateField('alertPhone', formatPhoneNumber(e.target.value))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="(555) 123-4567"
                    />
                    {errors.alertPhone && <p className="text-red-400 text-sm mt-1">{errors.alertPhone}</p>}
                  </div>
                )}

                {(formData.leadAlertMethod === 'email' || formData.leadAlertMethod === 'both') && (
                  <div>
                    <Label htmlFor="alertEmail" className="text-white">Best Email for Lead Alerts *</Label>
                    <Input
                      id="alertEmail"
                      type="email"
                      value={formData.alertEmail}
                      onChange={(e) => updateField('alertEmail', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="leads@example.com"
                    />
                    {errors.alertEmail && <p className="text-red-400 text-sm mt-1">{errors.alertEmail}</p>}
                  </div>
                )}

                <div>
                  <Label className="text-white mb-2 block">Desired Lead Form Fields</Label>
                  <p className="text-gray-400 text-sm mb-3">Select the information you want to collect from potential customers on your website's contact form</p>
                  <div className="space-y-2">
                    {['Name', 'Email', 'Phone', 'Service Interested In', 'Message', 'Company', 'Budget', 'Timeline'].map((field) => (
                      <div key={field} className="flex items-center gap-3">
                        <Checkbox
                          id={`field-${field}`}
                          checked={formData.leadFormFields.includes(field)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateField('leadFormFields', [...formData.leadFormFields, field])
                            } else {
                              updateField('leadFormFields', formData.leadFormFields.filter(f => f !== field))
                            }
                          }}
                          className="border-white/20"
                        />
                        <Label htmlFor={`field-${field}`} className="text-white cursor-pointer">{field}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="extraLeadFormRequests" className="text-white">Extra Lead Form Requests</Label>
                  <Textarea
                    id="extraLeadFormRequests"
                    value={formData.extraLeadFormRequests}
                    onChange={(e) => updateField('extraLeadFormRequests', e.target.value)}
                    className="bg-white/5 border-white/10 text-white min-h-20"
                    placeholder="Any custom fields or special requirements..."
                  />
                </div>

                <div>
                  <Label className="text-white mb-2 block">Bookings / Payments Needs</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: 'none', label: 'None' },
                      { value: 'booking', label: 'Booking' },
                      { value: 'payments', label: 'Payments' },
                      { value: 'both', label: 'Both' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('bookingsPayments', option.value)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          formData.bookingsPayments === option.value
                            ? 'border-red-600 bg-red-600/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="text-white">{option.label}</span>
                      </button>
                    ))}
                  </div>
                  {formData.bookingsPayments !== 'none' && (
                    <Textarea
                      value={formData.bookingsPaymentsNotes}
                      onChange={(e) => updateField('bookingsPaymentsNotes', e.target.value)}
                      className="bg-white/5 border-white/10 text-white min-h-20 mt-3"
                      placeholder="Details about booking/payment needs..."
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="hasPortfolio"
                      checked={formData.hasPortfolio}
                      onCheckedChange={(checked) => updateField('hasPortfolio', checked)}
                      className="border-white/20"
                    />
                    <Label htmlFor="hasPortfolio" className="text-white cursor-pointer">Include portfolio section</Label>
                  </div>
                  {formData.hasPortfolio && (
                    <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-red-500/50 transition-colors cursor-pointer bg-white/5">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileUpload('portfolioFiles', e.target.files, true)}
                        className="hidden"
                        id="portfolio-upload"
                      />
                      <label htmlFor="portfolio-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-400">Upload portfolio items ({formData.portfolioFiles.length} selected)</p>
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="hasReviews"
                    checked={formData.hasReviews}
                    onCheckedChange={(checked) => updateField('hasReviews', checked)}
                    className="border-white/20"
                  />
                  <Label htmlFor="hasReviews" className="text-white cursor-pointer">Include reviews section</Label>
                </div>
              </>
            )}

            {/* Step 4: Final Details */}
            {currentStep === 4 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="ownsDomain"
                      checked={formData.ownsDomain}
                      onCheckedChange={(checked) => updateField('ownsDomain', checked)}
                      className="border-white/20"
                    />
                    <Label htmlFor="ownsDomain" className="text-white cursor-pointer">I own a domain</Label>
                  </div>
                  {formData.ownsDomain && (
                    <>
                      <Input
                        value={formData.ownedDomain}
                        onChange={(e) => updateField('ownedDomain', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        placeholder="yourdomain.com"
                      />
                      <div>
                        <Label className="text-white mb-2 block">Who manages DNS?</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'client', label: 'I do' },
                            { value: 'tluca', label: 'TLUCA' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateField('dnsManager', option.value)}
                              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                                formData.dnsManager === option.value
                                  ? 'border-red-600 bg-red-600/20'
                                  : 'border-white/10 bg-white/5 hover:border-white/20'
                              }`}
                            >
                              <span className="text-white">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <Label htmlFor="complianceNeeds" className="text-white">Compliance Needs (HIPAA, FINRA, etc.)</Label>
                  <Input
                    id="complianceNeeds"
                    value={formData.complianceNeeds}
                    onChange={(e) => updateField('complianceNeeds', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="None, or list requirements..."
                  />
                </div>

                <div>
                  <Label htmlFor="specialNotes" className="text-white">Special Notes</Label>
                  <Textarea
                    id="specialNotes"
                    value={formData.specialNotes}
                    onChange={(e) => updateField('specialNotes', e.target.value)}
                    className="bg-white/5 border-white/10 text-white min-h-32"
                    placeholder="Any additional information, special requests, or important details..."
                  />
                </div>
              </>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <>
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-white">Business Information</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(0)} className="text-red-400 hover:text-red-300">
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm text-gray-400">
                      <p><strong className="text-gray-300">Name:</strong> {formData.businessName || '—'}</p>
                      <p><strong className="text-gray-300">Contact:</strong> {formData.contactName || '—'}</p>
                      <p><strong className="text-gray-300">Email:</strong> {formData.businessEmail || '—'}</p>
                      <p><strong className="text-gray-300">Phone:</strong> {formData.businessPhone || '—'}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-white">Branding & Design</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="text-red-400 hover:text-red-300">
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm text-gray-400">
                      <p><strong className="text-gray-300">Logo:</strong> {formData.logoFile ? '✓ Uploaded' : '—'}</p>
                      <p><strong className="text-gray-300">Photos:</strong> {formData.photoFiles.length} files</p>
                      <p><strong className="text-gray-300">Color Scheme:</strong> {formData.colorScheme}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-white">Lead Alerts</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)} className="text-red-400 hover:text-red-300">
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm text-gray-400">
                      <p><strong className="text-gray-300">Method:</strong> {formData.leadAlertMethod || '—'}</p>
                      {formData.leadAlertMethod && formData.leadAlertMethod !== 'email' && (
                        <p><strong className="text-gray-300">Phone:</strong> {formData.alertPhone || '—'}</p>
                      )}
                      {formData.leadAlertMethod && formData.leadAlertMethod !== 'text' && (
                        <p><strong className="text-gray-300">Email:</strong> {formData.alertEmail || '—'}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consentConfirmed"
                      checked={formData.consentConfirmed}
                      onCheckedChange={(checked) => updateField('consentConfirmed', checked)}
                      className="border-white/20 mt-1"
                    />
                    <Label htmlFor="consentConfirmed" className="text-white cursor-pointer leading-relaxed">
                      I confirm the information is accurate and authorize TLUCA Systems to begin work.
                    </Label>
                  </div>
                  {errors.consentConfirmed && <p className="text-red-400 text-sm mt-2">{errors.consentConfirmed}</p>}
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t border-white/10">
              <Button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0}
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-white disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              {currentStep < SECTIONS.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Onboarding'}
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-sm mt-6">
          Questions? Email <a href="mailto:support@tlucasystems.com" className="text-red-400 hover:text-red-300">support@tlucasystems.com</a>
        </p>
      </div>
    </div>
  )
}

