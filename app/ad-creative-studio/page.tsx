"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { 
  Palette, 
  Upload, 
  Sparkles, 
  Image as ImageIcon, 
  Wand2, 
  Download, 
  Shuffle, 
  Copy, 
  Heart, 
  Settings, 
  Zap,
  Grid3X3,
  Crop,
  Lightbulb,
  Target,
  Camera,
  Layers,
  Sliders,
  Save,
  Share2,
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { usePathname } from "next/navigation"
import { useBrandContext } from "@/lib/context/BrandContext"
import BrandSelector from "@/components/BrandSelector"

const STYLE_PRESETS = [
  { id: 'photorealistic', name: 'Photorealistic', description: 'Natural, photo-like images' },
  { id: 'digital-art', name: 'Digital Art', description: 'Modern digital artwork style' },
  { id: 'minimalist', name: 'Minimalist', description: 'Clean, simple design' },
  { id: 'luxury', name: 'Luxury', description: 'Premium, high-end aesthetic' },
  { id: 'vintage', name: 'Vintage', description: 'Retro, classic styling' },
  { id: 'bold-modern', name: 'Bold Modern', description: 'Strong, contemporary design' },
  { id: 'organic', name: 'Organic', description: 'Natural, flowing elements' },
  { id: 'tech', name: 'Tech/Future', description: 'Futuristic, technology-focused' }
]

const AD_TEMPLATES = [
  { id: 'product-showcase', name: 'Product Showcase', description: 'Feature your product prominently', icon: Camera },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Show product in real-life context', icon: Heart },
  { id: 'comparison', name: 'Comparison', description: 'Before/after or feature comparison', icon: Grid3X3 },
  { id: 'testimonial', name: 'Testimonial', description: 'Customer review focused design', icon: Target },
  { id: 'seasonal', name: 'Seasonal', description: 'Holiday or seasonal themes', icon: Sparkles },
  { id: 'educational', name: 'Educational', description: 'How-to or informational content', icon: Lightbulb }
]

const ASPECT_RATIOS = [
  { id: 'square', name: 'Square (1:1)', description: 'Instagram posts, Facebook' },
  { id: 'story', name: 'Story (9:16)', description: 'Instagram/Facebook Stories' },
  { id: 'landscape', name: 'Landscape (16:9)', description: 'YouTube, Facebook cover' },
  { id: 'portrait', name: 'Portrait (4:5)', description: 'Instagram feed optimized' },
  { id: 'banner', name: 'Banner (3:1)', description: 'Website banners, covers' }
]

const INSPIRATION_GALLERY = [
  { id: 1, url: '/api/placeholder/300/200', title: 'Minimalist Product', category: 'Product' },
  { id: 2, url: '/api/placeholder/300/200', title: 'Lifestyle Scene', category: 'Lifestyle' },
  { id: 3, url: '/api/placeholder/300/200', title: 'Bold Typography', category: 'Typography' },
  { id: 4, url: '/api/placeholder/300/200', title: 'Luxury Brand', category: 'Luxury' },
  { id: 5, url: '/api/placeholder/300/200', title: 'Tech Innovation', category: 'Tech' },
  { id: 6, url: '/api/placeholder/300/200', title: 'Organic Natural', category: 'Natural' }
]

