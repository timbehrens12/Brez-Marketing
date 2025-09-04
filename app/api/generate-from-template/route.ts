import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/server';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Weekly usage limits for template generation
const WEEKLY_TEMPLATE_LIMIT = 80; // Updated to match regular generation
const USAGE_FEATURE_TYPE = 'template_generation';

const ASPECT_RATIOS = {
  square: "1024x1024",
  landscape: "1536x1024",
  portrait: "1024x1536"
};

export async function POST(request: NextRequest) {
  // Add overall timeout to prevent Vercel limit (18 seconds total buffer)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000); // 18 seconds

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
      console.error('Error checking template usage:', usageError);
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 });
    }

    const currentWeeklyUsage = usageData?.length || 0;

    // Check if user has exceeded weekly limit
    if (currentWeeklyUsage >= WEEKLY_TEMPLATE_LIMIT) {
      return NextResponse.json({
        error: `Weekly template generation limit reached. You've used ${currentWeeklyUsage} of ${WEEKLY_TEMPLATE_LIMIT} generations this week. Resets Monday at 12:00 AM.`,
        usage: {
          used: currentWeeklyUsage,
          limit: WEEKLY_TEMPLATE_LIMIT,
          resetsAt: startOfNextWeek.toISOString(),
          resetsIn: startOfNextWeek.getTime() - now.getTime()
        }
      }, { status: 429 });
    }

    // Parse JSON request body
    const body = await request.json();
    const {
      exampleImage,
      productImage,
      additionalNotes = '',
      brandId,
      aspectRatio = 'portrait',
      customName
    } = body;

    if (!exampleImage || !productImage) {
      return NextResponse.json(
        { error: 'Missing required fields: exampleImage and productImage' },
        { status: 400 }
      );
    }

    console.log('🎨 Generating from template...');
    console.log('📦 Aspect ratio:', aspectRatio);
    console.log('📝 Additional notes:', additionalNotes ? 'Yes' : 'No');

    // Extract base64 data for both images
    let exampleBase64 = exampleImage;
    let productBase64 = productImage;

    if (exampleImage.startsWith('data:image/')) {
      exampleBase64 = exampleImage.split(',')[1];
    }
    if (productImage.startsWith('data:image/')) {
      productBase64 = productImage.split(',')[1];
    }

    console.log('📊 Original image sizes:', {
      example: exampleBase64.length,
      product: productBase64.length
    });

    // Pre-compress images to reduce processing time and API payload
    try {
      console.log('🗜️ Pre-compressing images for faster processing...');

      // Compress example image
      const compressedExampleBuffer = await sharp(Buffer.from(exampleBase64, 'base64'))
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      exampleBase64 = compressedExampleBuffer.toString('base64');

      // Compress product image
      const compressedProductBuffer = await sharp(Buffer.from(productBase64, 'base64'))
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      productBase64 = compressedProductBuffer.toString('base64');

      console.log('✅ Images pre-compressed:', {
        example: exampleBase64.length,
        product: productBase64.length
      });
    } catch (compressError) {
      console.error('⚠️ Failed to pre-compress images:', compressError);
      // Continue with original images if compression fails
    }

    // Convert base64 to buffers for processing
    const exampleBuffer = Buffer.from(exampleBase64, 'base64');
    const productBuffer = Buffer.from(productBase64, 'base64');

    console.log('🔍 Processing template and product images with Gemini 2.0 Flash...');

    // Use the same working approach as generate-creative API
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

    // Build the optimized prompt for template-based generation
    const aspectRatioSpec = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS] || ASPECT_RATIOS.portrait;

    let prompt = `Recreate this advertisement template style with my new product. Match the colors, layout, and design exactly. ${additionalNotes ? `Additional: ${additionalNotes}` : ''} Generate in ${aspectRatioSpec} dimensions.`;

    // Generate the template-based creative with timeout
    console.log('⏱️ Starting Gemini API call...');
    const generationPromise = imageModel.generateContent([
      prompt,
      // Example template as reference
      {
        inlineData: {
          data: exampleBase64,
          mimeType: 'image/jpeg'
        }
      },
      // New product to feature
      {
        inlineData: {
          data: productBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    // Add timeout to prevent hanging (15 seconds for optimized template generation)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Generation timeout - please try again')), 15000);
    });

    const result = await Promise.race([generationPromise, timeoutPromise]);
    console.log('✅ Gemini API call completed');

    // Extract the generated image
    let generatedImageUrl = null;
    let generatedImageData = null;

    const candidates = result.response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No response candidates from Gemini API');
    }

    console.log('🔍 Gemini response candidates count:', candidates.length);

    const content = candidates[0].content;
    if (!content || !content.parts) {
      throw new Error('No content parts in Gemini API response');
    }

    console.log('🔍 Content parts count:', content.parts.length);

    for (const part of content.parts) {
      console.log('🔍 Processing part:', Object.keys(part));

      if (part.inlineData) {
        generatedImageData = part.inlineData.data;
        generatedImageUrl = `data:${part.inlineData.mimeType};base64,${generatedImageData}`;
        console.log('🖼️ Generated template-based image data length:', generatedImageData.length);
        console.log('🎯 Generated image MIME type:', part.inlineData.mimeType);
        break;
      } else if (part.text) {
        console.log('📝 Text response from Gemini:', part.text.substring(0, 200) + '...');
      }
    }

    if (!generatedImageUrl) {
      console.error('❌ No image found in Gemini response');
      console.error('📋 Full response structure:', JSON.stringify(result.response, null, 2));

      return NextResponse.json({
        error: 'Template Generation Failed',
        message: 'Gemini did not return image data. This might be due to model limitations or the prompt being interpreted as text-only.',
        details: {
          candidatesCount: candidates.length,
          partsCount: content.parts.length,
          partTypes: content.parts.map(p => Object.keys(p)),
          hasText: content.parts.some(p => p.text),
          hasInlineData: content.parts.some(p => p.inlineData)
        }
      }, { status: 500 });
    }

    console.log('✅ Template-based image generated successfully');

    // Post-process the image to ensure correct dimensions
    let finalImageUrl = generatedImageUrl;
    if (generatedImageUrl) {
      try {
        console.log('🔧 Resizing template image to correct aspect ratio...');

        // Get target dimensions
        const targetDimensions = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS] || ASPECT_RATIOS.portrait;
        const [targetWidth, targetHeight] = targetDimensions.split('x').map(Number);

        console.log(`🎯 Target dimensions: ${targetWidth}x${targetHeight}`);

        // Resize image to exact dimensions with smart cropping
        const resizedImageBuffer = await sharp(Buffer.from(generatedImageData, 'base64'))
          .resize(targetWidth, targetHeight, {
            fit: 'cover',
            position: 'center',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toBuffer();

        // Convert back to base64
        const resizedBase64 = resizedImageBuffer.toString('base64');
        finalImageUrl = `data:image/png;base64,${resizedBase64}`;

        console.log('✅ Template image resized successfully to correct dimensions');
      } catch (resizeError) {
        console.error('⚠️ Failed to resize template image:', resizeError);
        finalImageUrl = generatedImageUrl;
      }
    }

    // Save to database if brandId provided
    if (brandId) {
      try {
        // Compress images before storing to avoid 413 error
        let compressedExampleImage = exampleImage;
        let compressedProductImage = productImage;
        let compressedGeneratedImage = finalImageUrl;

        try {
          console.log('🗜️ Compressing template images for database storage...');

          // Compress example image (smaller for storage)
          const exampleImageBuffer = await sharp(Buffer.from(exampleBase64, 'base64'))
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 70, progressive: false }) // Faster compression
            .toBuffer();
          compressedExampleImage = `data:image/jpeg;base64,${exampleImageBuffer.toString('base64')}`;

          // Compress product image (smaller for storage)
          const productImageBuffer = await sharp(Buffer.from(productBase64, 'base64'))
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 70, progressive: false }) // Faster compression
            .toBuffer();
          compressedProductImage = `data:image/jpeg;base64,${productImageBuffer.toString('base64')}`;

          // Compress generated image (keep larger for quality)
          if (finalImageUrl.startsWith('data:image/')) {
            const generatedBase64 = finalImageUrl.split(',')[1];
            const generatedImageBuffer = await sharp(Buffer.from(generatedBase64, 'base64'))
              .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 75, progressive: false }) // Faster compression
              .toBuffer();
            compressedGeneratedImage = `data:image/jpeg;base64,${generatedImageBuffer.toString('base64')}`;
          }

          console.log('✅ Template images compressed successfully for database storage');
        } catch (compressError) {
          console.error('⚠️ Failed to compress template images:', compressError);
        }

        // Save the template-based creative
        const { data: creativeData, error: creativeError } = await supabase
          .from('creative_generations')
          .insert({
            brand_id: brandId,
            user_id: userId,
            style_id: 'template-based', // Template-based generation
            style_name: 'Template-Based',
            original_image_url: compressedProductImage,
            generated_image_url: compressedGeneratedImage,
            template_image_url: compressedExampleImage, // Store the example template
            additional_notes: additionalNotes,
            prompt_used: `Template-based generation: ${additionalNotes || 'No additional notes'}`,
            text_overlays: { top: '', bottom: '' },
            status: 'completed'
          })
          .select()
          .single();

        if (creativeError) {
          console.error('Error saving template creative to database:', JSON.stringify(creativeError, null, 2));
          throw new Error(`Database save failed: ${creativeError.message || 'Unknown database error'}`);
        } else {
          console.log('✅ Template creative saved to database:', creativeData.id);
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
      }
    }

    // Record usage
    try {
      await supabase
        .from('ai_feature_usage')
        .insert({
          user_id: userId,
          feature_type: USAGE_FEATURE_TYPE,
          created_at: new Date().toISOString()
        });
    } catch (usageInsertError) {
      console.error('Error recording template usage:', usageInsertError);
    }

    clearTimeout(timeoutId); // Clean up timeout on success

    return NextResponse.json({
      imageUrl: finalImageUrl,
      success: true,
      message: 'Template-based creative generated successfully!'
    });

  } catch (error) {
    clearTimeout(timeoutId); // Clean up timeout

    console.error('Error in template generation:', error);

    // Check if it was a timeout
    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: 'Generation timed out. Please try again with smaller images.' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate template-based creative. Please try again.' },
      { status: 500 }
    );
  }
}
