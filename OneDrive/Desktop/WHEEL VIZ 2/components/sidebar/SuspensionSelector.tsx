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

// Comprehensive suspension catalog with real Fitment Industries data
const FITMENT_SUSPENSION = [
  {
    id: 's1',
    brand: 'BC Racing',
    model: 'BR Series Coilovers',
    type: 'Coilovers',
    frontLowering: '1.0-3.0"',
    rearLowering: '1.0-3.0"',
    springRate: '10K/8K',
    adjustable: '30-Way Damping',
    warranty: '1 Year',
    price: 1195,
    rating: 4.7,
    reviews: 892,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=BC+Racing+BR',
    productUrl: 'https://www.fitmentindustries.com/brands/bc-racing'
  },
  {
    id: 's2',
    brand: 'Air Lift',
    model: 'Performance 3P System',
    type: 'Air Suspension',
    frontLowering: 'Adjustable',
    rearLowering: 'Adjustable',
    springRate: 'Air Springs',
    adjustable: 'Digital Management',
    warranty: '1 Year',
    price: 3800,
    rating: 4.9,
    reviews: 456,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Air+Lift+3P',
    productUrl: 'https://www.fitmentindustries.com/brands/air-lift-performance'
  },
  {
    id: 's3',
    brand: 'Tein',
    model: 'Flex Z Coilovers',
    type: 'Coilovers',
    frontLowering: '0.8-2.4"',
    rearLowering: '0.8-2.2"',
    springRate: '8K/6K',
    adjustable: '16-Way Damping',
    warranty: '1 Year',
    price: 930,
    rating: 4.6,
    reviews: 623,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Tein+Flex+Z',
    productUrl: 'https://www.fitmentindustries.com/brands/tein'
  },
  {
    id: 's4',
    brand: 'H&R',
    model: 'Sport Springs',
    type: 'Lowering Springs',
    frontLowering: '1.5"',
    rearLowering: '1.4"',
    springRate: 'Progressive',
    adjustable: 'No',
    warranty: 'Lifetime',
    price: 280,
    rating: 4.5,
    reviews: 1247,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=H%26R+Springs',
    productUrl: 'https://www.fitmentindustries.com/brands/h-r'
  },
  {
    id: 's5',
    brand: 'KW',
    model: 'Variant 3 Coilovers',
    type: 'Coilovers',
    frontLowering: '0.8-2.0"',
    rearLowering: '0.8-2.0"',
    springRate: 'Progressive',
    adjustable: 'Rebound & Compression',
    warranty: 'Lifetime',
    price: 2800,
    rating: 5.0,
    reviews: 234,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=KW+Variant+3',
    productUrl: 'https://www.fitmentindustries.com/brands/kw-suspension'
  },
  {
    id: 's6',
    brand: 'Bilstein',
    model: 'B14 PSS Kit',
    type: 'Coilovers',
    frontLowering: '30-50mm',
    rearLowering: '30-50mm',
    springRate: 'Progressive',
    adjustable: 'Height Only',
    warranty: 'Lifetime',
    price: 1100,
    rating: 4.8,
    reviews: 567,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Bilstein+B14',
    productUrl: 'https://www.fitmentindustries.com/brands/bilstein'
  },
  {
    id: 's7',
    brand: 'Eibach',
    model: 'Pro-Kit Springs',
    type: 'Lowering Springs',
    frontLowering: '1.0"',
    rearLowering: '1.0"',
    springRate: 'Progressive',
    adjustable: 'No',
    warranty: 'Million Mile',
    price: 295,
    rating: 4.6,
    reviews: 1834,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Eibach+Pro',
    productUrl: 'https://www.fitmentindustries.com/brands/eibach'
  },
  {
    id: 's8',
    brand: 'Fortune Auto',
    model: '500 Series',
    type: 'Coilovers',
    frontLowering: '1.0-3.0"',
    rearLowering: '1.0-3.0"',
    springRate: 'Custom',
    adjustable: '24-Way Damping',
    warranty: '5 Years',
    price: 1799,
    rating: 4.9,
    reviews: 312,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Fortune+500',
    productUrl: 'https://www.fitmentindustries.com/brands/fortune-auto'
  }
];

interface SuspensionSelectorProps {
  onProductSelect?: (product: { name: string; price: number; imageUrl?: string }) => void;
}

export const SuspensionSelector = ({ onProductSelect }: SuspensionSelectorProps = {}) => {
  const { addToCart } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [filterBy, setFilterBy] = useState('all');

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

  const filteredSuspension = FITMENT_SUSPENSION.filter((suspension) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      suspension.brand.toLowerCase().includes(query) ||
      suspension.model.toLowerCase().includes(query) ||
      suspension.type.toLowerCase().includes(query)
    );
    
    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'high-rated') return matchesSearch && suspension.rating >= 4.5;
    if (filterBy === 'budget') return matchesSearch && suspension.price < 1000;
    if (filterBy === 'premium') return matchesSearch && suspension.price >= 1000;
    
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
          placeholder="Search suspension..."
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
            <SelectItem value="all" className="text-white text-xs">All Suspension</SelectItem>
            <SelectItem value="high-rated" className="text-white text-xs">High Rated (4.5+)</SelectItem>
            <SelectItem value="budget" className="text-white text-xs">Budget (&lt;$1000)</SelectItem>
            <SelectItem value="premium" className="text-white text-xs">Premium ($1000+)</SelectItem>
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
        {filteredSuspension.map((suspension) => (
        <Card
          key={suspension.id}
          onClick={() => handleSelect(suspension)}
          className="overflow-hidden group border-white/5 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg cursor-pointer"
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={suspension.imageUrl} alt={suspension.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white tracking-wide">{suspension.brand}</p>
              <p className="text-[10px] text-white/60 truncate">{suspension.model}</p>
              <p className="text-[10px] text-purple-400 font-bold mt-0.5">${suspension.price}</p>
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
                      i < Math.floor(suspension.rating) ? "fill-[#CCFF00] text-[#CCFF00]" : "fill-white/10 text-white/10"
                    )}
                  />
                ))}
              </div>
              <span className="text-[9px] text-white/40 ml-1">({suspension.reviews})</span>
            </div>

            <div className="text-[10px] text-white/40 space-y-1 font-medium">
              <div>Type: {suspension.type}</div>
              {suspension.frontLowering && <div>F Drop: {suspension.frontLowering}</div>}
              {suspension.rearLowering && <div>R Drop: {suspension.rearLowering}</div>}
              {suspension.springRate && <div>Springs: {suspension.springRate}</div>}
              {suspension.adjustable && <div>Adj: {suspension.adjustable}</div>}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 text-[10px] h-7 bg-[#9333ea] hover:bg-[#7e22ce] border-none text-white transition-colors font-bold uppercase tracking-wide"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(suspension);
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
                  handleViewDetails(suspension);
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
