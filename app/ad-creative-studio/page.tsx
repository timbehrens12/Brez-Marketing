"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon, Sparkles, Loader2, ChevronLeft, ChevronRight, Info, Plus, Trash2, Download, X, Building2, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useUser } from '@clerk/nextjs'
import { useAgency } from "@/contexts/AgencyContext"

interface StyleOption {
  id: string
  name: string
  description: string
  thumbnail: string
  prompt: string
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'concrete-floor',
    name: 'Concrete Floor',
    description: 'Dark cracked concrete floor with industrial texture',
    thumbnail: 'https://i.imgur.com/ED4tpzf.png',
    prompt: 'Place this exact clothing item on a realistic concrete surface background, similar to the lighting and texture in high-end fashion editorials. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a medium-toned concrete floor with visible cracks and a slight vignette, like in a minimal industrial setting. The lighting should be soft but directional, casting subtle shadows under the clothing to show it\'s resting on the ground. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand. Avoid any artificial floating effect — it must look like a real photograph taken in studio lighting conditions. CRITICAL SIZING REQUIREMENTS: Make the clothing item as LARGE as possible while maintaining proper proportions - the garment should fill most of the frame width (85-90% of image width) and be prominently displayed. Only leave minimal equal spacing at top and bottom for text overlays when needed. The product should be the DOMINANT focal point, not tiny or undersized. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. SMALL TEXT PRESERVATION: Pay special attention to preserving small text like "PROJECT CAPRI" or brand names - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. MANDATORY TAG/LABEL PRESERVATION: Keep ALL clothing tags, labels, brand tags, size tags, care labels, and any text or branding visible on the garment EXACTLY as shown in the original - DO NOT blank out, remove, or alter any tags, labels, or text anywhere on the clothing item including back tags, side labels, inside tags that are visible, brand names, or any printed/embroidered text. All tags must remain readable and identical to the original. LAYOUT: Center the product in portrait format with EQUAL spacing above and below for text overlays when needed - ensure top and bottom margins are perfectly balanced.'
  }
]

interface GeneratedCreative {
  id: string
  brand_id: string
  user_id: string
  style_id: string
  style_name: string
  original_image_url: string
  generated_image_url: string
  prompt_used: string
  text_overlays: any
  status: 'generating' | 'completed' | 'failed'
  metadata: any
  created_at: string
  updated_at: string
}

