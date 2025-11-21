
'use client';

import React from 'react';
import { useStore, Product } from '@/store/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateImageAction } from '@/actions/generate';
import { cn } from '@/lib/utils';

// Wheel gallery with real images but generic placeholder text
const FITMENT_WHEELS = [
  {
    id: 'w1',
    type: 'wheel',
    brand: 'TITLE HERE',
    model: 'MODEL HERE',
    finish: 'FINISH HERE',
    diameter: 18,
    width: 9.5,
    offset: 35,
    boltPattern: 'BOLT PATTERN HERE',
    price: 1295,
    imageUrl: 'https://i.imgur.com/7b7S0bn.png',
    productUrl: 'https://fitmentindustries.com/products/wheel-1'
  },
  {
    id: 'w2',
    type: 'wheel',
    brand: 'TITLE HERE',
    model: 'MODEL HERE',
    finish: 'FINISH HERE',
    diameter: 19,
    width: 9.5,
    offset: 22,
    boltPattern: 'BOLT PATTERN HERE',
    price: 1595,
    imageUrl: 'https://i.imgur.com/o6LRJZr.png',
    productUrl: 'https://fitmentindustries.com/products/wheel-2'
  },
  {
    id: 'w3',
    type: 'wheel',
    brand: 'TITLE HERE',
    model: 'MODEL HERE',
    finish: 'FINISH HERE',
    diameter: 18,
    width: 10.5,
    offset: 25,
    boltPattern: 'BOLT PATTERN HERE',
    price: 1895,
    imageUrl: 'https://i.imgur.com/LKnghBP.png',
    productUrl: 'https://fitmentindustries.com/products/wheel-3'
  },
  {
    id: 'w4',
    type: 'wheel',
    brand: 'TITLE HERE',
    model: 'MODEL HERE',
    finish: 'FINISH HERE',
    diameter: 20,
    width: 10,
    offset: 30,
    boltPattern: 'BOLT PATTERN HERE',
    price: 2195,
    imageUrl: 'https://i.imgur.com/LoJwUdw.png',
    productUrl: 'https://fitmentindustries.com/products/wheel-4'
  },
  {
    id: 'w5',
    type: 'wheel',
    brand: 'TITLE HERE',
    model: 'MODEL HERE',
    finish: 'FINISH HERE',
    diameter: 19,
    width: 9.5,
    offset: 20,
    boltPattern: 'BOLT PATTERN HERE',
    price: 1795,
    imageUrl: 'https://i.imgur.com/Y7d2ox8.png',
    productUrl: 'https://fitmentindustries.com/products/wheel-5'
  },
  {
    id: 'w6',
    type: 'wheel',
    brand: 'TITLE HERE',
    model: 'MODEL HERE',
    finish: 'FINISH HERE',
    diameter: 19,
    width: 9.5,
    offset: 25,
    boltPattern: 'BOLT PATTERN HERE',
    price: 1995,
    imageUrl: 'https://i.imgur.com/bAtSVRV.png',
    productUrl: 'https://fitmentindustries.com/products/wheel-6'
  },
  {
    id: 'w7',
    type: 'wheel',
    brand: 'TITLE HERE',
    model: 'MODEL HERE',
    finish: 'FINISH HERE',
    diameter: 18,
    width: 9.5,
    offset: 22,
    boltPattern: 'BOLT PATTERN HERE',
    price: 1395,
    imageUrl: 'https://i.imgur.com/7XWHhJ6.png',
    productUrl: 'https://fitmentindustries.com/products/wheel-7'
  },
  {
    id: 'w8',
    type: 'wheel',
    brand: 'TITLE HERE',
    model: 'MODEL HERE',
    finish: 'FINISH HERE',
    diameter: 18,
    width: 9,
    offset: 35,
    boltPattern: 'BOLT PATTERN HERE',
    price: 1695,
    imageUrl: 'https://i.imgur.com/0bir2Rr.png',
    productUrl: 'https://fitmentindustries.com/products/wheel-8'
  }
];

interface WheelSelectorProps {
  onProductSelect?: (product: { name: string; price: number; imageUrl?: string }) => void;
}

export const WheelSelector = ({ onProductSelect }: WheelSelectorProps = {}) => {
  const { selectedProduct, setSelectedProduct, setIsGenerating, addGenerationStep, clearGenerationSteps, currentImage, setCurrentImage } = useStore();

  const handleSelect = async (wheel: any) => {
    // If onProductSelect is provided, add to build instead of generating
    if (onProductSelect) {
      onProductSelect({
        name: `${wheel.brand} ${wheel.model}`,
        price: wheel.price,
        imageUrl: wheel.imageUrl
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

  const handleViewDetails = (wheel: any) => {
    window.open(wheel.productUrl, '_blank');
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {FITMENT_WHEELS.map((wheel) => (
        <Card
          key={wheel.id}
          className={cn(
            "overflow-hidden group border-neutral-800 bg-neutral-900 hover:border-neutral-500 transition-colors",
            selectedProduct?.id === wheel.id ? "border-emerald-500 bg-emerald-500/5" : ""
          )}
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={wheel.imageUrl} alt={wheel.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white">TITLE HERE</p>
              <p className="text-[10px] text-neutral-300 truncate">MODEL HERE</p>
              <p className="text-[10px] text-emerald-400 font-semibold">$PRICE HERE</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-xs text-neutral-400 space-y-1">
              <div>DETAIL HERE</div>
              <div>SPEC HERE</div>
              <div>INFO HERE</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8"
                onClick={() => handleSelect(wheel)}
              >
                Select
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 text-xs h-8"
                onClick={() => handleViewDetails(wheel)}
              >
                Details
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

