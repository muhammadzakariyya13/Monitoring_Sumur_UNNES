"use client";

import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";

// Three stops: a reachable header, the normal panel, and the expanded panel.
export function useMapSheet(middle = 48, upper = 78) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stop, setStop] = useState(1);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ id: number; y: number; start: number; levels: number[]; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const heights = ["104px", `${middle}%`, `${upper}%`];
  const style = { "--sheet-height": dragHeight === null ? heights[stop] : `${dragHeight}px` } as CSSProperties;
  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (!e.isPrimary || e.button !== 0 || !window.matchMedia("(max-width: 640px)").matches) return;
      const height = containerRef.current?.getBoundingClientRect().height;
      if (!height) return;
      suppressClick.current = false;
      const levels = [104, Math.max(105, height * middle / 100), Math.max(106, height * upper / 100)];
      drag.current = { id: e.pointerId, y: e.clientY, start: levels[stop], levels, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current || current.id !== e.pointerId) return;
      const distance = current.y - e.clientY;
      if (Math.abs(distance) > 5) current.moved = true;
      if (current.moved) setDragHeight(Math.max(current.levels[0], Math.min(current.levels[2], current.start + distance)));
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current || current.id !== e.pointerId) return;
      if (current.moved) {
        const distance = current.y - e.clientY;
        const end = current.start + distance;
        let candidates = [0, 1, 2];
        if (Math.abs(distance) > 30) candidates = candidates.filter((index) => distance > 0 ? index > stop : index < stop);
        if (candidates.length) setStop(candidates.reduce((best, index) => Math.abs(current.levels[index] - end) < Math.abs(current.levels[best] - end) ? index : best));
        suppressClick.current = true;
      }
      drag.current = null;
      setDragHeight(null);
    },
    onPointerCancel() { drag.current = null; setDragHeight(null); },
    onLostPointerCapture() { drag.current = null; setDragHeight(null); },
  };
  function toggle(e?: MouseEvent<HTMLElement>) {
    if (suppressClick.current && e && e.detail !== 0) { suppressClick.current = false; return; }
    setStop(stop === 2 ? 0 : 2);
  }
  return { containerRef, style, handlers, toggle, stop, expand: () => setStop(2), reset: () => setStop(1) };
}
