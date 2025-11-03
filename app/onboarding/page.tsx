"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, Upload, X, ChevronRight, ChevronLeft, Mail, Home, Building2, Palette, Globe, MessageSquare, FileText, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  smsConsent: boolean
}

// Add image preview state type
type ImagePreviews = {
  [key: string]: string // filename -> data URL
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
  smsConsent: false,
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
  const [showLoadingScreen, setShowLoadingScreen] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imagePreviews, setImagePreviews] = useState<ImagePreviews>({})
  const [showPaymentToast, setShowPaymentToast] = useState(true)
  const [operatorCode, setOperatorCode] = useState<string | null>(null)

  // Capture operator code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const operator = params.get('operator')
    if (operator) {
      setOperatorCode(operator.toLowerCase())
      console.log(`📋 Operator code captured: ${operator}`)
    }
  }, [])

  // Show loading screen for 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoadingScreen(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Scroll to top when success page is shown
  useEffect(() => {
    if (isSuccess) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [isSuccess])

  // Force clean state on mount - clear any cached data
  useEffect(() => {
    // Clear any localStorage remnants
    localStorage.removeItem('tluca-onboarding-draft')
    
    // Reset all state to initial values
    setFormData(INITIAL_DATA)
    setImagePreviews({})
    setCurrentStep(0)
    setErrors({})
  }, [])

  // Show payment confirmation toast on mount
  useEffect(() => {
    if (showPaymentToast) {
      toast.success('🎉 Payment confirmed! Let\'s build your system.', {
        duration: 4000,
      })
      const timer = setTimeout(() => {
        setShowPaymentToast(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [])

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

  // Convert 24-hour time to 12-hour AM/PM format
  const formatTime12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Generate 12-hour time options
  const generateTimeOptions = () => {
    const times: { value: string; label: string }[] = []
    for (let hour = 0; hour < 24; hour++) {
      for (let min of [0, 30]) {
        const time24 = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
        times.push({
          value: time24,
          label: formatTime12Hour(time24)
        })
      }
    }
    return times
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

    // Generate previews for images
    const newPreviews = { ...imagePreviews }
    validFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews[file.name] = e.target?.result as string
          setImagePreviews({ ...newPreviews })
        }
        reader.readAsDataURL(file)
      }
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

    if (step === 0) { // Business - ALL FIELDS REQUIRED
      if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required'
      if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required'
      if (!formData.businessEmail.trim()) newErrors.businessEmail = 'Business email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.businessEmail)) newErrors.businessEmail = 'Invalid email'
      if (!formData.businessPhone.trim()) newErrors.businessPhone = 'Business phone is required'
      if (!formData.businessAddress.street.trim()) newErrors.businessAddressStreet = 'Street address is required'
      if (!formData.businessAddress.city.trim()) newErrors.businessAddressCity = 'City is required'
      if (!formData.businessAddress.state.trim()) newErrors.businessAddressState = 'State is required'
      if (!formData.businessAddress.zip.trim()) newErrors.businessAddressZip = 'ZIP code is required'
      if (!formData.businessAddress.country.trim()) newErrors.businessAddressCountry = 'Country is required'
      if (!formData.businessNiche.trim()) newErrors.businessNiche = 'Business niche is required'
      if (!formData.businessDescription.trim()) newErrors.businessDescription = 'Business description is required'
      if (!formData.servicesOffered.trim()) newErrors.servicesOffered = 'Services offered is required'
      if (!formData.serviceAreas.trim()) newErrors.serviceAreas = 'Service areas is required'
    }

    if (step === 1) { // Branding
      if (formData.hasAboutUs && !formData.aboutUsText.trim()) newErrors.aboutUsText = 'About Us text is required'
      if (formData.hasMeetTheTeam && formData.teamMembers.some(m => m.name && !m.photo)) {
        newErrors.teamMembers = 'All team members with names must have photos'
      }
    }

    // Step 2 (Online Presence) - no required fields, always passes
    if (step === 2) {
      // Online Presence has no required fields
    }

    if (step === 3) { // Leads & Communication
      if (!formData.leadAlertMethod) newErrors.leadAlertMethod = 'Lead alert method is required'
      if (formData.leadAlertMethod === 'text' || formData.leadAlertMethod === 'both') {
        if (!formData.alertPhone.trim()) newErrors.alertPhone = 'Alert phone is required'
      }
      if (formData.leadAlertMethod === 'email' || formData.leadAlertMethod === 'both') {
        if (!formData.alertEmail.trim()) newErrors.alertEmail = 'Alert email is required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.alertEmail)) newErrors.alertEmail = 'Invalid email'
      }
    }

    if (step === 5) { // Review & Submit
      if (!formData.consentConfirmed) newErrors.consentConfirmed = 'You must confirm the information is accurate'
    }

    setErrors(newErrors)
    
    // If there are errors, scroll to the first error field
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0]
      setTimeout(() => {
        const element = document.getElementById(firstErrorField)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.focus()
        }
      }, 100)
    }
    
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

  const uploadFileToCloudinary = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/onboarding/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed:', response.status, errorText)
        throw new Error('Upload failed')
      }
      
      const data = await response.json()
      console.log('✅ Upload successful:', data)
      
      if (!data.secure_url) {
        console.error('❌ No secure_url in response:', data)
        return null
      }
      
      return data.secure_url
    } catch (error) {
      console.error('Cloudinary upload error:', error)
      return null
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      toast.loading('Uploading files to Cloudinary...')

      // Upload files to Cloudinary
      let logoUrl: string | null = null
      let photoUrls: string[] = []
      let certificateUrls: string[] = []
      let teamPhotoUrls: (string | null)[] = []

      if (formData.logoFile) {
        logoUrl = await uploadFileToCloudinary(formData.logoFile)
      }

      for (const photo of formData.photoFiles) {
        const url = await uploadFileToCloudinary(photo)
        if (url) photoUrls.push(url)
      }

      for (const cert of formData.certFiles) {
        const url = await uploadFileToCloudinary(cert)
        if (url) certificateUrls.push(url)
      }

      for (const member of formData.teamMembers) {
        if (member.photo) {
          const url = await uploadFileToCloudinary(member.photo)
          teamPhotoUrls.push(url)
        } else {
          teamPhotoUrls.push(null)
        }
      }

      // Normalize URLs
      const normalizedData = {
        ...formData,
        inspirationSites: formData.inspirationSites.map(normalizeUrl).filter(Boolean),
        socialLinks: Object.fromEntries(
          Object.entries(formData.socialLinks).map(([k, v]) => [k, normalizeUrl(v)])
        ),
        // Add Cloudinary URLs
        logo_url: logoUrl,
        photo_urls: photoUrls,
        certificate_urls: certificateUrls,
        team_member_photos: teamPhotoUrls,
        // Add operator code for tracking
        operator_code: operatorCode,
      }

      toast.dismiss()
      toast.loading('Submitting your onboarding...')

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedData),
      })

      if (!response.ok) throw new Error('Submission failed')

      setIsSuccess(true)
      toast.dismiss()
      toast.success('Onboarding submitted successfully!')
    } catch (error) {
      toast.dismiss()
      toast.error('Failed to submit onboarding. Please try again.')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="max-w-3xl w-full bg-black border-white/10 shadow-2xl">
          <CardHeader className="text-center space-y-6 pb-8 border-b border-white/10">
            <div className="mx-auto w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <div>
              <CardTitle className="text-4xl font-bold text-white mb-4">Thank You! 🎉</CardTitle>
              <CardDescription className="text-gray-400 text-xl leading-relaxed">
                Your onboarding submission has been received.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            {/* Our Promise */}
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-white">Our Promise</h3>
              <p className="text-gray-400 text-lg leading-relaxed">
                We're committed to making your experience <span className="text-white font-semibold">exceptional</span>. 
                Your business deserves systems that work flawlessly, and that's exactly what we'll deliver.
              </p>
            </div>

            {/* What Happens Next */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white text-center mb-6">What Happens Next</h3>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-start p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Review & Development Start</h4>
                    <p className="text-gray-400">
                      Within the next <span className="text-white font-semibold">24 hours</span>, someone from our team will review your onboarding details 
                      and begin development of your website and systems. You'll receive text notifications as we progress.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Project Completion</h4>
                    <p className="text-gray-400">
                      Once your site and systems are complete, you'll receive an email containing:
                    </p>
                    <ul className="mt-3 space-y-2 text-gray-400">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        Website & CRM login credentials
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        Tutorial and walkthrough documentation
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        System details and setup guide
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        Final invoice (if applicable) and next steps
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Need to Make Changes?</h4>
                    <p className="text-gray-400 mb-3">
                      If you need to make any changes or forgot to include something, reply directly to your confirmation email or contact us:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="w-4 h-4 text-white" />
                        <a href="mailto:tlucasystems@gmail.com" className="text-white font-semibold hover:underline">
                          tlucasystems@gmail.com
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span className="text-white font-semibold">📱</span>
                        <a href="tel:832-561-4407" className="text-white font-semibold hover:underline">
                          832-561-4407
                        </a>
                        <span className="text-gray-500 text-sm">(text or call)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center pt-6 border-t border-white/10">
              <p className="text-gray-400 text-lg">
                We're excited to build your business systems! 🚀
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading Screen
  if (showLoadingScreen) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center overflow-hidden relative">
        {/* Animated background gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 -top-48 -left-48 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="text-center space-y-8 px-6 relative z-10 max-w-2xl">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              {/* Outer ring */}
              <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-white/10 animate-ping opacity-20"></div>
              
              {/* Middle ring */}
              <div className="relative w-32 h-32 rounded-full border-4 border-white/20 flex items-center justify-center backdrop-blur-sm"
                   style={{ 
                     boxShadow: '0 0 60px rgba(255, 255, 255, 0.1), inset 0 0 60px rgba(255, 255, 255, 0.05)' 
                   }}>
                {/* Checkmark */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-gray-300 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-black" strokeWidth={2.5} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight"
                style={{ 
                  textShadow: '0 0 40px rgba(255, 255, 255, 0.3)' 
                }}>
              Payment Confirmed
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-white to-transparent mx-auto opacity-50"></div>
          </div>
          
          {/* Description */}
          <div className="space-y-4">
            <p className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
              Thank you for your payment. Let's get started building your custom business solution.
            </p>
            
            {/* Statement info with fade-in animation */}
            <div className="text-sm text-gray-500 max-w-lg mx-auto animate-fadeIn" style={{ animationDelay: '0.5s', opacity: 0, animation: 'fadeIn 1s ease-in forwards 0.5s' }}>
              A payment to{' '}
              <span className="font-semibold text-white/90 inline-block animate-pulse px-2 py-1 rounded bg-white/5">
                TLUCA SYSTEMS
              </span>
              {' '}will appear on your statement.
            </div>
          </div>
          
          {/* Loading indicator */}
          <div className="flex justify-center items-center gap-2 pt-4">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
          
          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
          
          {/* Footer */}
          <div className="pt-12 text-gray-500 text-sm space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span>Powered by</span>
              <span className="font-semibold text-gray-400">stripe</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs">
              <a href="/terms" className="hover:text-gray-300 transition-colors">Terms</a>
              <span>•</span>
              <a href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Mobile Header - Shows only on mobile */}
      <div className="lg:hidden sticky top-0 z-50 bg-black border-b border-white/10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Image 
                src="/tluca-logo.png" 
                alt="TLUCA Systems Logo" 
                width={50} 
                height={50}
                className="object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-white">Client Onboarding</h1>
                <p className="text-xs text-gray-400">Step {currentStep + 1} of {SECTIONS.length}</p>
              </div>
            </div>
          </div>
          
          {/* Mobile Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>{SECTIONS[currentStep].title}</span>
              <span>{Math.round((currentStep / SECTIONS.length) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / SECTIONS.length) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Mobile Step Indicators */}
          <div className="flex items-center justify-between mt-4 overflow-x-auto pb-2">
            {SECTIONS.map((section, idx) => {
              const Icon = section.icon
              const isActive = idx === currentStep
              const isCompleted = idx < currentStep
              
              return (
                <div key={section.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted ? 'bg-white border-white' :
                    isActive ? 'bg-white/20 border-white' :
                    'bg-transparent border-white/20'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    ) : (
                      <Icon className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-gray-500'
                      }`} />
                    )}
                  </div>
                  <span className={`text-[10px] text-center ${
                    isActive ? 'text-white font-medium' : 'text-gray-500'
                  }`}>
                    {section.title.split(' ')[0]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block lg:w-1/3 border-r border-white/10 bg-black/50 backdrop-blur-sm fixed h-screen overflow-y-auto">
        <div className="p-8 space-y-8">
          {/* Logo and Title */}
          <div className="space-y-6">
            <div className="flex justify-center">
              <Image 
                src="/tluca-logo.png" 
                alt="TLUCA Systems Logo" 
                width={80} 
                height={80}
                className="object-contain"
              />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-white">Client Onboarding</h1>
              <p className="text-sm text-gray-400 leading-relaxed">
                Please complete all 6 steps to provide us with the information we need to build your solution.
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="space-y-3">
            {SECTIONS.map((section, idx) => {
              const Icon = section.icon
              const isActive = idx === currentStep
              const isCompleted = idx < currentStep
              
              return (
                <div 
                  key={section.id} 
                  className={`flex items-start gap-4 p-4 rounded-lg transition-all ${
                    isActive ? 'bg-white/10 border border-white/20' : 
                    isCompleted ? 'bg-white/5 border border-white/10' : 
                    'border border-transparent'
                  }`}
                >
                  {/* Step Number/Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted ? 'bg-white border-white' :
                    isActive ? 'bg-white/20 border-white' :
                    'bg-transparent border-white/20'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-black" />
                    ) : (
                      <Icon className={`w-5 h-5 ${
                        isActive ? 'text-white' : 'text-gray-500'
                      }`} />
                    )}
                  </div>
                  
                  {/* Step Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${
                        isActive ? 'text-white' : 'text-gray-500'
                      }`}>
                        Step {idx + 1}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-white' : 
                      isCompleted ? 'text-gray-300' : 
                      'text-gray-500'
                    }`}>
                      {section.title}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Progress Indicator */}
          <div className="pt-4 border-t border-white/10">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>{Math.round((currentStep / SECTIONS.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / SECTIONS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full width on mobile, 2/3 width on desktop with offset */}
      <div className="w-full lg:ml-[33.333%] lg:w-2/3 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-12">
          <Card className="bg-black border-white/10 shadow-2xl shadow-white/10" style={{ boxShadow: '0 0 40px rgba(255, 255, 255, 0.1), 0 0 80px rgba(255, 255, 255, 0.05)' }}>
            <CardHeader className="border-b border-white/10 p-4 sm:p-6">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-white">{SECTIONS[currentStep].title}</CardTitle>
              <CardDescription className="text-gray-400 text-base sm:text-lg">
                {currentStep === 0 && "Tell us about your business"}
                {currentStep === 1 && "Share your brand identity"}
                {currentStep === 2 && "Your current online presence"}
                {currentStep === 3 && "How you want to capture and receive leads"}
                {currentStep === 4 && "Additional details and special requirements"}
                {currentStep === 5 && "Review your information before submitting"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
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

                {/* SMS Consent */}
                <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                  <input
                    type="checkbox"
                    id="smsConsent"
                    checked={formData.smsConsent}
                    onChange={(e) => updateField('smsConsent', e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-white focus:ring-2 focus:ring-white/50"
                  />
                  <label htmlFor="smsConsent" className="text-sm text-gray-300 cursor-pointer">
                    ☑️ I agree to receive SMS updates about my order, project progress, and service notifications from TLUCA Systems. Message and data rates may apply. Reply STOP to opt out at any time.
                  </label>
                </div>

                <div className="space-y-3">
                  <Label className="text-white">Business Address *</Label>
                  <div>
                    <Input
                      id="businessAddressStreet"
                      value={formData.businessAddress.street}
                      onChange={(e) => updateNestedField('businessAddress', 'street', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="e.g., 123 Main St"
                    />
                    {errors.businessAddressStreet && <p className="text-red-400 text-sm mt-1">{errors.businessAddressStreet}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input
                        id="businessAddressCity"
                        value={formData.businessAddress.city}
                        onChange={(e) => updateNestedField('businessAddress', 'city', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        placeholder="City"
                      />
                      {errors.businessAddressCity && <p className="text-red-400 text-sm mt-1">{errors.businessAddressCity}</p>}
                    </div>
                    <div>
                      <Input
                        id="businessAddressState"
                        value={formData.businessAddress.state}
                        onChange={(e) => updateNestedField('businessAddress', 'state', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        placeholder="State"
                      />
                      {errors.businessAddressState && <p className="text-red-400 text-sm mt-1">{errors.businessAddressState}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Input
                        id="businessAddressZip"
                        value={formData.businessAddress.zip}
                        onChange={(e) => updateNestedField('businessAddress', 'zip', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        placeholder="ZIP Code"
                      />
                      {errors.businessAddressZip && <p className="text-red-400 text-sm mt-1">{errors.businessAddressZip}</p>}
                    </div>
                    <div>
                      <Input
                        id="businessAddressCountry"
                        value={formData.businessAddress.country}
                        onChange={(e) => updateNestedField('businessAddress', 'country', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        placeholder="Country"
                      />
                      {errors.businessAddressCountry && <p className="text-red-400 text-sm mt-1">{errors.businessAddressCountry}</p>}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="businessNiche" className="text-white">Business Niche/Industry *</Label>
                  <Input
                    id="businessNiche"
                    value={formData.businessNiche}
                    onChange={(e) => updateField('businessNiche', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., Landscaping, Hair Salon, Plumbing, Real Estate, etc."
                  />
                  {errors.businessNiche && <p className="text-red-400 text-sm mt-1">{errors.businessNiche}</p>}
                </div>

                <div>
                  <Label htmlFor="businessDescription" className="text-white">Short Business Description *</Label>
                  <Textarea
                    id="businessDescription"
                    value={formData.businessDescription}
                    onChange={(e) => updateField('businessDescription', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-24"
                    placeholder="What do you do? (e.g., 'We provide residential plumbing services...')"
                  />
                  {errors.businessDescription && <p className="text-red-400 text-sm mt-1">{errors.businessDescription}</p>}
                </div>

                <div>
                  <Label htmlFor="servicesOffered" className="text-white">Services Offered *</Label>
                  <Textarea
                    id="servicesOffered"
                    value={formData.servicesOffered}
                    onChange={(e) => updateField('servicesOffered', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-24"
                    placeholder="One service per line..."
                  />
                  {errors.servicesOffered && <p className="text-red-400 text-sm mt-1">{errors.servicesOffered}</p>}
                </div>

                <div>
                  <Label className="text-white mb-3 block">Operating Days/Hours</Label>
                  <div className="space-y-3">
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day, idx) => {
                      const dayData = formData.operatingHours?.[day] || { open: '09:00', close: '17:00', closed: false }
                      return (
                      <div key={day} className="bg-white/5 p-3 rounded-lg space-y-2">
                        {/* Mobile-optimized layout: stacks vertically on small screens */}
                        <div className="flex items-center gap-3">
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
                          <Label htmlFor={`${day}-closed`} className="text-white capitalize flex-1 cursor-pointer font-medium">
                            {day}
                          </Label>
                          
                          {dayData.closed && (
                            <span className="text-gray-400 text-sm italic">Closed</span>
                          )}
                        </div>
                        
                        {!dayData.closed && (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pl-8">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <select
                                value={dayData.open}
                                onChange={(e) => {
                                  updateField('operatingHours', {
                                    ...formData.operatingHours,
                                    [day]: { ...dayData, open: e.target.value }
                                  })
                                }}
                                className="bg-black border border-white/20 text-white rounded px-2 py-2 text-sm flex-1 sm:flex-initial min-w-[120px]"
                                style={{ colorScheme: 'dark' }}
                              >
                                {generateTimeOptions().map(({ value, label }) => (
                                  <option key={value} value={value} className="bg-black text-white">
                                    {label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-gray-400 text-sm">to</span>
                              <select
                                value={dayData.close}
                                onChange={(e) => {
                                  updateField('operatingHours', {
                                    ...formData.operatingHours,
                                    [day]: { ...dayData, close: e.target.value }
                                  })
                                }}
                                className="bg-black border border-white/20 text-white rounded px-2 py-2 text-sm flex-1 sm:flex-initial min-w-[120px]"
                                style={{ colorScheme: 'dark' }}
                              >
                                {generateTimeOptions().map(({ value, label }) => (
                                  <option key={value} value={value} className="bg-black text-white">
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
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
                                className="text-xs text-white/70 hover:text-white whitespace-nowrap w-full sm:w-auto"
                              >
                                Copy from {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][idx - 1]}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                </div>

                <div>
                  <Label htmlFor="serviceAreas" className="text-white">Service Areas / Cities Served *</Label>
                  <Input
                    id="serviceAreas"
                    value={formData.serviceAreas}
                    onChange={(e) => updateField('serviceAreas', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="Houston, Austin, Dallas..."
                  />
                  {errors.serviceAreas && <p className="text-red-400 text-sm mt-1">{errors.serviceAreas}</p>}
                </div>
              </>
            )}

            {/* Step 1: Branding */}
            {currentStep === 1 && (
              <>
                <div>
                  <Label className="text-white mb-2 block">Logo Upload (PNG/SVG preferred)</Label>
                  <div 
                    className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors cursor-pointer bg-white/5"
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.add('border-white', 'bg-white/10')
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-white', 'bg-white/10')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('border-white', 'bg-white/10')
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
                        <div className="space-y-3">
                          {imagePreviews[formData.logoFile.name] ? (
                            <div className="relative">
                              <img 
                                src={imagePreviews[formData.logoFile.name]} 
                                alt="Logo preview"
                                className="max-h-48 mx-auto rounded object-contain bg-white/10 p-4"
                              />
                              <p className="text-gray-400 text-sm mt-2 text-center">{formData.logoFile.name}</p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 animate-pulse">
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                              <span className="text-white">Loading preview...</span>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); removeFile('logoFile') }}
                            className="text-white/70 hover:text-white w-full"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Remove Logo
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
                    className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors cursor-pointer bg-white/5"
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.add('border-white', 'bg-white/10')
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-white', 'bg-white/10')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('border-white', 'bg-white/10')
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
                          {imagePreviews[file.name] ? (
                            <img 
                              src={imagePreviews[file.name]} 
                              alt={file.name}
                              className="aspect-square rounded object-cover bg-white/5"
                            />
                          ) : (
                            <div className="aspect-square rounded bg-white/5 flex items-center justify-center text-xs text-gray-400 animate-pulse">
                              Loading...
                            </div>
                          )}
                          <button
                            onClick={() => removeFile('photoFiles', idx)}
                            className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
                  <div 
                    className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors cursor-pointer bg-white/5"
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.add('border-white', 'bg-white/10')
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-white', 'bg-white/10')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('border-white', 'bg-white/10')
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleFileUpload('certFiles', e.dataTransfer.files, true)
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={(e) => handleFileUpload('certFiles', e.target.files, true)}
                      className="hidden"
                      id="certs-upload"
                    />
                    <label htmlFor="certs-upload" className="cursor-pointer block">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-400">Click or drag & drop certificates here</p>
                      <p className="text-gray-500 text-xs">{formData.certFiles.length} file(s) selected</p>
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
                            ? 'border-white bg-white/10'
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
                        <div key={idx} className="flex flex-col sm:flex-row items-start gap-3 bg-white/5 p-3 sm:p-4 rounded-lg">
                          <div className="flex-1 space-y-3 w-full">
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
                            <div 
                              className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-white/40 transition-colors cursor-pointer"
                              onDragOver={(e) => {
                                e.preventDefault()
                                e.currentTarget.classList.add('border-white', 'bg-white/10')
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove('border-white', 'bg-white/10')
                              }}
                              onDrop={(e) => {
                                e.preventDefault()
                                e.currentTarget.classList.remove('border-white', 'bg-white/10')
                                const file = e.dataTransfer.files?.[0]
                                if (file) {
                                  const newMembers = [...formData.teamMembers]
                                  newMembers[idx].photo = file
                                  updateField('teamMembers', newMembers)
                                }
                              }}
                            >
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
                              <label htmlFor={`team-photo-${idx}`} className="cursor-pointer block">
                                {member.photo && imagePreviews[member.photo.name] ? (
                                  <div className="space-y-2">
                                    <img 
                                      src={imagePreviews[member.photo.name]} 
                                      alt={member.photo.name}
                                      className="w-full h-32 sm:h-40 object-contain rounded bg-white/5 p-2"
                                    />
                                    <p className="text-gray-400 text-xs truncate">{member.photo.name}</p>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                                    <p className="text-gray-400 text-sm">
                                      {member.photo ? 'Loading...' : 'Click or drag photo'}
                                    </p>
                                  </>
                                )}
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
                              className="text-white/80 hover:text-white self-end sm:self-start"
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
                            ? 'border-white bg-white/10'
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
                            ? 'border-white bg-white/10'
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
                    <div 
                      className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors cursor-pointer bg-white/5"
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.add('border-white', 'bg-white/10')
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('border-white', 'bg-white/10')
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.remove('border-white', 'bg-white/10')
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                          handleFileUpload('portfolioFiles', e.dataTransfer.files, true)
                        }
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileUpload('portfolioFiles', e.target.files, true)}
                        className="hidden"
                        id="portfolio-upload"
                      />
                      <label htmlFor="portfolio-upload" className="cursor-pointer block">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-400">Click or drag & drop portfolio items here</p>
                        <p className="text-gray-500 text-xs">{formData.portfolioFiles.length} file(s) selected</p>
                      </label>
                    </div>
                    )}
                    {formData.portfolioFiles.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {formData.portfolioFiles.map((file, idx) => (
                          <div key={idx} className="relative group">
                            {imagePreviews[file.name] ? (
                              <img 
                                src={imagePreviews[file.name]} 
                                alt={file.name}
                                className="aspect-square rounded object-cover bg-white/5"
                              />
                            ) : (
                              <div className="aspect-square rounded bg-white/5 flex items-center justify-center text-xs text-gray-400 animate-pulse">
                                Loading...
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeFile('portfolioFiles', idx)}
                              className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
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
                    <Label htmlFor="ownsDomain" className="text-white cursor-pointer">I already have a domain</Label>
                  </div>
                  {formData.ownsDomain && (
                    <>
                      <Input
                        value={formData.ownedDomain}
                        onChange={(e) => updateField('ownedDomain', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        placeholder="e.g., yourbusiness.com"
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="text-white">Who has access to manage your domain settings?</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-gray-400 hover:text-white">
                                  <HelpCircle className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-white text-black border-white/20 max-w-xs">
                                <p className="text-sm">
                                  DNS (Domain Name System) management means you can log in to your domain registrar 
                                  (like GoDaddy, Namecheap, etc.) and update settings. We'll need access to point 
                                  your domain to your new website.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'client', label: 'I have access' },
                            { value: 'tluca', label: 'TLUCA will manage' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateField('dnsManager', option.value)}
                              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                                formData.dnsManager === option.value
                                  ? 'border-white bg-white/10'
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
                  <Label htmlFor="specialNotes" className="text-white">Anything We're Missing?</Label>
                  <p className="text-sm text-gray-400 mb-2">Let us know if there's anything else you'd like us to include, any custom features you need, or special requests</p>
                  <Textarea
                    id="specialNotes"
                    value={formData.specialNotes}
                    onChange={(e) => updateField('specialNotes', e.target.value)}
                    className="bg-white/5 border-white/10 text-white min-h-32 placeholder:text-gray-500"
                    placeholder="e.g., 'Need a customer portal', 'Want integration with X software', 'Special booking system requirements', 'Custom payment processing'..."
                  />
                </div>
              </>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <>
                <div className="space-y-6">
                  {/* Business Information */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-white text-lg">Business Information</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(0)} className="text-white/70 hover:text-white">
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p><strong className="text-gray-300">Business Name:</strong> {formData.businessName || '—'}</p>
                      <p><strong className="text-gray-300">Contact:</strong> {formData.contactName || '—'}</p>
                      <p><strong className="text-gray-300">Email:</strong> {formData.businessEmail || '—'}</p>
                      <p><strong className="text-gray-300">Phone:</strong> {formData.businessPhone || '—'}</p>
                      {formData.businessAddress.street && (
                        <p><strong className="text-gray-300">Address:</strong> {formData.businessAddress.street}, {formData.businessAddress.city}, {formData.businessAddress.state} {formData.businessAddress.zip}</p>
                      )}
                      {formData.businessNiche && <p><strong className="text-gray-300">Industry:</strong> {formData.businessNiche}</p>}
                      {formData.businessDescription && <p><strong className="text-gray-300">Description:</strong> {formData.businessDescription}</p>}
                      {formData.servicesOffered && <p><strong className="text-gray-300">Services:</strong> {formData.servicesOffered}</p>}
                      {formData.serviceAreas && <p><strong className="text-gray-300">Service Areas:</strong> {formData.serviceAreas}</p>}
                    </div>
                  </div>

                  {/* Branding & Design */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-white text-lg">Branding & Design</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="text-white/70 hover:text-white">
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p><strong className="text-gray-300">Logo:</strong> {formData.logoFile ? '✓ Uploaded' : 'Not uploaded'}</p>
                      <p><strong className="text-gray-300">Photos:</strong> {formData.photoFiles.length} file(s)</p>
                      <p><strong className="text-gray-300">Certificates:</strong> {formData.certFiles.length} file(s)</p>
                      <p><strong className="text-gray-300">Color Scheme:</strong> {formData.colorScheme.replace('-', ' ')}</p>
                      {formData.slogan && <p><strong className="text-gray-300">Slogan:</strong> {formData.slogan}</p>}
                      <p><strong className="text-gray-300">About Us Section:</strong> {formData.hasAboutUs ? 'Yes' : 'No'}</p>
                      <p><strong className="text-gray-300">Meet the Team Section:</strong> {formData.hasMeetTheTeam ? `Yes (${formData.teamMembers.length} members)` : 'No'}</p>
                      {formData.inspirationSites.filter(s => s).length > 0 && (
                        <p><strong className="text-gray-300">Inspiration Sites:</strong> {formData.inspirationSites.filter(s => s).length} provided</p>
                      )}
                    </div>
                  </div>

                  {/* Online Presence */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-white text-lg">Online Presence</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="text-white/70 hover:text-white">
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p><strong className="text-gray-300">Existing Website:</strong> {formData.hasExistingWebsite ? `Yes (${formData.currentDomain})` : 'No'}</p>
                      {!formData.hasExistingWebsite && formData.desiredDomain && (
                        <p><strong className="text-gray-300">Desired Domain:</strong> {formData.desiredDomain}</p>
                      )}
                      <p><strong className="text-gray-300">Google Business Profile:</strong> {formData.hasGoogleBusiness ? 'Yes' : 'No'}</p>
                      {Object.entries(formData.socialLinks).filter(([_, v]) => v).length > 0 && (
                        <p><strong className="text-gray-300">Social Media:</strong> {Object.entries(formData.socialLinks).filter(([_, v]) => v).map(([k]) => k).join(', ')}</p>
                      )}
                    </div>
                  </div>

                  {/* Leads & Communication */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-white text-lg">Leads & Communication</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)} className="text-white/70 hover:text-white">
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p><strong className="text-gray-300">Lead Alert Method:</strong> {formData.leadAlertMethod || '—'}</p>
                      {formData.alertPhone && <p><strong className="text-gray-300">Alert Phone:</strong> {formData.alertPhone}</p>}
                      {formData.alertEmail && <p><strong className="text-gray-300">Alert Email:</strong> {formData.alertEmail}</p>}
                      <p><strong className="text-gray-300">Lead Form Fields:</strong> {formData.leadFormFields.length} fields</p>
                      <p><strong className="text-gray-300">Bookings/Payments:</strong> {formData.bookingsPayments}</p>
                      <p><strong className="text-gray-300">Portfolio Section:</strong> {formData.hasPortfolio ? `Yes (${formData.portfolioFiles.length} items)` : 'No'}</p>
                      <p><strong className="text-gray-300">Reviews Section:</strong> {formData.hasReviews ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  {/* Final Details */}
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-white text-lg">Final Details</h3>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(4)} className="text-white/70 hover:text-white">
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p><strong className="text-gray-300">Domain Ownership:</strong> {formData.ownsDomain ? `Yes (${formData.ownedDomain})` : 'No'}</p>
                      {formData.ownsDomain && <p><strong className="text-gray-300">DNS Management:</strong> {formData.dnsManager === 'client' ? 'I have access' : 'TLUCA will manage'}</p>}
                      {formData.complianceNeeds && <p><strong className="text-gray-300">Compliance Needs:</strong> {formData.complianceNeeds}</p>}
                      {formData.specialNotes && <p><strong className="text-gray-300">Special Requests:</strong> {formData.specialNotes}</p>}
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
                  {errors.consentConfirmed && <p className="text-white/70 text-sm mt-2">{errors.consentConfirmed}</p>}
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t border-white/10">
              <Button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 0}
                variant="outline"
                className="border-white/10 hover:bg-white/5 text-white disabled:opacity-50 w-full sm:w-auto order-2 sm:order-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Back</span>
              </Button>

              {currentStep < SECTIONS.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-white hover:bg-gray-200 text-black font-semibold w-full sm:w-auto order-1 sm:order-2"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Continue</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-white hover:bg-gray-200 text-black font-semibold disabled:opacity-50 w-full sm:w-auto order-1 sm:order-2"
                >
                  {isSubmitting ? 'Submitting...' : <><span className="hidden sm:inline">Submit Onboarding</span><span className="sm:hidden">Submit</span></>}
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-sm mt-6">
          Questions? Email <a href="mailto:tlucasystems@gmail.com" className="text-white hover:underline">tlucasystems@gmail.com</a>
        </p>
        </div>
      </div>
    </div>
  )
}

