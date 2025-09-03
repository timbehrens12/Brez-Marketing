'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { 
  Upload, 
  Image as ImageIcon, 
  Copy, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  Download,
  Eye,
  Trash2,
  Loader2,
  ChevronLeft
} from 'lucide-react'
import { GridOverlay } from '@/components/GridOverlay'
import { useBrandContext } from '@/contexts/BrandContext'

interface CopyCreative {
  id: string
  reference_image_url: string
  product_image_url: string
  generated_image_url: string
  style_analysis: string
  custom_modifications: string
  status: 'analyzing' | 'generating' | 'completed' | 'failed'
  created_at: string
}

export default function CopyCreativePage() {
  const { user } = useUser()
  const router = useRouter()
  const { selectedBrand, selectedBrandId } = useBrandContext()
  
  // Upload states
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('')
  const [productImage, setProductImage] = useState<File | null>(null)
  const [productImageUrl, setProductImageUrl] = useState<string>('')
  
  // Generation states
  const [customModifications, setCustomModifications] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [styleAnalysis, setStyleAnalysis] = useState('')
  
  // Results
  const [copyCreatives, setCopyCreatives] = useState<CopyCreative[]>([])
  const [activeTab, setActiveTab] = useState<'create' | 'results'>('create')

  // Drag and drop for reference image
  const onDropReference = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type.startsWith('image/')) {
      setReferenceImage(file)
      const url = URL.createObjectURL(file)
      setReferenceImageUrl(url)
      toast.success('Reference creative uploaded!')
    } else {
      toast.error('Please upload a valid image file')
    }
  }, [])

  // Drag and drop for product image
  const onDropProduct = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type.startsWith('image/')) {
      setProductImage(file)
      const url = URL.createObjectURL(file)
      setProductImageUrl(url)
      toast.success('Product image uploaded!')
    } else {
      toast.error('Please upload a valid image file')
    }
  }, [])

  const { getRootProps: getRootPropsRef, getInputProps: getInputPropsRef, isDragActive: isDragActiveRef } = useDropzone({
    onDrop: onDropReference,
    accept: { 'image/*': [] },
    multiple: false
  })

  const { getRootProps: getRootPropsProd, getInputProps: getInputPropsProd, isDragActive: isDragActiveProd } = useDropzone({
    onDrop: onDropProduct,
    accept: { 'image/*': [] },
    multiple: false
  })

  // Analyze reference creative
  const analyzeReference = async () => {
    if (!referenceImage) {
      toast.error('Please upload a reference creative first')
      return
    }

    setIsAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('reference_image', referenceImage)

      const response = await fetch('/api/analyze-creative', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to analyze creative')
      }

      const data = await response.json()
      setStyleAnalysis(data.analysis)
      toast.success('Creative analyzed successfully!')
    } catch (error) {
      console.error('Error analyzing creative:', error)
      toast.error('Failed to analyze creative. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Generate copy creative
  const generateCopyCreative = async () => {
    if (!referenceImage || !productImage) {
      toast.error('Please upload both reference creative and product image')
      return
    }

    if (!selectedBrandId) {
      toast.error('Please select a brand first')
      return
    }

    setIsGenerating(true)
    try {
      const formData = new FormData()
      formData.append('reference_image', referenceImage)
      formData.append('product_image', productImage)
      formData.append('brand_id', selectedBrandId)
      formData.append('user_id', user!.id)
      formData.append('custom_modifications', customModifications)
      
      if (styleAnalysis) {
        formData.append('style_analysis', styleAnalysis)
      }

      const response = await fetch('/api/copy-creative', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to generate copy creative')
      }

      const data = await response.json()
      
      // Add to results
      setCopyCreatives(prev => [data.creative, ...prev])
      setActiveTab('results')
      
      toast.success('Copy creative generated successfully!')
    } catch (error) {
      console.error('Error generating copy creative:', error)
      toast.error('Failed to generate copy creative. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Load existing copy creatives
  useEffect(() => {
    if (selectedBrandId && user) {
      loadCopyCreatives()
    }
  }, [selectedBrandId, user])

  const loadCopyCreatives = async () => {
    try {
      const response = await fetch(`/api/copy-creative?brandId=${selectedBrandId}&limit=20`)
      if (response.ok) {
        const data = await response.json()
        setCopyCreatives(data.creatives || [])
      }
    } catch (error) {
      console.error('Error loading copy creatives:', error)
    }
  }

  const deleteCopyCreative = async (id: string) => {
    try {
      const response = await fetch(`/api/copy-creative?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setCopyCreatives(prev => prev.filter(c => c.id !== id))
        toast.success('Copy creative deleted successfully!')
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      console.error('Error deleting copy creative:', error)
      toast.error('Failed to delete copy creative')
    }
  }

  const renderCreateTab = () => (
    <div className="space-y-6">
      {/* Reference Creative Upload */}
      <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          Reference Creative
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Upload the creative you want to copy. This will be analyzed for style, composition, and visual elements.
        </p>
        
        <div
          {...getRootPropsRef()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActiveRef
              ? 'border-blue-500 bg-blue-500/10'
              : referenceImageUrl
              ? 'border-green-500 bg-green-500/10'
              : 'border-[#444] hover:border-[#555] bg-[#2a2a2a]'
          }`}
        >
          <input {...getInputPropsRef()} />
          {referenceImageUrl ? (
            <div className="space-y-4">
              <img
                src={referenceImageUrl}
                alt="Reference creative"
                className="w-48 h-32 object-cover rounded-lg mx-auto border border-[#444]"
              />
              <p className="text-green-400 font-medium">Reference creative uploaded</p>
              <Button
                onClick={analyzeReference}
                disabled={isAnalyzing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Style
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-white font-medium">Upload Reference Creative</p>
                <p className="text-gray-400 text-sm">Drag and drop or click to browse</p>
              </div>
            </div>
          )}
        </div>

        {styleAnalysis && (
          <div className="mt-4 p-4 bg-[#2a2a2a] rounded-lg border border-[#444]">
            <h4 className="text-white font-medium mb-2">Style Analysis</h4>
            <p className="text-gray-300 text-sm">{styleAnalysis}</p>
          </div>
        )}
      </div>

      {/* Product Image Upload */}
      <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
            <Upload className="w-4 h-4 text-white" />
          </div>
          Your Product
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Upload your product image that will replace the product in the reference creative.
        </p>
        
        <div
          {...getRootPropsProd()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActiveProd
              ? 'border-green-500 bg-green-500/10'
              : productImageUrl
              ? 'border-green-500 bg-green-500/10'
              : 'border-[#444] hover:border-[#555] bg-[#2a2a2a]'
          }`}
        >
          <input {...getInputPropsProd()} />
          {productImageUrl ? (
            <div className="space-y-4">
              <img
                src={productImageUrl}
                alt="Product"
                className="w-48 h-32 object-cover rounded-lg mx-auto border border-[#444]"
              />
              <p className="text-green-400 font-medium">Product image uploaded</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-white font-medium">Upload Your Product</p>
                <p className="text-gray-400 text-sm">Drag and drop or click to browse</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Modifications */}
      <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          Custom Modifications (Optional)
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Add any specific changes you want to make to the copied creative beyond just replacing the product.
        </p>
        
        <textarea
          value={customModifications}
          onChange={(e) => setCustomModifications(e.target.value)}
          placeholder="Example: Change background to marble, add gold text overlay saying 'Premium Collection', use warmer lighting..."
          className="w-full h-32 bg-[#2a2a2a] border border-[#444] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#555] focus:outline-none resize-none"
        />
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={generateCopyCreative}
          disabled={!referenceImage || !productImage || isGenerating}
          className={`px-8 py-4 text-lg font-semibold rounded-xl transition-all ${
            !referenceImage || !productImage
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              Generating Copy Creative...
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 mr-3" />
              Generate Copy Creative
            </>
          )}
        </Button>
      </div>
    </div>
  )

  const renderResultsTab = () => (
    <div className="space-y-4">
      {copyCreatives.length === 0 ? (
        <div className="text-center py-12">
          <Copy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Copy Creatives Yet</h3>
          <p className="text-gray-400 mb-6">Generate your first copy creative to see results here.</p>
          <Button
            onClick={() => setActiveTab('create')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Create Copy Creative
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {copyCreatives.map((creative) => (
            <div
              key={creative.id}
              className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] overflow-hidden hover:border-[#444] transition-all duration-200"
            >
              {/* Images */}
              <div className="grid grid-cols-2 gap-1 p-3">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-medium">Reference</p>
                  <img
                    src={creative.reference_image_url}
                    alt="Reference"
                    className="w-full h-24 object-cover rounded border border-[#444]"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-medium">Generated</p>
                  {creative.status === 'completed' ? (
                    <img
                      src={creative.generated_image_url}
                      alt="Generated"
                      className="w-full h-24 object-cover rounded border border-[#444]"
                    />
                  ) : (
                    <div className="w-full h-24 bg-[#2a2a2a] rounded border border-[#444] flex items-center justify-center">
                      {creative.status === 'generating' && (
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      )}
                      <span className="text-xs text-gray-500 capitalize">{creative.status}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3 pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {new Date(creative.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    {creative.status === 'completed' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(creative.generated_image_url, '_blank')}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = creative.generated_image_url
                            link.download = `copy-creative-${creative.id}.jpg`
                            link.click()
                          }}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCopyCreative(creative.id)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in to continue</h1>
          <p className="text-gray-400">You need to be logged in to use the Copy Creative feature.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] p-6 relative">
      <GridOverlay />
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => router.push('/ad-creative-studio')}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Studio
            </Button>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Copy className="w-6 h-6 text-white" />
              </div>
              Copy Creative
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Upload any creative and we'll recreate it with your product. Perfect for competitive analysis and inspiration.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-1 flex">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-3 rounded-lg transition-all font-medium ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Create
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={`px-6 py-3 rounded-lg transition-all font-medium ${
                activeTab === 'results'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Results ({copyCreatives.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'create' ? renderCreateTab() : renderResultsTab()}
      </div>
    </div>
  )
}
