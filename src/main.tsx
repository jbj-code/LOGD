// src/main.tsx
// Application entry point.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const blockSelectionOutsideInputs = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest('input, textarea, [contenteditable="true"]')) return;
  event.preventDefault();
};

document.addEventListener('selectstart', blockSelectionOutsideInputs);
document.addEventListener('contextmenu', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.closest('input, textarea, [contenteditable="true"]')) return;
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
