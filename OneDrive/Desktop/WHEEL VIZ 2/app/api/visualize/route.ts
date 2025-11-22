/**
 * Main API Entry Point: /api/visualize
 * 
 * Orchestrates the 2-Step Verification Pipeline:
 * 1. Credit verification
 * 2. Fetch product details from Supabase
 * 3. Call Virtual Mechanic (prompt engineering)
 * 4. Call Precision Renderer (image generation)
 * 5. Return generated image
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateMechanicInstructions, type MechanicInput } from '@/lib/ai/mechanic';
import { renderModification, type RendererInput } from '@/lib/ai/renderer';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface VisualizeRequest {
  user_id: string;
  product_id: string;
  base_image_url: string;
  vehicle_string: string; // e.g., "2020 Ford F-150 XLT"
  mask_image_url?: string; // Optional user-provided mask
}

export interface VisualizeResponse {
  success: boolean;
  generated_image_url?: string;
  credits_remaining?: number;
  error?: string;
  metadata?: {
    mechanic_instructions: any;
    generation_metadata: any;
  };
}

/**
 * POST /api/visualize
 * Main endpoint for generating vehicle visualizations
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: VisualizeRequest = await request.json();
    const { user_id, product_id, base_image_url, vehicle_string, mask_image_url } = body;

    // Validate required fields
    if (!user_id || !product_id || !base_image_url || !vehicle_string) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: user_id, product_id, base_image_url, vehicle_string'
        } as VisualizeResponse,
        { status: 400 }
      );
    }

    // ============================================
    // STEP 1: Credit Verification
    // ============================================
    const creditCheck = await verifyUserCredits(user_id);
    if (!creditCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: creditCheck.error || 'Insufficient credits',
          credits_remaining: creditCheck.credits_remaining
        } as VisualizeResponse,
        { status: 402 } // Payment Required
      );
    }

    // ============================================
    // STEP 2: Fetch Product Details
    // ============================================
    const product = await fetchProductDetails(product_id);
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found'
        } as VisualizeResponse,
        { status: 404 }
      );
    }

    // ============================================
    // STEP 3: Virtual Mechanic Layer
    // ============================================
    console.log('🔧 Calling Virtual Mechanic...');
    const mechanicInput: MechanicInput = {
      product_json: {
        id: product.id,
        name: product.name,
        type: product.type,
        meta_specs: product.meta_specs || {},
        image_url: product.image_url
      },
      vehicle_string
    };

    const mechanicInstructions = await generateMechanicInstructions(mechanicInput);
    console.log('✅ Mechanic Instructions Generated:', {
      should_use_reference: mechanicInstructions.should_use_reference_image,
      target_area: mechanicInstructions.mask_strategy.target_area
    });

    // ============================================
    // STEP 4: Precision Renderer Layer
    // ============================================
    console.log('🎨 Calling Precision Renderer...');
    const rendererInput: RendererInput = {
      base_image_url,
      mechanic_instructions: mechanicInstructions,
      reference_image_url: mechanicInstructions.should_use_reference_image 
        ? product.image_url 
        : undefined,
      mask_image_url
    };

    const renderResult = await renderModification(rendererInput);
    console.log('✅ Image Generated:', renderResult.generated_image_url);

    // ============================================
    // STEP 5: Deduct Credits & Save Generation
    // ============================================
    await deductUserCredits(user_id, 1);
    await saveGeneration({
      user_id,
      product_id,
      base_image_url,
      generated_image_url: renderResult.generated_image_url,
      vehicle_string,
      mechanic_instructions: mechanicInstructions,
      generation_metadata: renderResult.generation_metadata
    });

    // Get updated credits
    const updatedCredits = await getUserCredits(user_id);

    // ============================================
    // STEP 6: Return Success Response
    // ============================================
    return NextResponse.json(
      {
        success: true,
        generated_image_url: renderResult.generated_image_url,
        credits_remaining: updatedCredits,
        metadata: {
          mechanic_instructions: mechanicInstructions,
          generation_metadata: renderResult.generation_metadata
        }
      } as VisualizeResponse,
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Visualization Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      } as VisualizeResponse,
      { status: 500 }
    );
  }
}

/**
 * Verifies user has sufficient credits
 */
async function verifyUserCredits(userId: string): Promise<{
  success: boolean;
  credits_remaining?: number;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Credit verification error:', error);
      return { success: false, error: 'Failed to verify credits' };
    }

    const credits = data?.credits || 0;

    if (credits < 1) {
      return {
        success: false,
        credits_remaining: credits,
        error: 'Insufficient credits. Please purchase more credits to continue.'
      };
    }

    return {
      success: true,
      credits_remaining: credits
    };
  } catch (error) {
    console.error('Credit verification exception:', error);
    return { success: false, error: 'Credit verification failed' };
  }
}

/**
 * Fetches product details from Supabase
 */
async function fetchProductDetails(productId: string): Promise<{
  id: string;
  name: string;
  type: 'wheel' | 'tire' | 'suspension' | 'spacer' | 'accessory';
  image_url?: string;
  meta_specs: Record<string, any>;
} | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      console.error('Product fetch error:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type,
      image_url: data.image_url,
      meta_specs: data.meta_specs || {}
    };
  } catch (error) {
    console.error('Product fetch exception:', error);
    return null;
  }
}

/**
 * Deducts credits from user account
 */
async function deductUserCredits(userId: string, amount: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('deduct_credits', {
      user_id: userId,
      amount
    });

    if (error) {
      console.error('Credit deduction error:', error);
      // Note: In production, you might want to use a transaction or stored procedure
      // to ensure atomic credit deduction
    }
  } catch (error) {
    console.error('Credit deduction exception:', error);
  }
}

/**
 * Gets current user credits
 */
async function getUserCredits(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Get credits error:', error);
      return 0;
    }

    return data?.credits || 0;
  } catch (error) {
    console.error('Get credits exception:', error);
    return 0;
  }
}

/**
 * Saves generation record to database
 */
async function saveGeneration(data: {
  user_id: string;
  product_id: string;
  base_image_url: string;
  generated_image_url: string;
  vehicle_string: string;
  mechanic_instructions: any;
  generation_metadata: any;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('generations')
      .insert({
        user_id: data.user_id,
        product_id: data.product_id,
        base_image_url: data.base_image_url,
        generated_image_url: data.generated_image_url,
        vehicle_string: data.vehicle_string,
        mechanic_instructions: data.mechanic_instructions,
        generation_metadata: data.generation_metadata,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Save generation error:', error);
    }
  } catch (error) {
    console.error('Save generation exception:', error);
  }
}

/**
 * GET /api/visualize/status
 * Check API status and user credits
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing user_id parameter'
      },
      { status: 400 }
    );
  }

  const credits = await getUserCredits(userId);

  return NextResponse.json({
    success: true,
    credits_remaining: credits,
    api_status: 'operational'
  });
}

