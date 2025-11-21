'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Comprehensive suspension catalog with detailed specifications
const FITMENT_SUSPENSION = [
  {
    id: 's1',
    brand: 'Tein',
    model: 'Flex Z Coilovers',
    type: 'Coilovers',
    frontLowering: '1.5-3.0"',
    rearLowering: '1.5-3.0"',
    springRate: '8K/6K Front/Rear',
    adjustable: 'Full',
    warranty: '1 Year',
    price: 1899,
    imageUrl: 'https://i.imgur.com/placeholder-suspension.jpg',
    productUrl: 'https://fitmentindustries.com/products/tein-flex-z-coilovers'
  },
  {
    id: 's2',
    brand: 'KSport',
    model: 'GT Pro Coilovers',
    type: 'Coilovers',
    frontLowering: '1.2-2.8"',
    rearLowering: '1.2-2.8"',
    springRate: '12K/10K Front/Rear',
    adjustable: 'Compression/Rebound',
    warranty: '2 Years',
    price: 1599,
    imageUrl: 'https://i.imgur.com/placeholder-suspension.jpg',
    productUrl: 'https://fitmentindustries.com/products/ksport-gt-pro-coilovers'
  },
  {
    id: 's3',
    brand: 'BC Racing',
    model: 'BR Series Coilovers',
    type: 'Coilovers',
    frontLowering: '1.0-2.5"',
    rearLowering: '1.0-2.5"',
    springRate: '10K/8K Front/Rear',
    adjustable: 'Ride Height',
    warranty: '1 Year',
    price: 1399,
    imageUrl: 'https://i.imgur.com/placeholder-suspension.jpg',
    productUrl: 'https://fitmentindustries.com/products/bc-racing-br-series-coilovers'
  },
  {
    id: 's4',
    brand: 'Icon Vehicle Dynamics',
    model: '4.5" Stage 8 Lift Kit',
    type: 'Lift Kit',
    frontLift: '4.5"',
    rearLift: '4.5"',
    includesShocks: 'Yes',
    warranty: 'Lifetime',
    price: 2299,
    imageUrl: 'https://i.imgur.com/placeholder-suspension.jpg',
    productUrl: 'https://fitmentindustries.com/products/icon-vehicle-dynamics-4-5-lift-kit'
  },
  {
    id: 's5',
    brand: 'Air Lift',
    model: 'LoadLifter 5000 Air Springs',
    type: 'Air Suspension',
    adjustable: 'Yes',
    maxLoad: '5000 lbs',
    price: 899,
    imageUrl: 'https://i.imgur.com/placeholder-suspension.jpg',
    productUrl: 'https://fitmentindustries.com/products/air-lift-loadlifter-5000-air-springs'
  },
  {
    id: 's6',
    brand: 'Eibach',
    model: 'Pro-Kit Springs',
    type: 'Lowering Springs',
    frontLowering: '1.5-2.0"',
    rearLowering: '1.2-1.8"',
    price: 499,
    imageUrl: 'https://i.imgur.com/placeholder-suspension.jpg',
    productUrl: 'https://fitmentindustries.com/products/eibach-pro-kit-springs'
  },
  {
    id: 's7',
    brand: 'Bilstein',
    model: 'B8 Performance Plus',
    type: 'Performance Shocks',
    adjustable: 'Yes',
    damping: 'Mono-tube',
    price: 1299,
    imageUrl: 'https://i.imgur.com/placeholder-suspension.jpg',
    productUrl: 'https://fitmentindustries.com/products/bilstein-b8-performance-plus'
  },
  {
    id: 's8',
    brand: 'Fox Racing',
    model: 'Factory Series Shocks',
    type: 'Off-Road Shocks',
    adjustable: 'Yes',
    compression: '3-position',
    price: 1799,
    imageUrl: 'https://i.imgur.com/placeholder-suspension.jpg',
    productUrl: 'https://fitmentindustries.com/products/fox-racing-factory-series-shocks'
  }
];

interface SuspensionSelectorProps {
  onProductSelect?: (product: { name: string; price: number; imageUrl?: string }) => void;
}

export const SuspensionSelector = ({ onProductSelect }: SuspensionSelectorProps = {}) => {
  const handleSelect = (suspension: any) => {
    if (onProductSelect) {
      onProductSelect({
        name: `${suspension.brand} ${suspension.model}`,
        price: suspension.price,
        imageUrl: suspension.imageUrl
      });
    }
  };

  const handleViewDetails = (suspension: any) => {
    window.open(suspension.productUrl, '_blank');
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {FITMENT_SUSPENSION.map((suspension) => (
        <Card
          key={suspension.id}
          className="overflow-hidden group border-neutral-800 bg-neutral-900 hover:border-neutral-500 transition-colors"
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={suspension.imageUrl} alt={suspension.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white">{suspension.brand}</p>
              <p className="text-[10px] text-neutral-300 truncate">{suspension.model}</p>
              <p className="text-[10px] text-emerald-400 font-semibold">${suspension.price}</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-xs text-neutral-400 space-y-1">
              <div>Type: {suspension.type}</div>
              {suspension.frontLowering && <div>Front Drop: {suspension.frontLowering}</div>}
              {suspension.rearLowering && <div>Rear Drop: {suspension.rearLowering}</div>}
              {suspension.frontLift && <div>Lift: {suspension.frontLift}</div>}
              {suspension.springRate && <div>Springs: {suspension.springRate}</div>}
              {suspension.adjustable && <div>Adjustable: {suspension.adjustable}</div>}
              {suspension.warranty && <div>Warranty: {suspension.warranty}</div>}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8"
                onClick={() => handleSelect(suspension)}
              >
                Select
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 text-xs h-8"
                onClick={() => handleViewDetails(suspension)}
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
