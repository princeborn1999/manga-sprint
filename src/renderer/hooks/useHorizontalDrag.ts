import type { PointerEvent as ReactPointerEvent } from "react";

export function horizontalDragHandlers(
  enabled: boolean,
  onActivate?: () => void,
) {
  let startX = 0;
  let startY = 0;
  let moved = false;

  const start = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button,input,select")) return;
    if (!enabled && !onActivate) return;
    startX = event.screenX;
    startY = event.screenY;
    moved = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (enabled) window.mangaSprint.horizontalDragStart(event.screenX);
  };
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (
      Math.abs(event.screenX - startX) > 4 ||
      Math.abs(event.screenY - startY) > 4
    )
      moved = true;
    if (enabled) window.mangaSprint.horizontalDragMove(event.screenX);
  };
  const end = (event: ReactPointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (enabled) window.mangaSprint.horizontalDragEnd();
    if (!moved) onActivate?.();
  };
  const cancel = (event: ReactPointerEvent<HTMLElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (enabled) window.mangaSprint.horizontalDragEnd();
  };
  return {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: cancel,
  };
}
