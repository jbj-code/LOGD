// src/components/splash/SplashScreen.tsx
// Full-screen boot animation — 3×3 grid wave-fill while data loads.

import type { CSSProperties } from 'react';
import './SplashScreen.css';

/** Diagonal wave delays (ms): index = row*3 + col, sum (row+col) orders the wave. */
const delayMsForCell = (index: number) => {
  const row = Math.floor(index / 3);
  const col = index % 3;
  return (row + col) * 72;
};

export const SplashScreen = () => (
  <div className="splash-screen" aria-hidden>
    <div className="splash-screen__grid">
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className="splash-screen__cell"
          style={{ '--splash-delay': `${delayMsForCell(i)}ms` } as CSSProperties}
        />
      ))}
    </div>
  </div>
);
