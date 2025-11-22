'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';

interface UpsizeAlertProps {
  onClose: () => void;
  onConfirm: () => void;
}

export const UpsizeAlert = ({ onClose, onConfirm }: UpsizeAlertProps) => {
  const { setActiveCategory, currentSetup, selectedProduct } = useStore();

  const handleSelectTires = () => {
    setActiveCategory('tires');
    onClose();
  };

  const diff = (selectedProduct as any)?.diameter - currentSetup.rimDiameter;
  const isUpsize = diff > 0;
  const absDiff = Math.abs(diff);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 bg-card border-primary/20 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="flex flex-col items-center text-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-2">
              {isUpsize ? 'Upsize' : 'Downsize'} Detected! ({diff > 0 ? '+' : ''}{diff}")
            </h3>
            <p className="text-sm text-muted-foreground">
              You're changing from <strong>{currentSetup.rimDiameter}"</strong> to <strong>{(selectedProduct as any)?.diameter}"</strong> wheels.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              To make this look realistic (and fit your car), you usually need <strong>{isUpsize ? 'lower profile' : 'taller/thicker'} tires</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 w-full mt-4">
            <button
              onClick={handleSelectTires}
              className="w-full py-3 px-4 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group"
            >
              Select Tires
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            
            <button
              onClick={onConfirm}
              className="w-full py-3 px-4 bg-white/5 text-white font-medium rounded-lg hover:bg-white/10 transition-colors"
            >
              Generate Anyway (Use AI Guess)
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

