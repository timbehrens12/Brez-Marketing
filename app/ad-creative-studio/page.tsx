"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GridOverlay } from '@/components/GridOverlay'
import { Upload, Image as ImageIcon, Sparkles, Loader2, ChevronLeft, ChevronRight, Info, Plus, Trash2, Download, X, Building2, FlaskConical, Palette, RotateCcw, Crop } from 'lucide-react'
import { toast } from 'sonner'
import { useBrandContext } from '@/lib/context/BrandContext'
import { useUser } from '@clerk/nextjs'
import { useAgency } from "@/contexts/AgencyContext"

// Image compression utility
const compressImage = async (file: File, maxSizeMB: number = 2): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions to maintain aspect ratio
      const maxWidth = 1024
      const maxHeight = 1024
      let { width, height } = img
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      
      // Try different quality levels until we get under the size limit
      let quality = 0.8
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }
          
          const sizeMB = blob.size / (1024 * 1024)
          // console.log(`🗜️ Compressed image: ${sizeMB.toFixed(2)}MB at quality ${quality}`)
          
          if (sizeMB <= maxSizeMB) {
            // Convert to base64
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error('Failed to read compressed image'))
            reader.readAsDataURL(blob)
          } else if (quality <= 0.1) {
            // Failed to compress enough - reject with specific error
            reject(new Error(`Image is too large even after maximum compression. Final size: ${sizeMB.toFixed(2)}MB. Please use a smaller image or crop the image before uploading.`))
          } else {
            // Reduce quality and try again
            quality -= 0.1
            tryCompress()
          }
        }, 'image/jpeg', quality)
      }
      
      tryCompress()
    }
    
    img.onerror = () => reject(new Error('Failed to load image for compression'))
    
    // Create object URL for the image
    img.src = URL.createObjectURL(file)
  })
}

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
    promptAddition: 'CRITICAL FIX: The previous generation had poor positioning or sizing. PERFECT CENTERING REQUIRED: Ensure the product/clothing item is PRECISELY CENTERED both horizontally and vertically. The item must be EXACTLY in the center with equal spacing from all edges. NO off-center positioning, tilting, or uneven placement allowed. Size appropriately (85-90% of frame width), and position naturally with realistic contact points. For pedestal/platform shots, the product must be PERFECTLY CENTERED on the platform with symmetrical placement.'
  },
  {
    id: 'off-center-product',
    label: 'Product Off-Center',
    promptAddition: 'CRITICAL FIX: The previous generation had the product positioned off-center or shifted to one side. MANDATORY PERFECT CENTERING: The product must be EXACTLY centered both horizontally and vertically in the frame. Measure equal distances from all edges to ensure perfect symmetrical placement. For pedestal/platform templates, the product must sit PRECISELY in the center of the platform with no shifting, tilting, or asymmetrical positioning. Use mathematical precision for centering - the product should be equidistant from left/right edges and top/bottom edges.'
  },
  {
    id: 'wrong-tilt-direction',
    label: 'Wrong Tilt Direction',
    promptAddition: 'CRITICAL FIX: The previous generation had the product tilted in the wrong direction. For angled backgrounds, the clothing MUST be tilted exactly 20 degrees CLOCKWISE (leaning to the RIGHT side of the image), never counterclockwise or to the left. The product should clearly lean to the right.'
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
    promptAddition: 'CRITICAL FIX: The previous generation had incorrect clothing shape or silhouette. Pay ULTRA-CRITICAL attention to preserving the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way.'
  },
  {
    id: 'black-bars-overlay',
    label: 'Black Bars/Overlay Issues',
    promptAddition: 'CRITICAL FIX: The previous generation had unwanted black bars, banners, strips, or overlay elements. ABSOLUTELY ELIMINATE ALL: black bars across the image, dark strips, rectangular backgrounds behind text, frame overlays, black boxing, banner elements, or any solid background shapes. Text must float directly on the image with completely transparent backgrounds. Use only subtle drop shadows or light outlines for text readability. The image must be completely clean and unobstructed by any overlay elements, bars, or geometric shapes.'
  },
      {
      id: 'fabric-hallucination',
      label: 'Fabric/Detail Hallucinations',
      promptAddition: 'CRITICAL FIX: The previous generation hallucinated or invented clothing details that weren\'t in the original. STRICT REALITY CHECK: Only reproduce fabric textures, patterns, seams, stitching, pockets, buttons, zippers, and design elements that ACTUALLY EXIST in the source image. DO NOT add imaginary fabric details, fake textures, invented patterns, fictional seams, or non-existent design elements. Copy only what is genuinely visible in the original product photo with 100% accuracy. No creative interpretation or enhancement of fabric details allowed.'
    },
    {
      id: 'distant-text-distortion',
      label: 'Distant/Small Text Distorted',
      promptAddition: 'CRITICAL FIX: The previous generation had text distortion when the product appeared smaller or more distant in the frame. DISTANCE-IMMUNE TEXT PRESERVATION: You are working from the SAME high-quality close-up source image regardless of composition distance. MANDATORY PRINCIPLE: Text quality is INDEPENDENT of product size in composition - whether the product fills the frame or appears small/distant, preserve ALL text with IDENTICAL crystal-clear sharpness. SUPER-RESOLUTION DISTANT TEXT PROTOCOL: When the product appears smaller in the composition, apply ENHANCED text preservation as if viewing the product through a magnifying glass. CRITICAL: The source image resolution and text clarity does NOT degrade just because the composition shows the product at a distance. ZOOM-LEVEL COMPENSATION: Mentally zoom into the product area and preserve text at maximum fidelity regardless of compositional distance. ABSOLUTE REQUIREMENT: Distant product text must be as sharp and readable as close-up product text - there is NO excuse for distance-based text degradation.'
    }
]

const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates' },
  { id: 'clothing-backgrounds', name: 'Clothing: Backgrounds' },
  { id: 'clothing-environments', name: 'Clothing: Environments' },
  { id: 'clothing-models', name: 'Clothing: With Models' },
  { id: 'products', name: 'Physical Products' }
]

// Clothing subcategory mapping
const CLOTHING_SUBCATEGORIES = {
  // Background/Surface templates
  'backgrounds': [
    'concrete-floor', 'black-background', 'white-background', 'asphalt-surface', 
    'sidewalk-pavement', 'concrete-floor-angled',
    'asphalt-surface-angled', 'sidewalk-pavement-angled', 'black-background-angled',
    'white-background-angled', 'wooden-tabletop', 'cotton-sheet', 'marble-surface',
    'beach-sand', 'kraft-paper', 'gym-mat'
  ],
  
  // Environment/Setting templates  
  'environments': [
    'forest-branch-hanger', 'backyard-clothesline', 'bed-morning-light', 
    'luxury-closet-island', 'gallery-wall-mount', 'hologram-sci-fi',
    'hanger-studio', 'mannequin-spotlight', 'suspended-clothespins', 'modern-chair',
    'flat-lay-accessories', 'mirror-reflection', 'pedestal-cube', 'industrial-rack',
    'floating-oak-shelf', 'clothing_balloon_float', 'clothing_shadow_art',
    'clothing_vintage_trunk', 'clothing_floating_water',
    'clothing_warehouse_beam', 'desert_mannequin', 'warehouse_podium'
  ],
  
  // Model-based templates
  'models': [
    'white-studio-pants', 'white-studio-torso',
    'model_gym_fitness', 'model_garage_street', 'model_runway_solo', 
    'model_city_crosswalk', 'model_loft_apartment', 'model_beach_sunset',
    'model_skater_park', 'model_yoga_studio', 'model_office_casual',
    'model_boxing_gym', 'model_urban_night'
  ]
}

// Helper function to determine if a template belongs to a clothing subcategory
const getClothingSubcategory = (templateId: string) => {
  for (const [subcategory, templates] of Object.entries(CLOTHING_SUBCATEGORIES)) {
    if (templates.includes(templateId)) {
      return subcategory
    }
  }
  return null
}

// Creative type definitions for the progressive flow
const CREATIVE_TYPES = [
  {
    id: 'clothing',
    name: 'Clothing',
    description: 'Professional clothing displays with models, backgrounds, and environments',
    icon: '👕',
    hasSubcategories: true
  },
  {
    id: 'physical-products',
    name: 'Physical Products',
    description: 'Perfect for non-clothing items like accessories, gadgets, and more',
    icon: '📦',
    subcategories: ['product-studio-white', 'glossy-black-pedestal', 'marble-kitchen-counter', 'hand-held-product', 'glass-cube-display', 'wooden-crate-warehouse', 'forest-floor-natural', 'spa-bathtub-edge', 'floating-clouds-ethereal', 'concrete-podium-harsh', 'water-reflection-hover', 'kitchen-table-morning', 'neon-product-shelf', 'crystal-museum-case', 'floating-motion-blur', 'desert-rock-golden-hour', 'rustic-desk-flatlay', 'futuristic-tech-lab', 'rotating-display-platform', 'freezer-cold-storage', 'cracked-glass-industrial', 'rustic-cafe-table', 'unboxing-desk-setup']
  },
  {
    id: 'multiproducts',
    name: 'Multi-Products',
    description: 'Combine multiple products into one creative showcase',
    icon: '🔄',
    subcategories: ['multi-product-template']
  },
  {
    id: 'custom-template',
    name: 'Custom Template',
    description: 'Create your own completely custom template with full prompt control',
    icon: '⚡',
    subcategories: ['custom-template']
  },
  {
    id: 'copy',
    name: 'Copy',
    description: 'Generate compelling ad copy and text content for your campaigns',
    icon: '✍️',
    subcategories: ['copy-generation']
  },
  {
    id: 'auto',
    name: 'Auto',
    description: 'Let AI pick the best template for you based on your product and optimize for maximum performance',
    icon: '🤖',
    subcategories: ['auto-generation']
  }
]

// Clothing subcategory definitions
const CLOTHING_SUB_TYPES = [
  {
    id: 'clothing-models',
    name: 'Models',
    description: 'Show your clothing on professional models in various settings',
    icon: '👤',
    subcategories: CLOTHING_SUBCATEGORIES.models
  },
  {
    id: 'clothing-backgrounds',
    name: 'Backgrounds',
    description: 'Display clothing on clean, professional backgrounds',
    icon: '🎨',
    subcategories: CLOTHING_SUBCATEGORIES.backgrounds
  },
  {
    id: 'clothing-environments',
    name: 'Environments',
    description: 'Showcase clothing in creative environmental settings',
    icon: '🌍',
    subcategories: CLOTHING_SUBCATEGORIES.environments
  }
]

// Template base groups for carousel functionality  
const TEMPLATE_BASE_GROUPS = [
  // NEW CLOTHING TEMPLATES
  'forest-branch-hanger',
  'backyard-clothesline',
  'bed-morning-light',
  'luxury-closet-island',
  'gallery-wall-mount',
  'hologram-sci-fi',
  
  // NEW MODEL BASED CLOTHING TEMPLATES  
  'white-studio-pants',
  'white-studio-torso',
  'model_gym_fitness',
  'model_garage_street',
  'model_runway_solo',
  'model_city_crosswalk',
  'model_loft_apartment',
  'model_beach_sunset',
  'model_skater_park',
  'model_yoga_studio',
  'model_office_casual',
  'model_boxing_gym',
  'model_urban_night',
  
  // CREATIVE ARTISTIC CLOTHING DISPLAYS
  'clothing_balloon_float',
  'clothing_shadow_art',
  'clothing_vintage_trunk',
  'clothing_floating_water',
  'clothing_warehouse_beam',
  
  // DESERT AND OUTDOOR DISPLAYS
  'desert_mannequin',
  'warehouse_podium',
  
  // EXISTING CLOTHING TEMPLATES
  'concrete-floor',
  'black-background', 
  'white-background',
  'asphalt-surface',
  'sidewalk-pavement',
  'hanger-studio',
  'mannequin-spotlight',
  'suspended-clothespins',
  'modern-chair',
  'flat-lay-accessories',
  'mirror-reflection',
  'pedestal-cube',
  'industrial-rack',
  'floating-oak-shelf',
  'wooden-tabletop',
  'cotton-sheet',
  'marble-surface',
  'beach-sand',
  'kraft-paper',
  'gym-mat',
  
  // EXISTING PRODUCT TEMPLATES
  'product-studio-white',
  'glossy-black-pedestal',
  'marble-kitchen-counter',
  'hand-held-product',
  'glass-cube-display',
  'wooden-crate-warehouse',
  'forest-floor-natural',
  'spa-bathtub-edge',
  'floating-clouds-ethereal',
  'concrete-podium-harsh',
  'water-reflection-hover',
  'kitchen-table-morning',
  'neon-product-shelf',
  'crystal-museum-case',
  'floating-motion-blur',
  'desert-rock-golden-hour',
  'rustic-desk-flatlay',
  'futuristic-tech-lab',
  'rotating-display-platform',
  'freezer-cold-storage',
  'cracked-glass-industrial',
  
  // NEW PRODUCT TEMPLATES
  'rustic-cafe-table',
  'seamless-white-cube',
  'unboxing-desk-setup'
]

