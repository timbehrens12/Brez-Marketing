"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, Upload, X, ChevronRight, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'

type OnboardingData = {
  businessName: string
  contactName: string
  businessEmail: string
  businessPhone: string
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
  businessAddress: { street: string; city: string; state: string; zip: string; country: string }
  serviceAreas: string
  logoFile: File | null
  photoFiles: File[]
  colorScheme: 'light' | 'dark' | 'neutral' | 'no-preference'
  slogan: string
  hasAboutUs: boolean
  aboutUsText: string
  hasMeetTheTeam: boolean
  teamMembers: Array<{ name: string; role: string; photo: File | null }>
  inspirationSites: string[]
  hasExistingWebsite: boolean
  currentDomain: string
  needDomainHelp: boolean
  desiredDomain: string
  hasGoogleBusiness: boolean
  googleBusinessEmail: string
  socialLinks: { facebook: string; instagram: string; tiktok: string; linkedin: string; yelp: string; other: string }
  leadAlertMethod: 'text' | 'email' | 'both' | ''
  alertPhone: string
  alertEmail: string
  leadFormFields: string[]
  bookingsPayments: 'none' | 'booking' | 'payments' | 'both'
  hasPortfolio: boolean
  portfolioFiles: File[]
  hasReviews: boolean
  ownsDomain: boolean
  ownedDomain: string
  dnsManager: 'client' | 'tluca' | ''
  specialNotes: string
  consentConfirmed: boolean
}

const INITIAL_DATA: OnboardingData = {
  businessName: '',
  contactName: '',
  businessEmail: '',
  businessPhone: '',
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
  businessAddress: { street: '', city: '', state: '', zip: '', country: 'USA' },
  serviceAreas: '',
  logoFile: null,
  photoFiles: [],
  colorScheme: 'no-preference',
  slogan: '',
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
  socialLinks: { facebook: '', instagram: '', tiktok: '', linkedin: '', yelp: '', other: '' },
  leadAlertMethod: '',
  alertPhone: '',
  alertEmail: '',
  leadFormFields: ['Name', 'Email', 'Phone', 'Service Interested In', 'Message'],
  bookingsPayments: 'none',
  hasPortfolio: false,
  portfolioFiles: [],
  hasReviews: false,
  ownsDomain: false,
  ownedDomain: '',
  dnsManager: '',
  specialNotes: '',
  consentConfirmed: false,
}

