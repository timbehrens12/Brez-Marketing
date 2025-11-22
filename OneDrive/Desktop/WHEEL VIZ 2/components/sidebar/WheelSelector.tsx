
'use client';

import React, { useState } from 'react';
import { useStore, Product } from '@/store/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShoppingCart, Star, SlidersHorizontal } from 'lucide-react';
import { generateImageAction } from '@/actions/generate';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Wheel gallery with real Fitment Industries data
const FITMENT_WHEELS = [
  {
    id: 'w1',
    type: 'wheel',
    brand: 'Anovia',
    model: 'Kinetic',
    finish: 'Deco Directional',
    diameter: 18,
    width: 9.5,
    offset: 35,
    boltPattern: '5x114.3',
    price: 270,
    rating: 4.5,
    reviews: 127,
    imageUrl: '/anovia-kinetic.png',
    productUrl: 'https://www.fitmentindustries.com/buy-wheel-offset/ART189551143573/anovia-kinetic-18x95-35'
  },
  {
    id: 'w2',
    type: 'wheel',
    brand: 'Kansei',
    model: 'KNP',
    finish: 'Gloss Gunmetal',
    diameter: 18,
    width: 9.5,
    offset: 22,
    boltPattern: '5x114.3',
    price: 315,
    rating: 4.8,
    reviews: 203,
    imageUrl: '/kansei-knp.png',
    productUrl: 'https://www.fitmentindustries.com/buy-wheel-offset/K11-189512TB/kansei-knp-18x95-22'
  },
  {
    id: 'w3',
    type: 'wheel',
    brand: 'Work',
    model: 'Meister S1 3P',
    finish: 'White / Polished Lip',
    diameter: 19,
    width: 10,
    offset: 20,
    boltPattern: '5x114.3',
    price: 950,
    rating: 5.0,
    reviews: 67,
    imageUrl: '/work-meister.png',
    productUrl: 'https://www.fitmentindustries.com/brands/work-wheels'
  },
  {
    id: 'w4',
    type: 'wheel',
    brand: 'Ferrada',
    model: 'FR4',
    finish: 'Machine Silver / Chrome Lip',
    diameter: 20,
    width: 10.5,
    offset: 28,
    boltPattern: '5x114.3',
    price: 540,
    rating: 4.8,
    reviews: 156,
    imageUrl: '/ferrada-fr4.png',
    productUrl: 'https://www.fitmentindustries.com/buy-wheel-offset/FR420105511428MS/ferrada-fr4-20x105-28'
  }
];

interface WheelSelectorProps {
  onProductSelect?: (product: { name: string; price: number; imageUrl?: string }) => void;
}

export const WheelSelector = ({ onProductSelect }: WheelSelectorProps = {}) => {
  const { selectedProduct, setSelectedProduct, setIsGenerating, addGenerationStep, clearGenerationSteps, currentImage, setCurrentImage, addToCart } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [filterBy, setFilterBy] = useState('all');

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

  const filteredWheels = FITMENT_WHEELS.filter((wheel) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      wheel.brand.toLowerCase().includes(query) ||
      wheel.model.toLowerCase().includes(query) ||
      wheel.finish.toLowerCase().includes(query) ||
      wheel.boltPattern.toLowerCase().includes(query)
    );
    
    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'high-rated') return matchesSearch && wheel.rating >= 4.5;
    if (filterBy === 'budget') return matchesSearch && wheel.price < 300;
    if (filterBy === 'premium') return matchesSearch && wheel.price >= 300;
    
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
          placeholder="Search wheels..."
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
            <SelectItem value="all" className="text-white text-xs">All Wheels</SelectItem>
            <SelectItem value="high-rated" className="text-white text-xs">High Rated (4.5+)</SelectItem>
            <SelectItem value="budget" className="text-white text-xs">Budget (&lt;$300)</SelectItem>
            <SelectItem value="premium" className="text-white text-xs">Premium ($300+)</SelectItem>
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
        {filteredWheels.map((wheel) => (
        <Card
          key={wheel.id}
          onClick={() => handleSelect(wheel)}
          className={cn(
            "overflow-hidden group border-white/5 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-lg cursor-pointer",
            selectedProduct?.id === wheel.id ? "border-purple-500/50 bg-purple-500/10 shadow-[0_0_20px_rgba(147,51,234,0.2)]" : ""
          )}
        >
          <div className="aspect-square relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={wheel.imageUrl} 
              alt={wheel.model} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              crossOrigin="anonymous"
              onError={(e) => {
                // Fallback to a placeholder if image fails to load
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23222" width="400" height="400"/%3E%3Ctext fill="%23666" font-family="sans-serif" font-size="48" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EWheel%3C/text%3E%3C/svg%3E';
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
              <p className="text-xs font-bold text-white tracking-wide">{wheel.brand}</p>
              <p className="text-[10px] text-white/60 truncate">{wheel.model}</p>
              <p className="text-[10px] text-purple-400 font-bold mt-0.5">${wheel.price}</p>
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
                      i < Math.floor(wheel.rating) ? "fill-[#CCFF00] text-[#CCFF00]" : "fill-white/10 text-white/10"
                    )}
                  />
                ))}
              </div>
              <span className="text-[9px] text-white/40 ml-1">({wheel.reviews})</span>
            </div>

            <div className="text-[10px] text-white/40 space-y-1 font-medium">
              <div>{wheel.diameter}x{wheel.width} +{wheel.offset}</div>
              <div>{wheel.boltPattern}</div>
              <div>{wheel.finish}</div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 text-[10px] h-7 bg-[#9333ea] hover:bg-[#7e22ce] border-none text-white transition-colors font-bold uppercase tracking-wide"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(wheel);
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
                  handleViewDetails(wheel);
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
