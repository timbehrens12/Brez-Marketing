"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CheckCircle2, Upload, X, ChevronRight, ChevronLeft, Building2, Briefcase, MapPin, Palette, FileText, Globe, MessageSquare, Lock } from 'lucide-react'
import { toast } from 'sonner'

// Business types for dropdown
const BUSINESS_TYPES = [
  'Concrete',
  'Roofing',
  'Landscaping',
  'HVAC',
  'Plumbing',
  'Electrical',
  'General Contracting',
  'Painting',
  'Flooring',
  'Other'
]

// Service options for concrete (can be expanded)
const CONCRETE_SERVICES = [
  'Driveways',
  'Patios',
  'Foundations',
  'Slabs',
  'Walkways',
  'Stamped',
  'Retaining Walls',
  'Repair'
]

// Service area suggestions
const SERVICE_AREA_SUGGESTIONS = [
  'Spring', 'The Woodlands', 'Conroe', 'Tomball', 'Cypress',
  'Katy', 'Houston', 'Magnolia', 'Montgomery', 'Willis'
]

type OnboardingData = {
  // A) Business & Contact
  business_name: string
  owner_name: string
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
  logo_url: string
  gallery_urls: string[]
  brand_colors: string
  design_constraints: string

  // E) About & Messaging
  about_text: string
  tagline: string

  // F) Site Contact Details
  site_phone: string
  site_email: string
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
}

const INITIAL_DATA: OnboardingData = {
  business_name: '',
  owner_name: '',
  contact_phone: '',
  contact_email: '',
  business_city: '',
  business_state: '',
  years_in_service: '',
  business_type: '',
  services_primary: [],
  services_secondary: '',
  market_type: '',
  service_areas: [],
  logo_url: '',
  gallery_urls: [],
  brand_colors: '',
  design_constraints: '',
  about_text: '',
  tagline: '',
  site_phone: '',
  site_email: '',
  business_hours: {
    mon: { open: '08:00', close: '17:00', closed: false },
    tue: { open: '08:00', close: '17:00', closed: false },
    wed: { open: '08:00', close: '17:00', closed: false },
    thu: { open: '08:00', close: '17:00', closed: false },
    fri: { open: '08:00', close: '17:00', closed: false },
    sat: { open: '09:00', close: '13:00', closed: false },
    sun: { open: '', close: '', closed: true }
  },
  preferred_contact: '',
  facebook_url: '',
  instagram_url: '',
  google_profile_url: '',
  has_domain: '',
  domain_current: '',
  request_domain_purchase: '',
  domain_preferences: '',
  internal_notes: '',
  consent_accepted: false
}

