import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// Weekly usage limits for background generation
const WEEKLY_BACKGROUND_LIMIT = 100; // Higher limit for background generation
const USAGE_FEATURE_TYPE = 'background_generation';

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
    const { prompt, image, styleId, brandId, creativeId, textOverlays, saveToDatabase = false, customName } = body;

    if (!image || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: image and prompt' },
        { status: 400 }
      );
    }

    // Get the style prompt
    const stylePrompt = STYLE_PROMPTS[styleId as keyof typeof STYLE_PROMPTS] || STYLE_PROMPTS[1];
    const enhancedPrompt = `${stylePrompt} ${prompt}`;

    console.log('🎨 Generating background with Gemini...');
    console.log('📦 Style ID:', styleId);
    console.log('📦 Creative ID:', creativeId);

    // Extract base64 image data
    let base64Data = image;
    if (image.startsWith('data:image/')) {
      base64Data = image.split(',')[1];
    }

    // Convert base64 to buffer for processing
    const imageBuffer = Buffer.from(base64Data, 'base64');

    console.log('🔍 Processing image with Gemini 2.0 Flash...');

    // Use Gemini 2.0 Flash for generation
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });

    // Create image part for Gemini
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      }
    };

    // Generate the background replacement
    const result = await model.generateContent([
      enhancedPrompt,
      imagePart
    ]);

    const response = await result.response;
    const generatedText = response.text();

    // Extract image URL from the response (assuming it returns a data URL or similar)
    let imageUrl = '';

    // If the response contains a data URL, use it directly
    const dataUrlMatch = generatedText.match(/data:image\/[^;]+;base64,[^"'\s]+/);
    if (dataUrlMatch) {
      imageUrl = dataUrlMatch[0];
    } else {
      // If no data URL found, we'll need to handle this differently
      // For now, return an error
      console.error('No image URL found in response:', generatedText);
      return NextResponse.json(
        { error: 'Failed to generate image URL from response' },
        { status: 500 }
      );
    }

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
            original_image_url: image, // Store original image
            generated_image_url: imageUrl,
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

    return NextResponse.json({
      imageUrl: imageUrl,
      success: true
    });

  } catch (error) {
    console.error('Error in background generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate background. Please try again.' },
      { status: 500 }
    );
  }
}
