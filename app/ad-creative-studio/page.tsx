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
    prompt: 'TECHNICAL BACKGROUND SWAP: Cut out this exact product and place on concrete. ZERO modifications to product. Preserve every pixel of text, graphics, distressing. Simple background replacement only.'
  },
  {
    id: 'concrete',
    name: 'Concrete Background (Standard)',
    description: 'Industrial concrete surface with natural texture and realistic shadows',
    thumbnail: '/placeholder.jpg', // Using existing placeholder for now
    prompt: 'BACKGROUND REPLACEMENT ONLY: Replace ONLY the background with concrete while keeping the product 100% unchanged. This is NOT a creative edit - this is precise background replacement. PRESERVE EXACTLY: All text (PROJECT, CAPRI, 24, small bottom text), all background graphics/patterns on the shirt, all design elements, all colors, all fine details, all distressing effects, all texture. DO NOT modify, reinterpret, enhance, or alter ANY aspect of the product design. The product must remain pixel-perfect identical to the original. ONLY change: Replace the white background with realistic concrete floor texture. CRITICAL PRESERVATION REQUIREMENTS: 1) All text must be identical character-by-character 2) All graphic elements must be preserved exactly 3) All distressed/vintage effects must remain unchanged 4) All small design details must be maintained 5) Color accuracy must be perfect 6) No artistic interpretation of the design. This is a technical background swap, not creative enhancement. Place the unchanged product on concrete surface with natural lighting and realistic shadows.'
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Upload Section - Smaller */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] shadow-xl h-fit">
              <div className="p-6 border-b border-[#333]">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-white" />
                  <h2 className="text-lg font-semibold text-white">Upload</h2>
                </div>
                <p className="text-gray-400 mt-1 text-sm">
                  Upload your product image
                </p>
              </div>
              <div className="p-4">
                <div 
                  className="border-2 border-dashed border-[#444] rounded-xl p-6 text-center hover:border-[#555] transition-all duration-300 cursor-pointer bg-gradient-to-br from-white/[0.02] to-white/[0.05]"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {uploadedImageUrl ? (
                    <div className="space-y-3">
                      <img 
                        src={uploadedImageUrl} 
                        alt="Uploaded product" 
                        className="max-w-full max-h-32 mx-auto rounded-lg shadow-lg border border-[#333]"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-[#2A2A2A] border-[#444] text-white hover:bg-[#333] hover:text-white w-full"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-white">Drop image here</p>
                        <p className="text-xs text-gray-400 mt-1">PNG/JPG • Up to 10MB</p>
                      </div>
                    </div>
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
            </div>
          </div>

          {/* Style Gallery & Results - Bigger */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Style Gallery */}
              <div>
                <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] shadow-xl">
                  <div className="p-6 border-b border-[#333]">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-white" />
                      <h2 className="text-xl font-semibold text-white">Style Gallery</h2>
                    </div>
                    <p className="text-gray-400 mt-2">
                      Choose from our collection of AI-powered background styles
                    </p>
                  </div>
                  <div className="p-6">
                    <div className="grid gap-4">
                      {STYLE_OPTIONS.map((style) => (
                        <div
                          key={style.id}
                          className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-lg p-4 hover:border-[#555] hover:shadow-lg transition-all duration-300 cursor-pointer group"
                          onClick={() => generateImage(style)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#333] to-[#222] border border-[#444] flex items-center justify-center overflow-hidden">
                              <img
                                src={style.thumbnail}
                                alt={style.name}
                                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors text-lg">{style.name}</h3>
                              <p className="text-sm text-gray-400 mt-2 leading-relaxed">{style.description}</p>
                            </div>
                            <Button 
                              disabled={!uploadedImage || isGenerating}
                              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white border-0 px-6"
                            >
                              {isGenerating && selectedStyle?.id === style.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                'Apply Style'
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Section */}
              <div>
                <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] shadow-xl">
                  <div className="p-6 border-b border-[#333]">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-5 h-5 text-white" />
                      <h2 className="text-xl font-semibold text-white">Generated Result</h2>
                    </div>
                    <p className="text-gray-400 mt-2">
                      Your AI-generated product image will appear here
                    </p>
                  </div>
                  <div className="p-6">
                    {generatedImage ? (
                      <div className="space-y-6">
                        <div className="relative">
                          <img
                            src={generatedImage}
                            alt="Generated product image"
                            className="w-full rounded-lg shadow-2xl border border-[#333]"
                          />
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                        </div>
                        <div className="space-y-3">
                          <Button 
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = generatedImage
                              link.download = 'generated-product-image.png'
                              link.click()
                            }}
                            className="w-full bg-green-600 hover:bg-green-700 text-white border-0 py-3"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Download Image
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full bg-[#2A2A2A] border-[#444] text-white hover:bg-[#333] hover:text-white py-3"
                            onClick={() => setGeneratedImage('')}
                          >
                            Generate Another
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#333] to-[#222] rounded-xl flex items-center justify-center border border-[#444]">
                          <ImageIcon className="w-12 h-12 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-medium text-white mb-3">Ready to Create</h3>
                        <p className="text-gray-400 max-w-sm mx-auto leading-relaxed mb-4">
                          Upload your product image and select a style to generate stunning AI-powered backgrounds
                        </p>
                        {isGenerating && (
                          <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/20 rounded-lg">
                            <div className="flex items-center justify-center gap-3 mb-2">
                              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                              <span className="text-blue-400 font-semibold">Generating Creative</span>
                            </div>
                            <p className="text-blue-300/80 text-sm">This may take 30-60 seconds...</p>
                          </div>
                        )}
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