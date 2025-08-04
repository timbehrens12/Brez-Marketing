"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Palette, 
  Upload, 
  Image as ImageIcon, 
  Download, 
  Settings, 
  Sparkles,
  Camera,
  Zap,
  RefreshCw
} from 'lucide-react'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

interface BackgroundPreset {
  id: string;
  name: string;
  preview: string;
  description: string;
  example: string;
}

interface GenerationParams {
  aspectRatio: string;
  quality: string;
  lighting: string;
  customPromptModifiers: string;
}

const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'concrete',
    name: 'Concrete Floor',
    description: 'Industrial concrete surface with natural texture and subtle cracks',
    preview: '/images/bg-preview-concrete.jpg',
    example: 'Perfect for streetwear, urban brands, and modern products'
  },
  {
    id: 'marble',
    name: 'Marble Surface',
    description: 'Elegant white marble with subtle gray veining',
    preview: '/images/bg-preview-marble.jpg',
    example: 'Ideal for luxury products, jewelry, and premium items'
  },
  {
    id: 'wood',
    name: 'Wooden Surface',
    description: 'Natural wood grain with warm brown tones',
    preview: '/images/bg-preview-wood.jpg',
    example: 'Great for artisanal products, crafts, and natural brands'
  },
  {
    id: 'minimalist',
    name: 'Minimalist White',
    description: 'Clean white seamless background',
    preview: '/images/bg-preview-white.jpg',
    example: 'Classic choice for e-commerce and product catalogs'
  },
  {
    id: 'fabric',
    name: 'Linen Fabric',
    description: 'Soft natural linen with subtle texture',
    preview: '/images/bg-preview-fabric.jpg',
    example: 'Perfect for fashion, textiles, and soft goods'
  }
];

