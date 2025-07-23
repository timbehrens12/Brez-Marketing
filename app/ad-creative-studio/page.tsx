"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { UnifiedLoading, getPageLoadingConfig } from "@/components/ui/unified-loading"
import { useAgency } from "@/contexts/AgencyContext"
import { useBrandContext } from "@/lib/context/BrandContext"
import { usePathname } from "next/navigation"
import { toast } from 'sonner'
import { 
  Palette, 
  Zap, 
  Sparkles, 
  Upload, 
  Image as ImageIcon,
  Loader2,
  Plus,
  Download,
  Copy,
  Eye,
  Trash2,
  Wand2,
  Layers,
  Brush,
  Target,
  Star,
  TrendingUp,
  Package,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  X
} from 'lucide-react'

interface CreativeAsset {
  id: string
  prompt: string
  image_url: string
  thumbnail_url: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  created_at: string
  generation_cost: number
  tokens_used: number
  style_preferences?: any
  product_image_url?: string
  inspiration_images?: string[]
}

export default function AdCreativeStudioPage() {
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [creativeAssets, setCreativeAssets] = useState<CreativeAsset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<CreativeAsset | null>(null)
  
  // Form states
  const [prompt, setPrompt] = useState('')
  const [productImage, setProductImage] = useState<File | null>(null)
  const [productImageUrl, setProductImageUrl] = useState('')
  const [inspirationImages, setInspirationImages] = useState<string[]>([])
  const [colorScheme, setColorScheme] = useState('vibrant')
  const [style, setStyle] = useState('modern')
  const [format, setFormat] = useState('square')
  const [audience, setAudience] = useState('general')
  const [includeText, setIncludeText] = useState(true)
  const [creativity, setCreativity] = useState([70])
  
  const { agencySettings } = useAgency()
  const { selectedBrandId, brands } = useBrandContext()
  const pathname = usePathname()

  const selectedBrand = brands.find(b => b.id === selectedBrandId)

  useEffect(() => {
    // Page loading simulation
    const timer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Load creative assets when brand changes
  useEffect(() => {
    if (selectedBrandId) {
      loadCreativeAssets()
    }
  }, [selectedBrandId])

  const loadCreativeAssets = async () => {
    if (!selectedBrandId) return
    
    setIsLoadingAssets(true)
    try {
      const response = await fetch(`/api/ai/generate-creative?brandId=${selectedBrandId}`)
      const data = await response.json()
      
      if (data.creatives) {
        setCreativeAssets(data.creatives.filter((asset: any) => asset != null))
      } else if (data.success && data.data) {
        // Fallback for old API format
        setCreativeAssets(data.data.filter((asset: any) => asset != null))
      } else {
        setCreativeAssets([])
      }
    } catch (error) {
      console.error('Error loading creative assets:', error)
      toast.error('Failed to load creative assets')
    } finally {
      setIsLoadingAssets(false)
    }
  }

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProductImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProductImageUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGenerateCreative = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt')
      return
    }

    if (!selectedBrandId) {
      toast.error('Please select a brand')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/ai/generate-creative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          brandId: selectedBrandId,
          productImageUrl,
          inspirationImages,
          stylePreferences: {
            colorScheme,
            style,
            format,
            audience,
            includeText,
            creativity: creativity[0]
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('Creative generated successfully!')
        setCreativeAssets(prev => [data.data, ...prev])
        // Clear form
        setPrompt('')
        setProductImage(null)
        setProductImageUrl('')
      } else {
        throw new Error(data.error || 'Failed to generate creative')
      }
    } catch (error: any) {
      console.error('Error generating creative:', error)
      toast.error(error.message || 'Failed to generate creative')
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Image downloaded!')
    } catch (error) {
      toast.error('Failed to download image')
    }
  }

  const copyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Image URL copied to clipboard!')
  }

  // Show loading state
  if (isLoadingPage) {
    const loadingConfig = getPageLoadingConfig(pathname)
    
    return (
      <UnifiedLoading
        variant="page"
        size="lg"
        message="Loading Ad Creative Studio"
        subMessage="Setting up your creative workspace"
        agencyLogo={agencySettings.agency_logo_url}
        agencyName={agencySettings.agency_name}
      />
    )
  }

  // Show no brand selected state
  if (!selectedBrandId) {
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
          {/* Main logo */}
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              {agencySettings.agency_logo_url && (
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
          
          {/* Subtitle */}
          <p className="text-xl text-gray-300 mb-6 font-medium min-h-[28px]">
            No brand selected
          </p>
          
          {/* Message */}
          <div className="max-w-md mx-auto">
            <p className="text-gray-400 mb-8">
              Select a brand from the sidebar to start generating amazing ad creatives with AI
            </p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
              <AlertCircle className="h-5 w-5 text-white/40" />
              <span className="text-sm text-gray-400">Brand selection required</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Ad Creative Studio</h1>
            <p className="text-gray-400">Generate stunning ad creatives with AI for {selectedBrand?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Total Generated</p>
              <p className="text-2xl font-bold text-white">{creativeAssets.length}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={loadCreativeAssets}
              disabled={isLoadingAssets}
            >
              {isLoadingAssets ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">This Month</p>
                  <p className="text-xl font-bold text-white">
                    {creativeAssets.filter(a => 
                      a && a.created_at && new Date(a.created_at).getMonth() === new Date().getMonth()
                    ).length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Success Rate</p>
                  <p className="text-xl font-bold text-white">
                    {creativeAssets.length > 0 
                      ? Math.round((creativeAssets.filter(a => a && a.status === 'completed').length / creativeAssets.length) * 100)
                      : 100}%
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Cost</p>
                  <p className="text-xl font-bold text-white">
                    ${creativeAssets.length > 0 
                      ? (creativeAssets.reduce((sum, a) => sum + (a.generation_cost || 0), 0) / creativeAssets.length).toFixed(3)
                      : '0.030'}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] border-[#333]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Cost</p>
                  <p className="text-xl font-bold text-white">
                    ${creativeAssets.reduce((sum, a) => sum + (a.generation_cost || 0), 0).toFixed(2)}
                  </p>
                </div>
                <Target className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Panel */}
        <div className="lg:col-span-1">
          <Card className="bg-[#1A1A1A] border-[#333] sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Generate Creative
              </CardTitle>
              <CardDescription>Create stunning ad visuals with AI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt Input */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Creative Prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Describe your ideal ad creative... Be specific about style, mood, and elements."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] bg-[#0A0A0A] border-[#333] text-white"
                />
                <p className="text-xs text-gray-500">
                  Tip: Include details about product placement, lighting, and composition
                </p>
              </div>

              {/* Product Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="product-image">Product Image (Optional)</Label>
                <div className="border-2 border-dashed border-[#333] rounded-lg p-4 text-center hover:border-[#444] transition-colors">
                  <input
                    id="product-image"
                    type="file"
                    accept="image/*"
                    onChange={handleProductImageUpload}
                    className="hidden"
                  />
                  <label htmlFor="product-image" className="cursor-pointer">
                    {productImageUrl ? (
                      <div className="space-y-2">
                        <img 
                          src={productImageUrl} 
                          alt="Product" 
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            setProductImage(null)
                            setProductImageUrl('')
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="py-4">
                        <Upload className="h-8 w-8 mx-auto text-gray-500 mb-2" />
                        <p className="text-sm text-gray-400">Click to upload product image</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Style Preferences */}
              <Tabs defaultValue="style" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-[#0A0A0A]">
                  <TabsTrigger value="style">Style</TabsTrigger>
                  <TabsTrigger value="audience">Audience</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="style" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Color Scheme</Label>
                    <Select value={colorScheme} onValueChange={setColorScheme}>
                      <SelectTrigger className="bg-[#0A0A0A] border-[#333]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vibrant">Vibrant & Bold</SelectItem>
                        <SelectItem value="minimal">Minimal & Clean</SelectItem>
                        <SelectItem value="dark">Dark & Moody</SelectItem>
                        <SelectItem value="pastel">Soft & Pastel</SelectItem>
                        <SelectItem value="monochrome">Monochrome</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Visual Style</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger className="bg-[#0A0A0A] border-[#333]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Modern & Sleek</SelectItem>
                        <SelectItem value="realistic">Photorealistic</SelectItem>
                        <SelectItem value="illustrated">Illustrated</SelectItem>
                        <SelectItem value="abstract">Abstract</SelectItem>
                        <SelectItem value="vintage">Vintage & Retro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select value={format} onValueChange={setFormat}>
                      <SelectTrigger className="bg-[#0A0A0A] border-[#333]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">Square (1:1)</SelectItem>
                        <SelectItem value="portrait">Portrait (4:5)</SelectItem>
                        <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                        <SelectItem value="story">Story (9:16)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="audience" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select value={audience} onValueChange={setAudience}>
                      <SelectTrigger className="bg-[#0A0A0A] border-[#333]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Audience</SelectItem>
                        <SelectItem value="youth">Youth (18-24)</SelectItem>
                        <SelectItem value="professional">Professionals</SelectItem>
                        <SelectItem value="luxury">Luxury Market</SelectItem>
                        <SelectItem value="family">Families</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-text">Include Text Overlay</Label>
                    <Switch
                      id="include-text"
                      checked={includeText}
                      onCheckedChange={setIncludeText}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Creativity Level</Label>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400">Safe</span>
                      <Slider
                        value={creativity}
                        onValueChange={setCreativity}
                        max={100}
                        step={10}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-400">Wild</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Current: {creativity[0]}% creative
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateCreative}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Creative
                  </>
                )}
              </Button>

              {/* Cost Estimate */}
              <div className="p-3 bg-[#0A0A0A] rounded-lg border border-[#333]">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Estimated Cost:</span>
                  <span className="text-white font-medium">~$0.035</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Includes image generation + tokens
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gallery */}
        <div className="lg:col-span-2">
          <Card className="bg-[#1A1A1A] border-[#333]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Creative Gallery
                  </CardTitle>
                  <CardDescription>Your generated ad creatives</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-[#2A2A2A]">
                  {creativeAssets.length} Creatives
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAssets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : creativeAssets.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No creatives yet</h3>
                  <p className="text-gray-400 mb-6">Start by generating your first ad creative</p>
                  <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                    <Info className="h-4 w-4" />
                    <span>Creatives are saved automatically</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {creativeAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="group relative bg-[#0A0A0A] rounded-lg overflow-hidden border border-[#333] hover:border-[#444] transition-all cursor-pointer"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      {/* Image */}
                      <div className="aspect-square relative">
                        {asset.status === 'generating' ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                          </div>
                        ) : asset.status === 'failed' ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A0A] p-4">
                            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                            <p className="text-sm text-red-400 text-center">Generation failed</p>
                          </div>
                        ) : (
                          <img
                            src={asset.image_url}
                            alt={asset.prompt}
                            className="w-full h-full object-cover"
                          />
                        )}
                        
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-white text-sm mb-2 line-clamp-2">{asset.prompt}</p>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  downloadImage(asset.image_url, `creative-${asset.id}.png`)
                                }}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyImageUrl(asset.image_url)
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedAsset(asset)
                                }}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {asset.status === 'generating' && (
                          <Badge className="absolute top-2 right-2 bg-yellow-600">
                            Generating...
                          </Badge>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">
                            {asset.created_at ? new Date(asset.created_at).toLocaleDateString() : 'Unknown date'}
                          </span>
                          <span className="text-gray-400">
                            ${asset.generation_cost?.toFixed(3) || '0.030'}
                          </span>
                        </div>
                        {asset.style_preferences && (
                          <div className="flex flex-wrap gap-1">
                            {asset.style_preferences.style && (
                              <Badge variant="outline" className="text-xs">
                                {asset.style_preferences.style}
                              </Badge>
                            )}
                            {asset.style_preferences.colorScheme && (
                              <Badge variant="outline" className="text-xs">
                                {asset.style_preferences.colorScheme}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedAsset && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAsset(null)}
        >
          <div 
            className="bg-[#1A1A1A] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-[#333]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#333] flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Creative Preview</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedAsset(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              <img
                src={selectedAsset.image_url}
                alt={selectedAsset.prompt}
                className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
              />
              <div className="mt-4 space-y-4">
                <div>
                  <Label className="text-gray-400">Prompt</Label>
                  <p className="text-white mt-1">{selectedAsset.prompt}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Generated</Label>
                    <p className="text-white mt-1">
                      {selectedAsset.created_at ? new Date(selectedAsset.created_at).toLocaleString() : 'Unknown date'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Cost</Label>
                    <p className="text-white mt-1">
                      ${selectedAsset.generation_cost?.toFixed(3) || '0.030'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => downloadImage(selectedAsset.image_url, `creative-${selectedAsset.id}.png`)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => copyImageUrl(selectedAsset.image_url)}
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy URL
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 