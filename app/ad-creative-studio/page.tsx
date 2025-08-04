"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react'
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
    id: 'concrete-precision',
    name: 'Concrete Background (Precision)',
    description: 'Maximum detail preservation - for designs with fine text/graphics',
    thumbnail: '/placeholder.jpg',
    prompt: 'BACKGROUND REPLACEMENT ONLY: Extract the exact product from the image and place it on a concrete background. DO NOT add, remove, or modify ANY aspect of the product itself. Keep the product 100% identical to the original - same colors, same design, same everything. Only replace the background with concrete texture. This is a technical background swap, not creative enhancement.'
  },
  {
    id: 'concrete',
    name: 'Concrete Background (Standard)',
    description: 'Industrial concrete surface with natural texture and realistic shadows',
    thumbnail: '/placeholder.jpg',
    prompt: 'BACKGROUND REPLACEMENT ONLY: Replace the background with concrete while keeping the product completely unchanged. DO NOT add any text, graphics, designs, or modifications to the product. Keep the original product exactly as it appears in the uploaded image. Only change the background to concrete floor texture with realistic lighting and shadows. This is purely a background swap - do not enhance, modify, or add anything to the product itself.'
  },
  {
    id: 'wooden-floor',
    name: 'Wooden Floor',
    description: 'Warm wooden flooring with natural grain and lighting',
    thumbnail: '/placeholder.jpg',
    prompt: 'BACKGROUND REPLACEMENT ONLY: Replace the background with wooden floor while keeping the product completely unchanged. DO NOT add any text, graphics, designs, or modifications to the product. Keep the original product exactly as it appears in the uploaded image. Only change the background to wooden floor with natural lighting and shadows.'
  },
  {
    id: 'marble-surface',
    name: 'Marble Surface',
    description: 'Elegant marble surface with luxury appeal',
    thumbnail: '/placeholder.jpg',
    prompt: 'BACKGROUND REPLACEMENT ONLY: Replace the background with marble surface while keeping the product completely unchanged. DO NOT add any text, graphics, designs, or modifications to the product. Keep the original product exactly as it appears in the uploaded image. Only change the background to marble surface with elegant lighting.'
  },
  {
    id: 'studio-white',
    name: 'Studio White',
    description: 'Clean studio white background for professional product shots',
    thumbnail: '/placeholder.jpg',
    prompt: 'BACKGROUND REPLACEMENT ONLY: Replace the background with clean studio white while keeping the product completely unchanged. DO NOT add any text, graphics, designs, or modifications to the product. Keep the original product exactly as it appears in the uploaded image. Only change the background to pure white studio background with professional lighting.'
  },
  {
    id: 'outdoor-setting',
    name: 'Outdoor Setting',
    description: 'Natural outdoor environment with soft lighting',
    thumbnail: '/placeholder.jpg',
    prompt: 'BACKGROUND REPLACEMENT ONLY: Replace the background with natural outdoor setting while keeping the product completely unchanged. DO NOT add any text, graphics, designs, or modifications to the product. Keep the original product exactly as it appears in the uploaded image. Only change the background to outdoor environment with natural lighting.'
  }
]

export default function AdCreativeStudioPage() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(true)

  // Simulate loading for the page
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

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

        {/* Massive Style Gallery */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] shadow-xl">
          <div className="p-6 border-b border-[#333]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Style Gallery</h2>
                  <p className="text-gray-400 mt-1">
                    Choose from our collection of AI-powered background styles - Click any style to apply it to your product
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {STYLE_OPTIONS.length} styles available
              </div>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {STYLE_OPTIONS.map((style) => (
                <div
                  key={style.id}
                  className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden hover:border-[#555] hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                  onClick={() => generateImage(style)}
                >
                  {/* Large Preview Image */}
                  <div className="aspect-square bg-gradient-to-br from-[#333] to-[#222] border-b border-[#333] flex items-center justify-center overflow-hidden relative">
                    <img
                      src={style.thumbnail}
                      alt={style.name}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105"
                    />
                    {/* Overlay with apply button */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Button 
                        disabled={!uploadedImage || isGenerating}
                        className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-8 py-3 text-lg font-semibold shadow-xl"
                        onClick={(e) => {
                          e.stopPropagation()
                          generateImage(style)
                        }}
                      >
                        {isGenerating && selectedStyle?.id === style.id ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          'Apply This Style'
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Style Info */}
                  <div className="p-6">
                    <h3 className="font-bold text-white text-xl mb-2 group-hover:text-blue-300 transition-colors">
                      {style.name}
                    </h3>
                    <p className="text-gray-400 leading-relaxed text-sm">
                      {style.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}