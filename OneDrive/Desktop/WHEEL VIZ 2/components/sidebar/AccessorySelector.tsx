'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Realistic Fitment Industries accessory data
const FITMENT_ACCESSORIES = [
  {
    id: 'a1',
    brand: 'McGard',
    model: 'Chrome Cone Seat Wheel Locks',
    type: 'Wheel Locks',
    quantity: '4 Locks + Key',
    material: 'Chrome',
    price: 89,
    imageUrl: 'https://i.imgur.com/placeholder-acc1.jpg',
    productUrl: 'https://fitmentindustries.com/products/mcgard-chrome-cone-seat-wheel-locks'
  },
  {
    id: 'a2',
    brand: 'Dorman',
    model: 'Wheel Center Caps',
    type: 'Center Caps',
    quantity: '4 Caps',
    finish: 'Chrome',
    price: 49,
    imageUrl: 'https://i.imgur.com/placeholder-acc2.jpg',
    productUrl: 'https://fitmentindustries.com/products/dorman-chrome-wheel-center-caps'
  },
  {
    id: 'a3',
    brand: 'Gorilla Automotive',
    model: '14x1.5 Lug Nuts',
    type: 'Lug Nuts',
    quantity: '20 Nuts',
    thread: '14x1.5',
    price: 69,
    imageUrl: 'https://i.imgur.com/placeholder-acc3.jpg',
    productUrl: 'https://fitmentindustries.com/products/gorilla-automotive-14x1-5-lug-nuts'
  },
  {
    id: 'a4',
    brand: 'ACDelco',
    model: 'Wheel Bearing Hub Assembly',
    type: 'Hub Assembly',
    application: 'Front Driver Side',
    price: 129,
    imageUrl: 'https://i.imgur.com/placeholder-acc4.jpg',
    productUrl: 'https://fitmentindustries.com/products/acdelco-wheel-bearing-hub-assembly'
  },
  {
    id: 'a5',
    brand: 'Mopar',
    model: 'TPMS Sensors',
    type: 'TPMS Sensors',
    quantity: '4 Sensors',
    application: 'OE Replacement',
    price: 179,
    imageUrl: 'https://i.imgur.com/placeholder-acc5.jpg',
    productUrl: 'https://fitmentindustries.com/products/mopar-tpms-sensors'
  },
  {
    id: 'a6',
    brand: 'Bosch',
    model: 'Wheel Speed Sensor',
    type: 'ABS Sensor',
    application: 'Front/Rear',
    quantity: '2 Sensors',
    price: 89,
    imageUrl: 'https://i.imgur.com/placeholder-acc6.jpg',
    productUrl: 'https://fitmentindustries.com/products/bosch-wheel-speed-sensors'
  },
  {
    id: 'a7',
    brand: 'Duralast',
    model: 'Brake Rotor Set',
    type: 'Brake Rotors',
    application: 'Front',
    quantity: '2 Rotors',
    price: 149,
    imageUrl: 'https://i.imgur.com/placeholder-acc7.jpg',
    productUrl: 'https://fitmentindustries.com/products/duralast-brake-rotor-set'
  },
  {
    id: 'a8',
    brand: 'Akebono',
    model: 'Ceramic Brake Pads',
    type: 'Brake Pads',
    application: 'Front/Rear',
    quantity: '1 Axle Set',
    price: 79,
    imageUrl: 'https://i.imgur.com/placeholder-acc8.jpg',
    productUrl: 'https://fitmentindustries.com/products/akebono-ceramic-brake-pads'
  }
];

interface AccessorySelectorProps {
  onProductSelect?: (product: { name: string; price: number; imageUrl?: string }) => void;
}

export const AccessorySelector = ({ onProductSelect }: AccessorySelectorProps = {}) => {
  const handleSelect = (accessory: any) => {
    if (onProductSelect) {
      onProductSelect({
        name: `${accessory.brand} ${accessory.model}`,
        price: accessory.price,
        imageUrl: accessory.imageUrl
      });
    }
  };

  const handleViewDetails = (accessory: any) => {
    window.open(accessory.productUrl, '_blank');
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {FITMENT_ACCESSORIES.map((accessory) => (
        <Card
          key={accessory.id}
          className="overflow-hidden group border-neutral-800 bg-neutral-900 hover:border-neutral-500 transition-colors"
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={accessory.imageUrl} alt={accessory.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white">{accessory.brand}</p>
              <p className="text-[10px] text-neutral-300 truncate">{accessory.model}</p>
              <p className="text-[10px] text-emerald-400 font-semibold">${accessory.price}</p>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="text-xs text-neutral-400 space-y-1">
              <div>Type: {accessory.type}</div>
              <div>Qty: {accessory.quantity}</div>
              {accessory.thread && <div>Thread: {accessory.thread}</div>}
              {accessory.application && <div>Application: {accessory.application}</div>}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-8"
                onClick={() => handleSelect(accessory)}
              >
                Select
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 text-xs h-8"
                onClick={() => handleViewDetails(accessory)}
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
