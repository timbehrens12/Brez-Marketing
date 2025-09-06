import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/server';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Weekly usage limits for creative generation
const WEEKLY_CREATIVE_LIMIT = 25; // 25 creative generations per week
const USAGE_FEATURE_TYPE = 'creative_generation';

const BACKGROUND_PRESETS = {
  concrete: {
    name: "Concrete Floor",
    prompt: "OPTIMAL PRODUCT SHOWCASE: Position the product to show it at its most flattering and clear angle - use professional product photography principles to determine the best viewing angle. For flat items (clothing, papers), use direct overhead view. For jewelry, accessories, or 3D objects, use a slightly elevated angle that shows the product clearly without distortion. NEVER use tilted, skewed, or awkward angles that make the product look unprofessional. Place this product on a realistic concrete surface background, similar to the lighting and texture in high-end fashion editorials. The product should rest naturally with subtle shadows around the edges to reflect realistic depth. The background should be a medium-toned concrete floor with visible cracks, subtle stains, and natural imperfections - NOT a perfect pristine surface. Include slight dust particles, minor scuff marks, and natural wear patterns that make it look authentically used. The lighting should be soft but directional with subtle variations, casting realistic shadows under the product to show it's resting on the ground. The product should have natural weight distribution and realistic contact points with the surface. Position naturally as if it was carefully placed by hand with natural imperfections. Avoid any artificial floating effect or overly perfect positioning — it must look like a real photograph taken in studio lighting conditions. CRITICAL PERSPECTIVE: Use the most flattering angle for the specific product type - overhead for flat items, slight elevation for 3D objects like jewelry. The product must be clearly visible, well-lit, and professionally presented. NO tilted, skewed, or distorted views. CRITICAL SIZING REQUIREMENTS: Position the product with proper framing and breathing room - the item should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room."
  },
  marble: {
    name: "Marble Surface",
    prompt: "OPTIMAL PRODUCT SHOWCASE: Position the product to show it at its most flattering and clear angle - use professional product photography principles to determine the best viewing angle. For flat items (clothing, papers), use direct overhead view. For jewelry, accessories, or 3D objects, use a slightly elevated angle that shows the product clearly without distortion. NEVER use tilted, skewed, or awkward angles that make the product look unprofessional. Place this product on a pristine white marble surface with subtle gray veining. The marble should have a polished finish that reflects soft ambient lighting. Cast natural shadows beneath the product to show realistic contact with the surface. Use professional studio lighting with soft diffusion to eliminate harsh shadows while maintaining depth. The background should have a subtle gradient from white to light gray. CRITICAL PERSPECTIVE: Use the most flattering angle for the specific product type - overhead for flat items, slight elevation for 3D objects like jewelry. The product must be clearly visible, well-lit, and professionally presented. NO tilted, skewed, or distorted views. CRITICAL SIZING REQUIREMENTS: Position the product with proper framing and breathing room - the item should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. Maintain all product details, colors, and textures exactly as shown in the original image."
  },
  wood: {
    name: "Wooden Surface",
    prompt: "OPTIMAL PRODUCT SHOWCASE: Position the product to show it at its most flattering and clear angle - use professional product photography principles to determine the best viewing angle. For flat items (clothing, papers), use direct overhead view. For jewelry, accessories, or 3D objects, use a slightly elevated angle that shows the product clearly without distortion. NEVER use tilted, skewed, or awkward angles that make the product look unprofessional. Place this product on a natural wood surface with visible grain patterns. The wood should be a warm medium brown tone with natural texture and character. Create soft, realistic shadows that follow the product's contours. Use warm, directional lighting that enhances both the wood grain and product details. The background should fade to a soft vignette. CRITICAL PERSPECTIVE: Use the most flattering angle for the specific product type - overhead for flat items, slight elevation for 3D objects like jewelry. The product must be clearly visible, well-lit, and professionally presented. NO tilted, skewed, or distorted views. CRITICAL SIZING REQUIREMENTS: Position the product with proper framing and breathing room - the item should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. Preserve all original product colors, logos, and fabric textures without alteration."
  },
  minimalist: {
    name: "Minimalist White",
    prompt: "OPTIMAL PRODUCT SHOWCASE: Position the product to show it at its most flattering and clear angle - use professional product photography principles to determine the best viewing angle. For flat items (clothing, papers), use direct overhead view. For jewelry, accessories, or 3D objects, use a slightly elevated angle that shows the product clearly without distortion. NEVER use tilted, skewed, or awkward angles that make the product look unprofessional. Place this product on a pure white seamless background with professional studio lighting. Create subtle drop shadows beneath the product for depth while maintaining a clean, minimal aesthetic. Use soft, even lighting that eliminates harsh shadows but preserves product dimension. The lighting should be bright and clean, similar to high-end product photography. CRITICAL PERSPECTIVE: Use the most flattering angle for the specific product type - overhead for flat items, slight elevation for 3D objects like jewelry. The product must be clearly visible, well-lit, and professionally presented. NO tilted, skewed, or distorted views. CRITICAL SIZING REQUIREMENTS: Position the product with proper framing and breathing room - the item should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. Maintain all product details, colors, and textures exactly as in the original image."
  },
  fabric: {
    name: "Linen Fabric",
    prompt: "OPTIMAL PRODUCT SHOWCASE: Position the product to show it at its most flattering and clear angle - use professional product photography principles to determine the best viewing angle. For flat items (clothing, papers), use direct overhead view. For jewelry, accessories, or 3D objects, use a slightly elevated angle that shows the product clearly without distortion. NEVER use tilted, skewed, or awkward angles that make the product look unprofessional. Place this product on a natural linen fabric background with subtle texture and weave patterns. The fabric should be a neutral beige or off-white color with soft wrinkles and natural draping. Create realistic shadows and depth to show the product resting naturally on the fabric surface. Use warm, soft lighting that enhances both the fabric texture and product details. CRITICAL PERSPECTIVE: Use the most flattering angle for the specific product type - overhead for flat items, slight elevation for 3D objects like jewelry. The product must be clearly visible, well-lit, and professionally presented. NO tilted, skewed, or distorted views. CRITICAL SIZING REQUIREMENTS: Position the product with proper framing and breathing room - the item should fill approximately 60-70% of the frame width, leaving comfortable space on the sides. Ensure generous spacing at top and bottom (approximately 15-20% of image height on each side) for text overlays and visual balance. The product should be prominently displayed but not overly zoomed in, maintaining an aesthetic distance similar to professional product photography with proper margins and visual breathing room. Maintain all original product characteristics without modification."
  }
};

