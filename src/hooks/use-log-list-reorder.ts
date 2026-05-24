// src/hooks/use-log-list-reorder.ts
// Long-press to enter reorder mode; pointer drag to rearrange log cards.

import { useCallback, useEffect, useRef, useState } from 'react';
import { moveIdInOrder } from '../utils/log-sort';

const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_CANCEL_PX = 10;

interface UseLogListReorderOptions {
  logIds: string[];
  onCommit: (orderedIds: string[]) => void;
}

export const useLogListReorder = ({ logIds, onCommit }: UseLogListReorderOptions) => {
  const [reorderMode, setReorderMode] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>(logIds);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const dragIndexRef = useRef(-1);

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
    setDraftIds(logIds);
    setReorderMode(true);
    if ('vibrate' in navigator) navigator.vibrate(12);
  }, [clearLongPress, logIds]);

  const finishReorder = useCallback(() => {
    onCommit(draftIds);
    setReorderMode(false);
    setDraggingId(null);
    dragIndexRef.current = -1;
  }, [draftIds, onCommit]);

  const handleCardPointerDown = useCallback(
    (event: React.PointerEvent, logId: string, index: number) => {
      if (reorderMode) {
        event.preventDefault();
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        dragIndexRef.current = index;
        setDraggingId(logId);
        return;
      }

      clearLongPress();
      longPressOriginRef.current = { x: event.clientX, y: event.clientY };
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        enterReorderMode();
      }, LONG_PRESS_MS);
    },
    [clearLongPress, enterReorderMode, reorderMode],
  );

  const handleCardPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!reorderMode) {
        const origin = longPressOriginRef.current;
        if (!origin || longPressTimerRef.current === null) return;
        const dx = event.clientX - origin.x;
        const dy = event.clientY - origin.y;
        if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_CANCEL_PX) clearLongPress();
        return;
      }

      if (dragIndexRef.current < 0) return;

      const target = document.elementFromPoint(event.clientX, event.clientY);
      const slot = target?.closest('[data-reorder-index]') as HTMLElement | null;
      if (!slot) return;

      const toIndex = Number.parseInt(slot.dataset.reorderIndex ?? '', 10);
      if (Number.isNaN(toIndex) || toIndex === dragIndexRef.current) return;

      setDraftIds((prev) => {
        const next = moveIdInOrder(prev, dragIndexRef.current, toIndex);
        dragIndexRef.current = toIndex;
        return next;
      });
    },
    [clearLongPress, reorderMode],
  );

  const handleCardPointerUp = useCallback(
    (event: React.PointerEvent) => {
      clearLongPress();
      if (reorderMode && dragIndexRef.current >= 0) {
        if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) {
          (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
        }
        dragIndexRef.current = -1;
        setDraggingId(null);
      }
    },
    [clearLongPress, reorderMode],
  );

  const handleCardClick = useCallback(
    (event: React.MouseEvent, onOpen: () => void) => {
      if (reorderMode) {
        event.preventDefault();
        return;
      }
      onOpen();
    },
    [reorderMode],
  );

  useEffect(() => () => clearLongPress(), [clearLongPress]);

  return {
    reorderMode,
    draftIds,
    draggingId,
    finishReorder,
    handleCardPointerDown,
    handleCardPointerMove,
    handleCardPointerUp,
    handleCardClick,
  };
};
