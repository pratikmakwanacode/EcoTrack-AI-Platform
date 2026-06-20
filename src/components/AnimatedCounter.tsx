'use client';

import React, { useEffect, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
}

export default function AnimatedCounter({ value, duration = 1500, decimals = 0, suffix = "" }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // cubic-bezier(0.25, 1, 0.5, 1) easing formula (easeOutQuart):
      const easeProgress = 1 - Math.pow(1 - progress, 4);

      const currentValue = start + easeProgress * (end - start);
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [value, duration]);

  return (
    <span className="transition-all duration-300 ease-out font-black">
      {displayValue.toFixed(decimals).toLocaleString()}
      {suffix}
    </span>
  );
}
