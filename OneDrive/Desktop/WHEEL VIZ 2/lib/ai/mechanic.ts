/**
 * Virtual Mechanic Layer
 * 
 * Translates database product records into strict visual instruction sets.
 * Uses gemini-3-pro-preview for prompt engineering.
 * 
 * Input: product_json + vehicle_string
 * Output: { visual_prompt, negative_prompt, mask_strategy }
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export interface MechanicInput {
  product_json: {
    id: string;
    name: string;
    type: 'wheel' | 'tire' | 'suspension' | 'spacer' | 'accessory';
    meta_specs: Record<string, any>;
    image_url?: string;
  };
  vehicle_string: string; // e.g., "2020 Ford F-150 XLT"
}

export interface MechanicOutput {
  visual_prompt: string;
  negative_prompt: string;
  mask_strategy: {
    target_area: string; // e.g., "wheels", "vehicle_body", "ground_clearance"
    precision_level: 'high' | 'medium' | 'low';
    reference_points: string[]; // e.g., ["wheel_well", "rocker_panel", "tire_sidewall"]
  };
  should_use_reference_image: boolean; // TRUE for visible items (wheels/tires), FALSE for lift kits
}

/**
 * Analyzes product specifications and generates precise visual instructions
 */
export async function generateMechanicInstructions(
  input: MechanicInput
): Promise<MechanicOutput> {
  const { product_json, vehicle_string } = input;
  const { type, meta_specs, name, image_url } = product_json;

  // Initialize Gemini model
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  // Construct the prompt for the Virtual Mechanic
  const systemPrompt = `You are a Virtual Mechanic AI specializing in automotive visualization engineering.

Your job is to translate product specifications into PRECISE visual instructions for image generation.

CRITICAL RULES:
1. Engineering Accuracy: Visual changes MUST match physical specifications exactly
   - A 3-inch lift MUST raise the vehicle by exactly 3 inches
   - A 20x10 wheel MUST appear 20 inches in diameter and 10 inches wide
   - Offset changes MUST shift wheel position accurately

2. Product Type Handling:
   - WHEELS/TIRES: Visible items → use reference image, focus on wheel well area
   - SUSPENSION: Mostly invisible → NO reference image, focus on ground clearance and stance
   - SPACERS: Invisible → NO reference image, focus on wheel offset/stance
   - ACCESSORIES: Visible → use reference image if applicable

3. Output Format:
   - visual_prompt: Detailed description of EXACT visual changes
   - negative_prompt: What to avoid (distortion, unrealistic proportions, etc.)
   - mask_strategy: Precise targeting for inpainting
   - should_use_reference_image: TRUE only for visible items (wheels, tires, some accessories)

Vehicle: ${vehicle_string}
Product Type: ${type}
Product Name: ${name}
Specifications: ${JSON.stringify(meta_specs, null, 2)}
${image_url ? `Product Image URL: ${image_url}` : ''}

Generate precise visual instructions.`;

  try {
    const result = await model.generateContent(systemPrompt);
    const response = result.response;
    const text = response.text();

    // Parse the AI response (expecting structured JSON)
    const instructions = parseAIResponse(text, type, meta_specs, image_url);

    return instructions;
  } catch (error) {
    console.error('Virtual Mechanic Error:', error);
    
    // Fallback: Generate basic instructions based on product type
    return generateFallbackInstructions(input);
  }
}

/**
 * Parses AI response into structured output
 */
function parseAIResponse(
  aiText: string,
  productType: string,
  specs: Record<string, any>,
  imageUrl?: string
): MechanicOutput {
  // Try to extract JSON from the response
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        visual_prompt: parsed.visual_prompt || '',
        negative_prompt: parsed.negative_prompt || '',
        mask_strategy: parsed.mask_strategy || {
          target_area: 'wheels',
          precision_level: 'high',
          reference_points: []
        },
        should_use_reference_image: parsed.should_use_reference_image ?? true
      };
    } catch (e) {
      // Fall through to manual parsing
    }
  }

  // Manual parsing if JSON extraction fails
  return generateFallbackInstructions({
    product_json: {
      id: '',
      name: '',
      type: productType as any,
      meta_specs: specs,
      image_url: imageUrl
    },
    vehicle_string: ''
  });
}

/**
 * Generates fallback instructions when AI fails or for simple cases
 */
