"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon, Sparkles, Loader2, ChevronLeft, ChevronRight, Info, Plus } from 'lucide-react'
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
    id: 'smooth-stone',
    name: 'Smooth Stone',
    description: 'Smooth stone surface with minor cracks, like refined blacktop',
    thumbnail: 'https://i.imgur.com/yUmekNr.png',
    prompt: 'EXACT COLOR PRESERVATION - BACKGROUND REPLACEMENT ONLY: Replace ONLY the background with smooth stone/blacktop surface with minor cracks while keeping the product COMPLETELY unchanged. CRITICAL COLOR MATCHING: Preserve every single color exactly as it appears in the original - do not shift hues, saturation, or brightness. Keep blues as exact blue, whites as exact white, etc. Position the product in the CENTER with EXTENSIVE smooth stone background space around ALL edges - especially significant space at TOP and BOTTOM for text overlays. Product should occupy 60% of frame height, leaving 20% clear space above and 20% below for text. Include generous side margins. DO NOT add, modify, enhance, or alter ANY aspect of the product design, colors, text, or graphics. This is purely a background swap with perfect color preservation.'
  },
  {
    id: 'wooden-floor',
    name: 'Wooden Floor',
    description: 'Warm wooden flooring with natural grain and lighting',
    thumbnail: 'https://i.imgur.com/yUmekNr.png',
    prompt: 'EXACT COLOR PRESERVATION - BACKGROUND REPLACEMENT ONLY: Replace ONLY the background with wooden floor while keeping the product COMPLETELY unchanged. CRITICAL COLOR MATCHING: Preserve every single color exactly as it appears in the original - do not shift hues, saturation, or brightness. Keep blues as exact blue, whites as exact white, etc. Position the product in the CENTER with SUBSTANTIAL wooden floor background space around ALL edges - especially significant space at TOP and BOTTOM for text overlays. Product should occupy 60% of frame height, leaving 20% clear space above and 20% below for text. Include generous side margins. DO NOT add, modify, enhance, or alter ANY aspect of the product design, colors, text, or graphics.'
  },
  {
    id: 'marble-surface',
    name: 'Marble Surface',
    description: 'Elegant marble surface with luxury appeal',
    thumbnail: 'https://i.imgur.com/yUmekNr.png',
    prompt: 'EXACT COLOR PRESERVATION - BACKGROUND REPLACEMENT ONLY: Replace ONLY the background with marble surface while keeping the product COMPLETELY unchanged. CRITICAL COLOR MATCHING: Preserve every single color exactly as it appears in the original - do not shift hues, saturation, or brightness. Keep blues as exact blue, whites as exact white, etc. Position the product in the CENTER with EXTENSIVE marble background space around ALL edges - especially ample space at TOP and BOTTOM for text overlays. Product should occupy 60% of frame height, leaving 20% clear space above and 20% below for text. Include generous side margins. DO NOT add, modify, enhance, or alter ANY aspect of the product design, colors, text, or graphics.'
  },
  {
    id: 'studio-white',
    name: 'Studio White',
    description: 'Clean studio white background for professional product shots',
    thumbnail: 'https://i.imgur.com/yUmekNr.png',
    prompt: 'EXACT COLOR PRESERVATION - BACKGROUND REPLACEMENT ONLY: Replace ONLY the background with clean studio white while keeping the product COMPLETELY unchanged. CRITICAL COLOR MATCHING: Preserve every single color exactly as it appears in the original - do not shift hues, saturation, or brightness. Keep blues as exact blue, whites as exact white, etc. Position the product in the CENTER with SUBSTANTIAL white background space around ALL edges - especially significant space at TOP and BOTTOM for text overlays. Product should occupy 60% of frame height, leaving 20% clear space above and 20% below for text. Include generous side margins. DO NOT add, modify, enhance, or alter ANY aspect of the product design, colors, text, or graphics.'
  },
  {
    id: 'dark-surface',
    name: 'Dark Surface',
    description: 'Sophisticated dark surface for premium product presentation',
    thumbnail: 'https://i.imgur.com/yUmekNr.png',
    prompt: 'EXACT COLOR PRESERVATION - BACKGROUND REPLACEMENT ONLY: Replace ONLY the background with dark surface while keeping the product COMPLETELY unchanged. CRITICAL COLOR MATCHING: Preserve every single color exactly as it appears in the original - do not shift hues, saturation, or brightness. Keep blues as exact blue, whites as exact white, etc. Position the product in the CENTER with EXTENSIVE dark background space around ALL edges - especially ample space at TOP and BOTTOM for text overlays. Product should occupy 60% of frame height, leaving 20% clear space above and 20% below for text. Include generous side margins. DO NOT add, modify, enhance, or alter ANY aspect of the product design, colors, text, or graphics.'
  }
]

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

  const generateImage = async (style: StyleOption) => {
    if (!uploadedImage) {
      toast.error('Please upload an image first')
      return
    }

    setIsGenerating(true)
    setSelectedStyle(style)
    
    toast.info('Starting image generation with gpt-image-1... This may take 30-60 seconds.')

    try {
      // Convert image to base64 with maximum quality preservation
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          let result = reader.result as string
          
          // Log the original image details for debugging
          console.log('Original image size:', uploadedImage.size, 'bytes')
          console.log('Original image type:', uploadedImage.type)
          console.log('Base64 length:', result.length)
          
          // Warn if image might be too low quality
          if (uploadedImage.size < 500000) { // Less than 500KB
            console.warn('⚠️  Image is quite small - consider uploading higher resolution for better detail preservation')
          }
          
          resolve(result)
        }
        reader.readAsDataURL(uploadedImage)
      })

      const response = await fetch('/api/generate-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          prompt: style.prompt,
          style: style.id
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        toast.error(`${errorData.error}${errorData.suggestion ? ` - ${errorData.suggestion}` : ''}`)
        return
      }

      const data = await response.json()
      setGeneratedImage(data.imageUrl)
      toast.success(`🎨 Image generated with ${data.modelUsed}! Check text/details carefully - regenerate with Precision mode if needed.`)
    } catch (error) {
      console.error('Error generating image:', error)
      toast.error('Failed to generate image with gpt-image-1. Check console for details.')
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
            <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-400/30 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                <span className="text-orange-300 font-medium text-sm">BETA</span>
              </div>
              <p className="text-orange-200/80 text-xs mt-1">May struggle with small text & fine details</p>
            </div>
          </div>
        </div>

        {/* Upload Section - Compact Top Bar */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] shadow-xl">
          <div className="p-4">
            <div className="flex items-center gap-6">
              {/* Upload Area */}
              <div className="flex items-center gap-4">
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
              
              {/* Status/Result Info */}
              <div className="flex-1 flex justify-end">
                {generatedImage && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#333]">
                      <img src={generatedImage} alt="Generated" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-300">Generation Complete!</p>
                      <div className="flex gap-2 mt-1">
                        <Button 
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = generatedImage
                            link.download = 'generated-product-image.png'
                            link.click()
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white border-0 text-xs px-3 py-1"
                        >
                          Download
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline" 
                          className="bg-[#2A2A2A] border-[#444] text-white hover:bg-[#333] hover:text-white text-xs px-3 py-1"
                          onClick={() => setGeneratedImage('')}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {isGenerating && (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-blue-300">Generating Creative...</p>
                      <p className="text-xs text-blue-400/80">This may take 30-60 seconds</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Background Style Carousel Widget */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] shadow-xl">
          <div className="p-6 border-b border-[#333]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Background Styles</h2>
                  <p className="text-gray-400 mt-1">
                    Choose a background style for your product - Use arrows to browse options
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {currentStyleIndex + 1} of {STYLE_OPTIONS.length}
              </div>
            </div>
          </div>
          
          {/* Carousel Content */}
          <div className="p-8">
            <div className="relative">
              {/* Main Style Display */}
              <div className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden">
                {/* Large Preview with Navigation */}
                <div className="relative">
                  <div className="aspect-[4/3] bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center overflow-hidden relative">
                    <img
                      src={currentStyle.thumbnail}
                      alt={currentStyle.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Navigation Arrows */}
                    <button
                      onClick={prevStyle}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 hover:bg-black/80 border border-white/20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    
                    <button
                      onClick={nextStyle}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 hover:bg-black/80 border border-white/20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    >
                      <ChevronRight className="w-6 h-6 text-white" />
                    </button>

                    {/* Style Indicator Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {STYLE_OPTIONS.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentStyleIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            index === currentStyleIndex 
                              ? 'bg-white scale-125' 
                              : 'bg-white/40 hover:bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Style Info & Actions */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-white text-2xl mb-2">
                          {currentStyle.name}
                        </h3>
                        <p className="text-gray-400 leading-relaxed">
                          {currentStyle.description}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mb-4">
                      <Button 
                        disabled={!uploadedImage || isGenerating}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-8 py-3 text-lg font-semibold flex-1"
                        onClick={() => generateImage(currentStyle)}
                      >
                        {isGenerating && selectedStyle?.id === currentStyle.id ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Apply This Style
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        className="bg-[#2A2A2A] border-[#444] text-white hover:bg-[#333] hover:text-white px-6"
                        onClick={() => setShowMoreInfo(!showMoreInfo)}
                      >
                        <Info className="w-4 h-4 mr-2" />
                        More Info
                      </Button>
                    </div>

                    {/* Expandable More Info Section */}
                    {showMoreInfo && (
                      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#1f1f1f] border border-[#333] rounded-lg p-4 mt-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              What you'll get:
                            </h4>
                            <p className="text-gray-300 text-sm">
                              Your product with a {currentStyle.name.toLowerCase()} background, perfectly positioned with space for text overlays
                            </p>
                          </div>

                          <div>
                            <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              Add Custom Text (Coming Soon):
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-gray-400 text-xs block mb-1">Top Text</label>
                                <input
                                  type="text"
                                  placeholder="e.g., SALE"
                                  value={customText.top}
                                  onChange={(e) => setCustomText(prev => ({ ...prev, top: e.target.value }))}
                                  className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-white text-sm"
                                  disabled
                                />
                              </div>
                              <div>
                                <label className="text-gray-400 text-xs block mb-1">Bottom Text</label>
                                <input
                                  type="text"
                                  placeholder="e.g., 10% OFF"
                                  value={customText.bottom}
                                  onChange={(e) => setCustomText(prev => ({ ...prev, bottom: e.target.value }))}
                                  className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-white text-sm"
                                  disabled
                                />
                              </div>
                            </div>
                            <p className="text-gray-500 text-xs mt-2">
                              Text overlay feature will be available in a future update
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}