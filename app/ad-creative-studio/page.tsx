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

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Ad Creative Studio</h1>
          <p className="text-gray-600">Upload your product image and transform it with AI-powered backgrounds</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Product Image
                </CardTitle>
                <CardDescription>
                  Upload the highest quality image possible (PNG recommended, 1MB+ for best results). For designs with fine text/graphics, use "Precision" mode.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {uploadedImageUrl ? (
                    <div className="space-y-4">
                      <img 
                        src={uploadedImageUrl} 
                        alt="Uploaded product" 
                        className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                      />
                      <Button variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <p className="text-lg font-medium">Click to upload an image</p>
                        <p className="text-sm text-gray-500">PNG preferred, JPG ok • Up to 10MB • Higher quality = better results</p>
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
              </CardContent>
            </Card>

            {/* Style Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Background Styles
                </CardTitle>
                <CardDescription>
                  Choose a background style for your product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {STYLE_OPTIONS.map((style) => (
                    <div
                      key={style.id}
                      className="border rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
                      onClick={() => generateImage(style)}
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={style.thumbnail}
                          alt={style.name}
                          className="w-16 h-16 rounded object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{style.name}</h3>
                          <p className="text-sm text-gray-600">{style.description}</p>
                        </div>
                        <Button 
                          disabled={!uploadedImage || isGenerating}
                          className="shrink-0"
                        >
                          {isGenerating && selectedStyle?.id === style.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating (30-60s)...
                            </>
                          ) : (
                            'Apply Style'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Generated Result</CardTitle>
                <CardDescription>
                  Your AI-generated product image will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedImage ? (
                  <div className="space-y-4">
                    <img
                      src={generatedImage}
                      alt="Generated product image"
                      className="w-full rounded-lg shadow-lg"
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = generatedImage
                          link.download = 'generated-product-image.png'
                          link.click()
                        }}
                        className="flex-1"
                      >
                        Download
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Generate Another
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Upload an image and select a style to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}