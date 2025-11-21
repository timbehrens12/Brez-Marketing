
'use client';

import React from 'react';
import { useStore, Product } from '@/store/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateImageAction } from '@/actions/generate';
import { cn } from '@/lib/utils';

// Realistic Fitment Industries wheel data
const FITMENT_WHEELS = [
  {
    id: 'w1',
    type: 'wheel',
    brand: 'Volk Racing',
    model: 'CE28N',
    finish: 'Hyper Black',
    diameter: 18,
    width: 9.5,
    offset: 35,
    boltPattern: '5x114.3',
    price: 1295,
    imageUrl: 'https://i.imgur.com/7b7S0bn.png',
    productUrl: 'https://fitmentindustries.com/products/volk-racing-ce28n-18x9-5-35-hyper-black'
  },
  {
    id: 'w2',
    type: 'wheel',
    brand: 'BBS',
    model: 'FI-R',
    finish: 'Diamond Black',
    diameter: 19,
    width: 9.5,
    offset: 22,
    boltPattern: '5x114.3',
    price: 1595,
    imageUrl: 'https://i.imgur.com/o6LRJZr.png',
    productUrl: 'https://fitmentindustries.com/products/bbs-fi-r-19x9-5-22-diamond-black'
  },
  {
    id: 'w3',
    type: 'wheel',
    brand: 'Work Equip',
    model: '03',
    finish: 'Bronze',
    diameter: 18,
    width: 10.5,
    offset: 25,
    boltPattern: '5x114.3',
    price: 1895,
    imageUrl: 'https://i.imgur.com/LKnghBP.png',
    productUrl: 'https://fitmentindustries.com/products/work-equip-03-18x10-5-25-bronze'
  },
  {
    id: 'w4',
    type: 'wheel',
    brand: 'HRE',
    model: 'P1',
    finish: 'Flow Form Silver',
    diameter: 20,
    width: 10,
    offset: 30,
    boltPattern: '5x114.3',
    price: 2195,
    imageUrl: 'https://i.imgur.com/LoJwUdw.png',
    productUrl: 'https://fitmentindustries.com/products/hre-p1-20x10-5-30-flow-form-silver'
  },
  {
    id: 'w5',
    type: 'wheel',
    brand: 'Rotiform',
    model: 'BLQ',
    finish: 'Matte Bronze',
    diameter: 19,
    width: 9.5,
    offset: 20,
    boltPattern: '5x114.3',
    price: 1795,
    imageUrl: 'https://i.imgur.com/Y7d2ox8.png',
    productUrl: 'https://fitmentindustries.com/products/rotiform-blq-19x9-5-20-matte-bronze'
  },
  {
    id: 'w6',
    type: 'wheel',
    brand: 'Avant Garde',
    model: 'M590',
    finish: 'Diamond Cut Black',
    diameter: 19,
    width: 9.5,
    offset: 25,
    boltPattern: '5x114.3',
    price: 1995,
    imageUrl: 'https://i.imgur.com/bAtSVRV.png',
    productUrl: 'https://fitmentindustries.com/products/avant-garde-m590-19x9-5-25-diamond-cut-black'
  },
  {
    id: 'w7',
    type: 'wheel',
    brand: 'Enkei',
    model: 'TS-10',
    finish: 'Matte Gunmetal',
    diameter: 18,
    width: 9.5,
    offset: 22,
    boltPattern: '5x114.3',
    price: 1395,
    imageUrl: 'https://i.imgur.com/7XWHhJ6.png',
    productUrl: 'https://fitmentindustries.com/products/enkei-ts-10-18x9-5-22-matte-gunmetal'
  },
  {
    id: 'w8',
    type: 'wheel',
    brand: 'Forgestar',
    model: 'F14',
    finish: 'Gloss Black',
    diameter: 18,
    width: 9,
    offset: 35,
    boltPattern: '5x114.3',
    price: 1695,
    imageUrl: 'https://i.imgur.com/0bir2Rr.png',
    productUrl: 'https://fitmentindustries.com/products/forgestar-f14-18x9-5-35-gloss-black'
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
              <p className="text-xs font-bold text-white">{wheel.brand}</p>
              <p className="text-[10px] text-neutral-300 truncate">{wheel.model}</p>
              <p className="text-[10px] text-emerald-400 font-semibold">${wheel.price}</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-xs text-neutral-400 space-y-1">
              <div>Size: {wheel.diameter}" x {wheel.width}"</div>
              <div>Offset: {wheel.offset}mm</div>
              <div>Bolt: {wheel.boltPattern}</div>
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

