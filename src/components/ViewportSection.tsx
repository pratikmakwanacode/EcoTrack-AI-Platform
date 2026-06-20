'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ViewportSectionProps {
  children: React.ReactNode;
  height?: string;
  className?: string;
}

export default function ViewportSection({ children, height = '200px', className = '' }: ViewportSectionProps) {
  const [hasIntersected, setHasIntersected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Return early if IntersectionObserver is not supported (e.g., SSR or older browsers)
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setHasIntersected(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasIntersected(true);
          observer.disconnect(); // Only trigger once, keep component mounted
        }
      },
      {
        rootMargin: '100px', // Pre-fetch 100px before the element enters the viewport
        threshold: 0.01,
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ minHeight: hasIntersected ? 'auto' : height }}
    >
      {hasIntersected ? (
        children
      ) : (
        <div 
          className="w-full bg-slate-900/30 backdrop-blur-md border border-slate-800/60 rounded-3xl animate-pulse flex items-center justify-center text-slate-500 text-xs font-semibold"
          style={{ height }}
        >
          Loading Interactive Section...
        </div>
      )}
    </div>
  );
}
