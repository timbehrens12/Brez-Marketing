'use client';

import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReferenceGrid } from './ReferenceGrid';
import { WheelSelector } from './WheelSelector';
import { TireSelector } from './TireSelector';
import { SuspensionSelector } from './SuspensionSelector';
import { SpacerSelector } from './SpacerSelector';
import { AccessorySelector } from './AccessorySelector';
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

// Custom Automotive Icons using Imgur images
const WheelIcon = () => (
  <img
    src="https://i.imgur.com/HAVbPzd.png"
    alt="Wheels"
    className="w-6 h-6 object-contain"
  />
);

const TireIcon = () => (
  <img
    src="https://i.imgur.com/hmuQugt.png"
    alt="Tires"
    className="w-6 h-6 object-contain"
  />
);

const SuspensionIcon = () => (
  <img
    src="https://i.imgur.com/UTQgYgH.png"
    alt="Suspension"
    className="w-6 h-6 object-contain"
  />
);

const SpacerIcon = () => (
  <img
    src="https://i.imgur.com/82Jr3Dh.png"
    alt="Spacers"
    className="w-6 h-6 object-contain"
  />
);

const AccessoryIcon = () => (
  <img
    src="https://i.imgur.com/eubDa9t.png"
    alt="Accessories"
    className="w-6 h-6 object-contain"
  />
);

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const [activeTab, setActiveTab] = useState("wheels");
  const [selectedProducts, setSelectedProducts] = useState<{
    wheel?: { name: string; price: number; imageUrl?: string };
    tire?: { name: string; price: number; imageUrl?: string };
    suspension?: { name: string; price: number; imageUrl?: string };
    spacer?: { name: string; price: number; imageUrl?: string };
    accessory?: { name: string; price: number; imageUrl?: string };
  }>({});

  const { setIsGenerating, addGenerationStep, clearGenerationSteps } = useStore();
  const totalPrice = Object.values(selectedProducts).reduce((sum, product) => sum + (product?.price || 0), 0);

  const handleProductSelect = (category: keyof typeof selectedProducts) => (product: { name: string; price: number; imageUrl?: string }) => {
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
        <div className="flex items-center justify-center mb-3">
          <img
            src="https://i.imgur.com/NVFBzeK.png"
            alt="Wheel Viz 2"
            className="h-13 w-auto object-contain"
          />
        </div>
        <div className="flex justify-end">
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

        <div className="grid grid-cols-5 gap-2 mb-2">
          {/* Selected Products - Compact Square Cards */}
          <div className="flex flex-col items-center relative">
            <div
              className={`w-14 h-14 rounded-lg flex items-center justify-center border-2 transition-colors cursor-pointer ${
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
              {selectedProducts.wheel?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProducts.wheel.imageUrl}
                  alt={selectedProducts.wheel.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <WheelIcon />
              )}
              {selectedProducts.wheel && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">×</span>
                </div>
              )}
            </div>
            {selectedProducts.wheel && (
              <div className="text-center mt-1">
                <div className="text-xs font-medium truncate w-14 leading-tight">{selectedProducts.wheel.name.split(' ')[0]}</div>
                <div className="text-xs text-emerald-600">${selectedProducts.wheel.price}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center relative">
            <div
              className={`w-14 h-14 rounded-lg flex items-center justify-center border-2 transition-colors cursor-pointer ${
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
              {selectedProducts.tire?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProducts.tire.imageUrl}
                  alt={selectedProducts.tire.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <TireIcon />
              )}
              {selectedProducts.tire && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">×</span>
                </div>
              )}
            </div>
            {selectedProducts.tire && (
              <div className="text-center mt-1">
                <div className="text-xs font-medium truncate w-14 leading-tight">{selectedProducts.tire.name.split(' ')[0]}</div>
                <div className="text-xs text-emerald-600">${selectedProducts.tire.price}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center relative">
            <div
              className={`w-14 h-14 rounded-lg flex items-center justify-center border-2 transition-colors cursor-pointer ${
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
              {selectedProducts.suspension?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProducts.suspension.imageUrl}
                  alt={selectedProducts.suspension.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <SuspensionIcon />
              )}
              {selectedProducts.suspension && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">×</span>
                </div>
              )}
            </div>
            {selectedProducts.suspension && (
              <div className="text-center mt-1">
                <div className="text-xs font-medium truncate w-14 leading-tight">{selectedProducts.suspension.name.split(' ')[0]}</div>
                <div className="text-xs text-emerald-600">${selectedProducts.suspension.price}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center relative">
            <div
              className={`w-14 h-14 rounded-lg flex items-center justify-center border-2 transition-colors cursor-pointer ${
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
              {selectedProducts.spacer?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProducts.spacer.imageUrl}
                  alt={selectedProducts.spacer.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <SpacerIcon />
              )}
              {selectedProducts.spacer && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">×</span>
                </div>
              )}
            </div>
            {selectedProducts.spacer && (
              <div className="text-center mt-1">
                <div className="text-xs font-medium truncate w-14 leading-tight">{selectedProducts.spacer.name.split(' ')[0]}</div>
                <div className="text-xs text-emerald-600">${selectedProducts.spacer.price}</div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center relative">
            <div
              className={`w-14 h-14 rounded-lg flex items-center justify-center border-2 transition-colors cursor-pointer ${
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
              {selectedProducts.accessory?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedProducts.accessory.imageUrl}
                  alt={selectedProducts.accessory.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <AccessoryIcon />
              )}
              {selectedProducts.accessory && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">×</span>
                </div>
              )}
            </div>
            {selectedProducts.accessory && (
              <div className="text-center mt-1">
                <div className="text-xs font-medium truncate w-14 leading-tight">{selectedProducts.accessory.name.split(' ')[0]}</div>
                <div className="text-xs text-emerald-600">${selectedProducts.accessory.price}</div>
              </div>
            )}
          </div>
        </div>

        {/* Generate Button - Fancy Styling */}
        <div className="btn-wrapper w-full">
          <button
            onClick={handleGenerate}
            disabled={!Object.keys(selectedProducts).length}
            className="btn w-full"
          >
            <div className="txt-wrapper">
              <div className="txt-1">
                <span className="btn-letter">G</span>
                <span className="btn-letter">e</span>
                <span className="btn-letter">n</span>
                <span className="btn-letter">e</span>
                <span className="btn-letter">r</span>
                <span className="btn-letter">a</span>
                <span className="btn-letter">t</span>
                <span className="btn-letter">e</span>
                <span className="btn-letter">&nbsp;</span>
                <span className="btn-letter">B</span>
                <span className="btn-letter">u</span>
                <span className="btn-letter">i</span>
                <span className="btn-letter">l</span>
                <span className="btn-letter">d</span>
              </div>
            </div>
            <svg className="btn-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L13.09 8.26L19.35 9.35L13.09 10.44L12 16.7L10.91 10.44L4.65 9.35L10.91 8.26L12 2Z"/>
            </svg>
          </button>
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
                  <TireSelector onProductSelect={handleProductSelect('tire')} />
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
                  <SuspensionSelector onProductSelect={handleProductSelect('suspension')} />
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
                  <SpacerSelector onProductSelect={handleProductSelect('spacer')} />
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
                  <AccessorySelector onProductSelect={handleProductSelect('accessory')} />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
