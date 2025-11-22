'use client';

import React, { useState } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { Sidebar } from '@/components/sidebar/Sidebar';

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background selection:bg-white/20">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Purple Orb */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px] opacity-60 mix-blend-screen animate-pulse duration-[10s]" />
        {/* Indigo Orb */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-950/30 blur-[150px] opacity-50 mix-blend-screen" />
        
        {/* Perspective Grid Floor */}
        <div className="absolute bottom-0 left-[-50%] right-[-50%] h-[50vh] perspective-grid opacity-40" />
        
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] pointer-events-none" />
      </div>

      {/* Main Content Layer */}
      <div className="relative z-10 h-full w-full flex">
        {/* Canvas Layer - Occupies full space behind UI */}
        <div className="absolute inset-0 z-0 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ 
          left: sidebarCollapsed ? '80px' : '450px',
          right: '320px',
          width: 'auto'
        }}>
          <Canvas />
        </div>

        {/* UI Layer - Sidebar component now acts as the floating interface overlay */}
        <div className="relative z-20 w-full h-full pointer-events-none">
          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        </div>
      </div>
    </main>
  );
}
