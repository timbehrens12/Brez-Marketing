'use client';

import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReferenceGrid } from './ReferenceGrid';
import { WheelSelector } from './WheelSelector';
import { StanceControls } from './StanceControls';
import { useStore } from '@/store/useStore';
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Cog,
  Zap,
  Settings,
  Package,
  Car,
  Wrench,
  Gauge,
  Hexagon
} from 'lucide-react';

// Custom SVG Icons for automotive products
const WheelIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 3V6M12 18V21M3 12H6M18 12H21M7.05 7.05L9.17 9.17M14.83 14.83L16.95 16.95M7.05 16.95L9.17 14.83M14.83 9.17L16.95 7.05" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const TireIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2"/>
    <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const SuspensionIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="4" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="16" r="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 4v4M15 16v4" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const SpacerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="8" width="18" height="8" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="5" y="10" width="14" height="4" rx="1" fill="currentColor"/>
    <path d="M7 4v4M17 16v4M7 16v4M17 4v4" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const AccessoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="9" cy="9" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="9" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="9" cy="15" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="15" r="1.5" fill="currentColor"/>
  </svg>
);

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const [activeTab, setActiveTab] = useState("wheels");
  const [selectedProducts, setSelectedProducts] = useState<{
    wheel?: { name: string; price: number };
    tire?: { name: string; price: number };
    suspension?: { name: string; price: number };
    spacer?: { name: string; price: number };
    accessory?: { name: string; price: number };
  }>({});

  const { setIsGenerating, addGenerationStep, clearGenerationSteps } = useStore();
  const totalPrice = Object.values(selectedProducts).reduce((sum, product) => sum + (product?.price || 0), 0);

  const handleProductSelect = (category: keyof typeof selectedProducts) => (product: { name: string; price: number }) => {
    setSelectedProducts(prev => ({ ...prev, [category]: product }));
  };

  const handleGenerate = async () => {
    if (!Object.keys(selectedProducts).length) return;

    setIsGenerating(true);
    clearGenerationSteps();

    // Add generation steps for each selected product
    Object.entries(selectedProducts).forEach(([category, product]) => {
      if (product) {
        addGenerationStep(`Applying ${product.name}...`);
      }
    });

    // Simulate generation process
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsGenerating(false);
    addGenerationStep("Build complete! 🎉");
  };

  // Collapsed view - just icons
  if (collapsed) {
    return (
      <div className="h-full w-full bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Collapsed Header */}
        <div className="p-2 border-b border-sidebar-border flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-8 h-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Collapsed Navigation - Product Categories */}
        <div className="flex-1 flex flex-col items-center py-4 space-y-2">
          <Button
            variant={activeTab === "wheels" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTab("wheels")}
            className="w-10 h-10 hover:scale-105 transition-transform"
            title="Wheels"
          >
            <WheelIcon />
          </Button>

          <Button
            variant={activeTab === "tires" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTab("tires")}
            className="w-10 h-10 hover:scale-105 transition-transform"
            title="Tires"
          >
            <TireIcon />
          </Button>

          <Button
            variant={activeTab === "suspension" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTab("suspension")}
            className="w-10 h-10 hover:scale-105 transition-transform"
            title="Suspension"
          >
            <SuspensionIcon />
          </Button>

          <Button
            variant={activeTab === "spacers" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTab("spacers")}
            className="w-10 h-10 hover:scale-105 transition-transform"
            title="Spacers"
          >
            <SpacerIcon />
          </Button>

          <Button
            variant={activeTab === "accessories" ? "default" : "ghost"}
            size="icon"
            onClick={() => setActiveTab("accessories")}
            className="w-10 h-10 hover:scale-105 transition-transform"
            title="Accessories"
          >
            <AccessoryIcon />
          </Button>
        </div>
      </div>
    );
  }

  // Expanded view - full sidebar
  return (
    <div className="h-full w-full border-r bg-sidebar border-sidebar-border flex flex-col">
      {/* Merged Header + Build Bar */}
      <div className="p-4 border-b border-sidebar-border bg-sidebar-accent/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <img
              src="https://i.imgur.com/1vg0ss3.png"
              alt="Wheel Viz 2"
              className="h-10 w-auto object-contain"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-8 h-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Your Build</span>
          <span className="text-sm text-emerald-600 font-semibold">${totalPrice}</span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {/* Selected Products - Compact Square Cards */}
          <div className="flex flex-col items-center relative">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 transition-colors cursor-pointer ${
                selectedProducts.wheel
                  ? 'bg-gray-100 border-blue-500'
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => {
                if (selectedProducts.wheel) {
                  setSelectedProducts(prev => ({ ...prev, wheel: undefined }));
                }
              }}
            >
              <WheelIcon />
              {selectedProducts.wheel && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">×</span>
                </div>
              )}
            </div>
            {selectedProducts.wheel && (
              <div className="text-center mt-1">
                <div className="text-[10px] font-medium truncate w-12 leading-tight">{selectedProducts.wheel.name.split(' ')[0]}</div>
                <div className="text-[10px] text-emerald-600">${selectedProducts.wheel.price}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center relative">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 transition-colors cursor-pointer ${
                selectedProducts.tire
                  ? 'bg-gray-100 border-slate-500'
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => {
                if (selectedProducts.tire) {
                  setSelectedProducts(prev => ({ ...prev, tire: undefined }));
                }
              }}
            >
              <TireIcon />
              {selectedProducts.tire && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">×</span>
                </div>
              )}
            </div>
            {selectedProducts.tire && (
              <div className="text-center mt-1">
                <div className="text-[10px] font-medium truncate w-12 leading-tight">{selectedProducts.tire.name.split(' ')[0]}</div>
                <div className="text-[10px] text-emerald-600">${selectedProducts.tire.price}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center relative">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 transition-colors cursor-pointer ${
                selectedProducts.suspension
                  ? 'bg-gray-100 border-orange-500'
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => {
                if (selectedProducts.suspension) {
                  setSelectedProducts(prev => ({ ...prev, suspension: undefined }));
                }
              }}
            >
              <SuspensionIcon />
              {selectedProducts.suspension && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">×</span>
                </div>
              )}
            </div>
            {selectedProducts.suspension && (
              <div className="text-center mt-1">
                <div className="text-[10px] font-medium truncate w-12 leading-tight">{selectedProducts.suspension.name.split(' ')[0]}</div>
                <div className="text-[10px] text-emerald-600">${selectedProducts.suspension.price}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center relative">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 transition-colors cursor-pointer ${
                selectedProducts.spacer
                  ? 'bg-gray-100 border-gray-500'
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => {
                if (selectedProducts.spacer) {
                  setSelectedProducts(prev => ({ ...prev, spacer: undefined }));
                }
              }}
            >
              <SpacerIcon />
              {selectedProducts.spacer && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">×</span>
                </div>
              )}
            </div>
            {selectedProducts.spacer && (
              <div className="text-center mt-1">
                <div className="text-[10px] font-medium truncate w-12 leading-tight">{selectedProducts.spacer.name.split(' ')[0]}</div>
                <div className="text-[10px] text-emerald-600">${selectedProducts.spacer.price}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center relative">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 transition-colors cursor-pointer ${
                selectedProducts.accessory
                  ? 'bg-gray-100 border-yellow-500'
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => {
                if (selectedProducts.accessory) {
                  setSelectedProducts(prev => ({ ...prev, accessory: undefined }));
                }
              }}
            >
              <AccessoryIcon />
              {selectedProducts.accessory && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">×</span>
                </div>
              )}
            </div>
            {selectedProducts.accessory && (
              <div className="text-center mt-1">
                <div className="text-[10px] font-medium truncate w-12 leading-tight">{selectedProducts.accessory.name.split(' ')[0]}</div>
                <div className="text-[10px] text-emerald-600">${selectedProducts.accessory.price}</div>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-3">
          <Button
            onClick={handleGenerate}
            disabled={!Object.keys(selectedProducts).length}
            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white"
          >
            Generate Build
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="px-4 pt-2 flex-shrink-0">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="wheels">Wheels</TabsTrigger>
            <TabsTrigger value="tires">Tires</TabsTrigger>
            <TabsTrigger value="suspension">Suspension</TabsTrigger>
            <TabsTrigger value="spacers">Spacers</TabsTrigger>
            <TabsTrigger value="accessories">Accessories</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 min-h-0 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 hover:scrollbar-thumb-neutral-500">
          <div className="p-4">
            <TabsContent value="wheels" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Wheel Gallery</CardTitle>
                  <CardDescription>Premium wheels for every style</CardDescription>
                </CardHeader>
                <CardContent>
                  <WheelSelector onProductSelect={handleProductSelect('wheel')} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tires" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Tire Gallery</CardTitle>
                  <CardDescription>Performance and off-road tires</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="group cursor-pointer" onClick={() => handleProductSelect('tire')({ name: 'Michelin Pilot Sport 4S', price: 349 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Cog className="w-12 h-12 text-slate-300" />
                        </div>
                        <div className="text-sm font-medium">Michelin Pilot Sport 4S</div>
                        <div className="text-xs text-muted-foreground">275/35ZR20</div>
                        <div className="text-xs text-emerald-600">$349</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('tire')({ name: 'Bridgestone Potenza RE-71R', price: 429 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Cog className="w-12 h-12 text-slate-300" />
                        </div>
                        <div className="text-sm font-medium">Bridgestone Potenza RE-71R</div>
                        <div className="text-xs text-muted-foreground">285/30ZR22</div>
                        <div className="text-xs text-emerald-600">$429</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('tire')({ name: 'Goodyear Wrangler Territory', price: 289 })}>
                        <div className="aspect-square bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Cog className="w-12 h-12 text-amber-300" />
                        </div>
                        <div className="text-sm font-medium">Goodyear Wrangler Territory</div>
                        <div className="text-xs text-muted-foreground">LT285/75R16</div>
                        <div className="text-xs text-emerald-600">$289</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('tire')({ name: 'BFGoodrich Mud-Terrain', price: 389 })}>
                        <div className="aspect-square bg-gradient-to-br from-green-700 to-green-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Cog className="w-12 h-12 text-green-300" />
                        </div>
                        <div className="text-sm font-medium">BFGoodrich Mud-Terrain</div>
                        <div className="text-xs text-muted-foreground">33x12.50R20</div>
                        <div className="text-xs text-emerald-600">$389</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('tire')({ name: 'Pirelli P Zero', price: 399 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Cog className="w-12 h-12 text-slate-300" />
                        </div>
                        <div className="text-sm font-medium">Pirelli P Zero</div>
                        <div className="text-xs text-muted-foreground">265/35ZR18</div>
                        <div className="text-xs text-emerald-600">$399</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('tire')({ name: 'Continental ExtremeContact', price: 359 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Cog className="w-12 h-12 text-slate-300" />
                        </div>
                        <div className="text-sm font-medium">Continental ExtremeContact</div>
                        <div className="text-xs text-muted-foreground">275/40ZR19</div>
                        <div className="text-xs text-emerald-600">$359</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('tire')({ name: 'Yokohama ADVAN A052', price: 449 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Cog className="w-12 h-12 text-slate-300" />
                        </div>
                        <div className="text-sm font-medium">Yokohama ADVAN A052</div>
                        <div className="text-xs text-muted-foreground">285/35ZR19</div>
                        <div className="text-xs text-emerald-600">$449</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('tire')({ name: 'Toyo Proxes R1R', price: 329 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Cog className="w-12 h-12 text-slate-300" />
                        </div>
                        <div className="text-sm font-medium">Toyo Proxes R1R</div>
                        <div className="text-xs text-muted-foreground">265/30ZR19</div>
                        <div className="text-xs text-emerald-600">$329</div>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suspension" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Suspension Gallery</CardTitle>
                  <CardDescription>Lift kits, coilovers, and air systems</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="group cursor-pointer" onClick={() => handleProductSelect('suspension')({ name: 'Fox Racing Shox 2.0 Coilovers', price: 2499 })}>
                        <div className="aspect-square bg-gradient-to-br from-blue-700 to-blue-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Zap className="w-12 h-12 text-blue-300" />
                        </div>
                        <div className="text-sm font-medium">Fox Racing Shox 2.0 Coilovers</div>
                        <div className="text-xs text-muted-foreground">Adjustable compression & rebound</div>
                        <div className="text-xs text-emerald-600">$2,499</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('suspension')({ name: '4" Rough Country Lift Kit', price: 899 })}>
                        <div className="aspect-square bg-gradient-to-br from-orange-700 to-orange-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Zap className="w-12 h-12 text-orange-300" />
                        </div>
                        <div className="text-sm font-medium">4" Rough Country Lift Kit</div>
                        <div className="text-xs text-muted-foreground">N3 Shocks included</div>
                        <div className="text-xs text-emerald-600">$899</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('suspension')({ name: 'Air Lift 1000 Air Springs', price: 649 })}>
                        <div className="aspect-square bg-gradient-to-br from-purple-700 to-purple-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Zap className="w-12 h-12 text-purple-300" />
                        </div>
                        <div className="text-sm font-medium">Air Lift 1000 Air Springs</div>
                        <div className="text-xs text-muted-foreground">Load-assist rear suspension</div>
                        <div className="text-xs text-emerald-600">$649</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('suspension')({ name: 'Bilstein 5100 Series Shocks', price: 349 })}>
                        <div className="aspect-square bg-gradient-to-br from-red-700 to-red-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Zap className="w-12 h-12 text-red-300" />
                        </div>
                        <div className="text-sm font-medium">Bilstein 5100 Series Shocks</div>
                        <div className="text-xs text-muted-foreground">Monotube gas-charged design</div>
                        <div className="text-xs text-emerald-600">$349</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('suspension')({ name: 'King Shocks 2.5" Coilovers', price: 1899 })}>
                        <div className="aspect-square bg-gradient-to-br from-blue-700 to-blue-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Zap className="w-12 h-12 text-blue-300" />
                        </div>
                        <div className="text-sm font-medium">King Shocks 2.5" Coilovers</div>
                        <div className="text-xs text-muted-foreground">Remote reservoir design</div>
                        <div className="text-xs text-emerald-600">$1,899</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('suspension')({ name: 'Old Man Emu 3" Lift Kit', price: 1299 })}>
                        <div className="aspect-square bg-gradient-to-br from-orange-700 to-orange-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Zap className="w-12 h-12 text-orange-300" />
                        </div>
                        <div className="text-sm font-medium">Old Man Emu 3" Lift Kit</div>
                        <div className="text-xs text-muted-foreground">BP-51 shocks included</div>
                        <div className="text-xs text-emerald-600">$1,299</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('suspension')({ name: 'Sachs Performance Shocks', price: 299 })}>
                        <div className="aspect-square bg-gradient-to-br from-red-700 to-red-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Zap className="w-12 h-12 text-red-300" />
                        </div>
                        <div className="text-sm font-medium">Sachs Performance Shocks</div>
                        <div className="text-xs text-muted-foreground">Twin-tube design</div>
                        <div className="text-xs text-emerald-600">$299</div>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="spacers" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Wheel Spacers & Adapters</CardTitle>
                  <CardDescription>Adjust track width and offset</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="group cursor-pointer" onClick={() => handleProductSelect('spacer')({ name: '1.5" Wheel Spacers', price: 89 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Settings className="w-12 h-12 text-gray-300" />
                        </div>
                        <div className="text-sm font-medium">1.5" Wheel Spacers</div>
                        <div className="text-xs text-muted-foreground">5x114.3 bolt pattern</div>
                        <div className="text-xs text-emerald-600">$89</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('spacer')({ name: 'Hubcentric Adapters', price: 45 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Settings className="w-12 h-12 text-gray-300" />
                        </div>
                        <div className="text-sm font-medium">Hubcentric Adapters</div>
                        <div className="text-xs text-muted-foreground">73.1mm to 74.1mm</div>
                        <div className="text-xs text-emerald-600">$45</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('spacer')({ name: '2" Wheel Adapters', price: 129 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Settings className="w-12 h-12 text-gray-300" />
                        </div>
                        <div className="text-sm font-medium">2" Wheel Adapters</div>
                        <div className="text-xs text-muted-foreground">5x120 to 5x114.3</div>
                        <div className="text-xs text-emerald-600">$129</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('spacer')({ name: '1" Wheel Spacers', price: 69 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Settings className="w-12 h-12 text-gray-300" />
                        </div>
                        <div className="text-sm font-medium">1" Wheel Spacers</div>
                        <div className="text-xs text-muted-foreground">5x112 bolt pattern</div>
                        <div className="text-xs text-emerald-600">$69</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('spacer')({ name: 'Staggered Spacers Kit', price: 159 })}>
                        <div className="aspect-square bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Settings className="w-12 h-12 text-gray-300" />
                        </div>
                        <div className="text-sm font-medium">Staggered Spacers Kit</div>
                        <div className="text-xs text-muted-foreground">1.5F + 2R front/rear set</div>
                        <div className="text-xs text-emerald-600">$159</div>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="accessories" className="m-0">
              <Card>
                <CardHeader>
                  <CardTitle>Wheel Accessories</CardTitle>
                  <CardDescription>Lugs, caps, and mounting hardware</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="group cursor-pointer" onClick={() => handleProductSelect('accessory')({ name: 'Tuner Style Lug Nuts', price: 39 })}>
                        <div className="aspect-square bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Package className="w-12 h-12 text-yellow-300" />
                        </div>
                        <div className="text-sm font-medium">Tuner Style Lug Nuts</div>
                        <div className="text-xs text-muted-foreground">M12x1.5 - 20pcs with key</div>
                        <div className="text-xs text-emerald-600">$39</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('accessory')({ name: 'Valve Stem Caps', price: 24 })}>
                        <div className="aspect-square bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Package className="w-12 h-12 text-yellow-300" />
                        </div>
                        <div className="text-sm font-medium">Valve Stem Caps</div>
                        <div className="text-xs text-muted-foreground">Chrome with LED accent</div>
                        <div className="text-xs text-emerald-600">$24</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('accessory')({ name: 'Wheel Locks', price: 49 })}>
                        <div className="aspect-square bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Package className="w-12 h-12 text-yellow-300" />
                        </div>
                        <div className="text-sm font-medium">Wheel Locks</div>
                        <div className="text-xs text-muted-foreground">14x1.5 thread - keyed</div>
                        <div className="text-xs text-emerald-600">$49</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('accessory')({ name: 'Center Caps', price: 19 })}>
                        <div className="aspect-square bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Package className="w-12 h-12 text-yellow-300" />
                        </div>
                        <div className="text-sm font-medium">Center Caps</div>
                        <div className="text-xs text-muted-foreground">73.1mm - chrome finish</div>
                        <div className="text-xs text-emerald-600">$19</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('accessory')({ name: 'TPMS Sensors', price: 79 })}>
                        <div className="aspect-square bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Package className="w-12 h-12 text-yellow-300" />
                        </div>
                        <div className="text-sm font-medium">TPMS Sensors</div>
                        <div className="text-xs text-muted-foreground">Programmable tire pressure</div>
                        <div className="text-xs text-emerald-600">$79</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('accessory')({ name: 'Wheel Cleaning Kit', price: 34 })}>
                        <div className="aspect-square bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Package className="w-12 h-12 text-yellow-300" />
                        </div>
                        <div className="text-sm font-medium">Wheel Cleaning Kit</div>
                        <div className="text-xs text-muted-foreground">Brushes and protectant</div>
                        <div className="text-xs text-emerald-600">$34</div>
                      </div>

                      <div className="group cursor-pointer" onClick={() => handleProductSelect('accessory')({ name: 'Lug Wrench Extension', price: 29 })}>
                        <div className="aspect-square bg-gradient-to-br from-amber-700 to-amber-800 rounded-lg mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Package className="w-12 h-12 text-yellow-300" />
                        </div>
                        <div className="text-sm font-medium">Lug Wrench Extension</div>
                        <div className="text-xs text-muted-foreground">24" breaker bar adapter</div>
                        <div className="text-xs text-emerald-600">$29</div>
                      </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

