"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
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
  // A) Business & Contact
  business_name: string
  first_name: string
  last_name: string
  contact_phone: string
  contact_email: string
  business_city: string
  business_state: string
  years_in_service: string
  business_type: string
  
  // B) Services
  services_primary: string[]
  services_secondary: string
  
  // C) Service Areas
  market_type: 'Residential' | 'Commercial' | 'Both' | ''
  service_areas: string[]
  
  // D) Branding & Media
  logoFile: File | null
  logo_url: string | null
  galleryFiles: File[]
  gallery_urls: string[]
  brand_colors: string
  design_constraints: string
  
  // E) About & Messaging
  about_text: string
  tagline: string
  
  // F) Site Contact Details
  site_phone: string
  site_email: string
  use_same_as_contact: boolean
  business_hours: {
    mon: { open: string; close: string; closed: boolean }
    tue: { open: string; close: string; closed: boolean }
    wed: { open: string; close: string; closed: boolean }
    thu: { open: string; close: string; closed: boolean }
    fri: { open: string; close: string; closed: boolean }
    sat: { open: string; close: string; closed: boolean }
    sun: { open: string; close: string; closed: boolean }
  }
  preferred_contact: 'Phone' | 'Text' | 'Email' | ''
  
  // G) Social & GBP
  facebook_url: string
  instagram_url: string
  google_profile_url: string
  
  // H) Domain
  has_domain: 'Yes' | 'No' | ''
  domain_current: string
  request_domain_purchase: 'Yes' | 'No' | ''
  domain_preferences: string
  
  // I) Final
  internal_notes: string
  consent_accepted: boolean
  
  // SMS Consent
  sms_consent: boolean
  
  // Hidden/System
  form_id: string
  source: string
  submitted_at: string
  honeypot: string // Anti-spam
}

// Add image preview state type
type ImagePreviews = {
  [key: string]: string // filename -> data URL
}

const INITIAL_DATA: OnboardingData = {
  // A) Business & Contact
  business_name: '',
  first_name: '',
  last_name: '',
  contact_phone: '',
  contact_email: '',
  business_city: '',
  business_state: '',
  years_in_service: '',
  business_type: '',
  
  // B) Services
  services_primary: [],
  services_secondary: '',
  
  // C) Service Areas
  market_type: '',
  service_areas: [],
  
  // D) Branding & Media
  logoFile: null,
  logo_url: null,
  galleryFiles: [],
  gallery_urls: [],
  brand_colors: '',
  design_constraints: '',
  
  // E) About & Messaging
  about_text: '',
  tagline: '',
  
  // F) Site Contact Details
  site_phone: '',
  site_email: '',
  use_same_as_contact: true,
  business_hours: {
    mon: { open: '08:00', close: '17:00', closed: false },
    tue: { open: '08:00', close: '17:00', closed: false },
    wed: { open: '08:00', close: '17:00', closed: false },
    thu: { open: '08:00', close: '17:00', closed: false },
    fri: { open: '08:00', close: '17:00', closed: false },
    sat: { open: '09:00', close: '13:00', closed: false },
    sun: { open: '', close: '', closed: true },
  },
  preferred_contact: '',
  
  // G) Social & GBP
  facebook_url: '',
  instagram_url: '',
  google_profile_url: '',
  
  // H) Domain
  has_domain: '',
  domain_current: '',
  request_domain_purchase: '',
  domain_preferences: '',
  
  // I) Final
  internal_notes: '',
  consent_accepted: false,
  
  // SMS Consent
  sms_consent: false,
  
  // Hidden/System
  form_id: 'waas_onboarding_v1',
  source: 'stripe_onboarding_site',
  submitted_at: '',
  honeypot: '',
}

const BUSINESS_TYPES = [
  'Concrete', 'Roofing', 'Landscaping', 'HVAC', 'Plumbing', 'Electrical Services',
  'Painting', 'Flooring', 'Windows & Doors', 'Fencing', 'Construction',
  'General Dentistry', 'Orthodontics', 'Healthcare', 'Chiropractic',
  'Beauty Salons', 'Tattoo Shops', 'Personal Training', 'Fitness Centers',
  'Auto Services', 'Auto Repair', 'Towing Services',
  'Professional Services', 'Marketing Agency', 'Real Estate', 'Insurance',
  'Food Services', 'Wedding Services', 'Event Planning', 'Moving Services',
  'Other'
]

