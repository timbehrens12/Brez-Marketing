
'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { generateImageAction } from '@/actions/generate';

export const StanceControls = () => {
  const { stanceParameters, setStanceParameter, currentImage, setIsGenerating, addGenerationStep, clearGenerationSteps } = useStore();
  // Local state for sliders to avoid spamming store/updates during drag
  const [localParams, setLocalParams] = useState(stanceParameters);

  // Sync local state when store changes (e.g. reset or preset)
  useEffect(() => {
    setLocalParams(stanceParameters);
  }, [stanceParameters]);

  const handleChange = (key: keyof typeof stanceParameters, value: number[]) => {
    const newVal = value[0];
    setLocalParams(prev => ({ ...prev, [key]: newVal }));
    setStanceParameter(key, newVal);
  };

  const handleCommit = async () => {
    if (!currentImage) return;
    
    setIsGenerating(true);
    clearGenerationSteps();
    addGenerationStep("Applying stance parameters...");
    addGenerationStep(`Height: ${localParams.rideHeight}", Camber: ${localParams.frontCamber}°`);

    try {
      const { steps } = await generateImageAction({
        imageUrl: currentImage,
        stance: localParams
      });

      // Animate through steps
      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 600));
        addGenerationStep(step);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label>Ride Height</Label>
          <span className="text-xs text-muted-foreground">{localParams.rideHeight > 0 ? '+' : ''}{localParams.rideHeight}"</span>
        </div>
        <Slider 
          value={[localParams.rideHeight]} 
          min={-5} 
          max={6} 
          step={0.5} 
          onValueChange={(v) => handleChange('rideHeight', v)} 
          onValueCommit={handleCommit}
          className="cursor-grab active:cursor-grabbing"
        />
        <div className="flex justify-between text-[10px] text-neutral-500 px-1">
          <span>Slammed</span>
          <span>Stock</span>
          <span>Lifted</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label>Front Camber</Label>
          <span className="text-xs text-muted-foreground">{localParams.frontCamber}°</span>
        </div>
        <Slider 
          value={[localParams.frontCamber]} 
          min={-10} 
          max={5} 
          step={0.5} 
          onValueChange={(v) => handleChange('frontCamber', v)}
          onValueCommit={handleCommit}
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label>Rear Camber</Label>
          <span className="text-xs text-muted-foreground">{localParams.rearCamber}°</span>
        </div>
        <Slider 
          value={[localParams.rearCamber]} 
          min={-10} 
          max={5} 
          step={0.5} 
          onValueChange={(v) => handleChange('rearCamber', v)}
          onValueCommit={handleCommit}
        />
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label>Poke / Offset</Label>
          <span className="text-xs text-muted-foreground">
            {['Sunken', 'Flush', 'Poke', 'Aggressive'][localParams.poke]}
          </span>
        </div>
        <Slider 
          value={[localParams.poke]} 
          min={0} 
          max={3} 
          step={1} 
          onValueChange={(v) => handleChange('poke', v)}
          onValueCommit={handleCommit}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 pt-4">
        <Button variant="outline" size="sm" onClick={() => {
          setStanceParameter('rideHeight', -2);
          setStanceParameter('frontCamber', -3);
          setStanceParameter('rearCamber', -4);
          setStanceParameter('poke', 1);
          handleCommit();
        }}>Show Stance</Button>
        <Button variant="outline" size="sm" onClick={() => {
          setStanceParameter('rideHeight', 4);
          setStanceParameter('frontCamber', 0);
          setStanceParameter('rearCamber', 0);
          setStanceParameter('poke', 2);
          handleCommit();
        }}>Off-Road</Button>
      </div>
    </div>
  );
};

