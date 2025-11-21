'use client';

import React, { useState } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { Sidebar } from '@/components/sidebar/Sidebar';

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar Area - Left side */}
      <aside
        className={`h-full flex-shrink-0 z-10 shadow-xl transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-[70px]' : 'w-[400px] lg:w-[30%]'
        }`}
      >
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </aside>

      {/* Main Canvas Area - Expands when sidebar collapses */}
      <section
        className={`flex-1 h-full relative min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-[calc(100%-70px)]' : 'w-[calc(100%-400px)] lg:w-[70%]'
        }`}
      >
        <Canvas />
      </section>
    </main>
  );
}
