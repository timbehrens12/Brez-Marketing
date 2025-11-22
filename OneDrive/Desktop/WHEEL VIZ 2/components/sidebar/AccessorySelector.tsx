'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Star, SlidersHorizontal } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Real Fitment Industries accessories data
const FITMENT_ACCESSORIES = [
  {
    id: 'a1',
    brand: 'Muteki',
    model: 'SR48 Lug Nuts',
    type: 'Lug Nuts',
    quantity: '20 Pack',
    material: 'Cold Forged Steel',
    threadSize: 'M12x1.5',
    finish: 'Burning Blue Neon',
    warranty: '1 Year',
    price: 85,
    rating: 4.8,
    reviews: 1247,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Muteki+SR48',
    productUrl: 'https://www.fitmentindustries.com/brands/muteki'
  },
  {
    id: 'a2',
    brand: 'Project Kics',
    model: 'R40 Iconix',
    type: 'Locking Lug Nuts',
    quantity: '16 + 4 Locks',
    material: 'Chromoly Steel',
    threadSize: 'M12x1.25',
    finish: 'Neochrome',
    warranty: 'N/A',
    price: 280,
    rating: 4.9,
    reviews: 892,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Kics+R40',
    productUrl: 'https://www.fitmentindustries.com/brands/project-kics'
  },
  {
    id: 'a3',
    brand: 'Mishimoto',
    model: 'Valve Stem Caps',
    type: 'Valve Caps',
    quantity: '4 Pack',
    material: 'Aluminum',
    threadSize: 'Universal',
    finish: 'Neon Yellow',
    warranty: 'Lifetime',
    price: 15,
    rating: 4.5,
    reviews: 456,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Mishimoto+Cap',
    productUrl: 'https://www.fitmentindustries.com/brands/mishimoto'
  },
  {
    id: 'a4',
    brand: 'Fitment Ind.',
    model: 'Plate Frame',
    type: 'License Plate Frame',
    quantity: '1 Frame',
    material: 'Plastic',
    threadSize: 'N/A',
    finish: 'Black / White Text',
    warranty: 'N/A',
    price: 10,
    rating: 4.2,
    reviews: 234,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=FI+Frame',
    productUrl: 'https://www.fitmentindustries.com/store/accessories'
  },
  {
    id: 'a5',
    brand: 'Gorilla',
    model: 'Hub Centric Rings',
    type: 'Hub Rings',
    quantity: '4 Pack',
    material: 'Polycarbonate',
    threadSize: '73.1mm to 56.1mm',
    finish: 'Black',
    warranty: '1 Year',
    price: 25,
    rating: 4.6,
    reviews: 678,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Gorilla+Rings',
    productUrl: 'https://www.fitmentindustries.com/brands/gorilla'
  },
  {
    id: 'a6',
    brand: 'NRG',
    model: 'Extended Lugs',
    type: 'Lug Nuts',
    quantity: '20 Pack',
    material: '7075 Aluminum',
    threadSize: 'M12x1.5',
    finish: 'Purple',
    warranty: '1 Year',
    price: 95,
    rating: 4.7,
    reviews: 534,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=NRG+Lugs',
    productUrl: 'https://www.fitmentindustries.com/brands/nrg-innovations'
  },
  {
    id: 'a7',
    brand: 'Spike',
    model: 'Valve Stem Caps',
    type: 'Valve Caps',
    quantity: '4 Pack',
    material: 'Aluminum',
    threadSize: 'Universal',
    finish: 'Red Anodized',
    warranty: 'N/A',
    price: 12,
    rating: 4.3,
    reviews: 312,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Spike+Caps',
    productUrl: 'https://www.fitmentindustries.com/store/accessories'
  },
  {
    id: 'a8',
    brand: 'SickSpeed',
    model: 'Spiked Lug Nuts',
    type: 'Lug Nuts',
    quantity: '20 Pack',
    material: 'Steel Base / Alum Tip',
    threadSize: 'M12x1.5',
    finish: 'Gold',
    warranty: '1 Year',
    price: 115,
    rating: 4.4,
    reviews: 267,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=SickSpeed',
    productUrl: 'https://www.fitmentindustries.com/brands/sickspeed'
  }
];