const CONCRETE_SERVICES = [
  'Driveways', 'Patios', 'Foundations', 'Slabs', 'Walkways', 'Stamped', 'Retaining Walls', 'Repair'
]

const SECTIONS = [
  { id: 'business', title: 'Business & Contact', icon: Building2 },
  { id: 'services', title: 'Services', icon: FileText },
  { id: 'areas', title: 'Service Areas', icon: Globe },
  { id: 'branding', title: 'Branding & Media', icon: Palette },
  { id: 'about', title: 'About & Messaging', icon: MessageSquare },
  { id: 'contact', title: 'Site Contact Details', icon: Mail },
  { id: 'social', title: 'Social & Google Business', icon: Globe },
  { id: 'domain', title: 'Domain', icon: Home },
  { id: 'final', title: 'Final', icon: CheckCircle2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imagePreviews, setImagePreviews] = useState<ImagePreviews>({})
  const [operatorCode, setOperatorCode] = useState<string | null>(null)
  
  // TESTING MODE - Set to true to only show first step
  const TESTING_MODE = false

  // Capture operator code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const operator = params.get('operator')
    if (operator) {
      setOperatorCode(operator.toLowerCase())
      console.log(`📋 Operator code captured: ${operator}`)
    }
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
      const isValidType = f.type.startsWith('image/')
      if (!isValidSize) toast.error(`${f.name} is too large (max 10MB)`)
      if (!isValidType) toast.error(`${f.name} must be an image`)
      return isValidSize && isValidType
    })

    // Limit to 10 images for gallery
    if (multiple && field === 'galleryFiles') {
      const currentCount = formData.galleryFiles.length
      if (currentCount + validFiles.length > 10) {
        toast.error('Maximum 10 images allowed')
        validFiles.splice(10 - currentCount)
      }
    }

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
      // Remove preview
      const fileArray = prev[field] as File[]
      if (fileArray[index]) {
        const newPreviews = { ...imagePreviews }
        delete newPreviews[fileArray[index].name]
        setImagePreviews(newPreviews)
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: null }))
    }
  }

  // Service area chip management
  const [serviceAreaInput, setServiceAreaInput] = useState('')
  
  const addServiceArea = () => {
    const area = serviceAreaInput.trim()
    if (area && !formData.service_areas.includes(area)) {
      updateField('service_areas', [...formData.service_areas, area])
      setServiceAreaInput('')
    }
  }

  const removeServiceArea = (area: string) => {
    updateField('service_areas', formData.service_areas.filter(a => a !== area))
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 0) { // A) Business & Contact
      if (!formData.business_name.trim()) newErrors.business_name = 'Business name is required'
      if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
      if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
      if (!formData.contact_phone.trim()) newErrors.contact_phone = 'Phone is required'
      if (!formData.contact_email.trim()) newErrors.contact_email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) newErrors.contact_email = 'Invalid email'
      if (!formData.business_city.trim()) newErrors.business_city = 'City is required'
      if (!formData.business_state.trim()) newErrors.business_state = 'State is required'
      if (!formData.years_in_service.trim()) newErrors.years_in_service = 'Years in service is required'
      if (!formData.business_type.trim()) newErrors.business_type = 'Business type is required'
    }

    if (step === 1) { // B) Services
      if (formData.services_primary.length === 0) newErrors.services_primary = 'At least one service is required'
    }

    if (step === 2) { // C) Service Areas
      if (!formData.market_type) newErrors.market_type = 'Market type is required'
      if (formData.service_areas.length === 0) newErrors.service_areas = 'At least one service area is required'
    }

    // Step 3 (Branding) - no required fields

    if (step === 4) { // E) About & Messaging
      if (!formData.about_text.trim()) newErrors.about_text = 'About text is required (2-4 sentences)'
      else if (formData.about_text.trim().split(/[.!?]+/).filter(s => s.trim().length > 0).length < 2) {
        newErrors.about_text = 'Please provide at least 2 sentences'
      }
    }

    if (step === 5) { // F) Site Contact Details
      if (!formData.site_phone.trim()) newErrors.site_phone = 'Site phone is required'
      if (!formData.site_email.trim()) newErrors.site_email = 'Site email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.site_email)) newErrors.site_email = 'Invalid email'
      if (!formData.preferred_contact) newErrors.preferred_contact = 'Preferred contact method is required'
    }

    // Step 6 (Social) - no required fields

    if (step === 7) { // H) Domain
      if (!formData.has_domain) newErrors.has_domain = 'Please specify if you have a domain'
      if (formData.has_domain === 'Yes' && !formData.domain_current.trim()) {
        newErrors.domain_current = 'Domain URL is required'
      }
      if (formData.has_domain === 'No' && !formData.request_domain_purchase) {
        newErrors.request_domain_purchase = 'Please specify if you want us to purchase a domain'
      }
    }

    if (step === 8) { // I) Final
      if (!formData.consent_accepted) newErrors.consent_accepted = 'You must confirm the information is accurate'
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

    // Check honeypot (anti-spam)
    if (formData.honeypot) {
      toast.error('Spam detected')
      return
    }

    setIsSubmitting(true)
    try {
      toast.loading('Uploading files...')

      // Upload files to Cloudinary
      let logoUrl: string | null = null
      let galleryUrls: string[] = []

      if (formData.logoFile) {
        logoUrl = await uploadFileToCloudinary(formData.logoFile)
        if (logoUrl) updateField('logo_url', logoUrl)
      }

      for (const file of formData.galleryFiles) {
        const url = await uploadFileToCloudinary(file)
        if (url) galleryUrls.push(url)
      }

      // Normalize URLs helper
      const normalizeUrl = (url: string) => {
        if (!url) return ''
        if (url.startsWith('http://') || url.startsWith('https://')) return url
        return `https://${url}`
      }

      // TESTING MODE: Fill in dummy data for required fields
      const testData = TESTING_MODE ? {
        services_primary: formData.services_primary.length > 0 ? formData.services_primary : ['Test Service'],
        services_secondary: formData.services_secondary || 'Test secondary services',
        market_type: formData.market_type || 'Both',
        service_areas: formData.service_areas.length > 0 ? formData.service_areas : ['Test City'],
        about_text: formData.about_text || 'This is a test submission for ClickUp integration testing. This business provides quality services.',
        tagline: formData.tagline || 'Test Tagline',
        site_phone: formData.site_phone || formData.contact_phone,
        site_email: formData.site_email || formData.contact_email,
        preferred_contact: formData.preferred_contact || 'Email',
        has_domain: formData.has_domain || 'No',
        request_domain_purchase: formData.request_domain_purchase || 'No',
        consent_accepted: true,
      } : {}

      // Prepare payload according to spec
      const payload = {
        form_id: 'waas_onboarding_v1',
        source: 'stripe_onboarding_site',
        submitted_at: new Date().toISOString(),
        
        // A) Business & Contact
        business_name: formData.business_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        business_city: formData.business_city,
        business_state: formData.business_state,
        years_in_service: formData.years_in_service,
        business_type: formData.business_type,
        
        // B) Services
        services_primary: TESTING_MODE ? testData.services_primary : formData.services_primary,
        services_secondary: TESTING_MODE ? testData.services_secondary : (formData.services_secondary || ''),
        
        // C) Service Areas
        market_type: TESTING_MODE ? testData.market_type : formData.market_type,
        service_areas: TESTING_MODE ? testData.service_areas : formData.service_areas,
        
        // D) Branding & Media
        logo_url: logoUrl || '',
        gallery_urls: galleryUrls,
        brand_colors: formData.brand_colors || '',
        design_constraints: formData.design_constraints || '',
        
        // E) About & Messaging
        about_text: TESTING_MODE ? testData.about_text : formData.about_text,
        tagline: TESTING_MODE ? testData.tagline : (formData.tagline || ''),
        
        // F) Site Contact Details
        site_phone: TESTING_MODE ? testData.site_phone : formData.site_phone,
        site_email: TESTING_MODE ? testData.site_email : formData.site_email,
        business_hours: formData.business_hours,
        preferred_contact: TESTING_MODE ? testData.preferred_contact : formData.preferred_contact,
        
        // G) Social & GBP
        facebook_url: normalizeUrl(formData.facebook_url),
        instagram_url: normalizeUrl(formData.instagram_url),
        google_profile_url: normalizeUrl(formData.google_profile_url),
        
        // H) Domain
        has_domain: TESTING_MODE ? testData.has_domain : formData.has_domain,
        domain_current: formData.domain_current || '',
        request_domain_purchase: TESTING_MODE ? testData.request_domain_purchase : (formData.request_domain_purchase || ''),
        domain_preferences: formData.domain_preferences || '',
        
        // I) Final
        internal_notes: formData.internal_notes || '',
        consent_accepted: TESTING_MODE ? testData.consent_accepted : formData.consent_accepted,
        
        // SMS Consent
        sms_consent: formData.sms_consent || false,
      }

      toast.dismiss()
      toast.loading('Submitting your onboarding...')

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
              <CardTitle className="text-4xl font-bold text-white mb-4">Thanks — we've got everything we need.</CardTitle>
              <CardDescription className="text-gray-400 text-xl leading-relaxed space-y-4">
                <p>
                  Someone from our team will review your details and start your build immediately. You'll receive SMS updates as we progress through each stage of your project.
                </p>
                <p className="text-gray-500 text-lg">
                  If you forgot to include any details or have questions, text your representative at {formData.contact_phone} or email us at {formData.contact_email}.
                </p>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <div className="flex justify-center">
              <Button
                onClick={() => router.push('/dashboard')}
                className="bg-white hover:bg-gray-200 text-black font-semibold"
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Testing Mode Banner */}
      {TESTING_MODE && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-black text-center py-2 px-4 font-bold">
          🧪 TESTING MODE - Only Step 1 Required - Dummy Data Auto-Filled
        </div>
      )}
      
      {/* Mobile Header - Shows only on mobile */}
      <div className={`lg:hidden sticky ${TESTING_MODE ? 'top-10' : 'top-0'} z-50 bg-black border-b border-white/10`}>
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
                Please complete all 9 steps to provide us with the information we need to build your solution.
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
                {currentStep === 0 && "Tell us about your business and contact information"}
                {currentStep === 1 && "What services do you offer?"}
                {currentStep === 2 && "Where do you serve customers?"}
                {currentStep === 3 && "Share your branding and media"}
                {currentStep === 4 && "Tell us about your business"}
                {currentStep === 5 && "How should customers contact you?"}
                {currentStep === 6 && "Your social media and Google Business Profile"}
                {currentStep === 7 && "Domain information"}
                {currentStep === 8 && "Final details and confirmation"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
            {/* Step 0: A) Business & Contact */}
            {currentStep === 0 && (
              <>
                {/* Honeypot field (hidden) */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  style={{ position: 'absolute', left: '-9999px' }}
                  onChange={(e) => updateField('honeypot', e.target.value)}
                />

                <div>
                  <Label htmlFor="business_name" className="text-white">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => updateField('business_name', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., Smith's Construction & Services"
                  />
                  {errors.business_name && <p className="text-red-400 text-sm mt-1">{errors.business_name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name" className="text-white">First Name *</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="e.g., John"
                    />
                    {errors.first_name && <p className="text-red-400 text-sm mt-1">{errors.first_name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="last_name" className="text-white">Last Name *</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="e.g., Smith"
                    />
                    {errors.last_name && <p className="text-red-400 text-sm mt-1">{errors.last_name}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_phone" className="text-white">Phone *</Label>
                    <Input
                      id="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => updateField('contact_phone', formatPhoneNumber(e.target.value))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="(555) 123-4567"
                    />
                    {errors.contact_phone && <p className="text-red-400 text-sm mt-1">{errors.contact_phone}</p>}
                    <div className="flex items-start gap-2 mt-3">
                      <Checkbox
                        id="sms_consent"
                        checked={formData.sms_consent}
                        onCheckedChange={(checked) => updateField('sms_consent', checked)}
                        className="border-white/20 mt-1"
                      />
                      <Label htmlFor="sms_consent" className="text-gray-400 text-sm cursor-pointer leading-relaxed">
                        By checking this box, I consent to receive transactional messages related to my account, orders, or services I have requested from TLUCA Systems. These messages may include appointment reminders, order confirmations, and account notifications among others. Message frequency may vary. Message & Data rates may apply. Reply HELP for help or STOP to opt-out.
                      </Label>
                  </div>
                </div>

                  <div>
                    <Label htmlFor="contact_email" className="text-white">Email *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => updateField('contact_email', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="hello@business.com"
                    />
                    {errors.contact_email && <p className="text-red-400 text-sm mt-1">{errors.contact_email}</p>}
                  </div>
                    </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <Label htmlFor="business_city" className="text-white">Business City *</Label>
                      <Input
                      id="business_city"
                      value={formData.business_city}
                      onChange={(e) => updateField('business_city', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="e.g., Houston"
                      />
                    {errors.business_city && <p className="text-red-400 text-sm mt-1">{errors.business_city}</p>}
                    </div>

                    <div>
                    <Label htmlFor="business_state" className="text-white">State/Province *</Label>
                      <Input
                      id="business_state"
                      value={formData.business_state}
                      onChange={(e) => updateField('business_state', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="e.g., TX"
                    />
                    {errors.business_state && <p className="text-red-400 text-sm mt-1">{errors.business_state}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="years_in_service" className="text-white">Years in Service *</Label>
                  <Input
                    id="years_in_service"
                    value={formData.years_in_service}
                    onChange={(e) => updateField('years_in_service', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., Since 2017 or 10+ years"
                  />
                  {errors.years_in_service && <p className="text-red-400 text-sm mt-1">{errors.years_in_service}</p>}
                </div>

                <div>
                  <Label htmlFor="business_type" className="text-white">Business Type *</Label>
                  <select
                    id="business_type"
                    value={formData.business_type}
                    onChange={(e) => updateField('business_type', e.target.value)}
                    className="w-full bg-black border border-white/20 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="">Select business type...</option>
                    {BUSINESS_TYPES.map(type => (
                      <option key={type} value={type} className="bg-black text-white">{type}</option>
                    ))}
                  </select>
                  {errors.business_type && <p className="text-red-400 text-sm mt-1">{errors.business_type}</p>}
                </div>
              </>
            )}

            {/* Step 1: B) Services */}
            {currentStep === 1 && (
              <>
                <div>
                  <Label className="text-white mb-3 block">Main Services *</Label>
                  <p className="text-gray-400 text-sm mb-4">Select all that apply</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {CONCRETE_SERVICES.map(service => (
                      <div key={service} className="flex items-center space-x-2">
                          <Checkbox
                          id={`service-${service}`}
                          checked={formData.services_primary.includes(service)}
                            onCheckedChange={(checked) => {
                            if (checked) {
                              updateField('services_primary', [...formData.services_primary, service])
                            } else {
                              updateField('services_primary', formData.services_primary.filter(s => s !== service))
                            }
                            }}
                            className="border-white/20"
                          />
                        <Label htmlFor={`service-${service}`} className="text-white cursor-pointer text-sm">
                          {service}
                          </Label>
                      </div>
                    ))}
                  </div>
                  {errors.services_primary && <p className="text-red-400 text-sm mt-2">{errors.services_primary}</p>}
                </div>

                <div>
                  <Label htmlFor="services_secondary" className="text-white">Other Services (optional)</Label>
                  <Textarea
                    id="services_secondary"
                    value={formData.services_secondary}
                    onChange={(e) => updateField('services_secondary', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-24"
                    placeholder="e.g., Additional services or specialties..."
                  />
                        </div>
              </>
            )}

            {/* Step 2: C) Service Areas */}
            {currentStep === 2 && (
              <>
                <div>
                  <Label className="text-white mb-3 block">Serve Residential / Commercial / Both *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Residential', 'Commercial', 'Both'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateField('market_type', type)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          formData.market_type === type
                            ? 'border-white bg-white/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="text-white">{type}</span>
                      </button>
                    ))}
                  </div>
                  {errors.market_type && <p className="text-red-400 text-sm mt-2">{errors.market_type}</p>}
                            </div>
                            
                <div>
                  <Label className="text-white mb-3 block">Cities/Areas Served *</Label>
                  <p className="text-gray-400 text-sm mb-3">Add cities or areas where you provide services</p>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={serviceAreaInput}
                      onChange={(e) => setServiceAreaInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addServiceArea()
                        }
                      }}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="e.g., Houston, TX"
                    />
                              <Button
                                type="button"
                      onClick={addServiceArea}
                      className="bg-white hover:bg-gray-200 text-black"
                    >
                      Add
                              </Button>
                          </div>
                  {formData.service_areas.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.service_areas.map((area, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full"
                        >
                          <span className="text-white text-sm">{area}</span>
                          <button
                            type="button"
                            onClick={() => removeServiceArea(area)}
                            className="text-white/70 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                      </div>
                      ))}
                  </div>
                  )}
                  {errors.service_areas && <p className="text-red-400 text-sm mt-2">{errors.service_areas}</p>}
                </div>
              </>
            )}

            {/* Step 3: D) Branding & Media */}
            {currentStep === 3 && (
              <>
                <div>
                  <Label className="text-white mb-2 block">Logo (optional)</Label>
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
                  <Label className="text-white mb-2 block">Project Photos (optional, max 10)</Label>
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
                        handleFileUpload('galleryFiles', e.dataTransfer.files, true)
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFileUpload('galleryFiles', e.target.files, true)}
                      className="hidden"
                      id="gallery-upload"
                    />
                    <label htmlFor="gallery-upload" className="cursor-pointer block">
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-400">Click or drag & drop photos here</p>
                      <p className="text-gray-500 text-xs">{formData.galleryFiles.length} / 10 file(s) selected</p>
                    </label>
                  </div>
                  {formData.galleryFiles.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {formData.galleryFiles.map((file, idx) => (
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
                            onClick={() => removeFile('galleryFiles', idx)}
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
                  <Label htmlFor="brand_colors" className="text-white">Brand Colors (optional)</Label>
                  <Input
                    id="brand_colors"
                    value={formData.brand_colors}
                    onChange={(e) => updateField('brand_colors', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., #111111, #b22222, #ffffff or black/white/red"
                  />
                </div>

                <div>
                  <Label htmlFor="design_constraints" className="text-white">Anything to avoid in design? (optional)</Label>
                    <Textarea
                    id="design_constraints"
                    value={formData.design_constraints}
                    onChange={(e) => updateField('design_constraints', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-24"
                    placeholder="e.g., No neon colors. Clean, construction feel."
                  />
                </div>
              </>
            )}

            {/* Step 4: E) About & Messaging */}
            {currentStep === 4 && (
              <>
                <div>
                  <Label htmlFor="about_text" className="text-white">About Paragraph *</Label>
                  <p className="text-gray-400 text-sm mb-2">2-4 sentences describing your business</p>
                  <Textarea
                    id="about_text"
                    value={formData.about_text}
                    onChange={(e) => updateField('about_text', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-32"
                    placeholder="We provide high-quality services to customers throughout the area. With over 10 years of experience, we specialize in [your main services]..."
                  />
                  {errors.about_text && <p className="text-red-400 text-sm mt-1">{errors.about_text}</p>}
                </div>

                <div>
                  <Label htmlFor="tagline" className="text-white">Tagline / Slogan (optional)</Label>
                    <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => updateField('tagline', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., Quality service you can trust."
                  />
                </div>
              </>
            )}

            {/* Step 5: F) Site Contact Details */}
            {currentStep === 5 && (
              <>
                <div>
                  <Label className="text-white mb-3 block">Use same as contact info?</Label>
                  <div className="flex items-center gap-3 mb-4">
                    <Checkbox
                      id="use_same_as_contact"
                      checked={formData.use_same_as_contact}
                      onCheckedChange={(checked) => {
                        updateField('use_same_as_contact', checked)
                        if (checked) {
                          updateField('site_phone', formData.contact_phone)
                          updateField('site_email', formData.contact_email)
                        }
                      }}
                      className="border-white/20"
                    />
                    <Label htmlFor="use_same_as_contact" className="text-white cursor-pointer">
                      Use same phone and email as contact info
                    </Label>
                  </div>
                </div>

                {!formData.use_same_as_contact && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="site_phone" className="text-white">Phone to Display *</Label>
                    <Input
                          id="site_phone"
                          type="tel"
                          value={formData.site_phone}
                          onChange={(e) => updateField('site_phone', formatPhoneNumber(e.target.value))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                          placeholder="(555) 123-4567"
                        />
                        {errors.site_phone && <p className="text-red-400 text-sm mt-1">{errors.site_phone}</p>}
                      </div>

                      <div>
                        <Label htmlFor="site_email" className="text-white">Email to Display *</Label>
                      <Input
                          id="site_email"
                          type="email"
                          value={formData.site_email}
                          onChange={(e) => updateField('site_email', e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                          placeholder="hello@business.com"
                      />
                        {errors.site_email && <p className="text-red-400 text-sm mt-1">{errors.site_email}</p>}
                    </div>
                    </div>
                  </>
                )}

                {formData.use_same_as_contact && (
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10 mb-4">
                    <p className="text-gray-400 text-sm">
                      Site will display: <span className="text-white">{formData.contact_phone}</span> and <span className="text-white">{formData.contact_email}</span>
                    </p>
                </div>
                )}

                <div>
                  <Label className="text-white mb-3 block">Business Hours *</Label>
                <div className="space-y-3">
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((day, idx) => {
                      const dayData = formData.business_hours?.[day] || { open: '08:00', close: '17:00', closed: false }
                      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                      return (
                        <div key={day} className="bg-white/5 p-3 rounded-lg space-y-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                              id={`${day}-closed`}
                              checked={dayData.closed}
                              onCheckedChange={(checked) => {
                                updateField('business_hours', {
                                  ...formData.business_hours,
                                  [day]: { ...dayData, closed: !!checked }
                                })
                              }}
                      className="border-white/20"
                    />
                            <Label htmlFor={`${day}-closed`} className="text-white flex-1 cursor-pointer font-medium">
                              {dayNames[idx]}
                            </Label>
                            {dayData.closed && (
                              <span className="text-gray-400 text-sm italic">Closed</span>
                            )}
                  </div>
                          {!dayData.closed && (
                            <div className="flex items-center gap-2 pl-8">
                              <select
                                value={dayData.open}
                                onChange={(e) => {
                                  updateField('business_hours', {
                                    ...formData.business_hours,
                                    [day]: { ...dayData, open: e.target.value }
                                  })
                                }}
                                className="bg-black border border-white/20 text-white rounded px-2 py-2 text-sm min-w-[120px]"
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
                                  updateField('business_hours', {
                                    ...formData.business_hours,
                                    [day]: { ...dayData, close: e.target.value }
                                  })
                                }}
                                className="bg-black border border-white/20 text-white rounded px-2 py-2 text-sm min-w-[120px]"
                                style={{ colorScheme: 'dark' }}
                              >
                                {generateTimeOptions().map(({ value, label }) => (
                                  <option key={value} value={value} className="bg-black text-white">
                                    {label}
                                  </option>
                                ))}
                              </select>
                    </div>
                  )}
                </div>
                      )
                    })}
                      </div>
                  </div>

                <div>
                  <Label className="text-white mb-3 block">Preferred Contact Method *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Phone', 'Text', 'Email'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => updateField('preferred_contact', method)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          formData.preferred_contact === method
                            ? 'border-white bg-white/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="text-white">{method}</span>
                      </button>
                    ))}
                  </div>
                  {errors.preferred_contact && <p className="text-red-400 text-sm mt-2">{errors.preferred_contact}</p>}
                </div>
              </>
            )}

            {/* Step 6: G) Social & GBP */}
            {currentStep === 6 && (
              <>
                  <div>
                  <Label htmlFor="facebook_url" className="text-white">Facebook URL (optional)</Label>
                    <Input
                    id="facebook_url"
                    type="url"
                    value={formData.facebook_url}
                    onChange={(e) => updateField('facebook_url', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="https://facebook.com/yourbusiness"
                    />
                  </div>

                  <div>
                  <Label htmlFor="instagram_url" className="text-white">Instagram URL (optional)</Label>
                    <Input
                    id="instagram_url"
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => updateField('instagram_url', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="https://instagram.com/yourbusiness"
                    />
                  </div>

                <div>
                  <Label htmlFor="google_profile_url" className="text-white">Google Business Profile URL (optional)</Label>
                  <Input
                    id="google_profile_url"
                    type="url"
                    value={formData.google_profile_url}
                    onChange={(e) => updateField('google_profile_url', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="https://g.page/r/XXXX"
                  />
                      </div>
              </>
            )}

            {/* Step 7: H) Domain */}
            {currentStep === 7 && (
              <>
                <div>
                  <Label className="text-white mb-3 block">Do you already own a domain? *</Label>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {['Yes', 'No'].map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateField('has_domain', option)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all ${
                          formData.has_domain === option
                            ? 'border-white bg-white/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <span className="text-white">{option}</span>
                      </button>
                    ))}
                  </div>
                  {errors.has_domain && <p className="text-red-400 text-sm mb-4">{errors.has_domain}</p>}
                </div>

                {formData.has_domain === 'Yes' && (
                  <div>
                    <Label htmlFor="domain_current" className="text-white">Domain URL *</Label>
                    <Input
                      id="domain_current"
                      type="url"
                      value={formData.domain_current}
                      onChange={(e) => updateField('domain_current', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="https://yourbusiness.com"
                    />
                    {errors.domain_current && <p className="text-red-400 text-sm mt-1">{errors.domain_current}</p>}
                    </div>
                    )}

                {formData.has_domain === 'No' && (
                  <>
                      <div>
                      <Label className="text-white mb-3 block">Would you like us to purchase & manage it for you? *</Label>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {['Yes', 'No'].map(option => (
                            <button
                            key={option}
                              type="button"
                            onClick={() => updateField('request_domain_purchase', option)}
                              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                              formData.request_domain_purchase === option
                                  ? 'border-white bg-white/10'
                                  : 'border-white/10 bg-white/5 hover:border-white/20'
                              }`}
                            >
                            <span className="text-white">{option}</span>
                            </button>
                          ))}
                        </div>
                      {errors.request_domain_purchase && <p className="text-red-400 text-sm mb-4">{errors.request_domain_purchase}</p>}
                </div>

                <div>
                      <Label htmlFor="domain_preferences" className="text-white">Desired domain ideas (optional)</Label>
                  <Input
                        id="domain_preferences"
                        value={formData.domain_preferences}
                        onChange={(e) => updateField('domain_preferences', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        placeholder="e.g., yourbusiness.com, yourcompany.com"
                  />
                </div>
                  </>
                )}
              </>
            )}

            {/* Step 8: I) Final */}
            {currentStep === 8 && (
              <>
                <div>
                  <Label htmlFor="internal_notes" className="text-white">Notes for our team (optional)</Label>
                  <Textarea
                    id="internal_notes"
                    value={formData.internal_notes}
                    onChange={(e) => updateField('internal_notes', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-32"
                    placeholder="e.g., Wants project gallery and stamped examples."
                  />
                </div>

                <div className="pt-6 border-t border-white/10">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent_accepted"
                      checked={formData.consent_accepted}
                      onCheckedChange={(checked) => updateField('consent_accepted', checked)}
                      className="border-white/20 mt-1"
                    />
                    <Label htmlFor="consent_accepted" className="text-white cursor-pointer leading-relaxed">
                      I confirm the info is accurate and authorize build. By submitting, you agree to our{' '}
                      <Link href="/terms" className="underline hover:text-gray-300 transition-colors">
                        Terms & Conditions
                      </Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="underline hover:text-gray-300 transition-colors">
                        Privacy Policy
                      </Link>
                      . *
                    </Label>
                  </div>
                  {errors.consent_accepted && <p className="text-red-400 text-sm mt-2">{errors.consent_accepted}</p>}
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6 border-t border-white/10">
              {/* Hide Previous button in testing mode (step 0) */}
              {currentStep > 0 && !TESTING_MODE && (
              <Button
                type="button"
                onClick={handlePrev}
                variant="outline"
                  className="border-white/10 hover:bg-white/5 text-white w-full sm:w-auto order-2 sm:order-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Back</span>
              </Button>
              )}

              {/* Show submit button on final step OR in testing mode on step 0 */}
              {(currentStep === SECTIONS.length - 1 || TESTING_MODE) ? (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-white hover:bg-gray-200 text-black font-semibold disabled:opacity-50 w-full sm:w-auto order-1 sm:order-2"
                >
                  {isSubmitting ? 'Submitting...' : <><span className="hidden sm:inline">{TESTING_MODE ? 'Test Submit' : 'Submit Onboarding'}</span><span className="sm:hidden">Submit</span></>}
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-white hover:bg-gray-200 text-black font-semibold w-full sm:w-auto order-1 sm:order-2"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Continue</span>
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500 text-sm mt-6 space-y-2">
          <p>
            Questions? Email <a href="mailto:tlucasystems@gmail.com" className="text-white hover:underline">tlucasystems@gmail.com</a>
          </p>
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <Link href="/privacy" className="text-gray-400 hover:text-white underline transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="text-gray-400 hover:text-white underline transition-colors">
              Terms & Conditions
            </Link>
          </p>
        </div>
        </div>
      </div>
    </div>
  )
}

