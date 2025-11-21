
'use client';

import React, { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ThinkingTerminal = () => {
  const { isGenerating, generationSteps } = useStore();
  const [isExpanded, setIsExpanded] = React.useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [generationSteps]);

  // Auto-expand when generating starts
  useEffect(() => {
    if (isGenerating) {
      setTimeout(() => setIsExpanded(true), 0);
    }
  }, [isGenerating]);

  if (!isGenerating && generationSteps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-6 left-6 z-30 w-80 md:w-96 font-mono text-xs"
    >
      <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 cursor-pointer bg-neutral-900 hover:bg-neutral-800 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 text-neutral-400">
            <Terminal className="w-3.5 h-3.5" />
            <span className="font-semibold uppercase tracking-wider">Nano Banana Pro</span>
          </div>
          <div className="flex items-center gap-2">
            {isGenerating && <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />}
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Terminal Body */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div 
                ref={scrollRef}
                className="max-h-48 overflow-y-auto p-3 space-y-1.5 text-neutral-300"
              >
                {generationSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-2"
                  >
                    <span className="text-neutral-600 select-none">›</span>
                    <span className={cn(
                      i === generationSteps.length - 1 && isGenerating ? "text-emerald-400" : "text-neutral-300"
                    )}>
                      {step}
                      {i === generationSteps.length - 1 && isGenerating && (
                        <span className="inline-block w-1.5 h-3 ml-1 bg-emerald-500 animate-pulse align-middle" />
                      )}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

