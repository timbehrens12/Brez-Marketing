'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Comprehensive wheel spacer catalog with detailed specifications
const FITMENT_SPACERS = [
  {
    id: 'sp1',
    brand: 'SPC Performance',
    model: 'Tuner Series Spacers',
    thickness: '25mm',
    boltPattern: '5x114.3',
    material: '6061-T6 Aluminum',
    finish: 'Black Anodized',
    studLength: '35mm',
    warranty: 'Lifetime',
    price: 149,
    imageUrl: 'https://i.imgur.com/placeholder-spacer.jpg',
    productUrl: 'https://fitmentindustries.com/products/spc-performance-25mm-wheel-spacers'
  },
  {
    id: 'sp2',
    brand: 'Superpro',
    model: 'Hubcentric Spacers',
    thickness: '20mm',
    boltPattern: '5x114.3',
    material: '7075-T6 Aluminum',
    finish: 'Silver Anodized',
    studLength: '45mm',
    warranty: 'Lifetime',
    price: 199,
    imageUrl: 'https://i.imgur.com/placeholder-spacer.jpg',
    productUrl: 'https://fitmentindustries.com/products/superpro-20mm-hubcentric-spacers'
  },
  {
    id: 'sp3',
    brand: 'TCI Engineering',
    model: 'Wheel Adapters',
    thickness: '30mm',
    boltPattern: '5x114.3 to 5x120',
    material: '6061-T6 Aluminum',
    finish: 'Raw Aluminum',
    studLength: '50mm',
    warranty: '1 Year',
    price: 299,
    imageUrl: 'https://i.imgur.com/placeholder-spacer.jpg',
    productUrl: 'https://fitmentindustries.com/products/tci-engineering-30mm-wheel-adapters'
  },
  {
    id: 'sp4',
    brand: 'AccuForm',
    model: 'Staggered Spacers',
    thickness: '15/25mm',
    boltPattern: '5x114.3',
    material: '6061-T6 Aluminum',
    finish: 'Black Anodized',
    studLength: '40mm',
    warranty: 'Lifetime',
    price: 179,
    imageUrl: 'https://i.imgur.com/placeholder-spacer.jpg',
    productUrl: 'https://fitmentindustries.com/products/accuform-staggered-15-25mm-spacers'
  },
  {
    id: 'sp5',
    brand: 'Brembo',
    model: 'Brake Spacer Kit',
    thickness: '12mm',
    application: 'Front/Rear',
    material: 'Aluminum',
    price: 249,
    imageUrl: 'https://i.imgur.com/placeholder-spacer.jpg',
    productUrl: 'https://fitmentindustries.com/products/brembo-12mm-brake-spacers'
  },
  {
    id: 'sp6',
    brand: 'StopTech',
    model: 'Track Spacer Kit',
    thickness: '10mm',
    application: 'Front/Rear',
    material: '6061 Aluminum',
    price: 189,
    imageUrl: 'https://i.imgur.com/placeholder-spacer.jpg',
    productUrl: 'https://fitmentindustries.com/products/stoptech-10mm-track-spacers'
  },
  {
    id: 'sp7',
    brand: 'Wilwood',
    model: 'Hat Spacer Kit',
    thickness: '8mm',
    application: 'Front/Rear',
    material: 'Aluminum',
    price: 159,
    imageUrl: 'https://i.imgur.com/placeholder-spacer.jpg',
    productUrl: 'https://fitmentindustries.com/products/wilwood-8mm-hat-spacers'
  },
  {
    id: 'sp8',
    brand: 'Glock',
    model: 'Offset Spacer Kit',
    thickness: '35mm',
    boltPattern: '5x114.3 to 5x114.3',
    material: '7075 Aluminum',
    price: 229,
    imageUrl: 'https://i.imgur.com/placeholder-spacer.jpg',
    productUrl: 'https://fitmentindustries.com/products/glock-35mm-offset-spacers'
  }
];

interface SpacerSelectorProps {
  onProductSelect?: (product: { name: string; price: number; imageUrl?: string }) => void;
}

export const SpacerSelector = ({ onProductSelect }: SpacerSelectorProps = {}) => {
  const handleSelect = (spacer: any) => {
    if (onProductSelect) {
      onProductSelect({
        name: `${spacer.brand} ${spacer.model}`,
        price: spacer.price,
        imageUrl: spacer.imageUrl
      });
    }
  };

  const handleViewDetails = (spacer: any) => {
    window.open(spacer.productUrl, '_blank');
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {FITMENT_SPACERS.map((spacer) => (
        <Card
          key={spacer.id}
          className="overflow-hidden group border-neutral-800 bg-neutral-900 hover:border-neutral-500 transition-colors"
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spacer.imageUrl} alt={spacer.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white">{spacer.brand}</p>
              <p className="text-[10px] text-neutral-300 truncate">{spacer.model}</p>
              <p className="text-[10px] text-emerald-400 font-semibold">${spacer.price}</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-xs text-neutral-400 space-y-1">
              <div>Thickness: {spacer.thickness}</div>
              <div>Bolt: {spacer.boltPattern}</div>
              <div>Material: {spacer.material}</div>
              <div>Finish: {spacer.finish}</div>
              <div>Stud Length: {spacer.studLength}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8"
                onClick={() => handleSelect(spacer)}
              >
                Select
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 text-xs h-8"
                onClick={() => handleViewDetails(spacer)}
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
