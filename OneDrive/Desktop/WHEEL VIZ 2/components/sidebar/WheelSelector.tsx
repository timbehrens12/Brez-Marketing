
'use client';

import React from 'react';
import { useStore, Product } from '@/store/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateImageAction } from '@/actions/generate';
import { cn } from '@/lib/utils';

const MOCK_WHEELS: Product[] = [
  { id: 'w1', type: 'wheel', brand: 'Vorsteiner', model: 'V-FF 103', finish: 'Carbon Graphite', diameter: 20, width: 10, offset: 25, imageUrl: 'https://placehold.co/300x300/222/fff?text=V-FF+103' },
  { id: 'w2', type: 'wheel', brand: 'HRE', model: 'P101', finish: 'Brushed Dark Clear', diameter: 21, width: 10.5, offset: 30, imageUrl: 'https://placehold.co/300x300/333/fff?text=P101' },
  { id: 'w3', type: 'wheel', brand: 'BBS', model: 'LM', finish: 'Gold / Diamond Cut', diameter: 19, width: 9.5, offset: 20, imageUrl: 'https://placehold.co/300x300/444/fff?text=BBS+LM' },
  { id: 'w4', type: 'wheel', brand: 'Rotiform', model: 'AeroDisc', finish: 'White', diameter: 19, width: 8.5, offset: 45, imageUrl: 'https://placehold.co/300x300/555/fff?text=AeroDisc' },
  { id: 'w5', type: 'wheel', brand: 'Volk', model: 'TE37', finish: 'Bronze', diameter: 18, width: 9.5, offset: 22, imageUrl: 'https://placehold.co/300x300/666/fff?text=TE37' },
  { id: 'w6', type: 'wheel', brand: 'Work', model: 'Meister S1', finish: 'Polish', diameter: 19, width: 10, offset: 15, imageUrl: 'https://placehold.co/300x300/777/fff?text=Meister+S1' },
];

interface WheelSelectorProps {
  onProductSelect?: (product: { name: string; price: number }) => void;
}

export const WheelSelector = ({ onProductSelect }: WheelSelectorProps = {}) => {
  const { selectedProduct, setSelectedProduct, setIsGenerating, addGenerationStep, clearGenerationSteps, currentImage, setCurrentImage } = useStore();

  const handleSelect = async (wheel: Product) => {
    // If onProductSelect is provided, add to build instead of generating
    if (onProductSelect) {
      onProductSelect({
        name: `${wheel.brand} ${wheel.model}`,
        price: 500 + Math.floor(Math.random() * 1000) // Mock pricing
      });
      return;
    }

    // Original behavior for standalone wheel selection
    setSelectedProduct(wheel);
    if (!currentImage) return;

    setIsGenerating(true);
    clearGenerationSteps();
    addGenerationStep(`Selected wheel: ${wheel.brand} ${wheel.model}`);

    try {
      const { steps, resultUrl } = await generateImageAction({
        imageUrl: currentImage,
        product: {
          id: wheel.id,
          brand: wheel.brand,
          model: wheel.model,
          type: wheel.type,
          specs: {
            diameter: wheel.diameter,
            width: wheel.width,
            offset: wheel.offset
          }
        }
      });

      // Animate through steps
      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 600));
        addGenerationStep(step);
      }

      // Simulate result update
      if (resultUrl) {
        setCurrentImage(resultUrl);
      }
    } catch (error) {
      console.error(error);
      addGenerationStep("Error generating image.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {MOCK_WHEELS.map((wheel) => (
        <Card 
          key={wheel.id} 
          className={cn(
            "cursor-pointer hover:border-neutral-500 transition-colors overflow-hidden group",
            selectedProduct?.id === wheel.id ? "border-emerald-500 bg-emerald-500/5" : "border-neutral-800 bg-neutral-900"
          )}
          onClick={() => handleSelect(wheel)}
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={wheel.imageUrl} alt={wheel.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white">{wheel.brand}</p>
              <p className="text-[10px] text-neutral-300 truncate">{wheel.model} ({wheel.diameter}")</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