const QUALITY_SETTINGS = {
  standard: "standard" as const,
  hd: "hd" as const
};

const ASPECT_RATIOS = {
  square: "1024x1024",
  landscape: "1536x1024", 
  portrait: "1024x1536"
};

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check weekly usage limits
    const supabase = createClient();
    const now = new Date();
    
    // Calculate start of current week (Monday at 12:00 AM)
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(now.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfWeek.getDate() + 7);
    
    // Check user's weekly usage
    const { data: usageData, error: usageError } = await supabase
      .from('ai_feature_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_type', USAGE_FEATURE_TYPE)
      .gte('created_at', startOfWeek.toISOString())
      .lt('created_at', startOfNextWeek.toISOString());

    if (usageError) {
      console.error('Error checking creative usage:', usageError);
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 });
    }

    const currentWeeklyUsage = usageData?.length || 0;
    
    // Check if user has exceeded weekly limit
    if (currentWeeklyUsage >= WEEKLY_CREATIVE_LIMIT) {
      return NextResponse.json({ 
        error: `Weekly creative generation limit reached. You've used ${currentWeeklyUsage} of ${WEEKLY_CREATIVE_LIMIT} generations this week. Resets Monday at 12:00 AM.`,
        usage: {
          used: currentWeeklyUsage,
          limit: WEEKLY_CREATIVE_LIMIT,
          resetsAt: startOfNextWeek.toISOString(),
          resetsIn: startOfNextWeek.getTime() - now.getTime()
        }
      }, { status: 429 });
    }

    // Parse FormData
    const formData = await request.formData();
    
    const imageFile = formData.get('image') as File;
    const backgroundType = formData.get('backgroundType') as string;
    const aspectRatio = formData.get('aspectRatio') as string || 'portrait';
    const quality = formData.get('quality') as string || 'standard'; // Default to standard quality to reduce costs
    const lighting = formData.get('lighting') as string || 'soft';
    const customPromptModifiers = formData.get('customPromptModifiers') as string || '';
    
    console.log(`📏 Received aspectRatio: ${aspectRatio}`);
    console.log(`🖼️ Using quality: ${quality}`);
    
    // Copy creative support
    const exampleCreativeFile = formData.get('exampleCreative') as File | null;
    
    // Multi-product support
    const customPrompt = formData.get('prompt') as string;
    const multiProductCount = formData.get('multiProductCount') as string;
    const additionalImages = formData.get('additionalImages') as string;
    const isProductCollage = formData.get('isProductCollage') as string;

    if (!imageFile || !backgroundType) {
      return NextResponse.json(
        { error: 'Missing required fields: image file and backgroundType' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image file.' },
        { status: 400 }
      );
    }

    // Validate example creative file type if provided
    if (exampleCreativeFile && !exampleCreativeFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid example creative file type. Please upload an image file.' },
        { status: 400 }
      );
    }

    // Get the base prompt for the selected background
    const backgroundPreset = BACKGROUND_PRESETS[backgroundType as keyof typeof BACKGROUND_PRESETS];
    if (!backgroundPreset) {
      return NextResponse.json(
        { error: 'Invalid background type' },
        { status: 400 }
      );
    }

    console.log('🎨 Generating creative with Gemini Flash 2.5...');
    console.log('📦 Image file:', imageFile.name, imageFile.size, 'bytes');

    // Helper function to convert unsupported formats to JPEG
    const convertToSupportedFormat = async (file: File): Promise<{ buffer: Buffer, mimeType: string }> => {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // Check if format is supported by Gemini (JPEG, PNG, WebP, HEIC, HEIF)
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
      
      if (supportedTypes.includes(file.type)) {
        return { buffer, mimeType: file.type };
      }
      
      console.log(`🔄 Converting ${file.type} to JPEG for Gemini compatibility...`);
      
      // Convert unsupported formats (like AVIF) to JPEG using Sharp
      const convertedBuffer = await sharp(buffer)
        .jpeg({ quality: 95 })
        .toBuffer();
        
      return { buffer: convertedBuffer, mimeType: 'image/jpeg' };
    };

    // Helper function to standardize product images for consistent AI generation
    const standardizeProductImage = async (buffer: Buffer): Promise<Buffer> => {
      console.log('🔧 Standardizing product image for optimal AI generation...');
      
      // Target dimensions: 512x768 (2:3 ratio, perfect for portrait ads)
      const TARGET_WIDTH = 512;
      const TARGET_HEIGHT = 768;
      
      // Get original image metadata
      const metadata = await sharp(buffer).metadata();
      const originalWidth = metadata.width || 1;
      const originalHeight = metadata.height || 1;
      const originalRatio = originalWidth / originalHeight;
      const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
      
      console.log(`📏 Original: ${originalWidth}x${originalHeight} (ratio: ${originalRatio.toFixed(2)})`);
      console.log(`🎯 Target: ${TARGET_WIDTH}x${TARGET_HEIGHT} (ratio: ${targetRatio.toFixed(2)})`);
      
      // Strategy: Smart crop to target ratio, then resize
      // This prevents stretching and maintains product proportions
      
      let processedBuffer: Buffer;
      
      if (Math.abs(originalRatio - targetRatio) < 0.1) {
        // Ratios are close enough, just resize
        console.log('✅ Ratios match, simple resize');
        processedBuffer = await sharp(buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, { 
            fit: 'fill',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .jpeg({ quality: 95 })
          .toBuffer();
      } else if (originalRatio > targetRatio) {
        // Image is wider than target, crop width
        const cropWidth = Math.floor(originalHeight * targetRatio);
        const cropX = Math.floor((originalWidth - cropWidth) / 2);
        
        console.log(`📐 Cropping width: ${cropWidth}px from center`);
        processedBuffer = await sharp(buffer)
          .extract({ 
            left: cropX, 
            top: 0, 
            width: cropWidth, 
            height: originalHeight 
          })
          .resize(TARGET_WIDTH, TARGET_HEIGHT)
          .jpeg({ quality: 95 })
          .toBuffer();
      } else {
        // Image is taller than target, crop height
        const cropHeight = Math.floor(originalWidth / targetRatio);
        const cropY = Math.floor((originalHeight - cropHeight) / 2);
        
        console.log(`📐 Cropping height: ${cropHeight}px from center`);
        processedBuffer = await sharp(buffer)
          .extract({ 
            left: 0, 
            top: cropY, 
            width: originalWidth, 
            height: cropHeight 
          })
          .resize(TARGET_WIDTH, TARGET_HEIGHT)
          .jpeg({ quality: 95 })
          .toBuffer();
      }
      
      console.log(`🎉 Standardized to ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
      return processedBuffer;
    };

    // Helper function to standardize example creatives with padding (preserves full layout)
    const standardizeExampleCreative = async (buffer: Buffer): Promise<Buffer> => {
      console.log('🎨 Standardizing example creative with padding preservation...');
      
      // Target dimensions: 512x768 (2:3 ratio)
      const TARGET_WIDTH = 512;
      const TARGET_HEIGHT = 768;
      
      // Get original image metadata
      const metadata = await sharp(buffer).metadata();
      const originalWidth = metadata.width || 1;
      const originalHeight = metadata.height || 1;
      const originalRatio = originalWidth / originalHeight;
      const targetRatio = TARGET_WIDTH / TARGET_HEIGHT;
      
      console.log(`📏 Example original: ${originalWidth}x${originalHeight} (ratio: ${originalRatio.toFixed(2)})`);
      console.log(`🎯 Example target: ${TARGET_WIDTH}x${TARGET_HEIGHT} (ratio: ${targetRatio.toFixed(2)})`);
      
      // Strategy: Use padding/letterboxing to preserve full creative context
      // This maintains all text and layout elements for better copying
      
      let processedBuffer: Buffer;
      
      if (Math.abs(originalRatio - targetRatio) < 0.1) {
        // Ratios are close enough, just resize
        console.log('✅ Example ratios match, simple resize');
        processedBuffer = await sharp(buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, { 
            fit: 'fill',
            background: { r: 0, g: 0, b: 0, alpha: 1 }
          })
          .jpeg({ quality: 95 })
          .toBuffer();
      } else {
        // Use letterboxing/pillarboxing to preserve full content
        console.log('📦 Adding letterboxing to preserve full example creative');
        processedBuffer = await sharp(buffer)
          .resize(TARGET_WIDTH, TARGET_HEIGHT, { 
            fit: 'contain', // This preserves aspect ratio and adds padding
            background: { r: 0, g: 0, b: 0, alpha: 1 } // Black padding
          })
          .jpeg({ quality: 95 })
          .toBuffer();
      }
      
      console.log(`🎉 Example creative standardized to ${TARGET_WIDTH}x${TARGET_HEIGHT} with full content preserved`);
      return processedBuffer;
    };

    // Step 1: Convert images to supported formats if needed
    const { buffer: rawImageBuffer, mimeType: imageMimeType } = await convertToSupportedFormat(imageFile);
    
    // Step 2: Standardize image dimensions for consistent AI generation
    const imageBuffer = await standardizeProductImage(rawImageBuffer);
    const base64Image = imageBuffer.toString('base64');
    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Convert example creative if provided
    let exampleBuffer: Buffer | null = null;
    let exampleMimeType: string | null = null;
    let exampleBase64: string | null = null;
    
    if (exampleCreativeFile) {
      const convertedExample = await convertToSupportedFormat(exampleCreativeFile);
      // Use special padding-based standardization for example creatives to preserve layout
      exampleBuffer = await standardizeExampleCreative(convertedExample.buffer);
      exampleMimeType = 'image/jpeg'; // Always JPEG after standardization
      exampleBase64 = exampleBuffer.toString('base64');
      console.log('📋 Example creative standardized with full content preservation');
    }

    // Step 2: Analyze the uploaded image to get a detailed description

    console.log('🔍 Analyzing uploaded image with Gemini 2.5 Flash Image...');

    // Use Gemini 2.5 Flash Image for both analysis and generation
    // Try different model names in case the preview name has changed
    let imageModel;
    try {
      imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
    } catch (error) {
      console.log('⚠️ Trying alternative model name...');
      try {
        imageModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
      } catch (error2) {
        console.log('⚠️ Trying gemini-2.0-flash-image...');
        imageModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-image" });
      }
    }

    const analysisResult = await imageModel.generateContent([
      "Analyze this product image and provide a detailed description that captures all the important visual details including: colors, patterns, text/logos, fabric texture, shape, style, and any distinctive features. Be very specific and detailed as this will be used to recreate the product in a new setting.",
      {
        inlineData: {
          mimeType: imageMimeType,
          data: base64Image
        }
      }
    ]);

    const productDescription = analysisResult.response.text() || 'product';
    console.log('📝 Product analysis:', productDescription);

    // Step 2: Build the complete prompt with background and modifiers
    
    // Add session reset to prevent AI model caching from previous requests
    const sessionReset = `IMPORTANT: This is a NEW request. Ignore any previous context or themes from earlier generations. Focus ONLY on the current product and requirements below.

SESSION RESET: Previous requests and their themes (like "back to school", seasonal themes, etc.) should be completely ignored. This is a fresh, independent request.

`;
    
    let prompt: string;
    
    // Check if this is a multi-product request with custom prompt
    if (customPrompt && multiProductCount) {
      console.log('🎨 Using custom multi-product prompt...');
      console.log('🎨 MULTI-PRODUCT PROMPT DEBUG:');
      console.log('📝 Prompt length:', customPrompt.length);
      console.log('📝 First 500 chars:', customPrompt.substring(0, 500));
      // Use the custom multi-product prompt directly
      prompt = sessionReset + customPrompt;
    } else {
      // Check if we have a template prompt (customPromptModifiers)
      if (customPromptModifiers && customPromptModifiers.trim().length > 0) {
        // Use template-based generation - prioritize the template prompt over product description
        prompt = `${sessionReset}${customPromptModifiers} PRODUCT DETAILS: ${productDescription}

CRITICAL TEXT FITTING REQUIREMENT: Ensure ALL text elements (product text, overlays, labels, etc.) are PROPERLY SIZED and positioned to FIT COMPLETELY within the image boundaries. Never allow text to clip, cut off, or extend beyond the visible frame. Scale text appropriately to the composition and maintain readability while ensuring complete visibility. All text must be fully contained within the image dimensions.`;
        console.log('📝 Using template-based prompt from customPromptModifiers');
      } else {
        // Fallback to background preset for basic generation
        prompt = `${sessionReset}Create a professional product photography image featuring: ${productDescription}.

${backgroundPreset.prompt}`;
        console.log('📝 Using background preset prompt');
      }

      // Add dimension specifications based on aspect ratio
      const aspectRatioSpec = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS] || ASPECT_RATIOS.portrait;
      prompt += ` The final image should be generated in exactly ${aspectRatioSpec} dimensions for optimal mobile device display.`;

      // Add lighting modifiers only if not using template (templates have their own lighting)
      if (!customPromptModifiers || customPromptModifiers.trim().length === 0) {
        if (lighting === 'dramatic') {
          prompt += " Use dramatic lighting with strong directional shadows for a bold, editorial look.";
        } else if (lighting === 'bright') {
          prompt += " Use bright, even lighting with minimal shadows for a clean, commercial look.";
        }
      }

      // Always add professional photography instruction if not already included
      if (!prompt.includes("professional product photograph")) {
        prompt += " The final image should look like a professional product photograph with perfect studio lighting and composition.";
      }
    }

    console.log('🎯 Final prompt:', prompt);

    // Step 3: Generate the image directly using Gemini 2.5 Flash Image
    console.log('🎨 Generating image with Gemini 2.5 Flash Image...');

    let generatedImageUrl = null;

    try {
      // Build the content array for Gemini - Ultra-strict text boundaries and instruction following
      const contentArray = [
        {
          text: `Create a professional advertisement image with this product. The product image has been pre-standardized to 512x768 dimensions for optimal composition. Make it visually appealing with text overlays.

🚨 CRITICAL TEXT PLACEMENT RULES - ZERO TOLERANCE FOR CLIPPING:
- ALL TEXT MUST BE COMPLETELY INSIDE THE 1024x1536 CANVAS
- MASSIVE 80 pixel margins from ALL edges - no text within 80px of any border
- ONLY place text in the central 60% of the image - edges are FORBIDDEN
- Text safety zones: top 20%, bottom 20%, left 15%, right 15% are ABSOLUTELY OFF-LIMITS
- If any text touches or approaches an edge, MOVE IT TO CENTER or MAKE IT SMALLER
- Use compact, centered text layouts only
- NO side text, NO edge text, NO corner text - CENTER ONLY

📐 PRODUCT POSITIONING GUIDELINES:
- Product image is standardized 512x768 (2:3 ratio) - optimal for portrait layouts
- Position product to occupy center 40-60% of canvas vertically
- Leave ample space above and below product for text
- Product should never exceed 70% of canvas width

📝 USER INSTRUCTION COMPLIANCE - FOLLOW EXACTLY:
${customPromptModifiers ? `MANDATORY REQUIREMENTS FROM USER: ${customPromptModifiers}` : ''}

LAYOUT STRATEGY:
- Product prominently displayed in center, but not dominating entire canvas
- All text elements clustered in safe center zones above/below product
- Use tight, compact text groupings
- Ensure high contrast between text and background
- Make text punchy and readable

Format: 1024x1536 portrait. Professional quality with PERFECT text containment and EXACT instruction following.`
        }
      ];
      
      // Add the primary image
      contentArray.push({
        inlineData: {
          mimeType: imageMimeType,
          data: base64Image
        }
      });

      // Add example creative image for copy generation
      if (exampleCreativeFile && exampleBase64 && exampleMimeType) {
        console.log('📋 Adding example creative for copy generation...');
        
        contentArray.push({
          inlineData: {
            mimeType: exampleMimeType,
            data: exampleBase64
          }
        });
      }

      // If this is a multi-product request, add additional images (unless it's a pre-made collage)
      if (customPrompt && multiProductCount && !isProductCollage && additionalImages) {
        try {
          const additionalImagesArray = JSON.parse(additionalImages);
          console.log(`🖼️ MULTI-PRODUCT DEBUG: Adding ${additionalImagesArray.length} additional images for multi-product generation`);
          console.log(`🖼️ Total images being sent to AI: 1 main + ${additionalImagesArray.length} additional = ${1 + additionalImagesArray.length} total`);
          console.log(`🖼️ multiProductCount parameter: ${multiProductCount}`);
          
          additionalImagesArray.forEach((imageData: string, index: number) => {
            // Extract base64 data and mime type from data URL
            const [mimeTypePart, base64Part] = imageData.split(',');
            const mimeType = mimeTypePart.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
            
            console.log(`🖼️ Adding additional image ${index + 2}: ${mimeType}, data length: ${base64Part.length}`);
            
            contentArray.push({
              inlineData: {
                mimeType: mimeType,
                data: base64Part
              }
            });
          });
          
          console.log(`🖼️ Final contentArray length: ${contentArray.length} items sent to Gemini AI`);
        } catch (parseError) {
          console.error('❌ Error parsing additional images:', parseError);
        }
      } else if (isProductCollage && multiProductCount) {
        console.log(`🎨 PRODUCT COLLAGE MODE: Using pre-made collage with ${multiProductCount} products`);
        console.log(`🖼️ Single collage image being sent for styling and enhancement`);
      }

      console.log(`🚀 Sending ${contentArray.length - 1} images to Gemini for generation`);
      console.log('📋 Content array structure:', contentArray.map((item, i) => 
        i === 0 ? 'prompt' : `image-${i} (${item.inlineData?.mimeType})`
      ));
      
      // Try the original simple generateContent approach
      const imageGenerationResult = await imageModel.generateContent(contentArray);

      // Extract the generated image from the response
      let generatedImageData = null;

      const candidates = imageGenerationResult.response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error('No response candidates from Gemini API');
      }

      console.log('🔍 Gemini response candidates count:', candidates.length);
      
      const content = candidates[0].content;
      if (!content || !content.parts) {
        throw new Error('No content parts in Gemini API response');
      }

      console.log('🔍 Content parts count:', content.parts.length);
      console.log('🔍 Content parts types:', content.parts.map(p => Object.keys(p)));

      for (const part of content.parts) {
        console.log('🔍 Processing part:', Object.keys(part));
        
        if (part.inlineData) {
          // The data is already base64 encoded from Gemini
          generatedImageData = part.inlineData.data;
          // Create a data URL for the response
          generatedImageUrl = `data:${part.inlineData.mimeType};base64,${generatedImageData}`;
          console.log('🖼️ Generated image data length:', generatedImageData.length);
          console.log('🎯 Generated image MIME type:', part.inlineData.mimeType);
          break;
        } else if (part.text) {
          console.log('📝 Text response from Gemini:', part.text.substring(0, 200) + '...');
          
          // Check if this is a content policy refusal
          const refusalKeywords = [
            'cannot fulfill this request',
            'unable to generate',
            'harmful stereotypes',
            'offensive',
            'inappropriate',
            'against my guidelines',
            'policy violation',
            'cannot create',
            'refuse to create',
            'not appropriate'
          ];
          
          const isRefusal = refusalKeywords.some(keyword => 
            part.text.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isRefusal) {
            console.log('🚫 Creative generation AI refused to generate content due to policy violation');
            return NextResponse.json({
              error: 'Content Policy Violation',
              message: 'Our creative generator cannot create this content as it violates safety policies. Please use appropriate product images and descriptions.',
              userFriendly: true
            }, { status: 400 });
          }
        }
      }

      if (!generatedImageUrl) {
        console.error('❌ No image found in Gemini response');
        console.error('📋 Full response structure:', JSON.stringify(imageGenerationResult.response, null, 2));
        
        return NextResponse.json({
          error: 'Image Generation Failed',
          message: 'Gemini 2.5 Flash Image did not return image data. This might be due to model limitations, the prompt being interpreted as text-only, or regional restrictions.',
          details: {
            candidatesCount: candidates.length,
            partsCount: content.parts.length,
            partTypes: content.parts.map(p => Object.keys(p)),
            hasText: content.parts.some(p => p.text),
            hasInlineData: content.parts.some(p => p.inlineData),
            fullResponse: imageGenerationResult.response
          },
          userFriendly: true
        }, { status: 500 });
      }

      console.log('✅ Image generated successfully with Gemini 2.5 Flash Image');

      // Post-process the image to ensure correct dimensions
      if (generatedImageUrl) {
        try {
          console.log('🔧 Resizing image to correct aspect ratio...');
          
          // Convert base64 to buffer
          const base64Data = generatedImageData;
          if (!base64Data) {
            throw new Error('No base64 data received from Gemini');
          }
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          // Sharp is already imported at the top
          
          // Get target dimensions
          const targetDimensions = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS] || ASPECT_RATIOS.portrait;
          const [targetWidth, targetHeight] = targetDimensions.split('x').map(Number);
          
          console.log(`🎯 Target dimensions: ${targetWidth}x${targetHeight}`);
          
          // Check original image dimensions
          const metadata = await sharp(imageBuffer).metadata();
          console.log(`📐 Original image dimensions: ${metadata.width}x${metadata.height}`);
          
          let resizedImageBuffer;
          
          // Always use cover fit to fill entire canvas without letterboxing
          console.log('🎯 Using cover fit to fill entire portrait canvas');
          
          resizedImageBuffer = await sharp(imageBuffer)
            .resize(targetWidth, targetHeight, {
              fit: 'cover', // Always fill entire canvas
              position: 'center', // Center the crop
              background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for any padding
            })
            .png() // Ensure PNG output
            .toBuffer();
          
          // Convert back to base64
          const resizedBase64 = resizedImageBuffer.toString('base64');
          generatedImageUrl = `data:image/png;base64,${resizedBase64}`;
          
          console.log('✅ Image resized successfully to correct dimensions');
        } catch (resizeError) {
          console.error('⚠️ Image resize failed, using original:', resizeError);
          // Continue with original image if resize fails
        }
      }
    } catch (imageGenError: any) {
      console.error('Gemini 2.5 Flash Image Generation Error:', imageGenError);

      return NextResponse.json({
        error: 'Image Generation Failed',
        message: 'Unable to generate image with Gemini 2.5 Flash Image. Please try again or contact support.',
        details: imageGenError?.message || 'Unknown Gemini API error',
        userFriendly: true
      }, { status: 500 });
    }

      // Track usage in database
    try {
      await supabase
        .from('ai_feature_usage')
        .insert({
          user_id: userId,
          feature_type: USAGE_FEATURE_TYPE,
          usage_count: 1,
          metadata: {
            backgroundType,
            aspectRatio,
            quality,
            lighting,
            customModifiers: !!customPromptModifiers,
            model: 'gemini-2.5-flash-image-preview'
          },
          created_at: new Date().toISOString()
        });

      console.log('✅ Usage tracked successfully');
    } catch (usageTrackingError) {
      console.error('Error tracking usage:', usageTrackingError);
      // Don't fail the generation if usage tracking fails
    }

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      backgroundType,
      aspectRatio,
      quality,
      productDescription: productDescription.substring(0, 100) + '...',
      model: 'gemini-2.5-flash-image-preview',
      usage: {
        used: currentWeeklyUsage + 1,
        limit: WEEKLY_CREATIVE_LIMIT,
        remaining: WEEKLY_CREATIVE_LIMIT - currentWeeklyUsage - 1
      }
    });

  } catch (error: any) {
    console.error('❌ Error generating creative:', error);
    
    // Handle specific errors with user-friendly messages
    if (error.code === 'invalid_image') {
      return NextResponse.json({
        error: 'Invalid Image',
        message: 'Invalid image format. Please use PNG or JPEG format.',
        userFriendly: true
      }, { status: 400 });
    }

    if (error.message?.includes('content') || error.message?.includes('policy')) {
      return NextResponse.json({
        error: 'Content Policy Violation',
        message: 'Content violates policy. Please use appropriate product images and avoid inappropriate prompts.',
        userFriendly: true
      }, { status: 400 });
    }

    if (error.message?.includes('vision') || error.message?.includes('image')) {
      return NextResponse.json({
        error: 'Image Analysis Failed',
        message: 'Failed to analyze image. Please try with a clearer product photo.',
        userFriendly: true
      }, { status: 400 });
    }
    
    if (error.message?.includes('Weekly limit exceeded')) {
      return NextResponse.json({
        error: 'Usage Limit Reached',
        message: 'You have reached your weekly limit of 50 creative generations. Limit resets every Monday.',
        userFriendly: true
      }, { status: 429 });
    }

    return NextResponse.json({
      error: 'Generation Failed',
      message: 'Failed to generate creative. Please try again or contact support if the issue persists.',
      details: error.message,
      userFriendly: true
    }, { status: 500 });
  }
}

// GET endpoint to retrieve available presets and options
export async function GET() {
  return NextResponse.json({
    backgroundPresets: Object.entries(BACKGROUND_PRESETS).map(([key, value]) => ({
      id: key,
      name: value.name,
      preview: `/api/ai/generate-creative/preview/${key}` // We'll create preview images
    })),
    aspectRatios: Object.keys(ASPECT_RATIOS),
    qualityOptions: Object.keys(QUALITY_SETTINGS),
    lightingOptions: ['soft', 'dramatic', 'bright']
  });
}

// Configure function timeout for Vercel
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic'; 