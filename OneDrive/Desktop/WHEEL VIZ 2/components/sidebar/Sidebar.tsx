'use client';

import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { GenerateButton } from '@/components/ui/GenerateButton';
import { ReferenceGrid } from './ReferenceGrid';
import { WheelSelector } from './WheelSelector';
import { TireSelector } from './TireSelector';
import { SuspensionSelector } from './SuspensionSelector';
import { SpacerSelector } from './SpacerSelector';
import { AccessorySelector } from './AccessorySelector';
import { StanceControls } from './StanceControls';
import { useStore } from '@/store/useStore';
import { GitCompare, AlertTriangle } from 'lucide-react';
import { FixDialog } from '@/components/canvas/FixDialog';
import { generateVisualization } from '@/lib/generationService';
import {
  Disc,
  CircleDashed,
  Layers,
  Camera,
  Sparkles,
  X,
  ChevronRight,
  ShoppingBag,
  Car,
  Wrench,
  Component,
  Settings,
  Check
} from 'lucide-react';

// --- Types & Helper Components ---

interface AcrylicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const AcrylicCard = ({ children, className, ...props }: AcrylicCardProps) => (
  <div
    className={cn(
      "backdrop-blur-2xl bg-card/80 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

import { CustomIcon } from '@/components/ui/CustomIcon';

// --- Icons ---
const CATEGORIES = [
  { id: 'wheels', label: 'Wheels', iconUrl: 'https://i.imgur.com/oYBgNYE.png', component: WheelSelector },
  { id: 'tires', label: 'Tires', iconUrl: 'https://i.imgur.com/gwWB0X9.png', component: TireSelector },
  { id: 'suspension', label: 'Suspension', iconUrl: 'https://i.imgur.com/BKKDw0K.png', component: SuspensionSelector },
  { id: 'spacers', label: 'Spacers / Adapters', iconUrl: 'https://i.imgur.com/NN5K7nL.png', component: SpacerSelector },
  { id: 'accessories', label: 'Accessories', iconUrl: 'https://i.imgur.com/u7a3ul6.png', component: AccessorySelector },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  // "Drawer" state - which category is open?
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [configuringCategory, setConfiguringCategory] = useState<string | null>(null);
  const [showFixDialog, setShowFixDialog] = useState(false);
  
  // Sync collapsed state with parent if needed, or just derive
  // When activeCategory is null, effectively "collapsed" for the drawer part
  
  React.useEffect(() => {
      if (activeCategory) {
          // If we have an active category, we are "expanded"
          if (collapsed) onToggle(); 
      } else {
          // If no active category, we are "collapsed"
          if (!collapsed) onToggle();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, collapsed]);

  const [selectedProducts, setSelectedProducts] = useState<{
    wheel?: { name: string; price: number; imageUrl?: string; specs?: any };
    tire?: { name: string; price: number; imageUrl?: string; specs?: any };
    suspension?: { name: string; price: number; imageUrl?: string; specs?: any };
    spacer?: { name: string; price: number; imageUrl?: string; specs?: any };
    accessory?: { name: string; price: number; imageUrl?: string; specs?: any };
  }>({});

  const { setIsGenerating, addGenerationStep, clearGenerationSteps, showCompare, setShowCompare, cartCount, isSetupComplete, activeCategory: storeActiveCategory, setActiveCategory: setStoreActiveCategory, setSelectedTire: setSelectedTire, currentImage, selectedProduct, currentSetup, setCurrentImage } = useStore();
  
  // Sync local activeCategory with store
  React.useEffect(() => {
    if (storeActiveCategory !== undefined) {
      setActiveCategory(storeActiveCategory);
    }
  }, [storeActiveCategory]);

  // Update store when local category changes
  const handleCategoryChange = (catId: string | null) => {
    setActiveCategory(catId);
    setStoreActiveCategory(catId);
  };

  const totalPrice = Object.values(selectedProducts).reduce((sum, product) => sum + (product?.price || 0), 0);

  const handleProductSelect = (category: keyof typeof selectedProducts) => (product: { name: string; price: number; imageUrl?: string; [key: string]: any }) => {
    // Map plural category names to singular keys if needed
    const keyMap: Record<string, keyof typeof selectedProducts> = {
      wheels: 'wheel',
      tires: 'tire',
      suspension: 'suspension',
      spacers: 'spacer',
      accessories: 'accessory'
    };

    const targetKey = keyMap[category as string] || category;

    // Extract specs from the product object (all properties except name, price, imageUrl)
    const { name, price, imageUrl, ...specs } = product;

    setSelectedProducts(prev => ({
      ...prev,
      [targetKey]: {
        name,
        price,
        imageUrl,
        specs: Object.keys(specs).length > 0 ? specs : undefined
      }
    }));

    // Sync with global store for generation
    if (targetKey === 'wheel') {
      // Cast to any to satisfy the Product type since we're in a simplified view here
      useStore.getState().setSelectedProduct({
        id: 'temp-id',
        type: 'wheel',
        brand: product.brand || product.name.split(' ')[0],
        model: product.model || product.name.split(' ').slice(1).join(' '),
        finish: product.finish || 'Unknown',
        diameter: product.diameter || 18, // Ensure diameter is passed
        width: product.width || 9.5,
        offset: product.offset || 35,
        boltPattern: product.boltPattern,
        imageUrl: product.imageUrl || '',
        ...product // Spread any other props
      } as any);
    }

    // Sync Tire with global store
    if (targetKey === 'tire') {
      useStore.getState().setSelectedTire({
        id: 'temp-tire-id',
        type: 'tire',
        ...product
      } as any);
    }
  };

  const handleRemoveProduct = (category: keyof typeof selectedProducts) => {
    setSelectedProducts(prev => {
      const newState = { ...prev };
      delete newState[category];
      return newState;
    });
  };

  const handleGenerate = async () => {
    if (!Object.keys(selectedProducts).length) return;

    setIsGenerating(true);
    clearGenerationSteps();

    Object.entries(selectedProducts).forEach(([category, product]) => {
      if (product) {
        addGenerationStep(`Applying ${product.name}...`);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsGenerating(false);
    addGenerationStep("Build complete! 🎉");
  };

  const handleFixGeneration = async (instructions: string) => {
    setShowFixDialog(false);
    if (!currentImage || !selectedProduct) return;

    setIsGenerating(true);
    addGenerationStep("Applying fixes...");

    try {
      const data = await generateVisualization({
        currentImage,
        selectedProduct,
        currentSetup,
        fixInstructions: instructions
      });

      if (data.generated_image_url) {
        const img = new Image();
        img.onload = () => setCurrentImage(data.generated_image_url);
        img.src = data.generated_image_url;
      }
    } catch (error) {
      console.error(error);
      alert('Failed to regenerate with fixes');
    } finally {
      setIsGenerating(false);
    }
  };

  const ActiveComponent = CATEGORIES.find(c => c.id === activeCategory)?.component;

  return (
    <div className="relative w-full h-full pointer-events-none">
      
      {/* Fix Dialog */}
      {showFixDialog && (
        <div className="pointer-events-auto">
          <FixDialog 
            onClose={() => setShowFixDialog(false)} 
            onFix={handleFixGeneration} 
          />
        </div>
      )}
      
      {/* --- Left Island: Navigation Dock --- */}
      <div className="absolute left-6 top-28 bottom-6 w-24 flex flex-col pointer-events-auto z-50">
        <AcrylicCard className="h-full flex flex-col items-center py-6 gap-2">

          {/* Nav Items */}
          <div className="flex-1 flex flex-col gap-2 w-full px-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  if (!isSetupComplete) {
                    return; // Block interaction
                  }
                  handleCategoryChange(activeCategory === cat.id ? null : cat.id);
                }}
                className={cn(
                  "group relative w-full flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300",
                  !isSetupComplete && "opacity-40 cursor-not-allowed",
                  activeCategory === cat.id 
                    ? "bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
                    : "hover:bg-white/5"
                )}
              >
                <CustomIcon src={cat.iconUrl} className="w-6 h-6 mb-1.5" alt={cat.label} />
                
                {/* Label */}
                <div className="flex flex-col items-center justify-center">
                  {cat.label.includes('/') ? (
                    <>
                      <span 
                        className={cn(
                          "text-[9px] font-medium uppercase tracking-wider leading-tight transition-colors duration-300",
                          activeCategory === cat.id ? "text-white" : "text-white/40 group-hover:text-white"
                        )}
                      >
                        {cat.label.split(' / ')[0]}/
                      </span>
                      <span 
                        className={cn(
                          "text-[9px] font-medium uppercase tracking-wider leading-tight transition-colors duration-300",
                          activeCategory === cat.id ? "text-white" : "text-white/40 group-hover:text-white"
                        )}
                      >
                        {cat.label.split(' / ')[1]}
                      </span>
                    </>
                  ) : (
                    <span 
                      className={cn(
                        "text-[9px] font-medium uppercase tracking-wider leading-tight transition-colors duration-300",
                        activeCategory === cat.id ? "text-white" : "text-white/40 group-hover:text-white"
                      )}
                    >
                      {cat.label}
                    </span>
                  )}
                </div>

                {/* Active Indicator */}
                {activeCategory === cat.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                )}
              </button>
            ))}
          </div>

          {/* Bottom Action */}
          <button className="relative w-10 h-10 rounded-full bg-[#CCFF00] hover:bg-[#b3e600] flex items-center justify-center text-black transition-colors shadow-[0_0_15px_rgba(204,255,0,0.4)]">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                {cartCount}
              </span>
            )}
          </button>
        </AcrylicCard>
      </div>

      {/* --- Fitment Logo --- */}
      <div className={cn(
        "absolute left-6 top-6 h-16 flex items-center justify-center pointer-events-auto z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
        activeCategory ? "w-[520px]" : "w-24"
      )}>
        <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.4)] backdrop-blur-xl border border-white/20 overflow-hidden">
          <img
            src="https://i.imgur.com/f6KKrto.png"
            alt="FITMENT"
            className="h-full w-full object-contain p-1"
          />
        </div>
      </div>

      {/* --- Left Island: Sliding Drawer --- */}
      <div 
        className={cn(
          "absolute left-36 top-28 bottom-6 w-[400px] pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-40",
          activeCategory ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
        )}
      >
        <AcrylicCard className="h-full flex flex-col">
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-light text-white tracking-wide">
                  {CATEGORIES.find(c => c.id === activeCategory)?.label} Gallery
                </h2>
                <p className="text-xs text-white/40 mt-1 font-mono uppercase tracking-widest">Select Product</p>
              </div>
              <button
                onClick={() => setActiveCategory(null)}
                className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-all"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            </div>
          </div>
          
          <ScrollArea className="flex-1 h-full">
            <div className="p-4 pb-32">
              {/* Render Active Selector with prop injection */}
              {ActiveComponent && (
                // @ts-ignore - dynamic component props
                <ActiveComponent onProductSelect={handleProductSelect(activeCategory as any)} />
              )}
            </div>
          </ScrollArea>
        </AcrylicCard>
      </div>

      {/* --- Bottom Island: Camera Dock --- */}
      <div 
        className="absolute bottom-8 left-1/2 pointer-events-auto z-50 flex items-center gap-4 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ 
          transform: activeCategory ? 'translateX(calc(-50% + 65px))' : 'translateX(calc(-50% - 120px))' 
        }}
      >
        <AcrylicCard className="px-2 py-2 flex items-center gap-1 rounded-full bg-card/80 backdrop-blur-xl border-white/10">
          <div className="flex items-center gap-1 pr-2 border-r border-white/10 mr-1">
            <label className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
              <Camera className="w-5 h-5" />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const url = URL.createObjectURL(e.target.files[0]);
                    useStore.getState().setOriginalImage(url);
                  }
                }}
              />
            </label>
          </div>
          
          {['Front', 'Side', 'Rear', '3/4'].map((angle) => (
            <button
              key={angle}
              className="px-4 py-2 rounded-full text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300 font-medium"
            >
              {angle}
            </button>
          ))}
        </AcrylicCard>

        {/* --- Comparison Button --- */}
        <AcrylicCard className="p-1 rounded-full bg-black/40 backdrop-blur-xl border-white/5 flex gap-1">
          <button
            onClick={() => setShowCompare(!showCompare)}
            className={cn(
              "p-3 rounded-full transition-all",
              showCompare
                ? "text-white bg-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <GitCompare className="w-5 h-5" />
          </button>
          
          {/* Fix It Button */}
          <button
            onClick={() => setShowFixDialog(true)}
            className="p-3 rounded-full text-white/60 hover:bg-white/10 hover:text-yellow-400 transition-all group relative"
            title="Fix / Refine"
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </AcrylicCard>
      </div>

      {/* --- Right Island: Manifest --- */}
      <div className="absolute right-6 top-28 bottom-28 w-80 pointer-events-auto z-50 flex flex-col">
        <AcrylicCard className="flex flex-col h-full max-h-full">
          <div className="p-6 border-b border-white/5 flex-none">
            <h2 className="text-lg font-light text-white">Build</h2>
            <p className="text-xs text-white/40 mt-1 font-mono uppercase">Current Configuration</p>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 flex flex-col gap-3">
              {/* Define all categories for the manifest */}
              {['wheel', 'tire', 'suspension', 'spacer', 'accessory'].map((catKey) => {
                const product = selectedProducts[catKey as keyof typeof selectedProducts];
                const isConfiguring = configuringCategory === catKey;
                
                if (product) {
                  return (
                    <div key={catKey} className={cn(
                      "group relative rounded-xl bg-white/5 border transition-all duration-300 overflow-hidden",
                      isConfiguring ? "border-secondary/50 bg-secondary/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]" : "border-white/5 hover:border-white/10"
                    )}>
                      <div className="p-3 flex gap-3">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-12 h-12 rounded-lg object-cover bg-black/50" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-black/50 flex items-center justify-center">
                            <Component className="w-6 h-6 text-white/20" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-0.5">{catKey}</p>
                          <p className="text-sm text-white font-medium truncate">{product.name}</p>
                          <p className="text-sm text-white/60 font-mono mt-1">${product.price.toLocaleString()}</p>
                          {/* Detailed Specs */}
                          {product.specs && (
                            <div className="mt-2 space-y-1">
                              {catKey === 'wheel' && product.specs.diameter && (
                                <p className="text-[10px] text-white/50 font-mono">
                                  {product.specs.diameter}" × {product.specs.width}" +{product.specs.offset}mm
                                  {product.specs.boltPattern && ` • ${product.specs.boltPattern}`}
                                </p>
                              )}
                              {catKey === 'tire' && product.specs.size && (
                                <p className="text-[10px] text-white/50 font-mono">
                                  {product.specs.size} • {product.specs.type}
                                </p>
                              )}
                              {catKey === 'tire' && product.specs.loadIndex && product.specs.speedRating && (
                                <p className="text-[10px] text-white/50 font-mono">
                                  Load/Speed: {product.specs.loadIndex}{product.specs.speedRating}
                                  {product.specs.warranty && ` • ${product.specs.warranty}`}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex gap-2 mt-3">
                            <button className="flex-1 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60 hover:text-white transition-all font-medium">
                              Details
                            </button>
                            <button 
                              onClick={() => setConfiguringCategory(isConfiguring ? null : catKey)}
                              className={cn(
                                "flex-1 px-3 py-1.5 rounded-md border text-xs transition-all font-medium flex items-center justify-center gap-1",
                                isConfiguring 
                                  ? "bg-secondary/20 border-secondary/40 text-secondary-foreground" 
                                  : "bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white"
                              )}
                            >
                              <Settings className="w-3 h-3" />
                              Configure
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Configuration Panel */}
                      {isConfiguring && (
                        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 duration-200">
                          <div className="mt-3 p-3 rounded-lg bg-black/20 border border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Application</span>
                              <span className="text-[10px] text-secondary flex items-center gap-1 font-medium">
                                <Check className="w-3 h-3" /> Applied
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              {/* Front Axle Toggle */}
                              <button className="flex flex-col items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group/axle">
                                <div className="flex gap-1">
                                  <div className="w-1.5 h-3 rounded-sm bg-secondary shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                  <div className="w-1.5 h-3 rounded-sm bg-secondary shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                </div>
                                <span className="text-[10px] text-white/60 group-hover/axle:text-white">Front Axle</span>
                              </button>
                              
                              {/* Rear Axle Toggle */}
                              <button className="flex flex-col items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group/axle">
                                <div className="flex gap-1">
                                  <div className="w-1.5 h-3 rounded-sm bg-secondary shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                  <div className="w-1.5 h-3 rounded-sm bg-secondary shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                                </div>
                                <span className="text-[10px] text-white/60 group-hover/axle:text-white">Rear Axle</span>
                              </button>
                            </div>

                            <div className="pt-2 border-t border-white/5">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] text-white/40">Offset</span>
                                <span className="text-[10px] text-white font-mono">+35mm</span>
                              </div>
                              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full w-3/4 bg-secondary" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => handleRemoveProduct(catKey as any)}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0f0f11] border border-white/10 text-white/40 hover:text-white hover:border-red-500/50 hover:bg-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                } else {
                  // Placeholder for unselected items
                  return (
                    <div key={catKey} className="p-3 rounded-xl border border-white/5 border-dashed opacity-50 hover:opacity-100 transition-all cursor-pointer hover:bg-white/5" onClick={() => setActiveCategory(catKey === 'wheel' ? 'wheels' : catKey === 'tire' ? 'tires' : catKey === 'suspension' ? 'suspension' : catKey === 'spacer' ? 'spacers' : 'accessories')}>
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white/20" />
                         </div>
                         <div>
                           <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-0.5">{catKey}</p>
                           <p className="text-sm text-white/20 italic">Not selected</p>
                         </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </ScrollArea>

          {/* Footer with Total & Generate */}
          <div className="p-5 border-t border-white/5 bg-black/20 flex-none">
            <div className="flex justify-between items-end mb-4">
              <span className="text-sm text-white/40 font-medium">ESTIMATED TOTAL</span>
              <span className="text-2xl font-mono text-white tracking-tight">{totalPrice > 0 ? `$${totalPrice.toLocaleString()}` : '$-'}</span>
            </div>

            <GenerateButton 
              disabled={!Object.keys(selectedProducts).length}
            />
          </div>
        </AcrylicCard>
      </div>

    </div>
  );
};
