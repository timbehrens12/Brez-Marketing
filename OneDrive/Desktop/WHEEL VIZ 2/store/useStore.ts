
import { create } from 'zustand';

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
  stanceParameters: StanceParameters;
  
  // Generation State
  isGenerating: boolean;
  generationSteps: string[]; // Log of "thoughts"
  
  // Actions
  setOriginalImage: (url: string) => void;
  setCurrentImage: (url: string) => void;
  undo: () => void;
  redo: () => void;
  
  setSelectedProduct: (product: Product | null) => void;
  setStanceParameter: (key: keyof StanceParameters, value: number) => void;
  
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
  stanceParameters: {
    rideHeight: 0,
    frontCamber: 0,
    rearCamber: 0,
    poke: 1, // Flush default
  },
  
  isGenerating: false,
  generationSteps: [],
  
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
  
  setStanceParameter: (key, value) => set((state) => ({
    stanceParameters: { ...state.stanceParameters, [key]: value }
  })),
  
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  
  addGenerationStep: (step) => set((state) => ({
    generationSteps: [...state.generationSteps, step]
  })),
  
  clearGenerationSteps: () => set({ generationSteps: [] }),
}));