export default function AdCreativeStudioPage() {
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<'idle' | 'analyzing' | 'generating'>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [selectedBackground, setSelectedBackground] = useState<string>('')
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [generationHistory, setGenerationHistory] = useState<any[]>([])
  
  const [params, setParams] = useState<GenerationParams>({
    aspectRatio: 'square',
    quality: 'hd',
    lighting: 'soft',
    customPromptModifiers: ''
  })

  const { agencySettings } = useAgency()
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFileSelect = (file: File) => {
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    
    setSelectedFile(file)
    
    // Create preview URL
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleGenerate = async () => {
    if (!selectedFile) {
      toast.error('Please upload a product image')
      return
    }
    
    if (!selectedBackground) {
      toast.error('Please select a background style')
      return
    }

    setIsGenerating(true)
    setGenerationStep('analyzing')
    
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('backgroundType', selectedBackground)
      formData.append('aspectRatio', params.aspectRatio)
      formData.append('quality', params.quality)
      formData.append('lighting', params.lighting)
      formData.append('customPromptModifiers', params.customPromptModifiers)

      toast.info('Analyzing your product image...')
      
      // Add a small delay to show analyzing step
      setTimeout(() => {
        setGenerationStep('generating')
        toast.info('Generating professional photo...')
      }, 2000)

      const response = await fetch('/api/ai/generate-creative', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate image')
      }

      setGeneratedImage(result.imageUrl)
      
      // Add to history
      const newGeneration = {
        id: Date.now(),
        imageUrl: result.imageUrl,
        backgroundType: selectedBackground,
        originalFileName: selectedFile.name,
        productDescription: result.productDescription,
        params: { ...params },
        timestamp: new Date().toISOString()
      }
      setGenerationHistory(prev => [newGeneration, ...prev.slice(0, 9)]) // Keep last 10

      toast.success('Professional product photo generated!')
      
    } catch (error: any) {
      console.error('Generation error:', error)
      toast.error(error.message || 'Failed to generate image')
    } finally {
      setIsGenerating(false)
      setGenerationStep('idle')
    }
  }

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `product-photo-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Image downloaded!')
    } catch (error) {
      toast.error('Failed to download image')
    }
  }

  if (isLoadingPage) {
    const loadingConfig = getPageLoadingConfig(pathname)
    return (
      <UnifiedLoading
        variant="page"
        size="lg"
        message="Loading Creative Studio"
        subMessage="Setting up your creative workspace"
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Camera className="h-8 w-8 text-purple-400" />
        <div>
          <h1 className="text-3xl font-bold text-white">Product Photography Studio</h1>
          <p className="text-gray-400">AI-powered professional product photography</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Product Image Upload */}
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-400" />
                Product Image
              </CardTitle>
              <CardDescription className="text-gray-400">
                Upload your product image
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="image-upload" className="text-gray-300">Select Image</Label>
                <div className="mt-2">
                  {!selectedFile ? (
                    <div
                      className="border-2 border-dashed border-[#444] rounded-lg p-8 text-center cursor-pointer hover:border-[#555] transition-colors"
                      onClick={() => document.getElementById('file-input')?.click()}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-white font-medium mb-2">Click to upload or drag and drop</p>
                      <p className="text-gray-400 text-sm">PNG, JPG, JPEG up to 10MB</p>
                      <input
                        id="file-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileSelect(file)
                        }}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Product preview"
                        className="w-full max-h-48 object-contain rounded-lg bg-white"
                      />
                      <div className="absolute top-2 right-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null)
                            setPreviewUrl('')
                            if (previewUrl) URL.revokeObjectURL(previewUrl)
                          }}
                          className="h-8 w-8 p-0"
                        >
                          ×
                        </Button>
                      </div>
                      <div className="mt-2 p-2 bg-[#2A2A2A] rounded text-sm text-gray-300">
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Background Selection */}
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-400" />
                Background Style
              </CardTitle>
              <CardDescription className="text-gray-400">
                Choose your background aesthetic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {BACKGROUND_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedBackground === preset.id
                        ? 'border-purple-400 bg-purple-400/10'
                        : 'border-[#444] hover:border-[#555]'
                    }`}
                    onClick={() => setSelectedBackground(preset.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-[#2A2A2A] rounded border border-[#444] flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{preset.name}</h4>
                        <p className="text-gray-400 text-sm">{preset.description}</p>
                        <p className="text-gray-500 text-xs mt-1">{preset.example}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-green-400" />
                Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Aspect Ratio</Label>
                <Select value={params.aspectRatio} onValueChange={(value) => setParams(prev => ({ ...prev, aspectRatio: value }))}>
                  <SelectTrigger className="mt-2 bg-[#2A2A2A] border-[#444] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Square (1:1)</SelectItem>
                    <SelectItem value="landscape">Landscape (3:2)</SelectItem>
                    <SelectItem value="portrait">Portrait (2:3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Quality</Label>
                <Select value={params.quality} onValueChange={(value) => setParams(prev => ({ ...prev, quality: value }))}>
                  <SelectTrigger className="mt-2 bg-[#2A2A2A] border-[#444] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hd">High Definition</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Lighting</Label>
                <Select value={params.lighting} onValueChange={(value) => setParams(prev => ({ ...prev, lighting: value }))}>
                  <SelectTrigger className="mt-2 bg-[#2A2A2A] border-[#444] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soft">Soft Lighting</SelectItem>
                    <SelectItem value="dramatic">Dramatic Lighting</SelectItem>
                    <SelectItem value="bright">Bright Lighting</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Custom Modifiers</Label>
                <Input
                  placeholder="e.g., vintage filter, high contrast..."
                  value={params.customPromptModifiers}
                  onChange={(e) => setParams(prev => ({ ...prev, customPromptModifiers: e.target.value }))}
                  className="mt-2 bg-[#2A2A2A] border-[#444] text-white"
                />
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={isGenerating || !selectedFile || !selectedBackground}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {generationStep === 'analyzing' ? 'Analyzing Image...' : 'Generating Photo...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Photo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Generation */}
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  Generated Photo
                </span>
                {generatedImage && (
                  <Button
                    onClick={() => handleDownload(generatedImage)}
                    variant="outline"
                    size="sm"
                    className="border-[#444] text-gray-300 hover:bg-[#2A2A2A]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedImage ? (
                <div className="relative">
                  <img
                    src={generatedImage}
                    alt="Generated product photo"
                    className="w-full rounded-lg shadow-2xl"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-green-600 text-white">
                      Latest Generation
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-[#2A2A2A] rounded-lg border-2 border-dashed border-[#444] flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Your generated photo will appear here</p>
                    <p className="text-gray-500 text-sm">Upload your product image and select a background to start</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generation History */}
          {generationHistory.length > 0 && (
            <Card className="bg-[#1A1A1A] border-[#333]">
              <CardHeader>
                <CardTitle className="text-white">Recent Generations</CardTitle>
                <CardDescription className="text-gray-400">
                  Your latest product photos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {generationHistory.map((generation) => (
                    <div
                      key={generation.id}
                      className="relative group cursor-pointer"
                      onClick={() => setGeneratedImage(generation.imageUrl)}
                    >
                      <img
                        src={generation.imageUrl}
                        alt="Generated product"
                        className="w-full aspect-square object-cover rounded-lg transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(generation.imageUrl)
                          }}
                          className="bg-white/20 backdrop-blur-sm hover:bg-white/30"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-black/70 text-white text-xs">
                          {BACKGROUND_PRESETS.find(p => p.id === generation.backgroundType)?.name}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 