// src/components/fab-menu/FabMenu.tsx
// Mobile-only FAB above the bottom nav: opens an animated menu for add vs quick-log.

import { useEffect, useRef } from 'react';
import './FabMenu.css';

interface FabMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onNewLogType: () => void;
  onQuickLog: () => void;
}

export const FabMenu = ({
  isOpen,
  onOpenChange,
  onNewLogType,
  onQuickLog,
}: FabMenuProps) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el || !isOpen) return;
      if (!el.contains(e.target as Node)) onOpenChange(false);
    };
    if (isOpen) document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isOpen, onOpenChange]);

  const close = () => onOpenChange(false);

  return (
    <div ref={rootRef} className={`fab-menu ${isOpen ? 'fab-menu--open' : ''}`}>
      {isOpen && (
        <button
          type="button"
          className="fab-menu__backdrop"
          aria-label="Close menu"
          onClick={close}
        />
      )}

      <div className="fab-menu__stack">
        <div className="fab-menu__actions">
          <button
            type="button"
            className="fab-menu__chip"
            onClick={() => {
              close();
              onQuickLog();
            }}
          >
            <span className="material-symbols-rounded">today</span>
            Log today
          </button>
          <button
            type="button"
            className="fab-menu__chip"
            onClick={() => {
              close();
              onNewLogType();
            }}
          >
            <span className="material-symbols-rounded">add_task</span>
            New log type
          </button>
        </div>

        <button
          type="button"
          className="fab-menu__fab"
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={isOpen ? 'Close actions' : 'Open actions'}
          onClick={() => onOpenChange(!isOpen)}
        >
          <span className="material-symbols-rounded fab-menu__fab-icon">add</span>
        </button>
      </div>
    </div>
  );
};
