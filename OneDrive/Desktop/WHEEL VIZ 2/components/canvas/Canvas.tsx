
'use client';

import React, { useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { Button } from '@/components/ui/button';
import { Upload, ZoomIn, ZoomOut, RotateCcw, Camera } from 'lucide-react';
import { ThinkingTerminal } from './ThinkingTerminal';

export const Canvas = () => {
  const { currentImage, originalImage, setOriginalImage, setIsGenerating, addGenerationStep, clearGenerationSteps } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedView, setSelectedView] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setOriginalImage(url);
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
      <div className="h-full w-full bg-neutral-900/50 relative flex items-center justify-center overflow-hidden">
        <div className="text-center space-y-4 p-8 border-2 border-dashed border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors">
          <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Upload Your Car</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Upload a side or 3/4 angle photo to start customizing wheels and stance.
            </p>
          </div>
          <Button onClick={triggerUpload} variant="outline" className="w-full">
            Select Photo
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
    <div className="h-full w-full bg-neutral-950 relative flex flex-col">
      {/* Toolbar */}
      <ThinkingTerminal />
      
      {/* View Angle Buttons */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="bg-neutral-900/80 backdrop-blur-md p-2 rounded-lg border border-neutral-800">
          <div className="flex items-center gap-2 mb-2 px-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Camera Angles</span>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              variant={selectedView === '3/4 Front' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewGeneration('3/4 Front')}
              className="justify-start text-xs h-8"
            >
              3/4 Front
            </Button>
            <Button
              variant={selectedView === 'Side Profile' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewGeneration('Side Profile')}
              className="justify-start text-xs h-8"
            >
              Side Profile
            </Button>
            <Button
              variant={selectedView === 'Head On' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewGeneration('Head On')}
              className="justify-start text-xs h-8"
            >
              Head On
            </Button>
            <Button
              variant={selectedView === '3/4 Rear' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewGeneration('3/4 Rear')}
              className="justify-start text-xs h-8"
            >
              3/4 Rear
            </Button>
            <Button
              variant={selectedView === 'Front Wheel Close' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewGeneration('Front Wheel Close')}
              className="justify-start text-xs h-8"
            >
              Front Wheel Close
            </Button>
            <Button
              variant={selectedView === 'Rear Wheel Close' ? "default" : "ghost"}
              size="sm"
              onClick={() => handleViewGeneration('Rear Wheel Close')}
              className="justify-start text-xs h-8"
            >
              Rear Wheel Close
            </Button>
          </div>
        </div>
      </div>

      {/* Compare Toggle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md p-2 rounded-full border border-neutral-800">
        <Button
          variant={showCompare ? "default" : "ghost"}
          size="sm"
          onClick={() => setShowCompare(!showCompare)}
          className="rounded-full px-4"
        >
          Compare
        </Button>
      </div>

      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 bg-neutral-900/80 backdrop-blur-md p-2 rounded-lg border border-neutral-800">
              <Button variant="ghost" size="icon" onClick={() => zoomIn()}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => zoomOut()}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => resetTransform()}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

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
