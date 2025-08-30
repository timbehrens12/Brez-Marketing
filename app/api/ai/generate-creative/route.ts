import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Weekly usage limits for creative generation
const WEEKLY_CREATIVE_LIMIT = 50; // 50 creative generations per week
const USAGE_FEATURE_TYPE = 'creative_generation';

const BACKGROUND_PRESETS = {
  concrete: {
    name: "Concrete Floor",
    prompt: "Place this exact product on a realistic concrete surface background, similar to the lighting and texture in high-end fashion editorials. The product should be laid flat with natural shadows around the edges to reflect realistic depth. The background should be a medium-toned concrete floor with visible cracks and a slight vignette, like in a minimal industrial setting. The lighting should be soft but directional, casting subtle shadows under the product to show it's resting on the ground. Maintain the natural folds, wrinkles, and product proportions as if it was gently laid down by hand. Avoid any artificial floating effect — it must look like a real photograph taken in studio lighting conditions. The product color, logo, and fabric texture should stay crisp and unedited."
  },
  marble: {
    name: "Marble Surface",
    prompt: "Place this exact product on a pristine white marble surface with subtle gray veining. The marble should have a polished finish that reflects soft ambient lighting. Cast natural shadows beneath the product to show realistic contact with the surface. Use professional studio lighting with soft diffusion to eliminate harsh shadows while maintaining depth. The background should have a subtle gradient from white to light gray. Maintain all product details, colors, and textures exactly as shown in the original image."
  },
  wood: {
    name: "Wooden Surface",
    prompt: "Place this exact product on a natural wood surface with visible grain patterns. The wood should be a warm medium brown tone with natural texture and character. Create soft, realistic shadows that follow the product's contours. Use warm, directional lighting that enhances both the wood grain and product details. The background should fade to a soft vignette. Preserve all original product colors, logos, and fabric textures without alteration."
  },
  minimalist: {
    name: "Minimalist White",
    prompt: "Place this exact product on a pure white seamless background with professional studio lighting. Create subtle drop shadows beneath the product for depth while maintaining a clean, minimal aesthetic. Use soft, even lighting that eliminates harsh shadows but preserves product dimension. The lighting should be bright and clean, similar to high-end product photography. Maintain all product details, colors, and textures exactly as in the original image."
  },
  fabric: {
    name: "Linen Fabric",
    prompt: "Place this exact product on a natural linen fabric background with subtle texture and weave patterns. The fabric should be a neutral beige or off-white color with soft wrinkles and natural draping. Create realistic shadows and depth to show the product resting naturally on the fabric surface. Use warm, soft lighting that enhances both the fabric texture and product details. Maintain all original product characteristics without modification."
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
    const aspectRatio = formData.get('aspectRatio') as string || 'square';
    const quality = formData.get('quality') as string || 'standard'; // Default to standard quality to reduce costs
    const lighting = formData.get('lighting') as string || 'soft';
    const customPromptModifiers = formData.get('customPromptModifiers') as string || '';

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

    // Step 1: Analyze the uploaded image to get a detailed description
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const imageDataUrl = `data:${imageFile.type};base64,${base64Image}`;

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
          mimeType: imageFile.type,
          data: base64Image
        }
      }
    ]);

    const productDescription = analysisResult.response.text() || 'product';
    console.log('📝 Product analysis:', productDescription);

    // Step 2: Build the complete prompt with background and modifiers
    let prompt = `Create a professional product photography image featuring: ${productDescription}. 

${backgroundPreset.prompt}`;
    
    // Add lighting modifiers
    if (lighting === 'dramatic') {
      prompt += " Use dramatic lighting with strong directional shadows for a bold, editorial look.";
    } else if (lighting === 'bright') {
      prompt += " Use bright, even lighting with minimal shadows for a clean, commercial look.";
    }

    // Add custom modifiers if provided
    if (customPromptModifiers) {
      prompt += ` ${customPromptModifiers}`;
    }

    prompt += " The final image should look like a professional product photograph with perfect studio lighting and composition.";

    console.log('🎯 Final prompt:', prompt);

    // Step 3: Generate the image directly using Gemini 2.5 Flash Image
    console.log('🎨 Generating image with Gemini 2.5 Flash Image...');

    let generatedImageUrl = null;

    try {
      const imageGenerationResult = await imageModel.generateContent([
        prompt, // The enhanced prompt for image generation
        {
          inlineData: {
            mimeType: imageFile.type,
            data: base64Image
          }
        }
      ]);

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