interface AccessorySelectorProps {
  onProductSelect?: (product: { name: string; price: number; imageUrl?: string }) => void;
}

export const AccessorySelector = ({ onProductSelect }: AccessorySelectorProps = {}) => {
  const { addToCart } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [filterBy, setFilterBy] = useState('all');

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

  const filteredAccessories = FITMENT_ACCESSORIES.filter((accessory) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      accessory.brand.toLowerCase().includes(query) ||
      accessory.model.toLowerCase().includes(query) ||
      accessory.type.toLowerCase().includes(query)
    );
    
    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'high-rated') return matchesSearch && accessory.rating >= 4.5;
    if (filterBy === 'budget') return matchesSearch && accessory.price < 50;
    if (filterBy === 'premium') return matchesSearch && accessory.price >= 50;
    
    return matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'popular') return b.reviews - a.reviews;
    return 0;
  });

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
        <Input
          type="text"
          placeholder="Search accessories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20 backdrop-blur-sm"
        />
      </div>

      {/* Filter and Sort */}
      <div className="flex gap-2">
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white text-xs h-8">
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Accessories</SelectItem>
            <SelectItem value="high-rated" className="text-white text-xs">High Rated (4.5+)</SelectItem>
            <SelectItem value="budget" className="text-white text-xs">Budget (&lt;$50)</SelectItem>
            <SelectItem value="premium" className="text-white text-xs">Premium ($50+)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white text-xs h-8">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            <SelectItem value="popular" className="text-white text-xs">Most Popular</SelectItem>
            <SelectItem value="rating" className="text-white text-xs">Highest Rated</SelectItem>
            <SelectItem value="price-low" className="text-white text-xs">Price: Low to High</SelectItem>
            <SelectItem value="price-high" className="text-white text-xs">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredAccessories.map((accessory) => (
        <Card
          key={accessory.id}
          onClick={() => handleSelect(accessory)}
          className="overflow-hidden group border-white/5 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg cursor-pointer"
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={accessory.imageUrl} alt={accessory.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white tracking-wide">{accessory.brand}</p>
              <p className="text-[10px] text-white/60 truncate">{accessory.model}</p>
              <p className="text-[10px] text-purple-400 font-bold mt-0.5">${accessory.price}</p>
            </div>
          </div>
          <div className="p-3 space-y-3 bg-black/20">
            {/* Reviews */}
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3 h-3",
                      i < Math.floor(accessory.rating) ? "fill-[#CCFF00] text-[#CCFF00]" : "fill-white/10 text-white/10"
                    )}
                  />
                ))}
              </div>
              <span className="text-[9px] text-white/40 ml-1">({accessory.reviews})</span>
            </div>

            <div className="text-[10px] text-white/40 space-y-1 font-medium">
              <div>Type: {accessory.type}</div>
              <div>Qty: {accessory.quantity}</div>
              {accessory.threadSize && <div>Thread: {accessory.threadSize}</div>}
              {accessory.finish && <div>Finish: {accessory.finish}</div>}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 text-[10px] h-7 bg-[#9333ea] hover:bg-[#7e22ce] border-none text-white transition-colors font-bold uppercase tracking-wide"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(accessory);
                }}
              >
                Select
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 text-[10px] h-7 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors uppercase tracking-wide"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(accessory);
                }}
              >
                Details
              </Button>
            </div>
            <Button
              size="sm"
              className="w-full text-[10px] h-7 bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold border-none transition-colors flex items-center justify-center gap-2 uppercase tracking-wide shadow-[0_0_15px_rgba(204,255,0,0.3)] hover:shadow-[0_0_20px_rgba(204,255,0,0.5)]"
              onClick={(e) => {
                e.stopPropagation();
                addToCart();
              }}
            >
              <ShoppingCart className="w-3 h-3" />
              Add To Cart
            </Button>
          </div>
        </Card>
        ))}
      </div>
    </div>
  );
};
