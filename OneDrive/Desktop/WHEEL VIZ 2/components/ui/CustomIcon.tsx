
import React from 'react';
import { cn } from '@/lib/utils';

interface CustomIconProps {
  src: string;
  className?: string;
  alt?: string;
}

export const CustomIcon = ({ src, className, alt = "icon" }: CustomIconProps) => {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src={src} 
        alt={alt}
        className="w-full h-full object-contain transition-all duration-300"
        style={{
          filter: 'invert(1) brightness(2)', // Makes black icons white
          opacity: 0.4 // Matches the default text-white/40 style
        }} 
      />
      {/* Hover state is handled by parent group-hover classes affecting opacity */}
      <style jsx>{`
        div:hover img,
        .group:hover img,
        .active img {
          opacity: 1 !important;
          filter: invert(1) brightness(2) drop-shadow(0 0 2px rgba(255,255,255,0.5)) !important;
        }
        
        /* Specific active state handling when parent has active class */
        :global(.group.bg-white\\/10) img {
          opacity: 1 !important;
          filter: invert(1) brightness(2) drop-shadow(0 0 2px rgba(255,255,255,0.5)) !important;
        }
      `}</style>
    </div>
  );
};

