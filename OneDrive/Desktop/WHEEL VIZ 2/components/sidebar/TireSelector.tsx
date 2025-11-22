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
  'w3': 't18-3', // Enkei RPF1 (18") -> Continental ExtremeContact DWS06 Plus 18"
  'w4': 't18-4', // Konig Ampliform (18") -> Nitto NT555 G2 18"
  'w5': 't19-1', // Work Meister S1 3P (19") -> Michelin Pilot Sport 4S 19"
  'w6': 't18-5', // Rotiform LAS-R (18") -> Achilles ATR Sport 2 18"
  'w7': 't19-2', // Cosmis Racing XT-206R (18") -> Nitto NT555 G2 19" (close fit)
  'w8': 't19-3', // Aodhan DS02 (19") -> Hankook Ventus V12 evo2 19"
};

// Comprehensive tire catalog with real Fitment Industries data
const FITMENT_TIRES = [
  // --- 17 Inch Tires ---
  {
    id: 't17-1',
    brand: 'Michelin',
    model: 'Pilot Sport 4S',
    size: '225/45R17',
    type: 'Max Performance Summer',
    loadIndex: '94',
    speedRating: 'Y',
    utqg: '300AA A',
    warranty: '30,000 miles',
    price: 220,
    rating: 4.9,
    reviews: 2847,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Michelin+PS4S+17',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/michelin-pilot-sport-4s'
  },
  {
    id: 't17-2',
    brand: 'Toyo',
    model: 'Proxes R888R',
    size: '235/40R17',
    type: 'R-Compound / Competition',
    loadIndex: '90',
    speedRating: 'W',
    utqg: '100 AA A',
    warranty: 'N/A',
    price: 245,
    rating: 4.7,
    reviews: 456,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Toyo+R888R+17',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/toyo-proxes-r888r'
  },
  {
    id: 't17-3',
    brand: 'Continental',
    model: 'ExtremeContact DWS06 Plus',
    size: '225/45R17',
    type: 'Ultra High Perf All-Season',
    loadIndex: '91',
    speedRating: 'W',
    utqg: '560AA A',
    warranty: '50,000 miles',
    price: 170,
    rating: 4.8,
    reviews: 1923,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Conti+DWS06+17',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/continental-extremecontact-dws06-plus'
  },

  // --- 18 Inch Tires ---
  {
    id: 't18-1',
    brand: 'Michelin',
    model: 'Pilot Sport 4S',
    size: '245/40R18',
    type: 'Max Performance Summer',
    loadIndex: '97',
    speedRating: 'Y',
    utqg: '300AA A',
    warranty: '30,000 miles',
    price: 285,
    rating: 4.9,
    reviews: 2847,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Michelin+PS4S+18',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/michelin-pilot-sport-4s'
  },
  {
    id: 't18-2',
    brand: 'Toyo',
    model: 'Proxes R888R',
    size: '265/35R18',
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
  {
    id: 't18-3',
    brand: 'Continental',
    model: 'ExtremeContact DWS06 Plus',
    size: '245/40R18',
    type: 'Ultra High Perf All-Season',
    loadIndex: '97',
    speedRating: 'Y',
    utqg: '560AA A',
    warranty: '50,000 miles',
    price: 215,
    rating: 4.8,
    reviews: 1923,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Conti+DWS06+18',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/continental-extremecontact-dws06-plus'
  },
  {
    id: 't18-4',
    brand: 'Nitto',
    model: 'NT555 G2',
    size: '245/40R18',
    type: 'Ultra High Perf Summer',
    loadIndex: '97',
    speedRating: 'Y',
    utqg: '320AA A',
    warranty: 'N/A',
    price: 195,
    rating: 4.5,
    reviews: 678,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Nitto+NT555+18',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/nitto-nt555-g2'
  },
  {
    id: 't18-5',
    brand: 'Achilles',
    model: 'ATR Sport 2',
    size: '225/40R18',
    type: 'Performance Summer',
    loadIndex: '92',
    speedRating: 'W',
    utqg: '400AA A',
    warranty: '35,000 miles',
    price: 98,
    rating: 4.1,
    reviews: 423,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Achilles+ATR+18',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/achilles-atr-sport-2'
  },

  // --- 19 Inch Tires ---
  {
    id: 't19-1',
    brand: 'Michelin',
    model: 'Pilot Sport 4S',
    size: '255/35R19',
    type: 'Max Performance Summer',
    loadIndex: '96',
    speedRating: 'Y',
    utqg: '300AA A',
    warranty: '30,000 miles',
    price: 320,
    rating: 4.9,
    reviews: 2847,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Michelin+PS4S+19',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/michelin-pilot-sport-4s'
  },
  {
    id: 't19-2',
    brand: 'Nitto',
    model: 'NT555 G2',
    size: '255/35R19',
    type: 'Ultra High Perf Summer',
    loadIndex: '96',
    speedRating: 'Y',
    utqg: '320AA A',
    warranty: 'N/A',
    price: 205,
    rating: 4.5,
    reviews: 678,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Nitto+NT555+19',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/nitto-nt555-g2'
  },
  {
    id: 't19-3',
    brand: 'Hankook',
    model: 'Ventus V12 evo2',
    size: '255/35R19',
    type: 'Max Performance Summer',
    loadIndex: '96',
    speedRating: 'Y',
    utqg: '320AA A',
    warranty: 'N/A',
    price: 210,
    rating: 4.6,
    reviews: 892,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Hankook+V12+19',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/hankook-ventus-v12-evo2'
  },
  {
    id: 't19-4',
    brand: 'Toyo',
    model: 'Proxes R888R',
    size: '265/30R19',
    type: 'R-Compound / Competition',
    loadIndex: '93',
    speedRating: 'Y',
    utqg: '100 AA A',
    warranty: 'N/A',
    price: 345,
    rating: 4.7,
    reviews: 456,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Toyo+R888R+19',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/toyo-proxes-r888r'
  },

  // --- 20 Inch Tires ---
  {
    id: 't20-1',
    brand: 'Michelin',
    model: 'Pilot Sport 4S',
    size: '265/30R20',
    type: 'Max Performance Summer',
    loadIndex: '94',
    speedRating: 'Y',
    utqg: '300AA A',
    warranty: '30,000 miles',
    price: 385,
    rating: 4.9,
    reviews: 2847,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Michelin+PS4S+20',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/michelin-pilot-sport-4s'
  },
  {
    id: 't20-2',
    brand: 'Continental',
    model: 'ExtremeContact DWS06 Plus',
    size: '275/30R20',
    type: 'Ultra High Perf All-Season',
    loadIndex: '97',
    speedRating: 'Y',
    utqg: '560AA A',
    warranty: '50,000 miles',
    price: 295,
    rating: 4.8,
    reviews: 1923,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Conti+DWS06+20',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/continental-extremecontact-dws06-plus'
  },
  {
    id: 't20-3',
    brand: 'Nitto',
    model: 'NT555 G2',
    size: '275/30R20',
    type: 'Ultra High Perf Summer',
    loadIndex: '97',
    speedRating: 'W',
    utqg: '320AA A',
    warranty: 'N/A',
    price: 245,
    rating: 4.5,
    reviews: 678,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Nitto+NT555+20',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/nitto-nt555-g2'
  },

  // --- 21 Inch Tires ---
  {
    id: 't21-1',
    brand: 'Michelin',
    model: 'Pilot Sport 4S',
    size: '295/25R21',
    type: 'Max Performance Summer',
    loadIndex: '96',
    speedRating: 'Y',
    utqg: '300AA A',
    warranty: '30,000 miles',
    price: 450,
    rating: 4.9,
    reviews: 2847,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Michelin+PS4S+21',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/michelin-pilot-sport-4s'
  },
  {
    id: 't21-2',
    brand: 'Pirelli',
    model: 'P Zero',
    size: '295/30R21',
    type: 'Max Performance Summer',
    loadIndex: '102',
    speedRating: 'Y',
    utqg: '220 AA A',
    warranty: 'N/A',
    price: 420,
    rating: 4.7,
    reviews: 1205,
    imageUrl: 'https://placehold.co/400x400/1a1a1a/8B5CF6?text=Pirelli+PZero+21',
    productUrl: 'https://www.fitmentindustries.com/buy-tires/pirelli-p-zero'
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
  const [showAllSizes, setShowAllSizes] = useState(false);

  // Detect selected wheel and get paired tire
  const selectedWheel = selectedProduct?.type === 'wheel' ? selectedProduct : null;
  const pairedTireId = selectedWheel ? WHEEL_TO_TIRE_MAPPING[selectedWheel.id as keyof typeof WHEEL_TO_TIRE_MAPPING] : null;

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

  // Get paired tires for wheel gallery
  const getPairedTires = () => {
    if (!selectedWheel || showAllSizes) return null;

    // Get all wheel IDs in order
    const wheelIds = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'];

    // Return tires paired with wheels in the same order
    return wheelIds.map(wheelId => {
      const tireId = WHEEL_TO_TIRE_MAPPING[wheelId as keyof typeof WHEEL_TO_TIRE_MAPPING];
      return FITMENT_TIRES.find(tire => tire.id === tireId);
    }).filter(Boolean);
  };

  const pairedTires = getPairedTires();

  const filteredTires = pairedTires || FITMENT_TIRES.filter((tire) => {
    // Filter by diameter if wheel is selected and not showing all sizes
    if (selectedWheel && !showAllSizes) {
      if (!tire.size.includes(`R${(selectedWheel as any).diameter}`)) {
        return false;
      }
    }

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

      {/* Matching Size Alert */}
      {selectedWheel && (
        <div className="flex items-center justify-between px-2 py-1 bg-primary/10 border border-primary/20 rounded-md">
          <span className="text-[10px] text-primary font-medium">
            {pairedTires ? "Showing paired tires for wheel gallery" : `Showing matching ${(selectedWheel as any).diameter}" tires`}
          </span>
          <button
            onClick={() => setShowAllSizes(!showAllSizes)}
            className="text-[10px] text-white/60 hover:text-white underline"
          >
            {showAllSizes ? "Show Paired Only" : "Show All Sizes"}
          </button>
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
