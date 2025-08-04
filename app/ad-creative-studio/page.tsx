"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon, Sparkles, Loader2, ChevronLeft, ChevronRight, Info, Plus, Trash2, Download, X } from 'lucide-react'
import { toast } from 'sonner'

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
    thumbnail: 'https://i.imgur.com/yUmekNr.png',
    prompt: 'CRITICAL: Create product photo on DARK GRAY CONCRETE FLOOR with subtle cracks and weathered texture. PRODUCT PRESERVATION: Keep the product EXACTLY identical - same size, position, all colors, all details, all original text (PROJECT CAPRI, etc). Do NOT crop, resize, or modify ANY part of the product. BACKGROUND ONLY: Replace only the background with dark concrete texture. CONCRETE STYLE: Charcoal gray concrete with visible cracks, industrial look - dark but not pitch black.'
  }
]

interface GeneratedCreative {
  id: string
  originalImage: string
  generatedImage: string
  style: StyleOption
  customText: { top: string; bottom: string }
  createdAt: Date
  status: 'generating' | 'completed' | 'failed'
}

export default function AdCreativeStudioPage() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(true)
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
  const [showStyleModal, setShowStyleModal] = useState(false)
  const [modalStyle, setModalStyle] = useState<StyleOption>(STYLE_OPTIONS[0])

  // Simulate loading for the page
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Carousel navigation functions
  const nextStyle = () => {
    setCurrentStyleIndex((prev) => (prev + 1) % STYLE_OPTIONS.length)
  }

  const prevStyle = () => {
    setCurrentStyleIndex((prev) => (prev - 1 + STYLE_OPTIONS.length) % STYLE_OPTIONS.length)
  }

  const currentStyle = STYLE_OPTIONS[currentStyleIndex]

  // Functions for managing creatives
  const addCreative = (creative: Omit<GeneratedCreative, 'id' | 'createdAt'>) => {
    const newCreative: GeneratedCreative = {
      ...creative,
      id: Date.now().toString(),
      createdAt: new Date()
    }
    setGeneratedCreatives(prev => [newCreative, ...prev])
    return newCreative.id
  }

  const updateCreativeStatus = (id: string, status: GeneratedCreative['status'], generatedImage?: string) => {
    setGeneratedCreatives(prev => prev.map(creative => 
      creative.id === id 
        ? { ...creative, status, ...(generatedImage && { generatedImage }) }
        : creative
    ))
  }

  const deleteCreative = (id: string) => {
    setGeneratedCreatives(prev => prev.filter(creative => creative.id !== id))
  }

  const openStyleModal = (style: StyleOption) => {
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
        textAddition += `MANDATORY: Place "${customText.top}" text at the TOP CENTER of the image (not cut off) in large, bold, readable font. Make the text color ${topColorName.toLowerCase()} (${textColors.top}). `
      }
      if (customText.bottom) {
        const bottomColorName = colorOptions.find(c => c.value === textColors.bottom)?.name || 'white'
        textAddition += `MANDATORY: Place "${customText.bottom}" text at the BOTTOM CENTER of the image (not cut off) in large, bold, readable font. Make the text color ${bottomColorName.toLowerCase()} (${textColors.bottom}). `
      }
      textAddition += 'CRITICAL: Text MUST be FULLY VISIBLE within image boundaries with strong contrast, drop shadows, and outlines. NEVER cut off text. DO NOT SKIP THE TEXT OVERLAYS - THEY ARE REQUIRED.'
    }
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

    // Create creative entry
    const creativeId = addCreative({
      originalImage: uploadedImageUrl,
      generatedImage: '',
      style: modalStyle,
      customText: customText,
      status: 'generating'
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

            const enhancedPrompt = modalStyle.prompt + generateTextPromptAddition()
      
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
          style: modalStyle.id
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
  if (isLoadingPage) {
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
              <Sparkles className="w-8 h-8 text-white/70" />
            </div>
          </div>
          
          {/* Loading title */}
          <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
            Ad Creative Studio
          </h1>
          
          {/* Dynamic loading phase */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            Initializing AI creative tools
          </p>
          
          {/* Subtle loading tip */}
          <div className="mt-8 text-xs text-gray-500 italic">
            Building your personalized creative generation dashboard...
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
          {/* Upload Section */}
                <div className="flex items-center gap-6 p-4 bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-semibold text-white">Upload Product</h2>
                  </div>
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
                          <p className="text-sm font-medium text-white">Drop image here or click</p>
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
                </div>

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
                        className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden hover:border-[#555] hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                        onClick={() => openStyleModal(style)}
                    >
                        <div className="aspect-square bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center overflow-hidden">
                        <img
                          src={style.thumbnail}
                          alt={style.name}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-6">
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
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
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
                        className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden"
                      >
                        <div className="aspect-square bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center overflow-hidden relative">
                          {creative.status === 'generating' ? (
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                              <p className="text-gray-300 text-sm font-medium">Generating...</p>
                            </div>
                          ) : creative.status === 'completed' ? (
                            <img
                              src={creative.generatedImage}
                              alt="Generated creative"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-3">
                              <X className="w-8 h-8 text-gray-400" />
                              <p className="text-gray-300 text-sm font-medium">Failed</p>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-white text-sm">
                              {creative.style.name}
                            </h4>
                            <div className="flex gap-2">
                              {creative.status === 'completed' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const link = document.createElement('a')
                                    link.href = creative.generatedImage
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
                          <p className="text-gray-400 text-xs">
                            {creative.createdAt.toLocaleDateString()} at {creative.createdAt.toLocaleTimeString()}
                          </p>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}
          </div>
          </div>

        {/* Enhanced Style Customization Modal */}
        {showStyleModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-[#333] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-500/20 to-gray-400/20 rounded-lg flex items-center justify-center border border-gray-500/30">
                    <Sparkles className="w-5 h-5 text-gray-300" />
                  </div>
          <div>
                    <h2 className="text-2xl font-bold text-white">Create Your Ad Creative</h2>
                    <p className="text-gray-400 text-sm">Customize and generate your product image</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStyleModal(false)}
                  className="bg-[#2A2A2A] border-[#444] text-white hover:bg-[#333] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Original Image Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Upload className="w-5 h-5 text-gray-300" />
                      <h3 className="text-lg font-semibold text-white">Your Product</h3>
                    </div>
                    <div className="aspect-square bg-gradient-to-br from-[#333] to-[#222] rounded-xl flex items-center justify-center overflow-hidden border border-[#333] shadow-lg">
                      {uploadedImageUrl ? (
                        <img
                          src={uploadedImageUrl}
                          alt="Your product"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="w-16 h-16 mx-auto text-gray-500 mb-3" />
                          <p className="text-gray-500 text-sm">No image uploaded</p>
                        </div>
                      )}
                    </div>
                    {uploadedImage && (
                      <div className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white text-sm font-medium">Image Details</p>
                            <p className="text-gray-400 text-xs">
                              {uploadedImage.name} • {(uploadedImage.size / 1024 / 1024).toFixed(1)} MB
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Style Preview Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="w-5 h-5 text-gray-300" />
                      <h3 className="text-lg font-semibold text-white">Style Preview</h3>
                    </div>
                    
                    <div className="aspect-square bg-gradient-to-br from-[#333] to-[#222] rounded-xl flex items-center justify-center overflow-hidden border border-[#333] shadow-lg">
                      <img
                        src={modalStyle.thumbnail}
                        alt={modalStyle.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-2">{modalStyle.name}</h4>
                      <p className="text-gray-400 text-sm leading-relaxed">{modalStyle.description}</p>
                    </div>

                    {/* Style Selector - Only show if more than 1 option */}
                    {STYLE_OPTIONS.length > 1 && (
                      <div>
                        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Choose Style:
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          {STYLE_OPTIONS.map((style) => (
                            <button
                              key={style.id}
                              onClick={() => setModalStyle(style)}
                              className={`p-3 rounded-lg border transition-all duration-200 ${
                                modalStyle.id === style.id
                                  ? 'border-white bg-white/20 shadow-lg'
                                  : 'border-[#333] hover:border-[#555] bg-[#2A2A2A]'
                              }`}
                            >
                              <div className="aspect-square bg-gradient-to-br from-[#333] to-[#222] rounded overflow-hidden mb-2">
                                <img
                                  src={style.thumbnail}
                                  alt={style.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <p className="text-white text-xs font-medium">{style.name}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Configuration & Generate Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Plus className="w-5 h-5 text-gray-300" />
                      <h3 className="text-lg font-semibold text-white">Customize</h3>
                    </div>

                    {/* Text Overlay System */}
                    <div className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-lg p-6">
                      <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Add Text Overlays
                      </h4>
                      
                      {/* Top Text */}
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="text-gray-300 text-sm block mb-3 font-medium">Top Text</label>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {Object.entries(textPresets).map(([key, preset]) => (
                              <button
                                key={key}
                                onClick={() => handlePresetSelect('top', key)}
                                className={`p-2 text-xs rounded-lg border transition-all duration-200 ${
                                  selectedTopPreset === key
                                    ? 'border-white bg-white/20 text-white'
                                    : 'border-[#444] bg-[#333] text-gray-300 hover:border-[#555] hover:bg-[#3a3a3a]'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                          
                          {/* Custom value input for customizable presets */}
                          {selectedTopPreset && textPresets[selectedTopPreset as keyof typeof textPresets]?.customizable && (
                            <div className="mb-3">
                              <input
                                type="text"
                                placeholder={
                                  selectedTopPreset === 'percentage' ? 'Enter percentage (e.g., 25)' :
                                  selectedTopPreset === 'money' ? 'Enter amount (e.g., 10)' :
                                  'Enter custom text'
                                }
                                value={customValues.topValue}
                                onChange={(e) => handleCustomValueChange('top', e.target.value)}
                                className="w-full bg-[#333] border border-[#444] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-gray-400 focus:outline-none transition-colors"
                              />
                            </div>
                          )}
                          
                          {/* Color Selection for Top Text */}
                          {customText.top && (
                            <div className="mb-3">
                              <label className="text-gray-300 text-xs block mb-2 font-medium">Text Color</label>
                              <div className="grid grid-cols-5 gap-2">
                                {colorOptions.map((color) => (
                                  <button
                                    key={color.value}
                                    onClick={() => setTextColors(prev => ({ ...prev, top: color.value }))}
                                    className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 ${
                                      textColors.top === color.value
                                        ? 'border-white scale-110'
                                        : 'border-gray-600 hover:border-gray-400'
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Preview */}
                          <div className="bg-[#333] border border-[#444] rounded-lg px-3 py-2">
                            <p className="text-white text-sm">
                              Preview: <span style={{ color: textColors.top }}>{customText.top || 'No text selected'}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Text */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-gray-300 text-sm block mb-3 font-medium">Bottom Text</label>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {Object.entries(textPresets).map(([key, preset]) => (
                              <button
                                key={key}
                                onClick={() => handlePresetSelect('bottom', key)}
                                className={`p-2 text-xs rounded-lg border transition-all duration-200 ${
                                  selectedBottomPreset === key
                                    ? 'border-white bg-white/20 text-white'
                                    : 'border-[#444] bg-[#333] text-gray-300 hover:border-[#555] hover:bg-[#3a3a3a]'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                          
                          {/* Custom value input for customizable presets */}
                          {selectedBottomPreset && textPresets[selectedBottomPreset as keyof typeof textPresets]?.customizable && (
                            <div className="mb-3">
                              <input
                                type="text"
                                placeholder={
                                  selectedBottomPreset === 'percentage' ? 'Enter percentage (e.g., 25)' :
                                  selectedBottomPreset === 'money' ? 'Enter amount (e.g., 10)' :
                                  'Enter custom text'
                                }
                                value={customValues.bottomValue}
                                onChange={(e) => handleCustomValueChange('bottom', e.target.value)}
                                className="w-full bg-[#333] border border-[#444] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-gray-400 focus:outline-none transition-colors"
                              />
                            </div>
                          )}
                          
                          {/* Color Selection for Bottom Text */}
                          {customText.bottom && (
                            <div className="mb-3">
                              <label className="text-gray-300 text-xs block mb-2 font-medium">Text Color</label>
                              <div className="grid grid-cols-5 gap-2">
                                {colorOptions.map((color) => (
                                  <button
                                    key={color.value}
                                    onClick={() => setTextColors(prev => ({ ...prev, bottom: color.value }))}
                                    className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 ${
                                      textColors.bottom === color.value
                                        ? 'border-white scale-110'
                                        : 'border-gray-600 hover:border-gray-400'
                                    }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Preview */}
                          <div className="bg-[#333] border border-[#444] rounded-lg px-3 py-2">
                            <p className="text-white text-sm">
                              Preview: <span style={{ color: textColors.bottom }}>{customText.bottom || 'No text selected'}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                                            {/* Clear buttons */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTopPreset('')
                            setCustomText(prev => ({ ...prev, top: '' }))
                            setCustomValues(prev => ({ ...prev, topValue: '' }))
                            setTextColors(prev => ({ ...prev, top: '#FFFFFF' }))
                          }}
                          className="bg-[#333] border-[#444] text-gray-300 hover:bg-[#3a3a3a] text-xs"
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
                          className="bg-[#333] border-[#444] text-gray-300 hover:bg-[#3a3a3a] text-xs"
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
                          className="bg-[#333] border-[#444] text-gray-300 hover:bg-[#3a3a3a] text-xs"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>

                    {/* Preview Info */}
                    <div className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-lg p-6">
                      <h4 className="text-white font-semibold mb-3">What You'll Get:</h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                          Your product with {modalStyle.name.toLowerCase()} background
                        </li>
                        {customText.top && (
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                            Top text: "<span style={{ color: textColors.top }}>{customText.top}</span>" in {colorOptions.find(c => c.value === textColors.top)?.name.toLowerCase() || 'white'}
                          </li>
                        )}
                        {customText.bottom && (
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                            Bottom text: "<span style={{ color: textColors.bottom }}>{customText.bottom}</span>" in {colorOptions.find(c => c.value === textColors.bottom)?.name.toLowerCase() || 'white'}
                          </li>
                        )}
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                          Perfect positioning with professional layout
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                          High-quality image ready for ads and marketing
                        </li>
                      </ul>
                  </div>

                    {/* Generate Button */}
                    <Button
                      disabled={!uploadedImage || isGenerating}
                      className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white border-0 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                      onClick={generateImageFromModal}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                          Generating Creative...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          Generate Creative
                        </>
                      )}
                    </Button>

                    {!uploadedImage && (
                      <div className="text-center p-4 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                        <p className="text-gray-300 text-sm">
                          Please upload a product image first
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}