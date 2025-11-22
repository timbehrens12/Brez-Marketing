/**
 * Frontend API Client for Visualization
 * 
 * Provides type-safe functions to interact with the /api/visualize endpoint
 */

export interface VisualizeRequest {
  user_id: string;
  product_id: string;
  base_image_url: string;
  vehicle_string: string;
  mask_image_url?: string;
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

export interface VisualizationStatusResponse {
  success: boolean;
  credits_remaining: number;
  api_status: string;
  error?: string;
}

/**
 * Generates a vehicle visualization with the selected product
 */
export async function generateVisualization(
  request: VisualizeRequest
): Promise<VisualizeResponse> {
  try {
    const response = await fetch('/api/visualize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data: VisualizeResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('Visualization generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate visualization'
    };
  }
}

/**
 * Checks API status and user credits
 */
export async function checkVisualizationStatus(
  userId: string
): Promise<VisualizationStatusResponse> {
  try {
    const response = await fetch(`/api/visualize/status?user_id=${encodeURIComponent(userId)}`, {
      method: 'GET',
    });

    const data: VisualizationStatusResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error('Status check error:', error);
    return {
      success: false,
      credits_remaining: 0,
      api_status: 'error',
      error: error instanceof Error ? error.message : 'Failed to check status'
    };
  }
}

/**
 * Example usage in a React component:
 * 
 * ```typescript
 * import { generateVisualization } from '@/lib/api/visualize';
 * 
 * const handleGenerate = async () => {
 *   const result = await generateVisualization({
 *     user_id: 'user-123',
 *     product_id: 'product-456',
 *     base_image_url: 'https://example.com/car.jpg',
 *     vehicle_string: '2020 Ford F-150 XLT'
 *   });
 * 
 *   if (result.success) {
 *     console.log('Generated image:', result.generated_image_url);
 *     console.log('Credits remaining:', result.credits_remaining);
 *   } else {
 *     console.error('Error:', result.error);
 *   }
 * };
 * ```
 */

