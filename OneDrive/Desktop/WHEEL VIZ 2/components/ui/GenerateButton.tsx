import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';
import { generateVisualization } from '@/lib/generationService';
import { UpsizeAlert } from '@/components/canvas/UpsizeAlert';
import './GenerateButton.css';

interface GenerateButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const GenerateButton = ({ className, disabled, ...props }: GenerateButtonProps) => {
  const { 
    currentImage, 
    selectedProduct,
    selectedTire,
    currentSetup,
    isSetupComplete,
    setCurrentImage, 
    setIsGenerating 
  } = useStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showUpsizeAlert, setShowUpsizeAlert] = useState(false);

  const executeGeneration = async () => {
    if (!currentImage || !selectedProduct) return;

    setIsLoading(true);
    setIsGenerating(true);

    try {
      const data = await generateVisualization({
        currentImage,
        selectedProduct,
        currentSetup,
      });

      if (data.generated_image_url) {
        console.log('✅ Success! Image URL:', data.generated_image_url.substring(0, 50) + '...');
        
        // Check for simulation fallback
        if (data.message && data.message.includes('Simulation')) {
          alert('⚠️ AI Model Unavailable (Using Simulation Mode)\n\nThe image generation model is not responding or the key does not have access. The original image has been returned.');
        }

        // Create a temporary image to preload it and check if it works
        const img = new Image();
        img.onload = () => {
            setCurrentImage(data.generated_image_url);
            console.log('🖼️ Image loaded and displayed');
        };
        img.onerror = () => {
            console.error('❌ Generated image failed to load');
            alert('Generated image failed to load');
        };
        img.src = data.generated_image_url;
      } else {
        console.warn('⚠️ No generated image URL in response');
      }

    } catch (error) {
      console.error('❌ Generation error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  const handleGenerateClick = async () => {
    if (!currentImage || !selectedProduct) {
      alert('Please upload an image and select a product first');
      return;
    }
    
    if (!isSetupComplete) {
      alert('Please complete the Current Setup form first');
      return;
    }

    // Check for size change without tires (upsize OR downsize)
    if (selectedProduct.type === 'wheel' && !selectedTire) {
      const newDiameter = (selectedProduct as any).diameter || 18;
      // Check if size is different (allow for float precision issues with epsilon)
      if (Math.abs(newDiameter - currentSetup.rimDiameter) > 0.1) {
        setShowUpsizeAlert(true);
        return;
      }
    }

    // If no upsizing issues, proceed
    await executeGeneration();
  };

  return (
    <>
      {showUpsizeAlert && (
        <UpsizeAlert 
          onClose={() => setShowUpsizeAlert(false)}
          onConfirm={() => {
            setShowUpsizeAlert(false);
            executeGeneration();
          }}
        />
      )}

    <div className="btn-wrapper w-full">
      <button 
          className={cn("btn w-full h-14!", className, disabled && "opacity-50 pointer-events-none", isLoading && "loading")} 
          disabled={disabled || isLoading}
          onClick={handleGenerateClick}
        {...props}
      >
          {!isLoading && <Sparkles className="btn-svg w-5 h-5 mr-2" />}
          
        <div className="txt-wrapper">
          <div className="txt-1">
              {isLoading ? (
                <span className="animate-pulse tracking-wider">GENERATING...</span>
              ) : (
                <>
            <span className="btn-letter">G</span>
            <span className="btn-letter">E</span>
            <span className="btn-letter">N</span>
            <span className="btn-letter">E</span>
            <span className="btn-letter">R</span>
            <span className="btn-letter">A</span>
            <span className="btn-letter">T</span>
            <span className="btn-letter">E</span>
                  <span className="btn-letter"> </span>
            <span className="btn-letter">P</span>
            <span className="btn-letter">R</span>
            <span className="btn-letter">E</span>
            <span className="btn-letter">V</span>
            <span className="btn-letter">I</span>
            <span className="btn-letter">E</span>
            <span className="btn-letter">W</span>
                </>
              )}
          </div>
          
          <div className="txt-2">
               {isLoading ? (
                <span className="animate-pulse tracking-wider">GENERATING...</span>
              ) : (
                <>
             <span className="btn-letter">G</span>
            <span className="btn-letter">E</span>
            <span className="btn-letter">N</span>
            <span className="btn-letter">E</span>
            <span className="btn-letter">R</span>
            <span className="btn-letter">A</span>
            <span className="btn-letter">T</span>
            <span className="btn-letter">E</span>
                  <span className="btn-letter"> </span>
            <span className="btn-letter">P</span>
            <span className="btn-letter">R</span>
            <span className="btn-letter">E</span>
            <span className="btn-letter">V</span>
            <span className="btn-letter">I</span>
            <span className="btn-letter">E</span>
            <span className="btn-letter">W</span>
                </>
              )}
          </div>
        </div>
      </button>
    </div>
    </>
  );
};
