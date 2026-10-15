import type { PointerEvent as ReactPointerEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { horizontalDragHandlers } from "../../src/renderer/hooks/useHorizontalDrag";

afterEach(() => vi.unstubAllGlobals());

describe("Widget horizontal drag", () => {
  it("right-click does not capture the pointer, drag or expand the collapsed Widget", () => {
    const dragStart = vi.fn();
    const dragEnd = vi.fn();
    vi.stubGlobal("window", {
      mangaSprint: {
        horizontalDragStart: dragStart,
        horizontalDragEnd: dragEnd,
      },
    });
    const activate = vi.fn();
    const handlers = horizontalDragHandlers(true, activate);
    let captured = false;
    const element = {
      setPointerCapture: vi.fn(() => {
        captured = true;
      }),
      releasePointerCapture: vi.fn(() => {
        captured = false;
      }),
      hasPointerCapture: vi.fn(() => captured),
    };
    const event = {
      button: 2,
      pointerId: 1,
      screenX: 400,
      screenY: 0,
      currentTarget: element,
      target: { closest: () => null },
    } as unknown as ReactPointerEvent<HTMLElement>;

    handlers.onPointerDown(event);
    handlers.onPointerUp(event);

    expect(element.setPointerCapture).not.toHaveBeenCalled();
    expect(dragStart).not.toHaveBeenCalled();
    expect(dragEnd).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();

    const leftClick = { ...event, button: 0 };
    handlers.onPointerDown(leftClick);
    handlers.onPointerUp(leftClick);
    expect(dragStart).toHaveBeenCalledWith(400);
    expect(dragEnd).toHaveBeenCalledOnce();
    expect(activate).toHaveBeenCalledOnce();
  });
});
