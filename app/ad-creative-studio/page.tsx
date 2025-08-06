"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon, Sparkles, Loader2, ChevronLeft, ChevronRight, Info, Plus, Trash2, Download, X, Building2, FlaskConical, Palette, RotateCcw, Crop } from 'lucide-react'
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
  category: string
  goodFor: string
}

interface RetryIssue {
  id: string
  label: string
  promptAddition: string
}

const RETRY_ISSUES: RetryIssue[] = [
  {
    id: 'distorted-text',
    label: 'Distorted Text',
    promptAddition: 'CRITICAL FIX: The previous generation had distorted or unclear text. Pay EXTRA attention to preserving all text elements with perfect clarity, readability, and positioning. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. Never allow neck tag text to become blurry, pixelated, or illegible. Ensure all text, logos, and graphics are crystal clear and identical to the original image.'
  },
  {
    id: 'neck-tag-distortion',
    label: 'Neck Tag Text Issues',
    promptAddition: 'CRITICAL FIX: The previous generation had distorted, blurry, or illegible neck tag text. NECK TAG TEXT ULTRA-CRITICAL: Pay EXTREME attention to neck tag text preservation - ensure neck tag brand names, logos, size information, and any text visible on neck tags are preserved with MAXIMUM clarity and sharpness. Never allow neck tag text to become blurry, pixelated, distorted, or illegible. Treat neck tag text with the same importance as the main product graphics.'
  },
  {
    id: 'distorted-graphics',
    label: 'Distorted Graphics/Logo',
    promptAddition: 'CRITICAL FIX: The previous generation had distorted graphics or logos. Pay EXTRA attention to preserving all graphic elements, logos, symbols, and visual designs with perfect clarity and positioning. Ensure all graphics remain identical to the original image.'
  },
  {
    id: 'fake-tags',
    label: 'Fake Tags Created',
    promptAddition: 'CRITICAL FIX: The previous generation incorrectly created fake tags, neck labels, or text that were NOT in the original image. ULTRA-IMPORTANT: DO NOT create, add, or invent ANY content whatsoever that is not actually visible in the original image. This specifically includes: NO fake brand names, NO fake neck tags, NO fake size labels, NO fake care instructions, NO fake logos of any kind. ABSOLUTELY BANNED: Never add "PROJECT CAPRI" or any other test brand names to clothing under any circumstances. If the original clothing item is completely plain with no visible tags, neck labels, graphics, or text anywhere on it, then keep it completely plain. Only preserve content that actually exists in the source image. Never fabricate, imagine, or add fictional content.'
  },
  {
    id: 'wrong-colors',
    label: 'Wrong Colors',
    promptAddition: 'CRITICAL FIX: The previous generation had incorrect colors. Pay EXTRA attention to preserving the exact colors of the clothing item, graphics, text, and all visual elements. Match colors PRECISELY to the original image.'
  },
  {
    id: 'poor-positioning',
    label: 'Poor Positioning',
    promptAddition: 'CRITICAL FIX: The previous generation had poor positioning or sizing. Ensure the clothing item is properly centered, sized appropriately (85-90% of frame width), and positioned naturally with realistic fabric draping and contact points.'
  },
  {
    id: 'artificial-look',
    label: 'Too Artificial/AI-like',
    promptAddition: 'CRITICAL FIX: The previous generation looked too artificial or AI-generated. Add more natural imperfections, realistic lighting variations, authentic fabric behavior, and natural surface textures to make it look like a genuine photograph.'
  },
  {
    id: 'missing-details',
    label: 'Missing Details',
    promptAddition: 'CRITICAL FIX: The previous generation was missing important details from the original. Ensure ALL details, textures, patterns, small text, graphics, and visual elements from the original image are preserved and clearly visible. Pay EXTREME attention to preserving the EXACT shape of the clothing item including sleeves, collars, cuffs, hems, pockets, and all structural elements. Preserve ALL text including the smallest text, size tags, care labels, neck prints, and any microscopic text anywhere on the garment with crystal-clear readability.'
  },
  {
    id: 'shape-distortion',
    label: 'Shape/Silhouette Issues',
    promptAddition: 'CRITICAL FIX: The previous generation had incorrect clothing shape or silhouette. Pay ULTRA-CRITICAL attention to preserving the EXACT shape of the clothing item - if it\'s a shirt, maintain the precise sleeve shape, collar shape, and overall silhouette. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including sleeves, cuffs, hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way.'
  }
]

