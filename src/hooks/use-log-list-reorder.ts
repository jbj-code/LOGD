// src/hooks/use-log-list-reorder.ts
// Long-press to enter reorder mode; pointer/touch drag to rearrange log cards.

import { useCallback, useEffect, useRef, useState } from 'react';
import { moveIdInOrder } from '../utils/log-sort';

const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_CANCEL_PX = 10;

interface UseLogListReorderOptions {
  logIds: string[];
  onCommit: (orderedIds: string[]) => void;
}

const clearTextSelection = () => {
  window.getSelection()?.removeAllRanges();
};

export const useLogListReorder = ({ logIds, onCommit }: UseLogListReorderOptions) => {
  const [reorderMode, setReorderMode] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>(logIds);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const dragIndexRef = useRef(-1);
  const suppressNextClickRef = useRef(false);
  const swapToPointRef = useRef<(clientX: number, clientY: number) => void>(() => {});

  useEffect(() => {
    if (!reorderMode) setDraftIds(logIds);
  }, [logIds, reorderMode]);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressOriginRef.current = null;
  }, []);

  const enterReorderMode = useCallback(() => {
    clearLongPress();
    clearTextSelection();
    setDraftIds(logIds);
    setReorderMode(true);
    suppressNextClickRef.current = true;
    if ('vibrate' in navigator) navigator.vibrate(12);
  }, [clearLongPress, logIds]);

  const finishReorder = useCallback(() => {
    onCommit(draftIds);
    setReorderMode(false);
    setDraggingId(null);
    dragIndexRef.current = -1;
  }, [draftIds, onCommit]);

  const swapToPoint = useCallback((clientX: number, clientY: number) => {
    if (dragIndexRef.current < 0) return;

    const target = document.elementFromPoint(clientX, clientY);
    const slot = target?.closest('[data-reorder-index]') as HTMLElement | null;
    if (!slot) return;

    const toIndex = Number.parseInt(slot.dataset.reorderIndex ?? '', 10);
    if (Number.isNaN(toIndex) || toIndex === dragIndexRef.current) return;

    setDraftIds((prev) => {
      const next = moveIdInOrder(prev, dragIndexRef.current, toIndex);
      dragIndexRef.current = toIndex;
      return next;
    });
  }, []);

  swapToPointRef.current = swapToPoint;

  const startLongPressAt = useCallback(
    (clientX: number, clientY: number) => {
      if (reorderMode) return;
      clearLongPress();
      longPressOriginRef.current = { x: clientX, y: clientY };
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        enterReorderMode();
      }, LONG_PRESS_MS);
    },
    [clearLongPress, enterReorderMode, reorderMode],
  );

  const trackLongPressMove = useCallback(
    (clientX: number, clientY: number) => {
      const origin = longPressOriginRef.current;
      if (!origin || longPressTimerRef.current === null) return;
      const dx = clientX - origin.x;
      const dy = clientY - origin.y;
      if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_CANCEL_PX) clearLongPress();
    },
    [clearLongPress],
  );

  const beginDrag = useCallback((logId: string, index: number) => {
    dragIndexRef.current = index;
    setDraggingId(logId);
    clearTextSelection();
  }, []);

  const endDrag = useCallback(() => {
    dragIndexRef.current = -1;
    setDraggingId(null);
  }, []);

  const handleCardPointerDown = useCallback(
    (event: React.PointerEvent, logId: string, index: number) => {
      if (event.pointerType === 'touch') return;

      if (reorderMode) {
        event.preventDefault();
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        beginDrag(logId, index);
        return;
      }

      startLongPressAt(event.clientX, event.clientY);
    },
    [beginDrag, reorderMode, startLongPressAt],
  );

  const handleCardPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === 'touch') return;

      if (!reorderMode) {
        trackLongPressMove(event.clientX, event.clientY);
        return;
      }

      if (dragIndexRef.current < 0) return;
      swapToPoint(event.clientX, event.clientY);
    },
    [reorderMode, swapToPoint, trackLongPressMove],
  );

  const handleCardPointerUp = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType === 'touch') return;

      clearLongPress();
      if (reorderMode && dragIndexRef.current >= 0) {
        const el = event.currentTarget as HTMLElement;
        if (el.hasPointerCapture(event.pointerId)) {
          el.releasePointerCapture(event.pointerId);
        }
        endDrag();
      }
    },
    [clearLongPress, endDrag, reorderMode],
  );

  const handleCardTouchStart = useCallback(
    (event: React.TouchEvent, logId: string, index: number) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      if (reorderMode) {
        beginDrag(logId, index);
        return;
      }

      startLongPressAt(touch.clientX, touch.clientY);
    },
    [beginDrag, reorderMode, startLongPressAt],
  );

  const handleCardTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];

      if (!reorderMode) {
        trackLongPressMove(touch.clientX, touch.clientY);
        return;
      }

      if (dragIndexRef.current < 0) return;
      event.preventDefault();
      swapToPoint(touch.clientX, touch.clientY);
    },
    [reorderMode, swapToPoint, trackLongPressMove],
  );

  const handleCardTouchEnd = useCallback(() => {
    clearLongPress();
    if (reorderMode) endDrag();
  }, [clearLongPress, endDrag, reorderMode]);

  const handleCardContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
  }, []);

  const handleCardClick = useCallback(
    (event: React.MouseEvent, onOpen: () => void) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        event.preventDefault();
        return;
      }
      if (reorderMode) {
        event.preventDefault();
        return;
      }
      onOpen();
    },
    [reorderMode],
  );

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  useEffect(() => {
    if (!reorderMode) return;

    const onTouchMove = (event: TouchEvent) => {
      if (dragIndexRef.current < 0 || event.touches.length !== 1) return;
      event.preventDefault();
      const touch = event.touches[0];
      swapToPointRef.current(touch.clientX, touch.clientY);
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', onTouchMove);
  }, [reorderMode]);

  return {
    reorderMode,
    draftIds,
    draggingId,
    finishReorder,
    handleCardPointerDown,
    handleCardPointerMove,
    handleCardPointerUp,
    handleCardTouchStart,
    handleCardTouchMove,
    handleCardTouchEnd,
    handleCardContextMenu,
    handleCardClick,
  };
};
