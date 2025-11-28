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
import { CheckCircle2, Building2, Upload, X, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

type OnboardingData = {
  // Business Information
  business_name: string
  friendly_business_name: string
  first_name: string
  last_name: string
  ein_number: string
  business_phone: string
  business_email: string
  business_address: string
  time_zone: string
  services_offered: string
  years_in_service: string
  business_type: string
  service_areas: string[]
  crm_recipients: { label: string; phone: string }[]
  
  // Resources
  logoFile: File | null
  logo_url: string | null
  imageFiles: File[]
  image_urls: string[]
  graphicFiles: File[]
  graphic_urls: string[]

  // Domain
  domain_option: 'already-own' | 'purchase-new' | 'transfer-existing' | ''
  desired_domain: string
  current_domain: string

  // Final
  consent_accepted: boolean
  
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
  // Business Information
  business_name: '',
  friendly_business_name: '',
  first_name: '',
  last_name: '',
  ein_number: '',
  business_phone: '',
  business_email: '',
  business_address: '',
  time_zone: '',
  services_offered: '',
  years_in_service: '',
  business_type: '',
  service_areas: [],
  crm_recipients: [],
  
  // Resources
  logoFile: null,
  logo_url: null,
  imageFiles: [],
  image_urls: [],
  graphicFiles: [],
  graphic_urls: [],

  // Domain
  domain_option: '',
  desired_domain: '',
  current_domain: '',

  // Final
  consent_accepted: false,
  
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

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imagePreviews, setImagePreviews] = useState<ImagePreviews>({})
  const [serviceAreaInput, setServiceAreaInput] = useState('')
  const [phoneLabel, setPhoneLabel] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [justMeNotifications, setJustMeNotifications] = useState(false)
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
    setCurrentStep(0)
    setErrors({})
  }, [])

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
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

    // Limit to specific numbers for each field
    if (field === 'logoFile') {
      if (validFiles.length > 1) {
        toast.error('Only one logo file allowed')
        validFiles.splice(1)
      }
    } else if (field === 'imageFiles') {
      const currentCount = formData.imageFiles.length
      if (currentCount + validFiles.length > 5) {
        toast.error('Maximum 5 image files allowed')
        validFiles.splice(5 - currentCount)
      }
    } else if (field === 'graphicFiles') {
      const currentCount = formData.graphicFiles.length
      if (currentCount + validFiles.length > 5) {
        toast.error('Maximum 5 graphic files allowed')
        validFiles.splice(5 - currentCount)
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

  const addPhoneRecipient = () => {
    const label = phoneLabel.trim()
    const phone = phoneNumber.trim()
    if (label && phone) {
      // Check if this label already exists
      const exists = formData.crm_recipients.some(recipient => recipient.label.toLowerCase() === label.toLowerCase())
      if (!exists) {
        // Basic phone validation (allows various formats)
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/
        if (phoneRegex.test(phone.replace(/\s/g, ''))) {
          updateField('crm_recipients', [...formData.crm_recipients, { label, phone }])
          setPhoneLabel('')
          setPhoneNumber('')
        } else {
          toast.error('Please enter a valid phone number')
        }
      } else {
        toast.error('This role already has a phone number')
      }
    } else {
      toast.error('Please enter both role and phone number')
    }
  }

  const removePhoneRecipient = (label: string) => {
    updateField('crm_recipients', formData.crm_recipients.filter(recipient => recipient.label !== label))
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

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 0) { // Business Information
      if (!formData.business_name.trim()) newErrors.business_name = 'Legal business name is required'
      if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
      if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
      if (!formData.ein_number.trim()) newErrors.ein_number = 'EIN number is required'
      if (!formData.business_phone.trim()) newErrors.business_phone = 'Business phone is required'
      if (!formData.business_email.trim()) newErrors.business_email = 'Business email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.business_email)) newErrors.business_email = 'Invalid email'
      if (!formData.business_address.trim()) newErrors.business_address = 'Business address is required'
      if (!formData.time_zone.trim()) newErrors.time_zone = 'Time zone is required'
      if (!formData.services_offered.trim()) newErrors.services_offered = 'Services offered is required'
      // Years in service and business type are optional but valuable
      if (!formData.domain_option) newErrors.domain_option = 'Domain option is required'
      if (formData.domain_option && !formData.desired_domain.trim()) newErrors.desired_domain = 'Desired domain is required'
      if (formData.domain_option === 'already-own' && !formData.current_domain.trim()) newErrors.current_domain = 'Current domain is required'
      if (!formData.consent_accepted) newErrors.consent_accepted = 'You must accept the terms'
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
      let imageUrls: string[] = []
      let graphicUrls: string[] = []

      if (formData.logoFile) {
        logoUrl = await uploadFileToCloudinary(formData.logoFile)
        if (logoUrl) updateField('logo_url', logoUrl)
      }

      for (const file of formData.imageFiles) {
        const url = await uploadFileToCloudinary(file)
        if (url) imageUrls.push(url)
      }

      for (const file of formData.graphicFiles) {
        const url = await uploadFileToCloudinary(file)
        if (url) graphicUrls.push(url)
      }

      toast.dismiss()
      toast.loading('Submitting your onboarding...')

      // Prepare payload with data
      const payload = {
        form_id: 'waas_onboarding_v1',
        source: 'stripe_onboarding_site',
        submitted_at: new Date().toISOString(),
        
        // Business Information
        business_name: formData.business_name,
        friendly_business_name: formData.friendly_business_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        ein_number: formData.ein_number,
        business_phone: formData.business_phone,
        business_email: formData.business_email,
        business_address: formData.business_address,
        time_zone: formData.time_zone,
        services_offered: formData.services_offered,
        years_in_service: formData.years_in_service,
        business_type: formData.business_type,
        service_areas: formData.service_areas,
        crm_recipients: formData.crm_recipients,

        // Resources
        logo_url: logoUrl || '',
        image_urls: imageUrls,
        graphic_urls: graphicUrls,

        // Domain
        domain_option: formData.domain_option,
        desired_domain: formData.desired_domain,
        current_domain: formData.current_domain,

        // Final
        consent_accepted: formData.consent_accepted,
      }

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
      <div className="min-h-screen bg-charcoal text-white selection:bg-brand selection:text-white flex items-center justify-center p-6">
        <div className="noise-overlay"></div>
        <Card className="max-w-3xl w-full bg-black/50 backdrop-blur-md border-white/10 shadow-2xl relative z-10">
          <CardHeader className="text-center space-y-6 pb-8 border-b border-white/10">
            <div className="mx-auto w-24 h-24 rounded-full bg-brand/10 flex items-center justify-center border-2 border-brand/20">
              <CheckCircle2 className="w-12 h-12 text-brand" />
            </div>
            <div>
              <CardTitle className="text-4xl font-bold text-white mb-4 font-display">INITIATION COMPLETE</CardTitle>
              <CardDescription className="text-gray-400 text-xl leading-relaxed space-y-4 font-mono">
                <p>
                  System parameters received. Deployment sequence initiating. You will receive status updates via secure transmission (SMS).
                </p>
                <p className="text-silver text-lg">
                  If parameters need adjustment, contact command at {formData.business_email}.
                </p>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <div className="flex justify-center">
              <Button
                onClick={() => router.push('/')}
                className="bg-brand hover:bg-brand-dark text-white font-semibold px-8 py-6 text-lg"
              >
                RETURN TO BASE
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-charcoal text-white selection:bg-brand selection:text-white overflow-x-hidden">
      <div className="noise-overlay"></div>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-6 flex justify-between items-center mix-blend-normal pointer-events-none">
        <Link href="/" className="pointer-events-auto group flex items-center gap-2">
            <div className="p-2 bg-white/5 border border-white/10 rounded-full group-hover:border-brand/50 transition-colors">
                <ArrowLeft size={16} className="text-silver group-hover:text-brand transition-colors"/>
              </div>
            <span className="font-mono text-xs text-silver group-hover:text-white transition-colors">ABORT SEQUENCE</span>
        </Link>
        
        <div className="hidden md:flex space-x-8 font-mono text-xs pointer-events-auto">
             <div className="flex items-center gap-2 text-brand">
                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse"></div>
                SYSTEM: ONBOARDING
            </div>
            </div>
      </nav>

      <main className="pt-32 pb-20 relative z-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
            <div className="mb-12 text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">SYSTEM CONFIGURATION</h1>
                <p className="text-silver font-mono text-sm md:text-base">Please provide operational parameters to initialize your deployment.</p>
      </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-8">
                {/* Honeypot field (hidden) */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  style={{ position: 'absolute', left: '-9999px' }}
                  onChange={(e) => updateField('honeypot', e.target.value)}
                />

                {/* Section 1: Business Identity */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 md:p-8">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <div className="w-1 h-6 bg-brand rounded-full"></div>
                        Business Identity
                    </h2>
                    <div className="grid grid-cols-1 gap-6">
                <div>
                            <Label htmlFor="business_name" className="text-silver mb-2 block font-mono text-xs uppercase">Legal Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => updateField('business_name', e.target.value)}
                                className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                placeholder="e.g. Smith Enterprises LLC"
                  />
                            {errors.business_name && <p className="text-brand text-xs mt-1 font-mono">{errors.business_name}</p>}
                </div>

                  <div>
                            <Label htmlFor="friendly_business_name" className="text-silver mb-2 block font-mono text-xs uppercase">Friendly/Display Name</Label>
                            <Input
                                id="friendly_business_name"
                                value={formData.friendly_business_name}
                                onChange={(e) => updateField('friendly_business_name', e.target.value)}
                                className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                placeholder="e.g. Smith Construction"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="first_name" className="text-silver mb-2 block font-mono text-xs uppercase">Operator First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                                    className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                    />
                                {errors.first_name && <p className="text-brand text-xs mt-1 font-mono">{errors.first_name}</p>}
                  </div>
                  <div>
                                <Label htmlFor="last_name" className="text-silver mb-2 block font-mono text-xs uppercase">Operator Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                                    className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                    />
                                {errors.last_name && <p className="text-brand text-xs mt-1 font-mono">{errors.last_name}</p>}
                  </div>
                  </div>

                  <div>
                            <Label htmlFor="ein_number" className="text-silver mb-2 block font-mono text-xs uppercase">EIN Number (Required for A2P) *</Label>
                    <Input
                                id="ein_number"
                                value={formData.ein_number}
                                onChange={(e) => updateField('ein_number', e.target.value)}
                                className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                placeholder="XX-XXXXXXX"
                            />
                            {errors.ein_number && <p className="text-brand text-xs mt-1 font-mono">{errors.ein_number}</p>}
                      </div>
                    </div>
                  </div>

                {/* Section 2: Contact & Location */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 md:p-8">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <div className="w-1 h-6 bg-brand rounded-full"></div>
                        Contact & Location
                    </h2>
                    <div className="grid grid-cols-1 gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                                <Label htmlFor="business_phone" className="text-silver mb-2 block font-mono text-xs uppercase">Business Phone *</Label>
                    <Input
                                    id="business_phone"
                                    value={formData.business_phone}
                                    onChange={(e) => updateField('business_phone', formatPhoneNumber(e.target.value))}
                                    className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                    placeholder="(555) 123-4567"
                                />
                                {errors.business_phone && <p className="text-brand text-xs mt-1 font-mono">{errors.business_phone}</p>}
                            </div>
                            <div>
                                <Label htmlFor="business_email" className="text-silver mb-2 block font-mono text-xs uppercase">Business Email *</Label>
                                <Input
                                    id="business_email"
                      type="email"
                                    value={formData.business_email}
                                    onChange={(e) => updateField('business_email', e.target.value)}
                                    className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                />
                                {errors.business_email && <p className="text-brand text-xs mt-1 font-mono">{errors.business_email}</p>}
                  </div>
                </div>

                    <div>
                            <Label htmlFor="business_address" className="text-silver mb-2 block font-mono text-xs uppercase">Business Address *</Label>
                      <Input
                                id="business_address"
                                value={formData.business_address}
                                onChange={(e) => updateField('business_address', e.target.value)}
                                className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                placeholder="123 Main St, City, State, ZIP"
                            />
                            {errors.business_address && <p className="text-brand text-xs mt-1 font-mono">{errors.business_address}</p>}
                    </div>

                    <div>
                            <Label htmlFor="time_zone" className="text-silver mb-2 block font-mono text-xs uppercase">Time Zone *</Label>
                            <select
                                id="time_zone"
                                value={formData.time_zone}
                                onChange={(e) => updateField('time_zone', e.target.value)}
                                className="w-full bg-black/50 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-all"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="">SELECT TIME ZONE</option>
                                <option value="America/New_York">Eastern Time (ET)</option>
                                <option value="America/Chicago">Central Time (CT)</option>
                                <option value="America/Denver">Mountain Time (MT)</option>
                                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                <option value="America/Anchorage">Alaska Time (AKT)</option>
                                <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                            </select>
                            {errors.time_zone && <p className="text-brand text-xs mt-1 font-mono">{errors.time_zone}</p>}
                        </div>
                  </div>
                </div>

                {/* Section 3: Business Intelligence */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 md:p-8">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <div className="w-1 h-6 bg-brand rounded-full"></div>
                        Business Intelligence
                    </h2>
                    <div className="grid grid-cols-1 gap-6">
                <div>
                            <Label htmlFor="services_offered" className="text-silver mb-2 block font-mono text-xs uppercase">Services Offered *</Label>
                            <Textarea
                                id="services_offered"
                                value={formData.services_offered}
                                onChange={(e) => updateField('services_offered', e.target.value)}
                                className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all min-h-[100px]"
                                placeholder="List all major services..."
                            />
                            {errors.services_offered && <p className="text-brand text-xs mt-1 font-mono">{errors.services_offered}</p>}
                </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                                <Label htmlFor="business_type" className="text-silver mb-2 block font-mono text-xs uppercase">Industry Type</Label>
                  <select
                    id="business_type"
                    value={formData.business_type}
                    onChange={(e) => updateField('business_type', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 transition-all"
                    style={{ colorScheme: 'dark' }}
                  >
                                    <option value="">SELECT INDUSTRY</option>
                    {BUSINESS_TYPES.map(type => (
                                        <option key={type} value={type} className="bg-black">{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                                <Label htmlFor="years_in_service" className="text-silver mb-2 block font-mono text-xs uppercase">Years in Operation</Label>
                                <Input
                                    id="years_in_service"
                                    value={formData.years_in_service}
                                    onChange={(e) => updateField('years_in_service', e.target.value)}
                                    className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                    placeholder="e.g. Since 2015"
                                />
                      </div>
                </div>

                        <div>
                            <Label className="text-silver mb-2 block font-mono text-xs uppercase">Service Areas</Label>
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
                                    className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                    placeholder="City, Zip, or Region"
                                />
                                <Button
                                    type="button"
                                    onClick={addServiceArea}
                                    className="bg-white text-black hover:bg-silver"
                                >
                                    ADD
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.service_areas.map((area, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-brand/10 border border-brand/30 px-3 py-1 rounded-full">
                                        <span className="text-white text-sm font-mono">{area}</span>
                                        <button type="button" onClick={() => removeServiceArea(area)} className="text-brand hover:text-white transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-silver mb-2 block font-mono text-xs uppercase">CRM Access Phone Recipients</Label>
                            <p className="text-gray-400 text-sm mb-3">Phone numbers for lead notifications (receptionists, admins, co-owners, etc.)</p>

                            <div className="flex items-center gap-3 mb-4">
                                <input
                                    type="checkbox"
                                    id="just-me-notifications"
                                    checked={justMeNotifications}
                                    onChange={(e) => {
                                        setJustMeNotifications(e.target.checked)
                                        if (e.target.checked) {
                                            // Clear all recipients when "just me" is selected
                                            updateField('crm_recipients', [])
                                            setPhoneLabel('')
                                            setPhoneNumber('')
                                        }
                                    }}
                                    className="w-4 h-4 text-brand bg-gray-100 border-gray-300 rounded focus:ring-brand focus:ring-2"
                                />
                                <label htmlFor="just-me-notifications" className="text-white text-sm font-medium cursor-pointer">
                                    Just me - only the business owner receives notifications
                                </label>
                            </div>
                            {!justMeNotifications && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                                    <Input
                                        value={phoneLabel}
                                        onChange={(e) => setPhoneLabel(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                addPhoneRecipient()
                                            }
                                        }}
                                        className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                        placeholder="Role (e.g., Receptionist)"
                                        disabled={justMeNotifications}
                                    />
                                    <Input
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                addPhoneRecipient()
                                            }
                                        }}
                                        className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                        placeholder="(555) 123-4567"
                                        type="tel"
                                        disabled={justMeNotifications}
                                    />
                                    <Button
                                        type="button"
                                        onClick={addPhoneRecipient}
                                        className="bg-white text-black hover:bg-silver disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={justMeNotifications}
                                    >
                                        ADD
                                    </Button>
                                </div>
                            )}
                            {!justMeNotifications && formData.crm_recipients.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.crm_recipients.map((recipient, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-brand/10 border border-brand/30 px-3 py-1 rounded-full">
                                            <span className="text-white text-sm font-mono">{recipient.label}: {recipient.phone}</span>
                                            <button type="button" onClick={() => removePhoneRecipient(recipient.label)} className="text-brand hover:text-white transition-colors">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 4: Domain Configuration */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 md:p-8">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <div className="w-1 h-6 bg-brand rounded-full"></div>
                        Domain Configuration
                    </h2>
                    <div className="space-y-4">
                        <Label className="text-silver mb-2 block font-mono text-xs uppercase">Configuration Protocol *</Label>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'already-own', label: 'Existing Domain (Host Only)', desc: 'I own the domain, you handle hosting.' },
                                { id: 'purchase-new', label: 'New Acquisition', desc: 'Acquire new domain. I retain ownership.' },
                                { id: 'transfer-existing', label: 'Full Transfer', desc: 'Transfer ownership & hosting to your system.' }
                            ].map((opt) => (
                          <button
                                    key={opt.id}
                            type="button"
                                    onClick={() => updateField('domain_option', opt.id)}
                                    className={`px-6 py-4 rounded-lg border transition-all text-left group ${
                                        formData.domain_option === opt.id
                                            ? 'bg-brand/10 border-brand'
                                            : 'bg-black/30 border-white/10 hover:border-brand/50'
                                    }`}
                                >
                                    <div className={`font-bold ${formData.domain_option === opt.id ? 'text-brand' : 'text-white group-hover:text-brand transition-colors'}`}>
                                        {opt.label}
                        </div>
                                    <div className="text-silver text-sm mt-1">{opt.desc}</div>
                                </button>
                      ))}
                    </div>
                        {errors.domain_option && <p className="text-brand text-xs mt-1 font-mono">{errors.domain_option}</p>}

                        {formData.domain_option && (
                            <div className="mt-6 space-y-4 animate-accordion-down">
                <div>
                                    <Label htmlFor="desired_domain" className="text-silver mb-2 block font-mono text-xs uppercase">Target Domain URL *</Label>
                  <Input
                                        id="desired_domain"
                                        value={formData.desired_domain}
                                        onChange={(e) => updateField('desired_domain', e.target.value)}
                                        className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                        placeholder="e.g. mybusiness.com"
                                    />
                                    {errors.desired_domain && <p className="text-brand text-xs mt-1 font-mono">{errors.desired_domain}</p>}
                </div>

                                {formData.domain_option === 'already-own' && (
                <div>
                                        <Label htmlFor="current_domain" className="text-silver mb-2 block font-mono text-xs uppercase">Current Domain URL *</Label>
                    <Input
                                            id="current_domain"
                                            value={formData.current_domain}
                                            onChange={(e) => updateField('current_domain', e.target.value)}
                                            className="bg-black/50 border-white/10 text-white focus:border-brand/50 focus:ring-brand/20 transition-all"
                                        />
                                        {errors.current_domain && <p className="text-brand text-xs mt-1 font-mono">{errors.current_domain}</p>}
                </div>
                                )}

                                {formData.domain_option === 'transfer-existing' && (
                                    <div className="bg-brand/5 border border-brand/20 rounded-lg p-4 mt-4">
                                        <h4 className="text-brand font-bold mb-2 font-mono text-sm uppercase">Transfer Protocol</h4>
                                        <div className="text-silver text-sm space-y-2">
                                            <p>1. Access current registrar (GoDaddy, Namecheap, etc.)</p>
                                            <p>2. Locate DNS / Name Server settings.</p>
                                            <p>3. Update Name Servers to:</p>
                                            <div className="bg-black p-3 rounded font-mono text-xs text-brand border border-brand/20">
                                                ns1.vercel-dns.com<br />
                                                ns2.vercel-dns.com
                  </div>
                                            <p className="text-xs italic opacity-70">Propagation latency: 24-48 hours.</p>
                </div>
                      </div>
                                )}
                </div>
                )}
                    </div>
                </div>

                {/* Section 5: Asset Upload */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 md:p-8">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <div className="w-1 h-6 bg-brand rounded-full"></div>
                        Digital Assets
                    </h2>
                    
                    <div className="space-y-8">
                        {/* Logo Upload */}
                <div>
                            <Label className="text-silver mb-2 block font-mono text-xs uppercase">Brand Logo</Label>
                            <div
                                className="border border-dashed border-white/20 rounded-lg p-8 text-center hover:border-brand/50 hover:bg-brand/5 transition-all cursor-pointer group"
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-brand', 'bg-brand/5'); }}
                                onDragLeave={(e) => { e.currentTarget.classList.remove('border-brand', 'bg-brand/5'); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove('border-brand', 'bg-brand/5');
                                    if (e.dataTransfer.files?.length) handleFileUpload('logoFile', e.dataTransfer.files);
                                }}
                            >
                                <input type="file" accept="image/*" onChange={(e) => handleFileUpload('logoFile', e.target.files)} className="hidden" id="logo-upload" />
                                <label htmlFor="logo-upload" className="cursor-pointer block">
                                    {formData.logoFile ? (
                                        <div className="relative group/preview">
                                            {imagePreviews[formData.logoFile.name] ? (
                                                <img src={imagePreviews[formData.logoFile.name]} alt="Preview" className="h-32 mx-auto object-contain mb-4" />
                                            ) : <div className="h-32 flex items-center justify-center text-brand animate-pulse">LOADING...</div>}
                                            <p className="text-white font-mono text-sm mb-4">{formData.logoFile.name}</p>
                                            <Button type="button" variant="destructive" size="sm" onClick={(e) => { e.preventDefault(); removeFile('logoFile'); }}>REMOVE</Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <Upload className="w-10 h-10 mx-auto text-silver group-hover:text-brand transition-colors" />
                                            <p className="text-silver group-hover:text-white">DRAG & DROP or CLICK TO UPLOAD</p>
                                            <p className="text-xs text-gray-500 font-mono">SVG/PNG preferred (Max 10MB)</p>
                    </div>
                  )}
                                </label>
                      </div>
                  </div>

                        {/* Images Upload */}
                <div>
                            <Label className="text-silver mb-2 block font-mono text-xs uppercase">Project Images (Max 5)</Label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                                {formData.imageFiles.map((file, idx) => (
                                    <div key={idx} className="relative aspect-square bg-black/50 rounded border border-white/10 group overflow-hidden">
                                        <img src={imagePreviews[file.name]} alt={file.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                        <button type="button" onClick={() => removeFile('imageFiles', idx)} className="absolute top-1 right-1 bg-brand text-white p-1 rounded hover:bg-brand-dark transition-colors"><X size={12} /></button>
                                    </div>
                                ))}
                                {formData.imageFiles.length < 5 && (
                                    <div className="relative aspect-square bg-white/5 rounded border border-dashed border-white/20 hover:border-brand/50 hover:bg-brand/5 transition-all flex flex-col items-center justify-center cursor-pointer">
                                        <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload('imageFiles', e.target.files, true)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <Upload className="w-6 h-6 text-silver mb-2" />
                                        <span className="text-xs text-silver font-mono">UPLOAD</span>
                  </div>
                                )}
                  </div>
                  </div>

                        {/* Graphics Upload */}
                <div>
                            <Label className="text-silver mb-2 block font-mono text-xs uppercase">Additional Graphics (Max 5)</Label>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {formData.graphicFiles.map((file, idx) => (
                                    <div key={idx} className="relative aspect-square bg-black/50 rounded border border-white/10 group overflow-hidden">
                                        <img src={imagePreviews[file.name]} alt={file.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                        <button type="button" onClick={() => removeFile('graphicFiles', idx)} className="absolute top-1 right-1 bg-brand text-white p-1 rounded hover:bg-brand-dark transition-colors"><X size={12} /></button>
                      </div>
                                ))}
                                {formData.graphicFiles.length < 5 && (
                                    <div className="relative aspect-square bg-white/5 rounded border border-dashed border-white/20 hover:border-brand/50 hover:bg-brand/5 transition-all flex flex-col items-center justify-center cursor-pointer">
                                        <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload('graphicFiles', e.target.files, true)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        <Upload className="w-6 h-6 text-silver mb-2" />
                                        <span className="text-xs text-silver font-mono">UPLOAD</span>
                    </div>
                    )}
                        </div>
                </div>
                </div>
                </div>

                {/* Final Authorization */}
                <div className="bg-brand/5 border border-brand/20 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                    <Checkbox
                      id="consent_accepted"
                      checked={formData.consent_accepted}
                      onCheckedChange={(checked) => updateField('consent_accepted', checked)}
                            className="border-brand data-[state=checked]:bg-brand data-[state=checked]:text-white mt-1"
                        />
                        <div>
                            <Label htmlFor="consent_accepted" className="text-white cursor-pointer font-bold">
                                AUTHORIZE DEPLOYMENT
                    </Label>
                            <p className="text-silver text-sm mt-1">
                                I verify all provided data is accurate and authorize TLUCA Systems to proceed with the build. I agree to the 
                                <Link href="/terms" className="text-brand hover:underline mx-1">Terms of Service</Link>
                                and
                                <Link href="/privacy" className="text-brand hover:underline mx-1">Privacy Policy</Link>.
                            </p>
                  </div>
                </div>
                    {errors.consent_accepted && <p className="text-brand text-xs mt-2 font-mono ml-8">{errors.consent_accepted}</p>}
                </div>

                <div className="pt-6 flex justify-end">
              <Button
                        type="submit"
                  disabled={isSubmitting}
                        className="bg-white text-black hover:bg-brand hover:text-white font-bold text-lg px-8 py-6 rounded-none transition-all disabled:opacity-50 w-full md:w-auto"
                >
                        {isSubmitting ? 'INITIALIZING...' : 'INITIATE SEQUENCE'}
                </Button>
            </div>
            </form>
        </div>
      </main>
    </div>
  )
}