const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates' },
  { id: 'clothing', name: 'Clothing & Apparel' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'products', name: 'Physical Products' }
]

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'concrete-floor',
    name: 'Concrete Floor',
    description: 'Dark cracked concrete floor with industrial texture',
    thumbnail: 'https://i.imgur.com/ED4tpzf.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, streetwear',
    prompt: 'Place this exact clothing item on a realistic concrete surface background, similar to the lighting and texture in high-end fashion editorials. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a medium-toned concrete floor with visible cracks, subtle stains, and natural imperfections - NOT a perfect pristine surface. Include slight dust particles, minor scuff marks, and natural wear patterns that make it look authentically used. The lighting should be soft but directional with subtle variations, casting realistic shadows under the clothing to show it\'s resting on the ground. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand with natural imperfections. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in studio lighting conditions with natural inconsistencies. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the precise sleeve shape, collar shape, and overall silhouette. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including sleeves, cuffs, hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. EXTREME BLUE COLOR ACCURACY: If the clothing contains ANY blue colors, tones, or blue-tinted elements, they MUST be preserved with EXACT color fidelity - do not shift hues, change saturation, or alter the blue tones in any way. Blue graphics, logos, or design elements must remain precisely the same shade and intensity. ANTI-DISTORTION PROTECTION: Do not warp, stretch, compress, or geometrically distort ANY part of the clothing - maintain perfect proportional accuracy and shape integrity throughout the entire garment. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'black-background',
    name: 'Black Background',
    description: 'Clean matte black background for dramatic contrast',
    thumbnail: 'https://i.imgur.com/TJO2Jmm.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Place this exact clothing item on a realistic matte black background, similar to professional product photography setups. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a deep matte black with subtle texture variations - NOT a perfect digital black but with natural imperfections like slight dust particles, minor surface variations, and realistic lighting gradients that make it look authentically photographed. The lighting should be professional but natural, with soft directional light that creates realistic shadows and highlights on the fabric. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric drapes - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface, showing genuine fabric physics. Maintain the natural folds, wrinkles, and garment proportions as if it was carefully placed by hand with natural imperfections. Include subtle ambient reflections and realistic light falloff on the black surface. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in a professional studio with natural lighting inconsistencies and fabric behavior. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the precise sleeve shape, collar shape, and overall silhouette. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including sleeves, cuffs, hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'white-background',
    name: 'White Background',
    description: 'Clean white background for minimal, professional look',
    thumbnail: 'https://i.imgur.com/zgCXJwr.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, e-commerce',
    prompt: 'Place this exact clothing item on a realistic matte white background, similar to high-end e-commerce product photography. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a soft matte white with subtle texture variations - NOT a perfect digital white but with natural imperfections like slight paper grain, minor surface variations, and realistic lighting gradients that make it look authentically photographed on a white backdrop. The lighting should be professional but natural, with soft even illumination that creates realistic shadows and subtle highlights on the fabric without being too harsh or artificial. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface, showing genuine fabric physics and natural draping. Maintain the natural folds, wrinkles, and garment proportions as if it was carefully arranged by hand with natural imperfections. Include subtle cast shadows on the white surface that look naturally photographed. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in a professional studio with natural lighting variations and authentic fabric behavior. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the precise sleeve shape, collar shape, and overall silhouette. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including sleeves, cuffs, hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'asphalt-surface',
    name: 'Asphalt Surface',
    description: 'Dark asphalt road texture with realistic street surface',
    thumbnail: 'https://i.imgur.com/mDR8375.jpeg',
    category: 'clothing',
    goodFor: 'Clothing, apparel, streetwear, urban fashion',
    prompt: 'Place this exact clothing item on a realistic asphalt surface background, similar to urban street photography and streetwear editorials. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a dark gray asphalt road surface with visible texture variations - NOT a perfect smooth surface but with natural imperfections like small pebbles, minor cracks, subtle wear patterns, and realistic asphalt grain that make it look authentically like a real street surface. Include slight dust particles, minor scuff marks, and natural weathering patterns that make it look like genuine asphalt pavement. The lighting should be natural but directional with subtle variations, casting realistic shadows under the clothing to show it\'s resting on the asphalt ground. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the asphalt surface. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand with natural imperfections. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in natural lighting conditions with authentic street surface inconsistencies. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the precise sleeve shape, collar shape, and overall silhouette. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including sleeves, cuffs, hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. EXTREME BLUE COLOR ACCURACY: If the clothing contains ANY blue colors, tones, or blue-tinted elements, they MUST be preserved with EXACT color fidelity - do not shift hues, change saturation, or alter the blue tones in any way. Blue graphics, logos, or design elements must remain precisely the same shade and intensity. ANTI-DISTORTION PROTECTION: Do not warp, stretch, compress, or geometrically distort ANY part of the clothing - maintain perfect proportional accuracy and shape integrity throughout the entire garment. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
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
  custom_name?: string
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
  const [creativeName, setCreativeName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showRetryModal, setShowRetryModal] = useState(false)
  const [retryCreativeId, setRetryCreativeId] = useState('')
  const [retryImage, setRetryImage] = useState<File | null>(null)

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showStyleModal || showRetryModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showStyleModal, showRetryModal])

  // Weekly usage system - 10 generations per week (universal)
  const WEEKLY_LIMIT = 10
  const [usageData, setUsageData] = useState({
    current: 0,
    weekStartDate: ''
  })

  // Crop functionality state
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropCreativeId, setCropCreativeId] = useState<string>('')
  const [cropImageUrl, setCropImageUrl] = useState<string>('')
  const [cropArea, setCropArea] = useState({
    x: 0,
    y: 0,
    width: 100,
    height: 100
  })
  const [isDragging, setIsDragging] = useState(false)
  const [dragHandle, setDragHandle] = useState<string>('')
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 })
  const [originalImageUrls, setOriginalImageUrls] = useState<{[key: string]: string}>({}) // Store original URLs for undo

  // Get current Monday as week start
  const getCurrentWeekStart = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Sunday = 0, Monday = 1
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    return monday.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  // Initialize usage data from localStorage
  useEffect(() => {
    const currentWeekStart = getCurrentWeekStart()
    const stored = localStorage.getItem('ad-creative-usage')
    
    if (stored) {
      const parsed = JSON.parse(stored)
      // If it's a new week, reset usage
      if (parsed.weekStartDate !== currentWeekStart) {
        const newUsageData = { current: 0, weekStartDate: currentWeekStart }
        setUsageData(newUsageData)
        localStorage.setItem('ad-creative-usage', JSON.stringify(newUsageData))
      } else {
        setUsageData(parsed)
      }
    } else {
      // First time, initialize
      const newUsageData = { current: 0, weekStartDate: currentWeekStart }
      setUsageData(newUsageData)
      localStorage.setItem('ad-creative-usage', JSON.stringify(newUsageData))
    }
  }, [])

  const usagePercentage = (usageData.current / WEEKLY_LIMIT) * 100

  // Function to update usage count
  const incrementUsage = () => {
    const newUsageData = {
      ...usageData,
      current: Math.min(usageData.current + 1, WEEKLY_LIMIT)
    }
    setUsageData(newUsageData)
    localStorage.setItem('ad-creative-usage', JSON.stringify(newUsageData))
  }

  // R&D: Function to reset usage count for development
  const resetUsage = () => {
    const currentWeekStart = getCurrentWeekStart()
    const newUsageData = { current: 0, weekStartDate: currentWeekStart }
    setUsageData(newUsageData)
    localStorage.setItem('ad-creative-usage', JSON.stringify(newUsageData))
    toast.success('Usage count reset for R&D')
  }

  // Get progress color based on usage percentage
  const getProgressColor = () => {
    if (usagePercentage > 90) return '#ef4444' // Red
    if (usagePercentage > 80) return '#f59e0b' // Amber
    if (usagePercentage > 60) return '#3b82f6' // Blue
    return '#10b981' // Green
  }

  // Calculate days until reset (next Monday)
  const getDaysUntilReset = () => {
    const today = new Date()
    const nextMonday = new Date()
    nextMonday.setDate(today.getDate() + (7 - today.getDay() + 1) % 7)
    if (nextMonday <= today) nextMonday.setDate(nextMonday.getDate() + 7)
    const diff = nextMonday.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // Load creative generations from database when brand changes
  useEffect(() => {
    const loadCreatives = async () => {
      if (!selectedBrandId || !user?.id) {
        setGeneratedCreatives([])
        setIsLoadingCreatives(false)
        return
      }

      // Start loading immediately and clear old creatives
      setIsLoadingCreatives(true)
      setGeneratedCreatives([]) // Clear immediately when brand changes
      
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
    setCreativeName('')
    setShowStyleModal(true)
  }

  const openRetryModal = (creativeId: string) => {
    setRetryCreativeId(creativeId)
    setRetryImage(null) // Reset retry image
    setShowRetryModal(true)
  }

  const openCropModal = (creativeId: string, imageUrl: string) => {
    setCropCreativeId(creativeId)
    setCropImageUrl(imageUrl)
    
    // Initialize crop area to fit the actual image (will be updated when image loads)
    setCropArea({ x: 0, y: 0, width: 100, height: 100 })
    
    // Store original URL if not already stored (for undo functionality)
    if (!originalImageUrls[creativeId]) {
      setOriginalImageUrls(prev => ({
        ...prev,
        [creativeId]: imageUrl
      }))
    }
    
    setShowCropModal(true)
  }

  // Crop image processing function
  const applyCrop = async (imageUrl: string, cropArea: { x: number, y: number, width: number, height: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        const { width, height } = img
        
        // Convert percentages to pixel values
        const sourceX = (cropArea.x / 100) * width
        const sourceY = (cropArea.y / 100) * height
        const sourceWidth = (cropArea.width / 100) * width
        const sourceHeight = (cropArea.height / 100) * height

        canvas.width = sourceWidth
        canvas.height = sourceHeight

        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, sourceWidth, sourceHeight
        )

        canvas.toBlob((blob) => {
          if (blob) {
            const croppedUrl = URL.createObjectURL(blob)
            resolve(croppedUrl)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, 'image/png')
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageUrl
    })
  }

  // Apply crop to the selected creative
  const handleApplyCrop = async () => {
    try {
      const croppedImageUrl = await applyCrop(cropImageUrl, cropArea)
      
      // Update the creative with the cropped image
      setGeneratedCreatives(prev => prev.map(creative => 
        creative.id === cropCreativeId 
          ? { ...creative, generated_image_url: croppedImageUrl }
          : creative
      ))

      setShowCropModal(false)
      toast.success('Image cropped successfully!')
    } catch (error) {
      console.error('Crop error:', error)
      toast.error('Failed to crop image')
    }
  }

  // Undo crop - restore original image
  const handleUndoCrop = () => {
    const originalUrl = originalImageUrls[cropCreativeId]
    if (originalUrl) {
      setGeneratedCreatives(prev => prev.map(creative => 
        creative.id === cropCreativeId 
          ? { ...creative, generated_image_url: originalUrl }
          : creative
      ))
      
      // Remove from original URLs since we're back to original
      setOriginalImageUrls(prev => {
        const newUrls = { ...prev }
        delete newUrls[cropCreativeId]
        return newUrls
      })
      
      setShowCropModal(false)
      toast.success('Restored to original image!')
    }
  }

  // Calculate crop area to fit actual image dimensions
  const calculateImageCropArea = (img: HTMLImageElement, container: HTMLElement) => {
    const containerRect = container.getBoundingClientRect()
    const imageAspect = img.naturalWidth / img.naturalHeight
    const containerAspect = containerRect.width / containerRect.height
    
    let imageDisplayWidth, imageDisplayHeight, imageOffsetX, imageOffsetY
    
    if (imageAspect > containerAspect) {
      // Image is wider - fit to container width
      imageDisplayWidth = containerRect.width
      imageDisplayHeight = containerRect.width / imageAspect
      imageOffsetX = 0
      imageOffsetY = (containerRect.height - imageDisplayHeight) / 2
    } else {
      // Image is taller - fit to container height
      imageDisplayHeight = containerRect.height
      imageDisplayWidth = containerRect.height * imageAspect
      imageOffsetY = 0
      imageOffsetX = (containerRect.width - imageDisplayWidth) / 2
    }
    
    // Convert to percentages relative to container
    const x = (imageOffsetX / containerRect.width) * 100
    const y = (imageOffsetY / containerRect.height) * 100
    const width = (imageDisplayWidth / containerRect.width) * 100
    const height = (imageDisplayHeight / containerRect.height) * 100
    
    return { x, y, width, height }
  }

  // Interactive crop handlers
  const handleMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const cropContainer = document.querySelector('.crop-container') as HTMLElement
    if (!cropContainer) return
    
    const startMouseX = e.clientX
    const startMouseY = e.clientY
    const startCropArea = { ...cropArea }
    
    const handleGlobalMouseMove = (globalE: MouseEvent) => {
      const rect = cropContainer.getBoundingClientRect()
      const deltaX = ((globalE.clientX - startMouseX) / rect.width) * 100
      const deltaY = ((globalE.clientY - startMouseY) / rect.height) * 100

      setCropArea(prev => {
        let newArea = { ...startCropArea }

        switch (handle) {
          case 'top': // Top edge
            newArea.y = Math.max(0, Math.min(startCropArea.y + startCropArea.height - 5, startCropArea.y + deltaY))
            newArea.height = startCropArea.y + startCropArea.height - newArea.y
            break
          case 'bottom': // Bottom edge
            newArea.height = Math.max(5, Math.min(100 - startCropArea.y, startCropArea.height + deltaY))
            break
          case 'left': // Left edge
            newArea.x = Math.max(0, Math.min(startCropArea.x + startCropArea.width - 5, startCropArea.x + deltaX))
            newArea.width = startCropArea.x + startCropArea.width - newArea.x
            break
          case 'right': // Right edge
            newArea.width = Math.max(5, Math.min(100 - startCropArea.x, startCropArea.width + deltaX))
            break

        }

        return newArea
      })
    }
    
    const handleGlobalMouseUp = () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
    
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }

  const handleRetryImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setRetryImage(file)
    }
  }

  const generateDefaultName = () => {
    const brandName = selectedBrand?.name || 'Brand'
    const existingCount = generatedCreatives.filter(c => 
      c.custom_name?.startsWith(brandName) || 
      c.style_name.includes(brandName)
    ).length
    return `${brandName} Creative ${existingCount + 1}`
  }

  const retryCreativeWithIssue = async (issueId: string) => {
    const creative = generatedCreatives.find(c => c.id === retryCreativeId)
    if (!creative || !retryImage) return

    const issue = RETRY_ISSUES.find(i => i.id === issueId)
    if (!issue) return

    // Find the original style
    const style = STYLE_OPTIONS.find(s => s.id === creative.style_id)
    if (!style) return

    // Create enhanced prompt with retry fix
    const enhancedPrompt = style.prompt + ' ' + issue.promptAddition + generateTextPromptAddition()

    // Create new creative entry for retry
    const newCreativeId = addCreative({
      brand_id: selectedBrandId!,
      user_id: user!.id,
      style_id: style.id,
      style_name: style.name,
      original_image_url: creative.original_image_url,
      generated_image_url: '',
      prompt_used: enhancedPrompt,
      text_overlays: creative.text_overlays,
      status: 'generating',
      metadata: { retryOf: creative.id, retryIssue: issueId },
      updated_at: new Date().toISOString(),
      custom_name: creative.custom_name
    })

    setShowRetryModal(false)
    setActiveTab('generated')
    toast.info(`Retrying generation with focus on: ${issue.label}`)

    try {
      // Convert retry image to base64 if provided, otherwise use original
      let imageToUse = creative.original_image_url
      
      if (retryImage) {
        imageToUse = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => {
            resolve(reader.result as string)
          }
          reader.readAsDataURL(retryImage)
        })
      }

      const response = await fetch('/api/generate-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageToUse,
          prompt: enhancedPrompt,
          style: style.id,
          brandId: selectedBrandId,
          userId: user?.id,
          styleName: style.name,
          textOverlays: creative.text_overlays,
          saveToDatabase: true,
          customName: creative.custom_name
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        updateCreativeStatus(newCreativeId, 'failed')
        toast.error(`Retry failed: ${errorData.error}`)
        return
      }

      const data = await response.json()
      updateCreativeStatus(newCreativeId, 'completed', data.imageUrl)
      incrementUsage() // Increment usage count on successful retry
      setRetryImage(null) // Clear retry image after successful generation
      toast.success(`Retry successful! Issue addressed: ${issue.label}`)
    } catch (error) {
      console.error('Error retrying generation:', error)
      updateCreativeStatus(newCreativeId, 'failed')
      setRetryImage(null) // Clear retry image on error
      toast.error('Retry failed. Please try again.')
    }
  }

  const filteredStyleOptions = selectedCategory === 'all' 
    ? STYLE_OPTIONS 
    : STYLE_OPTIONS.filter(style => style.category === selectedCategory)

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
    textAddition += 'ULTRA-CRITICAL FINAL INSTRUCTION: The original product must be preserved with 100% EXACT fidelity - every single character, logo, graphic, text, color, and detail must be IDENTICAL to the input image. Use the highest possible preservation quality equivalent to ChatGPT-level fidelity. DO NOT modify, stylize, or alter the product in ANY way. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the precise sleeve shape, collar shape, and overall silhouette. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including sleeves, cuffs, hems, collars, pockets, and all structural elements. EXTREME COLOR PRESERVATION: Pay special attention to preserving EXACT color accuracy, especially blue tones, gradients, and color transitions - do not shift, desaturate, or distort any colors whatsoever. CRITICAL DISTORTION PREVENTION: Do not warp, stretch, compress, or distort any part of the clothing - maintain perfect proportions and shape integrity. ENHANCED TAG/LABEL PRESERVATION: If there are ANY visible tags, neck labels, brand names, logos, or text elements on the garment, they MUST be preserved with CRYSTAL-CLEAR accuracy - maintain exact fonts, letter spacing, clarity, and positioning. Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, and any microscopic text anywhere on the garment. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. Never allow neck tag text to become blurry, pixelated, or illegible. Do not blur, distort, or alter any existing text elements no matter how small. ABSOLUTE PROHIBITION: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE - this includes NO fake neck tags, NO fake brand names, NO fake labels, NO fake text of any kind. SPECIFICALLY BANNED: Never add "PROJECT CAPRI" or any other test brand names to clothing. If the original is plain with no tags or text, keep it completely plain. MAXIMUM FIDELITY MODE: Treat this as if you are making a museum-quality reproduction where every pixel matters.'
    
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

    // Check usage limits
    if (usageData.current >= WEEKLY_LIMIT) {
      toast.error(`You've reached your weekly limit of ${WEEKLY_LIMIT} generations. Resets in ${getDaysUntilReset()} days.`)
      return
    }

    // Generate enhanced prompt
    const enhancedPrompt = modalStyle.prompt + generateTextPromptAddition()

    // Create creative entry with custom name
    const finalName = creativeName.trim() || generateDefaultName()
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
      updated_at: new Date().toISOString(),
      custom_name: finalName
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
          
          console.log('Uploaded image size:', uploadedImage.size, 'bytes')
          console.log('Uploaded image type:', uploadedImage.type)
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
          saveToDatabase: true,
          customName: finalName
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
      incrementUsage() // Increment usage count on successful generation
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
      <div className="w-full h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden">
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
      <div className="w-full h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden">
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
              The Ad Creative Studio is currently in beta. It may struggle with small text, tags, neck labels, and complex fine details.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] p-4 pb-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-xl 
                            flex items-center justify-center border border-white/10">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Ad Creative Studio</h1>
                <p className="text-gray-300 mt-1">Create ad creatives with AI-powered styling and custom text overlays</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
            {/* Weekly Usage Display - First widget */}
            <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-5 min-w-[200px] h-[120px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-xs font-medium">WEEKLY USAGE</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {getDaysUntilReset()}d left
                  </span>
                  {usageData.current > 0 && (
                    <button
                      onClick={resetUsage}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors px-1 py-0.5 rounded border border-red-500/20 hover:border-red-400/40"
                      title="R&D: Reset usage count"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Circular Progress */}
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background circle */}
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="2"
                      strokeDasharray="100, 100"
                    />
                    {/* Progress circle */}
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={getProgressColor()}
                      strokeWidth="2"
                      strokeDasharray={`${usagePercentage}, 100`}
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {Math.round(usagePercentage)}%
                    </span>
                  </div>
                </div>
                
                {/* Usage Stats */}
                <div>
                  <div className="text-white font-semibold text-sm">
                    {usageData.current} / {WEEKLY_LIMIT}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {WEEKLY_LIMIT - usageData.current} remaining
                  </div>
                  {usageData.current >= WEEKLY_LIMIT ? (
                    <div className="text-red-400 text-xs font-medium">
                      🚫 Limit Reached
                    </div>
                  ) : usagePercentage > 90 && (
                    <div className="text-red-400 text-xs font-medium">
                      ⚠️ Almost at limit
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Beta Notice Widget - Second widget */}
            <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-5 min-w-[200px] h-[120px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-xs font-medium">STATUS</span>
                <FlaskConical className="w-4 h-4 text-orange-400" />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg flex items-center justify-center">
                  <FlaskConical className="w-6 h-6 text-orange-400" />
                </div>
                
                <div>
                  <div className="text-white font-semibold text-sm">
                    Beta Version
                  </div>
                  <div className="text-gray-400 text-xs">
                    May struggle with small text, tags, neck labels, and complex fine details
                  </div>
                </div>
              </div>
            </div>
            
            {/* Product Image Display - Third widget with larger space */}
            <div 
              className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-5 min-w-[200px] h-[120px] flex flex-col justify-between cursor-pointer hover:border-white/20 transition-all duration-300"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-xs font-medium">PRODUCT IMAGE</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {uploadedImageUrl ? 'Change' : 'Upload'}
                </span>
              </div>
              
              <div className="flex items-center justify-center flex-1">
                {uploadedImageUrl ? (
                  <>
                    {/* Large Product Preview - Full height */}
                    <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-white/10 max-w-[80px]">
                    <img 
                      src={uploadedImageUrl} 
                      alt="Uploaded product" 
                        className="w-full h-full object-cover"
                    />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Upload Icon */}
                    <div className="w-12 h-12 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
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
                {!uploadedImage ? (
                  // No Product Uploaded State - Horizontal Layout
                  <div className="py-12">
                    <div className="max-w-6xl mx-auto">
                      <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Left Side - Description */}
                        <div>
                          <h3 className="text-3xl font-bold text-white mb-4">Upload Your Product</h3>
                          <p className="text-gray-300 text-lg leading-relaxed mb-6">
                            Transform your product images into stunning ad creatives with AI-powered styling and custom text overlays.
                          </p>
                          
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-white rounded-full mt-3 flex-shrink-0"></div>
                              <div>
                                <h4 className="text-white font-medium text-base mb-1">Multiple Background Styles</h4>
                                <p className="text-gray-400 text-sm">Choose from concrete, asphalt, black, and white backgrounds</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-white rounded-full mt-3 flex-shrink-0"></div>
                              <div>
                                <h4 className="text-white font-medium text-base mb-1">Custom Text Overlays</h4>
                                <p className="text-gray-400 text-sm">Add sales text, calls-to-action, and promotional messages</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-white rounded-full mt-3 flex-shrink-0"></div>
                              <div>
                                <h4 className="text-white font-medium text-base mb-1">Perfect Preservation</h4>
                                <p className="text-gray-400 text-sm">AI preserves exact shapes, colors, and text including neck tags</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right Side - Upload Section */}
                        <div>
                          <div 
                            className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border-2 border-dashed border-[#444] rounded-xl p-8 hover:border-[#555] transition-all duration-300 cursor-pointer group mb-6"
                            onClick={() => document.getElementById('image-upload')?.click()}
                          >
                            <div className="text-center">
                              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-white/5 to-white/10 rounded-xl flex items-center justify-center group-hover:from-white/10 group-hover:to-white/15 transition-all">
                                <ImageIcon className="w-8 h-8 text-white" />
                              </div>
                              
                              <h4 className="text-white font-semibold text-lg mb-2">Choose Product Image</h4>
                              <p className="text-gray-400 text-sm mb-4">PNG, JPG up to 10MB</p>
                              
                              <Button className="bg-white hover:bg-gray-200 text-black border-0">
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Image
                              </Button>
                            </div>
                          </div>
                          
                          {/* Image Quality Notice */}
                          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="text-amber-400 text-lg">⚠️</div>
                              <div>
                                <h5 className="text-amber-400 font-medium text-sm mb-2">Image Quality Matters</h5>
                                <p className="text-gray-300 text-xs leading-relaxed">
                                  High-quality images prevent text distortion, tag blurriness, and ensure clear neck tags and small details in your final creative.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Product Uploaded - Show Templates
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        Creative Templates
                  </h3>
                      
                      {/* Category Filter */}
                      <div className="flex gap-2">
                        {TEMPLATE_CATEGORIES.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                              selectedCategory === category.id
                                ? 'bg-white text-black'
                                : 'bg-[#2A2A2A] text-gray-300 hover:bg-[#333] border border-[#444]'
                            }`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {filteredStyleOptions.map((style) => (
                    <div
                      key={style.id}
                          className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden transition-all duration-300 group hover:border-[#555] hover:shadow-2xl cursor-pointer h-fit"
                        onClick={() => openStyleModal(style)}
                    >
                        <div className="aspect-[3/4] bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center overflow-hidden">
                        <img
                          src={style.thumbnail}
                          alt={style.name}
                              className="w-full h-full object-cover transition-all duration-300 opacity-80 group-hover:opacity-100 group-hover:scale-105"
                          />
                        </div>
                          <div className="p-6 flex-shrink-0">
                            <h4 className="font-semibold text-white text-lg mb-1 group-hover:text-gray-300 transition-colors">
                            {style.name}
                          </h4>
                            <p className="text-gray-500 text-xs mb-2">
                              • {style.goodFor}
                            </p>
                          <p className="text-gray-400 text-sm leading-relaxed">
                            {style.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>
            ) : (
              // Generated Creatives Tab
              <div>
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <ImageIcon className="w-6 h-6" />
                  Your Generated Creatives
                </h3>
                {isLoadingCreatives ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-t-white/20 border-r-white/10 border-b-white/10 border-l-white/20 rounded-full animate-spin mx-auto mb-4"></div>
                    <h4 className="text-lg font-medium text-white mb-2">Loading Creatives</h4>
                    <p className="text-gray-400">Fetching your brand's creative history...</p>
                  </div>
                ) : generatedCreatives.length === 0 ? (
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
                            <div className="flex flex-col items-center gap-4 py-12">
                              <div className="w-12 h-12 border-4 border-t-white/20 border-r-white/10 border-b-white/10 border-l-white/20 rounded-full animate-spin"></div>
                              <div className="text-center">
                                <p className="text-white text-sm font-medium mb-1">Creating Your Ad Creative</p>
                                <p className="text-gray-400 text-xs mb-2">Using AI to perfectly preserve your product...</p>
                                <div className="text-amber-400 text-xs font-medium">
                                  ⏱️ May take up to 2 minutes
                                </div>
                              </div>
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
                            <div>
                              <h4 className="font-medium text-white text-base">
                                {creative.custom_name || creative.style_name}
                            </h4>
                              {creative.custom_name && (
                                <p className="text-gray-400 text-sm">{creative.style_name}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {creative.status === 'completed' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => openCropModal(creative.id, creative.generated_image_url)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-2 py-1"
                                    title="Crop image"
                                  >
                                    <Crop className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => openRetryModal(creative.id)}
                                    className="bg-orange-600 hover:bg-orange-700 text-white border-0 px-2 py-1"
                                    title="Retry with improvements"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </Button>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const link = document.createElement('a')
                                    link.href = creative.generated_image_url
                                      const fileName = creative.custom_name 
                                        ? `${creative.custom_name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
                                        : `creative-${creative.id}.png`
                                      link.download = fileName
                                    link.click()
                                  }}
                                  className="bg-gray-600 hover:bg-gray-700 text-white border-0 px-2 py-1"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                </>
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
          </div>
          </div>

    {/* Completely Redesigned Modal */}
        {showStyleModal && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[99999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
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

                {/* Creative Name Input */}
                <div className="bg-gradient-to-br from-[#222] to-[#1e1e1e] border border-[#333] rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3 text-sm">Creative Name (Optional)</h4>
                  <input
                    type="text"
                    placeholder={`Default: ${generateDefaultName()}`}
                    value={creativeName}
                    onChange={(e) => setCreativeName(e.target.value)}
                    className="w-full bg-[#333] border border-[#444] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-gray-400 focus:outline-none"
                  />
                  <p className="text-gray-500 text-xs mt-2">
                    Custom name for your creative. Leave blank for auto-generated name.
                  </p>
                    </div>

                    {/* Generate Button */}
                <div className="flex gap-4">
                    <Button
                      disabled={!uploadedImage || isGenerating || usageData.current >= WEEKLY_LIMIT}
                    className={`flex-1 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${
                      usageData.current >= WEEKLY_LIMIT 
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white cursor-not-allowed' 
                        : 'bg-gradient-to-r from-white to-gray-200 hover:from-gray-200 hover:to-gray-300 text-black'
                    } border-0`}
                      onClick={generateImageFromModal}
                    >
                      {usageData.current >= WEEKLY_LIMIT ? (
                        <>
                          🚫 Usage Limit Reached
                        </>
                      ) : isGenerating ? (
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

                    {!uploadedImage && usageData.current < WEEKLY_LIMIT && (
                    <div className="flex-1 flex items-center justify-center text-center py-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                      <p className="text-gray-400 text-sm">Upload a product image first</p>
                      </div>
                    )}
                    
                    {usageData.current >= WEEKLY_LIMIT && (
                      <div className="flex-1 flex items-center justify-center text-center py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-sm">Weekly limit reached • Resets in {getDaysUntilReset()}d</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </div>
      )}

      {/* No full screen loading modal - loading will show in the widget */}

      {/* Retry Issue Selection Modal */}
      {showRetryModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[999999] p-4 overflow-hidden"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRetryModal(false)
              setRetryImage(null)
            }
          }}
        >
            <div 
              className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-2xl border border-[#333] max-w-md w-full shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between bg-gradient-to-r from-[#222] to-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-orange-400/20 rounded-lg flex items-center justify-center">
                    <RotateCcw className="w-4 h-4 text-orange-400" />
      </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Retry Creative</h2>
                    <p className="text-gray-400 text-xs">What went wrong?</p>
    </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowRetryModal(false)
                    setRetryImage(null) // Clear retry image when closing modal
                  }}
                  className="bg-transparent border-[#444] text-gray-300 hover:bg-[#333] hover:text-white h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-6">
                {/* Image Upload Section */}
                <div className="mb-6 p-4 bg-gradient-to-br from-[#252525] to-[#1e1e1e] border border-[#333] rounded-lg">
                  <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Re-upload Product Image
                  </h3>
                  <p className="text-gray-400 text-xs mb-3">
                    Upload the same product image used for the original creative
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleRetryImageUpload}
                        className="hidden"
                      />
                      <div className="p-3 bg-gradient-to-br from-[#2a2a2a] to-[#222] border border-[#444] rounded-lg hover:border-[#555] transition-colors text-center">
                        <div className="flex items-center justify-center gap-2 text-gray-300">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Choose Image</span>
                        </div>
                      </div>
                    </label>
                    
                    {retryImage && (
                      <div className="flex items-center gap-2 text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs">{retryImage.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-gray-300 text-sm mb-4">
                  Select what went wrong with the previous generation so we can fix it:
                </p>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {RETRY_ISSUES.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => {
                        if (!retryImage) {
                          toast.error('Please upload the product image first!')
                          return
                        }
                        retryCreativeWithIssue(issue.id)
                      }}
                      disabled={!retryImage}
                      className={`w-full p-4 text-left bg-gradient-to-br from-[#222] to-[#1e1e1e] border border-[#333] rounded-lg transition-all duration-200 group ${
                        retryImage 
                          ? 'hover:border-orange-400/50 hover:from-[#252525] hover:to-[#212121] cursor-pointer hover:shadow-lg' 
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-1 transition-colors ${
                          retryImage 
                            ? 'bg-orange-400 group-hover:bg-orange-300' 
                            : 'bg-gray-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm mb-1">{issue.label}</p>
                          <p className="text-gray-400 text-xs leading-relaxed">
                            {issue.id === 'distorted-text' && 'Text, logos, or graphics were unclear or distorted'}
                            {issue.id === 'neck-tag-distortion' && 'Neck tag text was blurry, distorted, or illegible'}
                            {issue.id === 'distorted-graphics' && 'Graphics, logos, or visual elements were distorted'}
                            {issue.id === 'fake-tags' && 'AI created fake tags or text that weren\'t in the original image'}
                            {issue.id === 'wrong-colors' && 'Colors didn\'t match the original product'}
                            {issue.id === 'poor-positioning' && 'Product was poorly positioned or sized'}
                            {issue.id === 'artificial-look' && 'Image looked too AI-generated or fake'}
                            {issue.id === 'missing-details' && 'Important details were missing from the original'}
                            {issue.id === 'shape-distortion' && 'Clothing shape, sleeves, or silhouette was incorrect'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-[#333]">
                  <p className="text-gray-500 text-xs text-center">
                    We'll regenerate your creative with special focus on fixing the selected issue.
                  </p>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Interactive Crop Modal */}
      {showCropModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[999999] p-4"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCropModal(false)
            }
          }}
        >
          <div 
            className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-2xl border border-[#333] max-w-2xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#333] flex items-center justify-between bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-lg flex items-center justify-center">
                  <Crop className="w-4 h-4 text-gray-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Crop Image</h2>
                  <p className="text-gray-400 text-xs">Drag the edges to adjust framing</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCropModal(false)}
                className="bg-transparent border-[#444] text-gray-300 hover:bg-[#333] hover:text-white h-8 w-8 p-0 transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Interactive Crop Area */}
            <div className="px-6 py-6">
              <div 
                className="crop-container relative mx-auto bg-gray-900 rounded-lg overflow-hidden border border-gray-700"
                style={{ width: '400px', height: '400px' }}
              >
                <img 
                  src={cropImageUrl} 
                  alt="Crop preview" 
                  className="w-full h-full object-contain"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement
                    const container = document.querySelector('.crop-container') as HTMLElement
                    if (container) {
                      // Calculate crop area to fit the actual image dimensions
                      const imageCropArea = calculateImageCropArea(img, container)
                      setCropArea(imageCropArea)
                    }
                    setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
                  }}
                />
                


                {/* Crop Selection Area */}
                <div 
                  className="absolute border border-white/80 pointer-events-none group transition-all duration-200 hover:border-white"
                  style={{
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    width: `${cropArea.width}%`,
                    height: `${cropArea.height}%`,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.1)'
                  }}
                >
                  {/* Subtle corner indicators */}
                  <div className="absolute w-3 h-3 border-l border-t border-white/60 top-1 left-1" />
                  <div className="absolute w-3 h-3 border-r border-t border-white/60 top-1 right-1" />
                  <div className="absolute w-3 h-3 border-l border-b border-white/60 bottom-1 left-1" />
                  <div className="absolute w-3 h-3 border-r border-b border-white/60 bottom-1 right-1" />

                  {/* Modern edge handles */}
                  {/* Top edge handle */}
                  <div 
                    className="absolute bg-white/20 backdrop-blur-sm border border-white/40 cursor-ns-resize transition-all duration-200 hover:bg-white/30 hover:border-white/60 hover:shadow-lg"
                    style={{
                      top: '-6px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '40px',
                      height: '4px',
                      borderRadius: '2px'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'top')}
                  />
                  
                  {/* Bottom edge handle */}
                  <div 
                    className="absolute bg-white/20 backdrop-blur-sm border border-white/40 cursor-ns-resize transition-all duration-200 hover:bg-white/30 hover:border-white/60 hover:shadow-lg"
                    style={{
                      bottom: '-6px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '40px',
                      height: '4px',
                      borderRadius: '2px'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                  />
                  
                  {/* Left edge handle */}
                  <div 
                    className="absolute bg-white/20 backdrop-blur-sm border border-white/40 cursor-ew-resize transition-all duration-200 hover:bg-white/30 hover:border-white/60 hover:shadow-lg"
                    style={{
                      left: '-6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '40px',
                      borderRadius: '2px'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'left')}
                  />
                  
                  {/* Right edge handle */}
                  <div 
                    className="absolute bg-white/20 backdrop-blur-sm border border-white/40 cursor-ew-resize transition-all duration-200 hover:bg-white/30 hover:border-white/60 hover:shadow-lg"
                    style={{
                      right: '-6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '40px',
                      borderRadius: '2px'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'right')}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-[#333] flex gap-3">
              {originalImageUrls[cropCreativeId] && (
                <Button
                  variant="outline"
                  onClick={handleUndoCrop}
                  className="flex-1 bg-gray-800/50 border-gray-600/50 text-gray-300 hover:bg-gray-700/70 hover:border-gray-500 transition-all duration-200"
                >
                  Undo Changes
                </Button>
              )}
              <Button
                onClick={handleApplyCrop}
                className="flex-1 bg-white hover:bg-gray-100 text-black border-0 font-medium transition-all duration-200 hover:shadow-lg"
              >
                Apply Crop
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}