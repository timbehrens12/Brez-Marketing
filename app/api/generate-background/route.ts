import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/server';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Weekly usage limits for background generation
const WEEKLY_BACKGROUND_LIMIT = 100; // Higher limit for background generation
const USAGE_FEATURE_TYPE = 'background_generation';

const ASPECT_RATIOS = {
  square: "1024x1024",
  landscape: "1536x1024",
  portrait: "1024x1536"
};

const STYLE_PROMPTS = {
  1: "Place this exact product on a clean, minimalist white background with professional studio lighting. Create subtle drop shadows beneath the product for depth while maintaining a clean aesthetic. Use soft, even lighting that eliminates harsh shadows but preserves product dimension.",
  2: "Place this exact product on a realistic concrete surface background, similar to high-end fashion editorials. The product should be laid flat with natural shadows around the edges. The background should be medium-toned concrete with visible texture and subtle vignette.",
  3: "Place this exact product on a pristine white marble surface with subtle gray veining. The marble should have a polished finish that reflects soft ambient lighting. Cast natural shadows beneath the product to show realistic contact with the surface.",
  4: "Place this exact product on a natural wood surface with visible grain patterns. The wood should be warm medium brown with natural texture. Create soft, realistic shadows that follow the product's contours. Use warm, directional lighting.",
  5: "Place this exact product on a natural linen fabric background with subtle texture and weave patterns. The fabric should be neutral beige with soft wrinkles. Create realistic shadows and depth to show the product resting naturally.",
  6: "Place this exact product on a luxurious velvet background. The velvet should be deep navy blue with rich texture and subtle sheen. Use dramatic lighting to enhance the luxurious feel while maintaining product focus.",
  7: "Place this exact product on a rustic wooden table surface. The wood should have natural grain, knots, and character marks. Add warm ambient lighting that creates natural shadows and highlights the wood texture.",
  8: "Place this exact product on a modern geometric pattern background. Use subtle gradients and clean lines. Maintain professional lighting that keeps focus on the product while complementing the geometric design.",
  9: "Place this exact product on a soft gradient background transitioning from light to darker tones. Use professional studio lighting with soft diffusion to create depth without harsh shadows.",
  10: "Place this exact product on a metallic surface with subtle reflections. The metal should have a brushed finish with realistic lighting that creates highlights and shadows on both the surface and product."
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
      console.error('Error checking background usage:', usageError);
      return NextResponse.json({ error: 'Failed to check usage limits' }, { status: 500 });
    }

    const currentWeeklyUsage = usageData?.length || 0;

    // Check if user has exceeded weekly limit
    if (currentWeeklyUsage >= WEEKLY_BACKGROUND_LIMIT) {
      return NextResponse.json({
        error: `Weekly background generation limit reached. You've used ${currentWeeklyUsage} of ${WEEKLY_BACKGROUND_LIMIT} generations this week. Resets Monday at 12:00 AM.`,
        usage: {
          used: currentWeeklyUsage,
          limit: WEEKLY_BACKGROUND_LIMIT,
          resetsAt: startOfNextWeek.toISOString(),
          resetsIn: startOfNextWeek.getTime() - now.getTime()
        }
      }, { status: 429 });
    }

    // Parse JSON request body
    const body = await request.json();
    const { prompt, image, images, styleId, brandId, creativeId, textOverlays, saveToDatabase = false, customName, aspectRatio = 'portrait' } = body;

    // Support both single image and multiple images
    const imageList = images || (image ? [image] : []);
    const isMultiProduct = imageList.length > 1;

    if (imageList.length === 0 || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: image(s) and prompt' },
        { status: 400 }
      );
    }

    // Get the style prompt
    const stylePrompt = STYLE_PROMPTS[styleId as keyof typeof STYLE_PROMPTS] || STYLE_PROMPTS[1];

    // Add dimension specifications based on aspect ratio
    const aspectRatioSpec = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS] || ASPECT_RATIOS.portrait;
    const enhancedPrompt = `${stylePrompt} ${prompt}. The final image should be generated in exactly ${aspectRatioSpec} dimensions for optimal mobile device display.`;

    console.log('🎨 Generating background with Gemini...');
    console.log('📦 Style ID:', styleId);
    console.log('📦 Creative ID:', creativeId);
    console.log('📦 Multi-product mode:', isMultiProduct);

    // Function to process a single image
    const processImage = async (imageData: string, index: number) => {
      // Extract base64 image data
      let base64Data = imageData;
      if (imageData.startsWith('data:image/')) {
        base64Data = imageData.split(',')[1];
      }

      console.log(`🔍 Processing image ${index + 1}/${imageList.length} with Gemini...`);

      // Use Gemini 2.5 Flash Image for generation (same as generate-creative API)
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

      // Generate the background replacement using the image model
      const result = await imageModel.generateContent([
        enhancedPrompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      // Extract the generated image from the response (same logic as generate-creative)
      let generatedImageUrl = null;
      let generatedImageData = null;

      const candidates = result.response.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error('No response candidates from Gemini API');
      }

      // Process the response to extract the image
      for (const candidate of candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImageData = part.inlineData.data;
              generatedImageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${generatedImageData}`;
              break;
            }
          }
        }
        if (generatedImageUrl) break;
      }

      if (!generatedImageUrl) {
        throw new Error('No image found in Gemini response');
      }

      return { generatedImageUrl, generatedImageData, originalImage: imageData };
    };

    // Process all images
    const results = [];
    for (let i = 0; i < imageList.length; i++) {
      try {
        const result = await processImage(imageList[i], i);
        results.push(result);
      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error);
        // Continue with other images instead of failing completely
        results.push({ error: `Failed to process image ${i + 1}`, originalImage: imageList[i] });
      }
    }

    if (results.length === 0) {
      throw new Error('No images were successfully processed');
    }

    // For backward compatibility, return the first result as the main response
    const firstResult = results.find(r => !r.error);
    if (!firstResult) {
      throw new Error('All images failed to process');
    }

    let generatedImageUrl = firstResult.generatedImageUrl;
    let generatedImageData = firstResult.generatedImageData;

    const candidates = [{ content: { parts: [{ inlineData: { data: generatedImageData, mimeType: 'image/png' } }] } }];
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
      console.error('📋 Full response structure:', JSON.stringify(result.response, null, 2));

      return NextResponse.json({
        error: 'Image Generation Failed',
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

    console.log('✅ Background image generated successfully');

    // Post-process the image to ensure correct dimensions
    let finalImageUrl = generatedImageUrl;
    if (generatedImageUrl) {
      try {
        console.log('🔧 Resizing image to correct aspect ratio...');

        // Get target dimensions
        const targetDimensions = ASPECT_RATIOS[aspectRatio as keyof typeof ASPECT_RATIOS] || ASPECT_RATIOS.portrait;
        const [targetWidth, targetHeight] = targetDimensions.split('x').map(Number);

        console.log(`🎯 Target dimensions: ${targetWidth}x${targetHeight}`);

        // Resize image to exact dimensions with smart cropping
        const resizedImageBuffer = await sharp(Buffer.from(generatedImageData, 'base64'))
          .resize(targetWidth, targetHeight, {
            fit: 'cover', // This maintains aspect ratio and crops if needed
            position: 'center', // Center the crop
            background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for any padding
          })
          .png() // Ensure PNG output
          .toBuffer();

        // Convert back to base64
        const resizedBase64 = resizedImageBuffer.toString('base64');
        finalImageUrl = `data:image/png;base64,${resizedBase64}`;

        console.log('✅ Image resized successfully to correct dimensions');
      } catch (resizeError) {
        console.error('⚠️ Failed to resize image:', resizeError);
        // Continue with original image if resize fails
        finalImageUrl = generatedImageUrl;
      }
    }

    // Use the final image URL (resized or original)
    const imageUrl = finalImageUrl;

    // If saveToDatabase is true, save the creative to the database
    if (saveToDatabase && brandId) {
      try {
        // Get the style name for the creative
        const styleNames: { [key: number]: string } = {
          1: 'Minimalist White',
          2: 'Concrete Floor',
          3: 'Marble Surface',
          4: 'Wooden Surface',
          5: 'Linen Fabric',
          6: 'Velvet Luxury',
          7: 'Rustic Wood',
          8: 'Geometric Pattern',
          9: 'Gradient Background',
          10: 'Metallic Surface'
        };

        const styleName = styleNames[styleId] || 'Custom Style';

        // Compress images before storing to avoid 413 error
        let compressedOriginalImage = image;
        let compressedGeneratedImage = imageUrl;

        try {
          console.log('🗜️ Compressing images for database storage...');

          // Compress original image
          const originalImageBuffer = await sharp(Buffer.from(base64Data, 'base64'))
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();
          compressedOriginalImage = `data:image/jpeg;base64,${originalImageBuffer.toString('base64')}`;

          // Compress generated image (if it's base64)
          if (imageUrl.startsWith('data:image/')) {
            const generatedBase64 = imageUrl.split(',')[1];
            const generatedImageBuffer = await sharp(Buffer.from(generatedBase64, 'base64'))
              .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 85 })
              .toBuffer();
            compressedGeneratedImage = `data:image/jpeg;base64,${generatedImageBuffer.toString('base64')}`;
          }

          console.log('✅ Images compressed successfully for database storage');
        } catch (compressError) {
          console.error('⚠️ Failed to compress images:', compressError);
          // Continue with original images if compression fails
        }

        // Create the creative record
        const { data: creativeData, error: creativeError } = await supabase
          .from('creatives')
          .insert({
            brand_id: brandId,
            user_id: userId,
            style_id: styleId,
            style_name: styleName,
            custom_name: customName,
            status: 'completed',
            original_image_url: compressedOriginalImage, // Store compressed original image
            generated_image_url: compressedGeneratedImage, // Store compressed generated image
            text_overlays: textOverlays || { top: '', bottom: '' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (creativeError) {
          console.error('Error saving creative to database:', creativeError);
          // Don't fail the request if database save fails
        } else {
          console.log('✅ Creative saved to database:', creativeData.id);
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        // Continue with the response even if database save fails
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
      console.error('Error recording usage:', usageInsertError);
      // Don't fail the request if usage recording fails
    }

    // Return response with all generated images for multi-product mode
    if (isMultiProduct) {
      const successfulResults = results.filter(r => !r.error);
      return NextResponse.json({
        images: successfulResults.map(r => ({
          imageUrl: r.generatedImageUrl,
          originalImage: r.originalImage
        })),
        failedCount: results.length - successfulResults.length,
        success: true,
        message: `Generated ${successfulResults.length} background images${results.length - successfulResults.length > 0 ? ` (${results.length - successfulResults.length} failed)` : ''}`
      });
    } else {
      return NextResponse.json({
        imageUrl: imageUrl,
        success: true
      });
    }

  } catch (error) {
    console.error('Error in background generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate background. Please try again.' },
      { status: 500 }
    );
  }
}