function generateFallbackInstructions(input: MechanicInput): MechanicOutput {
  const { product_json } = input;
  const { type, meta_specs, image_url } = product_json;

  switch (type) {
    case 'wheel':
      return {
        visual_prompt: `Replace the vehicle's wheels with ${meta_specs.diameter || 18}-inch diameter wheels, ${meta_specs.width || 9} inches wide, with a ${meta_specs.offset || 35}mm offset. The wheels should have a ${meta_specs.finish || 'glossy'} finish. Maintain perfect circular shape and proper fitment within the wheel wells. Ensure the wheels are centered on the hub and aligned with the vehicle's stance.`,
        negative_prompt: 'distorted wheels, oval shapes, misaligned wheels, floating wheels, unrealistic proportions, blurry edges, incorrect perspective, wheels clipping through fenders',
        mask_strategy: {
          target_area: 'wheels',
          precision_level: 'high',
          reference_points: ['wheel_well', 'hub_center', 'tire_sidewall', 'brake_caliper']
        },
        should_use_reference_image: true
      };

    case 'tire':
      return {
        visual_prompt: `Install ${meta_specs.width || 275}/${meta_specs.aspectRatio || 40}R${meta_specs.diameter || 20} tires on the vehicle. The tire sidewall should be ${meta_specs.aspectRatio || 40}% of the width. Maintain proper tire profile and ensure the tread pattern is visible and realistic. The tire should fit snugly on the wheel with proper bead seating.`,
        negative_prompt: 'flat tires, incorrect aspect ratio, stretched or pinched tires, unrealistic tread patterns, blurry sidewalls, floating tires',
        mask_strategy: {
          target_area: 'wheels',
          precision_level: 'high',
          reference_points: ['tire_sidewall', 'tread_surface', 'wheel_well_gap']
        },
        should_use_reference_image: true
      };

    case 'suspension':
      const liftAmount = parseLiftAmount(meta_specs.frontLowering || meta_specs.rearLowering || '0');
      const isLift = liftAmount > 0;
      const isLower = liftAmount < 0;
      
      return {
        visual_prompt: isLift 
          ? `Raise the vehicle's ride height by exactly ${Math.abs(liftAmount)} inches. Increase ground clearance uniformly. The wheel gap should increase proportionally. Maintain level stance and proper suspension geometry. The vehicle body should be lifted higher from the ground while wheels remain on the ground.`
          : isLower
          ? `Lower the vehicle's ride height by exactly ${Math.abs(liftAmount)} inches. Decrease ground clearance uniformly. The wheel gap should decrease proportionally. Maintain level stance and aggressive fitment. The vehicle should sit closer to the ground.`
          : `Adjust the vehicle's suspension to optimize stance and handling. Maintain factory ride height with improved geometry.`,
        negative_prompt: 'tilted vehicle, uneven stance, wheels off ground, unrealistic suspension compression, distorted body panels, incorrect proportions',
        mask_strategy: {
          target_area: 'ground_clearance',
          precision_level: 'high',
          reference_points: ['rocker_panel', 'wheel_well_gap', 'ground_line', 'fender_height']
        },
        should_use_reference_image: false // Suspension is mostly invisible
      };

    case 'spacer':
      const spacerThickness = parseSpacerThickness(meta_specs.thickness || '0mm');
      return {
        visual_prompt: `Add ${spacerThickness}mm wheel spacers to push the wheels outward by exactly ${spacerThickness}mm. The wheels should sit ${spacerThickness}mm further from the hub, creating a wider stance. Maintain proper wheel alignment and ensure wheels don't extend beyond fenders excessively.`,
        negative_prompt: 'wheels clipping through fenders, misaligned wheels, uneven spacing, distorted wheel wells',
        mask_strategy: {
          target_area: 'wheels',
          precision_level: 'medium',
          reference_points: ['wheel_well', 'fender_edge', 'hub_face']
        },
        should_use_reference_image: false // Spacers are invisible
      };

    case 'accessory':
      return {
        visual_prompt: `Add ${meta_specs.type || 'accessory'} to the vehicle. ${meta_specs.finish ? `Finish: ${meta_specs.finish}.` : ''} Ensure proper placement and realistic appearance. The accessory should integrate naturally with the vehicle's design.`,
        negative_prompt: 'floating accessories, incorrect scale, unrealistic materials, poor integration',
        mask_strategy: {
          target_area: 'accessory_location',
          precision_level: 'medium',
          reference_points: ['mounting_point']
        },
        should_use_reference_image: !!image_url
      };

    default:
      return {
        visual_prompt: 'Apply the selected modification to the vehicle with engineering precision.',
        negative_prompt: 'unrealistic modifications, distorted proportions, poor quality',
        mask_strategy: {
          target_area: 'vehicle',
          precision_level: 'medium',
          reference_points: []
        },
        should_use_reference_image: false
      };
  }
}

/**
 * Parses lift/lowering amount from spec strings like "1.0-3.0\"" or "30-50mm"
 */
function parseLiftAmount(spec: string): number {
  // Handle range format: "1.0-3.0\"" → take average
  const rangeMatch = spec.match(/([\d.]+)-([\d.]+)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    return (min + max) / 2;
  }

  // Handle single value: "2.5\"" or "50mm"
  const singleMatch = spec.match(/([\d.]+)/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    // Convert mm to inches if needed
    if (spec.includes('mm')) {
      return value / 25.4;
    }
    return value;
  }

  return 0;
}

/**
 * Parses spacer thickness from spec strings like "20mm" or "0.75\""
 */
function parseSpacerThickness(spec: string): number {
  const match = spec.match(/([\d.]+)/);
  if (match) {
    const value = parseFloat(match[1]);
    // Convert inches to mm if needed
    if (spec.includes('"')) {
      return value * 25.4;
    }
    return value;
  }
  return 0;
}