const SECTIONS = [
  { id: 'business', title: 'Business & Contact', icon: Building2 },
  { id: 'services', title: 'Services', icon: Briefcase },
  { id: 'areas', title: 'Service Areas', icon: MapPin },
  { id: 'branding', title: 'Branding & Media', icon: Palette },
  { id: 'about', title: 'About & Messaging', icon: FileText },
  { id: 'contact', title: 'Site Contact', icon: MessageSquare },
  { id: 'social', title: 'Social & GBP', icon: Globe },
  { id: 'domain', title: 'Domain', icon: Globe },
  { id: 'final', title: 'Final', icon: Lock }
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
  const [serviceAreaInput, setServiceAreaInput] = useState('')

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('waas_onboarding_draft')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData(parsed)
      } catch (e) {
        console.error('Failed to load draft:', e)
      }
    }
  }, [])

  // Autosave to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('waas_onboarding_draft', JSON.stringify(formData))
    }, 500)
    return () => clearTimeout(timer)
  }, [formData])

  const updateField = (field: keyof OnboardingData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const updateNestedField = (parent: keyof OnboardingData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev[parent] as any), [field]: value }
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

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 0) { // Business & Contact
      if (!formData.business_name.trim()) newErrors.business_name = 'Required'
      if (!formData.owner_name.trim()) newErrors.owner_name = 'Required'
      if (!formData.contact_phone.trim()) newErrors.contact_phone = 'Required'
      if (!formData.contact_email.trim()) newErrors.contact_email = 'Required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) newErrors.contact_email = 'Invalid email'
      if (!formData.business_city.trim()) newErrors.business_city = 'Required'
      if (!formData.business_state.trim()) newErrors.business_state = 'Required'
      if (!formData.years_in_service.trim()) newErrors.years_in_service = 'Required'
      if (!formData.business_type.trim()) newErrors.business_type = 'Required'
    }

    if (step === 1) { // Services
      if (formData.services_primary.length === 0) newErrors.services_primary = 'Select at least one service'
    }

    if (step === 2) { // Service Areas
      if (!formData.market_type) newErrors.market_type = 'Required'
      if (formData.service_areas.length === 0) newErrors.service_areas = 'Add at least one service area'
    }

    if (step === 4) { // About & Messaging
      if (!formData.about_text.trim()) newErrors.about_text = 'Required (2-4 sentences)'
    }

    if (step === 5) { // Site Contact
      if (!formData.site_phone.trim()) newErrors.site_phone = 'Required'
      if (!formData.contact_email.trim()) newErrors.site_email = 'Required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.site_email)) newErrors.site_email = 'Invalid email'
      if (!formData.preferred_contact) newErrors.preferred_contact = 'Required'
    }

    if (step === 7) { // Domain
      if (!formData.has_domain) newErrors.has_domain = 'Required'
      if (formData.has_domain === 'Yes' && !formData.domain_current.trim()) {
        newErrors.domain_current = 'Required'
      }
      if (formData.has_domain === 'No' && !formData.request_domain_purchase) {
        newErrors.request_domain_purchase = 'Required'
      }
    }

    if (step === 8) { // Final
      if (!formData.consent_accepted) newErrors.consent_accepted = 'Required'
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

  const uploadFileToCDN = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/onboarding/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')
      
      const data = await response.json()
      return data.secure_url || null
    } catch (error) {
      console.error('Upload error:', error)
      return null
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)')
      return
    }

    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setLogoPreview(e.target?.result as string)

    toast.loading('Uploading logo...')
    const url = await uploadFileToCDN(file)
    toast.dismiss()

    if (url) {
      updateField('logo_url', url)
      toast.success('Logo uploaded')
    } else {
      toast.error('Upload failed')
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (galleryFiles.length + files.length > 10) {
      toast.error('Maximum 10 images allowed')
      return
    }

    const validFiles = files.filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 10MB)`)
        return false
      }
      return true
    })

    setGalleryFiles(prev => [...prev, ...validFiles])

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setGalleryPreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })

    toast.loading(`Uploading ${validFiles.length} image(s)...`)
    const urls = await Promise.all(validFiles.map(uploadFileToCDN))
    toast.dismiss()

    const successfulUrls = urls.filter(Boolean) as string[]
    if (successfulUrls.length > 0) {
      updateField('gallery_urls', [...formData.gallery_urls, ...successfulUrls])
      toast.success(`Uploaded ${successfulUrls.length} image(s)`)
    }
  }

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

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      // Upload remaining files
      if (logoFile && !formData.logo_url) {
        toast.loading('Uploading logo...')
        const logoUrl = await uploadFileToCDN(logoFile)
        if (logoUrl) updateField('logo_url', logoUrl)
        toast.dismiss()
      }

      if (galleryFiles.length > 0) {
        toast.loading('Uploading gallery images...')
        const urls = await Promise.all(galleryFiles.map(uploadFileToCDN))
        const successfulUrls = urls.filter(Boolean) as string[]
        if (successfulUrls.length > 0) {
          updateField('gallery_urls', [...formData.gallery_urls, ...successfulUrls])
        }
        toast.dismiss()
      }

      // Prepare payload
      const payload = {
        form_id: 'waas_onboarding_v1',
        source: 'stripe_onboarding_site',
        submitted_at: new Date().toISOString(),
        ...formData,
        // Normalize URLs
        facebook_url: normalizeUrl(formData.facebook_url),
        instagram_url: normalizeUrl(formData.instagram_url),
        google_profile_url: normalizeUrl(formData.google_profile_url),
        domain_current: normalizeUrl(formData.domain_current),
      }

      toast.loading('Submitting...')

      // POST to API route (which handles GHL webhook)
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Submission failed')
      }

      // Clear localStorage
      localStorage.removeItem('waas_onboarding_draft')

      setIsSuccess(true)
      toast.dismiss()
      toast.success('Submitted successfully!')
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.message || 'Submission failed. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full bg-black border-white/10 shadow-2xl">
          <CardHeader className="text-center space-y-6 pb-8 border-b border-white/10">
            <div className="mx-auto w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">
              Thanks — we've got everything we need.
            </CardTitle>
            <CardDescription className="text-gray-400 text-lg">
              We'll start your build now. You'll receive a confirmation and timeline in your dashboard. If we need anything else, we'll text or email you at {formData.contact_phone} / {formData.contact_email}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-white hover:bg-gray-200 text-black font-semibold"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const generateTimeOptions = () => {
    const times: { value: string; label: string }[] = []
    for (let hour = 0; hour < 24; hour++) {
      for (let min of [0, 30]) {
        const time24 = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
        const period = hour >= 12 ? 'PM' : 'AM'
        const hours12 = hour % 12 || 12
        times.push({
          value: time24,
          label: `${hours12}:${min.toString().padStart(2, '0')} ${period}`
        })
      }
    }
    return times
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Sidebar Navigation */}
      <div className="hidden lg:flex lg:w-1/3 lg:flex-col lg:border-r lg:border-white/10 lg:bg-black/50">
        <div className="p-6 lg:p-12">
          <div className="space-y-8">
            {SECTIONS.map((section, idx) => {
              const Icon = section.icon
              const isActive = currentStep === idx
              const isCompleted = currentStep > idx
              
              return (
                <div key={section.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isActive 
                        ? 'bg-white text-black border-white' 
                        : isCompleted 
                        ? 'bg-white/20 border-white/30 text-white' 
                        : 'bg-white/5 border-white/10 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    {idx < SECTIONS.length - 1 && (
                      <div className={`w-0.5 h-8 mt-2 ${
                        isCompleted ? 'bg-white/30' : 'bg-white/10'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`text-xs font-medium mb-1 ${
                      isActive ? 'text-white' : 
                      isCompleted ? 'text-gray-300' : 
                      'text-gray-500'
                    }`}>
                      Step {idx + 1}
                    </p>
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
          <div className="pt-8 mt-8 border-t border-white/10">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(((currentStep + 1) / SECTIONS.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-500 ease-out"
                style={{ width: `${((currentStep + 1) / SECTIONS.length) * 100}%` }}
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
                {currentStep === 1 && "What services do you offer?"}
                {currentStep === 2 && "Where do you serve customers?"}
                {currentStep === 3 && "Share your brand identity"}
                {currentStep === 4 && "Tell your story"}
                {currentStep === 5 && "How should customers contact you?"}
                {currentStep === 6 && "Your online presence"}
                {currentStep === 7 && "Domain information"}
                {currentStep === 8 && "Final details and confirmation"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
            {/* Section A: Business & Contact */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="business_name" className="text-white">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => updateField('business_name', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., Payta's Concrete & Construction"
                  />
                  {errors.business_name && <p className="text-red-400 text-sm mt-1">{errors.business_name}</p>}
                </div>

                <div>
                  <Label htmlFor="owner_name" className="text-white">Owner Full Name *</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) => updateField('owner_name', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  {errors.owner_name && <p className="text-red-400 text-sm mt-1">{errors.owner_name}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_phone" className="text-white">Phone for CRM *</Label>
                    <Input
                      id="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => updateField('contact_phone', formatPhoneNumber(e.target.value))}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="(555) 123-4567"
                    />
                    {errors.contact_phone && <p className="text-red-400 text-sm mt-1">{errors.contact_phone}</p>}
                  </div>

                  <div>
                    <Label htmlFor="contact_email" className="text-white">Email for CRM *</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => updateField('contact_email', e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
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
                      className="bg-white/5 border-white/10 text-white"
                    />
                    {errors.business_city && <p className="text-red-400 text-sm mt-1">{errors.business_city}</p>}
                  </div>

                  <div>
                    <Label htmlFor="business_state" className="text-white">State/Province *</Label>
                    <Input
                      id="business_state"
                      value={formData.business_state}
                      onChange={(e) => updateField('business_state', e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="TX"
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
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="Since 2017 or 10+ years"
                  />
                  {errors.years_in_service && <p className="text-red-400 text-sm mt-1">{errors.years_in_service}</p>}
                </div>

                <div>
                  <Label htmlFor="business_type" className="text-white">Business Type *</Label>
                  <select
                    id="business_type"
                    value={formData.business_type}
                    onChange={(e) => updateField('business_type', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2"
                  >
                    <option value="">Select...</option>
                    {BUSINESS_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.business_type && <p className="text-red-400 text-sm mt-1">{errors.business_type}</p>}
                </div>
              </div>
            )}

            {/* Section B: Services */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Main Services *</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
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
                        />
                        <Label htmlFor={`service-${service}`} className="cursor-pointer">{service}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.services_primary && <p className="text-red-400 text-sm mt-1">{errors.services_primary}</p>}
                </div>

                <div>
                  <Label htmlFor="services_secondary" className="text-white">Other Services (optional)</Label>
                  <Textarea
                    id="services_secondary"
                    value={formData.services_secondary}
                    onChange={(e) => updateField('services_secondary', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Section C: Service Areas */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Serve Residential / Commercial / Both *</Label>
                  <RadioGroup
                    value={formData.market_type}
                    onValueChange={(value) => updateField('market_type', value)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Residential" id="residential" />
                      <Label htmlFor="residential" className="cursor-pointer">Residential</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Commercial" id="commercial" />
                      <Label htmlFor="commercial" className="cursor-pointer">Commercial</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Both" id="both" />
                      <Label htmlFor="both" className="cursor-pointer">Both</Label>
                    </div>
                  </RadioGroup>
                  {errors.market_type && <p className="text-red-400 text-sm mt-1">{errors.market_type}</p>}
                </div>

                <div>
                  <Label className="text-white">Cities/Areas Served *</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={serviceAreaInput}
                      onChange={(e) => setServiceAreaInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addServiceArea())}
                      className="bg-white/5 border-white/10 text-white"
                      placeholder="Add city..."
                    />
                    <Button type="button" onClick={addServiceArea} variant="outline">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SERVICE_AREA_SUGGESTIONS.map(area => (
                      <Button
                        key={area}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!formData.service_areas.includes(area)) {
                            updateField('service_areas', [...formData.service_areas, area])
                          }
                        }}
                        className={formData.service_areas.includes(area) ? 'bg-white/20' : ''}
                      >
                        {area}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.service_areas.map(area => (
                      <div key={area} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded">
                        <span>{area}</span>
                        <button
                          type="button"
                          onClick={() => removeServiceArea(area)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {errors.service_areas && <p className="text-red-400 text-sm mt-1">{errors.service_areas}</p>}
                </div>
              </div>
            )}

            {/* Section D: Branding & Media */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Logo (optional)</Label>
                  <div className="mt-2">
                    {logoPreview ? (
                      <div className="relative inline-block">
                        <img src={logoPreview} alt="Logo preview" className="h-24 w-24 object-contain border border-white/10 rounded" />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null)
                            setLogoPreview('')
                            updateField('logo_url', '')
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-white/40">
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <span>Click to upload logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-white">Project Photos (optional, max 10)</Label>
                  <div className="mt-2">
                    <label className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-white/40">
                      <Upload className="w-8 h-8 mx-auto mb-2" />
                      <span>Click to upload photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryUpload}
                        className="hidden"
                      />
                    </label>
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {galleryPreviews.map((preview, idx) => (
                        <div key={idx} className="relative">
                          <img src={preview} alt={`Preview ${idx}`} className="w-full h-24 object-cover rounded border border-white/10" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="brand_colors" className="text-white">Brand Colors (optional)</Label>
                  <Input
                    id="brand_colors"
                    value={formData.brand_colors}
                    onChange={(e) => updateField('brand_colors', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="#111111, #b22222, #ffffff"
                  />
                </div>

                <div>
                  <Label htmlFor="design_constraints" className="text-white">Anything to avoid in design? (optional)</Label>
                  <Textarea
                    id="design_constraints"
                    value={formData.design_constraints}
                    onChange={(e) => updateField('design_constraints', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Section E: About & Messaging */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="about_text" className="text-white">About Paragraph * (2-4 sentences)</Label>
                  <Textarea
                    id="about_text"
                    value={formData.about_text}
                    onChange={(e) => updateField('about_text', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    rows={4}
                    placeholder="We pour high-quality concrete for homeowners and builders..."
                  />
                  {errors.about_text && <p className="text-red-400 text-sm mt-1">{errors.about_text}</p>}
                </div>

                <div>
                  <Label htmlFor="tagline" className="text-white">Tagline / Slogan (optional)</Label>
                  <Input
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => updateField('tagline', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    placeholder="Built to last. Poured with pride."
                  />
                </div>
              </div>
            )}

            {/* Section F: Site Contact Details */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="site_phone" className="text-white">Phone to Display *</Label>
                    <Input
                      id="site_phone"
                      type="tel"
                      value={formData.site_phone}
                      onChange={(e) => updateField('site_phone', formatPhoneNumber(e.target.value))}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <div className="mt-1">
                      <Checkbox
                        id="use_contact_phone"
                        checked={formData.site_phone === formData.contact_phone}
                        onCheckedChange={(checked) => {
                          if (checked) updateField('site_phone', formData.contact_phone)
                        }}
                      />
                      <Label htmlFor="use_contact_phone" className="ml-2 text-sm">Use same as contact phone</Label>
                    </div>
                    {errors.site_phone && <p className="text-red-400 text-sm mt-1">{errors.site_phone}</p>}
                  </div>

                  <div>
                    <Label htmlFor="site_email" className="text-white">Email to Display *</Label>
                    <Input
                      id="site_email"
                      type="email"
                      value={formData.site_email}
                      onChange={(e) => updateField('site_email', e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <div className="mt-1">
                      <Checkbox
                        id="use_contact_email"
                        checked={formData.site_email === formData.contact_email}
                        onCheckedChange={(checked) => {
                          if (checked) updateField('site_email', formData.contact_email)
                        }}
                      />
                      <Label htmlFor="use_contact_email" className="ml-2 text-sm">Use same as contact email</Label>
                    </div>
                    {errors.site_email && <p className="text-red-400 text-sm mt-1">{errors.site_email}</p>}
                  </div>
                </div>

                <div>
                  <Label className="text-white">Business Hours *</Label>
                  <div className="space-y-2 mt-2">
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map(day => {
                      const dayData = formData.business_hours[day]
                      const dayLabels = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
                      return (
                        <div key={day} className="flex items-center gap-2 bg-white/5 p-2 rounded">
                          <Checkbox
                            checked={dayData.closed}
                            onCheckedChange={(checked) => {
                              updateNestedField('business_hours', day, { ...dayData, closed: !!checked })
                            }}
                          />
                          <Label className="w-24 text-white">{dayLabels[day]}</Label>
                          {!dayData.closed && (
                            <>
                              <select
                                value={dayData.open}
                                onChange={(e) => {
                                  updateNestedField('business_hours', day, { ...dayData, open: e.target.value })
                                }}
                                className="bg-black border border-white/20 text-white rounded px-2 py-1 text-sm"
                              >
                                {generateTimeOptions().map(({ value, label }) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                              <span>to</span>
                              <select
                                value={dayData.close}
                                onChange={(e) => {
                                  updateNestedField('business_hours', day, { ...dayData, close: e.target.value })
                                }}
                                className="bg-black border border-white/20 text-white rounded px-2 py-1 text-sm"
                              >
                                {generateTimeOptions().map(({ value, label }) => (
                                  <option key={value} value={value}>{label}</option>
                                ))}
                              </select>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-white">Preferred Contact Method *</Label>
                  <RadioGroup
                    value={formData.preferred_contact}
                    onValueChange={(value) => updateField('preferred_contact', value)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Phone" id="pref-phone" />
                      <Label htmlFor="pref-phone" className="cursor-pointer">Phone</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Text" id="pref-text" />
                      <Label htmlFor="pref-text" className="cursor-pointer">Text</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Email" id="pref-email" />
                      <Label htmlFor="pref-email" className="cursor-pointer">Email</Label>
                    </div>
                  </RadioGroup>
                  {errors.preferred_contact && <p className="text-red-400 text-sm mt-1">{errors.preferred_contact}</p>}
                </div>
              </div>
            )}

            {/* Section G: Social & GBP */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="facebook_url" className="text-white">Facebook URL (optional)</Label>
                  <Input
                    id="facebook_url"
                    type="url"
                    value={formData.facebook_url}
                    onChange={(e) => updateField('facebook_url', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="instagram_url" className="text-white">Instagram URL (optional)</Label>
                  <Input
                    id="instagram_url"
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => updateField('instagram_url', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="google_profile_url" className="text-white">Google Business Profile URL (optional)</Label>
                  <Input
                    id="google_profile_url"
                    type="url"
                    value={formData.google_profile_url}
                    onChange={(e) => updateField('google_profile_url', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            )}

            {/* Section H: Domain */}
            {currentStep === 7 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Do you already own a domain? *</Label>
                  <RadioGroup
                    value={formData.has_domain}
                    onValueChange={(value) => updateField('has_domain', value)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Yes" id="has-domain-yes" />
                      <Label htmlFor="has-domain-yes" className="cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="No" id="has-domain-no" />
                      <Label htmlFor="has-domain-no" className="cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                  {errors.has_domain && <p className="text-red-400 text-sm mt-1">{errors.has_domain}</p>}
                </div>

                {formData.has_domain === 'Yes' && (
                  <div>
                    <Label htmlFor="domain_current" className="text-white">Domain URL *</Label>
                    <Input
                      id="domain_current"
                      type="url"
                      value={formData.domain_current}
                      onChange={(e) => updateField('domain_current', e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    {errors.domain_current && <p className="text-red-400 text-sm mt-1">{errors.domain_current}</p>}
                  </div>
                )}

                {formData.has_domain === 'No' && (
                  <>
                    <div>
                      <Label className="text-white">Would you like us to purchase & manage it for you? *</Label>
                      <RadioGroup
                        value={formData.request_domain_purchase}
                        onValueChange={(value) => updateField('request_domain_purchase', value)}
                        className="mt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Yes" id="request-yes" />
                          <Label htmlFor="request-yes" className="cursor-pointer">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="No" id="request-no" />
                          <Label htmlFor="request-no" className="cursor-pointer">No</Label>
                        </div>
                      </RadioGroup>
                      {errors.request_domain_purchase && <p className="text-red-400 text-sm mt-1">{errors.request_domain_purchase}</p>}
                    </div>

                    <div>
                      <Label htmlFor="domain_preferences" className="text-white">Desired domain ideas (optional)</Label>
                      <Input
                        id="domain_preferences"
                        value={formData.domain_preferences}
                        onChange={(e) => updateField('domain_preferences', e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="paytasconcrete.com, paytasconstruction.com"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Section I: Final */}
            {currentStep === 8 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="internal_notes" className="text-white">Notes for our team (optional)</Label>
                  <Textarea
                    id="internal_notes"
                    value={formData.internal_notes}
                    onChange={(e) => updateField('internal_notes', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                    rows={4}
                  />
                </div>

                <div className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-lg">
                  <Checkbox
                    id="consent_accepted"
                    checked={formData.consent_accepted}
                    onCheckedChange={(checked) => updateField('consent_accepted', !!checked)}
                  />
                  <Label htmlFor="consent_accepted" className="cursor-pointer text-white">
                    I confirm the info is accurate and authorize build. *
                  </Label>
                </div>
                {errors.consent_accepted && <p className="text-red-400 text-sm">{errors.consent_accepted}</p>}
              </div>
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
  )
}
