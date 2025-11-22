
import { create } from 'zustand';
import type { CurrentSetup } from '@/lib/deltaCalculator';

interface WheelProduct {
  id: string;
  type: 'wheel';
  brand: string;
  model: string;
  finish: string;
  diameter: number;
  width: number;
  offset: number;
  imageUrl: string;
}

interface SuspensionProduct {
  id: string;
  type: 'suspension';
  name: string;
  frontHeightChange: number;
  rearHeightChange: number;
}

export type Product = WheelProduct | SuspensionProduct;

interface StanceParameters {
  rideHeight: number; // in inches
  frontCamber: number; // in degrees
  rearCamber: number; // in degrees
  poke: number; // 0-3 scale (sunken to aggressive)
}

interface AppState {
  // Images
  originalImage: string | null;
  currentImage: string | null;
  maskImage: string | null; // Wheel masks
  
  // History
  history: string[]; // Array of image URLs
  historyIndex: number;
  
  // Selection & Parameters
  selectedProduct: Product | null;
  selectedTire: Product | null; // NEW: Track selected tire specifically
  stanceParameters: StanceParameters;
  currentSetup: CurrentSetup; 
  isSetupComplete: boolean;
  activeCategory: string | null; // NEW: Control sidebar category from store
  
  // Generation State
  isGenerating: boolean;
  generationSteps: string[]; // Log of "thoughts"
  showCompare: boolean;

  // Cart State
  cartCount: number;
  addToCart: () => void;
  removeFromCart: () => void;

  // Actions
  setShowCompare: (showCompare: boolean) => void;
  setOriginalImage: (url: string) => void;
  setCurrentImage: (url: string) => void;
  undo: () => void;
  redo: () => void;
  
  setSelectedProduct: (product: Product | null) => void;
  setSelectedTire: (tire: Product | null) => void; // NEW
  setActiveCategory: (category: string | null) => void; // NEW
  setStanceParameter: (key: keyof StanceParameters, value: number) => void;
  setCurrentSetup: (setup: CurrentSetup) => void; // NEW
  setIsSetupComplete: (complete: boolean) => void; // NEW
  
  setIsGenerating: (isGenerating: boolean) => void;
  addGenerationStep: (step: string) => void;
  clearGenerationSteps: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  originalImage: null,
  currentImage: null,
  maskImage: null,
  
  history: [],
  historyIndex: -1,
  
  selectedProduct: null,
  selectedTire: null,
  stanceParameters: {
    rideHeight: 0,
    frontCamber: 0,
    rearCamber: 0,
    poke: 1, // Flush default
  },
  currentSetup: {
    rimDiameter: 18,
    rimWidth: 9,
    offset: 35,
    suspensionType: 'stock',
  },
  isSetupComplete: false,
  activeCategory: null,
  
  isGenerating: false,
  generationSteps: [],
  showCompare: false,

  cartCount: 0,
  addToCart: () => set((state) => ({ cartCount: state.cartCount + 1 })),
  removeFromCart: () => set((state) => ({ cartCount: Math.max(0, state.cartCount - 1) })),

  setOriginalImage: (url) => set({ 
    originalImage: url, 
    currentImage: url, 
    history: [url], 
    historyIndex: 0 
  }),
  
  setCurrentImage: (url) => set((state) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(url);
    return {
      currentImage: url,
      history: newHistory,
      historyIndex: newHistory.length - 1
    };
  }),
  
  undo: () => set((state) => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      return {
        historyIndex: newIndex,
        currentImage: state.history[newIndex]
      };
    }
    return {};
  }),
  
  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      return {
        historyIndex: newIndex,
        currentImage: state.history[newIndex]
      };
    }
    return {};
  }),
  
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setSelectedTire: (tire: Product | null) => set({ selectedTire: tire }),
  setActiveCategory: (category: string | null) => set({ activeCategory: category }),
  
  setStanceParameter: (key, value) => set((state) => ({
    stanceParameters: { ...state.stanceParameters, [key]: value }
  })),
  
  setCurrentSetup: (setup) => set({ currentSetup: setup }),
  
  setIsSetupComplete: (complete) => set({ isSetupComplete: complete }),
  
  setIsGenerating: (isGenerating) => set({ isGenerating }),

  addGenerationStep: (step) => set((state) => ({
    generationSteps: [...state.generationSteps, step]
  })),

  clearGenerationSteps: () => set({ generationSteps: [] }),

  setShowCompare: (showCompare: boolean) => set({ showCompare }),
}));

