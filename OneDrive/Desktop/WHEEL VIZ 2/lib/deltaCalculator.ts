/**
 * Delta Calculator - Compares current setup with selected product
 * Generates relative instructions for AI image generation
 */

export interface CurrentSetup {
  rimDiameter: number; // Current wheel diameter in inches
  rimWidth?: number; // Current wheel width in inches
  offset?: number; // Current offset in mm
  suspensionType: 'stock' | 'lifted' | 'lowered';
  liftHeight?: number; // If lifted, how many inches
  dropHeight?: number; // If lowered, how many inches
}

export interface ProductSpecs {
  diameter: number; // New wheel diameter in inches
  width: number; // New wheel width in inches
  offset: number; // New offset in mm
}

export interface DeltaResult {
  diameterDelta: number; // Percentage change
  diameterChange: number; // Absolute change in inches
  widthDelta: number; // Percentage change
  widthChange: number; // Absolute change in inches
  offsetDelta: number; // Change in mm
  offsetChange: 'more-tucked' | 'more-flush' | 'more-aggressive' | 'same';
  suspensionContext: string;
  visualInstructions: string; // Natural language instructions for AI
}

/**
 * Calculate the delta between current setup and new product
 */
export function calculateDelta(
  current: CurrentSetup,
  product: ProductSpecs
): DeltaResult {
  // Calculate diameter delta
  const diameterChange = product.diameter - current.rimDiameter;
  const diameterDelta = (diameterChange / current.rimDiameter) * 100;

  // Calculate width delta
  const currentWidth = current.rimWidth || current.rimDiameter * 0.5; // Estimate if not provided
  const widthChange = product.width - currentWidth;
  const widthDelta = (widthChange / currentWidth) * 100;

  // Calculate offset delta
  const currentOffset = current.offset || 35; // Assume stock offset if not provided
  const offsetDelta = product.offset - currentOffset;

  // Determine offset visual change
  let offsetChange: 'more-tucked' | 'more-flush' | 'more-aggressive' | 'same';
  if (offsetDelta > 10) {
    offsetChange = 'more-tucked'; // Higher offset = more inset
  } else if (offsetDelta < -10) {
    offsetChange = 'more-aggressive'; // Lower offset = more flush/poke
  } else if (Math.abs(offsetDelta) <= 10 && Math.abs(offsetDelta) > 3) {
    offsetChange = 'more-flush';
  } else {
    offsetChange = 'same';
  }

  // Generate suspension context
  const suspensionContext = generateSuspensionContext(current);

  // Generate visual instructions
  const visualInstructions = generateVisualInstructions({
    diameterDelta,
    diameterChange,
    widthDelta,
    widthChange,
    offsetDelta,
    offsetChange,
    suspensionContext,
    current,
    product
  });

  return {
    diameterDelta,
    diameterChange,
    widthDelta,
    widthChange,
    offsetDelta,
    offsetChange,
    suspensionContext,
    visualInstructions
  };
}

/**
 * Generate suspension context description
 */
function generateSuspensionContext(current: CurrentSetup): string {
  switch (current.suspensionType) {
    case 'lifted':
      const liftAmount = current.liftHeight || 2;
      return `The vehicle is currently lifted ${liftAmount}" above stock height. The wheel wells are larger than stock.`;
    case 'lowered':
      const dropAmount = current.dropHeight || 2;
      return `The vehicle is currently lowered ${dropAmount}" below stock height. The wheel wells are tighter than stock.`;
    case 'stock':
    default:
      return `The vehicle is at stock suspension height.`;
  }
}

/**
 * Generate natural language visual instructions for the AI
 */
