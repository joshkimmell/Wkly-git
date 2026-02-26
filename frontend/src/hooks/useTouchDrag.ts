import { useRef, useCallback } from 'react';

/**
 * Adds long-press-to-drag touch support for lists/kanbans/calendars.
 *
 * Usage:
 *   const { getTouchProps } = useTouchDrag({ onDragStart, onTouchDrop });
 *   // Wrap each draggable card:
 *   <div {...getTouchProps(task.id)}><TaskCard ... /></div>
 *
 *   // Add data-drop-status or data-drop-date to drop zones:
 *   <div data-drop-status="In progress" ...>...</div>
 *   <div data-drop-date="2025-06-01" ...>...</div>
 */

interface UseTouchDragOptions {
  /** Called when a drag is initiated (after hold delay) */
  onDragStart: (taskId: string) => void;
  /**
   * Called when the finger is lifted over a valid drop target.
   * Inspect dropTarget.dataset.dropStatus / dropTarget.dataset.dropDate
   * for the destination value.
   */
  onTouchDrop: (taskId: string, dropTarget: HTMLElement) => void;
  /** Milliseconds to hold before drag activates (default: 400) */
  holdDelay?: number;
}

export function useTouchDrag({ onDragStart, onTouchDrop, holdDelay = 400 }: UseTouchDragOptions) {
  const draggingTaskIdRef = useRef<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghostRef = useRef<HTMLElement | null>(null);
  const currentDropTargetRef = useRef<HTMLElement | null>(null);
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);
  const ghostOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const removeGhost = useCallback(() => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
  }, []);

  const clearDropHighlight = useCallback(() => {
    if (currentDropTargetRef.current) {
      currentDropTargetRef.current.classList.remove('touch-drag-over');
      currentDropTargetRef.current = null;
    }
  }, []);

  const endDrag = useCallback(() => {
    cancelHold();
    removeGhost();
    clearDropHighlight();
    draggingTaskIdRef.current = null;
  }, [cancelHold, removeGhost, clearDropHighlight]);

  const getTouchProps = useCallback(
    (taskId: string) => ({
      onTouchStart(e: React.TouchEvent<HTMLElement>) {
        const touch = e.touches[0];
        touchOriginRef.current = { x: touch.clientX, y: touch.clientY };

        cancelHold();

        holdTimerRef.current = setTimeout(() => {
          holdTimerRef.current = null;
          draggingTaskIdRef.current = taskId;
          onDragStart(taskId);

          // Haptic feedback if available
          navigator.vibrate?.(30);

          // Create ghost clone
          const cardEl = e.currentTarget as HTMLElement;
          const rect = cardEl.getBoundingClientRect();
          const ghost = cardEl.cloneNode(true) as HTMLElement;

          ghostOffsetRef.current = {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
          };

          Object.assign(ghost.style, {
            position: 'fixed',
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            pointerEvents: 'none',
            zIndex: '9999',
            opacity: '0.8',
            transform: 'scale(1.04) rotate(1deg)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            borderRadius: '8px',
            transition: 'none',
          });

          document.body.appendChild(ghost);
          ghostRef.current = ghost;
        }, holdDelay);
      },

      onTouchMove(e: React.TouchEvent) {
        const touch = e.touches[0];
        const origin = touchOriginRef.current;

        // If not yet dragging, check if finger moved too far (cancel hold)
        if (!draggingTaskIdRef.current) {
          if (origin) {
            const dist = Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y);
            if (dist > 8) cancelHold();
          }
          return;
        }

        // Prevent scroll while dragging
        e.preventDefault();

        // Move ghost
        if (ghostRef.current) {
          ghostRef.current.style.left = `${touch.clientX - ghostOffsetRef.current.x}px`;
          ghostRef.current.style.top = `${touch.clientY - ghostOffsetRef.current.y}px`;
        }

        // Highlight drop target under finger
        if (ghostRef.current) ghostRef.current.style.display = 'none';
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (ghostRef.current) ghostRef.current.style.display = '';

        const dropTarget = el?.closest<HTMLElement>('[data-drop-status],[data-drop-date]') ?? null;

        if (currentDropTargetRef.current !== dropTarget) {
          clearDropHighlight();
          if (dropTarget) {
            dropTarget.classList.add('touch-drag-over');
            currentDropTargetRef.current = dropTarget;
          }
        }
      },

      onTouchEnd(e: React.TouchEvent) {
        if (!draggingTaskIdRef.current) {
          cancelHold();
          return;
        }

        const touch = e.changedTouches[0];
        // Temporarily hide ghost so elementFromPoint hits real elements
        if (ghostRef.current) ghostRef.current.style.display = 'none';
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const dropTarget = el?.closest<HTMLElement>('[data-drop-status],[data-drop-date]') ?? null;

        if (dropTarget && draggingTaskIdRef.current) {
          onTouchDrop(draggingTaskIdRef.current, dropTarget);
        }

        endDrag();
      },

      onTouchCancel() {
        endDrag();
      },
    }),
    [cancelHold, clearDropHighlight, endDrag, holdDelay, onDragStart, onTouchDrop],
  );

  return { getTouchProps, isDragging: draggingTaskIdRef.current !== null };
}
