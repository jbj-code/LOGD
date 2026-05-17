// src/components/modal/Modal.tsx
// Bottom sheet modal with slide-up / slide-down animations and optional stacked layout for sticky footers.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './Modal.css';

/** Match tokens.css --transition-modal-sheet for unmount timing after close animation. */
const MODAL_SHEET_CLOSE_MS = 380;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Extra class on the sheet container (e.g. modal-sheet--stacked for scroll + footer). */
  sheetClassName?: string;
  /** Extra class on the scrollable body wrapper (e.g. flush top padding). */
  bodyClassName?: string;
  children: React.ReactNode;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  sheetClassName,
  bodyClassName,
  children,
}: ModalProps) => {
  const [mounted, setMounted] = useState(isOpen);
  const closeTimerRef = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (isOpen) {
      window.clearTimeout(closeTimerRef.current);
      queueMicrotask(() => setMounted(true));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || !mounted) return;
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = undefined;
    }, MODAL_SHEET_CLOSE_MS);
    return () => window.clearTimeout(closeTimerRef.current);
  }, [isOpen, mounted]);

  useEffect(() => {
    if (!mounted) {
      document.body.style.overflow = '';
      document.documentElement.style.removeProperty('--vv-keyboard-inset');
      return;
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const updateKeyboardInset = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--vv-keyboard-inset', `${Math.round(inset)}px`);
    };

    updateKeyboardInset();
    vv.addEventListener('resize', updateKeyboardInset);
    vv.addEventListener('scroll', updateKeyboardInset);

    return () => {
      vv.removeEventListener('resize', updateKeyboardInset);
      vv.removeEventListener('scroll', updateKeyboardInset);
      document.documentElement.style.removeProperty('--vv-keyboard-inset');
    };
  }, [mounted]);

  if (!mounted) return null;

  const leaving = !isOpen;
  const overlayClass = ['modal-overlay', leaving ? 'modal-overlay--leave' : ''].filter(Boolean).join(' ');
  const sheetClass = ['modal-sheet', sheetClassName, leaving ? 'modal-sheet--leave' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={overlayClass} onClick={onClose} role="dialog" aria-modal="true">
      <div className={sheetClass} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        )}
        <div className={['modal-body', bodyClassName].filter(Boolean).join(' ')}>{children}</div>
      </div>
    </div>
  );
};
