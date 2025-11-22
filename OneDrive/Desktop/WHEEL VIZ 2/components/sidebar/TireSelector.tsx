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

// Wheel-to-tire mapping for gallery pairing
const WHEEL_TO_TIRE_MAPPING = {
  'w1': 't18-1', // Anovia Kinetic (18") -> Michelin Pilot Sport 4S 18"
  'w2': 't18-2', // Kansei KNP (18") -> Toyo Proxes R888R 18"
  'w3': 't19-1', // Work Meister S1 3P (19") -> Michelin Pilot Sport 4S 19"
  'w4': 't20-1', // Ferrada FR4 (20") -> Michelin Pilot Sport 4S 20"
};

// Tire catalog - only the 8 tires paired with the 8 wheels
const FITMENT_TIRES = [
  // 1. Paired with Anovia Kinetic (18x9.5)
  {
    id: 't18-1',
    brand: 'Michelin',
    model: 'Pilot Sport 4S',
    size: '255/35R18', // 18" fitment for 9.5 width
    type: 'Max Performance Summer',
    loadIndex: '94',
    speedRating: 'Y',
    utqg: '300AA A',
    warranty: '30,000 miles',
    price: 285,
    rating: 4.9,
    reviews: 2847,
    imageUrl: '/pilot-sport-4s.png',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/michelin-pilot-sport-4s'
  },
  // 2. Paired with Kansei KNP (18x9.5)
  {
    id: 't18-2',
    brand: 'Toyo',
    model: 'Proxes R888R',
    size: '265/35R18', // 18" fitment for 9.5 width
    type: 'R-Compound / Competition',
    loadIndex: '97',
    speedRating: 'Y',
    utqg: '100 AA A',
    warranty: 'N/A',
    price: 310,
    rating: 4.7,
    reviews: 456,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Toyo+R888R+18',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/toyo-proxes-r888r'
  },
  // 3. Paired with Work Meister S1 3P (19x10)
  {
    id: 't19-1',
    brand: 'Michelin',
    model: 'Pilot Sport 4S',
    size: '275/30R19', // 19" fitment for 10 width
    type: 'Max Performance Summer',
    loadIndex: '96',
    speedRating: 'Y',
    utqg: '300AA A',
    warranty: '30,000 miles',
    price: 345,
    rating: 4.9,
    reviews: 2847,
    imageUrl: '/pilot-sport-4s.png',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/michelin-pilot-sport-4s'
  },
  // 4. Paired with Ferrada FR4 (20x10.5)
  {
    id: 't20-1',
    brand: 'Michelin',
    model: 'Pilot Sport 4S',
    size: '295/30R20', // 20" fitment for 10.5 width
    type: 'Max Performance Summer',
    loadIndex: '101',
    speedRating: 'Y',
    utqg: '300AA A',
    warranty: '30,000 miles',
    price: 445,
    rating: 4.9,
    reviews: 2847,
    imageUrl: '/pilot-sport-4s.png',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/michelin-pilot-sport-4s'
  }
];

interface TireSelectorProps {
  onProductSelect?: (product: { name: string; price: number; imageUrl?: string }) => void;
}

export const TireSelector = ({ onProductSelect }: TireSelectorProps = {}) => {
  const { addToCart, selectedProduct } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [filterBy, setFilterBy] = useState('all');

  // Detect selected wheel and get paired tire
  const selectedWheel = selectedProduct?.type === 'wheel' ? selectedProduct : null;
  const pairedTireId = selectedWheel ? WHEEL_TO_TIRE_MAPPING[selectedWheel.id as keyof typeof WHEEL_TO_TIRE_MAPPING] : null;

  const handleSelect = (tire: any) => {
    if (onProductSelect) {
      onProductSelect({
        name: `${tire.brand} ${tire.model}`,
        price: tire.price,
        imageUrl: tire.imageUrl,
        brand: tire.brand,
        model: tire.model,
        size: tire.size,
        type: tire.type,
        loadIndex: tire.loadIndex,
        speedRating: tire.speedRating,
        utqg: tire.utqg,
        warranty: tire.warranty,
        rating: tire.rating,
        reviews: tire.reviews
      });
    }
  };

  const handleViewDetails = (tire: any) => {
    window.open(tire.productUrl, '_blank');
  };

  // Get paired tires for wheel gallery - always show in wheel order when wheel selected
  const getPairedTires = () => {
    if (!selectedWheel) return null;

    // Get all wheel IDs in order
    const wheelIds = ['w1', 'w2', 'w3', 'w4'];

    // Return tires paired with wheels in the same order
    return wheelIds.map(wheelId => {
      const tireId = WHEEL_TO_TIRE_MAPPING[wheelId as keyof typeof WHEEL_TO_TIRE_MAPPING];
      return FITMENT_TIRES.find(tire => tire.id === tireId);
    }).filter(Boolean);
  };

  const pairedTires = getPairedTires();

  const filteredTires = pairedTires || FITMENT_TIRES.filter((tire) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      tire.brand.toLowerCase().includes(query) ||
      tire.model.toLowerCase().includes(query) ||
      tire.size.toLowerCase().includes(query) ||
      tire.type.toLowerCase().includes(query)
    );
    
    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'high-rated') return matchesSearch && tire.rating >= 4.5;
    if (filterBy === 'budget') return matchesSearch && tire.price < 200;
    if (filterBy === 'premium') return matchesSearch && tire.price >= 200;
    
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
          placeholder="Search tires..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:ring-purple-500/20 backdrop-blur-sm"
        />
      </div>

      {/* Paired Tires Alert */}
      {selectedWheel && (
        <div className="flex items-center px-2 py-1 bg-primary/10 border border-primary/20 rounded-md">
          <span className="text-[10px] text-primary font-medium">
            Showing tires paired with wheel gallery
          </span>
        </div>
      )}

      {/* Filter and Sort */}
      <div className="flex gap-2">
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white text-xs h-8">
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10">
            <SelectItem value="all" className="text-white text-xs">All Tires</SelectItem>
            <SelectItem value="high-rated" className="text-white text-xs">High Rated (4.5+)</SelectItem>
            <SelectItem value="budget" className="text-white text-xs">Budget (&lt;$200)</SelectItem>
            <SelectItem value="premium" className="text-white text-xs">Premium ($200+)</SelectItem>
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
        {filteredTires.map((tire) => (
        <Card
          key={tire.id}
          onClick={() => handleSelect(tire)}
          className="overflow-hidden group border-white/5 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg cursor-pointer"
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tire.imageUrl} alt={tire.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white tracking-wide">{tire.brand}</p>
              <p className="text-[10px] text-white/60 truncate">{tire.model}</p>
              <p className="text-[10px] text-purple-400 font-bold mt-0.5">${tire.price}</p>
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
                      i < Math.floor(tire.rating) ? "fill-[#CCFF00] text-[#CCFF00]" : "fill-white/10 text-white/10"
                    )}
                  />
                ))}
              </div>
              <span className="text-[9px] text-white/40 ml-1">({tire.reviews})</span>
            </div>

            <div className="text-[10px] text-white/40 space-y-1 font-medium">
              <div>Size: {tire.size}</div>
              <div>Type: {tire.type}</div>
              <div>Load/Speed: {tire.loadIndex}{tire.speedRating}</div>
              <div>Warranty: {tire.warranty}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 text-[10px] h-7 bg-[#9333ea] hover:bg-[#7e22ce] border-none text-white transition-colors font-bold uppercase tracking-wide"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(tire);
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
                  handleViewDetails(tire);
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
