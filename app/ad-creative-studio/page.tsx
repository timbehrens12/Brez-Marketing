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
  }
]

const TEMPLATE_CATEGORIES = [
  { id: 'all', name: 'All Templates' },
  { id: 'clothing', name: 'Clothing & Apparel' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'products', name: 'Physical Products' }
]

// Template base groups for carousel functionality  
const TEMPLATE_BASE_GROUPS = [
  // NEW CLOTHING TEMPLATES
  'forest-branch-hanger',
  'backyard-clothesline',
  'bed-morning-light',
  'luxury-closet-floating',
  'gallery-wall-mount',
  'hologram-sci-fi',
  'mirror-showroom-mannequin',
  'runway-ghost-model',
  
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
  // NEW CLOTHING TEMPLATES - Latest additions
  {
    id: 'forest-branch-hanger',
    name: 'Forest Branch Hanger',
    description: 'Product suspended on wooden hanger between tree branches in sunlit forest clearing',
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'clothing',
    goodFor: 'Clothing, outdoor apparel, natural fashion',
    prompt: 'Display this exact clothing item suspended on a wooden hanger between two thin tree branches in a sunlit forest clearing with dappled sunlight and soft leaves underfoot. FOREST SETTING: Create an authentic forest clearing with natural lighting filtering through tree canopy. The environment should feel peaceful and naturally beautiful. TREE BRANCH SUSPENSION: Suspend the wooden hanger between two realistic tree branches that extend into the frame from either side. The branches should look natural with bark texture and slight variations. WOODEN HANGER: Use a natural wood hanger with visible grain and organic shape. The hanger should complement the forest environment and look like it belongs in nature. DAPPLED SUNLIGHT: Create beautiful dappled lighting effects as sunlight filters through leaves above. The light should create natural patterns of light and shadow on the clothing and forest floor. SOFT LEAVES UNDERFOOT: Include a natural carpet of fallen leaves beneath the hanging garment. The leaves should look authentic with natural colors and realistic placement. NATURAL DRAPING: The clothing should hang naturally from the hanger with realistic fabric behavior and gravity effects. All fabric folds and draping should look authentic. FOREST ATMOSPHERE: The overall mood should be serene, natural, and harmonious with the outdoor environment. Perfect for outdoor brands or natural lifestyle aesthetics. ORGANIC LIGHTING: Use natural outdoor lighting that feels authentic to a forest environment - soft, diffused, and naturally directional. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the natural forest presentation.'
  },
  {
    id: 'backyard-clothesline',
    name: 'Backyard Clothesline',
    description: 'Product clipped to natural twine clothesline in suburban backyard with gentle wind',
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'clothing',
    goodFor: 'Clothing, casual wear, lifestyle fashion',
    prompt: 'Display this exact clothing item clipped to a natural twine clothesline in a suburban backyard with gentle wind effects and warm sunlight. SUBURBAN BACKYARD: Create a comfortable, lived-in backyard environment that feels authentic and homey. Include subtle hints of domestic life without overwhelming the clothing focus. NATURAL TWINE CLOTHESLINE: Use authentic natural twine or rope clothesline that looks well-used and realistic. The line should be properly tensioned between supports. CLOTHESPIN ATTACHMENT: Attach the clothing using natural wooden clothespins positioned realistically. The clips should hold the garment naturally without distorting its shape. GENTLE WIND EFFECTS: Show subtle wind movement in the fabric - gentle billowing or natural movement that makes the clothing look alive and dynamic. WARM SUNLIGHT: Use natural, warm sunlight that creates an inviting domestic atmosphere. The lighting should feel like a pleasant afternoon. NATURAL MOVEMENT: The clothing should appear to be gently moving in a light breeze, with realistic fabric physics and natural draping effects. DOMESTIC COMFORT: The overall mood should evoke comfort, home, and everyday life - perfect for casual wear and lifestyle branding. AUTHENTIC DETAILS: Include realistic details like natural wear on the clothesline, authentic clothespin placement, and genuine backyard elements. LIFESTYLE AESTHETIC: The presentation should feel like a real moment captured in everyday life, not overly styled or artificial. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the authentic backyard clothesline presentation.'
  },
  {
    id: 'bed-morning-light',
    name: 'Bed Morning Light',
    description: 'Product laid flat on neatly made bed with throw pillows and soft morning light',
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'clothing',
    goodFor: 'Clothing, sleepwear, loungewear, lifestyle fashion',
    prompt: 'Display this exact clothing item laid flat on a neatly made bed with throw pillows and soft natural morning light from a nearby window. NEATLY MADE BED: Create a well-made bed with clean, smooth bedding in neutral tones. The bed should look inviting and professionally styled. THROW PILLOWS: Include 2-3 decorative throw pillows arranged naturally on the bed. Pillows should complement the overall aesthetic without competing with the clothing. FLAT LAY POSITIONING: Position the clothing item laid flat and naturally arranged on the bed surface. The garment should look like it was carefully placed but not overly styled. SOFT MORNING LIGHT: Use gentle, warm morning light streaming through a nearby window. The light should be soft and diffused, creating a peaceful morning atmosphere. WINDOW LIGHTING: The natural light should feel authentic to early morning - warm, gentle, and naturally directional from one side of the frame. NATURAL FABRIC BEHAVIOR: The clothing should rest naturally on the bedding with realistic contact points and authentic fabric draping. BEDROOM ATMOSPHERE: Create a serene, comfortable bedroom environment that feels lived-in and welcoming. Perfect for loungewear, sleepwear, or lifestyle brands. LIFESTYLE CONTEXT: The setting should suggest comfort, relaxation, and morning routines - making the clothing feel like part of everyday luxury. NATURAL STYLING: Arrange all elements naturally, as if capturing a real moment in a beautiful bedroom during morning hours. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the serene bedroom morning presentation.'
  },
  {
    id: 'luxury-closet-floating',
    name: 'Luxury Closet Floating',
    description: 'Product floating slightly above floor in center of luxury walk-in closet',
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'clothing',
    goodFor: 'Clothing, luxury fashion, high-end apparel',
    prompt: 'Display this exact clothing item floating slightly above the floor in the center of a luxury walk-in closet with shelves, mirrors, and soft lighting. LUXURY WALK-IN CLOSET: Create an upscale walk-in closet environment with high-end finishes, organized shelving, and premium materials. The space should feel sophisticated and aspirational. FLOATING EFFECT: Position the clothing item as if it\'s gently levitating or floating in the center of the closet space. The floating effect should look magical yet believable. CLOSET SHELVING: Include organized shelves with subtle hints of luxury items - perhaps shoes, accessories, or folded garments in the background, all tastefully blurred. MIRRORS: Incorporate mirrors into the closet design to add depth and luxury feel. Mirrors should enhance the space without creating distracting reflections. SOFT LIGHTING: Use sophisticated lighting - perhaps recessed ceiling lights or elegant fixtures that create even, luxurious illumination throughout the closet. PREMIUM MATERIALS: Show high-end closet materials like rich wood finishes, chrome fixtures, or marble accents that suggest luxury and quality. ORGANIZED LUXURY: The closet should appear meticulously organized and designed, like a high-end boutique or luxury retail space. ASPIRATIONAL MOOD: The overall atmosphere should evoke luxury, organization, and sophisticated lifestyle - perfect for premium fashion brands. DEPTH AND SPACE: Create visual depth in the closet space while keeping the floating clothing as the clear focal point. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the luxury floating closet presentation.'
  },
  {
    id: 'gallery-wall-mount',
    name: 'Gallery Wall Mount',
    description: 'Product mounted flat on minimalist gallery wall under spotlights with museum placard',
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'clothing',
    goodFor: 'Clothing, artistic fashion, designer pieces, statement wear',
    prompt: 'Display this exact clothing item mounted flat on a minimalist gallery wall under overhead spotlights with a small museum placard nearby. MINIMALIST GALLERY WALL: Create a clean, white gallery wall with perfect smoothness and professional museum-quality finish. The wall should be pristine and uncluttered. FLAT WALL MOUNTING: Mount the clothing item flat against the wall as if it\'s a piece of art. The garment should appear to be professionally displayed like a museum artifact. OVERHEAD SPOTLIGHTS: Use focused spotlights from above that dramatically illuminate the clothing. The lighting should be precise and gallery-quality with controlled shadows. MUSEUM PLACARD: Include a small, elegant museum-style placard positioned near the clothing. The placard should be subtle and professional, suggesting the garment\'s importance. GALLERY ATMOSPHERE: Create the sophisticated atmosphere of a contemporary art gallery or fashion museum. The environment should feel curated and artistic. ARTISTIC PRESENTATION: The clothing should be presented as art - elevated beyond mere fashion to something culturally significant and worthy of museum display. PRECISE LIGHTING: Use museum-quality lighting that perfectly illuminates the garment while creating dramatic shadows and highlighting textures. CULTURAL ELEVATION: The presentation should suggest that this clothing piece is worthy of artistic consideration and cultural preservation. PROFESSIONAL CURATION: Every element should feel professionally curated and intentionally placed, like a high-end fashion exhibition. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the museum gallery presentation.'
  },
  {
    id: 'hologram-sci-fi',
    name: 'Hologram Sci-Fi',
    description: 'Product projected as 3D hologram above sci-fi podium with glowing blue light and particle effects',
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'clothing',
    goodFor: 'Clothing, tech fashion, futuristic wear, innovative designs',
    prompt: 'Display this exact clothing item projected as a 3D hologram above a sci-fi podium with glowing blue light, particle effects, and digital distortion. SCI-FI PODIUM: Create a futuristic podium or platform with sleek, technological design. The base should look advanced with subtle glowing elements and modern materials. 3D HOLOGRAM EFFECT: Present the clothing as a realistic hologram projection - semi-transparent with subtle digital distortion effects that make it look authentically holographic. GLOWING BLUE LIGHT: Use predominantly blue lighting with digital glows and technological ambiance. The lighting should feel futuristic and high-tech. PARTICLE EFFECTS: Include subtle digital particle effects around the hologram - floating pixels, light particles, or energy distortions that enhance the sci-fi atmosphere. DIGITAL DISTORTION: Add realistic holographic distortion effects - subtle scan lines, digital artifacts, or projection imperfections that make the hologram look authentic. FUTURISTIC ENVIRONMENT: Create a clean, high-tech environment that suggests advanced technology and innovation. Think space-age laboratory or future retail. TECHNOLOGICAL PRECISION: The hologram should look precise and high-tech, suggesting advanced projection technology and scientific innovation. ENERGY EFFECTS: Include subtle energy effects - glowing edges on the clothing, light emanation, or digital aura that suggests the projection technology. INNOVATION AESTHETIC: The overall mood should suggest cutting-edge technology, innovation, and future fashion concepts. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the futuristic hologram presentation.'
  },
  {
    id: 'mirror-showroom-mannequin',
    name: 'Mirror Showroom Mannequin',
    description: 'Product worn by headless mannequin in front of mirror showing front and back views',
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'clothing',
    goodFor: 'Clothing, fashion retail, fitted garments, formal wear',
    prompt: 'Display this exact clothing item worn by a headless mannequin positioned in front of a mirror, showing both front and reflected back views in a modern showroom. HEADLESS MANNEQUIN: Use a professional, headless display mannequin with realistic proportions and clean, white finish. The mannequin should showcase the clothing\'s fit perfectly. MIRROR POSITIONING: Position the mannequin at an angle in front of a large, high-quality mirror that clearly shows the back view of the garment in reflection. DUAL VIEW PRESENTATION: The composition should show both the front view of the clothing and the back view via the mirror reflection, giving a complete 360-degree understanding of the garment. MODERN SHOWROOM: Create a contemporary retail showroom environment with clean lines, professional lighting, and upscale finishes that suggest premium fashion retail. PERFECT FIT: The clothing should fit the mannequin perfectly, showing proper draping, silhouette, and how the garment would look when worn by a real person. CLEAR REFLECTION: The mirror should provide a crystal-clear reflection of the back view, allowing viewers to see construction details, back design elements, and overall fit. RETAIL LIGHTING: Use professional retail lighting that evenly illuminates both the mannequin and its reflection without creating harsh glare on the mirror. SHOWROOM ATMOSPHERE: The environment should feel like a high-end boutique or department store showroom - sophisticated and retail-ready. COMPREHENSIVE VIEW: The presentation should give customers a complete view of the garment from multiple angles, as they would experience in premium retail. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy in both the direct view and mirror reflection.'
  },
  {
    id: 'runway-ghost-model',
    name: 'Runway Ghost Model',
    description: 'Product styled on invisible ghost model mid-runway under spotlight with blurred audience',
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'clothing',
    goodFor: 'Clothing, high fashion, runway wear, designer pieces',
    prompt: 'Display this exact clothing item styled on an invisible ghost model mid-runway under a single spotlight with a blurred audience and fashion show energy. INVISIBLE GHOST MODEL: Present the clothing as if worn by an invisible model - the garment should maintain human form and movement but without showing the actual body underneath. RUNWAY SETTING: Create an authentic fashion runway environment with proper proportions, lighting, and atmosphere of a high-end fashion show. SINGLE SPOTLIGHT: Use a dramatic single spotlight that follows the invisible model down the runway, creating focused illumination on the clothing while leaving surroundings dimmer. BLURRED AUDIENCE: Include subtle, out-of-focus silhouettes of an audience in the background to suggest the energy and context of a live fashion show. FASHION SHOW ENERGY: Capture the dynamic energy and movement of a runway presentation - the clothing should appear to be in motion as if walking down the catwalk. DRAMATIC LIGHTING: Use theatrical lighting typical of fashion shows - focused, dramatic, and designed to highlight the clothing\'s details and movement. RUNWAY MOVEMENT: The clothing should show natural movement and flow as if being worn by a model in motion, with realistic fabric behavior and draping. HIGH FASHION ATMOSPHERE: Create the sophisticated, exclusive atmosphere of a premier fashion show with professional lighting and staging. CATWALK DYNAMICS: The presentation should capture the essence of high fashion presentation - dramatic, elegant, and worthy of the runway. CRITICAL: Preserve ALL original clothing details including textures, colors, patterns, text, graphics, and structural elements with perfect accuracy while creating the dynamic runway ghost model presentation.'
  },
  {
    id: 'concrete-floor',
    name: 'Concrete Floor',
    description: 'Dark cracked concrete floor with industrial texture',
    thumbnail: 'https://i.imgur.com/ED4tpzf.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, streetwear',
    prompt: 'Place this exact clothing item on a realistic concrete surface background, similar to the lighting and texture in high-end fashion editorials. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a medium-toned concrete floor with visible cracks, subtle stains, and natural imperfections - NOT a perfect pristine surface. Include slight dust particles, minor scuff marks, and natural wear patterns that make it look authentically used. The lighting should be soft but directional with subtle variations, casting realistic shadows under the clothing to show it\'s resting on the ground. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand with natural imperfections. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in studio lighting conditions with natural inconsistencies. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. EXTREME BLUE COLOR ACCURACY: If the clothing contains ANY blue colors, tones, or blue-tinted elements, they MUST be preserved with EXACT color fidelity - do not shift hues, change saturation, or alter the blue tones in any way. Blue graphics, logos, or design elements must remain precisely the same shade and intensity. ANTI-DISTORTION PROTECTION: Do not warp, stretch, compress, or geometrically distort ANY part of the clothing - maintain perfect proportional accuracy and shape integrity throughout the entire garment. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'black-background',
    name: 'Black Background',
    description: 'Clean matte black background for dramatic contrast',
    thumbnail: 'https://i.imgur.com/TJO2Jmm.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Place this exact clothing item on a realistic matte black background, similar to professional product photography setups. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a deep matte black with subtle texture variations - NOT a perfect digital black but with natural imperfections like slight dust particles, minor surface variations, and realistic lighting gradients that make it look authentically photographed. The lighting should be professional but natural, with soft directional light that creates realistic shadows and highlights on the fabric. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric drapes - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface, showing genuine fabric physics. Maintain the natural folds, wrinkles, and garment proportions as if it was carefully placed by hand with natural imperfections. Include subtle ambient reflections and realistic light falloff on the black surface. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in a professional studio with natural lighting inconsistencies and fabric behavior. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'white-background',
    name: 'White Background',
    description: 'Clean white background for minimal, professional look',
    thumbnail: 'https://i.imgur.com/zgCXJwr.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, e-commerce',
    prompt: 'Place this exact clothing item on a realistic matte white background, similar to high-end e-commerce product photography. The clothing should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a soft matte white with subtle texture variations - NOT a perfect digital white but with natural imperfections like slight paper grain, minor surface variations, and realistic lighting gradients that make it look authentically photographed on a white backdrop. The lighting should be professional but natural, with soft even illumination that creates realistic shadows and subtle highlights on the fabric without being too harsh or artificial. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface, showing genuine fabric physics and natural draping. Maintain the natural folds, wrinkles, and garment proportions as if it was carefully arranged by hand with natural imperfections. Include subtle cast shadows on the white surface that look naturally photographed. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in a professional studio with natural lighting variations and authentic fabric behavior. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Center the product in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'asphalt-surface',
    name: 'Asphalt Surface',
    description: 'Dark asphalt road texture with realistic street surface',
    thumbnail: 'https://i.imgur.com/mDR8375.jpeg',
    category: 'clothing',
    goodFor: 'Clothing, apparel, streetwear, urban fashion',
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
    prompt: 'Place this exact clothing item on a realistic concrete surface background with DYNAMIC ANGLED POSITIONING, similar to the lighting and texture in high-end fashion editorials. The clothing should be positioned at a natural diagonal angle (exactly 20 degrees clockwise) to create visual interest and dynamic composition, as if it was casually placed or naturally settled at an angle. The garment should maintain natural shadows around the edges to reflect realistic depth while being positioned diagonally across the frame. The background should be a medium-toned concrete floor with visible cracks, subtle stains, and natural imperfections - NOT a perfect pristine surface. Include slight dust particles, minor scuff marks, and natural wear patterns that make it look authentically used. The lighting should be soft but directional with subtle variations, casting realistic shadows under the angled clothing to show it\'s resting on the ground. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits at the diagonal angle - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface while maintaining the angled positioning. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand at a natural diagonal angle with natural imperfections. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in studio lighting conditions with natural inconsistencies. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. EXTREME BLUE COLOR ACCURACY: If the clothing contains ANY blue colors, tones, or blue-tinted elements, they MUST be preserved with EXACT color fidelity - do not shift hues, change saturation, or alter the blue tones in any way. Blue graphics, logos, or design elements must remain precisely the same shade and intensity. ANTI-DISTORTION PROTECTION: Do not warp, stretch, compress, or geometrically distort ANY part of the clothing - maintain perfect proportional accuracy and shape integrity throughout the entire garment. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Position the product at a natural diagonal angle (exactly 20 degrees clockwise) in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'black-background-angled',
    name: 'Black Background (Angled)',
    description: 'Clean matte black background with dynamic angled positioning',
    thumbnail: 'https://i.imgur.com/ejph9TU.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, fashion items',
    prompt: 'Place this exact clothing item on a realistic matte black background with DYNAMIC ANGLED POSITIONING, similar to professional product photography setups. The clothing MUST be positioned at a natural diagonal angle (exactly 20 degrees clockwise - tilting to the RIGHT side of the image) to create visual interest and dynamic composition, as if it was casually placed or naturally settled at an angle. The shirt should clearly lean to the right, never to the left. The garment should maintain natural shadows around the edges to reflect realistic depth while being positioned diagonally across the frame. The background should be a deep matte black with subtle texture variations - NOT a perfect digital black but with natural imperfections like slight dust particles, minor surface variations, and realistic lighting gradients that make it look authentically photographed. The lighting should be professional but natural, with soft directional light that creates realistic shadows and highlights on the angled fabric. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric drapes at the diagonal angle - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface while maintaining the angled positioning, showing genuine fabric physics. Maintain the natural folds, wrinkles, and garment proportions as if it was casually placed by hand at a natural diagonal angle with natural imperfections. Include subtle ambient reflections and realistic light falloff on the black surface. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in a professional studio with natural lighting inconsistencies and fabric behavior. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Position the product at a natural diagonal angle (exactly 20 degrees clockwise) in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'white-background-angled',
    name: 'White Background (Angled)',
    description: 'Clean white background with dynamic angled positioning',
    thumbnail: 'https://i.imgur.com/AxIZJhK.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, e-commerce',
    prompt: 'Place this exact clothing item on a realistic matte white background with DYNAMIC ANGLED POSITIONING, similar to high-end e-commerce product photography. The clothing should be positioned at a natural diagonal angle (exactly 20 degrees clockwise) to create visual interest and dynamic composition, as if it was casually placed or naturally settled at an angle. The garment should maintain natural shadows around the edges to reflect realistic depth while being positioned diagonally across the frame. The background should be a soft matte white with subtle texture variations - NOT a perfect digital white but with natural imperfections like slight paper grain, minor surface variations, and realistic lighting gradients that make it look authentically photographed on a white backdrop. The lighting should be professional but natural, with soft even illumination that creates realistic shadows and subtle highlights on the angled fabric without being too harsh or artificial. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits at the diagonal angle - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the surface while maintaining the angled positioning, showing genuine fabric physics and natural draping. Maintain the natural folds, wrinkles, and garment proportions as if it was carefully arranged by hand at a natural diagonal angle with natural imperfections. Include subtle cast shadows on the white surface that look naturally photographed. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in a professional studio with natural lighting variations and authentic fabric behavior. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Position the product at a natural diagonal angle (exactly 20 degrees clockwise) in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
  },
  {
    id: 'asphalt-surface-angled',
    name: 'Asphalt Surface (Angled)',
    description: 'Dark asphalt road texture with dynamic angled positioning',
    thumbnail: 'https://i.imgur.com/fpQJ1os.png',
    category: 'clothing',
    goodFor: 'Clothing, apparel, streetwear, urban fashion',
    prompt: 'Place this exact clothing item on a realistic asphalt surface background with DYNAMIC ANGLED POSITIONING, similar to urban street photography and streetwear editorials. The clothing should be positioned at a natural diagonal angle (exactly 20 degrees clockwise) to create visual interest and dynamic composition, as if it was casually placed or naturally settled at an angle. The garment should maintain natural shadows around the edges to reflect realistic depth while being positioned diagonally across the frame. The background should be a dark gray asphalt road surface with visible texture variations - NOT a perfect smooth surface but with natural imperfections like small pebbles, minor cracks, subtle wear patterns, and realistic asphalt grain that make it look authentically like a real street surface. Include slight dust particles, minor scuff marks, and natural weathering patterns that make it look like genuine asphalt pavement. The lighting should be natural but directional with subtle variations, casting realistic shadows under the angled clothing to show it\'s resting on the asphalt ground. Add natural fabric behavior with authentic wrinkles, creases, and slight variations in how the fabric sits at the diagonal angle - avoid making it look artificially perfect or too smooth. The clothing should have natural weight distribution and realistic contact points with the asphalt surface while maintaining the angled positioning. Maintain the natural folds, wrinkles, and garment proportions as if it was gently laid down by hand at a natural diagonal angle with natural imperfections. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in natural lighting conditions with authentic street surface inconsistencies. CRITICAL SIZING REQUIREMENTS: Position the clothing item with proper framing and breathing room - the garment should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. DO NOT alter, distort, or change the fundamental shape or silhouette of the garment in any way. CRITICAL PRESERVATION REQUIREMENTS: The clothing color, logo, graphics, text, patterns, fabric texture, and ALL visual elements must be preserved PIXEL-PERFECT and IDENTICAL to the original. DO NOT alter, reinterpret, stylize, or change ANY aspect of the product including small details, characters, symbols, or graphics. Every logo, graphic element, text character, and design detail must remain EXACTLY as provided - same colors, same clarity, same positioning. EXTREME BLUE COLOR ACCURACY: If the clothing contains ANY blue colors, tones, or blue-tinted elements, they MUST be preserved with EXACT color fidelity - do not shift hues, change saturation, or alter the blue tones in any way. Blue graphics, logos, or design elements must remain precisely the same shade and intensity. ANTI-DISTORTION PROTECTION: Do not warp, stretch, compress, or geometrically distort ANY part of the clothing - maintain perfect proportional accuracy and shape integrity throughout the entire garment. ULTRA-CRITICAL TEXT PRESERVATION: Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, brand names, and any text on tags or labels. These MUST be rendered with MAXIMUM clarity and sharpness - never blur, pixelate, or reduce the quality of ANY text elements no matter how small. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. This includes tiny size numbers, care instruction text, brand text on neck tags, and any microscopic text anywhere on the garment. Never allow neck tag text to become blurry, pixelated, or illegible. ULTRA-CRITICAL NO FAKE CONTENT RULE: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE. This includes: NO fake neck tags, NO fake brand names, NO fake size labels, NO fake care instructions, NO fake logos, NO fake text of any kind. SPECIFICALLY PROHIBITED: Never add "PROJECT CAPRI" or any other test brand names, never create fictional text on clothing. If the original clothing item is a plain garment with no visible tags, text, or graphics, then keep it completely plain. DO NOT add any fictional content whatsoever. SMALL TEXT PRESERVATION: Pay special attention to preserving any small text or brand names that actually exist in the original - these must remain crystal clear, perfectly readable, and NEVER distorted, blurred, or altered. Maintain exact font style, letter spacing, and text clarity. CRITICAL TAG/LABEL RULE: ONLY preserve tags, labels, and text that are ACTUALLY VISIBLE in the original image - DO NOT create, add, or invent any tags, labels, or text that are not present in the source image. If there are visible clothing tags, brand labels, size tags, care labels, or any text/branding on the garment, preserve them EXACTLY as shown with crystal-clear readability. If there are NO visible tags or labels in the original, DO NOT add any. Never fabricate or imagine tags that aren\'t there. Only copy what actually exists in the source image. LAYOUT: Position the product at a natural diagonal angle (exactly 20 degrees clockwise) in portrait format with generous and EQUAL spacing above and below for text overlays - ensure top and bottom margins are perfectly balanced with approximately 15-20% of image height on each side. Maintain comfortable side margins with the product filling only 60-70% of frame width for proper visual breathing room and professional framing.'
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
    prompt: 'Photograph this exact product on a glossy black pedestal under a focused white spotlight in a dark, high-end studio with dramatic shadows and moody background. GLOSSY BLACK PEDESTAL: Use a sleek, glossy black pedestal or platform with a mirror-like finish that creates reflections. The pedestal should be geometric and modern, perfectly smooth with no imperfections. FOCUSED WHITE SPOTLIGHT: Create a bright, focused white spotlight that illuminates the product from above, creating a dramatic circle of light. The spotlight should be intense and directional, highlighting the product while leaving the surroundings in darkness. DARK HIGH-END STUDIO: The background should be deep black or very dark charcoal, creating a premium, luxury studio atmosphere. The darkness should feel intentional and sophisticated, not empty or void. DRAMATIC SHADOWS: The spotlight should cast strong, well-defined shadows that add depth and drama. Shadows should be crisp near the product and gradually soften as they extend outward. MOODY BACKGROUND: The dark background should have subtle variations and gradients that add visual interest without being distracting. Think high-end product photography for luxury brands. REFLECTIVE SURFACE: The glossy black pedestal should create realistic reflections of the product, adding visual impact and premium feel. PRODUCT POSITIONING: Position the product centrally on the pedestal with perfect stability. The product should be the clear focal point, dramatically lit against the dark surroundings. HIGH-END AESTHETIC: The overall mood should evoke luxury, sophistication, and premium quality - suitable for high-end product marketing. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy.'
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
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'products',
    goodFor: 'Food products, beverages, café items, artisan goods, lifestyle products',
    prompt: 'Photograph this exact product placed on a rustic wooden café table with out-of-focus pastries and natural window lighting for a cozy, café atmosphere. RUSTIC WOODEN TABLE: Use authentic weathered wood with natural grain patterns, subtle imperfections, and warm tones that suggest a well-loved café environment. OUT-OF-FOCUS PASTRIES: Include subtle, blurred pastries or café items in the background to suggest the café setting without competing with the main product. These should be artfully out of focus. NATURAL WINDOW LIGHTING: Use soft, warm natural light streaming through a nearby window. The lighting should feel authentic to a café environment - gentle, inviting, and naturally directional. COZY CAFÉ ATMOSPHERE: Create the warm, inviting atmosphere of a neighborhood café or bistro. The environment should feel comfortable, lived-in, and welcoming. LIFESTYLE CONTEXT: The setting should suggest daily rituals, comfort, and social connection - making the product feel like part of a pleasant café experience. ARTISANAL QUALITY: The overall presentation should suggest craftsmanship, quality, and attention to detail - perfect for artisan products or premium café items. WARM AMBIANCE: Use warm color tones throughout - golden wood, soft lighting, and cozy atmosphere that makes viewers want to linger. AUTHENTIC DETAILS: Include realistic café details like natural wood wear, authentic lighting, and genuine café atmosphere without overdoing prop elements. INVITING MOOD: The overall mood should be welcoming, comfortable, and suggest the pleasure of a café visit or coffee break. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the cozy café presentation.'
  },
  {
    id: 'seamless-white-cube',
    name: 'Seamless White Cube',
    description: 'Product centered in seamless white cube with soft edge shadows and high-key lighting',
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'products',
    goodFor: 'Electronics, cosmetics, luxury items, premium products, e-commerce',
    prompt: 'Photograph this exact product centered inside a seamless white cube environment with soft edge shadows and perfectly balanced high-key lighting for professional e-commerce display. SEAMLESS WHITE CUBE: Create a perfect white cube environment with no visible corners, edges, or seams. The background should appear infinite and pristinely white from all directions. CENTERED POSITIONING: Position the product perfectly centered within the white cube space with equal spacing on all sides for optimal e-commerce presentation. SOFT EDGE SHADOWS: Create subtle, soft shadows around the product edges that define its shape without being harsh or distracting. Shadows should be minimal but present for depth. HIGH-KEY LIGHTING: Use bright, even lighting that eliminates harsh shadows while maintaining enough contrast to show product details and textures clearly. BALANCED ILLUMINATION: Ensure perfectly even lighting from multiple directions that eliminates hot spots and creates consistent illumination across the entire product. PROFESSIONAL E-COMMERCE: The setup should meet the highest standards for e-commerce product photography - clean, bright, and distraction-free. PRISTINE PRESENTATION: Everything should appear flawless and professional, suitable for premium product catalogs or high-end online retail. OPTIMAL CLARITY: The lighting and setup should reveal every product detail with perfect clarity while maintaining the clean, minimal aesthetic. COMMERCIAL QUALITY: The final image should meet commercial photography standards for luxury brands and premium e-commerce platforms. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the seamless white cube presentation.'
  },
  {
    id: 'unboxing-desk-setup',
    name: 'Unboxing Desk Setup',
    description: 'Product partially in branded packaging on modern desk with accessories and unboxing feel',
    thumbnail: 'https://i.imgur.com/placeholder.png',
    category: 'products',
    goodFor: 'Electronics, tech gadgets, luxury items, subscription boxes, premium products',
    prompt: 'Photograph this exact product partially emerging from its branded packaging on a modern desk, surrounded by carefully arranged accessories with soft directional lighting for an authentic unboxing experience. MODERN DESK SURFACE: Use a clean, contemporary desk with smooth finish and modern aesthetic. The surface should be uncluttered and professional looking. BRANDED PACKAGING: Show the product partially inside or emerging from its original branded packaging. The packaging should look authentic and high-quality, suggesting premium unboxing experience. UNBOXING MOMENT: Capture the excitement and anticipation of the unboxing moment - the product should appear as if just being revealed from its packaging. CAREFULLY ARRANGED ACCESSORIES: Include relevant accessories or complementary items tastefully arranged around the main product. These should enhance rather than compete with the focal point. SOFT DIRECTIONAL LIGHTING: Use gentle, directional lighting that creates depth and dimension while maintaining the clean, modern aesthetic of an unboxing video or photo. PREMIUM EXPERIENCE: The overall presentation should suggest luxury, quality, and the special moment of receiving and opening a premium product. TECH AESTHETIC: The environment should feel contemporary and tech-savvy, appealing to modern consumers who value both product and experience. AUTHENTIC MOMENT: The scene should feel like a genuine unboxing moment, not overly staged, capturing the natural excitement of receiving something new. LIFESTYLE CONTEXT: Suggest the modern lifestyle of someone who appreciates quality products and the ritual of unboxing premium items. CRITICAL: Preserve ALL original product details including colors, textures, materials, logos, text, and structural elements with perfect accuracy while creating the authentic unboxing desk presentation.'
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
  const [loadedImages, setLoadedImages] = useState<Record<string, { original: string, generated: string }>>({})
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  const [showStyleModal, setShowStyleModal] = useState(false)
  const [modalStyle, setModalStyle] = useState<StyleOption>(STYLE_OPTIONS[0])
  const [creativeName, setCreativeName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showRetryModal, setShowRetryModal] = useState(false)
  
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
const STORAGE_LIMIT = 50 // Maximum saved creatives per brand
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
      setLoadedImages({}) // Clear loaded images cache
      setLoadingImages(new Set()) // Clear loading images
      
      try {
        console.log('📚 Loading creatives for brand:', selectedBrandId)
        const response = await fetch(`/api/creative-generations?brandId=${selectedBrandId}&userId=${user.id}&limit=25`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch creatives')
        }

        const data = await response.json()
        setGeneratedCreatives(data.creatives || [])
        console.log('✅ Loaded', data.creatives?.length || 0, 'creatives out of', data.pagination?.total || 0, 'total')
        
        // If there are more creatives than what we loaded, show a message
        if (data.pagination?.hasMore) {
          console.log('📄 More creatives available:', data.pagination.total - data.creatives.length, 'additional creatives')
        }
        
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
    textAddition += 'ULTRA-CRITICAL FINAL INSTRUCTION: The original product must be preserved with 100% EXACT fidelity - every single character, logo, graphic, text, color, and detail must be IDENTICAL to the input image. Use the highest possible preservation quality equivalent to ChatGPT-level fidelity. DO NOT modify, stylize, or alter the product in ANY way. ULTRA-CRITICAL SHAPE PRESERVATION: Do your absolute best to preserve the EXACT shape of the clothing item - if it\'s a shirt, maintain the EXACT sleeve length and precise sleeve shape including ANY layered sleeve combinations (like short sleeves over long sleeves), complex sleeve constructions, sleeve cuffs, sleeve proportions, collar shape, and overall silhouette. CRITICAL: Copy the exact sleeve length - if sleeves end at the wrist, keep them at the wrist; if they\'re 3/4 length, keep them 3/4 length; if they\'re short sleeves, keep them short. If it\'s pants, preserve the exact leg shape, waistband, and proportions. If it\'s any garment, maintain the EXACT original shape including PRECISE SLEEVE LENGTH AND SHAPE (copy exact sleeve proportions, cuff positions, and any layered sleeve designs), hems, collars, pockets, and all structural elements. EXTREME COLOR PRESERVATION: Pay special attention to preserving EXACT color accuracy, especially blue tones, gradients, and color transitions - do not shift, desaturate, or distort any colors whatsoever. CRITICAL DISTORTION PREVENTION: Do not warp, stretch, compress, or distort any part of the clothing - maintain perfect proportions and shape integrity. ENHANCED TAG/LABEL PRESERVATION: If there are ANY visible tags, neck labels, brand names, logos, or text elements on the garment, they MUST be preserved with CRYSTAL-CLEAR accuracy - maintain exact fonts, letter spacing, clarity, and positioning. Pay EXTREME attention to preserving ALL text including the smallest text, size tags, care labels, neck prints, and any microscopic text anywhere on the garment. NECK TAG TEXT CRITICAL: Pay special attention to neck tag text which is often small and gets distorted - ensure neck tag brand names, logos, and text are preserved with CRYSTAL-CLEAR readability and ZERO distortion. Never allow neck tag text to become blurry, pixelated, or illegible. Do not blur, distort, or alter any existing text elements no matter how small. ABSOLUTE PROHIBITION: DO NOT CREATE, ADD, INVENT, OR IMAGINE ANY CONTENT THAT IS NOT ACTUALLY VISIBLE IN THE ORIGINAL IMAGE - this includes NO fake neck tags, NO fake brand names, NO fake labels, NO fake text of any kind. SPECIFICALLY BANNED: Never add "PROJECT CAPRI" or any other test brand names to clothing. If the original is plain with no tags or text, keep it completely plain. MAXIMUM FIDELITY MODE: Treat this as if you are making a museum-quality reproduction where every pixel matters.'
    
    return textAddition
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
      console.log('🚫 Skipping image load for non-UUID creative ID:', creativeId)
      return
    }

    setLoadingImages(prev => new Set(prev).add(creativeId))

    try {
      console.log('🖼️ Loading images for creative:', creativeId)
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
      
      console.log('✅ Images loaded for creative:', creativeId)
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

    // Check storage limits
    if (generatedCreatives.length >= STORAGE_LIMIT) {
      toast.error(`You've reached your storage limit of ${STORAGE_LIMIT} saved creatives. Please delete some before creating new ones.`)
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
            <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-6 min-w-[240px] h-[160px] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm font-medium">WEEKLY USAGE</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    {getDaysUntilReset()}d left
                </span>
                  {usageData.current > 0 && (
                    <button
                      onClick={resetUsage}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded border border-red-500/20 hover:border-red-400/40"
                      title="R&D: Reset usage count"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Circular Progress */}
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
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
                    <span className="text-sm font-bold text-white">
                      {Math.round(usagePercentage)}%
                    </span>
                  </div>
                </div>
                
                {/* Usage Stats */}
                <div>
                  <div className="text-white font-semibold text-base">
                    {usageData.current} / {WEEKLY_LIMIT}
                  </div>
                  <div className="text-gray-400 text-sm">
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
            <div className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-6 min-w-[240px] h-[160px] flex flex-col justify-between hover:border-white/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm font-medium">SYSTEM STATUS</span>
                <FlaskConical className="w-6 h-6 text-orange-400" />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg flex items-center justify-center">
                  <FlaskConical className="w-8 h-8 text-orange-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-base">
                    Beta Version
                  </div>
                  <div className="text-gray-400 text-xs leading-tight">
                    May struggle with fine text, poor quality images, tags & complex details
                  </div>
                </div>
              </div>
            </div>
            
            {/* Product Image Display - Third widget with larger space */}
            <div 
              className="bg-gradient-to-br from-white/[0.02] to-white/[0.05] border border-white/10 rounded-xl p-6 min-w-[240px] h-[160px] flex flex-col justify-between cursor-pointer hover:border-white/20 transition-all duration-300"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm font-medium">PRODUCT IMAGE</span>
                <span className="text-sm text-gray-400 whitespace-nowrap">
                  {uploadedImageUrl ? 'Change' : 'Upload'}
                </span>
              </div>
              
              <div className="flex items-center justify-center flex-1">
                {uploadedImageUrl ? (
                  <>
                    {/* Large Product Preview - Full height */}
                    <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-white/10 max-w-[180px] max-h-[110px] flex items-center justify-center">
                    <img 
                      src={uploadedImageUrl} 
                      alt="Uploaded product" 
                        className="max-w-full max-h-full object-contain"
                    />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Upload Icon */}
                    <div className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
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
            <div className="flex items-center justify-between">
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
              
              {/* Storage Limit Tracker - Always visible */}
              <div className="bg-gradient-to-r from-[#222] to-[#1e1e1e] border border-[#333] rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-400">Storage:</div>
                  <div className={`text-sm font-medium ${
                    generatedCreatives.length >= STORAGE_LIMIT 
                      ? 'text-red-400' 
                      : generatedCreatives.length >= STORAGE_LIMIT * 0.8 
                        ? 'text-yellow-400' 
                        : 'text-green-400'
                  }`}>
                    {generatedCreatives.length}/{STORAGE_LIMIT}
                  </div>
                  {generatedCreatives.length >= STORAGE_LIMIT && (
                    <div className="text-xs text-red-400 ml-1">🚫 Limit Reached</div>
                  )}
                </div>
              </div>
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
                                     <div className="space-y-8">
                     {/* Clothing & Apparel Section */}
                     {(selectedCategory === 'all' || selectedCategory === 'clothing') && (
                       <div>
                         <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                           <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                           </svg>
                           Clothing & Apparel Templates
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                           {TEMPLATE_BASE_GROUPS.filter(baseId => {
                             const variant = getCurrentVariant(baseId)
                             return variant.category === 'clothing'
                           }).map((baseId) => {
                             const currentVariant = getCurrentVariant(baseId)
                             const variants = getTemplateVariants(baseId)
                         
                         return (
                           <div
                            key={baseId}
                            className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden transition-all duration-300 group hover:border-[#555] hover:shadow-2xl cursor-pointer h-fit relative"
                          >
                            {/* Carousel Navigation Arrows */}
                            {variants.length > 1 && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    prevVariant(baseId)
                                  }}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                  title="Previous variant"
                                >
                                  <ChevronLeft className="w-4 h-4 text-white" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    nextVariant(baseId)
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                  title="Next variant"
                                >
                                  <ChevronRight className="w-4 h-4 text-white" />
                                </button>
                              </>
                            )}
                            
                            {/* Template Content */}
                            <div 
                              onClick={() => openStyleModal(currentVariant)}
                              className="w-full h-full"
                            >
                              <div className="aspect-[3/4] bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center overflow-hidden">
                                <img
                                  src={currentVariant.thumbnail}
                                  alt={currentVariant.name}
                                  className="w-full h-full object-cover transition-all duration-300 opacity-80 group-hover:opacity-100 group-hover:scale-105"
                                />
                              </div>
                              <div className="p-6 flex-shrink-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="font-semibold text-white text-lg group-hover:text-gray-300 transition-colors">
                                    {currentVariant.name}
                                  </h4>
                                  {variants.length > 1 && (
                                    <div className="flex gap-1">
                                      {variants.map((_, index) => (
                                        <div
                                          key={index}
                                          className={`w-2 h-2 rounded-full transition-all ${
                                            index === (templateCarouselStates[baseId] || 0)
                                              ? 'bg-white'
                                              : 'bg-gray-600'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <p className="text-gray-500 text-xs mb-2">
                                  • {currentVariant.goodFor}
                                </p>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                  {currentVariant.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                         </div>
                       </div>
                     )}
 
                     {/* Physical Products Section */}
                     {(selectedCategory === 'all' || selectedCategory === 'products') && (
                       <div>
                         <h3 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
                           <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                           </svg>
                           Physical Products Templates
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                           {TEMPLATE_BASE_GROUPS.filter(baseId => {
                             const variant = getCurrentVariant(baseId)
                             return variant.category === 'products'
                           }).map((baseId) => {
                             const currentVariant = getCurrentVariant(baseId)
                             const variants = getTemplateVariants(baseId)
                         
                         return (
                           <div
                             key={baseId}
                             className="bg-gradient-to-br from-[#222] via-[#252525] to-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden transition-all duration-300 group hover:border-[#555] hover:shadow-2xl cursor-pointer h-fit relative"
                           >
                             {/* Carousel Navigation Arrows */}
                             {variants.length > 1 && (
                               <>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     prevVariant(baseId)
                                   }}
                                   className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                   title="Previous variant"
                                 >
                                   <ChevronLeft className="w-4 h-4 text-white" />
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     nextVariant(baseId)
                                   }}
                                   className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                   title="Next variant"
                                 >
                                   <ChevronRight className="w-4 h-4 text-white" />
                                 </button>
                               </>
                             )}
                             
                             {/* Template Content */}
                             <div 
                               onClick={() => openStyleModal(currentVariant)}
                               className="w-full h-full"
                             >
                               <div className="aspect-[3/4] bg-gradient-to-br from-[#333] to-[#222] flex items-center justify-center overflow-hidden">
                                 <img
                                   src={currentVariant.thumbnail}
                                   alt={currentVariant.name}
                                   className="w-full h-full object-cover transition-all duration-300 opacity-80 group-hover:opacity-100 group-hover:scale-105"
                                 />
                               </div>
                               <div className="p-6 flex-shrink-0">
                                 <div className="flex items-center justify-between mb-1">
                                   <h3 className="text-white font-semibold text-base group-hover:text-orange-400 transition-colors">
                                     {currentVariant.name}
                                   </h3>
                                   {variants.length > 1 && (
                                     <span className="text-xs text-orange-400 font-medium bg-orange-400/10 px-2 py-1 rounded-full">
                                       {variants.findIndex(v => v.id === currentVariant.id) + 1} of {variants.length}
                                     </span>
                                   )}
                                 </div>
                                 <p className="text-gray-500 text-xs mb-2">
                                   Best for: {currentVariant.goodFor}
                                 </p>
                                 <p className="text-gray-400 text-sm leading-relaxed">
                                   {currentVariant.description}
                                 </p>
                               </div>
                             </div>
                           </div>
                         )
                       })}
                         </div>
                       </div>
                     )}
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
                            loadedImages[creative.id] ? (
                              <img
                                src={loadedImages[creative.id].generated}
                                alt="Generated creative"
                                className="w-full h-auto object-contain max-h-none"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                <span className="ml-2 text-gray-400">Loading image...</span>
                              </div>
                            )
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
                                    onClick={() => {
                                      const imageUrl = loadedImages[creative.id]?.generated
                                      if (imageUrl) {
                                        openCropModal(creative.id, imageUrl)
                                      } else {
                                        toast.error('Image not loaded yet')
                                      }
                                    }}
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
                                    const imageUrl = loadedImages[creative.id]?.generated
                                    if (imageUrl) {
                                      const link = document.createElement('a')
                                      link.href = imageUrl
                                      const fileName = creative.custom_name 
                                        ? `${creative.custom_name.replace(/[^a-zA-Z0-9]/g, '_')}.png`
                                        : `creative-${creative.id}.png`
                                      link.download = fileName
                                      link.click()
                                    } else {
                                      toast.error('Image not loaded yet')
                                    }
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
                    <div className="flex items-center justify-between">
                      <p className="text-white text-base font-medium flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Your Product
                      </p>
                      <button
                        onClick={() => document.getElementById('modal-image-upload')?.click()}
                        className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-[#333] hover:border-[#555]"
                      >
                        Change
                      </button>
                    </div>
                    <div className="aspect-[4/5] bg-gradient-to-br from-[#333] to-[#222] rounded-lg overflow-hidden border border-[#333] flex items-center justify-center">
                      {uploadedImageUrl ? (
                        <img src={uploadedImageUrl} alt="Product" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <ImageIcon className="w-10 h-10 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <input
                      id="modal-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
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
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {TEMPLATE_BASE_GROUPS.map((baseId) => {
                        const variants = getTemplateVariants(baseId)
                        return (
                          <div key={baseId} className="flex gap-2 flex-shrink-0">
                            {variants.map((style) => (
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
                                <p className="text-xs text-gray-300 text-center truncate">
                                  {style.name.includes('Angled') ? 'Angled' : 'Normal'}
                                </p>
                              </button>
                            ))}
                            {variants.length > 1 && baseId !== TEMPLATE_BASE_GROUPS[TEMPLATE_BASE_GROUPS.length - 1] && (
                              <div className="w-px bg-[#444] mx-1 self-stretch"></div>
                            )}
                          </div>
                        )
                      })}
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
                  <div className="flex gap-3 mt-5 justify-center">
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
                      disabled={!uploadedImage || isGenerating || usageData.current >= WEEKLY_LIMIT || generatedCreatives.length >= STORAGE_LIMIT}
                    className={`flex-1 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 ${
                      usageData.current >= WEEKLY_LIMIT || generatedCreatives.length >= STORAGE_LIMIT
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white cursor-not-allowed' 
                        : 'bg-gradient-to-r from-white to-gray-200 hover:from-gray-200 hover:to-gray-300 text-black'
                    } border-0`}
                      onClick={generateImageFromModal}
                    >
                      {generatedCreatives.length >= STORAGE_LIMIT ? (
                        <>
                          🗄️ Storage Full - Delete Some First
                        </>
                      ) : usageData.current >= WEEKLY_LIMIT ? (
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
                            {issue.id === 'wrong-tilt-direction' && 'Product tilted the wrong direction (should lean right)'}
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
            className="bg-gradient-to-br from-[#1a1a1a] via-[#1f1f1f] to-[#161616] rounded-2xl border border-[#333] max-w-6xl w-full shadow-2xl"
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
                className="crop-container relative mx-auto bg-black rounded-lg"
                style={{ width: '810px', height: '675px' }}
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
                
                {/* Black overlay for cropped-out areas */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top cropped area */}
                  <div 
                    className="absolute bg-black/70"
                    style={{
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${cropArea.y}%`
                    }}
                  />
                  {/* Bottom cropped area */}
                  <div 
                    className="absolute bg-black/70"
                    style={{
                      top: `${cropArea.y + cropArea.height}%`,
                      left: 0,
                      width: '100%',
                      height: `${100 - cropArea.y - cropArea.height}%`
                    }}
                  />
                  {/* Left cropped area */}
                  <div 
                    className="absolute bg-black/70"
                    style={{
                      top: `${cropArea.y}%`,
                      left: 0,
                      width: `${cropArea.x}%`,
                      height: `${cropArea.height}%`
                    }}
                  />
                  {/* Right cropped area */}
                  <div 
                    className="absolute bg-black/70"
                    style={{
                      top: `${cropArea.y}%`,
                      left: `${cropArea.x + cropArea.width}%`,
                      width: `${100 - cropArea.x - cropArea.width}%`,
                      height: `${cropArea.height}%`
                    }}
                  />
                </div>

                {/* Crop Selection Area */}
                <div 
                  className="absolute border border-white/80 pointer-events-auto group transition-all duration-200 hover:border-white"
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

                  {/* Sleek edge handles - All 4 sides */}
                  {/* Top edge handle */}
                  <div 
                    className="absolute bg-white/90 hover:bg-white cursor-ns-resize transition-all duration-200 z-20"
                    style={{
                      top: '-6px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '40px',
                      height: '4px',
                      borderRadius: '2px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'top')}
                  />
                  
                  {/* Bottom edge handle */}
                  <div 
                    className="absolute bg-white/90 hover:bg-white cursor-ns-resize transition-all duration-200 z-20"
                    style={{
                      bottom: '-6px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '40px',
                      height: '4px',
                      borderRadius: '2px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'bottom')}
                  />
                  
                  {/* Left edge handle */}
                  <div 
                    className="absolute bg-white/90 hover:bg-white cursor-ew-resize transition-all duration-200 z-20"
                    style={{
                      left: '-6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '40px',
                      borderRadius: '2px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                    onMouseDown={(e) => handleMouseDown(e, 'left')}
                  />
                  
                  {/* Right edge handle */}
                  <div 
                    className="absolute bg-white/90 hover:bg-white cursor-ew-resize transition-all duration-200 z-20"
                    style={{
                      right: '-6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '4px',
                      height: '40px',
                      borderRadius: '2px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
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

	