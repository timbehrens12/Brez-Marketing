'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Comprehensive tire catalog with realistic specifications
const FITMENT_TIRES = [
  {
    id: 't1',
    brand: 'Michelin',
    model: 'Pilot Sport 4S',
    size: '275/35ZR20',
    type: 'Performance Summer',
    loadIndex: '99',
    speedRating: 'Y',
    utqg: '300AA A',
    warranty: '40,000 miles',
    price: 349,
    imageUrl: 'https://i.imgur.com/placeholder-tire.jpg',
    productUrl: 'https://fitmentindustries.com/products/michelin-pilot-sport-4s-275-35zr20'
  },
  {
    id: 't2',
    brand: 'Bridgestone',
    model: 'Potenza RE-71R',
    size: '285/30ZR22',
    type: 'Ultra High Performance',
    loadIndex: '101',
    speedRating: 'Y',
    utqg: '200AA A',
    warranty: '35,000 miles',
    price: 429,
    imageUrl: 'https://i.imgur.com/placeholder-tire.jpg',
    productUrl: 'https://fitmentindustries.com/products/bridgestone-potenza-re-71r-285-30zr22'
  },
  {
    id: 't3',
    brand: 'Goodyear',
    model: 'Wrangler Territory MT',
    size: 'LT285/75R16',
    type: 'Mud Terrain',
    loadIndex: '126',
    speedRating: 'Q',
    utqg: '0',
    warranty: '50,000 miles',
    price: 289,
    imageUrl: 'https://i.imgur.com/placeholder-tire.jpg',
    productUrl: 'https://fitmentindustries.com/products/goodyear-wrangler-territory-lt285-75r16'
  },
  {
    id: 't4',
    brand: 'BFGoodrich',
    model: 'Mud-Terrain KM3',
    size: '33x12.50R20LT',
    type: 'Mud Terrain',
    loadIndex: '114',
    speedRating: 'Q',
    utqg: '0',
    warranty: '60,000 miles',
    price: 389,
    imageUrl: 'https://i.imgur.com/placeholder-tire.jpg',
    productUrl: 'https://fitmentindustries.com/products/bfgoodrich-mud-terrain-km3-33x12-50r20'
  },
  {
    id: 't5',
    brand: 'Pirelli',
    model: 'P Zero',
    size: '265/30ZR19',
    type: 'Ultra High Performance',
    loadIndex: '93',
    speedRating: 'Y',
    utqg: '220AA A',
    warranty: '30,000 miles',
    price: 399,
    imageUrl: 'https://i.imgur.com/placeholder-tire.jpg',
    productUrl: 'https://fitmentindustries.com/products/pirelli-p-zero-265-30zr19'
  },
  {
    id: 't6',
    brand: 'Continental',
    model: 'ExtremeContact Sport',
    size: '255/40ZR19',
    type: 'Performance',
    loadIndex: '96',
    speedRating: 'Y',
    utqg: '340AA A',
    warranty: '50,000 miles',
    price: 319,
    imageUrl: 'https://i.imgur.com/placeholder-tire.jpg',
    productUrl: 'https://fitmentindustries.com/products/continental-extremecontact-sport-255-40zr19'
  },
  {
    id: 't7',
    brand: 'Toyo',
    model: 'Proxes R1R',
    size: '275/35ZR18',
    type: 'Street/Racetrack',
    loadIndex: '95',
    speedRating: 'Y',
    utqg: '200AA A',
    warranty: '20,000 miles',
    price: 279,
    imageUrl: 'https://i.imgur.com/placeholder-tire.jpg',
    productUrl: 'https://fitmentindustries.com/products/toyo-proxes-r1r-275-35zr18'
  },
  {
    id: 't8',
    brand: 'Nitto',
    model: 'NT555RII',
    size: '285/35ZR20',
    type: 'Drag Radial',
    loadIndex: '104',
    speedRating: 'Y',
    utqg: '240AA A',
    warranty: '25,000 miles',
    price: 459,
    imageUrl: 'https://i.imgur.com/placeholder-tire.jpg',
    productUrl: 'https://fitmentindustries.com/products/nitto-nt555rii-285-35zr20'
  }
];

interface TireSelectorProps {
  onProductSelect?: (product: { name: string; price: number; imageUrl?: string }) => void;
}

export const TireSelector = ({ onProductSelect }: TireSelectorProps = {}) => {
  const handleSelect = (tire: any) => {
    if (onProductSelect) {
      onProductSelect({
        name: `${tire.brand} ${tire.model}`,
        price: tire.price,
        imageUrl: tire.imageUrl
      });
    }
  };

  const handleViewDetails = (tire: any) => {
    window.open(tire.productUrl, '_blank');
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {FITMENT_TIRES.map((tire) => (
        <Card
          key={tire.id}
          className="overflow-hidden group border-neutral-800 bg-neutral-900 hover:border-neutral-500 transition-colors"
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tire.imageUrl} alt={tire.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white">{tire.brand}</p>
              <p className="text-[10px] text-neutral-300 truncate">{tire.model}</p>
              <p className="text-[10px] text-emerald-400 font-semibold">${tire.price}</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-xs text-neutral-400 space-y-1">
              <div>Size: {tire.size}</div>
              <div>Type: {tire.type}</div>
              <div>Load/Speed: {tire.loadIndex}{tire.speedRating}</div>
              <div>Warranty: {tire.warranty}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8"
                onClick={() => handleSelect(tire)}
              >
                Select
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 text-xs h-8"
                onClick={() => handleViewDetails(tire)}
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