export default function AdCreativeStudioPage() {
  // Brand context
  const { selectedBrand, selectedBrandId } = useBrandContext()
  const { user } = useUser()
  const { agencySettings } = useAgency()
  
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isLoadingAfterBrandSelection, setIsLoadingAfterBrandSelection] = useState(false)
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0)
  const [showMoreInfo, setShowMoreInfo] = useState(false)
  const [customText, setCustomText] = useState({ top: '', bottom: '' })
  const [textPresets] = useState({
    percentage: { label: 'Percentage Off', value: '50% OFF', customizable: true },
    money: { label: 'Money Off', value: '$10 OFF', customizable: true },
    sale: { label: 'Sale', value: 'SALE', customizable: false },
    new: { label: 'New', value: 'NEW', customizable: false },
    limited: { label: 'Limited Time', value: 'LIMITED TIME', customizable: false },
    available: { label: 'Available Now', value: 'AVAILABLE NOW', customizable: false },
    outNow: { label: 'Out Now', value: 'OUT NOW', customizable: false },
    shopNow: { label: 'Shop Now', value: 'SHOP NOW', customizable: false },
    buyToday: { label: 'Buy Today', value: 'BUY TODAY', customizable: false },
    freeShipping: { label: 'Free Shipping', value: 'FREE SHIPPING', customizable: false },
    swipeUp: { label: 'Swipe Up', value: 'SWIPE UP', customizable: false },
    clickLink: { label: 'Click the Link', value: 'CLICK THE LINK', customizable: false },
    orderNow: { label: 'Order Now', value: 'ORDER NOW', customizable: false },
    limitedStock: { label: 'Limited Stock', value: 'LIMITED STOCK', customizable: false },
    exclusive: { label: 'Exclusive', value: 'EXCLUSIVE', customizable: false },
    premium: { label: 'Premium', value: 'PREMIUM', customizable: false },
    hotDeal: { label: 'Hot Deal', value: 'HOT DEAL', customizable: false },
    trending: { label: 'Trending', value: 'TRENDING', customizable: false },
    mustHave: { label: 'Must Have', value: 'MUST HAVE', customizable: false },
    custom: { label: 'Custom Text', value: '', customizable: true }
  })
  const [selectedTopPreset, setSelectedTopPreset] = useState<string>('')
  const [selectedBottomPreset, setSelectedBottomPreset] = useState<string>('')
  const [customValues, setCustomValues] = useState({ topValue: '', bottomValue: '' })
  const [textColors, setTextColors] = useState({ top: '#FFFFFF', bottom: '#FFFFFF' })
  
  // Color preset options
  const colorOptions = [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#FF0000' },
    { name: 'Blue', value: '#0066FF' },
    { name: 'Green', value: '#00CC00' },
    { name: 'Yellow', value: '#FFD700' },
    { name: 'Orange', value: '#FF6600' },
    { name: 'Purple', value: '#9933FF' },
    { name: 'Pink', value: '#FF33AA' },
    { name: 'Gray', value: '#888888' }
  ]
  
  // New state for tabs and creatives
  const [activeTab, setActiveTab] = useState<'create' | 'generated'>('create')
  const [generatedCreatives, setGeneratedCreatives] = useState<GeneratedCreative[]>([])
  const [isLoadingCreatives, setIsLoadingCreatives] = useState(false)
  const [showStyleModal, setShowStyleModal] = useState(false)
  const [modalStyle, setModalStyle] = useState<StyleOption>(STYLE_OPTIONS[0])

  // Load creative generations from database when brand changes
  useEffect(() => {
    const loadCreatives = async () => {
      if (!selectedBrandId || !user?.id) {
        setGeneratedCreatives([])
        return
      }

      setIsLoadingCreatives(true)
      try {
        console.log('📚 Loading creatives for brand:', selectedBrandId)
        const response = await fetch(`/api/creative-generations?brandId=${selectedBrandId}&userId=${user.id}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch creatives')
        }

        const data = await response.json()
        setGeneratedCreatives(data.creatives || [])
        console.log('✅ Loaded', data.creatives?.length || 0, 'creatives')
      } catch (error) {
        console.error('Error loading creatives:', error)
        toast.error('Failed to load previous creatives')
        setGeneratedCreatives([])
      } finally {
        setIsLoadingCreatives(false)
      }
    }

    loadCreatives()
  }, [selectedBrandId, user?.id])

  // Simulate loading for the page
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Handle brand selection loading
  React.useEffect(() => {
    if (selectedBrandId && !isLoadingPage) {
      setIsLoadingAfterBrandSelection(true)
      const timer = setTimeout(() => {
        setIsLoadingAfterBrandSelection(false)
      }, 1000) // Show loading for 1 second after brand selection
      return () => clearTimeout(timer)
    }
  }, [selectedBrandId, isLoadingPage])

  // Carousel navigation functions
  const nextStyle = () => {
    setCurrentStyleIndex((prev) => (prev + 1) % STYLE_OPTIONS.length)
  }

  const prevStyle = () => {
    setCurrentStyleIndex((prev) => (prev - 1 + STYLE_OPTIONS.length) % STYLE_OPTIONS.length)
  }

  const currentStyle = STYLE_OPTIONS[currentStyleIndex]

  // Functions for managing creatives
  const addCreative = (creative: Omit<GeneratedCreative, 'id' | 'created_at'>) => {
    const newCreative: GeneratedCreative = {
      ...creative,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    }
    setGeneratedCreatives(prev => [newCreative, ...prev])
    return newCreative.id
  }

  const updateCreativeStatus = (id: string, status: GeneratedCreative['status'], generatedImageUrl?: string) => {
    setGeneratedCreatives(prev => prev.map(creative => 
      creative.id === id 
        ? { ...creative, status, ...(generatedImageUrl && { generated_image_url: generatedImageUrl }) }
        : creative
    ))
  }

  const deleteCreative = async (id: string) => {
    if (!user?.id) {
      toast.error('You must be logged in to delete creatives')
      return
    }

    try {
      console.log('🗑️ Deleting creative:', id)
      
      const response = await fetch(`/api/creative-generations?id=${id}&userId=${user.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete creative')
      }

      setGeneratedCreatives(prev => prev.filter(creative => creative.id !== id))
      toast.success('Creative deleted successfully!')
      console.log('✅ Creative deleted successfully')
    } catch (error) {
      console.error('Error deleting creative:', error)
      toast.error('Failed to delete creative')
    }
  }

  const openStyleModal = (style: StyleOption) => {
    if (!uploadedImage) {
      toast.error('Please upload a product image first!')
      return
    }
    setModalStyle(style)
    setShowStyleModal(true)
  }

  // Text preset functions
  const handlePresetSelect = (position: 'top' | 'bottom', presetKey: string) => {
    if (position === 'top') {
      setSelectedTopPreset(presetKey)
      if (presetKey && textPresets[presetKey as keyof typeof textPresets]) {
        const preset = textPresets[presetKey as keyof typeof textPresets]
        setCustomText(prev => ({ ...prev, top: preset.customizable ? customValues.topValue || preset.value : preset.value }))
      }
    } else {
      setSelectedBottomPreset(presetKey)
      if (presetKey && textPresets[presetKey as keyof typeof textPresets]) {
        const preset = textPresets[presetKey as keyof typeof textPresets]
        setCustomText(prev => ({ ...prev, bottom: preset.customizable ? customValues.bottomValue || preset.value : preset.value }))
      }
    }
  }

  const handleCustomValueChange = (position: 'top' | 'bottom', value: string) => {
    if (position === 'top') {
      setCustomValues(prev => ({ ...prev, topValue: value }))
      if (selectedTopPreset === 'percentage') {
        setCustomText(prev => ({ ...prev, top: `${value}% OFF` }))
      } else if (selectedTopPreset === 'money') {
        setCustomText(prev => ({ ...prev, top: `$${value} OFF` }))
      } else if (selectedTopPreset === 'custom') {
        setCustomText(prev => ({ ...prev, top: value }))
      }
    } else {
      setCustomValues(prev => ({ ...prev, bottomValue: value }))
      if (selectedBottomPreset === 'percentage') {
        setCustomText(prev => ({ ...prev, bottom: `${value}% OFF` }))
      } else if (selectedBottomPreset === 'money') {
        setCustomText(prev => ({ ...prev, bottom: `$${value} OFF` }))
      } else if (selectedBottomPreset === 'custom') {
        setCustomText(prev => ({ ...prev, bottom: value }))
      }
    }
  }

  const generateTextPromptAddition = () => {
    let textAddition = ''
    if (customText.top || customText.bottom) {
      textAddition += ' CRITICAL REQUIREMENT - MUST ADD TEXT OVERLAYS: '
      if (customText.top) {
        const topColorName = colorOptions.find(c => c.value === textColors.top)?.name || 'white'
        textAddition += `MANDATORY: Place "${customText.top}" text at the TOP of the image with only a TINY margin from the very top edge - position it close to the top with minimal spacing above it (just enough to not touch the edge). PERFECTLY CENTERED horizontally with equal spacing from left and right edges. The text must be PERFECTLY STRAIGHT and LEVEL (not tilted or wonky). Use large, bold, readable font that is EVENLY SPACED and SYMMETRICALLY POSITIONED. Make the text color ${topColorName.toLowerCase()} (${textColors.top}). Ensure text is PRECISELY ALIGNED and appears professional. `
      }
      if (customText.bottom) {
        const bottomColorName = colorOptions.find(c => c.value === textColors.bottom)?.name || 'white'
        textAddition += `MANDATORY: Place "${customText.bottom}" text at the BOTTOM of the image with only a TINY margin from the very bottom edge - position it close to the bottom with minimal spacing below it (just enough to not touch the edge). PERFECTLY CENTERED horizontally with equal spacing from left and right edges. The text must be PERFECTLY STRAIGHT and LEVEL (not tilted or wonky). Use large, bold, readable font that is EVENLY SPACED and SYMMETRICALLY POSITIONED. Make the text color ${bottomColorName.toLowerCase()} (${textColors.bottom}). Ensure text is PRECISELY ALIGNED and appears professional. `
      }
      textAddition += 'CRITICAL TEXT ALIGNMENT: ALL TEXT must be PERFECTLY CENTERED both horizontally and vertically within their designated areas. Text must be STRAIGHT, LEVEL, and EVENLY POSITIONED - NO tilting, skewing, or wonky alignment. Use professional typography spacing with EQUAL margins on all sides. Strong contrast, drop shadows, and outlines required for readability. NEVER cut off any letters. DO NOT SKIP THE TEXT OVERLAYS - THEY ARE REQUIRED.'
    }
    // Add ULTRA-CRITICAL preservation instruction at the end
    if (textAddition) {
      textAddition += ' '
    }
    textAddition += 'ULTRA-CRITICAL FINAL INSTRUCTION: The original product must be preserved with 100% EXACT fidelity - every single character, logo, graphic, text, color, and detail must be IDENTICAL to the input image. Use the highest possible preservation quality equivalent to ChatGPT-level fidelity. DO NOT modify, stylize, or alter the product in ANY way.'
    
    return textAddition
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setUploadedImage(file)
        const url = URL.createObjectURL(file)
        setUploadedImageUrl(url)
        setGeneratedImage('') // Clear any previous generation
        toast.success('Image uploaded successfully!')
      } else {
        toast.error('Please upload a valid image file')
      }
    }
  }

  const generateImageFromModal = async () => {
    if (!uploadedImage) {
      toast.error('Please upload an image first')
      return
    }

    // Generate enhanced prompt
    const enhancedPrompt = modalStyle.prompt + generateTextPromptAddition()

    // Create creative entry
    const creativeId = addCreative({
      brand_id: selectedBrandId!,
      user_id: user!.id,
      style_id: modalStyle.id,
      style_name: modalStyle.name,
      original_image_url: uploadedImageUrl,
      generated_image_url: '',
      prompt_used: enhancedPrompt,
      text_overlays: customText,
      status: 'generating',
      metadata: {},
      updated_at: new Date().toISOString()
    })

    setIsGenerating(true)
    setSelectedStyle(modalStyle)
    setShowStyleModal(false)
    setActiveTab('generated') // Switch to generated tab
    
    toast.info('Starting image generation... This may take 30-60 seconds.')

    try {
      // Convert image to base64 with maximum quality preservation
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          let result = reader.result as string
          
          console.log('Original image size:', uploadedImage.size, 'bytes')
          console.log('Original image type:', uploadedImage.type)
          console.log('Base64 length:', result.length)
          
          if (uploadedImage.size < 500000) { // Less than 500KB
            console.warn('⚠️  Image is quite small - consider uploading higher resolution for better detail preservation')
          }
          
          resolve(result)
        }
        reader.readAsDataURL(uploadedImage)
      })

      // Debug logging
      console.log('🚀 SENDING TO API:')
      console.log('📝 Final Prompt:', enhancedPrompt)
      console.log('🎨 Style ID:', modalStyle.id)
      console.log('📷 Image size:', base64Image.length, 'characters')
      console.log('📋 Text overlays:', customText)

      const response = await fetch('/api/generate-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          prompt: enhancedPrompt,
          style: modalStyle.id,
          brandId: selectedBrandId,
          userId: user?.id,
          styleName: modalStyle.name,
          textOverlays: { top: customText.top, bottom: customText.bottom },
          saveToDatabase: true
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API Error Response:', errorData)
        console.error('❌ Response Status:', response.status, response.statusText)
        updateCreativeStatus(creativeId, 'failed')
        toast.error(`${errorData.error}${errorData.suggestion ? ` - ${errorData.suggestion}` : ''}`)
        return
      }

      const data = await response.json()
      console.log('✅ API Success Response:', data)
      console.log('🖼️ Generated image URL length:', data.imageUrl?.length || 'no imageUrl')
      updateCreativeStatus(creativeId, 'completed', data.imageUrl)
      setGeneratedImage(data.imageUrl)
      toast.success(`🎨 Image generated successfully!`)
    } catch (error) {
      console.error('Error generating image:', error)
      updateCreativeStatus(creativeId, 'failed')
      toast.error('Failed to generate image. Check console for details.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Show loading state
  if (isLoadingPage || isLoadingAfterBrandSelection) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden" style={{ paddingBottom: '15vh' }}>
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Main loading icon */}
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-white/60 animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              {agencySettings?.agency_logo_url && (
                <img 
                  src={agencySettings.agency_logo_url} 
                  alt={`${agencySettings.agency_name} Logo`} 
                  className="w-12 h-12 object-contain rounded" 
                />
              )}
            </div>
          </div>
          
          {/* Loading title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Ad Creative Studio
          </h1>
          
          {/* Dynamic loading phase */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            {isLoadingAfterBrandSelection ? 'Loading creative tools...' : 'Initializing AI creative tools'}
          </p>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Building your personalized creative generation dashboard...
          </div>
        </div>
      </div>
    )
  }

  // Show brand selection requirement if no brand is selected
  if (!selectedBrandId || !selectedBrand) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden" style={{ paddingBottom: '15vh' }}>
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0A] via-[#111] to-[#0A0A0A]"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center max-w-lg mx-auto px-6">
          {/* Main icon - NO loading animation */}
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              {agencySettings?.agency_logo_url && (
                <img 
                  src={agencySettings.agency_logo_url} 
                  alt={`${agencySettings.agency_name} Logo`} 
                  className="w-12 h-12 object-contain rounded" 
                />
              )}
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Ad Creative Studio
          </h1>
          
          {/* Brand selection message */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            Select a Brand to Continue
          </p>
          
          {/* Description */}
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            To use the Ad Creative Studio, you need to select a brand first. 
            This ensures your generated creatives are saved and organized by brand.
          </p>

          {/* Beta notice */}
          <div className="bg-gradient-to-r from-[#1a1a1a]/50 to-[#161616]/50 border border-[#333] rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-amber-400 mb-2">
              <FlaskConical className="w-5 h-5" />
              <span className="font-semibold">Beta Feature</span>
            </div>
            <p className="text-gray-300 text-xs">
              The Ad Creative Studio is currently in beta. It may struggle with very small text and complex designs.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] p-4 pb-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                            flex items-center justify-center border border-white/10">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Ad Creative Studio</h1>
                <p className="text-gray-300 mt-1">Upload your product image and transform it with AI-powered backgrounds</p>
              </div>
            </div>
            
            {/* Upload Section - Moved to Header */}
            <div className="flex items-center gap-4">
              <div 
                className="border-2 border-dashed border-[#444] rounded-lg p-3 hover:border-[#555] transition-all duration-300 cursor-pointer bg-gradient-to-br from-white/[0.02] to-white/[0.05] flex items-center gap-3"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                {uploadedImageUrl ? (
                  <>
                    <img 
                      src={uploadedImageUrl} 
                      alt="Uploaded product" 
                      className="w-12 h-12 rounded-lg object-cover border border-[#333]"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">Product Uploaded</p>
                      <p className="text-xs text-gray-400">Click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-white">Upload Product</p>
                      <p className="text-xs text-gray-400">PNG/JPG • Up to 10MB</p>
                    </div>
                  </>
                )}
              </div>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {/* Beta Notice */}
              <div className="bg-gradient-to-r from-gray-500/20 to-gray-400/20 border border-gray-400/30 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300 font-medium text-sm">BETA</span>
                </div>
                <p className="text-gray-200/80 text-xs mt-1">May struggle with small text & fine details</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] shadow-xl">
          <div className="p-4 border-b border-[#333]">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'create'
                    ? 'bg-white text-black'
                    : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#333] hover:text-white'
                }`}
              >
                Create New
              </button>
              <button
                onClick={() => setActiveTab('generated')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'generated'
                    ? 'bg-white text-black'
                    : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#333] hover:text-white'
                }`}
              >
                Generated Creatives
                {generatedCreatives.length > 0 && (
                  <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                    {generatedCreatives.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'create' ? (
              <div className="space-y-6">
                                  {/* Bigger Style Gallery */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Background Styles
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {STYLE_OPTIONS.map((style) => (
                    <div
                      key={style.id}
                        className={`bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden transition-all duration-300 group ${
                          uploadedImage 
                            ? 'hover:border-[#555] hover:shadow-2xl cursor-pointer' 
                            : 'opacity-50 cursor-not-allowed'
                        } h-fit`}
                        onClick={() => openStyleModal(style)}
                    >
                        <div className="aspect-[3/4] bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center overflow-hidden">
                        <img
                          src={style.thumbnail}
                          alt={style.name}
                            className={`w-full h-full object-cover transition-all duration-300 ${
                              uploadedImage 
                                ? 'opacity-80 group-hover:opacity-100 group-hover:scale-105' 
                                : 'opacity-30'
                            }`}
                          />
                        </div>
                        <div className="p-6 flex-shrink-0">
                          <h4 className="font-semibold text-white text-lg mb-2 group-hover:text-gray-300 transition-colors">
                            {style.name}
                          </h4>
                          <p className="text-gray-400 text-sm leading-relaxed">
                            {style.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Generated Creatives Tab
              <div>
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <ImageIcon className="w-6 h-6" />
                  Your Generated Creatives
                </h3>
                {generatedCreatives.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                    <h4 className="text-lg font-medium text-white mb-2">No creatives yet</h4>
                    <p className="text-gray-400 mb-4">Upload an image and generate your first creative!</p>
                        <Button 
                      onClick={() => setActiveTab('create')}
                      className="bg-white hover:bg-gray-200 text-black border-0"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Creative
                    </Button>
                  </div>
                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {generatedCreatives.map((creative) => (
                      <div
                        key={creative.id}
                        className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden h-fit"
                      >
                        <div className="bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center overflow-hidden relative rounded-lg">
                          {creative.status === 'generating' ? (
                            <div className="flex flex-col items-center gap-3 py-8">
                              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                              <p className="text-gray-300 text-sm font-medium">Generating...</p>
                            </div>
                          ) : creative.status === 'completed' ? (
                            <img
                              src={creative.generated_image_url}
                              alt="Generated creative"
                              className="w-full h-auto object-contain max-h-none"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-3 py-8">
                              <X className="w-8 h-8 text-gray-400" />
                              <p className="text-gray-300 text-sm font-medium">Failed</p>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex-shrink-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-white text-base">
                              {creative.style_name}
                            </h4>
                            <div className="flex gap-2">
                              {creative.status === 'completed' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const link = document.createElement('a')
                                    link.href = creative.generated_image_url
                                    link.download = `creative-${creative.id}.png`
                                    link.click()
                                  }}
                                  className="bg-gray-600 hover:bg-gray-700 text-white border-0 px-2 py-1"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteCreative(creative.id)}
                                className="bg-gray-600/20 border-gray-600/30 text-gray-300 hover:bg-gray-600/30 px-2 py-1"
                              >
                                <Trash2 className="w-3 h-3" />
                      </Button>
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {new Date(creative.created_at).toLocaleDateString()} at {new Date(creative.created_at).toLocaleTimeString()}
                        </p>
                    </div>
                  </div>
                ))})
                </div>
                )}
              </div>
            )}
          </div>
          </div>

        {/* Completely Redesigned Modal */}
        {showStyleModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-2xl border border-[#333] max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Compact Header */}
              <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between bg-gradient-to-r from-[#222] to-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-white/10 to-white/5 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Generate Creative</h2>
                    <p className="text-gray-400 text-xs">{modalStyle.name} Style</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStyleModal(false)}
                  className="bg-transparent border-[#444] text-gray-300 hover:bg-[#333] hover:text-white h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Compact Image Preview Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <p className="text-white text-base font-medium flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Your Product
                    </p>
                    <div className="aspect-[4/5] bg-gradient-to-br from-[#333] to-[#222] rounded-lg overflow-hidden border border-[#333]">
                      {uploadedImageUrl ? (
                        <img src={uploadedImageUrl} alt="Product" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="w-10 h-10 text-gray-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-white text-base font-medium flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Background Style
                    </p>
                    <div className="aspect-[4/5] bg-gradient-to-br from-[#333] to-[#222] rounded-lg overflow-hidden border border-[#333]">
                      <img src={modalStyle.thumbnail} alt={modalStyle.name} className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>

                {/* Style Options - Horizontal Row */}
                {STYLE_OPTIONS.length > 1 && (
                  <div>
                    <p className="text-white text-base font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Choose Style
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {STYLE_OPTIONS.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setModalStyle(style)}
                          className={`flex-shrink-0 w-20 p-2 rounded-lg border transition-all duration-200 ${
                            modalStyle.id === style.id
                              ? 'border-white bg-white/10'
                              : 'border-[#333] hover:border-[#555] bg-[#2A2A2A]'
                          }`}
                        >
                          <div className="aspect-[4/5] bg-gradient-to-br from-[#333] to-[#222] rounded mb-1 overflow-hidden">
                            <img src={style.thumbnail} alt={style.name} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-white text-xs font-medium leading-tight">{style.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text Controls with All Presets */}
                <div className="bg-gradient-to-br from-[#222] to-[#1e1e1e] border border-[#333] rounded-lg p-5">
                  <h4 className="text-white font-medium mb-5 flex items-center gap-2 text-base">
                    <Plus className="w-4 h-4" />
                    Text Overlays
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* Top Text Column */}
                    <div className="space-y-4">
                      <label className="text-gray-300 text-sm font-medium">Top Text</label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(textPresets).map(([key, preset]) => (
                          <button
                            key={key}
                            onClick={() => handlePresetSelect('top', key)}
                            className={`px-3 py-2 text-xs rounded border transition-all ${
                              selectedTopPreset === key
                                ? 'border-white bg-white/20 text-white'
                                : 'border-[#444] bg-[#333] text-gray-300 hover:border-[#555]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      
                      {selectedTopPreset && textPresets[selectedTopPreset as keyof typeof textPresets]?.customizable && (
                        <input
                          type="text"
                          placeholder="Custom value"
                          value={customValues.topValue}
                          onChange={(e) => handleCustomValueChange('top', e.target.value)}
                          className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-gray-400 focus:outline-none"
                        />
                      )}
                      
                      {customText.top && (
                        <div>
                          <label className="text-gray-300 text-xs font-medium block mb-2">Text Color</label>
                          <div className="flex gap-2">
                            {colorOptions.map((color) => (
                              <button
                                key={color.value}
                                onClick={() => setTextColors(prev => ({ ...prev, top: color.value }))}
                                className={`w-6 h-6 rounded border-2 ${
                                  textColors.top === color.value ? 'border-white' : 'border-gray-600'
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-[#333] rounded px-3 py-2">
                        <p className="text-sm text-gray-300">
                          Preview: <span style={{ color: textColors.top }}>{customText.top || 'None'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Bottom Text Column */}
                    <div className="space-y-4">
                      <label className="text-gray-300 text-sm font-medium">Bottom Text</label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(textPresets).map(([key, preset]) => (
                          <button
                            key={key}
                            onClick={() => handlePresetSelect('bottom', key)}
                            className={`px-3 py-2 text-xs rounded border transition-all ${
                              selectedBottomPreset === key
                                ? 'border-white bg-white/20 text-white'
                                : 'border-[#444] bg-[#333] text-gray-300 hover:border-[#555]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      
                      {selectedBottomPreset && textPresets[selectedBottomPreset as keyof typeof textPresets]?.customizable && (
                        <input
                          type="text"
                          placeholder="Custom value"
                          value={customValues.bottomValue}
                          onChange={(e) => handleCustomValueChange('bottom', e.target.value)}
                          className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-gray-400 focus:outline-none"
                        />
                      )}
                      
                      {customText.bottom && (
                        <div>
                          <label className="text-gray-300 text-xs font-medium block mb-2">Text Color</label>
                          <div className="flex gap-2">
                            {colorOptions.map((color) => (
                              <button
                                key={color.value}
                                onClick={() => setTextColors(prev => ({ ...prev, bottom: color.value }))}
                                className={`w-6 h-6 rounded border-2 ${
                                  textColors.bottom === color.value ? 'border-white' : 'border-gray-600'
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-[#333] rounded px-3 py-2">
                        <p className="text-sm text-gray-300">
                          Preview: <span style={{ color: textColors.bottom }}>{customText.bottom || 'None'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clear Buttons Row */}
                  <div className="flex gap-3 mt-5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTopPreset('')
                        setCustomText(prev => ({ ...prev, top: '' }))
                        setCustomValues(prev => ({ ...prev, topValue: '' }))
                        setTextColors(prev => ({ ...prev, top: '#FFFFFF' }))
                      }}
                      className="bg-[#333] border-[#444] text-gray-300 hover:bg-[#3a3a3a] text-sm px-4 py-2"
                    >
                      Clear Top
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBottomPreset('')
                        setCustomText(prev => ({ ...prev, bottom: '' }))
                        setCustomValues(prev => ({ ...prev, bottomValue: '' }))
                        setTextColors(prev => ({ ...prev, bottom: '#FFFFFF' }))
                      }}
                      className="bg-[#333] border-[#444] text-gray-300 hover:bg-[#3a3a3a] text-sm px-4 py-2"
                    >
                      Clear Bottom
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTopPreset('')
                        setSelectedBottomPreset('')
                        setCustomText({ top: '', bottom: '' })
                        setCustomValues({ topValue: '', bottomValue: '' })
                        setTextColors({ top: '#FFFFFF', bottom: '#FFFFFF' })
                      }}
                      className="bg-[#333] border-[#444] text-gray-300 hover:bg-[#3a3a3a] text-sm px-4 py-2"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="flex gap-4">
                  <Button
                    disabled={!uploadedImage || isGenerating}
                    className="flex-1 bg-gradient-to-r from-white to-gray-200 hover:from-gray-200 hover:to-gray-300 text-black border-0 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    onClick={generateImageFromModal}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Creative
                      </>
                    )}
                  </Button>
                  
                  {!uploadedImage && (
                    <div className="flex-1 flex items-center justify-center text-center py-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                      <p className="text-gray-400 text-sm">Upload a product image first</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}