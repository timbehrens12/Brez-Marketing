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
import { CheckCircle2, Building2 } from 'lucide-react'
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

  // Final
  consent_accepted: boolean

  // Hidden/System
  form_id: string
  source: string
  submitted_at: string
  honeypot: string // Anti-spam
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

  // Final
  consent_accepted: false,

  // Hidden/System
  form_id: 'waas_onboarding_v1',
  source: 'stripe_onboarding_site',
  submitted_at: '',
  honeypot: '',
}

const SECTIONS = [
  { id: 'business', title: 'Business Information', icon: Building2 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

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
      toast.loading('Submitting your onboarding...')

      // Prepare payload with simplified data
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

        // Final
        consent_accepted: formData.consent_accepted,
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
                  If you forgot to include any details or have questions, {formData.business_phone ? `text your representative at ${formData.business_phone} or ` : ''}email us at {formData.business_email}.
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
                Please complete the form to provide us with the information we need to build your solution.
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
                Please provide your business information to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
            {/* Single Step: Business Information */}
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
                  <Label htmlFor="business_name" className="text-white">Legal & Friendly Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => updateField('business_name', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., Smith's Construction & Services LLC"
                  />
                  {errors.business_name && <p className="text-red-400 text-sm mt-1">{errors.business_name}</p>}
                </div>

                <div>
                  <Label htmlFor="friendly_business_name" className="text-white">Friendly Business Name (optional)</Label>
                  <Input
                    id="friendly_business_name"
                    value={formData.friendly_business_name}
                    onChange={(e) => updateField('friendly_business_name', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="e.g., Smith's Construction"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name" className="text-white">First Name *</Label>
                    <Input
                      id="first_name"
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
                      value={formData.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="e.g., Smith"
                    />
                    {errors.last_name && <p className="text-red-400 text-sm mt-1">{errors.last_name}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="ein_number" className="text-white">EIN Number *</Label>
                  <p className="text-gray-400 text-sm mb-2">Needed for A2P registration in US & Canada</p>
                  <Input
                    id="ein_number"
                    value={formData.ein_number}
                    onChange={(e) => updateField('ein_number', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="XX-XXXXXXX"
                  />
                  {errors.ein_number && <p className="text-red-400 text-sm mt-1">{errors.ein_number}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business_phone" className="text-white">Business Phone Number *</Label>
                    <Input
                      id="business_phone"
                      type="tel"
                      value={formData.business_phone}
                      onChange={(e) => updateField('business_phone', formatPhoneNumber(e.target.value))}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="(555) 123-4567"
                    />
                    {errors.business_phone && <p className="text-red-400 text-sm mt-1">{errors.business_phone}</p>}
                  </div>

                  <div>
                    <Label htmlFor="business_email" className="text-white">Business Email *</Label>
                    <Input
                      id="business_email"
                      type="email"
                      value={formData.business_email}
                      onChange={(e) => updateField('business_email', e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      placeholder="hello@business.com"
                    />
                    {errors.business_email && <p className="text-red-400 text-sm mt-1">{errors.business_email}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="business_address" className="text-white">Business Address *</Label>
                  <Input
                    id="business_address"
                    value={formData.business_address}
                    onChange={(e) => updateField('business_address', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                    placeholder="123 Main St, City, State, ZIP"
                  />
                  {errors.business_address && <p className="text-red-400 text-sm mt-1">{errors.business_address}</p>}
                </div>

                <div>
                  <Label htmlFor="time_zone" className="text-white">Time Zone *</Label>
                  <select
                    id="time_zone"
                    value={formData.time_zone}
                    onChange={(e) => updateField('time_zone', e.target.value)}
                    className="w-full bg-black border border-white/20 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="">Select time zone...</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Anchorage">Alaska Time (AKT)</option>
                    <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                  </select>
                  {errors.time_zone && <p className="text-red-400 text-sm mt-1">{errors.time_zone}</p>}
                </div>

                <div>
                  <Label htmlFor="services_offered" className="text-white">Services Offered *</Label>
                  <Textarea
                    id="services_offered"
                    value={formData.services_offered}
                    onChange={(e) => updateField('services_offered', e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-24"
                    placeholder="e.g., Driveway installation, Concrete repair, Patios, Foundations..."
                  />
                  {errors.services_offered && <p className="text-red-400 text-sm mt-1">{errors.services_offered}</p>}
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
              {/* Show submit button since there's only one step */}
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-white hover:bg-gray-200 text-black font-semibold disabled:opacity-50 w-full"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Onboarding'}
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-gray-500 text-sm mt-6 space-y-2">
          <p>
            Questions? Email <a href="mailto:help@tlucasystems.com" className="text-white hover:underline">help@tlucasystems.com</a>
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