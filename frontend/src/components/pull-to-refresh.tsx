"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useUiCopy } from "./use-ui-copy";

const THRESHOLD = 80;
const INTERACTIVE = "button, a, input, textarea, select, summary, [role=button], [role=dialog], .chart, .leaflet-container, svg";

export function PullToRefresh({ onRefresh, disabled, error }: {
  onRefresh: () => Promise<void>;
  disabled: boolean;
  error: string;
}) {
  const { uiText } = useUiCopy();
  const anchor = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    mounted.current = true;
    document.documentElement.classList.add("simara-pull-refresh");
    return () => {
      mounted.current = false;
      document.documentElement.classList.remove("simara-pull-refresh");
    };
  }, []);

  useEffect(() => {
    const main = anchor.current?.parentElement?.querySelector("main");
    if (!main || disabled) return;
    const mobile = window.matchMedia("(max-width: 640px)");
    let start: { x: number; y: number } | null = null;
    let travel = 0;
    function reset() {
      start = null;
      travel = 0;
      setPulling(false);
      if (!busy.current) setDistance(0);
    }
    function touchStart(event: TouchEvent) {
      if (!mobile.matches || busy.current || window.scrollY > 0 || event.touches.length !== 1) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest(INTERACTIVE)) return;
      // Nested scrolling regions keep ownership of their gestures.
      for (let node: Element | null = target; node && node !== main; node = node.parentElement) {
        if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) return;
      }
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      travel = 0;
    }
    function touchMove(event: TouchEvent) {
      if (!start) return;
      if (!mobile.matches || event.touches.length !== 1 || window.scrollY > 0) { reset(); return; }
      const dx = event.touches[0].clientX - start.x;
      const dy = event.touches[0].clientY - start.y;
      if (Math.abs(dx) > 8 && Math.abs(dx) >= Math.abs(dy) || dy < -8) { reset(); return; }
      if (dy <= 8) { travel = 0; setDistance(0); setPulling(false); return; }
      if (!event.cancelable) { reset(); return; }
      event.preventDefault();
      travel = dy;
      setPulling(true);
      setDistance(Math.min(64, dy * .5));
    }
    async function touchEnd() {
      const ready = start && travel >= THRESHOLD && mobile.matches && window.scrollY <= 0;
      start = null;
      travel = 0;
      setPulling(false);
      if (!ready || busy.current) { if (!busy.current) setDistance(0); return; }
      busy.current = true;
      setLoading(true);
      setDistance(44);
      try { await onRefresh(); }
      finally {
        busy.current = false;
        if (mounted.current) { setLoading(false); setDistance(0); }
      }
    }
    main.addEventListener("touchstart", touchStart, { passive: true });
    main.addEventListener("touchmove", touchMove, { passive: false });
    main.addEventListener("touchend", touchEnd);
    main.addEventListener("touchcancel", reset);
    mobile.addEventListener("change", reset);
    return () => {
      reset();
      main.removeEventListener("touchstart", touchStart);
      main.removeEventListener("touchmove", touchMove);
      main.removeEventListener("touchend", touchEnd);
      main.removeEventListener("touchcancel", reset);
      mobile.removeEventListener("change", reset);
    };
  }, [disabled, onRefresh]);

  return <div ref={anchor} className="pull-refresh-anchor">
    <div className={`pull-refresh-indicator${pulling ? " pulling" : ""}`} style={{ transform: `translate(-50%, ${distance - 40}px)`, opacity: distance ? 1 : 0 }} aria-hidden={!distance}>
      <RefreshCw size={19} className={loading ? "pull-refresh-spin" : ""} style={loading ? undefined : { transform: `rotate(${distance * 4}deg)` }} />
      <span className="pull-refresh-label" role="status">{uiText(loading ? "Memperbarui data" : distance >= THRESHOLD / 2 ? "Lepaskan untuk memperbarui" : "Tarik untuk memperbarui")}</span>
    </div>
    {error && <p className="pull-refresh-error" role="alert">{uiText(error)}</p>}
  </div>;
}