const STYLE_OPTIONS: StyleOption[] = [
  // CUSTOM TEMPLATE - User-defined
  {
    id: 'custom-template',
    name: 'Custom Template',
    description: 'Create your own completely custom template with full prompt control',
    thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI2NyIgdmlld0JveD0iMCAwIDIwMCAyNjciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiZ0dyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMkEyQTJBIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMUUxRTFFIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyNjciIGZpbGw9InVybCgjYmdHcmFkaWVudCkiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAsIDEzMykiPjxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjUgNSIvPjxzdmcgeD0iLTEyIiB5PSItMTIiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMEI5ODEiIHN0cm9rZS13aWR0aD0iMiI+PHBhdGggZD0iTTExIDRhMiAyIDAgMCAxIDQgMHYxYTEgMSAwIDAgMCAxIDFoM2ExIDEgMCAwIDEgMSAxdjNhMSAxIDAgMCAxLTEgMWgtMWEyIDIgMCAwIDAtNCAwaDFhMSAxIDAgMCAxIDEgMXYzYTEgMSAwIDAgMS0xIDFoLTNhMSAxIDAgMCAxLTEtMXYtMWEyIDIgMCAwIDEtNC0waDF2M2ExIDEgMCAwIDEtMSAxSDdhMSAxIDAgMCAxLTEtMXYtM2ExIDEgMCAwIDEgMS0xaDFhMiAyIDAgMCAwIDQtMEg3YTEgMSAwIDAgMS0xLTFWN2ExIDEgMCAwIDEgMS0xaDNhMSAxIDAgMCAxIDEtMXYtMXoiLz48L3N2Zz48L2c+PHRleHQgeD0iMTAwIiB5PSIyMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNBQUEiIGZvbnQtc2l6ZT0iMTYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iNjAwIj5DVVNUT008L3RleHQ+PHRleHQgeD0iMTAwIiB5PSIyNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxMEI5ODEiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5UZW1wbGF0ZTwvdGV4dD48L3N2Zz4=', // Custom SVG placeholder1 would work but what templates would we even make for multiple products??
    
    category: 'all',
    goodFor: 'Any product - you have full creative control',
    prompt: 'CUSTOM_TEMPLATE_PLACEHOLDER' // This will be replaced with user's custom prompt
  },
  // MULTI-PRODUCT TEMPLATE - For combining multiple items into one creative
  {
    id: 'multi-product-showcase',
    name: 'Multi-Product Showcase',
    description: 'Display multiple clothing items extracted from separate images in one elegant creative',
    thumbnail: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI2NyIgdmlld0JveD0iMCAwIDIwMCAyNjciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJiZ0dyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMkEyQTJBIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMUUxRTFFIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyNjciIGZpbGw9InVybCgjYmdHcmFkaWVudCkiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDAsIDEzMykiPjxjaXJjbGUgY3g9IjAiIGN5PSIwIiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjUgNSIvPjxzZXJnIHg9Ii00MCIgeT0iLTQwIiB3aWR0aD0iODAiIGhlaWdodD0iODAiIGZpbGw9IiM0NDQiIG9wYWNpdHk9IjAuMyIvPjx0ZXh0IHg9IjEwMCIgeT0iMjMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjQUFBIiBmb250LXNpemU9IjE2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjYwMCI+TVVMVElfPC90ZXh0Pjx0ZXh0IHg9IjEwMCIgeT0iMjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMTBCOTgxIiBmb250LXNpemU9IjEyIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiI+UHJvZHVjdDwvdGV4dD48L2c+PHRleHQgeD0iMTAwIiB5PSIyNzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxMEI5ODEiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIj5TaG93Y2FzZTwvdGV4dD48L3N2Zz4=',

    category: 'all',
    goodFor: 'Multiple clothing items, fashion collections, product showcases',
    prompt: 'Create a stunning multi-product fashion showcase by extracting and arranging multiple clothing items from the provided images. Display each item professionally with consistent styling, lighting, and background. Arrange them in an elegant, cohesive layout that highlights each piece while creating a unified fashion presentation. Ensure each clothing item is perfectly isolated from its original background and presented with premium quality. Use sophisticated styling that makes the entire collection look like a high-end fashion editorial spread.'
  },
  // NEW CLOTHING TEMPLATES - Latest additions
  {
    id: 'forest-branch-hanger',
    name: 'Forest Branch Hanger',
    description: 'Product suspended on wooden hanger between tree branches in sunlit forest clearing',
    thumbnail: 'https://i.imgur.com/wUZYU4E.png',
    category: 'clothing',
    goodFor: 'Shirts, pants, shorts, hoodies, jackets, hats',
    prompt: 'Display this exact clothing item suspended on a wooden hanger between two thin tree branches in a sunlit forest clearing with dappled sunlight and soft leaves underfoot. FOREST SETTING: Create an authentic forest clearing with natural lighting filtering through tree canopy. The environment should feel peaceful and naturally beautiful. TREE BRANCH SUSPENSION: Suspend the wooden hanger between two realistic tree branches that extend into the frame from either side. The branches should look natural with bark texture and slight variations. WOODEN HANGER: Use a natural wood hanger with visible grain and organic shape. The hanger should complement the forest environment and look like it belongs in nature. DAPPLED SUNLIGHT: Create beautiful dappled lighting effects as sunlight filters through leaves above. The light should create natural patterns of light and shadow on the clothing and forest floor. SOFT LEAVES UNDERFOOT: Include a natural carpet of fallen leaves beneath the hanging garment. The leaves should look authentic with natural colors and realistic placement. NATURAL DRAPING: The clothing should hang naturally from the hanger with realistic fabric behavior and gravity effects. All fabric folds and draping should look authentic. FOREST ATMOSPHERE: The overall mood should be serene, natural, and harmonious with the outdoor environment. Perfect for outdoor brands or natural lifestyle aesthetics. ORGANIC LIGHTING: Use natural outdoor lighting that feels authentic to a forest environment - soft, diffused, and naturally directional. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the natural forest presentation.'
  },
  {
    id: 'backyard-clothesline',
    name: 'Backyard Clothesline',
    description: 'Product clipped to natural twine clothesline in suburban backyard with gentle wind',
    thumbnail: 'https://i.imgur.com/pWNO016.png',
    category: 'clothing',
    goodFor: 'Shirts, pants, shorts, hoodies, jackets, hats',
    prompt: 'Display this exact clothing item clipped to a natural twine clothesline in a suburban backyard with gentle wind effects and warm sunlight. SUBURBAN BACKYARD: Create a comfortable, lived-in backyard environment that feels authentic and homey. Include subtle hints of domestic life without overwhelming the clothing focus. NATURAL TWINE CLOTHESLINE: Use authentic natural twine or rope clothesline that looks well-used and realistic. The line should be properly tensioned between supports. CLOTHESPIN ATTACHMENT: Attach the clothing using natural wooden clothespins positioned realistically. The clips should hold the garment naturally without distorting its shape. GENTLE WIND EFFECTS: Show subtle wind movement in the fabric - gentle billowing or natural movement that makes the clothing look alive and dynamic. WARM SUNLIGHT: Use natural, warm sunlight that creates an inviting domestic atmosphere. The lighting should feel like a pleasant afternoon. NATURAL MOVEMENT: The clothing should appear to be gently moving in a light breeze, with realistic fabric physics and natural draping effects. DOMESTIC COMFORT: The overall mood should evoke comfort, home, and everyday life - perfect for casual wear and lifestyle branding. AUTHENTIC DETAILS: Include realistic details like natural wear on the clothesline, authentic clothespin placement, and genuine backyard elements. LIFESTYLE AESTHETIC: The presentation should feel like a real moment captured in everyday life, not overly styled or artificial. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the authentic backyard clothesline presentation.'
  },
  {
    id: 'bed-morning-light',
    name: 'Bed Morning Light',
    description: 'Product laid flat on neatly made bed with throw pillows and soft morning light',
    thumbnail: 'https://i.imgur.com/Q5guyae.png',
    category: 'clothing',
    goodFor: 'Shirts, pants, shorts, hoodies, jackets, hats',
    prompt: 'Display this exact clothing item laid flat on a neatly made bed with throw pillows and soft natural morning light from a nearby window. NEATLY MADE BED: Create a well-made bed with clean, smooth bedding in neutral tones. The bed should look inviting and professionally styled. THROW PILLOWS: Include 2-3 decorative throw pillows arranged naturally on the bed. Pillows should complement the overall aesthetic without competing with the clothing. FLAT LAY POSITIONING: Position the clothing item laid flat and naturally arranged on the bed surface. The garment should look like it was carefully placed but not overly styled. SOFT MORNING LIGHT: Use gentle, warm morning light streaming through a nearby window. The light should be soft and diffused, creating a peaceful morning atmosphere. WINDOW LIGHTING: The natural light should feel authentic to early morning - warm, gentle, and naturally directional from one side of the frame. NATURAL FABRIC BEHAVIOR: The clothing should rest naturally on the bedding with realistic contact points and authentic fabric draping. BEDROOM ATMOSPHERE: Create a serene, comfortable bedroom environment that feels lived-in and welcoming. Perfect for loungewear, sleepwear, or lifestyle brands. LIFESTYLE CONTEXT: The setting should suggest comfort, relaxation, and morning routines - making the clothing feel like part of everyday luxury. NATURAL STYLING: Arrange all elements naturally, as if capturing a real moment in a beautiful bedroom during morning hours. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the serene bedroom morning presentation.'
  },
  {
    id: 'luxury-closet-island',
    name: 'Luxury Closet Island',
    description: 'Product laid on wooden closet island in center of luxury walk-in closet',
    thumbnail: 'https://i.imgur.com/TdP81fH.png',
    category: 'clothing',
    goodFor: 'Shirts, pants, shorts, hoodies, jackets, hats',
    prompt: 'Display this exact clothing item elegantly laid on a wooden closet island in the center of a luxury walk-in closet with organized shelving, mirrors, and sophisticated lighting. LUXURY WALK-IN CLOSET: Create an upscale walk-in closet environment with high-end finishes, organized shelving, and premium materials. The space should feel sophisticated and aspirational. WOODEN CLOSET ISLAND: Feature a beautiful wooden closet island in the center - rich, polished wood surface that serves as both storage and display. The island should have drawers and elegant hardware. ELEGANT PLACEMENT: Position the clothing item carefully laid flat on the wooden island surface, as if just placed there during a styling session or wardrobe selection. CLOSET SHELVING: Include organized shelves with subtle hints of luxury items - shoes, accessories, or folded garments in the background, all tastefully arranged. MIRRORS: Incorporate mirrors into the closet design to add depth and luxury feel. Mirrors should enhance the space without creating distracting reflections. SOFT LIGHTING: Use sophisticated lighting - recessed ceiling lights or elegant pendant fixtures that create even, luxurious illumination highlighting both the clothing and wood grain. PREMIUM MATERIALS: Show high-end closet materials like rich wood finishes, chrome fixtures, marble accents, or leather details that suggest luxury and quality. ORGANIZED LUXURY: The closet should appear meticulously organized and designed, like a high-end boutique or celebrity closet. NATURAL DISPLAY: The clothing should appear naturally placed on the island, suggesting an intimate moment of wardrobe selection. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the luxury closet island presentation.'
  },
  {
    id: 'gallery-wall-mount',
    name: 'Gallery Wall Mount',
    description: 'Product mounted flat on minimalist gallery wall under spotlights with museum placard',
    thumbnail: 'https://i.imgur.com/x9YltiV.png',
    category: 'clothing',
    goodFor: 'Shirts, pants, shorts, hoodies, jackets, hats',
    prompt: 'Display this exact clothing item mounted flat on a minimalist gallery wall under overhead spotlights with a small museum placard nearby. MINIMALIST GALLERY WALL: Create a clean, white gallery wall with perfect smoothness and professional museum-quality finish. The wall should be pristine and uncluttered. FLAT WALL MOUNTING: Mount the clothing item flat against the wall as if it\'s a piece of art. The garment should appear to be professionally displayed like a museum artifact. OVERHEAD SPOTLIGHTS: Use focused spotlights from above that dramatically illuminate the clothing. The lighting should be precise and gallery-quality with controlled shadows. MUSEUM PLACARD: Include a small, elegant museum-style placard positioned near the clothing. The placard should be subtle and professional, suggesting the garment\'s importance. GALLERY ATMOSPHERE: Create the sophisticated atmosphere of a contemporary art gallery or fashion museum. The environment should feel curated and artistic. ARTISTIC PRESENTATION: The clothing should be presented as art - elevated beyond mere fashion to something culturally significant and worthy of museum display. PRECISE LIGHTING: Use museum-quality lighting that perfectly illuminates the garment while creating dramatic shadows and highlighting textures. CULTURAL ELEVATION: The presentation should suggest that this clothing piece is worthy of artistic consideration and cultural preservation. PROFESSIONAL CURATION: Every element should feel professionally curated and intentionally placed, like a high-end fashion exhibition. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the museum gallery presentation.'
  },
  {
    id: 'hologram-sci-fi',
    name: 'Hologram Sci-Fi',
    description: 'Product projected as 3D hologram above sci-fi podium with glowing blue light and particle effects',
    thumbnail: 'https://i.imgur.com/nXXz0Xk.png',
    category: 'clothing',
    goodFor: 'Shirts, pants, shorts, hoodies, jackets, hats',
    prompt: 'Display this exact clothing item projected as a 3D hologram above a sci-fi podium with glowing blue light, particle effects, and digital distortion. SCI-FI PODIUM: Create a futuristic podium or platform with sleek, technological design. The base should look advanced with subtle glowing elements and modern materials. 3D HOLOGRAM EFFECT: Present the clothing as a realistic hologram projection - semi-transparent with subtle digital distortion effects that make it look authentically holographic. GLOWING BLUE LIGHT: Use predominantly blue lighting with digital glows and technological ambiance. The lighting should feel futuristic and high-tech. PARTICLE EFFECTS: Include subtle digital particle effects around the hologram - floating pixels, light particles, or energy distortions that enhance the sci-fi atmosphere. DIGITAL DISTORTION: Add realistic holographic distortion effects - subtle scan lines, digital artifacts, or projection imperfections that make the hologram look authentic. FUTURISTIC ENVIRONMENT: Create a clean, high-tech environment that suggests advanced technology and innovation. Think space-age laboratory or future retail. TECHNOLOGICAL PRECISION: The hologram should look precise and high-tech, suggesting advanced projection technology and scientific innovation. ENERGY EFFECTS: Include subtle energy effects - glowing edges on the clothing, light emanation, or digital aura that suggests the projection technology. INNOVATION AESTHETIC: The overall mood should suggest cutting-edge technology, innovation, and future fashion concepts. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the futuristic hologram presentation.'
  },
  {
    id: 'white-studio-pants',
    name: 'White Studio Pants',
    description: 'Model wearing pants with hands in pockets in clean white studio environment',
    thumbnail: 'https://i.imgur.com/9de2uVn.png',
    category: 'clothing',
    goodFor: 'Pants, jeans, trousers, bottoms, legwear, casual wear',
    prompt: 'Photograph this exact clothing item worn by a model with hands casually placed in pockets within a clean white studio environment with professional fashion lighting. FULL BODY COMPOSITION: Frame the shot to show the model from approximately waist down to feet, focusing on how the pants fit and drape on the lower body. HANDS IN POCKETS: Position the model\'s hands naturally in the pants pockets, creating a relaxed, casual pose that shows the pocket placement and overall fit. MODEL PRESENTATION: Use an attractive model with good posture and natural stance, showing the clothing\'s fit authentically without revealing the face - focus should remain on the garment. WHITE STUDIO BACKGROUND: Create a seamless, pure white studio background that is clean and professional, typical of high-end fashion photography. PROFESSIONAL LIGHTING: Use soft, even studio lighting that eliminates harsh shadows while showing fabric texture, seams, and garment details clearly. No dramatic shadows or contrast. NATURAL FIT: Show how the pants fit naturally on a real person, including proper leg draping, waist fit, and any design details like pockets, seams, or styling elements. CASUAL POSE: The hands-in-pockets pose should look natural and relaxed, showcasing both the pocket functionality and the overall silhouette of the pants. FASHION QUALITY: The image should meet professional fashion photography standards with sharp focus, proper exposure, and clean presentation. STUDIO AESTHETIC: Maintain the clean, minimalist aesthetic of professional fashion studio photography. CRITICAL: Preserve ALL original clothing details including colors, textures, materials, patterns, logos, and construction elements with perfect accuracy while creating the white studio pants presentation.'
  },
  {
    id: 'white-studio-torso',
    name: 'White Studio Torso',
    description: 'Torso shot of model wearing the top in clean white studio environment',
    thumbnail: 'https://i.imgur.com/3uEmRg7.png',
    category: 'clothing',
    goodFor: 'Tops, shirts, blouses, sweaters, jackets, upper body clothing',
    prompt: 'Photograph this exact clothing item worn by a model in a torso shot within a clean white studio environment with professional fashion lighting. TORSO COMPOSITION: Frame the shot from approximately mid-chest to mid-waist, focusing on how the garment fits and drapes on the upper body. MODEL PRESENTATION: Use an attractive model with good posture, showing the clothing\'s fit naturally without revealing the face - focus should remain on the garment. WHITE STUDIO BACKGROUND: Create a seamless, pure white studio background that is clean and professional, typical of high-end fashion photography. PROFESSIONAL LIGHTING: Use soft, even studio lighting that eliminates harsh shadows while showing fabric texture and garment details clearly. No dramatic shadows or contrast. NATURAL FIT: Show how the clothing fits naturally on a real person, including proper draping, silhouette, and any design details like seams, buttons, or patterns. CLEAN COMPOSITION: Keep the composition minimal and focused on the garment, with hands positioned naturally at sides or subtly posed to complement the clothing. FASHION QUALITY: The image should meet professional fashion photography standards with sharp focus, proper exposure, and clean presentation. STUDIO AESTHETIC: Maintain the clean, minimalist aesthetic of professional fashion studio photography. CRITICAL: Preserve ALL original clothing details including colors, textures, materials, patterns, logos, and construction elements with perfect accuracy while creating the white studio torso presentation.'
  },
  {
    id: 'concrete-floor',
    name: 'Concrete Floor',
    description: 'Dark cracked concrete floor with industrial texture',
    thumbnail: 'https://i.imgur.com/ED4tpzf.png',
    category: 'clothing',
    goodFor: 'Shirts, pants, shorts, hoodies, jackets, hats',
    prompt: 'Place this exact clothing item on a realistic concrete surface background, similar to the lighting and texture in high-end fashion editorials. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a medium-toned concrete floor with visible cracks, subtle stains, and natural imperfections - NOT a perfect pristine surface. Include slight dust particles, minor scuff marks, and natural wear patterns that make it look authentically used. The lighting should be soft but directional with subtle variations, casting realistic shadows under the clothing to show it\'s resting on the ground. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand with natural imperfections. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in studio lighting conditions with natural inconsistencies. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. EXTREME BLUE COLOR ACCURACY: If the clothing contains ANY blue colors, tones, or blue-tinted elements, they MUST be preserved with EXACT color fidelity - do not shift hues, change saturation, or alter the blue tones in any way. Blue graphics, logos, or design elements must remain precisely the same shade and intensity. ANTI-DISTORTION PROTECTION: Do not warp, stretch, compress, or geometrically distort ANY part of the clothing - maintain perfect proportional accuracy and shape integrity throughout the entire garment. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'black-background',
    name: 'Black Background',
    description: 'Clean matte black background for dramatic contrast',
    thumbnail: 'https://i.imgur.com/TJO2Jmm.png',
    category: 'clothing',
    goodFor: 'Shirts, pants, shorts, hoodies, jackets, hats',
    prompt: 'Place this exact clothing item on a realistic matte black background, similar to professional product photography setups. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a deep matte black with subtle texture variations - NOT a perfect digital black but with natural imperfections like slight dust particles, minor surface variations, and realistic lighting gradients that make it look authentically photographed. The lighting should be professional but natural, with soft directional light that creates realistic shadows and highlights on the fabric. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric drapes - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface, showing genuine fabric physics. Maintain the natural folds, wrinkles, and garment proportions as if it was carefully placed by hand with natural imperfections. Include subtle ambient reflections and realistic light falloff on the black surface. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in a professional studio with natural lighting inconsistencies and fabric behavior. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'white-background',
    name: 'White Background',
    description: 'Clean white background for minimal, professional look',
    thumbnail: 'https://i.imgur.com/zgCXJwr.png',
    category: 'clothing',
    goodFor: 'Shirts, pants, shorts, hoodies, jackets, hats',
    prompt: 'Place this exact clothing item on a realistic matte white background, similar to high-end e-commerce product photography. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a soft matte white with subtle texture variations - NOT a perfect digital white but with natural imperfections like slight paper grain, minor surface variations, and realistic lighting gradients that make it look authentically photographed on a white backdrop. The lighting should be professional but natural, with soft even illumination that creates realistic shadows and subtle highlights on the fabric without being too harsh or artificial. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface, showing genuine fabric physics and natural draping. Maintain the natural folds, wrinkles, and garment proportions as if it was carefully arranged by hand with natural imperfections. Include subtle cast shadows on the white surface that look naturally photographed. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in a professional studio with natural lighting variations and authentic fabric behavior. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'asphalt-surface',
    name: 'Asphalt Surface',
    description: 'Dark asphalt road texture with realistic street surface',
    thumbnail: 'https://i.imgur.com/mDR8375.jpeg',
    category: 'clothing',
    goodFor: 'Shirts, pants, shorts, hoodies, jackets, hats',
    prompt: 'Place this exact clothing item on a realistic asphalt surface background, similar to urban street photography and streetwear editorials. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a dark gray asphalt road surface with visible texture variations - NOT a perfect smooth surface but with natural imperfections like small pebbles, minor cracks, subtle wear patterns, and realistic asphalt grain that make it look authentically like a real street surface. Include slight dust particles, minor scuff marks, and natural weathering patterns that make it look like genuine asphalt pavement. The lighting should be natural but directional with subtle variations, casting realistic shadows under the clothing to show it\'s resting on the asphalt ground. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the asphalt surface. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand with natural imperfections. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in natural lighting conditions with authentic street surface inconsistencies. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. EXTREME BLUE COLOR ACCURACY: If the clothing contains ANY blue colors, tones, or blue-tinted elements, they MUST be preserved with EXACT color fidelity - do not shift hues, change saturation, or alter the blue tones in any way. Blue graphics, logos, or design elements must remain precisely the same shade and intensity. ANTI-DISTORTION PROTECTION: Do not warp, stretch, compress, or geometrically distort ANY part of the clothing - maintain perfect proportional accuracy and shape integrity throughout the entire garment. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
      {
      id: 'sidewalk-pavement',
      name: 'Sidewalk Pavement',
      description: 'Realistic concrete sidewalk with natural square sections and weathering',
      thumbnail: 'https://i.imgur.com/DKCvPOi.png',
      category: 'clothing',
    goodFor: 'Streetwear, casual clothing, urban fashion',
    prompt: 'Place this exact clothing item on a realistic concrete sidewalk pavement background, similar to authentic urban street photography. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a weathered concrete sidewalk with distinct square sections separated by visible expansion joints and seam lines - exactly like the reference image provided. Include authentic concrete texture with natural aging, slight discoloration between sections, subtle staining, minor surface imperfections, and realistic wear patterns that make it look like a genuine city sidewalk. The concrete should have a natural beige-gray tone with slight color variations between different pavement squares. Add realistic weathering including small cracks within sections, slight settling differences, natural dirt accumulation along seam lines, and authentic urban wear patterns. The lighting should be natural daylight with soft shadows that show the clothing is naturally resting on the pavement surface. Include natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the concrete surface. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand with natural imperfections. The seam lines between concrete sections should be clearly visible and run in a grid pattern, creating authentic sidewalk squares underneath the clothing. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken on an actual city sidewalk with natural lighting and authentic pavement characteristics. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  
  // ANGLED/TILTED VERSIONS - Dynamic positioning variants
  {
    id: 'concrete-floor-angled',
    name: 'Concrete Floor (Angled)',
    description: 'Dark cracked concrete floor with dynamic angled positioning',
    thumbnail: 'https://i.imgur.com/r9ue91a.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, streetwear',
    prompt: 'Place this exact clothing item on a realistic concrete surface background with DYNAMIC ANGLED POSITIONING, similar to the lighting and texture in high-end fashion editorials. The clothing should be positioned at a natural diagonal angle (exactly 20 degrees clockwise) to create visual interest and dynamic composition, as if it was casually placed or naturally settled at an angle. The garment should maintain natural shadows around the edges to reflect realistic depth while being positioned diagonally across the frame. The background should be a medium-toned concrete floor with visible cracks, subtle stains, and natural imperfections - NOT a perfect pristine surface. Include slight dust particles, minor scuff marks, and natural wear patterns that make it look authentically used. The lighting should be soft but directional with subtle variations, casting realistic shadows under the angled clothing to show it\'s resting on the ground. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits at the diagonal angle - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface while maintaining the anged positioning. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand at a natural diagonal angle with natural imperfections. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in studio lighting conditions with natural inconsistencies. CRITICAL NO BARS RULE: DO NOT add any bars, borders, letterboxing, or black/colored strips at the top, bottom, or sides of the image. The concrete background must fill the ENTIRE frame from edge to edge with no gaps, bars, or borders of any kind. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. EXTREME BLUE COLOR ACCURACY: If the clothing contains ANY blue colors, tones, or blue-tinted elements, they MUST be preserved with EXACT color fidelity - do not shift hues, change saturation, or alter the blue tones in any way. Blue graphics, logos, or design elements must remain precisely the same shade and intensity. ANTI-DISTORTION PROTECTION: Do not warp, stretch, compress, or geometrically distort ANY part of the clothing - maintain perfect proportional accuracy and shape integrity throughout the entire garment. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Position the product at a natural diagonal angle (exactly 20 degrees clockwise) in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'black-background-angled',
    name: 'Black Background (Angled)',
    description: 'Clean matte black background with dynamic angled positioning',
    thumbnail: 'https://i.imgur.com/ejph9TU.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Place this exact clothing item on a realistic matte black background with DYNAMIC ANGLED POSITIONING, similar to professional product photography setups. The clothing MUST be positioned at a natural diagonal angle (exactly 20 degrees clockwise - tilting to the RIGHT side of the image) to create visual interest and dynamic composition, as if it was casually placed or naturally settled at an angle. The shirt should clearly lean to the right, never to the left. The garment should maintain natural shadows around the edges to reflect realistic depth while being positioned diagonally across the frame. The background should be a deep matte black with subtle texture variations - NOT a perfect digital black but with natural imperfections like slight dust particles, minor surface variations, and realistic lighting gradients that make it look authentically photographed. The lighting should be professional but natural, with soft directional light that creates realistic shadows and highlights on the angled fabric. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric drapes at the diagonal angle - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface while maintaining the angled positioning, showing genuine fabric physics. Maintain the natural folds, wrinkles, and garment proportions as if it was casually placed by hand at a natural diagonal angle with natural imperfections. Include subtle ambient reflections and realistic light falloff on the black surface. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in a professional studio with natural lighting inconsistencies and fabric behavior. CRITICAL NO BARS RULE: DO NOT add any bars, borders, letterboxing, or black/colored strips at the top, bottom, or sides of the image. The black background must fill the ENTIRE frame from edge to edge with no gaps, bars, or borders of any kind. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Position the product at a natural diagonal angle (exactly 20 degrees clockwise) in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'white-background-angled',
    name: 'White Background (Angled)',
    description: 'Clean white background with dynamic angled positioning',
    thumbnail: 'https://i.imgur.com/AxIZJhK.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, e-commerce',
    prompt: 'Place this exact clothing item on a realistic matte white background with DYNAMIC ANGLED POSITIONING, similar to high-end e-commerce product photography. The clothing should be positioned at a natural diagonal angle (exactly 20 degrees clockwise) to create visual interest and dynamic composition, as if it was casually placed or naturally settled at an angle. The garment should maintain natural shadows around the edges to reflect realistic depth while being positioned diagonally across the frame. The background should be a soft matte white with subtle texture variations - NOT a perfect digital white but with natural imperfections like slight paper grain, minor surface variations, and realistic lighting gradients that make it look authentically photographed on a white backdrop. The lighting should be professional but natural, with soft even illumination that creates realistic shadows and subtle highlights on the angled fabric without being too harsh or artificial. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits at the diagonal angle - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface while maintaining the angled positioning, showing genuine fabric physics and natural draping. Maintain the natural folds, wrinkles, and garment proportions as if it was carefully arranged by hand at a natural diagonal angle with natural imperfections. Include subtle cast shadows on the white surface that look naturally photographed. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in a professional studio with natural lighting variations and authentic fabric behavior. CRITICAL NO BARS RULE: DO NOT add any bars, borders, letterboxing, or white/colored strips at the top, bottom, or sides of the image. The white background must fill the ENTIRE frame from edge to edge with no gaps, bars, or borders of any kind. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Position the product at a natural diagonal angle (exactly 20 degrees clockwise) in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'asphalt-surface-angled',
    name: 'Asphalt Surface (Angled)',
    description: 'Dark asphalt road texture with dynamic angled positioning',
    thumbnail: 'https://i.imgur.com/fpQJ1os.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, streetwear, urban fashion',
    prompt: 'Place this exact clothing item on a realistic asphalt surface background with DYNAMIC ANGLED POSITIONING, similar to urban street photography and streetwear editorials. The clothing should be positioned at a natural diagonal angle (exactly 20 degrees clockwise) to create visual interest and dynamic composition, as if it was casually placed or naturally settled at an angle. The garment should maintain natural shadows around the edges to reflect realistic depth while being positioned diagonally across the frame. The background should be a dark gray asphalt road surface with visible texture variations - NOT a perfect smooth surface but with natural imperfections like small pebbles, minor cracks, subtle wear patterns, and realistic asphalt grain that make it look authentically like a real street surface. Include slight dust particles, minor scuff marks, and natural weathering patterns that make it look like genuine asphalt pavement. The lighting should be natural but directional with subtle variations, casting realistic shadows under the angled clothing to show it\'s resting on the asphalt ground. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits at the diagonal angle - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the asphalt surface while maintaining the angled positioning. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand at a natural diagonal angle with natural imperfections. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in natural lighting conditions with authentic street surface inconsistencies. CRITICAL NO BARS RULE: DO NOT add any bars, borders, letterboxing, or gray/colored strips at the top, bottom, or sides of the image. The asphalt background must fill the ENTIRE frame from edge to edge with no gaps, bars, or borders of any kind. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. EXTREME BLUE COLOR ACCURACY: If the clothing contains ANY blue colors, tones, or blue-tinted elements, they MUST be preserved with EXACT color fidelity - do not shift hues, change saturation, or alter the blue tones in any way. Blue graphics, logos, or design elements must remain precisely the same shade and intensity. ANTI-DISTORTION PROTECTION: Do not warp, stretch, compress, or geometrically distort ANY part of the clothing - maintain perfect proportional accuracy and shape integrity throughout the entire garment. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Position the product at a natural diagonal angle (exactly 20 degrees clockwise) in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },

  // HANGER STUDIO TEMPLATES - Professional hanger display with warm backgrounds
  {
    id: 'hanger-studio',
    name: 'Chain Studio',
    description: 'Professional clothing display on wooden hangers with chain and warm lighting',
    thumbnail: 'https://i.imgur.com/bpKNO7D.png',
    category: 'clothing',
    goodFor: 'Shirts, sweaters, jackets, dresses, tops',
    prompt: 'Display this exact clothing item hanging naturally on an appropriate hanger suspended from a dark metal chain against a warm, professional background - EXACTLY like the reference image style. HANGER AND CHAIN SETUP: Show a dark metal chain hanging from the top of the frame, with a wooden clothing hanger (curved, natural wood finish) suspended from the chain via a metal hook. For shirts, t-shirts, sweaters, jackets, blazers, hoodies, dresses, blouses, and similar garments that can hang from the shoulders - use the wooden clothing hanger. For shorts, pants, skirts, and bottoms - use clip hangers with clips at the waistband, but still suspended from the same chain system. The clothing should hang naturally with realistic draping and fabric physics, showing how the garment would naturally fall when suspended from the chain and hanger. EXACT BACKGROUND MATCH: Create the EXACT warm, creamy beige background color as shown in the reference image - this specific soft, neutral beige tone with subtle gradient variations. The background should have the same smooth, matte finish with gentle lighting gradients that create depth and professional studio feel, matching the reference image perfectly. Add realistic shadows behind the clothing item - cast a soft, natural shadow on the background wall that follows the contours of the hanging garment, positioned slightly to one side and below the clothing to simulate natural lighting from above and to the side. The lighting should be soft and warm, creating gentle highlights on the fabric and natural shadows in the folds, matching the lighting style of the reference image. CHAIN AND HANGER DETAILS: The chain should be visible at the top portion of the image, made of dark metal links, extending down to connect to the wooden hanger. The hanger should be a curved wooden hanger with natural wood grain, similar to the reference image. CRITICAL TEXT SPACE: Ensure generous space at the BOTTOM of the image (approximately 25-30% of image height) for text overlays, as the chain and hanger area at the top must remain clear. Position the hanging garment in the upper 70-75% of the frame, leaving substantial bottom space for text. The garment should be centered horizontally with even spacing on both sides. ULTRA-CRITICAL SHAPE PRESERVATION: Preserve the EXACT shape of the clothing item as it would naturally hang - maintain precise sleeve length, collar shape, hem length, and all structural elements. The garment should hang with natural gravity effects and realistic fabric draping. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. Every detail must remain exactly as provided. ULTRA-CRITICAL TEXT PRESERVATION: Preserve ALL text, logos, and graphics with maximum clarity and sharpness. LAYOUT: Portrait format with the hanging garment suspended from the chain and wooden hanger positioned in the upper portion, leaving generous bottom space for text overlays while maintaining the exact aesthetic of the reference image with matching background color and chain setup.'
  },

  // NEW MODEL BASED CLOTHING TEMPLATES - Creative scenarios with models
  {
    id: 'model_gym_fitness',
    name: 'Athletic Gym Model',
    description: 'Clothing worn by a fit, athletic model inside a modern gym with weights and equipment',
    thumbnail: 'https://i.imgur.com/PqB8XRA.jpeg',
    category: 'clothing',
    goodFor: 'Athletic wear, sportswear, gym clothing, activewear, fitness apparel',
    prompt: 'Display this exact clothing item worn by a fit, athletic model inside a modern gym setting with weights and gym equipment blurred in the background. MODEL: Feature a fit, athletic model, wearing the clothing item naturally. The model should have good posture and athletic build appropriate for gym wear. GYM ENVIRONMENT: Create a modern, well-equipped gym with professional weight equipment, machines, and fitness accessories visible but blurred in the background. Include elements like dumbbells, weight racks, exercise machines, and gym flooring. BRIGHT SPORTY LIGHTING: Use bright, energetic lighting typical of modern fitness centers. The lighting should be clean and motivational, emphasizing the performance wear aesthetics and creating a dynamic atmosphere. PERFORMANCE WEAR AESTHETIC: The overall mood should emphasize functionality, performance, and athletic lifestyle. The clothing should look natural in this environment and highlight its suitability for fitness activities.'
  },
  {
    id: 'model_garage_street',
    name: 'Urban Garage Model',
    description: 'Clothing displayed on a streetwear model in an industrial garage setting',
    thumbnail: 'https://i.imgur.com/FF9XM3Z.jpeg',
    category: 'clothing',
    goodFor: 'Streetwear, urban fashion, casual clothing, hoodies, denim',
    prompt: 'Display this exact clothing item worn by a streetwear model in an industrial garage setting with concrete floors and graffiti on walls. MODEL: Feature a model styled in an urban streetwear aesthetic. The model should have a relaxed, confident pose that fits the street culture vibe. GARAGE SETTING: Create an authentic industrial garage environment with concrete floors, exposed metal beams, tool storage, and urban elements. Include graffiti art or street art on walls to enhance the urban atmosphere. HARSH OVERHEAD LIGHTING: Use industrial overhead lighting that creates dramatic shadows and highlights, giving a gritty street photography feel. The lighting should be raw and unpolished, creating strong contrast. GRITTY STREET VIBE: The overall aesthetic should capture authentic street culture and urban lifestyle. The clothing should look natural in this raw, industrial environment and appeal to streetwear enthusiasts.'
  },
  {
    id: 'model_runway_solo',
    name: 'Runway Ghost Walk',
    description: 'Clothing worn by a fashion model walking down a runway with blurred features',
    thumbnail: 'https://i.imgur.com/8VWGfwU.jpeg',
    category: 'clothing',
    goodFor: 'Fashion clothing, designer wear, formal attire, statement pieces',
    prompt: 'Display this exact clothing item worn by a fashion model walking down a professional runway. MODEL AND POSE: Show a professional fashion model in mid-stride on the runway. The model should have perfect runway posture and confident walking pose typical of fashion shows. RUNWAY ENVIRONMENT: Create an authentic fashion runway with proper runway flooring, clean lines, and professional fashion show atmosphere. The runway should extend into the distance with appropriate proportions. SPOTLIGHT AND AUDIENCE: Include dramatic runway spotlight from above and an out-of-focus crowd or audience silhouettes in the background. The lighting should be dramatic and focused on the model and clothing. FASHION SHOW AESTHETIC: Capture the high-fashion, glamorous atmosphere of a professional fashion show. The clothing should be presented as a statement piece worthy of the runway environment.'
  },
  {
    id: 'model_city_crosswalk',
    name: 'Streetwear Crosswalk Scene',
    description: 'Clothing worn by a casual model crossing a busy city crosswalk',
    thumbnail: 'https://i.imgur.com/NCZHFPY.jpeg',
    category: 'clothing',
    goodFor: 'Casual wear, streetwear, everyday clothing, urban fashion',
    prompt: 'Display this exact clothing item worn by a casual model crossing a busy city crosswalk, with blurred pedestrians and cars in motion around them. MODEL: Feature a model dressed casually and walking naturally across the crosswalk. The pose should be authentic and candid, like a street photography capture. URBAN CROSSWALK: Create a realistic city crosswalk scene with proper street markings, traffic lights, and urban infrastructure. Show authentic city street elements like buildings, signage, and urban details. MOTION AND ENERGY: Include blurred pedestrians and cars in motion to create a sense of urban energy and movement. The blur should suggest the busy pace of city life while keeping the model and clothing in sharp focus. NATURAL OUTDOOR LIGHT: Use natural daylight with urban energy, creating realistic street photography lighting. The lighting should feel authentic and unposed, capturing genuine urban lifestyle moments.'
  },
  {
    id: 'model_loft_apartment',
    name: 'Lifestyle Loft Model',
    description: 'Clothing worn by a relaxed model in a modern loft apartment',
    thumbnail: 'https://i.imgur.com/b3Prv3l.jpeg',
    category: 'clothing',
    goodFor: 'Casual wear, loungewear, lifestyle clothing, comfortable fashion',
    prompt: 'Display this exact clothing item worn by a relaxed model in a modern loft apartment, sitting comfortably on a couch with natural window light. MODEL: Show a model in a relaxed, natural pose sitting on a modern couch. The pose should feel genuine and comfortable, like a lifestyle photography session. LOFT APARTMENT: Create a modern, stylish loft space with exposed brick walls, large windows, contemporary furniture, and minimalist decor. The space should feel lived-in but stylish. NATURAL WINDOW LIGHT: Use soft, natural light pouring in through large loft windows. The lighting should be warm and inviting, creating a cozy atmosphere that highlights the clothing naturally. COZY LIFESTYLE AESTHETIC: Capture a relaxed, aspirational lifestyle mood. The clothing should look perfect for comfortable home living while maintaining style and appeal to lifestyle-conscious consumers.'
  },
  {
    id: 'model_beach_sunset',
    name: 'Beach Sunset Model',
    description: 'Clothing displayed on a model standing barefoot on a sandy beach at golden hour',
    thumbnail: 'https://i.imgur.com/c6jQDEq.jpeg',
    category: 'clothing',
    goodFor: 'Summer clothing, beachwear, casual wear, vacation attire',
    prompt: 'Display this exact clothing item worn by a model standing barefoot on a sandy beach during golden hour sunset. MODEL: Feature a model standing naturally on the beach with a relaxed, vacation-ready pose. The model should be barefoot and positioned to catch the beautiful sunset lighting. BEACH ENVIRONMENT: Create an authentic beach setting with fine sand, gentle waves, and natural coastal elements. The beach should feel pristine and inviting, perfect for vacation photography. GOLDEN HOUR LIGHTING: Capture the warm, golden sunset light that creates a magical beach atmosphere. The lighting should be soft and flattering, with warm tones that enhance both the model and clothing. OCEAN HORIZON: Include the ocean horizon blurred in the background, creating depth and emphasizing the beach vacation setting. The overall mood should evoke relaxation, travel, and summer lifestyle.'
  },
  {
    id: 'model_skater_park',
    name: 'Skatepark Streetwear Model',
    description: 'Clothing worn by a casual skater model in an urban skatepark',
    thumbnail: 'https://i.imgur.com/fjiECo7.jpeg',
    category: 'clothing',
    goodFor: 'Streetwear, skater fashion, casual wear, youth culture clothing',
    prompt: 'Display this exact clothing item worn by a casual skater model standing with a skateboard in an urban skatepark setting. MODEL AND SKATEBOARD: Show a model holding or standing near a skateboard in a natural, authentic skater pose. The model should embody skater culture and street style. SKATEPARK ENVIRONMENT: Create an authentic urban skatepark with concrete ramps, rails, and skate obstacles. Include graffiti and street art that\'s typical of skate culture spaces. NATURAL SUNLIGHT: Use natural outdoor lighting that creates realistic shadows and highlights. The lighting should feel authentic to outdoor skate photography and emphasize the urban environment. EDGY STREET VIBE: Capture the authentic spirit of skater culture and street fashion. The clothing should look natural in this environment and appeal to youth culture and streetwear enthusiasts.'
  },
  {
    id: 'model_yoga_studio',
    name: 'Yoga Studio Model',
    description: 'Clothing displayed on a fit yoga model in a calm studio space',
    thumbnail: 'https://i.imgur.com/5zaurX2.jpeg',
    category: 'clothing',
    goodFor: 'Yoga wear, activewear, wellness clothing, athletic apparel',
    prompt: 'Display this exact clothing item worn by a fit yoga model in a calm studio space with wooden floors and soft natural lighting. MODEL: Feature a fit model in a gentle yoga pose or standing naturally in the studio. The model should embody wellness and mindfulness aesthetics. YOGA STUDIO: Create a serene yoga studio environment with wooden floors, natural elements like plants, and minimalist decor. The space should feel peaceful and conducive to wellness practices. SOFT DAYLIGHT: Use gentle, natural daylight that creates a calming atmosphere. The lighting should be soft and even, avoiding harsh shadows while highlighting the clothing\'s fit and function. WELLNESS ATMOSPHERE: Capture a relaxed, health-focused atmosphere that emphasizes mindfulness and wellness. The clothing should look perfect for yoga practice and appeal to the wellness community.'
  },
  {
    id: 'model_office_casual',
    name: 'Office Lifestyle Model',
    description: 'Clothing worn by a business-casual model in a modern office environment',
    thumbnail: 'https://i.imgur.com/aySbTVV.jpeg',
    category: 'clothing',
    goodFor: 'Business casual, work attire, professional clothing, office wear',
    prompt: 'Display this exact clothing item worn by a business-casual model in a modern office with glass walls and contemporary workspace elements. MODEL: Show a model in a professional but relaxed pose appropriate for modern workplace photography. The model should embody contemporary professional style. MODERN OFFICE: Create a contemporary office environment with glass walls, modern furniture, laptops, and other professional workspace elements. Include blurred coworkers or office activity in the background. BRIGHT NATURAL LIGHT: Use bright, natural office lighting that creates a professional atmosphere. The lighting should be clean and energizing, typical of modern workplace environments. PROFESSIONAL LIFESTYLE: Capture the modern professional lifestyle that balances style with workplace appropriateness. The clothing should look perfect for contemporary office culture and appeal to working professionals.'
  },
  {
    id: 'model_boxing_gym',
    name: 'Boxing Gym Model',
    description: 'Clothing worn by a fit athletic model in a gritty boxing gym',
    thumbnail: 'https://i.imgur.com/q7O4h3p.jpeg',
    category: 'clothing',
    goodFor: 'Athletic wear, boxing gear, gym clothing, tough sportswear',
    prompt: 'Display this exact clothing item worn by a fit athletic model in a gritty boxing gym, standing near a heavy bag. MODEL: Feature a fit, athletic model posed naturally in the boxing gym environment. The model should have an athletic build and confident stance appropriate for boxing training. BOXING GYM ENVIRONMENT: Create an authentic boxing gym with heavy bags, speed bags, boxing ring elements, and training equipment. The gym should feel raw and authentic, not polished or commercial. ATMOSPHERIC ELEMENTS: Include sweat and chalk dust in the atmosphere to create authenticity. Add subtle environmental effects that suggest intense training and hard work. HARD OVERHEAD LIGHTING: Use harsh, industrial lighting typical of boxing gyms. The lighting should create dramatic shadows and highlights that emphasize the tough, no-nonsense training environment.'
  },
  {
    id: 'model_urban_night',
    name: 'City Night Model',
    description: 'Clothing worn by a streetwear model under neon lights on a rainy city street',
    thumbnail: 'https://i.imgur.com/RLiy2UY.jpeg',
    category: 'clothing',
    goodFor: 'Streetwear, nightlife clothing, urban fashion, statement pieces',
    prompt: 'Display this exact clothing item worn by a streetwear model standing under neon lights on a rainy city street at night. MODEL: Show a model posed confidently under the neon lighting. The model should embody urban nightlife style and street fashion aesthetics. NEON CITY LIGHTING: Create dramatic neon lighting from store signs, street lights, and urban illumination. The neon should cast colorful light on the model and clothing, creating a cinematic urban aesthetic. REFLECTIVE WET GROUND: Include wet pavement that reflects the neon lights and creates interesting light patterns. The reflections should add depth and visual interest to the street scene. CINEMATIC URBAN NIGHT: Capture the energy and drama of urban nightlife. The overall aesthetic should be cinematic and atmospheric, appealing to streetwear culture and urban fashion enthusiasts.'
  },

  // CREATIVE ARTISTIC CLOTHING DISPLAYS - Unique and artistic presentation methods
  {
    id: 'clothing_balloon_float',
    name: 'Balloon Float Installation',
    description: 'Clothing suspended mid-air by invisible string, surrounded by floating helium balloons',
    thumbnail: 'https://i.imgur.com/61bGhef.jpeg',
    category: 'clothing',
    goodFor: 'Playful clothing, children\'s wear, casual wear, fun fashion',
    prompt: 'Display this exact clothing item suspended mid-air by nearly invisible string, surrounded by floating helium balloons in a clean studio environment. SUSPENSION SYSTEM: Use ultra-thin, transparent fishing line to suspend the clothing item naturally in mid-air. The suspension should be virtually invisible while allowing the garment to display its natural shape and drape. FLOATING BALLOONS: Surround the clothing with colorful helium balloons of various sizes floating at different heights. The balloons should create a whimsical, playful atmosphere without overwhelming the clothing. CLEAN STUDIO SETTING: Set in a bright, clean studio with seamless white or light-colored background. The space should feel airy and open, enhancing the floating effect. WHIMSICAL AESTHETIC: Create a playful, imaginative atmosphere that suggests lightness and joy. The overall mood should be fun and uplifting, perfect for casual or playful fashion items.'
  },
  {
    id: 'clothing_shadow_art',
    name: 'Shadow Art Display',
    description: 'Clothing displayed with exaggerated artistic shadow projections forming shapes',
    thumbnail: 'https://i.imgur.com/tXtKpfv.jpeg',
    category: 'clothing',
    goodFor: 'Artistic clothing, designer wear, statement pieces, creative fashion',
    prompt: 'Display this exact clothing item floating mysteriously above a minimalist horizontal rod or bar with dramatic shadow art projections on the wall behind it. FLOATING CLOTHING: Show the clothing item suspended in mid-air above a thin horizontal rod or bar, appearing to float with no visible hanging mechanism. The garment should maintain its natural shape while appearing weightless and ethereal. HORIZONTAL ROD: Include a simple, thin horizontal rod or bar positioned below the floating clothing item. The rod should be minimalist and modern, serving as a visual anchor point that emphasizes the floating effect. ARTISTIC SHADOW PROJECTIONS: Use dramatic spotlighting to cast exaggerated, artistic shadows of the clothing onto the wall behind it. The shadows should form interesting shapes and patterns that are more artistic than the actual garment silhouette. DRAMATIC LIGHTING: Create strong, directional lighting that produces sharp, high-contrast shadows while properly illuminating the floating clothing. The lighting should be theatrical and gallery-like. GALLERY ATMOSPHERE: Set in a clean, modern gallery-like environment with a bright wall background. The overall aesthetic should be sophisticated and artistic, perfect for statement pieces and designer fashion.'
  },
  {
    id: 'clothing_vintage_trunk',
    name: 'Vintage Travel Trunk Display',
    description: 'Clothing folded neatly inside an open antique travel trunk with vintage elements',
    thumbnail: 'https://i.imgur.com/lmyv8h3.jpeg',
    category: 'clothing',
    goodFor: 'Vintage clothing, travel wear, classic fashion, heritage brands',
    prompt: 'Display this exact clothing item folded neatly inside an open antique travel trunk, with old maps and vintage postcards scattered around. ANTIQUE TRUNK: Use an authentic-looking vintage leather or canvas travel trunk with brass corners and vintage hardware. The trunk should be open to display the clothing inside while showing its vintage character. CLOTHING ARRANGEMENT: Fold and arrange the clothing neatly inside the trunk as if carefully packed for travel. The arrangement should suggest care and attention to valuable garments. VINTAGE ACCESSORIES: Scatter old maps, vintage postcards, and travel memorabilia around the trunk to enhance the nostalgic travel theme. These elements should complement without overwhelming the clothing display. NOSTALGIC LIGHTING: Use warm, golden lighting that creates a nostalgic, vintage atmosphere. The lighting should evoke memories of classic travel and timeless fashion.'
  },
  {
    id: 'clothing_floating_water',
    name: 'Floating on Water Surface',
    description: 'Clothing laid gently on a calm water surface, floating with soft ripples',
    thumbnail: 'https://i.imgur.com/N4RKLQ9.jpeg',
    category: 'clothing',
    goodFor: 'Lightweight clothing, summer wear, ethereal fashion, artistic pieces',
    prompt: 'Display this exact clothing item laid gently on a calm water surface, floating naturally with soft ripples and subtle reflections. WATER SURFACE: Create a perfectly calm water surface that can support the clothing while allowing gentle ripples. The water should be clean and clear, reflecting light beautifully. FLOATING TECHNIQUE: Show the clothing floating naturally on the water surface, following the gentle contours and creating realistic interaction with the water. The garment should appear weightless and ethereal. SOFT RIPPLES: Include gentle ripples around the clothing that suggest movement and fluidity. The ripples should enhance the floating effect without creating chaos. DREAMY ATMOSPHERE: Create a surreal, dreamlike atmosphere with soft lighting and serene mood. The overall effect should be ethereal and artistic, perfect for lightweight or flowing garments.'
  },

  {
    id: 'clothing_warehouse_beam',
    name: 'Warehouse Beam Hanging',
    description: 'Clothing hung from a metal beam inside an abandoned warehouse with dramatic lighting',
    thumbnail: 'https://i.imgur.com/ZUFvcKY.jpeg',
    category: 'clothing',
    goodFor: 'Industrial fashion, urban wear, rugged clothing, streetwear',
    prompt: 'Display this exact clothing item hung from a metal beam inside an abandoned warehouse, with cinematic shafts of sunlight cutting through dusty air. WAREHOUSE SETTING: Create an authentic abandoned warehouse environment with exposed metal beams, concrete floors, and industrial architecture. The space should feel raw and atmospheric. BEAM SUSPENSION: Hang the clothing from a sturdy metal beam using appropriate hanging methods. The suspension should look natural and secure within the industrial environment. CINEMATIC LIGHTING: Create dramatic shafts of sunlight penetrating through broken windows or openings, cutting through dusty air to create atmospheric lighting effects. DUSTY ATMOSPHERE: Include subtle dust particles floating in the light beams to enhance the abandoned warehouse atmosphere. The overall mood should be dramatic and cinematic, perfect for urban or industrial fashion styles.'
  },

  // DESERT AND OUTDOOR DISPLAYS - Natural environment presentations
  {
    id: 'desert_mannequin',
    name: 'Desert Mannequin Shot',
    description: 'Clothing worn on a faceless mannequin in a desert landscape with dramatic shadows',
    thumbnail: 'https://i.imgur.com/fFN6GFn.jpeg',
    category: 'clothing',
    goodFor: 'Outdoor clothing, desert wear, rugged fashion, adventure gear',
    prompt: 'Display this exact clothing item worn on a completely artificial mannequin placed in the middle of a desert landscape with dramatic shadows and strong sunlight. FULLY ARTIFICIAL MANNEQUIN: Use a professional display mannequin that is obviously not human - smooth, featureless surface without any human characteristics like veins, muscle definition, or human skin texture. The mannequin should have a uniform, matte finish in neutral white, gray, or beige coloring that won\'t compete with the clothing. The mannequin must look completely artificial and store-like, similar to department store display models. DESERT LANDSCAPE: Create an authentic desert setting with sand dunes, desert plants, and appropriate geological features. The landscape should feel vast and dramatic. DRAMATIC SHADOWS: Use strong sunlight to create bold, dramatic shadows across the sand and around the mannequin. The shadows should add visual interest and emphasize the harsh beauty of the desert. STRONG SUNLIGHT: Capture the intense, clear light typical of desert environments. The lighting should be bright and unforgiving, creating high contrast and emphasizing the clothing\'s suitability for harsh conditions. CRITICAL: The mannequin must never show human-like veins, arms with realistic human anatomy, or any biological features - it should be obviously a retail display mannequin.'
  },
  {
    id: 'warehouse_podium',
    name: 'Industrial Podium Display',
    description: 'Clothing laid flat on a pedestal in an abandoned warehouse with cinematic lighting',
    thumbnail: 'https://i.imgur.com/DHbCEG7.jpeg',
    category: 'clothing',
    goodFor: 'Urban fashion, industrial wear, minimalist clothing, artistic fashion',
    prompt: 'Display this exact clothing item laid flat on a pedestal in the center of an abandoned warehouse with cinematic low lighting and dramatic shafts of sunlight. WAREHOUSE ENVIRONMENT: Create an atmospheric abandoned warehouse with exposed beams, concrete floors, and industrial decay. The space should feel dramatic and cinematic. PEDESTAL PLACEMENT: Position a simple, industrial pedestal or platform in the center of the space to elevate and showcase the clothing item. The pedestal should fit the industrial aesthetic. CLOTHING PRESENTATION: Lay the clothing flat on the pedestal in an artistic arrangement that shows its shape and details clearly. The presentation should be museum-like yet industrial. CINEMATIC LIGHTING: Use dramatic low lighting with shafts of sunlight breaking through broken windows or openings. The lighting should create atmosphere while properly illuminating the clothing display.'
  },

  // PRODUCT STUDIO TEMPLATES - Professional product photography for physical items
  {
    id: 'product-studio-white',
    name: 'Product Studio',
    description: 'Clean white background with professional shadow for physical products',
    thumbnail: 'https://i.imgur.com/Ejhb98m.png',
    category: 'products',
    goodFor: 'Cosmetics, electronics, accessories, bottles, containers, gadgets',
    prompt: 'Photograph this exact product in a professional product photography studio setup with a pristine white background and dramatic side lighting, exactly like the reference image style. BACKGROUND: Create a pure, seamless white background that appears infinite - no visible corners, edges, or seams. The background should be clean matte white with subtle warm gradient variations that create depth without being noticeable. Think of the classic "limbo" or "infinity" white background used in professional studios, but with a slight warm cream tone like in the reference. DRAMATIC SIDE LIGHTING: Use professional studio lighting with strong directional light coming specifically from the UPPER LEFT side, creating dramatic shadows that fall diagonally to the RIGHT across the white surface. The lighting should create strong contrast between the lit left side and shadow right side of the product, with bright highlights on the left side and deeper shadows on the right side. DRAMATIC SHADOW: Generate a prominent, well-defined shadow that extends diagonally from the product to the RIGHT side across the white surface, similar to the reference image. The shadow MUST always fall to the right side of the product, never to the left. The shadow should be dark enough to create visual impact and drama, but still maintain detail and not be completely black. The shadow should follow the product\'s shape and extend significantly to the right across the frame, creating visual interest and grounding the product to the surface. The shadow should have soft edges but be bold and noticeable, always positioned on the RIGHT side of the product. PRODUCT POSITIONING: Position the product centrally with perfect stability and natural orientation. The product should appear to be sitting naturally on an invisible white surface. Ensure the product is perfectly straight and stable, not tilted unless that\'s the natural resting position. COMPOSITION: Frame the product with generous white space around all sides for text overlays and visual breathing room. The product should fill approximately 60-70% of the frame width while maintaining professional spacing. Center the product both horizontally and vertically with balanced margins. ULTRA-CRITICAL PRESERVATION: Preserve the EXACT colors, textures, materials, logos, text, labels, and all visual elements of the product with pixel-perfect accuracy. DO NOT alter any aspect of the product appearance including brand names, graphics, text, colors, or materials. Keep all text and labels crystal clear and readable. SURFACE TEXTURE: Show realistic material properties - plastic should look smooth and slightly reflective, glass should have appropriate transparency and reflections, metal should show subtle reflections, matte surfaces should appear non-reflective, etc. Maintain authentic material characteristics. PROFESSIONAL QUALITY: The final image should look like it was shot in a professional photography studio for e-commerce or marketing purposes - clean, bright, and commercial-grade quality. Avoid any amateur or casual photography look. LAYOUT: Portrait format with the product centered and generous equal spacing on all sides for text overlays. Ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain professional framing with the product as the clear focal point against the pristine white background. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake brand names, NO fake labels, NO fake text, NO fake logos, NO fake product names or descriptions. If the original product has no visible branding, keep it completely plain. Only preserve content that actually exists in the source image. Never fabricate or add fictional content.'
  },

  // NEW CLOTHING STUDIO TEMPLATES
  {
    id: 'mannequin-spotlight',
    name: 'Mannequin Spotlight',
    description: 'Headless matte white mannequin under focused spotlight in dark studio',
    thumbnail: 'https://i.imgur.com/OrCge4z.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Display this exact clothing item on a headless matte white mannequin under a focused spotlight in a dark, moody studio environment. MANNEQUIN: Use a professional headless display mannequin with a matte white finish - smooth, clean surface without any visible seams or imperfections. The mannequin should have realistic human proportions and be positioned straight and centered. SPOTLIGHT: Create a dramatic overhead spotlight that illuminates the mannequin and clothing from above, creating a focused circle of light. The light should be bright and directional, falling primarily on the clothing and mannequin while leaving the surrounding area in darkness. STUDIO ENVIRONMENT: The background should be dark and moody - deep charcoal to black tones that fade into darkness beyond the spotlight\'s reach. The floor should be a dark, matte surface (concrete or studio floor) that reflects minimal light. CINEMATIC SHADOWS: The overhead spotlight should create dramatic, cinematic shadows that fall naturally from the clothing and mannequin onto the dark floor. Shadows should be well-defined near the mannequin and soften as they extend outward. CLOTHING FIT: Ensure the clothing fits naturally on the mannequin with proper draping, natural fabric behavior, and realistic contact points. The garment should maintain its exact original shape, colors, textures, and all details. ATMOSPHERE: The overall mood should be dramatic, professional, and editorial - like a high-end fashion photography setup. The contrast between the bright spotlight and dark surroundings should create a striking, cinematic effect. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy.'
  },
  {
    id: 'suspended-clothespins',
    name: 'Suspended Clothespins',
    description: 'Clothing suspended mid-air with clear clothespins on invisible string',
    thumbnail: 'https://i.imgur.com/mT7vLJF.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Suspend this exact clothing item in mid-air using clear, transparent clothespins attached to invisible string against a clean white studio backdrop. SUSPENSION SETUP: The clothing should appear to be hanging naturally in mid-air, supported by 2-3 clear plastic or glass clothespins that are barely visible. The clothespins should be positioned strategically (shoulders, collar area) to hold the garment in a natural hanging position. INVISIBLE STRING: Use ultra-thin, nearly invisible fishing line or clear string that is virtually undetectable in the final image. The string should not be visible or should be so thin it appears invisible against the white background. WHITE STUDIO BACKDROP: Create a seamless, pure white studio background that appears infinite - no visible corners, edges, or seams. The background should be evenly lit with soft, professional studio lighting. SHADOWS: Cast a subtle shadow on the back wall behind the suspended clothing. The shadow should be soft and naturally positioned, showing the depth and dimension of the hanging garment. NATURAL DRAPING: The clothing should hang naturally with realistic fabric behavior, gravity-affected draping, and natural fold patterns. The garment should look like it\'s genuinely suspended and affected by gravity. CREATIVE FASHION SHOOT: The overall aesthetic should feel like a creative, artistic fashion shoot - clean, minimal, and conceptually interesting. The floating effect should appear intentional and professionally executed. LIGHTING: Use soft, even studio lighting that eliminates harsh shadows while maintaining the subtle shadow cast on the back wall. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while achieving the suspended effect.'
  },
  {
    id: 'modern-chair',
    name: 'Mid-Century Modern Chair',
    description: 'Clothing casually draped over mid-century modern chair with soft moody lighting',
    thumbnail: 'https://i.imgur.com/1tz8AAI.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Style this exact clothing item casually draped over a mid-century modern chair in a professional photo studio with soft, moody lighting. CHAIR SELECTION: Use an iconic mid-century modern chair - think Eames-style or similar design with clean lines, wooden legs, and either leather, fabric, or molded seat. The chair should be positioned at a slight angle to create visual interest. CASUAL DRAPING: The clothing should be casually and naturally draped over the chair - not perfectly folded or arranged, but as if someone just casually placed it there. Allow natural fabric folds, draping, and gravity effects. The garment should interact naturally with the chair\'s form. PHOTO STUDIO SETTING: Set in a clean, professional photo studio environment with neutral tones. The floor should be polished concrete or seamless studio flooring. Background should be minimal and uncluttered. SOFT MOODY LIGHTING: Use soft, directional lighting that creates a moody atmosphere. The lighting should be warm and inviting, with gentle shadows that add depth and dimension. Avoid harsh contrasts - aim for a sophisticated, editorial feel. INTENTIONAL STYLING: The scene should look deliberately styled for a brand editorial shoot - sophisticated, aspirational, and carefully composed. Every element should feel purposeful and aesthetically pleasing. NATURAL FABRIC BEHAVIOR: Ensure the clothing drapes naturally over the chair with realistic fabric physics, weight distribution, and contact points. The garment should conform naturally to the chair\'s shape. BRAND EDITORIAL AESTHETIC: The overall mood should evoke high-end lifestyle branding - clean, sophisticated, and aspirational. Think of editorial spreads in design magazines. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while achieving the styled draping effect.'
  },
  {
    id: 'flat-lay-accessories',
    name: 'Flat Lay with Accessories',
    description: 'Top-down flat lay with neutral accessories on beige seamless paper',
    thumbnail: 'https://i.imgur.com/JIC2jUn.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Arrange this exact clothing item in a flat lay composition with carefully selected neutral accessories, shot from directly above on beige seamless paper. FLAT LAY ARRANGEMENT: Position the clothing item as the central focus, laid flat and naturally arranged. The garment should be the hero piece with accessories strategically placed around it to create visual balance and interest. NEUTRAL ACCESSORIES: Include 2-3 carefully selected accessories: black sunglasses (classic aviator or wayfarer style), a minimalist black watch with leather or metal band, and a slim minimalist wallet in black or brown leather. Accessories should complement, not compete with the clothing. TOP-DOWN PHOTOGRAPHY: Shoot from directly overhead (90-degree angle) to create a perfect flat lay perspective. Ensure the camera is centered and level for symmetrical framing. BEIGE SEAMLESS PAPER: Use a warm beige or light tan seamless paper background that creates a clean, infinite backdrop. The paper should be smooth and evenly lit without visible edges or seams. STYLING AND BALANCE: Arrange all elements with strong aesthetic principles - consider visual weight, negative space, and geometric balance. The composition should feel intentional and professionally styled. LIGHTING: Use even, soft lighting from above to eliminate harsh shadows while maintaining subtle depth. The lighting should be bright enough to show all details clearly. STRONG AESTHETICS: The overall composition should embody modern, minimalist design principles with clean lines, balanced proportions, and sophisticated color harmony. Think high-end lifestyle brand aesthetics. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the styled flat lay composition.'
  },
  {
    id: 'mirror-reflection',
    name: 'Mirror Reflection',
    description: 'Clothing flat on mirror surface with clear reflection and white background',
    thumbnail: 'https://i.imgur.com/XPAGBit.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Place this exact clothing item flat on a pristine mirror surface with its reflection clearly visible, against a seamless white background. MIRROR SURFACE: Use a perfectly clean, high-quality mirror surface that creates a crystal-clear reflection. The mirror should be large enough to accommodate the full garment and its reflection. The mirror surface should be flawless without scratches, smudges, or imperfections. CLEAR REFLECTION: The reflection should be sharp, clear, and perfectly symmetrical. The reflected image should show all details of the clothing with the same clarity as the original, creating a striking mirror effect. The reflection should appear natural and realistic. FLAT POSITIONING: Lay the clothing item completely flat on the mirror surface with natural fabric behavior and contact points. The garment should appear to be resting naturally on the mirror, not floating above it. WHITE BACKGROUND: Create a seamless, pure white background that appears infinite behind the mirror setup. The background should be evenly lit and completely clean without any distractions. TOP-LEFT LIGHTING: Use professional studio lighting positioned from the top-left to create even illumination across both the clothing and its reflection. Avoid harsh reflections or glare on the mirror surface while maintaining clear visibility of both the garment and its reflection. HIGH-END PRODUCT SHOOT: The overall aesthetic should match high-end product photography standards - clean, professional, and striking. The mirror effect should create visual impact while maintaining commercial quality. PERFECT SYMMETRY: Ensure the reflection is geometrically accurate and creates perfect symmetry between the original garment and its mirrored image. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy in both the original and reflected image.'
  },
  {
    id: 'pedestal-cube',
    name: 'Pedestal Cube',
    description: 'Clothing folded on matte white pedestal cube in minimalist gallery space',
    thumbnail: 'https://i.imgur.com/ZtPIB5H.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Display this exact clothing item neatly folded on a matte white pedestal cube in a minimalist gallery space with artistic shadows and textured walls. PEDESTAL CUBE: Use a clean, geometric matte white cube pedestal with sharp edges and a smooth, non-reflective surface. The cube should be proportioned appropriately to showcase the folded clothing as the focal point. NEAT FOLDING: Fold the clothing item neatly and professionally, as if displayed in a high-end boutique. The folding should be precise but natural, showing the garment\'s structure and maintaining its shape. MINIMALIST GALLERY SPACE: Create a sophisticated gallery environment with clean lines and minimal aesthetic. The space should feel modern, curated, and artistic - like a contemporary art gallery or high-end retail space. ARTISTIC SHADOWS: Use directional lighting to create intentional, artistic shadows on the wall behind the pedestal. The shadows should add visual interest and depth while maintaining the clean, minimal aesthetic. TEXTURED WALL: The background wall should have subtle texture - perhaps concrete, plaster, or stone - that adds visual interest without being distracting. The texture should be neutral and sophisticated. HIGH-FASHION EDITORIAL: The overall look should evoke high-fashion editorial photography - clean, sophisticated, and gallery-worthy. Think of luxury brand lookbooks or art gallery installations. NO DISTRACTIONS: Keep the composition completely clean with no other objects, decorative elements, or distractions. The focus should be entirely on the beautifully folded clothing on the pedestal. PROFESSIONAL LIGHTING: Use soft, directional lighting that creates depth and dimension while maintaining the clean, gallery aesthetic. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while achieving the neat, gallery-display presentation.'
  },
  {
    id: 'industrial-rack',
    name: 'Industrial Black Rack',
    description: 'Clothing on black industrial rack with concrete background and moody lighting',
    thumbnail: 'https://i.imgur.com/is0ho8p.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Display this exact clothing item hanging on a black industrial clothing rack against a concrete background with low-key moody lighting and intentional artistic shadows. INDUSTRIAL RACK: Use a matte black industrial-style clothing rack with clean, geometric lines - think modern retail or studio equipment. The rack should be sturdy-looking with metal construction and minimal design. CLOTHING DISPLAY: Hang the clothing item naturally on the rack using a quality hanger that maintains the garment\'s shape. The clothing should drape naturally with realistic fabric behavior and gravity effects. CONCRETE BACKGROUND: Create a raw concrete wall background with natural texture, subtle variations, and authentic imperfections. The concrete should have a medium-dark tone with realistic surface details like slight staining or natural wear patterns. LOW-KEY MOODY LIGHTING: Use dramatic, low-key lighting that creates strong contrast and mood. The lighting should be directional and create interesting light and shadow patterns across the scene. INTENTIONAL ARTISTIC SHADOWS: The shadows should feel deliberately placed and artistic - not accidental. Use the lighting to create dramatic shadow patterns on the concrete wall and around the clothing rack. STUDIO SHOOT VIBES: The overall aesthetic should feel like a professional studio photoshoot - moody, artistic, and carefully composed. Think editorial fashion photography or high-end brand campaigns. INDUSTRIAL AESTHETIC: Embrace the raw, industrial look with authentic materials and textures. The mood should be urban, modern, and slightly edgy. DRAMATIC CONTRAST: Use strong contrast between light and dark areas to create visual impact and depth. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while achieving the moody industrial presentation.'
  },
  {
    id: 'floating-oak-shelf',
    name: 'Floating Oak Shelf',
    description: 'Clothing folded on floating oak shelf next to small potted plant in minimalist studio',
    thumbnail: 'https://i.imgur.com/VZdFcfW.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Style this exact clothing item neatly folded on a floating oak wood shelf alongside a small potted plant in a well-lit minimalist studio environment. FLOATING OAK SHELF: Use a clean, modern floating shelf made of natural oak wood with visible grain patterns and warm honey tones. The shelf should appear to float on the wall without visible brackets, creating a clean, minimal look. NEAT FOLDING: Fold the clothing item professionally and neatly, positioned on one side of the shelf to allow space for the plant. The folding should showcase the garment\'s structure and maintain its natural shape. SMALL POTTED PLANT: Include one small, elegant potted plant - perhaps a succulent, small fern, or minimalist plant in a simple white, terracotta, or concrete pot. The plant should complement, not compete with the clothing. MINIMALIST STUDIO: Create a clean, bright studio environment with white or light neutral walls. The space should feel modern, organized, and serene - like a contemporary lifestyle brand showroom. WELL-LIT ENVIRONMENT: Use bright, even lighting that illuminates both the clothing and plant naturally. The lighting should be soft and inviting, creating a fresh, clean atmosphere. NATURAL STYLING: The arrangement should feel natural and lived-in, as if someone thoughtfully organized their space. Both items should sit comfortably on the shelf with natural spacing. LIFESTYLE AESTHETIC: The overall mood should evoke modern lifestyle branding - clean, organized, and aspirational. Think Scandinavian design principles or minimalist home decor. WARM WOOD TONES: The oak shelf should provide warmth and natural texture that contrasts beautifully with the clean studio environment. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the styled shelf display.'
  },
  {
    id: 'wooden-tabletop',
    name: 'Warm Wooden Tabletop',
    description: 'Clothing on warm-toned wooden surface with soft natural sunlight from the side',
    thumbnail: 'https://i.imgur.com/Pk5wnmL.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Photograph this exact clothing item laid naturally on a warm-toned wooden tabletop with soft natural sunlight streaming in from the side. WOODEN SURFACE: Use a beautiful warm-toned wooden table or surface - think rich oak, walnut, or similar hardwood with visible grain patterns and natural character. The wood should have warm honey, amber, or golden brown tones. NATURAL POSITIONING: Lay the clothing item naturally on the wooden surface, not perfectly arranged but as if gently placed there. Allow for natural fabric draping, soft folds, and realistic contact with the wood surface. SOFT NATURAL SUNLIGHT: Create the effect of gentle, warm sunlight coming through a window from the side. The light should be soft and diffused, not harsh, creating a natural and inviting atmosphere. SIDE LIGHTING: Position the natural light source from the left or right side to create gentle shadows and highlight the wood grain and fabric textures. The lighting should feel authentic and naturally occurring. REALISTIC PHOTOGRAPHY: The clothing should look like it was genuinely photographed on the wooden surface in natural light - not artificially placed or overly stylized. Maintain authenticity in how the fabric interacts with the wood. WARM ATMOSPHERE: The overall mood should be warm, cozy, and natural - evoking a comfortable home environment or artisan workspace. The wood tones and natural light should create an inviting feeling. NATURAL SHADOWS: Allow for soft, natural shadows cast by the clothing onto the wooden surface, and gentle shadows from the side lighting that add depth and dimension. AUTHENTIC TEXTURES: Both the wood grain and fabric textures should be clearly visible and realistic, enhanced by the natural lighting. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while achieving the natural, warm wooden surface presentation.'
  },
  {
    id: 'cotton-sheet',
    name: 'Wrinkled Cotton Sheet',
    description: 'Clothing on wrinkled white cotton sheet under soft diffused light',
    thumbnail: 'https://i.imgur.com/ZSYEUvP.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Place this exact clothing item on a naturally wrinkled white cotton sheet under soft, diffused studio lighting. WRINKLED COTTON SHEET: Use a white cotton sheet with natural wrinkles, creases, and fabric texture. The sheet should look lived-in and authentic - not perfectly pressed but naturally rumpled as if from normal use. The wrinkles should create interesting texture and depth. NATURAL PLACEMENT: Position the clothing item naturally on the sheet, allowing it to interact with the wrinkles and folds of the cotton. The garment should rest realistically on the textured surface with natural contact points. SOFT DIFFUSED LIGHTING: Use gentle, even lighting that\'s diffused and soft - similar to light coming through sheer curtains or professional softbox lighting. Avoid harsh shadows while maintaining enough contrast to show textures. REALISTIC STUDIO SETUP: The scene should feel like it was shot in a real photography studio with professional lighting, but with a natural, unforced aesthetic. The setup should appear intentional yet effortless. MATCHING SHADOWS: Ensure all shadows cast by the clothing match the lighting setup and look natural on the wrinkled sheet surface. Shadows should follow the contours of both the garment and the sheet\'s texture. CLEAN COMPOSITION: While the sheet is wrinkled, the overall composition should be clean with no other objects or distractions in the frame. Focus entirely on the clothing and sheet interaction. TEXTILE INTERACTION: Show realistic interaction between the clothing fabric and the cotton sheet - both materials should behave naturally with authentic textile physics. AUTHENTIC TEXTURES: Both the clothing and cotton sheet textures should be clearly visible and realistic, enhanced by the soft lighting. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while achieving the natural cotton sheet presentation.'
  },
  {
    id: 'marble-surface',
    name: 'White Marble Surface',
    description: 'Clothing on white marble surface with gray veining and high-end product lighting',
    thumbnail: 'https://i.imgur.com/GBwfwYg.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Photograph this exact clothing item on a luxurious white marble surface with visible gray veining, using high-end product photography lighting. MARBLE SURFACE: Use premium white marble with elegant gray veining patterns - think Carrara or similar high-quality marble. The surface should be polished and smooth with natural stone patterns and authentic marble characteristics. GRAY VEINING: The marble should feature beautiful, natural gray veining that adds visual interest without overwhelming the composition. The veining should be subtle but clearly visible, creating elegant patterns across the surface. FLAT SURFACE POSITIONING: Lay the clothing item flat on the marble surface with realistic contact points and natural fabric behavior. The garment should appear to rest naturally on the smooth stone surface. HIGH-END PRODUCT LIGHTING: Use professional product photography lighting setup with multiple light sources to create even, luxurious illumination. The lighting should be bright and clean while showing the marble\'s natural beauty. MATCHED SHADOWS AND PERSPECTIVE: Ensure the clothing\'s shadows and perspective perfectly match the flat marble surface. Shadows should be realistic and proportional, cast naturally on the marble. LUXURY AESTHETIC: The overall mood should evoke luxury, elegance, and premium quality - suitable for high-end fashion or luxury goods photography. NO ARTIFICIAL ELEMENTS: Keep the composition clean with no other objects or artificial elements. Focus entirely on the beautiful interaction between the clothing and marble surface. STONE TEXTURE DETAILS: The marble texture should be clearly visible with realistic surface qualities - smooth, polished, with natural stone characteristics and authentic veining patterns. PREMIUM PRESENTATION: The presentation should feel premium and sophisticated, suitable for luxury brand marketing or high-end product catalogs. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while achieving the luxurious marble surface presentation.'
  },
  {
    id: 'beach-sand',
    name: 'Golden Beach Sand',
    description: 'Clothing on golden beach sand with soft overhead sunlight and natural shadows',
    thumbnail: 'https://i.imgur.com/pueKW2u.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Photograph this exact clothing item on golden beach sand with soft overhead sunlight and realistic shadows. GOLDEN BEACH SAND: Use fine, golden beach sand with natural texture and color variations. The sand should have realistic grain patterns, subtle color shifts, and authentic beach sand characteristics - warm golden tones with natural imperfections. SOFT OVERHEAD SUNLIGHT: Create the effect of gentle, warm sunlight coming from above, similar to natural beach lighting. The light should be soft and diffused, not harsh, creating a pleasant and inviting atmosphere. REALISTIC SHADOWS: The clothing should cast natural, realistic shadows onto the sand that match the overhead lighting. Shadows should be proportional and authentic, showing how the garment would naturally rest on sand. NATURAL OUTDOOR FEEL: The scene should feel like it was genuinely shot outdoors on location at a beach - authentic, natural, and unforced. The lighting and atmosphere should evoke a real beach environment. CLEAN COMPOSITION: Keep the frame completely clean with no footprints, shells, seaweed, or other beach objects around the clothing. Focus entirely on the garment and sand interaction. SAND TEXTURE INTERACTION: Show realistic interaction between the clothing and sand surface - the garment should rest naturally with authentic contact points and fabric behavior on the granular surface. WARM BEACH LIGHTING: The overall lighting should be warm and golden, evoking the natural warmth of beach sunlight. The mood should be fresh, natural, and outdoor-inspired. AUTHENTIC ENVIRONMENT: The scene should feel like a genuine beach location shoot, not a studio setup with fake sand. Maintain authenticity in the lighting and atmosphere. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while achieving the natural beach sand presentation.'
  },
  {
    id: 'kraft-paper',
    name: 'Light Brown Kraft Paper',
    description: 'Clothing on kraft paper with warm sustainable product lighting',
    thumbnail: 'https://i.imgur.com/IjIStUi.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Style this exact clothing item on light brown kraft paper with soft, warm product studio lighting that evokes sustainable and eco-friendly branding. KRAFT PAPER BACKGROUND: Use authentic light brown kraft paper with natural texture and subtle variations. The paper should have the characteristic warm brown tone and slightly rough texture of quality kraft paper - not perfectly smooth but with natural paper grain. SUSTAINABLE AESTHETIC: The overall scene should evoke sustainability, eco-consciousness, and natural materials. Think earth-friendly branding and environmentally conscious product photography. WARM STUDIO LIGHTING: Use professional studio lighting with a warm color temperature that complements the kraft paper. The lighting should be soft and inviting, creating a cozy, natural atmosphere. SOFT SHADOWS: Create gentle, soft shadows that add depth without being harsh. The shadows should enhance the natural, organic feel of the sustainable product shoot aesthetic. NATURAL POSITIONING: Position the clothing item naturally on the kraft paper surface with realistic fabric draping and contact points. The garment should appear to rest authentically on the paper surface. ECO-FRIENDLY BRANDING: The mood should align with eco-friendly, sustainable fashion branding - natural, authentic, and environmentally conscious. Think brands that emphasize sustainability and natural materials. PAPER TEXTURE: The kraft paper texture should be clearly visible, showing the natural fiber patterns and authentic paper characteristics that add visual interest and texture. WARM COLOR HARMONY: The warm brown kraft paper should create beautiful color harmony with the lighting, evoking natural, earthy tones throughout the composition. AUTHENTIC MATERIALS: Both the kraft paper and clothing should appear authentic and high-quality, suitable for premium sustainable brand photography. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while achieving the sustainable kraft paper presentation.'
  },
  {
    id: 'gym-mat',
    name: 'Black Rubber Gym Mat',
    description: 'Clothing on black rubber gym mat with visible texture and directional lighting',
    thumbnail: 'https://i.imgur.com/SI9jTsT.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, athletic wear',
    prompt: 'Display this exact clothing item on a black rubber gym mat with visible surface texture, using directional lighting to create mild shadows in a real gym or fitness studio environment. BLACK RUBBER GYM MAT: Use an authentic black rubber exercise mat with realistic surface texture - the kind used in gyms or fitness studios. The mat should have natural rubber texture, slight sheen, and authentic wear patterns that make it look genuine. VISIBLE SURFACE TEXTURE: The rubber mat\'s texture should be clearly visible - showing the characteristic grip patterns, surface details, and authentic rubber material properties. The texture adds visual interest and authenticity. DIRECTIONAL LIGHTING: Use focused, directional lighting that creates definition and mild shadows. The lighting should be similar to gym lighting - bright enough to see details clearly but with some contrast and dimension. MILD SHADOWS: Create realistic but not harsh shadows cast by the clothing onto the rubber mat surface. The shadows should be proportional and add depth while maintaining the fitness studio aesthetic. GYM/FITNESS STUDIO SETTING: The environment should feel like a real gym or fitness studio - authentic, functional, and athletic. Think professional fitness photography or athletic brand campaigns. NATURAL POSITIONING: Position the clothing item naturally on the mat surface with realistic contact points and fabric behavior. The garment should appear to rest authentically on the rubber surface. ATHLETIC AESTHETIC: The overall mood should align with fitness and athletic branding - energetic, functional, and performance-oriented. Suitable for sportswear or athletic apparel marketing. AUTHENTIC ENVIRONMENT: The scene should feel like it was genuinely shot in a fitness facility, not a studio with props. Maintain authenticity in the lighting and atmosphere. RUBBER MATERIAL INTERACTION: Show realistic interaction between the clothing fabric and rubber mat surface - both materials should behave naturally with authentic material physics. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while achieving the authentic gym mat presentation.'
  },

  // NEW PRODUCT STUDIO TEMPLATES
  {
    id: 'glossy-black-pedestal',
    name: 'Glossy Black Pedestal',
    description: 'Product on glossy black pedestal under white spotlight in dark studio',
    thumbnail: 'https://i.imgur.com/GiRevYg.png',
    category: 'products',
    goodFor: 'Electronics, cosmetics, luxury items, gadgets',
    prompt: 'Photograph this exact product on a glossy black pedestal under a focused white spotlight in a dark, high-end studio with dramatic shadows and moody background. GLOSSY BLACK PEDESTAL: Use a sleek, glossy black pedestal or platform with a mirror-like finish that creates reflections. The pedestal should be geometric and modern, perfectly smooth with no imperfections. FOCUSED WHITE SPOTLIGHT: Create a bright, focused white spotlight that illuminates the product from above, creating a dramatic circle of light. The spotlight should be intense and directional, highlighting the product while leaving the surroundings in darkness. DARK HIGH-END STUDIO: The background should be deep black or very dark charcoal, creating a premium, luxury studio atmosphere. The darkness should feel intentional and sophisticated, not empty or void. DRAMATIC SHADOWS: The spotlight should cast strong, well-defined shadows that add depth and drama. Shadows should be crisp near the product and gradually soften as they extend outward. MOODY BACKGROUND: The dark background should have subtle variations and gradients that add visual interest without being distracting. Think high-end product photography for luxury brands. REFLECTIVE SURFACE: The glossy black pedestal should create realistic reflections of the product, adding visual impact and premium feel. PERFECT PRODUCT CENTERING: Position the product EXACTLY in the center of the pedestal both horizontally and vertically. The product must be PRECISELY CENTERED with equal distance from all edges of the pedestal. Ensure perfect stability and symmetrical placement - NO off-center positioning, tilting, or uneven placement. The product should be the clear focal point, dramatically lit against the dark surroundings with absolutely perfect central positioning. HIGH-END AESTHETIC: The overall mood should evoke luxury, sophistication, and premium quality - suitable for high-end product marketing. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy.'
  },
  {
    id: 'marble-kitchen-counter',
    name: 'Marble Kitchen Counter',
    description: 'Product on white marble kitchen countertop with natural sunlight',
    thumbnail: 'https://i.imgur.com/6SANSsh.png',
    category: 'products',
    goodFor: 'Kitchen items, food products, household goods, appliances',
    prompt: 'Photograph this exact product on a white marble kitchen countertop with natural sunlight pouring in from a nearby window, creating soft shadows and a homey ambiance. WHITE MARBLE COUNTERTOP: Use premium white marble with subtle gray veining, polished to a smooth finish. The marble should look authentic with natural stone patterns and realistic surface qualities. NATURAL SUNLIGHT: Create the effect of warm, natural sunlight streaming through a nearby window. The light should be soft and diffused, not harsh, creating a pleasant and inviting kitchen atmosphere. SOFT SHADOWS: The natural lighting should cast gentle, realistic shadows that add depth without being dramatic. Shadows should feel natural and homey, like actual kitchen lighting. HOMEY AMBIANCE: The overall atmosphere should feel warm, comfortable, and domestic - like a real family kitchen. The mood should be inviting and lived-in, not sterile or commercial. KITCHEN SETTING: Suggest a kitchen environment without showing too much detail - perhaps subtle hints of kitchen elements in the background blur or lighting quality. WINDOW LIGHTING: The lighting should have the quality of natural window light - soft, warm, and directional from one side, creating realistic light patterns. MARBLE TEXTURE: The marble surface should show authentic stone characteristics - smooth, polished, with natural veining patterns that add visual interest. DOMESTIC PRODUCT PHOTOGRAPHY: The style should feel like lifestyle product photography - authentic, warm, and suitable for household or kitchen products. NATURAL POSITIONING: Position the product naturally on the marble surface as if it belongs in a real kitchen setting. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy.'
  },
  {
    id: 'hand-held-product',
    name: 'Hand-Held Product',
    description: 'Product held in realistic human hand with shallow depth of field',
    thumbnail: 'https://i.imgur.com/XTRuD4m.png',
    category: 'products',
    goodFor: 'Small electronics, cosmetics, tech gadgets, personal items',
    prompt: 'Photograph this exact product being held in a realistic human hand with no face visible, using shallow depth of field and soft lighting against a clean studio background. REALISTIC HUMAN HAND: Show a natural, well-groomed human hand holding the product. The hand should look realistic with natural skin tone, proper proportions, and natural positioning. No face or other body parts should be visible. NATURAL GRIP: The hand should hold the product in a natural, comfortable way that makes sense for the product type. The grip should look effortless and authentic, not forced or awkward. SHALLOW DEPTH OF FIELD: Use a shallow depth of field to blur the background while keeping the product and hand in sharp focus. The background should be softly out of focus, creating visual separation. SOFT LIGHTING: Use gentle, even lighting that illuminates both the product and hand naturally. Avoid harsh shadows while maintaining enough contrast to show details and textures. CLEAN STUDIO BACKGROUND: The background should be clean and neutral - white or light gray - and completely out of focus due to the shallow depth of field. NO FACE VISIBLE: Ensure no part of the person\'s face, body, or clothing is visible in the frame. Focus entirely on the hand and product interaction. PROFESSIONAL QUALITY: The image should have the quality of professional product photography with perfect focus, exposure, and composition. NATURAL INTERACTION: The hand and product should interact naturally, showing how the product would realistically be held or used. SCALE REFERENCE: The hand provides natural scale reference, helping viewers understand the product\'s actual size. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy.'
  },
  {
    id: 'glass-cube-display',
    name: 'Glass Cube Display',
    description: 'Product inside transparent glass cube on reflective surface with dramatic lighting',
    thumbnail: 'https://i.imgur.com/MMWEjmM.png',
    category: 'products',
    goodFor: 'Luxury items, jewelry, collectibles, premium products',
    prompt: 'Photograph this exact product inside a transparent glass cube sitting on a reflective surface with dramatic top-down lighting in a minimalist space. TRANSPARENT GLASS CUBE: Use a perfectly clear glass display cube or box with clean edges and flawless transparency. The glass should be crystal clear without any tinting, scratches, or imperfections. REFLECTIVE SURFACE: Place the glass cube on a highly reflective surface - polished metal, mirror, or glossy black material that creates clear reflections of both the cube and product. DRAMATIC TOP-DOWN LIGHTING: Use strong, directional lighting from above that creates dramatic illumination through the glass cube. The lighting should create interesting light patterns and reflections. MINIMALIST SPACE: The environment should be clean, minimal, and uncluttered - think modern gallery or high-end display space with neutral colors and clean lines. GLASS REFLECTIONS: The glass cube should create realistic reflections and refractions that add visual interest and premium feel. Light should interact naturally with the glass surfaces. MUSEUM QUALITY: The overall aesthetic should feel like a museum display or high-end gallery installation - sophisticated, clean, and professionally presented. PRODUCT PROTECTION: The glass cube should appear to be protecting and showcasing the product, adding to its perceived value and importance. LIGHT PLAY: The dramatic lighting should create interesting light and shadow patterns both inside and outside the glass cube. PREMIUM PRESENTATION: The display should feel exclusive and valuable, suitable for luxury or collectible products. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while showing them through the glass cube.'
  },
  {
    id: 'wooden-crate-warehouse',
    name: 'Wooden Crate Warehouse',
    description: 'Product on rough wooden crate in dusty warehouse with cinematic lighting',
    thumbnail: 'https://i.imgur.com/ClVqP9Z.png',
    category: 'products',
    goodFor: 'Industrial products, tools, vintage items, rugged goods',
    prompt: 'Photograph this exact product sitting on a rough wooden crate in a dusty warehouse setting with cinematic side lighting and ambient dust particles. ROUGH WOODEN CRATE: Use an authentic wooden shipping crate or box with rough, weathered wood texture. The wood should show natural wear, grain patterns, and realistic aging that makes it look genuinely used. DUSTY WAREHOUSE SETTING: Create an atmospheric warehouse environment with concrete floors, industrial elements, and a sense of authentic working space. The setting should feel real and functional, not staged. CINEMATIC SIDE LIGHTING: Use dramatic side lighting that creates strong contrast and mood. The lighting should be directional and atmospheric, similar to film lighting techniques. AMBIENT DUST PARTICLES: Include subtle dust particles floating in the air, visible in the light beams. This adds atmosphere and authenticity to the warehouse setting. INDUSTRIAL ATMOSPHERE: The overall mood should be rugged, authentic, and industrial - perfect for tools, equipment, or products that emphasize durability and functionality. WEATHERED TEXTURES: Both the wooden crate and warehouse environment should show realistic wear and weathering that adds character and authenticity. DRAMATIC SHADOWS: The side lighting should cast strong, well-defined shadows that add depth and visual drama to the composition. AUTHENTIC ENVIRONMENT: The warehouse setting should feel like a real working space, not a clean studio setup. Include subtle industrial details that add to the atmosphere. RUGGED AESTHETIC: The overall presentation should emphasize strength, durability, and industrial quality - suitable for products that target professional or industrial markets. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while placing them in this rugged warehouse environment.'
  },
  {
    id: 'forest-floor-natural',
    name: 'Forest Floor Natural',
    description: 'Product on mossy forest floor with natural light and organic elements',
    thumbnail: 'https://i.imgur.com/ZkKZl5H.png',
    category: 'products',
    goodFor: 'Natural products, outdoor gear, eco-friendly items, organic goods',
    prompt: 'Photograph this exact product placed on a mossy forest floor with ambient natural light filtering through trees, surrounded by leaves, rocks, or bark. MOSSY FOREST FLOOR: Create an authentic forest floor setting with soft green moss, natural texture variations, and organic surface details. The moss should look lush and realistic. AMBIENT NATURAL LIGHT: Use soft, diffused natural lighting that filters through tree canopy. The light should be gentle and dappled, creating a peaceful, organic atmosphere. ORGANIC ELEMENTS: Surround the product with natural forest elements - fallen leaves, small rocks, pieces of bark, or twigs. These should complement the product without overwhelming it. FOREST ATMOSPHERE: The overall environment should feel like a real forest setting - peaceful, natural, and harmonious with nature. FILTERED LIGHTING: The light should have the quality of sunlight filtering through leaves - soft, warm, and naturally diffused with gentle shadows. NATURAL TEXTURES: Emphasize the contrast between the manufactured product and the organic textures of moss, bark, and forest floor materials. ECO-FRIENDLY AESTHETIC: The presentation should align with environmental consciousness and natural living - perfect for eco-friendly, outdoor, or natural products. PEACEFUL MOOD: The overall atmosphere should be calm, serene, and connected to nature - evoking feelings of environmental harmony. ORGANIC COMPOSITION: Arrange the natural elements in a way that feels random and natural, not artificially placed or overly styled. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while integrating them naturally into the forest environment.'
  },
  {
    id: 'spa-bathtub-edge',
    name: 'Spa Bathtub Edge',
    description: 'Product on stone bathtub edge with spa atmosphere and warm lighting',
    thumbnail: 'https://i.imgur.com/cm7R7Kc.png',
    category: 'products',
    goodFor: 'Bath products, cosmetics, wellness items, luxury goods',
    prompt: 'Photograph this exact product on the edge of a stone bathtub with a spa-like atmosphere, warm lighting, and a soft towel nearby. STONE BATHTUB EDGE: Use a natural stone or marble bathtub edge with realistic texture and coloring. The stone should look premium and spa-like with smooth, polished surfaces. SPA-LIKE ATMOSPHERE: Create a luxurious spa environment that feels relaxing, clean, and premium. The overall mood should be serene and indulgent. WARM LIGHTING: Use soft, warm lighting that creates a cozy, relaxing atmosphere. The lighting should be gentle and inviting, not harsh or clinical. SOFT TOWEL NEARBY: Include a plush, high-quality towel placed naturally nearby - folded or casually draped to add to the spa aesthetic. The towel should look luxurious and inviting. LUXURY BATHROOM SETTING: Suggest a high-end bathroom or spa environment without showing too much detail - focus on premium materials and clean, sophisticated design. RELAXING MOOD: The overall atmosphere should evoke relaxation, self-care, and luxury - perfect for bath products, cosmetics, or wellness items. PREMIUM MATERIALS: Emphasize high-quality materials like natural stone, plush textiles, and clean surfaces that suggest luxury and quality. CLEAN COMPOSITION: Keep the composition clean and uncluttered, focusing on the product while maintaining the spa atmosphere. WELLNESS AESTHETIC: The presentation should align with wellness, self-care, and luxury lifestyle branding. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the luxurious spa environment.'
  },
  {
    id: 'floating-clouds-ethereal',
    name: 'Floating Clouds Ethereal',
    description: 'Product floating above soft white clouds with light rays and dreamy atmosphere',
    thumbnail: 'https://i.imgur.com/D4GekF5.png',
    category: 'products',
    goodFor: 'Tech products, innovative items, dream-related products, premium goods',
    prompt: 'Photograph this exact product floating slightly above soft, white clouds in a surreal sky with light rays and soft shadows, creating a dreamy, ethereal atmosphere. SOFT WHITE CLOUDS: Create realistic, fluffy white clouds that look soft and inviting. The clouds should have natural variations in density and texture, appearing genuinely cloud-like. FLOATING PRODUCT: Position the product as if it\'s gently floating or hovering just above the cloud surface. The floating effect should look natural and magical, not artificial. SURREAL SKY: Create a beautiful sky environment with soft colors - perhaps gentle blues, whites, or warm golden tones that enhance the dreamy atmosphere. LIGHT RAYS: Include gentle light rays or sunbeams that add to the ethereal quality. The light should be soft and heavenly, creating a sense of wonder. SOFT SHADOWS: Cast gentle shadows on the clouds below the floating product. The shadows should be soft and realistic, showing the product\'s relationship to the cloud surface. DREAMY ATMOSPHERE: The overall mood should be peaceful, magical, and otherworldly - evoking feelings of aspiration, dreams, and possibility. ETHEREAL QUALITY: The lighting and atmosphere should feel heavenly or celestial, with a sense of lightness and transcendence. MAGICAL REALISM: While surreal, the scene should still feel believable and professionally executed, not cartoonish or obviously fake. ASPIRATIONAL MOOD: The presentation should evoke feelings of reaching for dreams, innovation, or achieving something special. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the magical floating effect.'
  },
  {
    id: 'concrete-podium-harsh',
    name: 'Concrete Podium Harsh',
    description: 'Product on rough concrete podium with harsh directional lighting and deep shadows',
    thumbnail: 'https://i.imgur.com/ORvkIhl.png',
    category: 'products',
    goodFor: 'Industrial products, tech items, modern goods, architectural products',
    prompt: 'Photograph this exact product on a rough concrete podium with harsh directional lighting casting deep shadows on a neutral wall behind it. ROUGH CONCRETE PODIUM: Use authentic concrete with natural texture, subtle imperfections, and realistic surface variations. The concrete should look industrial and raw, not perfectly smooth. HARSH DIRECTIONAL LIGHTING: Create strong, directional lighting that produces sharp contrasts and well-defined shadows. The lighting should be dramatic and architectural in quality. DEEP SHADOWS: The harsh lighting should cast strong, deep shadows that add drama and visual impact. Shadows should be crisp and well-defined, creating geometric patterns. NEUTRAL WALL BACKGROUND: Use a clean, neutral wall (concrete, plaster, or painted) that provides a simple backdrop without competing with the product. INDUSTRIAL AESTHETIC: The overall mood should be modern, urban, and industrial - emphasizing strength, functionality, and contemporary design. ARCHITECTURAL LIGHTING: The lighting style should feel architectural or gallery-like - professional, intentional, and dramatic. CONCRETE TEXTURE: Emphasize the contrast between the rough concrete texture and the product\'s manufactured surfaces. MODERN MINIMALISM: Keep the composition clean and minimal while maintaining the industrial edge through materials and lighting. URBAN ATMOSPHERE: The presentation should evoke modern urban environments, contemporary architecture, and industrial design. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the dramatic industrial presentation.'
  },
  {
    id: 'water-reflection-hover',
    name: 'Water Reflection Hover',
    description: 'Product hovering above still water with sharp reflection and subtle ripples',
    thumbnail: 'https://i.imgur.com/hB3Dvnf.png',
    category: 'products',
    goodFor: 'Electronics, luxury items, innovative products, tech gadgets',
    prompt: 'Photograph this exact product hovering just above still water with a sharp reflection below and subtle ripples around the edges. STILL WATER SURFACE: Create a perfectly calm water surface that acts like a mirror, reflecting the product with crystal clarity. The water should appear still and glass-like. HOVERING PRODUCT: Position the product as if it\'s floating or hovering just above the water surface. The hovering effect should look natural and intriguing, not obviously manipulated. SHARP REFLECTION: The water should create a perfect, sharp reflection of the product that mirrors every detail. The reflection should be clear and realistic, showing the product from below. SUBTLE RIPPLES: Include gentle ripples around the edges of the frame or very subtle disturbances in the water that add realism without disrupting the main reflection. CLEAN BACKGROUND: Keep the background minimal and clean to focus attention on the product and its reflection in the water. PROFESSIONAL LIGHTING: Use even, professional lighting that illuminates both the product and its reflection clearly without creating harsh glare on the water surface. MIRROR EFFECT: The water reflection should create a striking mirror effect that doubles the visual impact of the product presentation. SERENE ATMOSPHERE: The overall mood should be calm, peaceful, and sophisticated - suggesting precision, quality, and innovation. REALISTIC WATER: The water should behave realistically with authentic surface tension, reflections, and subtle movement. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy in both the product and its reflection.'
  },
  {
    id: 'kitchen-table-morning',
    name: 'Kitchen Table Morning',
    description: 'Product on wooden kitchen table with morning sunlight and household ambiance',
    thumbnail: 'https://i.imgur.com/JPhdElG.png',
    category: 'products',
    goodFor: 'Kitchen items, food products, household goods, breakfast items',
    prompt: 'Photograph this exact product on a wooden kitchen table with warm early-morning sunlight and soft household shadows, with a slight coffee mug blur in the foreground. WOODEN KITCHEN TABLE: Use a natural wood table with visible grain patterns and warm tones. The wood should look lived-in and authentic, like a real family kitchen table. EARLY-MORNING SUNLIGHT: Create warm, golden morning light streaming through a window. The light should be soft and inviting, with the quality of fresh morning sunlight. SOFT HOUSEHOLD SHADOWS: Cast gentle, natural shadows that feel domestic and homey. The shadows should be soft and realistic, not dramatic or harsh. COFFEE MUG BLUR: Include a slightly out-of-focus coffee mug in the foreground to suggest morning routine and add depth to the composition. The mug should be subtly blurred but recognizable. MORNING ATMOSPHERE: The overall mood should evoke the peaceful, fresh feeling of early morning in a comfortable home kitchen. DOMESTIC SETTING: Suggest a real family kitchen environment with authentic lighting and atmosphere that feels lived-in and welcoming. WARM LIGHTING: The sunlight should create warm, golden tones that make the scene feel cozy and inviting. LIFESTYLE CONTEXT: The setting should suggest daily life and routine, making the product feel like a natural part of morning activities. NATURAL COMPOSITION: Arrange elements naturally, as if capturing a real moment in a family kitchen during morning routine. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the authentic morning kitchen atmosphere.'
  },
  {
    id: 'neon-product-shelf',
    name: 'Neon Product Shelf',
    description: 'Product on stylized shelf with colored neon lighting in dark modern store',
    thumbnail: 'https://i.imgur.com/PTszxx1.png',
    category: 'products',
    goodFor: 'Tech products, gaming items, modern goods, trendy products',
    prompt: 'Photograph this exact product on a stylized product shelf lit with colored neon lighting (pink, teal, purple) in a dark, edgy modern store setting. STYLIZED PRODUCT SHELF: Use a sleek, modern shelf or display platform with clean geometric lines. The shelf should look contemporary and retail-ready. COLORED NEON LIGHTING: Illuminate the scene with vibrant neon colors - pink, teal, and purple. The neon should create dramatic colored lighting effects and atmosphere. DARK MODERN STORE: Set the scene in a dark, contemporary retail environment that feels edgy and modern. Think high-end tech stores or trendy boutiques. EDGY ATMOSPHERE: The overall mood should be urban, modern, and slightly futuristic - appealing to younger, tech-savvy consumers. NEON REFLECTIONS: The colored neon lighting should create interesting reflections and color play on the product and shelf surfaces. RETAIL ENVIRONMENT: The setting should feel like a premium retail space - clean, modern, and professionally designed. DRAMATIC CONTRAST: Use the contrast between the dark environment and bright neon colors to create visual impact and drama. MODERN AESTHETIC: The presentation should align with contemporary design trends and appeal to modern, urban consumers. CYBERPUNK INFLUENCE: Draw inspiration from cyberpunk aesthetics while maintaining professional product photography standards. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the neon-lit retail atmosphere.'
  },
  {
    id: 'crystal-museum-case',
    name: 'Crystal Museum Case',
    description: 'Product in high-end crystal display case with spotlights and reflections',
    thumbnail: 'https://i.imgur.com/GfTcNJn.png',
    category: 'products',
    goodFor: 'Luxury items, jewelry, collectibles, premium products',
    prompt: 'Photograph this exact product inside a high-end crystal museum display case with spotlights shining through, catching reflections and creating a premium presentation. HIGH-END CRYSTAL CASE: Use a pristine crystal or high-quality glass display case with perfect clarity and clean edges. The case should look museum-quality and expensive. MUSEUM SETTING: Create a sophisticated museum or gallery environment with neutral colors, clean lines, and professional presentation. SPOTLIGHT ILLUMINATION: Use focused spotlights that shine through the crystal case, creating dramatic lighting effects and highlighting the product beautifully. CRYSTAL REFLECTIONS: The crystal case should create multiple reflections and light refractions that add visual interest and premium feel. PREMIUM PRESENTATION: The overall display should feel exclusive, valuable, and museum-worthy - suitable for high-end or collectible products. PROFESSIONAL LIGHTING: Use museum-quality lighting that showcases the product perfectly while creating interesting light play through the crystal. LUXURY ATMOSPHERE: The environment should evoke luxury, exclusivity, and high value - making the product appear precious and important. GALLERY QUALITY: The presentation should meet gallery or museum standards for displaying valuable items. PROTECTIVE DISPLAY: The crystal case should suggest that the product is valuable enough to require protection and special presentation. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while showcasing them through the crystal display case.'
  },
  {
    id: 'floating-motion-blur',
    name: 'Floating Motion Blur',
    description: 'Product floating with orbiting ring and motion blur to imply movement',
    thumbnail: 'https://i.imgur.com/ihiLFk2.png',
    category: 'products',
    goodFor: 'Tech products, innovative items, futuristic goods, dynamic products',
    prompt: 'Photograph this exact product floating in mid-air with a subtle orbiting ring and faint motion blur to imply rotation or movement. FLOATING PRODUCT: Position the product as if it\'s levitating or floating in space. The floating effect should look natural and intriguing, suggesting advanced technology or innovation. ORBITING RING: Include a subtle geometric ring or circular element that appears to orbit around the product. The ring should be elegant and not overpower the product itself. MOTION BLUR: Add faint motion blur effects that suggest rotation, movement, or energy. The blur should be subtle and professional, not distracting from the product details. DYNAMIC ENERGY: The overall composition should suggest movement, innovation, and dynamic energy - perfect for tech products or cutting-edge items. FUTURISTIC ATMOSPHERE: Create a clean, futuristic environment that suggests advanced technology and innovation. CLEAN BACKGROUND: Use a minimal, clean background that doesn\'t compete with the floating effect and motion elements. PROFESSIONAL EXECUTION: While creative, the effect should maintain professional product photography standards and not look gimmicky. TECH AESTHETIC: The presentation should appeal to tech-savvy consumers and suggest innovation, advancement, and modern design. SUBTLE EFFECTS: All motion and floating effects should enhance rather than distract from the product itself. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the dynamic floating effect.'
  },
  {
    id: 'desert-rock-golden-hour',
    name: 'Desert Rock Golden Hour',
    description: 'Product on desert rock slab at golden hour with long shadows and warm tones',
    thumbnail: 'https://i.imgur.com/rMqE5nC.png',
    category: 'products',
    goodFor: 'Outdoor products, rugged items, adventure gear, natural products',
    prompt: 'Photograph this exact product on a desert rock slab at golden hour, with long shadows and warm tones, adding sandy textures subtly around the base. DESERT ROCK SLAB: Use authentic desert rock with natural texture, weathering, and realistic stone characteristics. The rock should look sun-baked and naturally weathered. GOLDEN HOUR LIGHTING: Create warm, golden sunlight characteristic of desert golden hour. The light should be warm, directional, and create beautiful color temperature. LONG SHADOWS: The low-angle golden hour sun should cast long, dramatic shadows that add depth and visual interest to the composition. WARM TONES: Emphasize warm colors throughout - golden light, amber rock tones, and sandy hues that create a cohesive desert palette. SANDY TEXTURES: Include subtle sand textures around the base of the rock, suggesting the desert environment without overwhelming the composition. DESERT ATMOSPHERE: Create an authentic desert environment that feels vast, open, and naturally beautiful. NATURAL WEATHERING: Show realistic weathering effects on the rock from sun, wind, and natural desert conditions. OUTDOOR ADVENTURE: The presentation should evoke feelings of outdoor adventure, exploration, and connection with nature. RUGGED BEAUTY: Emphasize the contrast between the manufactured product and the rugged, natural desert environment. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while integrating them into the desert golden hour setting.'
  },
  {
    id: 'rustic-desk-flatlay',
    name: 'Rustic Desk Flatlay',
    description: 'Product flatlay on wooden desk with vintage props and ambient light',
    thumbnail: 'https://i.imgur.com/PnVOd7W.png',
    category: 'products',
    goodFor: 'Books, stationery, vintage items, artisan products, lifestyle goods',
    prompt: 'Photograph this exact product in a flatlay arrangement on a rustic wooden desk with vintage props like old books, candles, or glasses, with soft ambient light. RUSTIC WOODEN DESK: Use weathered, natural wood with visible grain patterns, natural imperfections, and authentic aging that creates character and warmth. FLATLAY ARRANGEMENT: Shoot from directly above to create a perfectly composed flat lay with the product as the focal point surrounded by complementary props. VINTAGE PROPS: Include carefully selected vintage items - old leather-bound books, antique glasses, brass candles, or similar props that enhance the aesthetic without competing. SOFT AMBIENT LIGHT: Use gentle, even lighting that illuminates the entire flatlay evenly. The light should be warm and inviting, not harsh or directional. ARTISAN AESTHETIC: The overall mood should evoke craftsmanship, tradition, and authentic quality - perfect for artisan or heritage products. BALANCED COMPOSITION: Arrange all elements with careful attention to visual balance, negative space, and aesthetic harmony. WARM ATMOSPHERE: Create a cozy, intellectual atmosphere that suggests quality, tradition, and thoughtful design. VINTAGE STYLING: The props and arrangement should feel authentically vintage, not artificially aged or overly styled. LIFESTYLE CONTEXT: The setting should suggest a refined, thoughtful lifestyle that values quality and tradition. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the vintage desk flatlay composition.'
  },
  {
    id: 'futuristic-tech-lab',
    name: 'Futuristic Tech Lab',
    description: 'Product on metallic surface in sterile tech lab with blue ambient lighting',
    thumbnail: 'https://i.imgur.com/BCvdJXe.png',
    category: 'products',
    goodFor: 'Electronics, tech gadgets, scientific instruments, innovative products',
    prompt: 'Photograph this exact product on a futuristic metallic surface in a sterile tech lab with blue ambient lighting and faint glowing data screens in the background. FUTURISTIC METALLIC SURFACE: Use a sleek, brushed metal or chrome surface that looks high-tech and futuristic. The surface should be perfectly clean and reflective. STERILE TECH LAB: Create a clean, modern laboratory environment that feels advanced and scientific. Everything should appear pristine and high-tech. BLUE AMBIENT LIGHTING: Use cool blue lighting that creates a futuristic, technological atmosphere. The blue light should be subtle but pervasive throughout the scene. GLOWING DATA SCREENS: Include faint, out-of-focus glowing screens or displays in the background that suggest advanced technology and data processing. SCIENTIFIC ATMOSPHERE: The overall environment should feel like a cutting-edge research facility or advanced technology lab. HIGH-TECH AESTHETIC: The presentation should emphasize innovation, advanced technology, and scientific precision. CLEAN MINIMALISM: Keep the composition clean and minimal while maintaining the high-tech atmosphere through lighting and materials. FUTURISTIC MOOD: The scene should feel like it\'s from the near future - advanced but believable. PRECISION LIGHTING: Use precise, controlled lighting that suggests scientific accuracy and technological advancement. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the futuristic laboratory environment.'
  },
  {
    id: 'rotating-display-platform',
    name: 'Rotating Display Platform',
    description: 'Product on glossy black rotating platform in 360° light studio',
    thumbnail: 'https://i.imgur.com/PNrS2BS.png',
    category: 'products',
    goodFor: 'Electronics, luxury items, tech products, premium goods',
    prompt: 'Photograph this exact product centered on a glossy black rotating display platform in a 360° light studio with smooth soft shadows. GLOSSY BLACK PLATFORM: Use a perfectly glossy black circular platform that creates mirror-like reflections. The platform should appear to be rotating or capable of rotation. ROTATING DISPLAY: The platform should suggest rotation or movement, as if showcasing the product from all angles. This can be implied through subtle motion blur at the platform edges. 360° LIGHT STUDIO: Create professional studio lighting that comes from all directions, eliminating harsh shadows while maintaining depth and dimension. SMOOTH SOFT SHADOWS: Use the all-around lighting to create gentle, soft shadows that define the product without being dramatic or harsh. PROFESSIONAL PRESENTATION: The setup should look like a high-end product photography studio designed for premium product showcases. REFLECTIVE SURFACE: The glossy black platform should create realistic reflections of the product, adding visual impact and premium feel. STUDIO PERFECTION: The lighting and setup should be technically perfect, suitable for e-commerce or premium product marketing. PREMIUM AESTHETIC: The overall presentation should suggest luxury, quality, and professional standards. CLEAN BACKGROUND: Keep the background neutral and clean to focus entirely on the product and its presentation on the rotating platform. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the professional rotating display presentation.'
  },
  {
    id: 'freezer-cold-storage',
    name: 'Freezer Cold Storage',
    description: 'Product in freezer with light frost, cold vapor, and metallic shelf',
    thumbnail: 'https://i.imgur.com/lkbb89Z.png',
    category: 'products',
    goodFor: 'Frozen foods, cold products, beverages, preserved items',
    prompt: 'Photograph this exact product centered on a metallic shelf in a freezer or cold-storage room with light frost, cold vapor, and industrial refrigeration atmosphere. METALLIC SHELF: Use a stainless steel or chrome wire shelf typical of commercial refrigeration. The shelf should show realistic condensation and slight frost formation. LIGHT FROST: Add subtle frost effects on surfaces around the product and shelf. The frost should look natural and realistic, not overdone or artificial. COLD VAPOR: Include gentle vapor or mist effects that suggest cold temperature. The vapor should be subtle and atmospheric, not overwhelming. FREEZER ENVIRONMENT: Create an authentic freezer or cold storage atmosphere with appropriate lighting, surfaces, and temperature effects. INDUSTRIAL REFRIGERATION: The setting should feel like a commercial freezer or cold storage facility - functional and industrial rather than domestic. COLD LIGHTING: Use cool, bluish-white lighting typical of refrigeration units. The lighting should feel cold and industrial. CONDENSATION EFFECTS: Show realistic condensation on metal surfaces and slight moisture effects that occur in cold environments. TEMPERATURE CONTRAST: Emphasize the cold environment through visual cues like frost, vapor, and the way light interacts with cold surfaces. AUTHENTIC ATMOSPHERE: The cold storage environment should feel genuine and functional, not artificially created. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the authentic cold storage environment.'
  },
  {
    id: 'cracked-glass-industrial',
    name: 'Cracked Glass Industrial',
    description: 'Product on cracked glass surface with dramatic lighting and industrial atmosphere',
    thumbnail: 'https://i.imgur.com/XPIANAX.png',
    category: 'products',
    goodFor: 'Rugged products, industrial items, protective gear, durable goods',
    prompt: 'Photograph this exact product centered on a cracked-glass surface with overhead dramatic lighting, cinematic shadow play, and a dark industrial atmosphere. CRACKED GLASS SURFACE: Use tempered glass with realistic crack patterns - spider web cracks or impact patterns that look authentic and dramatic without being completely shattered. OVERHEAD DRAMATIC LIGHTING: Create strong, directional lighting from above that highlights the glass cracks and creates dramatic shadows and light patterns. CINEMATIC SHADOW PLAY: Use the lighting to create interesting shadow patterns through the cracked glass. Shadows should be dramatic and artistic, adding visual impact. DARK INDUSTRIAL ATMOSPHERE: Set the scene in a dark, industrial environment with concrete, metal, or urban elements that suggest strength and durability. GLASS CRACK DETAILS: The cracks should catch and refract light in interesting ways, creating visual drama and emphasizing the contrast between fragility and the product\'s durability. DRAMATIC CONTRAST: Use strong contrast between light and dark areas to create visual impact and emphasize the dramatic nature of the cracked glass. INDUSTRIAL AESTHETIC: The overall mood should be urban, industrial, and slightly edgy - perfect for products that emphasize strength, protection, or durability. LIGHT REFRACTION: Show how light interacts with the cracked glass surface, creating interesting optical effects and visual interest. STRENGTH METAPHOR: The cracked glass should serve as a metaphor for overcoming challenges or protection, suitable for rugged or protective products. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the dramatic cracked glass presentation.'
  },

  // NEW PRODUCT TEMPLATES - Latest additions
  {
    id: 'rustic-cafe-table',
    name: 'Rustic Café Table',
    description: 'Product on rustic wooden café table with out-of-focus pastries and natural window lighting',
    thumbnail: 'https://i.imgur.com/g0fV3nr.png',
    category: 'products',
    goodFor: 'Food products, beverages, café items, artisan goods, lifestyle products',
    prompt: 'Photograph this exact product placed on a rustic wooden café table with out-of-focus pastries and natural window lighting for a cozy, café atmosphere. RUSTIC WOODEN TABLE: Use authentic weathered wood with natural grain patterns, subtle imperfections, and warm tones that suggest a well-loved café environment. OUT-OF-FOCUS PASTRIES: Include subtle, blurred pastries or café items in the background to suggest the café setting without competing with the main product. These should be artfully out of focus. NATURAL WINDOW LIGHTING: Use soft, warm natural light streaming through a nearby window. The lighting should feel authentic to a café environment - gentle, inviting, and naturally directional. COZY CAFÉ ATMOSPHERE: Create the warm, inviting atmosphere of a neighborhood café or bistro. The environment should feel comfortable, lived-in, and welcoming. LIFESTYLE CONTEXT: The setting should suggest daily rituals, comfort, and social connection - making the product feel like part of a pleasant café experience. ARTISANAL QUALITY: The overall presentation should suggest craftsmanship, quality, and attention to detail - perfect for artisan products or premium café items. WARM AMBIANCE: Use warm color tones throughout - golden wood, soft lighting, and cozy atmosphere that makes viewers want to linger. AUTHENTIC DETAILS: Include realistic café details like natural wood wear, authentic lighting, and genuine café atmosphere without overdoing prop elements. INVITING MOOD: The overall mood should be welcoming, comfortable, and suggest the pleasure of a café visit or coffee break. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the cozy café presentation.'
  },
  {
    id: 'seamless-white-cube',
    name: 'Seamless White Cube',
    description: 'Product centered in seamless white cube with soft edge shadows and high-key lighting',
    thumbnail: 'https://i.imgur.com/EGYFLau.png',
    category: 'products',
    goodFor: 'Electronics, cosmetics, luxury items, premium products, e-commerce',
    prompt: 'Photograph this exact product centered inside a seamless white cube environment with soft edge shadows and perfectly balanced high-key lighting for professional e-commerce display. SEAMLESS WHITE CUBE: Create a perfect white cube environment with no visible corners, edges, or seams. The background should appear infinite and pristinely white from all directions. CENTERED POSITIONING: Position the product perfectly centered within the white cube space with equal spacing on all sides for optimal e-commerce presentation. SOFT EDGE SHADOWS: Create subtle, soft shadows around the product edges that define its shape without being harsh or distracting. Shadows should be minimal but present for depth. HIGH-KEY LIGHTING: Use bright, even lighting that eliminates harsh shadows while maintaining enough contrast to show product details and textures clearly. BALANCED ILLUMINATION: Ensure perfectly even lighting from multiple directions that eliminates hot spots and creates consistent illumination across the entire product. PROFESSIONAL E-COMMERCE: The setup should meet the highest standards for e-commerce product photography - clean, bright, and distraction-free. PRISTINE PRESENTATION: Everything should appear flawless and professional, suitable for premium product catalogs or high-end online retail. OPTIMAL CLARITY: The lighting and setup should reveal every product detail with perfect clarity while maintaining the clean, minimal aesthetic. COMMERCIAL QUALITY: The final image should meet commercial photography standards for luxury brands and premium e-commerce platforms. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the seamless white cube presentation.'
  },
  {
    id: 'unboxing-desk-setup',
    name: 'Desk Setting',
    description: 'Product on modern desk with accessories for professional lifestyle setting',
    thumbnail: 'https://i.imgur.com/BM02jYY.png',
    category: 'products',
    goodFor: 'Electronics, tech gadgets, luxury items, office supplies, premium products',
    prompt: 'Photograph this exact product elegantly positioned on a modern desk surrounded by carefully arranged accessories with soft directional lighting for a professional lifestyle setting. MODERN DESK SURFACE: Use a clean, contemporary desk with smooth finish and modern aesthetic. The surface should be uncluttered and professional looking. ELEGANT POSITIONING: Position the product prominently on the desk surface, suggesting it is being used or displayed in a real work environment. CAREFULLY ARRANGED ACCESSORIES: Include relevant accessories or complementary items tastefully arranged around the main product. These should enhance rather than compete with the focal point and suggest productive use. SOFT DIRECTIONAL LIGHTING: Use gentle, directional lighting that creates depth and dimension while maintaining the clean, modern aesthetic of a professional workspace. PREMIUM LIFESTYLE: The overall presentation should suggest quality, productivity, and the refined taste of someone who appreciates well-designed products. TECH AESTHETIC: The environment should feel contemporary and tech-savvy, appealing to modern professionals who value both function and style. AUTHENTIC SETTING: The scene should feel like a genuine workspace, suggesting the product fits naturally into a productive, modern lifestyle. PROFESSIONAL CONTEXT: Suggest the environment of someone who appreciates quality products and maintains an organized, efficient workspace. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the professional desk setting presentation.'
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
  
  // Progressive flow state
  const [currentStep, setCurrentStep] = useState<'upload' | 'creative-type' | 'clothing-subcategory' | 'template-selection' | 'customization' | 'library'>('upload')
  const [selectedCreativeType, setSelectedCreativeType] = useState<string>('')
  const [selectedClothingSubType, setSelectedClothingSubType] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<StyleOption | null>(null)
  
  // Weekly usage system - 50 generations per week (universal)
  const WEEKLY_LIMIT = 50
  const STORAGE_LIMIT = 50 // Maximum saved creatives per brand
  const [usageData, setUsageData] = useState({
    current: 0,
    weekStartDate: ''
  })
  
  // Generated creatives and library state
  const [generatedCreatives, setGeneratedCreatives] = useState<GeneratedCreative[]>([])
  const [isLoadingCreatives, setIsLoadingCreatives] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Record<string, { original: string, generated: string }>>({})
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('')
  // Multi-image support
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [isMultiMode, setIsMultiMode] = useState(false)
  const [collageUrl, setCollageUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string>('')
  const [selectedStyle, setSelectedStyle] = useState<StyleOption | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isLoadingAfterBrandSelection, setIsLoadingAfterBrandSelection] = useState(false)
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0)
  const [showMoreInfo, setShowMoreInfo] = useState(false)
  const [customText, setCustomText] = useState({ top: '', bottom: '' })
  const [textPresets] = useState({
    none: { label: 'None', value: '', customizable: false },
    custom: { label: 'Custom', value: '', customizable: true },
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
    mustHave: { label: 'Must Have', value: 'MUST HAVE', customizable: false }
  })
  const [selectedTopPreset, setSelectedTopPreset] = useState<string>('none')
  const [selectedBottomPreset, setSelectedBottomPreset] = useState<string>('none')
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
  
  // Additional state for modals and tabs
  const [activeTab, setActiveTab] = useState<'create' | 'template' | 'generated'>('create')
  const [showStyleModal, setShowStyleModal] = useState(false)
  const [showProductPopup, setShowProductPopup] = useState(false)

  // Function to remove individual image
  const removeImage = (index: number) => {
    if (isMultiMode) {
      const newImages = uploadedImages.filter((_, i) => i !== index)
      const newUrls = uploadedImageUrls.filter((_, i) => i !== index)
      
      if (newImages.length === 0) {
        // No images left, clear everything
        setUploadedImages([])
        setUploadedImageUrls([])
        setIsMultiMode(false)
        setCollageUrl('')
        setGeneratedImage('')
        toast.success('All images removed')
      } else if (newImages.length === 1) {
        // Only one image left, switch to single mode
        setUploadedImage(newImages[0])
        setUploadedImageUrl(newUrls[0])
        setUploadedImages([])
        setUploadedImageUrls([])
        setIsMultiMode(false)
        setCollageUrl('')
        setGeneratedImage('')
        toast.success('Image removed. Switched to single image mode.')
      } else {
        // Multiple images remaining, update arrays and regenerate collage
        setUploadedImages(newImages)
        setUploadedImageUrls(newUrls)
        
        // Regenerate collage
        generateCollage(newImages, 'grid-2x2').then(collage => {
          setCollageUrl(collage)
          toast.success(`Image removed. ${newImages.length} images remaining.`)
        }).catch(error => {
          console.error('Error regenerating collage:', error)
          toast.error('Image removed but failed to update collage')
        })
      }
    } else {
      // Single image mode, just clear everything
      setUploadedImage(null)
      setUploadedImageUrl('')
      setGeneratedImage('')
      toast.success('Image removed')
    }
    setShowProductPopup(false)
  }

  // Template-based generation state
  const [templateImage, setTemplateImage] = useState<File | null>(null)
  const [productImageForTemplate, setProductImageForTemplate] = useState<File | null>(null)
  const [templateNotes, setTemplateNotes] = useState('')
  const [isGeneratingFromTemplate, setIsGeneratingFromTemplate] = useState(false)
  const [modalStyle, setModalStyle] = useState<StyleOption>(STYLE_OPTIONS[0])
  const [creativeName, setCreativeName] = useState('')
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'any' | ''>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showRetryModal, setShowRetryModal] = useState(false)
  const [customInstructions, setCustomInstructions] = useState('')
  const [customTemplatePrompt, setCustomTemplatePrompt] = useState('')
  const [regenerationFeedback, setRegenerationFeedback] = useState<{
    issues: string[]
    details: string
  }>({
    issues: [],
    details: ''
  })
  
  // Carousel state for template variants
  const [templateCarouselStates, setTemplateCarouselStates] = useState<{[key: string]: number}>({})
  
  // Helper functions for carousel
  const getTemplateVariants = (baseId: string) => {
    return STYLE_OPTIONS.filter(style => 
      style.id === baseId || style.id === `${baseId}-angled`
    )
  }
  
  const getCurrentVariant = (baseId: string) => {
    const variants = getTemplateVariants(baseId)
    const currentIndex = templateCarouselStates[baseId] || 0
    return variants[currentIndex] || variants[0]
  }
  
  const nextVariant = (baseId: string) => {
    const variants = getTemplateVariants(baseId)
    const currentIndex = templateCarouselStates[baseId] || 0
    const nextIndex = (currentIndex + 1) % variants.length
    setTemplateCarouselStates(prev => ({
      ...prev,
      [baseId]: nextIndex
    }))
  }
  
  const prevVariant = (baseId: string) => {
    const variants = getTemplateVariants(baseId)
    const currentIndex = templateCarouselStates[baseId] || 0
    const prevIndex = currentIndex === 0 ? variants.length - 1 : currentIndex - 1
    setTemplateCarouselStates(prev => ({
      ...prev,
      [baseId]: prevIndex
    }))
  }
  const [retryCreativeId, setRetryCreativeId] = useState('')
  const [retryImage, setRetryImage] = useState<File | null>(null)
  const [customIssueText, setCustomIssueText] = useState('')
  const [editingCreative, setEditingCreative] = useState<GeneratedCreative | null>(null)
  const [showTextOverlayModal, setShowTextOverlayModal] = useState(false)
  
  // Text overlay modal state - separate from main creation state
  const [overlaySelectedTopPreset, setOverlaySelectedTopPreset] = useState<string>('')
  const [overlaySelectedBottomPreset, setOverlaySelectedBottomPreset] = useState<string>('')
  const [overlayCustomValues, setOverlayCustomValues] = useState({ topValue: '', bottomValue: '' })
  const [overlayTextColors, setOverlayTextColors] = useState({ top: '#FFFFFF', bottom: '#FFFFFF' })
  const [overlayCustomText, setOverlayCustomText] = useState({ top: '', bottom: '' })
  
  // Store clean images without text overlays for text editing
  const [cleanImageUrls, setCleanImageUrls] = useState<Record<string, string>>({})

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showStyleModal || showRetryModal || showTextOverlayModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showStyleModal, showRetryModal])



  // Crop functionality state
  const [showCropModal, setShowCropModal] = useState(false)
  const [showFixIssuesModal, setShowFixIssuesModal] = useState(false)
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

  // Prevent background scrolling when crop modal is open
  useEffect(() => {
    if (showCropModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showCropModal])

  // Get current Monday as week start
  const getCurrentWeekStart = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Sunday = 0, Monday = 1
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    return monday.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  // Calculate days until next Monday (usage reset)
  const getDaysUntilReset = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek // If Sunday, 1 day until Monday, otherwise 8 - current day
    return daysUntilMonday
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
        
        // Dispatch event to notify other components about usage reset
        window.dispatchEvent(new CustomEvent('creative-studio-usage-updated', {
          detail: { usage: 0, limit: WEEKLY_LIMIT }
        }))
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
    
    // Dispatch event to notify other components about usage update
    window.dispatchEvent(new CustomEvent('creative-studio-usage-updated', {
      detail: { usage: newUsageData.current, limit: WEEKLY_LIMIT }
    }))
    // console.log('✅ Usage incremented to:', newUsageData.current)
  }



  // Get progress color based on usage percentage
  const getProgressColor = () => {
    if (usagePercentage > 90) return '#ef4444' // Red
    if (usagePercentage > 80) return '#f59e0b' // Amber
    if (usagePercentage > 60) return '#3b82f6' // Blue
    return '#10b981' // Green
  }



  // Load creative generations from database when brand changes
  const loadCreatives = useCallback(async () => {
    if (!selectedBrandId || !user?.id) {
      setGeneratedCreatives([])
      setIsLoadingCreatives(false)
      return
    }

    // Start loading immediately and clear old creatives
    setIsLoadingCreatives(true)
    setGeneratedCreatives([]) // Clear immediately when brand changes
    setLoadedImages({}) // Clear loaded images cache
    setLoadingImages(new Set()) // Clear loading images
    
    try {
      // console.log('📚 Loading creatives for brand:', selectedBrandId)
        const response = await fetch(`/api/creative-generations?brandId=${selectedBrandId}&limit=50`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch creatives')
        }

        const data = await response.json()
        setGeneratedCreatives(data.creatives || [])
        // console.log('✅ Loaded', data.creatives?.length || 0, 'creatives out of', data.pagination?.total || 0, 'total')
        
        // If there are more creatives than what we loaded, show a message
        if (data.pagination?.hasMore) {
          // console.log('📄 More creatives available:', data.pagination.total - data.creatives.length, 'additional creatives')
        }
        
      } catch (error) {
        console.error('Error loading creatives:', error)
        toast.error('Failed to load previous creatives')
        setGeneratedCreatives([])
      } finally {
        setIsLoadingCreatives(false)
      }
    }, [selectedBrandId, user?.id])

  useEffect(() => {
    loadCreatives()
  }, [loadCreatives])

  // Auto-load images for completed creatives when they become visible
  useEffect(() => {
    const completedCreatives = generatedCreatives.filter(c => c.status === 'completed')
    
    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    
    // Load images for all completed creatives with valid UUIDs with a slight delay for better UX
    completedCreatives.forEach((creative, index) => {
      // Only attempt to load images for creatives with valid UUID IDs
      if (uuidRegex.test(creative.id) && !loadedImages[creative.id] && !loadingImages.has(creative.id)) {
        // Stagger the loading to prevent overwhelming the server
        setTimeout(() => {
          loadCreativeImages(creative.id)
        }, index * 200) // 200ms delay between each image load
      }
    })
  }, [generatedCreatives])

  // Simplified loading logic
  React.useEffect(() => {
    // Initial page load
    const initialTimer = setTimeout(() => {
      setIsLoadingPage(false)
    }, 1500) // Reduced from 2 seconds to 1.5 seconds
    
    return () => clearTimeout(initialTimer)
  }, [])

  // Handle brand selection loading with better transition
  React.useEffect(() => {
    if (selectedBrandId && !isLoadingPage) {
      setIsLoadingAfterBrandSelection(true)
      const timer = setTimeout(() => {
        setIsLoadingAfterBrandSelection(false)
      }, 800) // Reduced from 1 second to 800ms
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
    // console.log(`🔄 Updating creative ${id} status to ${status}`, { generatedImageUrl: generatedImageUrl ? 'provided' : 'none' })
    setGeneratedCreatives(prev => {
      const updated = prev.map(creative => 
        creative.id === id 
          ? { ...creative, status, ...(generatedImageUrl && { generated_image_url: generatedImageUrl }) }
          : creative
      )
      // console.log(`✅ Creative status updated. Found creative: ${updated.some(c => c.id === id)}`)
      return updated
    })
  }

  const deleteCreative = async (id: string) => {
    if (!user?.id) {
      toast.error('You must be logged in to delete creatives')
      return
    }

    try {

      
      const response = await fetch(`/api/creative-generations?id=${id}&userId=${user.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Delete API error:', errorData)
        throw new Error(`Failed to delete creative: ${errorData.error || 'Unknown error'}`)
      }

      // Clear all related state for this creative
      setGeneratedCreatives(prev => prev.filter(creative => creative.id !== id))
      setLoadedImages(prev => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
      setLoadingImages(prev => {
        const updated = new Set(prev)
        updated.delete(id)
        return updated
      })
      
      // Clear any original image URLs cache
      setOriginalImageUrls(prev => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
      
      // Clear clean image URLs cache
      setCleanImageUrls(prev => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
      

      toast.success('Creative deleted successfully!')
    } catch (error) {
      console.error('❌ Error deleting creative:', error)
      toast.error('Failed to delete creative')
    }
  }

  // Collage generation function
  // New multi-product generation function
  const generateMultiProductCreative = async (images: File[], style: StyleOption, customText: any, finalName: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {


        // Convert all images to base64
        const imagePromises = images.map(file => new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        }))

        const base64Images = await Promise.all(imagePromises)


        // Create enhanced prompt for multi-product extraction
        const multiProductPrompt = `GENERATE AN IMAGE: Create a stunning fashion display featuring ${images.length} different clothing items extracted from the provided ${images.length} separate product images.

TASK: Extract each clothing item from the separate images I'm providing and arrange them together in one beautiful composition on a ${style.id === 'concrete-floor' ? 'concrete background' : style.id === 'white-background' ? 'clean white background' : style.id === 'marble-surface' ? 'luxurious marble surface' : 'premium background'}.

CRITICAL REQUIREMENTS:
- EXTRACT each clothing item from its respective image (I'm providing ${images.length} separate images)
- ARRANGE all ${images.length} items together in one elegant, professional layout
- Use ${style.id === 'concrete-floor' ? 'urban street style' : style.id === 'white-background' ? 'minimalist clean aesthetic' : style.id === 'marble-surface' ? 'luxury boutique style' : 'premium product photography'} aesthetic
- Ensure each item is clearly visible and professionally presented
- Maintain consistent lighting and shadows across all items
- Create a cohesive, high-end fashion display in 1024x1536 portrait format

DO NOT ask for more images - I am providing all ${images.length} images now. Generate the combined fashion display image immediately.`

        // Create FormData for the API call
        const formData = new FormData()

        // Add the first image as the base (API expects one primary image)
        const base64Data = base64Images[0].split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const imageBlob = new Blob([byteArray], { type: images[0].type || 'image/jpeg' })
        const imageFile = new File([imageBlob], images[0].name || 'multi-product.jpg', { type: images[0].type || 'image/jpeg' })

        formData.append('image', imageFile)
        formData.append('prompt', multiProductPrompt)
        formData.append('styleId', style.id)
        formData.append('aspectRatio', 'portrait')
        formData.append('quality', 'hd')
        formData.append('textOverlays', JSON.stringify(customText))

        // Add additional context about multiple products
        formData.append('multiProductCount', images.length.toString())
        formData.append('additionalImages', JSON.stringify(base64Images.slice(1)))

        // Map background type
        const backgroundTypeMapping: { [key: string]: string } = {
          'concrete-floor': 'concrete',
          'marble-surface': 'marble',
          'wooden-tabletop': 'wood',
          'white-background': 'minimalist',
          'cotton-sheet': 'fabric',
          'black-background': 'minimalist',
          'gradient-surface': 'gradient',
          'metallic-surface': 'metallic'
        }

        formData.append('backgroundType', backgroundTypeMapping[style.id] || 'minimalist')



        const response = await fetch('/api/ai/generate-creative', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ Multi-product generation failed:', errorData)
          reject(new Error(errorData.error || 'Failed to generate multi-product creative'))
          return
        }

        const data = await response.json()
        
        resolve(data.imageUrl)

      } catch (error) {
        console.error('❌ Error in multi-product generation:', error)
        reject(error)
      }
    })
  }

  const generateCollage = async (images: File[], layout: 'grid-2x2' | 'hero-plus-3' | 'row-5' | 'triangle' = 'grid-2x2'): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      // Set canvas size based on layout
      const canvasSize = 800
      canvas.width = canvasSize
      canvas.height = canvasSize
      
      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvasSize, canvasSize)
      
      let loadedCount = 0
      const imageElements: HTMLImageElement[] = []
      
      // Load all images
      images.forEach((file, index) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          imageElements[index] = img
          loadedCount++
          
          if (loadedCount === images.length) {
            // Draw images based on layout
            switch (layout) {
              case 'grid-2x2':
                drawGrid2x2(ctx, imageElements, canvasSize)
                break
              case 'hero-plus-3':
                drawHeroPlus3(ctx, imageElements, canvasSize)
                break
              case 'row-5':
                drawRow5(ctx, imageElements, canvasSize)
                break
              case 'triangle':
                drawTriangle(ctx, imageElements, canvasSize)
                break
            }
            
            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
            resolve(dataUrl)
            
            // Cleanup
            images.forEach((_, i) => URL.revokeObjectURL(URL.createObjectURL(images[i])))
          }
        }
        img.src = url
      })
    })
  }

  // Layout functions
  const drawGrid2x2 = (ctx: CanvasRenderingContext2D, images: HTMLImageElement[], size: number) => {
    const halfSize = size / 2
    const padding = 10
    
    for (let i = 0; i < Math.min(4, images.length); i++) {
      const x = (i % 2) * halfSize + (i % 2 === 1 ? padding/2 : 0)
      const y = Math.floor(i / 2) * halfSize + (Math.floor(i / 2) === 1 ? padding/2 : 0)
      const w = halfSize - (i % 2 === 1 ? padding/2 : padding/2)
      const h = halfSize - (Math.floor(i / 2) === 1 ? padding/2 : padding/2)
      
      drawImageFit(ctx, images[i], x, y, w, h)
    }
  }

  const drawHeroPlus3 = (ctx: CanvasRenderingContext2D, images: HTMLImageElement[], size: number) => {
    if (images.length === 0) return
    
    const padding = 10
    const heroSize = size * 0.6
    const smallSize = (size - heroSize - padding) / 3
    
    // Hero image (left side)
    drawImageFit(ctx, images[0], 0, (size - heroSize) / 2, heroSize, heroSize)
    
    // Small images (right side)
    for (let i = 1; i < Math.min(4, images.length); i++) {
      const y = (i - 1) * (smallSize + padding/3) + (size - (3 * smallSize + 2 * padding/3)) / 2
      drawImageFit(ctx, images[i], heroSize + padding, y, smallSize, smallSize)
    }
  }

  const drawRow5 = (ctx: CanvasRenderingContext2D, images: HTMLImageElement[], size: number) => {
    const imageWidth = size / Math.min(5, images.length)
    const imageHeight = size * 0.8
    const startY = (size - imageHeight) / 2
    
    for (let i = 0; i < Math.min(5, images.length); i++) {
      drawImageFit(ctx, images[i], i * imageWidth, startY, imageWidth, imageHeight)
    }
  }

  const drawTriangle = (ctx: CanvasRenderingContext2D, images: HTMLImageElement[], size: number) => {
    if (images.length === 0) return
    
    const imageSize = size * 0.25
    const centerX = size / 2
    const centerY = size / 2
    
    // Top image
    drawImageFit(ctx, images[0], centerX - imageSize/2, centerY - imageSize, imageSize, imageSize)
    
    // Bottom left
    if (images.length > 1) {
      drawImageFit(ctx, images[1], centerX - imageSize*1.2, centerY + imageSize*0.2, imageSize, imageSize)
    }
    
    // Bottom right  
    if (images.length > 2) {
      drawImageFit(ctx, images[2], centerX + imageSize*0.2, centerY + imageSize*0.2, imageSize, imageSize)
    }
  }

  const drawImageFit = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
    const scale = Math.max(w / img.width, h / img.height)
    const scaledW = img.width * scale
    const scaledH = img.height * scale
    const offsetX = (w - scaledW) / 2
    const offsetY = (h - scaledH) / 2
    
    ctx.drawImage(img, x + offsetX, y + offsetY, scaledW, scaledH)
  }

  const openStyleModal = (style: StyleOption) => {
    if (!uploadedImage && !isMultiMode) {
      toast.error('Please upload a product image first!')
      return
    }
    setModalStyle(style)
    setCreativeName('')
    setSelectedGender('any')
    setCustomInstructions('')
    setCustomTemplatePrompt('')
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

        // Use the stored image bounds from calculateImageCropArea
        const imageBounds = (window as any).imageBounds
        if (!imageBounds) {
          reject(new Error('Image bounds not calculated'))
          return
        }

        // Convert crop area percentages to image-relative coordinates
        // Subtract the image offset and scale by image dimensions
        const relativeX = Math.max(0, (cropArea.x - imageBounds.x) / imageBounds.width)
        const relativeY = Math.max(0, (cropArea.y - imageBounds.y) / imageBounds.height)
        const relativeWidth = Math.min(1 - relativeX, cropArea.width / imageBounds.width)
        const relativeHeight = Math.min(1 - relativeY, cropArea.height / imageBounds.height)

        // Calculate source coordinates in original image pixels
        const sourceX = Math.floor(relativeX * img.naturalWidth)
        const sourceY = Math.floor(relativeY * img.naturalHeight)
        const sourceWidth = Math.floor(relativeWidth * img.naturalWidth)
        const sourceHeight = Math.floor(relativeHeight * img.naturalHeight)

        // Ensure we have valid dimensions
        if (sourceWidth <= 0 || sourceHeight <= 0) {
          reject(new Error('Invalid crop dimensions'))
          return
        }

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
    console.log('✂️ Apply crop called for creative:', cropCreativeId)
    try {
      const croppedImageUrl = await applyCrop(cropImageUrl, cropArea)
      
      // Update the creative with the cropped image
      setGeneratedCreatives(prev => prev.map(creative => 
        creative.id === cropCreativeId 
          ? { ...creative, generated_image_url: croppedImageUrl }
          : creative
      ))

      // Also update loadedImages to ensure the cropped image displays immediately
      setLoadedImages(prev => ({
        ...prev,
        [cropCreativeId]: {
          ...prev[cropCreativeId],
          generated: croppedImageUrl
        }
      }))

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
      
      // Update the crop modal to show the original image
      setCropImageUrl(originalUrl)
      
      // Reset crop area to full image
      setCropArea({ x: 0, y: 0, width: 100, height: 100 })
      
      // Remove from original URLs since we're back to original
      setOriginalImageUrls(prev => {
        const newUrls = { ...prev }
        delete newUrls[cropCreativeId]
        return newUrls
      })
      
      toast.success('Restored to original image!')
    }
  }

  // Reset all form data when starting over
  const resetAllData = () => {
    setGeneratedImage('')
    setCurrentStep('upload')
    setSelectedCreativeType('')
    setSelectedTemplate(null)
    setCustomText({ top: '', bottom: '' })
    setCustomInstructions('')
    setSelectedTopPreset('')
    setSelectedBottomPreset('')
    setCustomValues({ topValue: '', bottomValue: '' })
    setUploadedImage(null)
    setUploadedImageUrl('')
    setUploadedImages([])
    setUploadedImageUrls([])
    setIsMultiMode(false)
    setCollageUrl('')
  }

  // Delete creative function - handles creative deletion
  const handleDeleteCreative = async (creativeId: string) => {
    try {
      const response = await fetch(`/api/creative-generations?id=${creativeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete creative')
      }

      // Remove from local state
      setGeneratedCreatives(prev => prev.filter(creative => creative.id !== creativeId))
      
      // Clean up related state
      setLoadedImages(prev => {
        const updated = { ...prev }
        delete updated[creativeId]
        return updated
      })
      
      setLoadingImages(prev => {
        const updated = new Set(prev)
        updated.delete(creativeId)
        return updated
      })

      toast.success('Creative deleted successfully!')
    } catch (error) {
      console.error('Error deleting creative:', error)
      toast.error('Failed to delete creative')
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
    
    // Convert to percentages relative to container - this defines the image bounds
    const x = (imageOffsetX / containerRect.width) * 100
    const y = (imageOffsetY / containerRect.height) * 100
    const width = (imageDisplayWidth / containerRect.width) * 100
    const height = (imageDisplayHeight / containerRect.height) * 100
    
    // Store image bounds for constraint checking
    ;(window as any).imageBounds = { x, y, width, height }
    
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
        
        // Get image bounds to constrain crop area
        const bounds = (window as any).imageBounds || { x: 0, y: 0, width: 100, height: 100 }

        switch (handle) {
          case 'top': // Top edge - shrink from top
            const newTopY = Math.max(bounds.y, Math.min(startCropArea.y + startCropArea.height - 5, startCropArea.y + deltaY))
            newArea.y = newTopY
            newArea.height = startCropArea.y + startCropArea.height - newTopY
            break
          case 'bottom': // Bottom edge - expand/shrink from bottom
            const maxBottomHeight = bounds.y + bounds.height - startCropArea.y
            newArea.height = Math.max(5, Math.min(maxBottomHeight, startCropArea.height + deltaY))
            break
          case 'left': // Left edge - shrink from left
            const newLeftX = Math.max(bounds.x, Math.min(startCropArea.x + startCropArea.width - 5, startCropArea.x + deltaX))
            newArea.x = newLeftX
            newArea.width = startCropArea.x + startCropArea.width - newLeftX
            break
          case 'right': // Right edge - expand/shrink from right
            const maxRightWidth = bounds.x + bounds.width - startCropArea.x
            newArea.width = Math.max(5, Math.min(maxRightWidth, startCropArea.width + deltaX))
            break
          case 'top-left': // Top-left corner
            const newTLY = Math.max(bounds.y, Math.min(startCropArea.y + startCropArea.height - 5, startCropArea.y + deltaY))
            const newTLX = Math.max(bounds.x, Math.min(startCropArea.x + startCropArea.width - 5, startCropArea.x + deltaX))
            newArea.y = newTLY
            newArea.x = newTLX
            newArea.height = startCropArea.y + startCropArea.height - newTLY
            newArea.width = startCropArea.x + startCropArea.width - newTLX
            break
          case 'top-right': // Top-right corner
            const newTRY = Math.max(bounds.y, Math.min(startCropArea.y + startCropArea.height - 5, startCropArea.y + deltaY))
            const maxTRWidth = bounds.x + bounds.width - startCropArea.x
            newArea.y = newTRY
            newArea.height = startCropArea.y + startCropArea.height - newTRY
            newArea.width = Math.max(5, Math.min(maxTRWidth, startCropArea.width + deltaX))
            break
          case 'bottom-left': // Bottom-left corner
            const newBLX = Math.max(bounds.x, Math.min(startCropArea.x + startCropArea.width - 5, startCropArea.x + deltaX))
            const maxBLHeight = bounds.y + bounds.height - startCropArea.y
            newArea.x = newBLX
            newArea.width = startCropArea.x + startCropArea.width - newBLX
            newArea.height = Math.max(5, Math.min(maxBLHeight, startCropArea.height + deltaY))
            break
          case 'bottom-right': // Bottom-right corner
            const maxBRWidth = bounds.x + bounds.width - startCropArea.x
            const maxBRHeight = bounds.y + bounds.height - startCropArea.y
            newArea.width = Math.max(5, Math.min(maxBRWidth, startCropArea.width + deltaX))
            newArea.height = Math.max(5, Math.min(maxBRHeight, startCropArea.height + deltaY))
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

  const retryCreativeWithCustomIssue = async (customIssue: string) => {
    const creative = generatedCreatives.find(c => c.id === retryCreativeId)
    if (!creative || !retryImage) return

    // Find the original style
    const style = STYLE_OPTIONS.find(s => s.id === creative.style_id)
    if (!style) return

    // Create a new creative with custom issue and capture the actual ID
    const actualRetryId = addCreative({
      brand_id: creative.brand_id,
      user_id: creative.user_id,
      style_id: creative.style_id,
      style_name: creative.style_name,
      original_image_url: creative.original_image_url,
      generated_image_url: '', // Will be set after generation
      prompt_used: `${style.prompt} CRITICAL CUSTOM FIX: ${customIssue}`,
      text_overlays: creative.text_overlays,
      metadata: { retryOf: creative.id, customIssue: customIssue },
      updated_at: new Date().toISOString(),
      custom_name: creative.custom_name,
      status: 'generating' // Set initial status to generating
    })

    setShowRetryModal(false)
    setActiveTab('generated')
    setCustomIssueText('') // Clear the custom issue text
    toast.info(`Retrying generation with custom issue: ${customIssue.slice(0, 50)}...`)

    try {
      // Convert retry image to base64 if provided, otherwise use original
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.readAsDataURL(retryImage!)
      })

      // Generate the enhanced prompt with custom issue fix (no custom instructions for quick retries)
      const enhancedPrompt = `${style.prompt} CRITICAL CUSTOM FIX: ${customIssue}`

      // console.log('🔄 RETRY GENERATION:')
      // console.log('📝 Enhanced Prompt:', enhancedPrompt)
      // console.log('🎨 Style ID:', style.id)
      // console.log('📷 Image size:', base64Image.length, 'characters')
      // console.log('🔧 Custom Issue:', customIssue)
      // console.log('🏷️ Brand ID:', selectedBrandId)
      // console.log('🆔 Creative ID:', actualRetryId)

      // Validation
      if (!selectedBrandId) {
        throw new Error('No brand selected')
      }
      if (!base64Image) {
        throw new Error('No image provided')
      }
      if (!enhancedPrompt) {
        throw new Error('No prompt generated')
      }

      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

      // console.log('🚀 Sending API request...')
      
      const response = await fetch('/api/generate-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: enhancedPrompt,
          image: base64Image,
          styleId: style.id,
          textOverlay: { top: '', bottom: '' }, // No text overlay for retry
          brandId: selectedBrandId,
          creativeId: actualRetryId,
          aspectRatio: 'portrait' // Use portrait aspect ratio for mobile devices (1024x1536)
        }),
      })

      clearTimeout(timeoutId) // Clear timeout if request succeeds
      // console.log('✅ API request completed')

      // console.log('📡 API Response Status:', response.status)
      // console.log('📡 API Response OK:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error Response:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      const data = await response.json()
      // console.log('📦 API Response Data:', data)
      
      // Check if we have an imageUrl (API doesn't always include 'success' field)
      if (data.imageUrl) {
        // console.log('✅ Generation successful, updating status to completed')
        updateCreativeStatus(actualRetryId, 'completed', data.imageUrl)
        toast.success('Retry generation completed!')
        
        // Check for quality warnings
        if (data.warning && data.warning.type === 'quality_loss') {
          toast.warning('⚠️ Quality Warning', {
            description: data.warning.message,
            duration: 8000
          })
        }
      } else {
        // console.log('❌ Generation failed, data:', data)
        updateCreativeStatus(actualRetryId, 'failed')
        toast.error(data.error || 'Generation failed - no image URL returned')
      }
    } catch (error) {
      console.error('❌ Error during retry generation:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorName = error instanceof Error ? error.name : ''
      
      if (errorName === 'AbortError') {
        console.error('🕒 Request timed out after 2 minutes')
        updateCreativeStatus(actualRetryId, 'failed')
        toast.error('Generation timed out - please try again')
      } else if (errorMessage.includes('Failed to fetch')) {
        console.error('🌐 Network error - API might be down')
        updateCreativeStatus(actualRetryId, 'failed')
        toast.error('Network error - please check your connection')
      } else {
        updateCreativeStatus(actualRetryId, 'failed')
        toast.error(`Generation failed: ${errorMessage}`)
      }
    }
  }

  const retryCreativeWithIssue = async (issueId: string) => {
    const creative = generatedCreatives.find(c => c.id === retryCreativeId)
    if (!creative || !retryImage) return

    const issue = RETRY_ISSUES.find(i => i.id === issueId)
    if (!issue) return

    // Find the original style
    const style = STYLE_OPTIONS.find(s => s.id === creative.style_id)
    if (!style) return

    // Create enhanced prompt with retry fix (no custom instructions for retries - using original settings)
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
          styleId: style.id,
          brandId: selectedBrandId,
          userId: user?.id,
          styleName: style.name,
          textOverlays: creative.text_overlays,
          saveToDatabase: true,
          customName: creative.custom_name,
          aspectRatio: 'portrait' // Use portrait aspect ratio for mobile devices (1024x1536)
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

  // When multiple images are uploaded, only show multi-product compatible templates
  const finalFilteredStyleOptions = isMultiMode && uploadedImages.length > 1
    ? filteredStyleOptions.filter(style =>
        style.id === 'multi-product-showcase' ||
        style.id === 'custom-template' ||
        style.category === 'all'
      )
    : filteredStyleOptions

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

  // Handle overlay modal custom value changes
  const handleOverlayCustomValueChange = (position: 'top' | 'bottom', value: string) => {
    if (position === 'top') {
      setOverlayCustomValues(prev => ({ ...prev, topValue: value }))
      if (overlaySelectedTopPreset === 'percentage') {
        setOverlayCustomText(prev => ({ ...prev, top: `${value}% OFF` }))
      } else if (overlaySelectedTopPreset === 'money') {
        setOverlayCustomText(prev => ({ ...prev, top: `$${value} OFF` }))
      } else if (overlaySelectedTopPreset === 'custom') {
        setOverlayCustomText(prev => ({ ...prev, top: value }))
      }
    } else {
      setOverlayCustomValues(prev => ({ ...prev, bottomValue: value }))
      if (overlaySelectedBottomPreset === 'percentage') {
        setOverlayCustomText(prev => ({ ...prev, bottom: `${value}% OFF` }))
      } else if (overlaySelectedBottomPreset === 'money') {
        setOverlayCustomText(prev => ({ ...prev, bottom: `$${value} OFF` }))
      } else if (overlaySelectedBottomPreset === 'custom') {
        setOverlayCustomText(prev => ({ ...prev, bottom: value }))
      }
    }
  }

  // Generate text overlay prompt addition for overlay modal
  const generateOverlayTextPromptAddition = () => {
    let textAddition = ''
    if (overlayCustomText.top || overlayCustomText.bottom) {
      textAddition += ' CRITICAL REQUIREMENT - MUST ADD TEXT OVERLAYS: '
      if (overlayCustomText.top) {
        const topColorName = colorOptions.find(c => c.value === overlayTextColors.top)?.name || 'white'
        textAddition += `MANDATORY: Place "${overlayCustomText.top}" text at the TOP of the image. PERFECTLY CENTERED horizontally with equal spacing from left and right edges. The text must be PERFECTLY STRAIGHT and LEVEL (not tilted or wonky). Use large, bold, readable font that is EVENLY SPACED and SYMMETRICALLY POSITIONED. Make the text color ${topColorName.toLowerCase()} (${overlayTextColors.top}). Ensure text is PRECISELY ALIGNED and appears professional. CRITICAL: DO NOT add any black bars, borders, banners, or background rectangles behind the text - the text should be placed directly on the existing image without any additional backgrounds or bars. `
      }
      if (overlayCustomText.bottom) {
        const bottomColorName = colorOptions.find(c => c.value === overlayTextColors.bottom)?.name || 'white'
        textAddition += `MANDATORY: Place "${overlayCustomText.bottom}" text at the BOTTOM of the image. PERFECTLY CENTERED horizontally with equal spacing from left and right edges. The text must be PERFECTLY STRAIGHT and LEVEL (not tilted or wonky). Use large, bold, readable font that is EVENLY SPACED and SYMMETRICALLY POSITIONED. Make the text color ${bottomColorName.toLowerCase()} (${overlayTextColors.bottom}). Ensure text is PRECISELY ALIGNED and appears professional. CRITICAL: DO NOT add any black bars, borders, banners, or background rectangles behind the text - the text should be placed directly on the existing image without any additional backgrounds or bars. `
      }
      textAddition += 'CRITICAL TEXT ALIGNMENT: ALL TEXT must be PERFECTLY CENTERED both horizontally and vertically within their designated areas. Text must be STRAIGHT, LEVEL, and EVENLY POSITIONED - NO tilting, skewing, or wonky alignment. Use professional typography spacing with proper contrast and readability. NEVER cut off any letters. ULTRA-CRITICAL BLACK BAR PROHIBITION: ABSOLUTELY NO BLACK BARS, BANNERS, BOXES, RECTANGLES, STRIPS, OR ANY SOLID BACKGROUND SHAPES behind text. BANNED ELEMENTS: No black banners across the image, no dark strips, no rectangular text backgrounds, no frame overlays, no black boxing around text areas. Text should float directly on the image with TRANSPARENT BACKGROUND only. For readability, use subtle drop shadows, light outlines, or gentle glow effects, but NEVER any solid backgrounds, bars, or geometric shapes behind text. The image must remain clean and unobstructed by any overlay elements.'
    }
    return textAddition
  }

  // Generate text editing prompt for AI
  const generateTextEditingPrompt = () => {
    let prompt = 'Please edit this image to modify only the text overlays while preserving all other aspects exactly as they are. Keep the same dimensions, aspect ratio, product, background, lighting, and colors.'
    
    if (overlayCustomText.top || overlayCustomText.bottom) {
      prompt += ' Text modifications needed: '
      
      if (overlayCustomText.top) {
        const topColorName = colorOptions.find(c => c.value === overlayTextColors.top)?.name || 'white'
        prompt += `Add "${overlayCustomText.top}" text at the top of the image, centered horizontally with a small margin from the top edge. Use large, bold, readable font in ${topColorName.toLowerCase()} color (${overlayTextColors.top}). `
      }
      
      if (overlayCustomText.bottom) {
        const bottomColorName = colorOptions.find(c => c.value === overlayTextColors.bottom)?.name || 'white'
        prompt += `Add "${overlayCustomText.bottom}" text at the bottom of the image, centered horizontally with a small margin from the bottom edge. Use large, bold, readable font in ${bottomColorName.toLowerCase()} color (${overlayTextColors.bottom}). `
      }
      
      prompt += 'Remove any existing text overlays and replace with the specified new text only. '
    } else {
      prompt += ' Please remove all text overlays from the image while keeping everything else exactly the same. '
    }
    
    prompt += 'Important: Maintain the exact same image size, dimensions, and all visual elements. Only the text should change.'
    
    return prompt
  }

  // Handle text overlay generation for existing creative
  const handleTextOverlayGeneration = async () => {
    if (!editingCreative) {
      toast.error('No creative selected')
      return
    }

    try {
      // Get the clean image to use as base (stored clean version or current image)
      let baseImageUrl = cleanImageUrls[editingCreative.id] ||
                        loadedImages[editingCreative.id]?.generated || 
                        editingCreative.generated_image_url || 
                        editingCreative.original_image_url
      
      if (!baseImageUrl) {
        toast.error('No image found for this creative')
        return
      }

      // Store the clean image if we haven't already (before first text overlay)
      if (!cleanImageUrls[editingCreative.id]) {
        setCleanImageUrls(prev => ({
          ...prev,
          [editingCreative.id]: baseImageUrl
        }))
      }

      // Create a new creative for the text-edited version
      const textEditId = addCreative({
        brand_id: editingCreative.brand_id,
        user_id: editingCreative.user_id,
        style_id: editingCreative.style_id,
        style_name: editingCreative.style_name,
        original_image_url: editingCreative.original_image_url || baseImageUrl,
        generated_image_url: '', // Will be set after generation
        prompt_used: generateTextEditingPrompt(),
        text_overlays: { top: overlayCustomText.top, bottom: overlayCustomText.bottom },
        metadata: { textEditOf: editingCreative.id },
        updated_at: new Date().toISOString(),
        custom_name: editingCreative.custom_name ? `${editingCreative.custom_name} (text edited)` : undefined,
        status: 'generating'
      })

      // Close modal first
      setShowTextOverlayModal(false)
      setEditingCreative(null)
      setActiveTab('generated')
      
      // Reset overlay state
      setOverlaySelectedTopPreset('')
      setOverlaySelectedBottomPreset('')
      setOverlayCustomValues({ topValue: '', bottomValue: '' })
      setOverlayTextColors({ top: '#FFFFFF', bottom: '#FFFFFF' })
      setOverlayCustomText({ top: '', bottom: '' })

      toast.info('AI is editing text on your creative...')

      // Convert image to base64
      let base64Image = ''
      
      if (baseImageUrl.startsWith('data:')) {
        base64Image = baseImageUrl
      } else {
        try {
          const response = await fetch(baseImageUrl)
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`)
          }
          const blob = await response.blob()
          base64Image = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error('Failed to read image'))
            reader.readAsDataURL(blob)
          })
        } catch (error) {
          console.error('Failed to fetch image:', error)
          toast.error('Failed to load image')
          return
        }
      }

      // Call the API with text editing prompt
      const apiResponse = await fetch('/api/generate-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          prompt: generateTextEditingPrompt(),
          styleId: editingCreative.style_id,
          brandId: selectedBrandId,
          userId: user?.id,
          styleName: editingCreative.style_name,
          textOverlays: { top: overlayCustomText.top, bottom: overlayCustomText.bottom },
          saveToDatabase: true,
          customName: editingCreative.custom_name ? `${editingCreative.custom_name} (text edited)` : undefined,
          aspectRatio: 'portrait' // Use portrait aspect ratio for mobile devices (1024x1536)
        }),
      })

      const data = await apiResponse.json()

      if (data.imageUrl) {
        // Update the creative with the generated image
        updateCreativeStatus(textEditId, 'completed', data.imageUrl)
        incrementUsage() // Increment usage count on successful text editing
        toast.success('Text edited successfully!')
      } else {
        updateCreativeStatus(textEditId, 'failed')
        
        // Handle specific error types
        if (data.error && data.error.includes('safety system')) {
          toast.error('Text editing request was blocked by safety filters. Try with different text or image.')
        } else if (data.error && data.error.includes('moderation')) {
          toast.error('Content moderation issue. Please try with different text content.')
        } else {
          toast.error(data.error || 'Failed to edit text')
        }
      }

    } catch (error) {
      console.error('Text editing error:', error)
      toast.error('Failed to edit text')
    }
  }

  const generateTextPromptAddition = () => {
    let textAddition = ''
    if (customText.top || customText.bottom) {
      textAddition += ' CRITICAL REQUIREMENT - MUST ADD TEXT OVERLAYS: '
      if (customText.top) {
        const topColorName = colorOptions.find(c => c.value === textColors.top)?.name || 'white'
        textAddition += `MANDATORY: Place "${customText.top}" text at the TOP of the image. PERFECTLY CENTERED horizontally with equal spacing from left and right edges. The text must be PERFECTLY STRAIGHT and LEVEL (not tilted or wonky). Use large, bold, readable font that is EVENLY SPACED and SYMMETRICALLY POSITIONED. Make the text color ${topColorName.toLowerCase()} (${textColors.top}). Ensure text is PRECISELY ALIGNED and appears professional. CRITICAL: DO NOT add any black bars, borders, banners, or background rectangles behind the text - the text should be placed directly on the existing image without any additional backgrounds or bars. `
      }
      if (customText.bottom) {
        const bottomColorName = colorOptions.find(c => c.value === textColors.bottom)?.name || 'white'
        textAddition += `MANDATORY: Place "${customText.bottom}" text at the BOTTOM of the image. PERFECTLY CENTERED horizontally with equal spacing from left and right edges. The text must be PERFECTLY STRAIGHT and LEVEL (not tilted or wonky). Use large, bold, readable font that is EVENLY SPACED and SYMMETRICALLY POSITIONED. Make the text color ${bottomColorName.toLowerCase()} (${textColors.bottom}). Ensure text is PRECISELY ALIGNED and appears professional. CRITICAL: DO NOT add any black bars, borders, banners, or background rectangles behind the text - the text should be placed directly on the existing image without any additional backgrounds or bars. `
      }
      textAddition += 'CRITICAL TEXT ALIGNMENT: ALL TEXT must be PERFECTLY CENTERED both horizontally and vertically within their designated areas. Text must be STRAIGHT, LEVEL, and EVENLY POSITIONED - NO tilting, skewing, or wonky alignment. Use professional typography spacing with proper contrast and readability. NEVER cut off any letters. ULTRA-CRITICAL BLACK BAR PROHIBITION: ABSOLUTELY NO BLACK BARS, BANNERS, BOXES, RECTANGLES, STRIPS, OR ANY SOLID BACKGROUND SHAPES behind text. BANNED ELEMENTS: No black banners across the image, no dark strips, no rectangular text backgrounds, no frame overlays, no black boxing around text areas. Text should float directly on the image with TRANSPARENT BACKGROUND only. For readability, use subtle drop shadows, light outlines, or gentle glow effects, but NEVER any solid backgrounds, bars, or geometric shapes behind text. The image must remain clean and unobstructed by any overlay elements.'
    }
    // Add ULTRA-CRITICAL preservation instruction at the end
    if (textAddition) {
      textAddition += ' '
    }
         textAddition += 'MANDATORY PERFECT CENTERING: The product must be PRECISELY CENTERED both horizontally and vertically in the composition. Ensure equal spacing from all edges and perfect symmetrical placement. For pedestal/platform shots, the product must sit EXACTLY in the center of the platform with no shifting or off-center positioning. ULTRA-CRITICAL DISTANCE-INDEPENDENT TEXT PRESERVATION: Whether the product appears large (close-up) or small (distant) in the final composition, ALL TEXT must be preserved with IDENTICAL crystal-clear quality. CRITICAL PRINCIPLE: The source image quality does NOT change based on composition distance - you are working from the same high-resolution close-up product photo regardless of how the product is positioned in the scene. DISTANCE COMPENSATION PROTOCOL: When placing the product in distant or smaller positions, apply SUPER-RESOLUTION TEXT TREATMENT - mentally zoom into the product area and preserve every character, logo, and text element at MAXIMUM fidelity as if it were a close-up shot. COMPOSITION SIZE INDEPENDENCE: Product distance from camera or size in frame does NOT determine text quality - a cologne bottle label must be equally sharp whether it fills the entire image or appears small on a distant shelf. ULTRA-CRITICAL FINAL INSTRUCTION: The original product must be preserved with 100% EXACT fidelity - every single character, logo, graphic, text, color, and detail must be IDENTICAL to the input image. Use the highest possible preservation quality equivalent to ChatGPT-level fidelity. DO NOT modify, stylize, or alter the product in ANY way. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. EXTREME COLOR PRESERVATION: Pay special attention to preserving EXACT color accuracy, especially blue tones, gradients, and color transitions - do not shift, desaturate, or distort any colors whatsoever. CRITICAL DISTORTION PREVENTION: Do not warp, stretch, compress, or distort any part of the clothing - maintain perfect proportions and shape integrity. ENHANCED TAG/LABEL PRESERVATION: If there are ANY visible tags, neck labels, brand names, logos, or text elements on the garment, they MUST be preserved with CRYSTAL-CLEAR accuracy - maintain exact fonts, letter spacing, clarity, and positioning. Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, and any microscopic text anywhere on the garment. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. Never allow neck tag text to become blurry, pixelated, or illegible. Do not blur, distort, or alter any existing text elements no matter how small. ABSOLUTE PROHIBITION: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE - this includes NO fake neck tags, NO fake brand names, NO fake labels, NO fake text of any kind. SPECIFICALLY BANNED: Never add "PROJECT CAPRI" or any other test brand names to clothing. If the original is plain with no tags or text, keep it completely plain. MAXIMUM FIDELITY MODE: Treat this as if you are making a museum-quality reproduction where every pixel matters. STRICT ANTI-HALLUCINATION PROTOCOL: Only reproduce clothing elements that ACTUALLY EXIST in the source image. PROHIBITED: Adding imaginary fabric textures, fake seams, invented stitching, fictional pockets, non-existent buttons, made-up zippers, fantasy patterns, or any design elements not visible in the original. Copy reality exactly with zero creative interpretation or fabricated details.'
    
    return textAddition
  }

  const generateRegenerationFeedbackPrompt = () => {
    if (regenerationFeedback.issues.length === 0 && !regenerationFeedback.details.trim()) {
      return ''
    }

    let feedbackPrompt = ' CRITICAL FIXES REQUIRED:'

    // Use the actual RETRY_ISSUES array to get the correct prompt additions
    regenerationFeedback.issues.forEach(issueId => {
      const issue = RETRY_ISSUES.find(issue => issue.id === issueId)
      if (issue) {
        feedbackPrompt += ` ${issue.promptAddition}`
      }
    })

    // Add specific user details
    if (regenerationFeedback.details.trim()) {
      feedbackPrompt += ` SPECIFIC USER FEEDBACK: ${regenerationFeedback.details.trim()}`
    }

    return feedbackPrompt
  }

  // Function to load images for a specific creative
  const loadCreativeImages = async (creativeId: string) => {
    // Don't load if already loading or loaded
    if (loadingImages.has(creativeId) || loadedImages[creativeId]) {
      return
    }

    // Check if the ID is a valid UUID format (not a timestamp)
    // UUIDs have the format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(creativeId)) {
      // console.log('🚫 Skipping image load for non-UUID creative ID:', creativeId)
      return
    }

    setLoadingImages(prev => new Set(prev).add(creativeId))

    try {
      // console.log('🖼️ Loading images for creative:', creativeId)
      const response = await fetch(`/api/creative-images?id=${creativeId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch creative images')
      }

      const data = await response.json()
      
      setLoadedImages(prev => ({
        ...prev,
        [creativeId]: {
          original: data.originalImageUrl,
          generated: data.generatedImageUrl
        }
      }))
      
      // console.log('✅ Images loaded for creative:', creativeId)
    } catch (error) {
      console.error('Error loading creative images:', error)
      toast.error('Failed to load creative images')
    } finally {
      setLoadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(creativeId)
        return newSet
      })
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement> | FileList) => {
    let files: FileList | null
    
    if ('target' in event) {
      files = event.target.files
    } else {
      files = event
    }
    
    if (!files || files.length === 0) return

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      toast.error('Please upload valid image files')
      return
    }

    // Check if we're adding to existing images or starting fresh
    const hasExistingImages = uploadedImages.length > 0 || uploadedImage !== null
    
    if (imageFiles.length === 1 && !hasExistingImages) {
      // First single image - single mode
      const file = imageFiles[0]
      setUploadedImage(file)
      const url = URL.createObjectURL(file)
      setUploadedImageUrl(url)
      setIsMultiMode(false)
      setUploadedImages([])
      setUploadedImageUrls([])
      setCollageUrl('')
      setGeneratedImage('')
      toast.success('Image uploaded successfully!')
    } else {
      // Multi-image mode (either multiple files selected OR adding to existing)
      let allImages: File[]
      let allUrls: string[]
      
      if (hasExistingImages) {
        // Adding to existing images
        if (uploadedImage) {
          // Convert single image to multi-image array
          allImages = [uploadedImage, ...imageFiles]
          allUrls = [uploadedImageUrl, ...imageFiles.map(file => URL.createObjectURL(file))]
        } else {
          // Add to existing multi-image array
          allImages = [...uploadedImages, ...imageFiles]
          allUrls = [...uploadedImageUrls, ...imageFiles.map(file => URL.createObjectURL(file))]
        }
      } else {
        // New multi-image upload
        allImages = imageFiles
        allUrls = imageFiles.map(file => URL.createObjectURL(file))
      }
      
      setUploadedImages(allImages)
      setUploadedImageUrls(allUrls)
      setIsMultiMode(true)
      setUploadedImage(null)
      setUploadedImageUrl('')
      setGeneratedImage('')
      
      // Generate collage
      try {
        const collage = await generateCollage(allImages, 'grid-2x2')
        setCollageUrl(collage)
        toast.success(`${allImages.length} images total! Collage updated.`)
      } catch (error) {
        console.error('Error generating collage:', error)
        toast.error('Failed to generate collage')
      }
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleImageUpload(files)
    }
  }

  const generateImageFromTemplate = async (templateStyle: StyleOption) => {
    if (!uploadedImage && !isMultiMode) {
      toast.error('Please upload an image first')
      return
    }

    // Check usage limits
    if (usageData.current >= WEEKLY_LIMIT) {
      toast.error(`You've reached your weekly limit of ${WEEKLY_LIMIT} generations. Resets in ${getDaysUntilReset()} days.`)
      return
    }

    // Check storage limits
    if (generatedCreatives.length >= STORAGE_LIMIT) {
      toast.error(`Storage Full! You've reached your limit of ${STORAGE_LIMIT} saved creatives. Please delete some stored creatives to generate new ones.`, {
        duration: 6000
      })
      return
    }

    // Generate enhanced prompt with custom instructions or custom template
    const textPromptAddition = generateTextPromptAddition()
    
    let enhancedPrompt: string
    if (templateStyle.id === 'custom-template') {
      // For custom templates, use the user's complete custom prompt
      enhancedPrompt = customTemplatePrompt.trim() + textPromptAddition
    } else {
      // For regular templates, use template prompt + custom instructions + regeneration feedback
      const customInstructionsAddition = customInstructions.trim() 
        ? ` CUSTOM INSTRUCTIONS: ${customInstructions.trim()}` 
        : ''
      
      // Add regeneration feedback for fixing specific issues
      const regenerationFeedbackAddition = generateRegenerationFeedbackPrompt()
      
      // Add gender preference for model-based templates
      const genderAddition = templateStyle.category === 'clothing' && templateStyle.id.startsWith('model_') && selectedGender !== 'any'
        ? ` GENDER PREFERENCE: Use a ${selectedGender} model for this template.`
        : ''
        
      enhancedPrompt = templateStyle.prompt + textPromptAddition + customInstructionsAddition + regenerationFeedbackAddition + genderAddition
    }

    // Create creative entry with custom name
    const finalName = creativeName.trim() || generateDefaultName()
    const creativeId = addCreative({
      brand_id: selectedBrandId!,
      user_id: user!.id,
      style_id: templateStyle.id,
      style_name: templateStyle.id === 'custom-template' ? 'Custom Template' : templateStyle.name,
      original_image_url: uploadedImageUrl,
      generated_image_url: '',
      prompt_used: enhancedPrompt,
      text_overlays: customText,
      status: 'generating',
      updated_at: new Date().toISOString(),
      custom_name: finalName,
      metadata: {}
    })

    setIsGenerating(true)
    setSelectedStyle(templateStyle)
    setShowStyleModal(false)
    setActiveTab('generated') // Switch to generated tab
    
    // Background type mapping to match API BACKGROUND_PRESETS
    const backgroundTypeMapping: {[key: string]: string} = {
      'concrete-floor': 'concrete',
      'concrete-floor-angled': 'concrete',
      'black-background': 'minimalist',
      'black-background-angled': 'minimalist',
      'white-background': 'minimalist',
      'white-background-angled': 'minimalist',
      'asphalt-surface': 'concrete',
      'asphalt-surface-angled': 'concrete',
      'sidewalk-pavement': 'concrete',
      'sidewalk-pavement-angled': 'concrete',
      'wooden-tabletop': 'wood',
      'cotton-sheet': 'fabric',
      'marble-surface': 'marble',
      // Default for all other templates
    };

    // Scroll to top of the page after switching tabs
    setTimeout(() => {
      const topElement = document.querySelector('.min-h-screen')
      topElement?.scrollIntoView({ behavior: 'smooth' })
    }, 100)

    try {
      // Multi-product mode handling
      if (isMultiMode && uploadedImages.length > 1) {


        try {
          // Generate the multi-product creative using our new function
          const generatedImageUrl = await generateMultiProductCreative(
            uploadedImages,
            templateStyle,
            customText,
            finalName
          )

          
          updateCreativeStatus(creativeId, 'completed', generatedImageUrl)
          setGeneratedImage(generatedImageUrl)

          // Save to database
          const saveResponse = await fetch('/api/creative-generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              brandId: selectedBrandId,
              userId: user?.id,
              styleId: templateStyle.id,
              styleName: templateStyle.id === 'custom-template' ? 'Custom Multi-Product Template' : `${templateStyle.name} Multi-Product`,
              originalImageUrl: uploadedImageUrls[0],
              generatedImageUrl: generatedImageUrl,
              promptUsed: enhancedPrompt,
              textOverlays: customText,
              metadata: {
                backgroundType: backgroundTypeMapping[templateStyle.id] || 'minimalist',
                aspectRatio: 'portrait',
                quality: 'hd',
                lighting: 'soft',
                customModifiers: !!customInstructions,
                model: 'gemini-2.5-flash-image-preview',
                isMultiProduct: true,
                productCount: uploadedImages.length
              },
              customName: finalName
            })
          })

          if (saveResponse.ok) {
  
          } else {
            console.error('❌ Failed to save multi-product creative to database')
          }

          // Update usage
          const newUsage = usageData.current + 1
          setUsageData(prev => ({ ...prev, current: newUsage }))
          localStorage.setItem('ad-creative-usage', JSON.stringify({
            current: newUsage,
            weekStartDate: usageData.weekStartDate
          }))

          // Clear the uploaded images after successful generation
          setUploadedImages([])
          setUploadedImageUrls([])

          // Switch to generated tab
          setActiveTab('generated')

        } catch (generationError) {
          console.error('❌ Error generating multi-product creative:', generationError)
          updateCreativeStatus(creativeId, 'failed')
          toast.error('Failed to generate multi-product creative')
        }

        return // Exit early to prevent fallthrough to single-product logic
      }

      // Single product mode (existing logic continues below)
      if (!uploadedImage) {
        toast.error('Please upload an image first');
        updateCreativeStatus(creativeId, 'failed');
        return;
      }

      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(uploadedImage)
      });



      // Create FormData for the new Gemini API
      const formData = new FormData();
      formData.append('image', uploadedImage);


      
      const backgroundType = backgroundTypeMapping[templateStyle.id] || 'minimalist'; // Default to minimalist
      formData.append('backgroundType', backgroundType);
      formData.append('aspectRatio', 'portrait'); // Use portrait aspect ratio for mobile devices (1024x1536)
      formData.append('quality', 'hd'); // Use high quality
      formData.append('lighting', 'soft');
      formData.append('customPromptModifiers', enhancedPrompt);

      const response = await fetch('/api/ai/generate-creative', {
        method: 'POST',
        body: formData, // Use FormData instead of JSON
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
      // console.log('✅ API Success Response:', data)
      // console.log('🖼️ Generated image URL length:', data.imageUrl?.length || 'no imageUrl')
      updateCreativeStatus(creativeId, 'completed', data.imageUrl)
      setGeneratedImage(data.imageUrl)

      // Save to database
      const saveResponse = await fetch('/api/creative-generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrandId,
          userId: user?.id,
          styleId: templateStyle.id,
          styleName: templateStyle.id === 'custom-template' ? 'Custom Template' : templateStyle.name,
          originalImageUrl: uploadedImageUrl,
          generatedImageUrl: data.imageUrl,
          promptUsed: enhancedPrompt,
          textOverlays: customText,
          metadata: {
            backgroundType: backgroundTypeMapping[templateStyle.id] || 'minimalist',
            aspectRatio: 'portrait',
            quality: 'hd',
            lighting: 'soft',
            customModifiers: !!customInstructions,
            model: data.model || 'gemini-2.5-flash-image-preview'
          },
          customName: finalName
        })
      })

      if (saveResponse.ok) {
        
      } else {
        console.error('❌ Failed to save creative to database')
      }

      // Update usage
      const newUsage = usageData.current + 1
      setUsageData(prev => ({ ...prev, current: newUsage }))
      localStorage.setItem('ad-creative-usage', JSON.stringify({
        current: newUsage,
        weekStartDate: usageData.weekStartDate
      }))

      toast.success('Creative generated successfully!')

    } catch (error) {
      console.error('❌ Error generating creative:', error)
      updateCreativeStatus(creativeId, 'failed')
      toast.error('Failed to generate creative. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateImageFromModal = async () => {
    if (!uploadedImage && !isMultiMode) {
      toast.error('Please upload an image first')
      return
    }

    // Check usage limits
    if (usageData.current >= WEEKLY_LIMIT) {
      toast.error(`You've reached your weekly limit of ${WEEKLY_LIMIT} generations. Resets in ${getDaysUntilReset()} days.`)
      return
    }

    // Check storage limits
    if (generatedCreatives.length >= STORAGE_LIMIT) {
      toast.error(`You've reached your storage limit of ${STORAGE_LIMIT} saved creatives. Please delete some before creating new ones.`)
      return
    }

    // Generate enhanced prompt with custom instructions or custom template
    const textPromptAddition = generateTextPromptAddition()
    
    let enhancedPrompt: string
    if (modalStyle.id === 'custom-template') {
      // For custom templates, use the user's complete custom prompt
      enhancedPrompt = customTemplatePrompt.trim() + textPromptAddition
    } else {
      // For regular templates, use template prompt + custom instructions + regeneration feedback
      const customInstructionsAddition = customInstructions.trim() 
        ? ` CUSTOM INSTRUCTIONS: ${customInstructions.trim()}` 
        : ''
      
      // Add regeneration feedback for fixing specific issues
      const regenerationFeedbackAddition = generateRegenerationFeedbackPrompt()
      
      // Add gender preference for model-based templates
      const genderAddition = modalStyle.category === 'clothing' && modalStyle.id.startsWith('model_') && selectedGender !== 'any'
        ? ` GENDER PREFERENCE: Use a ${selectedGender} model for this template.`
        : ''
        
      enhancedPrompt = modalStyle.prompt + textPromptAddition + customInstructionsAddition + regenerationFeedbackAddition + genderAddition
    }

    // Create creative entry with custom name
    const finalName = creativeName.trim() || generateDefaultName()
    const creativeId = addCreative({
      brand_id: selectedBrandId!,
      user_id: user!.id,
      style_id: modalStyle.id,
      style_name: modalStyle.id === 'custom-template' ? 'Custom Template' : modalStyle.name,
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
    
    // Scroll to top of the page after switching tabs
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
    
    toast.info(isMultiMode && uploadedImages.length > 1
      ? `Starting multi-product creative generation... This may take 60-90 seconds.`
      : 'Starting image generation... This may take 30-60 seconds.'
    );

    try {
      if (isMultiMode && uploadedImages.length > 1) {
        // NEW: Multi-product mode: Generate ONE creative with all products extracted and arranged
        

        try {
          // Generate the multi-product creative using our new function
          const generatedImageUrl = await generateMultiProductCreative(
            uploadedImages,
            modalStyle,
            customText,
            finalName
          )

          

          // Update creative status with the generated URL
          updateCreativeStatus(creativeId, 'completed', generatedImageUrl)

          // Save to database
          const backgroundTypeMapping: { [key: string]: string } = {
            'concrete-floor': 'concrete',
            'marble-surface': 'marble',
            'wooden-tabletop': 'wood',
            'white-background': 'minimalist',
            'cotton-sheet': 'fabric',
            'black-background': 'minimalist',
            'gradient-surface': 'gradient',
            'metallic-surface': 'metallic'
          }

          try {
            const saveResponse = await fetch('/api/creative-generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                brandId: selectedBrandId,
                userId: user?.id,
                styleId: modalStyle.id,
                styleName: modalStyle.id === 'custom-template' ? 'Custom Multi-Product Template' : `${modalStyle.name} Multi-Product`,
                originalImageUrl: uploadedImageUrls[0],
                generatedImageUrl: generatedImageUrl,
                promptUsed: enhancedPrompt,
                textOverlays: customText,
                metadata: {
                  backgroundType: backgroundTypeMapping[modalStyle.id] || 'minimalist',
                  aspectRatio: 'portrait',
                  quality: 'hd',
                  lighting: 'soft',
                  customModifiers: !!customInstructions,
                  model: 'gemini-2.5-flash-image-preview',
                  multiProductCount: uploadedImages.length,
                  multiProductImages: uploadedImageUrls,
                  isMultiProduct: true
                },
                customName: `${finalName} Multi-Product (${uploadedImages.length} items)`
              }),
            })

            if (!saveResponse.ok) {
              console.error('❌ Failed to save multi-product creative to database:', await saveResponse.text())
            } else {
  
            }
          } catch (saveError) {
            console.error('❌ Error saving multi-product creative to database:', saveError)
          }

          // Update the UI with the generated image
          setLoadedImages(prev => ({
            ...prev,
            [creativeId]: {
              original: uploadedImageUrls[0],
              generated: generatedImageUrl
            }
          }))

          toast.success(`🎨 Generated multi-product creative with ${uploadedImages.length} items!`)
          incrementUsage()

          // Clear the uploaded images after successful generation
          setUploadedImages([])
          setUploadedImageUrls([])

          // Switch to generated tab
          setActiveTab('generated')

        } catch (generationError) {
          console.error('❌ Error generating multi-product creative:', generationError)
          updateCreativeStatus(creativeId, 'failed')
          toast.error('Failed to generate multi-product creative')
        }

        return // Exit early to prevent fallthrough to single-product logic
      }

      // Single product mode (existing logic continues below)
      if (!uploadedImage) {
        toast.error('Please upload an image first');
        updateCreativeStatus(creativeId, 'failed');
        return;
      }

      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(uploadedImage);
      });

      // Debug logging
      // console.log('🚀 SENDING TO API:')
      // console.log('📝 Final Prompt:', enhancedPrompt)
      // console.log('🎨 Style ID:', modalStyle.id)
      // console.log('📷 Image size:', base64Image.length, 'characters')
      // console.log('📋 Text overlays:', customText)

      // Create FormData for the new Gemini API
      const formData = new FormData();
      
      // Convert base64 back to file for the new API
      const base64Data = base64Image.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const imageBlob = new Blob([byteArray], { type: uploadedImage?.type || 'image/jpeg' });
      const imageFile = new File([imageBlob], uploadedImage?.name || 'image.jpg', { type: uploadedImage?.type || 'image/jpeg' });
      
      formData.append('image', imageFile);
      // Map style IDs to background types for the new Gemini API
      const backgroundTypeMapping: { [key: string]: string } = {
        'concrete-floor': 'concrete',
        'marble-surface': 'marble', 
        'wooden-tabletop': 'wood',
        'white-background': 'minimalist',
        'cotton-sheet': 'fabric',
        // Add more mappings as needed
      };
      
      const backgroundType = backgroundTypeMapping[modalStyle.id] || 'minimalist'; // Default to minimalist
      formData.append('backgroundType', backgroundType);
      formData.append('aspectRatio', 'portrait'); // Use portrait aspect ratio for mobile devices (1024x1536)
      formData.append('quality', 'hd'); // Use high quality
      formData.append('lighting', 'soft');
      formData.append('customPromptModifiers', enhancedPrompt);

      const response = await fetch('/api/ai/generate-creative', {
        method: 'POST',
        body: formData, // Use FormData instead of JSON
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
      // console.log('✅ API Success Response:', data)
      // console.log('🖼️ Generated image URL length:', data.imageUrl?.length || 'no imageUrl')
      updateCreativeStatus(creativeId, 'completed', data.imageUrl)
      setGeneratedImage(data.imageUrl)
      incrementUsage() // Increment usage count on successful generation

      // Save the creative to the database
      try {
        const saveResponse = await fetch('/api/creative-generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId: selectedBrandId,
            userId: user?.id,
            styleId: modalStyle.id,
            styleName: modalStyle.id === 'custom-template' ? 'Custom Template' : modalStyle.name,
            originalImageUrl: uploadedImageUrl,
            generatedImageUrl: data.imageUrl,
            promptUsed: enhancedPrompt,
            textOverlays: customText,
            metadata: {
              backgroundType: backgroundTypeMapping[modalStyle.id] || 'minimalist',
              aspectRatio: 'portrait',
              quality: 'hd',
              lighting: 'soft',
              customModifiers: !!customInstructions,
              model: data.model || 'gemini-2.5-flash-image-preview'
            },
            customName: finalName
          }),
        })

        if (saveResponse.ok) {

        } else {
          console.error('❌ Failed to save creative to database:', await saveResponse.text())
        }
      } catch (saveError) {
        console.error('❌ Error saving creative to database:', saveError)
        // Don't fail the generation if database save fails
      }
      
      // Immediately set the loaded images to display the result without API call
      setLoadedImages(prev => ({
        ...prev,
        [creativeId]: {
          original: uploadedImageUrl,
          generated: data.imageUrl
        }
      }))
      
      // Check for quality warnings
      if (data.warning && data.warning.type === 'quality_loss') {
        toast.warning('⚠️ Quality Warning', {
          description: data.warning.message,
          duration: 8000
        })
      }
      
      toast.success(`🎨 Image generated successfully!`);
    } catch (error) {
      console.error('Error generating image:', error)
      updateCreativeStatus(creativeId, 'failed')
      
      // Check if it's an image size error
      if (error instanceof Error && error.message.includes('too large even after maximum compression')) {
        toast.error('❌ Image is too large to process. Please use a smaller image or crop it before uploading.')
      } else if (error instanceof Error && error.message.includes('Failed to compress image')) {
        toast.error('❌ Failed to process image. Please try a different image format or smaller file size.')
      } else {
        toast.error('Failed to generate image. Check console for details.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Show loading state with smooth transition
  if (isLoadingPage || isLoadingAfterBrandSelection) {
    return (
      <div className="w-full min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden py-8 transition-opacity duration-300 ease-in-out">
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
      <div className="w-full min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center relative overflow-hidden py-8">
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
          <div className="bg-gradient-to-r from-[#1a1a1a]/50 to-[#161616]/50 border border-[#333] rounded-lg p-5">
            <div className="flex items-center justify-center space-x-2 text-amber-400 mb-3">
              <FlaskConical className="w-6 h-6" />
              <span className="font-semibold text-lg">Beta Feature</span>
            </div>
            <div className="text-gray-300 text-sm space-y-2">
              <p className="font-medium text-center mb-3">The Ad Creative Studio is currently in beta testing.</p>
              <div className="text-xs space-y-1">
                <p><strong>Known Limitations:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>May struggle with fine text, small labels, and neck tags</li>
                  <li>Poor quality or low-resolution images may produce subpar results</li>
                  <li>Complex graphics and intricate details might be distorted</li>
                  <li>Occasional issues with color accuracy and fabric textures</li>
                </ul>
                <p className="mt-3"><strong>Beta Benefits:</strong> Early access to AI-powered creative generation, regular improvements, and direct feedback integration.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Progressive step components
  const renderUploadStep = () => (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-4">Upload Your Product Images</h2>
        <p className="text-gray-300 text-lg">Start by uploading one or more product images to create your ad creative</p>
      </div>
      
      <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column - Upload Drop Zone */}
          <div>
            <div 
              className="border-2 border-dashed border-[#333] rounded-xl p-6 text-center hover:border-[#555] transition-colors h-[300px] flex items-center justify-center"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-white/5 to-white/10 rounded-xl flex items-center justify-center border border-white/10">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Drop images here or click to upload</h3>
                  <p className="text-gray-400 text-xs">Supports JPG, PNG, WebP • Single or multiple images</p>
                </div>
                <label htmlFor="upload-input" className="cursor-pointer">
                  <div className="bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] hover:from-[#333] hover:to-[#222] 
                                px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 
                                hover:scale-105 hover:shadow-xl">
                    Select Images
                  </div>
                  <input
                    id="upload-input"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right Column - Pro Tips */}
          <div>
            <div className="bg-gradient-to-br from-orange-500/10 to-amber-600/10 border border-orange-500/30 rounded-lg p-4 h-[300px]">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-orange-400 font-semibold mb-2">📸 Pro Tips for Best Results</h4>
                  <ul className="text-xs text-gray-300 space-y-1.5">
                    <li>• <strong>Higher quality images = better results</strong> - Use high-resolution photos for best AI generation</li>
                    <li>• <strong>Product-only photos work best</strong> - Avoid distracting backgrounds or other objects</li>
                    <li>• <strong>Good lighting is key</strong> - Well-lit, clear photos generate more accurate results</li>
                    <li>• <strong>Multiple angles welcome</strong> - Upload different product views for varied creative options</li>
                    <li>• <strong>Avoid heavy filters</strong> - Use natural, unedited photos for most accurate reproduction</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Uploaded Images Preview - Fixed Area */}
        <div className="min-h-[200px]">
          {(uploadedImage || (uploadedImages.length > 0)) ? (
            <div>
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Uploaded Images ({isMultiMode ? uploadedImages.length : 1})
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              {isMultiMode ? (
                uploadedImageUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={url} 
                      alt={`Product ${index + 1}`}
                      className="w-full h-24 object-contain rounded-lg border border-[#333] bg-[#2a2a2a]"
                    />
                    <button
                      onClick={() => {
                        const newImages = uploadedImages.filter((_, i) => i !== index)
                        const newUrls = uploadedImageUrls.filter((_, i) => i !== index)
                        setUploadedImages(newImages)
                        setUploadedImageUrls(newUrls)
                        
                        if (newImages.length === 0) {
                          setIsMultiMode(false)
                          setCollageUrl('')
                        } else if (newImages.length === 1) {
                          // Switch to single mode
                          setUploadedImage(newImages[0])
                          setUploadedImageUrl(newUrls[0])
                          setIsMultiMode(false)
                          setUploadedImages([])
                          setUploadedImageUrls([])
                          setCollageUrl('')
                        }
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))
              ) : uploadedImageUrl && (
                <div className="relative">
                  <img 
                    src={uploadedImageUrl} 
                    alt="Product"
                    className="w-full h-24 object-contain rounded-lg border border-[#333] bg-[#2a2a2a]"
                  />
                  <button
                    onClick={() => {
                      setUploadedImage(null)
                      setUploadedImageUrl('')
                      setGeneratedImage('')
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Next Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => setCurrentStep('creative-type')}
                className="bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] hover:from-[#333] hover:to-[#222] px-8 py-3 text-lg font-semibold text-white rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
              >
                Next: Choose Creative Type
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Upload images to see preview here</p>
                <p className="text-sm">Your uploaded images will appear in this space</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

     const renderCreativeTypeStep = () => (
     <div className="max-w-6xl mx-auto">
       <div className="flex items-start justify-between mb-6">
         <Button
           onClick={() => setCurrentStep('upload')}
           variant="ghost"
           className="text-gray-400 hover:text-white"
         >
           <ChevronLeft className="w-4 h-4 mr-2" />
           Back to Upload
         </Button>
       </div>

       {/* Header section */}
       <div className="text-center mb-6">
         <h2 className="text-4xl font-bold text-white mb-4">Choose Creative Type</h2>
         <p className="text-gray-300 text-lg">What type of creative do you want to generate?</p>
       </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {CREATIVE_TYPES.map((type) => (
          <div
            key={type.id}
            onClick={() => {
              setSelectedCreativeType(type.id)
              // Clear clothing subtype if not selecting clothing
              if (type.id !== 'clothing') {
                setSelectedClothingSubType('')
              }
              if (type.id === 'clothing') {
                setCurrentStep('clothing-subcategory')
              } else if (type.id === 'custom-template') {
                setCurrentStep('customization')
              } else {
                setCurrentStep('template-selection')
              }
            }}
            className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] rounded-xl p-8 cursor-pointer hover:border-[#555] hover:shadow-xl transition-all duration-300 group h-[280px] flex flex-col justify-center"
          >
            <div className="text-center">
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {type.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{type.name}</h3>
              <p className="text-gray-400 text-base leading-relaxed">{type.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderClothingSubcategoryStep = () => (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <Button
          onClick={() => setCurrentStep('creative-type')}
          variant="ghost"
          className="text-gray-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Creative Type
        </Button>
      </div>

      {/* Header section */}
      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold text-white mb-4">Choose Clothing Type</h2>
        <p className="text-gray-300 text-lg">How would you like to display your clothing?</p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {CLOTHING_SUB_TYPES.map((subType) => (
          <div
            key={subType.id}
            onClick={() => {
              setSelectedClothingSubType(subType.id)
              setSelectedCreativeType(subType.id) // Update the main creative type for compatibility
              setCurrentStep('template-selection')
            }}
            className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] rounded-xl p-8 cursor-pointer hover:border-[#555] hover:shadow-xl transition-all duration-300 group h-[280px] flex flex-col justify-center"
          >
            <div className="text-center">
              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {subType.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">{subType.name}</h3>
              <p className="text-gray-400 text-base leading-relaxed">{subType.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderTemplateSelectionStep = () => {
    // Handle clothing subcategories
    let selectedType = CREATIVE_TYPES.find(type => type.id === selectedCreativeType)
    
    // If it's a clothing subcategory, find it in CLOTHING_SUB_TYPES
    if (!selectedType && selectedClothingSubType) {
      selectedType = CLOTHING_SUB_TYPES.find(type => type.id === selectedCreativeType)
    }
    
    if (!selectedType) return null

    const availableTemplates = STYLE_OPTIONS.filter(style =>
      selectedType.subcategories?.includes(style.id)
    )

    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              onClick={() => {
                // Only go to clothing-subcategory if we actually selected a clothing subtype
                if (selectedClothingSubType) {
                  setCurrentStep('clothing-subcategory')
                } else {
                  setCurrentStep('creative-type')
                }
              }}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Creative Type
            </Button>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Choose Template</h2>
          <p className="text-gray-300 text-lg">Select a template for your {selectedType.name.toLowerCase()}</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {availableTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => {
                setSelectedTemplate(template)
                setCurrentStep('customization')
              }}
              className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] rounded-xl overflow-hidden cursor-pointer hover:border-[#555] hover:shadow-xl transition-all duration-300 group"
            >
              <div className="aspect-[3/4] relative overflow-hidden">
                <img
                  src={template.thumbnail}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
                <p className="text-gray-400 text-sm">{template.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderCustomizationStep = () => (
    <div className="pt-[20px]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          onClick={() => setCurrentStep(selectedCreativeType === 'custom-template' ? 'creative-type' : 'template-selection')}
          variant="ghost"
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-white">Customize Your Creative</h2>
          <p className="text-gray-400 text-sm mt-1">Fine-tune your design with text overlays and custom styling</p>
        </div>
      </div>
      
      {/* Layout with Model Gender Conditional */}
      <div className="mt-2">
      {selectedCreativeType === 'clothing-models' ? (
                /* Layout with Model Gender - Vertical layout to match preview height */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Left Column: Text Overlays, Model Gender, and Custom Instructions stacked vertically */}
          <div className="lg:col-span-5 space-y-3">
            {/* Text Overlays */}
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#171717] rounded-xl border border-[#333]/60 shadow-lg backdrop-blur-sm p-5 hover:border-[#444]/80 transition-all duration-200 h-[180px]">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-white">T</span>
                  </div>
                  Text Overlays
                </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Top Text */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium">Top Text</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => {
                        setSelectedTopPreset('none')
                        setCustomValues(prev => ({ ...prev, topValue: '' }))
                        setCustomText(prev => ({ ...prev, top: '' }))
                      }}
                      className={`p-1.5 text-xs rounded-md transition-all border ${
                        selectedTopPreset === 'none'
                          ? 'bg-gradient-to-r from-gray-700/40 to-gray-800/40 text-white border-gray-600/50 shadow-md'
                          : 'bg-[#333]/80 text-gray-400 hover:bg-[#3a3a3a]/90 border-[#444]/60 hover:border-[#555]/80 hover:text-white'
                      }`}
                    >
                      None
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTopPreset('custom')
                        setCustomValues(prev => ({ ...prev, topValue: '' }))
                        setCustomText(prev => ({ ...prev, top: '' }))
                      }}
                      className={`p-1.5 text-xs rounded-md transition-all border ${
                        selectedTopPreset === 'custom'
                          ? 'bg-gradient-to-r from-gray-700/40 to-gray-800/40 text-white border-gray-600/50 shadow-md'
                          : 'bg-[#333]/80 text-gray-400 hover:bg-[#3a3a3a]/90 border-[#444]/60 hover:border-[#555]/80 hover:text-white'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {selectedTopPreset === 'custom' && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={customValues.topValue}
                        onChange={(e) => {
                          setCustomValues(prev => ({ ...prev, topValue: e.target.value }))
                          setCustomText(prev => ({ ...prev, top: e.target.value }))
                        }}
                        placeholder="SWIPE UP..."
                        className="w-full bg-[#333] border border-[#444] rounded px-2 py-1.5 text-white text-xs placeholder-gray-500 focus:border-[#555] focus:outline-none"
                      />
                      {selectedTopPreset === 'custom' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={textColors.top}
                            onChange={(e) => setTextColors(prev => ({ ...prev, top: e.target.value }))}
                            className="w-6 h-6 rounded border border-[#444] cursor-pointer"
                          />
                          <span className="text-xs text-gray-500">{textColors.top}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Text */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium">Bottom Text</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => {
                        setSelectedBottomPreset('none')
                        setCustomValues(prev => ({ ...prev, bottomValue: '' }))
                        setCustomText(prev => ({ ...prev, bottom: '' }))
                      }}
                      className={`p-1.5 text-xs rounded-md transition-all border ${
                        selectedBottomPreset === 'none'
                          ? 'bg-gradient-to-r from-gray-700/40 to-gray-800/40 text-white border-gray-600/50 shadow-md'
                          : 'bg-[#333]/80 text-gray-400 hover:bg-[#3a3a3a]/90 border-[#444]/60 hover:border-[#555]/80 hover:text-white'
                      }`}
                    >
                      None
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBottomPreset('custom')
                        setCustomValues(prev => ({ ...prev, bottomValue: '' }))
                        setCustomText(prev => ({ ...prev, bottom: '' }))
                      }}
                      className={`p-1.5 text-xs rounded-md transition-all border ${
                        selectedBottomPreset === 'custom'
                          ? 'bg-gradient-to-r from-gray-700/40 to-gray-800/40 text-white border-gray-600/50 shadow-md'
                          : 'bg-[#333]/80 text-gray-400 hover:bg-[#3a3a3a]/90 border-[#444]/60 hover:border-[#555]/80 hover:text-white'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {selectedBottomPreset === 'custom' && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={customValues.bottomValue}
                        onChange={(e) => {
                          setCustomValues(prev => ({ ...prev, bottomValue: e.target.value }))
                          setCustomText(prev => ({ ...prev, bottom: e.target.value }))
                        }}
                        placeholder="LINK IN BIO..."
                        className="w-full bg-[#333] border border-[#444] rounded px-2 py-1.5 text-white text-xs placeholder-gray-500 focus:border-[#555] focus:outline-none"
                      />
                      {selectedBottomPreset === 'custom' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={textColors.bottom}
                            onChange={(e) => setTextColors(prev => ({ ...prev, bottom: e.target.value }))}
                            className="w-6 h-6 rounded border border-[#444] cursor-pointer"
                          />
                          <span className="text-xs text-gray-500">{textColors.bottom}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Model Gender Widget */}
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#171717] rounded-xl border border-[#333]/60 shadow-lg backdrop-blur-sm p-5 hover:border-[#444]/80 transition-all duration-200 h-[160px]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">👤</span>
                </div>
                Model Gender *
              </h3>
              <div className="flex justify-center">
                <div className="grid grid-cols-3 gap-3 max-w-xs">
                  {[
                    { value: 'male', label: 'Male', icon: '👨' },
                    { value: 'female', label: 'Female', icon: '👩' },
                    { value: 'any', label: 'Any', icon: '👤' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedGender(option.value as 'male' | 'female' | 'any')}
                      className={`p-3 rounded-lg transition-all text-center border ${
                          selectedGender === option.value
                            ? 'bg-gradient-to-r from-green-700/40 to-teal-800/40 text-white border-green-600/50 shadow-lg'
                            : 'bg-[#333]/80 text-gray-400 hover:bg-[#3a3a3a]/90 border-[#444]/60 hover:border-[#555]/80 hover:text-white'
                        }`}
                    >
                      <div className="text-lg">{option.icon}</div>
                      <div className="text-xs font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              {!selectedGender && (
                <p className="text-xs text-red-400 mt-2 text-center">* Required for generation</p>
              )}
            </div>

            {/* Custom Instructions Widget */}
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#171717] rounded-xl border border-[#333]/60 shadow-lg backdrop-blur-sm p-5 hover:border-[#444]/80 transition-all duration-200 h-[200px]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">⚡</span>
                </div>
                Custom Instructions
              </h3>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Lighting, background, angles, etc..."
                className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-white placeholder-gray-400 focus:border-[#555] focus:outline-none resize-none text-sm"
                style={{ height: 'calc(100% - 4rem)' }}
              />
            </div>
          </div>

          {/* Middle Column: Generate Button */}
          <div className="lg:col-span-7">
            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#171717] rounded-xl border border-[#333]/60 shadow-lg backdrop-blur-sm hover:border-[#444]/80 transition-all duration-200 min-h-[580px]">
              <Button
                onClick={async () => {
                  if (!uploadedImage && !isMultiMode) {
                    toast.error('Please upload an image first')
                    return
                  }

                  if (!selectedTemplate) {
                    toast.error('Please select a template first')
                    return
                  }

                  // Validate gender selection for model-based templates
                  if (selectedCreativeType === 'clothing-models' && !selectedGender) {
                    toast.error('Please select a model gender first')
                    return
                  }

                  try {
                    // Call the generation function with the selected template directly
                    await generateImageFromTemplate(selectedTemplate)

                    // Clear regeneration feedback after successful generation
                    setRegenerationFeedback({
                      issues: [],
                      details: ''
                    })
                  } catch (error) {
                    setIsGenerating(false)
                    toast.error('Failed to generate creative. Please try again.')
                  }
                }}
                className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-white border border-purple-500/50 hover:border-purple-400/60 px-8 py-4 font-semibold rounded-xl transition-all hover:scale-105 flex flex-col items-center justify-center gap-4 shadow-lg"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                    <div className="text-center">
                      <div className="text-lg font-bold">Generating...</div>
                      <div className="text-sm text-gray-300">Usually takes 30-60s</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">Generate Creative</div>
                      <div className="text-sm text-gray-300">Click to create your ad</div>
                    </div>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Layout without Model Gender - vertical stacked layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          
          {/* Left Column: Text Overlays and Custom Instructions stacked vertically */}
          <div className="lg:col-span-5 space-y-3">
            {/* Text Overlays */}
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#171717] rounded-xl border border-[#333]/60 shadow-lg backdrop-blur-sm p-5 h-[280px] hover:border-[#444]/80 transition-all duration-200">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">T</span>
                </div>
                Text Overlays
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Top Text */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium">Top Text</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => {
                        setSelectedTopPreset('none')
                        setCustomValues(prev => ({ ...prev, topValue: '' }))
                        setCustomText(prev => ({ ...prev, top: '' }))
                      }}
                      className={`p-1.5 text-xs rounded-md transition-all border ${
                        selectedTopPreset === 'none'
                          ? 'bg-gradient-to-r from-gray-700/40 to-gray-800/40 text-white border-gray-600/50 shadow-md'
                          : 'bg-[#333]/80 text-gray-400 hover:bg-[#3a3a3a]/90 border-[#444]/60 hover:border-[#555]/80 hover:text-white'
                      }`}
                    >
                      None
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTopPreset('custom')
                        setCustomValues(prev => ({ ...prev, topValue: '' }))
                        setCustomText(prev => ({ ...prev, top: '' }))
                      }}
                      className={`p-1.5 text-xs rounded-md transition-all border ${
                        selectedTopPreset === 'custom'
                          ? 'bg-gradient-to-r from-gray-700/40 to-gray-800/40 text-white border-gray-600/50 shadow-md'
                          : 'bg-[#333]/80 text-gray-400 hover:bg-[#3a3a3a]/90 border-[#444]/60 hover:border-[#555]/80 hover:text-white'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {selectedTopPreset === 'custom' && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={customValues.topValue}
                        onChange={(e) => {
                          setCustomValues(prev => ({ ...prev, topValue: e.target.value }))
                          setCustomText(prev => ({ ...prev, top: e.target.value }))
                        }}
                        placeholder="SWIPE UP..."
                        className="w-full bg-[#333] border border-[#444] rounded px-2 py-1.5 text-white text-xs placeholder-gray-500 focus:border-[#555] focus:outline-none"
                      />
                      {selectedTopPreset === 'custom' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={textColors.top}
                            onChange={(e) => setTextColors(prev => ({ ...prev, top: e.target.value }))}
                            className="w-6 h-6 rounded border border-[#444] cursor-pointer"
                          />
                          <span className="text-xs text-gray-500">{textColors.top}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Text */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium">Bottom Text</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => {
                        setSelectedBottomPreset('none')
                        setCustomValues(prev => ({ ...prev, bottomValue: '' }))
                        setCustomText(prev => ({ ...prev, bottom: '' }))
                      }}
                      className={`p-1.5 text-xs rounded-md transition-all border ${
                        selectedBottomPreset === 'none'
                          ? 'bg-gradient-to-r from-gray-700/40 to-gray-800/40 text-white border-gray-600/50 shadow-md'
                          : 'bg-[#333]/80 text-gray-400 hover:bg-[#3a3a3a]/90 border-[#444]/60 hover:border-[#555]/80 hover:text-white'
                      }`}
                    >
                      None
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBottomPreset('custom')
                        setCustomValues(prev => ({ ...prev, bottomValue: '' }))
                        setCustomText(prev => ({ ...prev, bottom: '' }))
                      }}
                      className={`p-1.5 text-xs rounded-md transition-all border ${
                        selectedBottomPreset === 'custom'
                          ? 'bg-gradient-to-r from-gray-700/40 to-gray-800/40 text-white border-gray-600/50 shadow-md'
                          : 'bg-[#333]/80 text-gray-400 hover:bg-[#3a3a3a]/90 border-[#444]/60 hover:border-[#555]/80 hover:text-white'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {selectedBottomPreset === 'custom' && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={customValues.bottomValue}
                        onChange={(e) => {
                          setCustomValues(prev => ({ ...prev, bottomValue: e.target.value }))
                          setCustomText(prev => ({ ...prev, bottom: e.target.value }))
                        }}
                        placeholder="LINK IN BIO..."
                        className="w-full bg-[#333] border border-[#444] rounded px-2 py-1.5 text-white text-xs placeholder-gray-500 focus:border-[#555] focus:outline-none"
                      />
                      {selectedBottomPreset === 'custom' && (
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={textColors.bottom}
                            onChange={(e) => setTextColors(prev => ({ ...prev, bottom: e.target.value }))}
                            className="w-6 h-6 rounded border border-[#444] cursor-pointer"
                          />
                          <span className="text-xs text-gray-500">{textColors.bottom}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Instructions Widget */}
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#171717] rounded-xl border border-[#333]/60 shadow-lg backdrop-blur-sm p-5 hover:border-[#444]/80 transition-all duration-200 h-[260px]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">⚡</span>
                </div>
                Custom Instructions
              </h3>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Lighting, background, angles, etc..."
                className="w-full bg-[#333] border border-[#444] rounded px-3 py-2 text-white placeholder-gray-400 focus:border-[#555] focus:outline-none resize-none text-sm"
                style={{ height: 'calc(100% - 4rem)' }}
              />
            </div>
          </div>

          {/* Middle Column: Generate Button */}
          <div className="lg:col-span-7">
            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#171717] rounded-xl border border-[#333]/60 shadow-lg backdrop-blur-sm hover:border-[#444]/80 transition-all duration-200 min-h-[580px]">
              <Button
                onClick={async () => {
                  if (!uploadedImage && !isMultiMode) {
                    toast.error('Please upload an image first')
                    return
                  }

                  if (!selectedTemplate) {
                    toast.error('Please select a template first')
                    return
                  }

                  try {
                    // Call the generation function with the selected template directly
                    await generateImageFromTemplate(selectedTemplate)

                    // Clear regeneration feedback after successful generation
                    setRegenerationFeedback({
                      issues: [],
                      details: ''
                    })
                  } catch (error) {
                    setIsGenerating(false)
                    toast.error('Failed to generate creative. Please try again.')
                  }
                }}
                className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-white border border-purple-500/50 hover:border-purple-400/60 px-8 py-4 font-semibold rounded-xl transition-all hover:scale-105 flex flex-col items-center justify-center gap-4 shadow-lg"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-purple-400" />
                    <div className="text-center">
                      <div className="text-lg font-bold">Generating...</div>
                      <div className="text-sm text-gray-300">Usually takes 30-60s</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold">Generate Creative</div>
                      <div className="text-sm text-gray-300">Click to create your ad</div>
                    </div>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )

  const renderGenerationPreview = () => (
    <div className="flex flex-col h-full">
      <h3 className="text-xl font-semibold text-white mb-6 text-center">Creative Preview</h3>
      
      {isGenerating ? (
        <div className="flex flex-col items-center justify-center space-y-6 h-[580px]">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-[#333]"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-gray-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-gray-400 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-white font-medium">Generating Creative...</p>
            <p className="text-gray-400 text-sm">This usually takes 30-60 seconds</p>
          </div>
          <div className="w-full max-w-xs space-y-2">
            <div className="text-xs text-gray-400 flex items-center justify-between">
              <span>Analyzing image...</span>
              <span className="text-white">✓</span>
            </div>
            <div className="text-xs text-gray-400 flex items-center justify-between">
              <span>Applying template...</span>
              <Loader2 className="w-3 h-3 animate-spin" />
            </div>
            <div className="text-xs text-gray-500 flex items-center justify-between">
              <span>Adding text overlays...</span>
              <span>•</span>
            </div>
          </div>
        </div>
      ) : generatedImage ? (
        <div className="flex flex-col space-y-4 h-[580px]">
          <div className="h-[440px] bg-[#2a2a2a] rounded-lg overflow-hidden flex items-center justify-center">
            <img
              src={generatedImage}
              alt="Generated creative"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="space-y-3">
            <Button
              onClick={() => {
                const link = document.createElement('a')
                link.href = generatedImage
                link.download = 'creative.jpg'
                link.click()
              }}
              className="w-full bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] hover:from-[#333] hover:to-[#222] text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={() => setShowFixIssuesModal(true)}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Fix Issues
            </Button>
            <Button
              onClick={resetAllData}
              variant="outline"
              className="w-full border-[#333] hover:border-[#555] text-gray-300 hover:text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Another
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4 text-center h-[580px]">
          <div className="w-16 h-16 bg-gradient-to-br from-white/5 to-white/10 rounded-xl flex items-center justify-center border border-white/10">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
          <div className="space-y-2">
            <p className="text-white font-medium">Your Creative Will Generate Here</p>
            <p className="text-gray-400 text-sm">Complete the steps on the left and click generate to see your creative appear here</p>
          </div>
        </div>
      )}
    </div>
  )

  const renderLibraryStep = () => (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button 
            onClick={resetAllData} 
            variant="ghost" 
            className="text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Create New
          </Button>
        </div>
        <h2 className="text-4xl font-bold text-white mb-4">Your Creative Library</h2>
        <p className="text-gray-300 text-lg">View and manage all your generated creatives</p>
      </div>
      
      {generatedCreatives.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-white/5 to-white/10 rounded-xl flex items-center justify-center border border-white/10 mx-auto mb-6">
            <ImageIcon className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No creatives yet</h3>
          <p className="text-gray-400 mb-6">Generate your first creative to see it here</p>
          <Button
            onClick={resetAllData}
            className="bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] hover:from-[#333] hover:to-[#222] px-8 py-3 text-white rounded-lg transition-all duration-200 hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Creative
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {generatedCreatives.map((creative) => {
            const isLoading = loadingImages.has(creative.id)
            const loadedImage = loadedImages[creative.id]
            const imageUrl = loadedImage?.generated || creative.generated_image_url
            
            return (
              <div
                key={creative.id}
                className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] border border-[#333] rounded-xl overflow-hidden hover:border-[#555] hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  {isLoading ? (
                    <div className="w-full h-full bg-[#2a2a2a] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                    </div>
                  ) : imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={creative.custom_name || 'Generated Creative'}
                      className="w-full h-full object-contain bg-black"
                      onError={() => {
                        // Fallback to original URL if loaded image fails
                        if (loadedImage?.generated && creative.generated_image_url) {
                          setLoadedImages(prev => ({
                            ...prev,
                            [creative.id]: {
                              ...prev[creative.id],
                              generated: creative.generated_image_url
                            }
                          }))
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#2a2a2a] flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {creative.custom_name || 'Creative'}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 flex-1">
                    {new Date(creative.created_at).toLocaleDateString()}
                  </p>
                  {/* Buttons moved to bottom */}
                  <div className="flex gap-2 mt-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-[#333] hover:border-[#555] text-gray-300 hover:text-white"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = imageUrl || creative.generated_image_url
                        link.download = `${creative.custom_name || 'creative'}.jpg`
                        link.click()
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#333] hover:border-[#555] text-gray-300 hover:text-white"
                      onClick={() => {
                        const imageUrl = loadedImage?.generated || creative.generated_image_url
                        if (imageUrl) {
                          openCropModal(creative.id, imageUrl)
                        } else {
                          toast.error('Image not loaded yet')
                        }
                      }}
                    >
                      <Crop className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#333] hover:border-red-500 text-gray-300 hover:text-red-400"
                      onClick={() => handleDeleteCreative(creative.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'upload':
        return renderUploadStep()
      case 'creative-type':
        return renderCreativeTypeStep()
      case 'clothing-subcategory':
        return renderClothingSubcategoryStep()
      case 'template-selection':
        return renderTemplateSelectionStep()
      case 'customization':
        return renderCustomizationStep()
      case 'library':
        return renderLibraryStep()
      default:
        return renderUploadStep()
    }
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0f0f0f] p-2 pb-3 animate-in fade-in duration-300 relative">
      <GridOverlay />
      <div className="max-w-[1600px] mx-auto space-y-3 relative z-10 px-6">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] py-6 pl-6 pr-[25px] shadow-2xl">
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
            
            {/* Weekly Usage and Library Buttons */}
            <div className="flex justify-center">
              <div className="flex items-center gap-4">
                {/* Weekly Usage Display */}
                <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-5 w-[240px] h-[100px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 text-sm font-medium">WEEKLY USAGE</span>
                    <span className="text-sm text-gray-400">
                      {usageData.current}/{WEEKLY_LIMIT}
                    </span>
                  </div>
                  <div className="w-full bg-[#333] rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((usageData.current / WEEKLY_LIMIT) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {WEEKLY_LIMIT - usageData.current} remaining this week
                  </p>
                </div>

                {/* Library Button */}
                <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-5 w-[84px] h-[100px] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/20 transition-colors"
                     onClick={() => setCurrentStep('library')}
                >
                  <ImageIcon className="w-6 h-6" />
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-300">Library</div>
                    <div className="text-xs text-gray-400">({generatedCreatives.length})</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Main Content Layout */}
        {currentStep === 'library' ? (
          /* Full Width Library */
          <div className="py-8">
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] p-6">
              {renderCurrentStep()}
            </div>
          </div>
        ) : (
          <div className="flex lg:gap-3 py-2 lg:items-start">
            {/* Left Side - Flow Widget */}
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] relative overflow-hidden lg:w-[70%] flex-shrink-0">
              {/* Product → Template Preview (Absolute Top Right of Widget) */}
              {(uploadedImageUrl || (uploadedImageUrls.length > 0) || collageUrl) && 
               (currentStep === 'creative-type' || currentStep === 'clothing-subcategory' || currentStep === 'template-selection' || currentStep === 'customization') && (
                <div className="absolute top-1 right-4 z-30">
                  <div className="flex items-center gap-3">
                    {/* YOUR PRODUCT */}
                    <div 
                      className="relative"
                      onMouseEnter={() => setShowProductPopup(true)}
                      onMouseLeave={() => setShowProductPopup(false)}
                    >
                      <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-2 cursor-pointer hover:border-white/20 transition-colors w-[120px] h-[120px]">
                        <div className="text-center space-y-1">
                          <span className="text-xs text-gray-400 font-medium">YOUR PRODUCT</span>
                          <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden border border-[#333] bg-[#2a2a2a]">
                            <img
                              src={collageUrl || uploadedImageUrl || uploadedImageUrls[0]}
                              alt="Uploaded product"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          {isMultiMode && uploadedImages.length > 1 && (
                            <span className="text-xs text-blue-400">{uploadedImages.length} items</span>
                          )}
                        </div>
                      </div>

                      {/* Hover Bridge - invisible element to bridge the gap */}
                      {showProductPopup && (
                        <div className="absolute top-full left-0 right-0 h-2 z-40"></div>
                      )}

                      {/* Hover Popup */}
                      {showProductPopup && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
                          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 shadow-2xl min-w-[280px]">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-white font-semibold text-sm">Your Product Images</h4>
                              <span className="text-xs text-gray-400">
                                {isMultiMode ? `${uploadedImages.length} images` : '1 image'}
                              </span>
                            </div>
                            
                            {/* Images Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              {isMultiMode ? (
                                uploadedImageUrls.map((url, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={url}
                                      alt={`Product ${index + 1}`}
                                      className="w-16 h-16 object-contain rounded border border-[#444] bg-[#2a2a2a]"
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        removeImage(index)
                                      }}
                                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))
                              ) : uploadedImageUrl && (
                                <div className="relative group">
                                  <img
                                    src={uploadedImageUrl}
                                    alt="Product"
                                    className="w-16 h-16 object-contain rounded border border-[#444] bg-[#2a2a2a]"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeImage(0)
                                    }}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    ×
                                  </button>
                                </div>
                              )}
                              
                              {/* Add More Button */}
                              <label 
                                htmlFor="widget-upload-input" 
                                className="w-16 h-16 border-2 border-dashed border-[#444] rounded flex items-center justify-center cursor-pointer hover:border-[#555] transition-colors"
                              >
                                <span className="text-2xl text-gray-400">+</span>
                              </label>
                            </div>
                            
                            {/* Hidden file input for add more */}
                            <input
                              id="widget-upload-input"
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                            
                            <div className="text-xs text-gray-500 text-center">
                              Hover over images to remove • Click + to add more
                            </div>
                          </div>
                          
                          {/* Popup Arrow */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2">
                            <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-[#333]"></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Arrow and Template (shows when template is selected) */}
                    {selectedTemplate && (
                      <>
                        <div className="text-gray-400">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                        <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-2 w-[120px] h-[120px]">
                          <div className="text-center h-full flex flex-col">
                            <span className="text-xs text-gray-400 font-medium mb-1">TEMPLATE</span>
                            <div className="w-16 h-16 mx-auto rounded-lg overflow-hidden border border-[#333] bg-[#2a2a2a] flex-shrink-0">
                              <img
                                src={selectedTemplate.thumbnail}
                                alt={selectedTemplate.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="text-xs text-blue-400 px-1 leading-tight flex-1 flex items-center justify-center min-h-0">
                              <span className="truncate max-w-full">{selectedTemplate.name}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Progressive Dots - Top Left */}
              <div className="flex items-center gap-6 mb-6 p-6 pb-0">
                <div className="flex items-center gap-4">
                  {[
                    { key: 'upload', title: 'Upload' },
                    { key: 'creative-type', title: 'Creative Type' },
                    { key: 'template-selection', title: 'Template' },
                    { key: 'customization', title: 'Customize' }
                  ].map((step, index) => {
                    const isActive = currentStep === step.key
                    const isCompleted = index < ['upload', 'creative-type', 'template-selection', 'customization'].indexOf(currentStep)
                    const isLast = index === 3

                    return (
                      <div key={step.key} className="flex items-center">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full transition-all duration-300 border-2 ${
                              isActive
                                ? 'bg-gray-400 border-gray-300 shadow-lg shadow-gray-400/30'
                                : isCompleted
                                  ? 'bg-green-600 border-green-500'
                                  : 'bg-[#333] border-[#555]'
                            }`}
                          />
                          <span className={`text-xs font-medium transition-colors ${
                            isActive ? 'text-gray-300' : isCompleted ? 'text-green-400' : 'text-gray-500'
                          }`}>
                            {step.title}
                          </span>
                        </div>
                        {!isLast && (
                          <div className="w-8 h-0.5 bg-gradient-to-r from-gray-600 to-gray-700 mx-3"></div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className={`${currentStep === 'customization' ? 'p-6 pt-0 pb-2' : 'p-6 pt-0'}`}>
                {renderCurrentStep()}
              </div>
            </div>

            {/* Right Side - Generation Preview */}
            <div className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-xl border border-[#333] py-6 pl-6 pr-[19px] h-[720px] flex flex-col lg:w-[30%] flex-shrink-0">
              {renderGenerationPreview()}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Crop Modal */}
    {showCropModal && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Crop Creative</h3>
            <Button
              onClick={() => setShowCropModal(false)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-[#2a2a2a] rounded-lg p-4 relative crop-container" style={{ height: '400px' }}>
              {cropImageUrl && (
                <img
                  src={cropImageUrl}
                  alt="Crop preview"
                  className="w-full h-full object-contain"
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement
                    const container = img.parentElement as HTMLElement
                    setImageNaturalSize({
                      width: img.naturalWidth,
                      height: img.naturalHeight
                    })
                    // Calculate and store image bounds for cropping
                    calculateImageCropArea(img, container)
                  }}
                />
              )}
              
              {/* Interactive Crop overlay */}
              <div
                className="absolute border-2 border-white bg-white/10 cursor-move select-none"
                style={{
                  left: `${cropArea.x}%`,
                  top: `${cropArea.y}%`,
                  width: `${cropArea.width}%`,
                  height: `${cropArea.height}%`,
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  const startX = e.clientX
                  const startY = e.clientY
                  const startCropArea = { ...cropArea }
                  
                  const handleMouseMove = (moveE: MouseEvent) => {
                    const container = document.querySelector('.crop-container') as HTMLElement
                    if (!container) return
                    
                    const rect = container.getBoundingClientRect()
                    const deltaX = ((moveE.clientX - startX) / rect.width) * 100
                    const deltaY = ((moveE.clientY - startY) / rect.height) * 100
                    
                    const bounds = (window as any).imageBounds || { x: 0, y: 0, width: 100, height: 100 }
                    
                    setCropArea(prev => ({
                      ...prev,
                      x: Math.max(bounds.x, Math.min(bounds.x + bounds.width - prev.width, startCropArea.x + deltaX)),
                      y: Math.max(bounds.y, Math.min(bounds.y + bounds.height - prev.height, startCropArea.y + deltaY))
                    }))
                  }
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }
                  
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                }}
              >
                {/* Resize handles */}
                <div
                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-nw-resize"
                  style={{ top: '-6px', left: '-6px' }}
                  onMouseDown={(e) => handleMouseDown(e, 'top-left')}
                />
                <div
                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-n-resize"
                  style={{ top: '-6px', left: '50%', transform: 'translateX(-50%)' }}
                  onMouseDown={(e) => handleMouseDown(e, 'top')}
                />
                <div
                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-ne-resize"
                  style={{ top: '-6px', right: '-6px' }}
                  onMouseDown={(e) => handleMouseDown(e, 'top-right')}
                />
                <div
                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-w-resize"
                  style={{ top: '50%', left: '-6px', transform: 'translateY(-50%)' }}
                  onMouseDown={(e) => handleMouseDown(e, 'left')}
                />
                <div
                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-e-resize"
                  style={{ top: '50%', right: '-6px', transform: 'translateY(-50%)' }}
                  onMouseDown={(e) => handleMouseDown(e, 'right')}
                />
                <div
                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-sw-resize"
                  style={{ bottom: '-6px', left: '-6px' }}
                  onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
                />
                <div
                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-s-resize"
                  style={{ bottom: '-6px', left: '50%', transform: 'translateX(-50%)' }}
                  onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                />
                <div
                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-se-resize"
                  style={{ bottom: '-6px', right: '-6px' }}
                  onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleApplyCrop}
                className="bg-gradient-to-r from-[#2a2a2a] to-[#1a1a1a] hover:from-[#333] hover:to-[#222] text-white"
              >
                Apply Crop
              </Button>
              <Button
                onClick={handleUndoCrop}
                variant="outline"
                className="border-[#333] hover:border-[#555] text-gray-300 hover:text-white"
              >
                Reset to Original
              </Button>
              <Button
                onClick={() => setShowCropModal(false)}
                variant="outline"
                className="border-[#333] hover:border-[#555] text-gray-300 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Fix Issues Modal */}
    {showFixIssuesModal && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded flex items-center justify-center text-xs font-bold text-red-400">⚠</div>
              Fix Generation Issues
            </h3>
            <Button
              onClick={() => setShowFixIssuesModal(false)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">What went wrong? (Select all that apply)</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'tag_distorted', label: 'Tags/Labels Distorted' },
                  { id: 'shape_wrong', label: 'Wrong Clothing Shape' },
                  { id: 'text_corrupted', label: 'Text Corrupted/Blurry' },
                  { id: 'color_wrong', label: 'Colors Changed' },
                  { id: 'off-center-product', label: 'Product Off-Center' },
                  { id: 'background_bad', label: 'Background Issues' },
                  { id: 'angle_wrong', label: 'Wrong Angle/Perspective' },
                  { id: 'quality_poor', label: 'Poor Quality/Blurry' }
                ].map((issue) => (
                  <label key={issue.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-[#2a2a2a] transition-colors">
                    <input
                      type="checkbox"
                      checked={regenerationFeedback.issues.includes(issue.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRegenerationFeedback(prev => ({
                            ...prev,
                            issues: [...prev.issues, issue.id]
                          }))
                        } else {
                          setRegenerationFeedback(prev => ({
                            ...prev,
                            issues: prev.issues.filter(i => i !== issue.id)
                          }))
                        }
                      }}
                      className="rounded border-[#444] bg-[#333] text-red-500 focus:ring-red-500 focus:ring-2"
                    />
                    <span className="text-sm text-gray-300">{issue.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block">Specific details about the issue:</label>
              <textarea
                value={regenerationFeedback.details}
                onChange={(e) => setRegenerationFeedback(prev => ({
                  ...prev,
                  details: e.target.value
                }))}
                placeholder="Describe exactly what needs to be fixed (e.g., 'The neck tag text is blurry', 'Sleeves are too short', 'Background is too dark')..."
                className="w-full bg-[#333] border border-[#444] rounded px-3 py-3 text-white placeholder-gray-400 focus:border-[#666] focus:outline-none h-24 resize-none text-sm"
              />
            </div>
            
            {(regenerationFeedback.issues.length > 0 || regenerationFeedback.details.trim()) && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400">
                  ✓ The next generation will focus on fixing these specific issues
                </p>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button
                onClick={async () => {
                  setShowFixIssuesModal(false)
                  // Trigger regeneration with the feedback
                  if (selectedTemplate) {
                    await generateImageFromTemplate(selectedTemplate)
                  }
                }}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Regenerate with Fixes
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowFixIssuesModal(false)}
                variant="outline"
                className="border-[#333] hover:border-[#555] text-gray-300 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  )
}
