import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

const CustomCursor: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  // Stiffer springs for less "laggy" feel
  const cursorX = useSpring(0, { stiffness: 1000, damping: 50 });
  const cursorY = useSpring(0, { stiffness: 1000, damping: 50 });
  const cursorOuterX = useSpring(0, { stiffness: 300, damping: 30 });
  const cursorOuterY = useSpring(0, { stiffness: 300, damping: 30 });

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 4); // Center offset
      cursorY.set(e.clientY - 4);
      cursorOuterX.set(e.clientX - 24);
      cursorOuterY.set(e.clientY - 24);

      const target = e.target as HTMLElement;
      setIsHovered(!!target.closest('button, a, [data-hover="true"]'));
    };

    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, [cursorX, cursorY, cursorOuterX, cursorOuterY]);

  return (
    <>
      {/* Inner Dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 bg-brand rounded-full pointer-events-none z-[100] mix-blend-screen will-change-transform"
        style={{ x: cursorX, y: cursorY }}
      />
      {/* Outer Ring */}
      <motion.div
        className="fixed top-0 left-0 w-12 h-12 border border-brand/50 rounded-full pointer-events-none z-[100] mix-blend-screen will-change-transform"
        style={{ x: cursorOuterX, y: cursorOuterY }}
        animate={{
          scale: isHovered ? 1.5 : 1,
          opacity: isHovered ? 0.8 : 0.3,
          borderWidth: isHovered ? '2px' : '1px',
        }}
        transition={{ duration: 0.2 }} // Explicit transition for opacity/scale
      />
    </>
  );
};

export default CustomCursor;

