// src/hooks/use-theme.ts
// Manages dark/light theme state — persists to localStorage and updates the DOM.

import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'logd-theme';

const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  const metaThemeColor = document.getElementById('theme-color-meta');
  if (metaThemeColor) {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    if (bg) metaThemeColor.setAttribute('content', bg);
  }
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? 'dark';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const setTheme = (t: Theme) => setThemeState(t);

  return { theme, toggleTheme, setTheme };
};
