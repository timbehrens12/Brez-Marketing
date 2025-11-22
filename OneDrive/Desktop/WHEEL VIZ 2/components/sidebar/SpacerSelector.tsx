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

// Real Fitment Industries spacer data
const FITMENT_SPACERS = [
  {
    id: 'sp1',
    brand: 'H&R',
    model: 'Trak+ DRM System',
    thickness: '20mm',
    boltPattern: '5x114.3',
    material: 'Aluminum / Magnesium Alloy',
    finish: 'Hard Anodized',
    studLength: 'Included',
    warranty: 'Lifetime',
    price: 160,
    rating: 4.8,
    reviews: 456,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=H%26R+Trak%2B',
    productUrl: 'https://www.fitmentindustries.com/brands/h-r'
  },
  {
    id: 'sp2',
    brand: 'Eibach',
    model: 'Pro-Spacer Kit',
    thickness: '15mm',
    boltPattern: '5x114.3',
    material: 'Aircraft Grade Aluminum',
    finish: 'Anodized',
    studLength: 'Extended Studs',
    warranty: 'Million Mile',
    price: 145,
    rating: 4.7,
    reviews: 623,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Eibach+Spacer',
    productUrl: 'https://www.fitmentindustries.com/brands/eibach'
  },
  {
    id: 'sp3',
    brand: 'Fitment Ind.',
    model: 'Slip-On Spacers',
    thickness: '5mm',
    boltPattern: 'Universal',
    material: 'Cast Aluminum',
    finish: 'Raw',
    studLength: 'Stock',
    warranty: '1 Year',
    price: 45,
    rating: 4.2,
    reviews: 234,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=FI+Spacer',
    productUrl: 'https://www.fitmentindustries.com/store/spacers'
  },
  {
    id: 'sp4',
    brand: 'Blox Racing',
    model: 'Forged Spacers',
    thickness: '25mm',
    boltPattern: '5x114.3',
    material: '7075-T6 Aluminum',
    finish: 'Black Anodized',
    studLength: 'Included',
    warranty: '1 Year',
    price: 110,
    rating: 4.5,
    reviews: 189,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Blox+Spacer',
    productUrl: 'https://www.fitmentindustries.com/brands/blox-racing'
  },
  {
    id: 'sp5',
    brand: 'Perrin',
    model: 'Wheel Spacers',
    thickness: '20mm',
    boltPattern: '5x114.3',
    material: '6061 Aluminum',
    finish: 'Black',
    studLength: 'Included',
    warranty: '5 Year',
    price: 185,
    rating: 4.9,
    reviews: 312,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Perrin+Spacer',
    productUrl: 'https://www.fitmentindustries.com/brands/perrin-performance'
  },
  {
    id: 'sp6',
    brand: 'H&R',
    model: 'Trak+ DRS System',
    thickness: '5mm',
    boltPattern: '5x114.3',
    material: 'Aluminum / Magnesium Alloy',
    finish: 'Silver',
    studLength: 'Re-use Stock',
    warranty: 'Lifetime',
    price: 75,
    rating: 4.6,
    reviews: 567,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=H%26R+DRS',
    productUrl: 'https://www.fitmentindustries.com/brands/h-r'
  },
  {
    id: 'sp7',
    brand: 'ST Suspensions',
    model: 'DZX Spacers',
    thickness: '12.5mm',
    boltPattern: 'Multi',
    material: 'Composite',
    finish: 'Black',
    studLength: 'Extended Bolts',
    warranty: '1 Year',
    price: 120,
    rating: 4.4,
    reviews: 145,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=ST+Spacer',
    productUrl: 'https://www.fitmentindustries.com/brands/st-suspensions'
  },
  {
    id: 'sp8',
    brand: 'Mishimoto',
    model: 'Borne Off-Road',
    thickness: '1.5"',
    boltPattern: '6x139.7',
    material: '6061-T6 Aluminum',
    finish: 'Blue Anodized',
    studLength: 'Included',
    warranty: 'Lifetime',
    price: 135,
    rating: 4.7,
    reviews: 278,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Mishimoto',
    productUrl: 'https://www.fitmentindustries.com/brands/mishimoto'
  }
];

interface SpacerSelectorProps {
  onProductSelect?: (product: { name: string; price: number; imageUrl?: string }) => void;
}

export const SpacerSelector = ({ onProductSelect }: SpacerSelectorProps = {}) => {
  const { addToCart } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [filterBy, setFilterBy] = useState('all');

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

  const filteredSpacers = FITMENT_SPACERS.filter((spacer) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      spacer.brand.toLowerCase().includes(query) ||
      spacer.model.toLowerCase().includes(query) ||
      spacer.thickness.toLowerCase().includes(query) ||
      spacer.boltPattern.toLowerCase().includes(query)
    );
    
    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'high-rated') return matchesSearch && spacer.rating >= 4.5;
    if (filterBy === 'budget') return matchesSearch && spacer.price < 100;
    if (filterBy === 'premium') return matchesSearch && spacer.price >= 100;
    
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
          placeholder="Search spacers..."
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
            <SelectItem value="all" className="text-white text-xs">All Spacers</SelectItem>
            <SelectItem value="high-rated" className="text-white text-xs">High Rated (4.5+)</SelectItem>
            <SelectItem value="budget" className="text-white text-xs">Budget (&lt;$100)</SelectItem>
            <SelectItem value="premium" className="text-white text-xs">Premium ($100+)</SelectItem>
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
        {filteredSpacers.map((spacer) => (
        <Card
          key={spacer.id}
          onClick={() => handleSelect(spacer)}
          className="overflow-hidden group border-white/5 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg cursor-pointer"
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spacer.imageUrl} alt={spacer.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white tracking-wide">{spacer.brand}</p>
              <p className="text-[10px] text-white/60 truncate">{spacer.model}</p>
              <p className="text-[10px] text-purple-400 font-bold mt-0.5">${spacer.price}</p>
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
                      i < Math.floor(spacer.rating) ? "fill-[#CCFF00] text-[#CCFF00]" : "fill-white/10 text-white/10"
                    )}
                  />
                ))}
              </div>
              <span className="text-[9px] text-white/40 ml-1">({spacer.reviews})</span>
            </div>

            <div className="text-[10px] text-white/40 space-y-1 font-medium">
              <div>Thickness: {spacer.thickness}</div>
              <div>Bolt: {spacer.boltPattern}</div>
              <div>Material: {spacer.material}</div>
              <div>Finish: {spacer.finish}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 text-[10px] h-7 bg-[#9333ea] hover:bg-[#7e22ce] border-none text-white transition-colors font-bold uppercase tracking-wide"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(spacer);
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
                  handleViewDetails(spacer);
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