const STEPS = [
  { id: 1, title: 'Business Info', fields: ['businessName', 'contactName', 'businessEmail', 'businessPhone', 'businessNiche', 'businessDescription'] },
  { id: 2, title: 'Services', fields: ['servicesOffered', 'serviceAreas', 'operatingHours'] },
  { id: 3, title: 'Branding', fields: ['logoFile', 'slogan', 'colorScheme'] },
  { id: 4, title: 'Online Presence', fields: ['hasExistingWebsite', 'socialLinks', 'leadAlertMethod'] },
  { id: 5, title: 'Review & Submit', fields: ['consentConfirmed'] },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('tluca-onboarding-draft')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (typeof parsed.operatingHours === 'string') {
          parsed.operatingHours = INITIAL_DATA.operatingHours
        }
        if (parsed.teamText || parsed.teamPhotos) {
          parsed.teamMembers = [{ name: '', role: '', photo: null }]
          delete parsed.teamText
          delete parsed.teamPhotos
        }
        if (!parsed.teamMembers) {
          parsed.teamMembers = [{ name: '', role: '', photo: null }]
        }
        setFormData({ ...INITIAL_DATA, ...parsed })
      } catch (e) {
        console.error('Failed to load draft', e)
      }
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('tluca-onboarding-draft', JSON.stringify(formData))
    }, 1000)
    return () => clearTimeout(timer)
  }, [formData])

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) throw new Error('Submission failed')
      localStorage.removeItem('tluca-onboarding-draft')
      setIsSuccess(true)
      toast.success('Onboarding submitted!')
    } catch (error) {
      toast.error('Failed to submit')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">All set!</h1>
          <p className="text-lg text-zinc-400">You'll receive a text message confirming your submission. We'll text you again when your site starts building.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-4xl font-bold mb-2">Project Setup</h1>
          <p className="text-zinc-400">Step {currentStep + 1} of {STEPS.length}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-zinc-900/50 border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex gap-2">
            {STEPS.map((step, idx) => (
              <div
                key={idx}
                onClick={() => idx <= currentStep && setCurrentStep(idx)}
                className={`h-1 flex-1 rounded-full cursor-pointer transition-all ${
                  idx <= currentStep ? 'bg-white' : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-16">
          {/* Left Sidebar - Step Info */}
          <div className="md:col-span-1">
            <div className="sticky top-20">
              <h2 className="text-2xl font-bold mb-4">{STEPS[currentStep].title}</h2>
              <p className="text-sm text-zinc-500 mb-8">
                {currentStep === 0 && 'Tell us about your business so we can build something perfect for you.'}
                {currentStep === 1 && 'What services do you offer and when are you available?'}
                {currentStep === 2 && 'Share your brand identity and style preferences.'}
                {currentStep === 3 && 'Connect your online presence and lead capture.'}
                {currentStep === 4 && 'Review everything before we get started.'}
              </p>
              <div className="text-xs text-zinc-600">
                {Math.round(((currentStep + 1) / STEPS.length) * 100)}% complete
              </div>
            </div>
          </div>

          {/* Right Side - Form Fields */}
          <div className="md:col-span-2 space-y-8">
            {currentStep === 0 && (
              <>
                <FormField label="Business Name" required>
                  <Input
                    value={formData.businessName}
                    onChange={(e) => updateField('businessName', e.target.value)}
                    placeholder="e.g., ABC Plumbing"
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                  />
                </FormField>

                <FormField label="Your Name" required>
                  <Input
                    value={formData.contactName}
                    onChange={(e) => updateField('contactName', e.target.value)}
                    placeholder="e.g., John Smith"
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                  />
                </FormField>

                <div className="grid md:grid-cols-2 gap-6">
                  <FormField label="Email" required>
                    <Input
                      type="email"
                      value={formData.businessEmail}
                      onChange={(e) => updateField('businessEmail', e.target.value)}
                      placeholder="e.g., john@business.com"
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </FormField>
                  <FormField label="Phone" required>
                    <Input
                      type="tel"
                      value={formData.businessPhone}
                      onChange={(e) => updateField('businessPhone', e.target.value)}
                      placeholder="e.g., (555) 123-4567"
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </FormField>
                </div>

                <FormField label="Industry / Niche">
                  <Input
                    value={formData.businessNiche}
                    onChange={(e) => updateField('businessNiche', e.target.value)}
                    placeholder="e.g., Plumbing, Hair Salon, Real Estate"
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                  />
                </FormField>

                <FormField label="What do you do?">
                  <Textarea
                    value={formData.businessDescription}
                    onChange={(e) => updateField('businessDescription', e.target.value)}
                    placeholder="e.g., We provide residential plumbing services..."
                    className="bg-zinc-800/50 border-zinc-700 text-white min-h-24"
                  />
                </FormField>
              </>
            )}

            {currentStep === 1 && (
              <>
                <FormField label="Services You Offer">
                  <Textarea
                    value={formData.servicesOffered}
                    onChange={(e) => updateField('servicesOffered', e.target.value)}
                    placeholder="One service per line..."
                    className="bg-zinc-800/50 border-zinc-700 text-white min-h-24"
                  />
                </FormField>

                <FormField label="Service Areas / Cities Served">
                  <Input
                    value={formData.serviceAreas}
                    onChange={(e) => updateField('serviceAreas', e.target.value)}
                    placeholder="e.g., Houston, Austin, Dallas"
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                  />
                </FormField>

                <div>
                  <Label className="text-white font-medium mb-4 block">Operating Hours</Label>
                  <div className="space-y-3">
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                      const dayData = formData.operatingHours?.[day] || { open: '09:00', close: '17:00', closed: false }
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <Checkbox
                            checked={dayData.closed}
                            onCheckedChange={(checked) => {
                              updateField('operatingHours', {
                                ...formData.operatingHours,
                                [day]: { ...dayData, closed: !!checked }
                              })
                            }}
                          />
                          <span className="w-20 text-white capitalize text-sm font-medium">{day}</span>
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
                                className="bg-zinc-800/50 border border-zinc-700 text-white rounded px-2 py-1 text-sm"
                              >
                                {Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`).map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <span className="text-zinc-500">to</span>
                              <select
                                value={dayData.close}
                                onChange={(e) => {
                                  updateField('operatingHours', {
                                    ...formData.operatingHours,
                                    [day]: { ...dayData, close: e.target.value }
                                  })
                                }}
                                className="bg-zinc-800/50 border border-zinc-700 text-white rounded px-2 py-1 text-sm"
                              >
                                {Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`).map(time => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </>
                          )}
                          {dayData.closed && <span className="text-zinc-500 text-sm">Closed</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <FormField label="Business Logo">
                  <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-zinc-500 transition-colors cursor-pointer bg-zinc-800/30">
                    <Upload className="w-6 h-6 mx-auto text-zinc-500 mb-2" />
                    <p className="text-sm text-zinc-400">Click or drag to upload logo</p>
                  </div>
                </FormField>

                <FormField label="Brand Slogan">
                  <Input
                    value={formData.slogan}
                    onChange={(e) => updateField('slogan', e.target.value)}
                    placeholder="e.g., Quality plumbing, fast service"
                    className="bg-zinc-800/50 border-zinc-700 text-white"
                  />
                </FormField>

                <FormField label="Color Preference">
                  <div className="grid grid-cols-4 gap-3">
                    {['light', 'dark', 'neutral', 'no-preference'].map((scheme) => (
                      <button
                        key={scheme}
                        onClick={() => updateField('colorScheme', scheme as any)}
                        className={`p-3 rounded-lg border-2 transition-all capitalize ${
                          formData.colorScheme === scheme
                            ? 'border-white bg-zinc-800'
                            : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        {scheme}
                      </button>
                    ))}
                  </div>
                </FormField>
              </>
            )}

            {currentStep === 3 && (
              <>
                <FormField label="Do you have a website?">
                  <div className="flex gap-4">
                    {['Yes', 'No'].map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={formData.hasExistingWebsite === (option === 'Yes')}
                          onCheckedChange={() => updateField('hasExistingWebsite', option === 'Yes')}
                        />
                        <span className="text-white">{option}</span>
                      </label>
                    ))}
                  </div>
                </FormField>

                {formData.hasExistingWebsite && (
                  <FormField label="Current Domain">
                    <Input
                      value={formData.currentDomain}
                      onChange={(e) => updateField('currentDomain', e.target.value)}
                      placeholder="e.g., www.yourbusiness.com"
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </FormField>
                )}

                <FormField label="Lead Alert Method" required>
                  <div className="flex gap-4">
                    {['text', 'email', 'both'].map((method) => (
                      <label key={method} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={formData.leadAlertMethod === method}
                          onCheckedChange={() => updateField('leadAlertMethod', method)}
                        />
                        <span className="text-white capitalize">{method}</span>
                      </label>
                    ))}
                  </div>
                </FormField>

                {(formData.leadAlertMethod === 'text' || formData.leadAlertMethod === 'both') && (
                  <FormField label="Alert Phone">
                    <Input
                      value={formData.alertPhone}
                      onChange={(e) => updateField('alertPhone', e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </FormField>
                )}

                {(formData.leadAlertMethod === 'email' || formData.leadAlertMethod === 'both') && (
                  <FormField label="Alert Email">
                    <Input
                      type="email"
                      value={formData.alertEmail}
                      onChange={(e) => updateField('alertEmail', e.target.value)}
                      className="bg-zinc-800/50 border-zinc-700 text-white"
                    />
                  </FormField>
                )}
              </>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={formData.consentConfirmed}
                    onCheckedChange={() => updateField('consentConfirmed', !formData.consentConfirmed)}
                    className="mt-1"
                  />
                  <span className="text-white">I confirm that all the information I've provided is accurate and complete.</span>
                </label>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-4 pt-8 border-t border-zinc-800">
              <Button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                variant="outline"
                className="flex-1 border-zinc-700 text-white hover:bg-zinc-800"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              {currentStep < STEPS.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex-1 bg-white hover:bg-zinc-200 text-black font-medium"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.consentConfirmed}
                  className="flex-1 bg-white hover:bg-zinc-200 text-black font-medium"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, required, children }: any) {
  return (
    <div>
      <Label className="text-white font-medium text-sm mb-2 block">
        {label} {required && <span className="text-zinc-500">*</span>}
      </Label>
      {children}
    </div>
  )
}