function generateVisualInstructions(params: {
  diameterDelta: number;
  diameterChange: number;
  widthDelta: number;
  widthChange: number;
  offsetDelta: number;
  offsetChange: string;
  suspensionContext: string;
  current: CurrentSetup;
  product: ProductSpecs;
}): string {
  const {
    diameterDelta,
    diameterChange,
    widthDelta,
    widthChange,
    offsetDelta,
    offsetChange,
    suspensionContext,
    current,
    product
  } = params;

  let instructions: string[] = [];

  // Suspension context
  instructions.push(suspensionContext);

  // Diameter instructions with TIRE SIDEWALL MATH
  if (Math.abs(diameterDelta) > 2) {
    if (diameterChange > 0) {
      // GOING BIGGER (e.g., 18" → 21")
      const sidewallReduction = ((diameterChange / 2) / current.rimDiameter) * 100;
      instructions.push(
        `WHEEL SIZE UPGRADE DETECTED:\n` +
        `Current Setup: ${current.rimDiameter}" wheels (visible in photo)\n` +
        `New Setup: ${product.diameter}" wheels (${Math.abs(diameterChange).toFixed(1)}" LARGER)\n\n` +
        
        `CRITICAL VISUALIZATION RULES:\n` +
        `1. RIM SIZE: The visible wheel/rim portion must appear ${Math.abs(diameterDelta).toFixed(0)}% LARGER than currently shown.\n` +
        `   - The rim should take up MORE of the total wheel well area\n` +
        `   - The rim extends closer to the edges of the wheel well\n\n` +
        
        `2. TIRE SIDEWALL: The rubber tire sidewall must appear approximately ${sidewallReduction.toFixed(0)}% THINNER/LOWER.\n` +
        `   - Example: If current tire sidewall is 3 inches tall, new sidewall should be ~${(3 - (3 * sidewallReduction / 100)).toFixed(1)} inches\n` +
        `   - This is because larger rims require lower-profile tires\n` +
        `   - The tire looks more "stretched" and less "meaty"\n\n` +
        
        `3. OVERALL PACKAGE: The total wheel+tire diameter stays similar (fits same wheel well).\n` +
        `   - But the PROPORTION changes: More rim, less tire\n` +
        `   - The wheel should look more aggressive and modern\n` +
        `   - Gap between rim and tire should be minimal (low profile)\n\n` +
        
        `VISUAL REFERENCE:\n` +
        `- Current: [====RIM====][--TIRE--][--TIRE--] (${current.rimDiameter}" rim with tall sidewall)\n` +
        `- New:     [=======RIM=======][-TIRE-][-TIRE-] (${product.diameter}" rim with thin sidewall)\n` +
        `Notice: Rim is bigger, tire is thinner, total height similar.`
      );
    } else {
      // GOING SMALLER (e.g., 21" → 18")
      const sidewallIncrease = ((Math.abs(diameterChange) / 2) / product.diameter) * 100;
      instructions.push(
        `WHEEL SIZE DOWNGRADE DETECTED:\n` +
        `Current Setup: ${current.rimDiameter}" wheels (visible in photo)\n` +
        `New Setup: ${product.diameter}" wheels (${Math.abs(diameterChange).toFixed(1)}" SMALLER)\n\n` +
        
        `CRITICAL VISUALIZATION RULES:\n` +
        `1. RIM SIZE: The visible wheel/rim portion must appear ${Math.abs(diameterDelta).toFixed(0)}% SMALLER than currently shown.\n` +
        `   - The rim should take up LESS of the total wheel well area\n` +
        `   - More space between rim edge and wheel well edge\n\n` +
        
        `2. TIRE SIDEWALL: The rubber tire sidewall must appear approximately ${sidewallIncrease.toFixed(0)}% THICKER/TALLER.\n` +
        `   - Example: If current tire sidewall is 2 inches tall, new sidewall should be ~${(2 + (2 * sidewallIncrease / 100)).toFixed(1)} inches\n` +
        `   - This is because smaller rims require taller-profile tires\n` +
        `   - The tire looks more "meaty" and less "stretched"\n\n` +
        
        `3. OVERALL PACKAGE: The total wheel+tire diameter stays similar (fits same wheel well).\n` +
        `   - But the PROPORTION changes: Less rim, more tire\n` +
        `   - The wheel should look more "truck-like" or "off-road"\n` +
        `   - Visible rubber sidewall is much taller\n\n` +
        
        `VISUAL REFERENCE:\n` +
        `- Current: [=======RIM=======][-TIRE-][-TIRE-] (${current.rimDiameter}" rim with thin sidewall)\n` +
        `- New:     [====RIM====][--TIRE--][--TIRE--] (${product.diameter}" rim with tall sidewall)\n` +
        `Notice: Rim is smaller, tire is thicker, total height similar.`
      );
    }
  } else {
    instructions.push(
      `The NEW wheels are the SAME SIZE (${product.diameter}") as the current wheels. ` +
      `Maintain the same wheel diameter and tire sidewall proportions exactly as shown in the photo.`
    );
  }

  // Width instructions
  if (Math.abs(widthDelta) > 5) {
    if (widthChange > 0) {
      instructions.push(
        `The NEW wheels are WIDER (${product.width}" vs ${(current.rimWidth || current.rimDiameter * 0.5).toFixed(1)}"). ` +
        `The wheel face should appear slightly wider/deeper when viewed from the side.`
      );
    } else {
      instructions.push(
        `The NEW wheels are NARROWER (${product.width}" vs ${(current.rimWidth || current.rimDiameter * 0.5).toFixed(1)}"). ` +
        `The wheel face should appear slightly narrower/flatter when viewed from the side.`
      );
    }
  }

  // Offset/Stance instructions
  if (offsetChange !== 'same') {
    if (offsetChange === 'more-tucked') {
      instructions.push(
        `The NEW wheels have a HIGHER offset (+${product.offset}mm vs +${current.offset || 35}mm). ` +
        `Position the wheel face DEEPER INTO the fender. The wheel should sit MORE INSET than currently shown. ` +
        `There should be MORE SPACE between the tire sidewall and the fender edge.`
      );
    } else if (offsetChange === 'more-aggressive') {
      instructions.push(
        `The NEW wheels have a LOWER offset (+${product.offset}mm vs +${current.offset || 35}mm). ` +
        `Position the wheel face CLOSER TO the fender edge. The wheel should sit MORE FLUSH/AGGRESSIVE than currently shown. ` +
        `There should be LESS SPACE between the tire sidewall and the fender edge. The wheels may slightly poke out.`
      );
    } else {
      instructions.push(
        `The NEW wheels have a slightly different offset. Adjust wheel position ${offsetDelta > 0 ? 'slightly inward' : 'slightly outward'} relative to current.`
      );
    }
  }

  // Proportional guidance
  instructions.push(
    `PROPORTIONAL REFERENCE: Use the current wheel position, brake caliper size, and wheel well opening as reference points. ` +
    `All changes should be RELATIVE to these fixed reference points in the original image.`
  );

  return instructions.join('\n\n');
}

/**
 * Get a short summary for display
 */
export function getDeltaSummary(delta: DeltaResult): string {
  const parts: string[] = [];
  
  if (Math.abs(delta.diameterDelta) > 2) {
    parts.push(`${delta.diameterChange > 0 ? '+' : ''}${delta.diameterChange.toFixed(1)}" diameter`);
  }
  
  if (delta.offsetChange !== 'same') {
    parts.push(delta.offsetChange);
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Same size';
}

