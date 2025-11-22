
'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const LoadingOverlay = () => {
  const { isGenerating, generationSteps } = useStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Update the current step index based on the latest step added
  useEffect(() => {
    if (generationSteps.length > 0) {
      setCurrentStepIndex(generationSteps.length - 1);
    } else {
      setCurrentStepIndex(0);
    }
  }, [generationSteps]);

  return (
    <AnimatePresence>
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
        >
          {/* Center Animation Container */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            
            {/* Spinning Rings - Outer */}
            <div className="absolute inset-0 border border-purple-500/30 rounded-full animate-[spin_3s_linear_infinite]" />
            <div className="absolute inset-4 border border-indigo-500/30 rounded-full animate-[spin_4s_linear_infinite_reverse]" />
            <div className="absolute inset-8 border border-white/20 rounded-full animate-[spin_5s_linear_infinite]" />
            
            {/* Glowing Core */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-purple-600/20 rounded-full blur-2xl animate-pulse" />
              <div className="w-16 h-16 bg-white/10 rounded-full backdrop-blur-md border border-white/30 flex items-center justify-center shadow-[0_0_30px_rgba(147,51,234,0.5)]">
                 <div className="w-2 h-2 bg-white rounded-full animate-ping" />
              </div>
            </div>

            {/* Scanning Line Effect */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-purple-500/10 to-transparent animate-[scan_2s_ease-in-out_infinite] opacity-50" />
            
          </div>

          {/* Text Status */}
          <div className="mt-8 flex flex-col items-center gap-2 text-center">
            <motion.h3 
              key={generationSteps[currentStepIndex] || "Initializing..."}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-light text-white tracking-[0.2em] uppercase"
            >
              {generationSteps[currentStepIndex] || "INITIALIZING SYSTEM"}
            </motion.h3>
            
            <div className="flex gap-1 mt-2">
              <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce" />
            </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};

