import { useStore } from '@/store/useStore';
import { calculateDelta, getDeltaSummary, type ProductSpecs, type CurrentSetup } from '@/lib/deltaCalculator';

// Helper to convert blob URL to base64 with resizing
async function blobUrlToBase64(blobUrl: string): Promise<{ dataUrl: string; width: number; height: number }> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not supported'));

      // Max dimensions: 1920x1080 (1080p)
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG 0.85 (higher quality)
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
        width: Math.round(width),
        height: Math.round(height)
      });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

export interface GenerationParams {
  currentImage: string;
  selectedProduct: any;
  currentSetup: CurrentSetup;
  fixInstructions?: string;
}

export async function generateVisualization(params: GenerationParams) {
  const { currentImage, selectedProduct, currentSetup, fixInstructions } = params;

  console.log('🚀 Starting generation request...', {
    product: selectedProduct.name,
    fixInstructions: !!fixInstructions
  });

  // Convert blob URL to base64 if needed
  let imageToSend = currentImage;
  let imageWidth = 1920;
  let imageHeight = 1080;
  
  if (currentImage.startsWith('blob:')) {
    console.log('🔄 Converting blob URL to base64...');
    const result = await blobUrlToBase64(currentImage);
    imageToSend = result.dataUrl;
    imageWidth = result.width;
    imageHeight = result.height;
    console.log(`📐 Image dimensions: ${imageWidth}x${imageHeight}`);
  }

  // Calculate delta
  let deltaInstructions = '';
  if (selectedProduct.type === 'wheel') {
    const productSpecs: ProductSpecs = {
      diameter: selectedProduct.diameter,
      width: selectedProduct.width,
      offset: selectedProduct.offset,
    };
    
    const delta = calculateDelta(currentSetup, productSpecs);
    deltaInstructions = delta.visualInstructions;
    
    console.log('📊 Delta Analysis:', {
      current: currentSetup,
      new: productSpecs,
      delta: {
        diameterChange: `${delta.diameterChange > 0 ? '+' : ''}${delta.diameterChange.toFixed(1)}"`,
        offsetChange: delta.offsetChange,
        summary: getDeltaSummary(delta)
      }
    });
  }

  const response = await fetch('/api/test-visualize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base_image_url: imageToSend,
      vehicle_string: 'User Vehicle',
      image_width: imageWidth,
      image_height: imageHeight,
      current_setup: currentSetup,
      delta_instructions: deltaInstructions,
      fix_instructions: fixInstructions, // Pass fix instructions to API
      product: {
        name: selectedProduct.name || 'Unknown Product',
        type: selectedProduct.type || 'wheel',
        image_url: selectedProduct.imageUrl,
        specs: selectedProduct.specs || {}
      }
    }),
  });

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Generation failed');
  }

  return data;
}