export default function AdCreativeStudioPage() {
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [activeTab, setActiveTab] = useState('create')
  const [prompt, setPrompt] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('photorealistic')
  const [selectedTemplate, setSelectedTemplate] = useState('product-showcase')
  const [selectedRatio, setSelectedRatio] = useState('square')
  const [creativity, setCreativity] = useState([7])
  const [quality, setQuality] = useState([8])
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [inspirationImages, setInspirationImages] = useState<string[]>([])
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [brandConsistency, setBrandConsistency] = useState(true)
  const [includeText, setIncludeText] = useState(false)
  const [adCopy, setAdCopy] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [colorScheme, setColorScheme] = useState('')

  const { agencySettings } = useAgency()
  const { selectedBrandId, setSelectedBrandId } = useBrandContext()
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedImages(prev => [...prev, ...files])
  }

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const addInspirationImage = (imageUrl: string) => {
    if (!inspirationImages.includes(imageUrl)) {
      setInspirationImages(prev => [...prev, imageUrl])
    }
  }

  const removeInspirationImage = (imageUrl: string) => {
    setInspirationImages(prev => prev.filter(img => img !== imageUrl))
  }

  const handleBrandSelect = (brandId: string) => {
    setSelectedBrandId(brandId)
  }

  const handleGenerate = async () => {
    if (!selectedBrandId) {
      return
    }
    
    setIsGenerating(true)
    // TODO: Replace with actual API call that includes brandId
    // const response = await fetch('/api/ai/generate-creative', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     brandId: selectedBrandId,
    //     prompt,
    //     style: selectedStyle,
    //     template: selectedTemplate,
    //     aspectRatio: selectedRatio,
    //     creativity: creativity[0],
    //     quality: quality[0],
    //     includeText,
    //     adCopy,
    //     targetAudience,
    //     colorScheme
    //   })
    // })
    
    // Simulate generation for now
    setTimeout(() => {
      const mockImages = Array.from({ length: 4 }, (_, i) => 
        `/api/placeholder/400/400?${Date.now()}-${i}`
      )
      setGeneratedImages(mockImages)
      setIsGenerating(false)
    }, 3000)
  }

  if (isLoadingPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#2A2A2A] border border-[#333] rounded-xl flex items-center justify-center mx-auto mb-6">
            <div className="absolute left-0 inset-y-2 w-1 bg-white rounded-full"></div>
            {agencySettings.agency_logo_url ? (
              <img 
                src={agencySettings.agency_logo_url} 
                alt={`${agencySettings.agency_name} Logo`} 
                className="w-12 h-12 object-contain rounded" 
              />
            ) : (
              <Palette className="h-12 w-12 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Ad Creative Studio</h1>
          <p className="text-gray-400 mb-4">Setting up your creative workspace</p>
          <div className="text-xs text-gray-500 italic">
            Building your personalized creative generation dashboard...
          </div>
        </div>
      </div>
    )
  }

  // No brand selected state
  if (!selectedBrandId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Palette className="h-8 w-8 text-white" />
              <div>
                <h1 className="text-3xl font-bold text-white">Ad Creative Studio</h1>
                <p className="text-gray-400">AI-powered creative generation for your campaigns</p>
              </div>
            </div>
          </div>

          {/* Brand Selection Required */}
          <Card className="bg-[#1A1A1A] border-[#333] max-w-2xl mx-auto">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-[#2A2A2A] border border-[#333] rounded-xl flex items-center justify-center mx-auto mb-6">
                <Palette className="h-10 w-10 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Select a Brand</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Choose a brand to start creating AI-powered ad creatives. All generated content will be saved to your selected brand's profile for easy organization and access.
              </p>
              <div className="max-w-sm mx-auto">
                <BrandSelector 
                  onSelect={handleBrandSelect}
                  selectedBrandId={selectedBrandId}
                  className="w-full"
                  isVisible={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Palette className="h-8 w-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">Ad Creative Studio</h1>
              <p className="text-gray-400">AI-powered creative generation for your campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="max-w-xs">
              <BrandSelector 
                onSelect={handleBrandSelect}
                selectedBrandId={selectedBrandId}
                className="w-full"
                isVisible={true}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                <Save className="h-4 w-4 mr-2" />
                Save Project
              </Button>
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#1A1A1A] border border-gray-700">
          <TabsTrigger value="create" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-gray-200 data-[state=active]:text-black">
            <Wand2 className="h-4 w-4 mr-2" />
            Create
          </TabsTrigger>
          <TabsTrigger value="inspiration" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-gray-200 data-[state=active]:text-black">
            <Lightbulb className="h-4 w-4 mr-2" />
            Inspiration
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-gray-200 data-[state=active]:text-black">
            <ImageIcon className="h-4 w-4 mr-2" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Inputs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Prompt Section */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                                 <CardHeader>
                   <CardTitle className="text-white flex items-center gap-2">
                     <Sparkles className="h-5 w-5 text-gray-400" />
                     Creative Prompt
                   </CardTitle>
                  <CardDescription className="text-gray-400">
                    Describe your vision in detail for the best results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Main Prompt</Label>
                    <Textarea
                      placeholder="Describe your ad creative... (e.g., 'A modern smartphone on a clean white background with soft lighting, professional product photography style')"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="bg-[#0F0F0F] border-gray-700 text-white placeholder-gray-500 min-h-[100px]"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Target Audience</Label>
                      <Input
                        placeholder="e.g., Young professionals, Tech enthusiasts"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className="bg-[#0F0F0F] border-gray-700 text-white placeholder-gray-500"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Color Scheme</Label>
                      <Input
                        placeholder="e.g., Blue and white, Warm earth tones"
                        value={colorScheme}
                        onChange={(e) => setColorScheme(e.target.value)}
                        className="bg-[#0F0F0F] border-gray-700 text-white placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-text"
                      checked={includeText}
                      onCheckedChange={setIncludeText}
                    />
                    <Label htmlFor="include-text" className="text-gray-300">Include text overlay</Label>
                  </div>

                  {includeText && (
                    <div>
                      <Label className="text-gray-300">Ad Copy</Label>
                      <Textarea
                        placeholder="Enter the text you want to appear on the image..."
                        value={adCopy}
                        onChange={(e) => setAdCopy(e.target.value)}
                        className="bg-[#0F0F0F] border-gray-700 text-white placeholder-gray-500"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upload Section */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                                 <CardHeader>
                   <CardTitle className="text-white flex items-center gap-2">
                     <Upload className="h-5 w-5 text-gray-400" />
                     Reference Images
                   </CardTitle>
                  <CardDescription className="text-gray-400">
                    Upload product images or reference materials
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                      <input
                        type="file"
                        id="image-upload"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-300">Click to upload images</p>
                        <p className="text-gray-500 text-sm">PNG, JPG up to 10MB each</p>
                      </label>
                    </div>

                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {uploadedImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-20 object-cover rounded border border-gray-600"
                            />
                            <button
                              onClick={() => removeUploadedImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Settings */}
              <Card className="bg-[#1A1A1A] border-[#333]">
                <CardHeader>
                  <CardTitle 
                    className="text-white flex items-center gap-2 cursor-pointer"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <Settings className="h-5 w-5 text-gray-400" />
                    Advanced Settings
                    {showAdvanced ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
                    )}
                  </CardTitle>
                </CardHeader>
                {showAdvanced && (
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-300 mb-2 block">
                          Creativity Level: {creativity[0]}
                        </Label>
                        <Slider
                          value={creativity}
                          onValueChange={setCreativity}
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Conservative</span>
                          <span>Creative</span>
                          <span>Wild</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-gray-300 mb-2 block">
                          Quality Level: {quality[0]}
                        </Label>
                        <Slider
                          value={quality}
                          onValueChange={setQuality}
                          max={10}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Draft</span>
                          <span>Standard</span>
                          <span>Premium</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="brand-consistency"
                          checked={brandConsistency}
                          onCheckedChange={setBrandConsistency}
                        />
                        <Label htmlFor="brand-consistency" className="text-gray-300">
                          Maintain brand consistency
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>

            {/* Right Column - Controls & Preview */}
            <div className="space-y-6">
              {/* Templates */}
                             <Card className="bg-[#1A1A1A] border-[#333]">
                 <CardHeader>
                   <CardTitle className="text-white flex items-center gap-2">
                     <Layers className="h-5 w-5 text-gray-400" />
                     Ad Templates
                   </CardTitle>
                 </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-2">
                    {AD_TEMPLATES.map((template) => {
                      const IconComponent = template.icon
                      return (
                        <button
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                                                     className={`p-3 rounded-lg border text-left transition-all ${
                             selectedTemplate === template.id
                               ? 'border-white bg-white/10'
                               : 'border-gray-600 hover:border-gray-500'
                           }`}
                        >
                                                     <div className="flex items-center gap-2">
                             <IconComponent className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-white text-sm font-medium">
                                {template.name}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {template.description}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Style Presets */}
                             <Card className="bg-[#1A1A1A] border-[#333]">
                 <CardHeader>
                   <CardTitle className="text-white flex items-center gap-2">
                     <Palette className="h-5 w-5 text-gray-400" />
                     Style Presets
                   </CardTitle>
                 </CardHeader>
                <CardContent>
                  <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                    <SelectTrigger className="bg-[#0F0F0F] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-gray-700">
                      {STYLE_PRESETS.map((style) => (
                        <SelectItem key={style.id} value={style.id} className="text-white">
                          <div>
                            <div className="font-medium">{style.name}</div>
                            <div className="text-xs text-gray-400">{style.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Aspect Ratio */}
                             <Card className="bg-[#1A1A1A] border-[#333]">
                 <CardHeader>
                   <CardTitle className="text-white flex items-center gap-2">
                     <Crop className="h-5 w-5 text-gray-400" />
                     Aspect Ratio
                   </CardTitle>
                 </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => setSelectedRatio(ratio.id)}
                                                 className={`w-full p-2 rounded text-left transition-all ${
                           selectedRatio === ratio.id
                             ? 'bg-white/20 border border-white'
                             : 'hover:bg-gray-800 border border-transparent'
                         }`}
                      >
                        <div className="text-white text-sm font-medium">{ratio.name}</div>
                        <div className="text-gray-400 text-xs">{ratio.description}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Generation Button */}
                             <Button 
                 onClick={handleGenerate}
                 disabled={!prompt.trim() || isGenerating || !selectedBrandId}
                 className="w-full bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
               >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5 mr-2" />
                    Generate Creative
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Inspiration Tab */}
        <TabsContent value="inspiration" className="space-y-6">
                     <Card className="bg-[#1A1A1A] border-[#333]">
             <CardHeader>
               <CardTitle className="text-white flex items-center gap-2">
                 <Lightbulb className="h-5 w-5 text-gray-400" />
                 Inspiration Gallery
               </CardTitle>
              <CardDescription className="text-gray-400">
                Browse and select inspiration images to guide your creative generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {INSPIRATION_GALLERY.map((item) => (
                  <div key={item.id} className="group relative">
                    <div className="aspect-[4/3] bg-gray-800 rounded-lg overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                 <Button
                           onClick={() => addInspirationImage(item.url)}
                           size="sm"
                           className="bg-white hover:bg-gray-100 text-black"
                         >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to References
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <h3 className="text-white text-sm font-medium">{item.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {inspirationImages.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-white font-medium mb-3">Selected References</h3>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {inspirationImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                                                 <img
                           src={imageUrl}
                           alt={`Reference ${index + 1}`}
                           className="w-full aspect-square object-cover rounded border border-white"
                         />
                        <button
                          onClick={() => removeInspirationImage(imageUrl)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
                     <Card className="bg-[#1A1A1A] border-[#333]">
             <CardHeader>
               <CardTitle className="text-white flex items-center gap-2">
                 <ImageIcon className="h-5 w-5 text-gray-400" />
                 Generated Creatives
               </CardTitle>
              <CardDescription className="text-gray-400">
                Your AI-generated ad creatives are ready for download and use
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedImages.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">No creatives yet</h3>
                  <p className="text-gray-400 mb-4">Generate your first creative to see results here</p>
                                     <Button onClick={() => setActiveTab('create')} className="bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black">
                     <Wand2 className="h-4 w-4 mr-2" />
                     Start Creating
                   </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {generatedImages.map((imageUrl, index) => (
                    <div key={index} className="bg-[#0F0F0F] rounded-lg p-4">
                      <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden mb-4">
                        <img
                          src={imageUrl}
                          alt={`Generated creative ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-600">
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-600">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="border-gray-600">
                          <Shuffle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
                 </TabsContent>
       </Tabs>
      </div>
    </div>
  )
} 