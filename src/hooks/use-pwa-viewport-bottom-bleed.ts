// src/hooks/use-pwa-viewport-bottom-bleed.ts
// iOS standalone / PWA: layout viewport bottom can sit above the visible screen when
// innerHeight ≠ visual viewport height, leaving a dead band under position:fixed UI.
// Sync the extra gap into --pwa-bottom-extra so bottom chrome + padding stay flush.

import { useEffect } from 'react';

const VAR = '--pwa-bottom-extra';

function isIosStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

export function usePwaViewportBottomBleed() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      /* Add-to-Home-Screen: no Safari bottom chrome — visualViewport vs innerHeight “gap” math
       * often mis-fires and pads the shell upward, leaving a body-colored stripe. Use env() only. */
      if (isIosStandalone()) {
        document.documentElement.style.setProperty(VAR, '0px');
        return;
      }

      const ih = window.innerHeight;
      const visibleBottom = vv.offsetTop + vv.height;
      const gap = Math.max(0, ih - visibleBottom);
      document.documentElement.style.setProperty(VAR, `${Math.round(gap * 100) / 100}px`);
    };

    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);

    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      document.documentElement.style.removeProperty(VAR);
    };
  }, []);
}
