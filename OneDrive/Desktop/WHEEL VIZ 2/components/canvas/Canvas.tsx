
'use client';

import React, { useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Button } from '@/components/ui/button';
import { Upload, ZoomIn, ZoomOut, RotateCcw, Camera } from 'lucide-react';
import { LoadingOverlay } from './LoadingOverlay';
import { CurrentSetupForm } from './CurrentSetupForm';

export const Canvas = () => {
  const { 
    currentImage, 
    originalImage, 
    setOriginalImage, 
    setIsGenerating, 
    addGenerationStep, 
    clearGenerationSteps, 
    showCompare, 
    setShowCompare, 
    setCurrentSetup,
    isSetupComplete,
    setIsSetupComplete 
  } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedView, setSelectedView] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setOriginalImage(url);
      // Reset setup complete status - force user to fill form
      setIsSetupComplete(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleViewGeneration = async (viewType: string) => {
    setSelectedView(viewType);
    setIsGenerating(true);
    clearGenerationSteps();

    addGenerationStep(`Analyzing current build configuration...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    addGenerationStep(`Generating ${viewType} camera angle...`);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    addGenerationStep(`Applying lighting and shadows for ${viewType} view...`);
    await new Promise(resolve => setTimeout(resolve, 700));
    
    addGenerationStep(`Rendering high-resolution ${viewType} image...`);
    await new Promise(resolve => setTimeout(resolve, 900));
    
    addGenerationStep(`${viewType} view complete! 🎉`);
    setIsGenerating(false);
    
    // In production, this would call your Nano Banana Pro API with the view angle parameter
  };

  if (!currentImage) {
    return (
      <div className="h-full w-full relative flex items-center justify-center overflow-hidden">
        <div className="text-center space-y-6 p-12 border-2 border-dashed border-white/10 rounded-2xl hover:border-white/20 transition-all backdrop-blur-sm bg-white/5">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <Upload className="w-10 h-10 text-white/60" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-light text-white tracking-wide">Upload Your Car</h3>
            <p className="text-sm text-white/40 max-w-xs font-mono">
              Upload a side or 3/4 angle photo to start customizing wheels and stance.
            </p>
          </div>
          <Button 
            onClick={triggerUpload} 
            className="w-full bg-white text-black hover:bg-white/90 font-bold tracking-wider"
          >
            SELECT PHOTO
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleUpload}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-transparent relative flex flex-col">
      {/* Toolbar */}
      <LoadingOverlay />
      
      {/* REQUIRED Setup Form Modal (blocks everything until completed) */}
      {currentImage && !isSetupComplete && (
        <div className="absolute inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 pt-12 overflow-y-auto">
          <div className="w-full max-w-md">
            <div className="mb-4 text-center">
              <h2 className="text-2xl font-bold text-primary mb-2">Setup Required</h2>
              <p className="text-sm text-muted-foreground">
                Tell us about your current wheels so we can generate accurate size comparisons
              </p>
            </div>
            <CurrentSetupForm 
              onSetupChange={(setup) => {
                setCurrentSetup(setup);
              }}
              onComplete={() => {
                setIsSetupComplete(true);
              }}
            />
          </div>
        </div>
      )}

      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
      >
        {() => (
          <>
            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full flex items-center justify-center"
            >
              <div className="relative shadow-2xl">
                {showCompare && originalImage ? (
                  <ReactCompareSlider
                    itemOne={
                      <ReactCompareSliderImage
                        src={originalImage}
                        alt="Original"
                      />
                    }
                    itemTwo={
                      <ReactCompareSliderImage
                        src={currentImage}
                        alt="Modified"
                      />
                    }
                    className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentImage}
                    alt="Car"
                    className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                  />
                )}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};
