"use client";

import { useEffect, useRef } from "react";

export default function CursorRing() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const ring = ref.current;
    if (!ring) return;

    const onMove = (e: MouseEvent) => {
      ring.style.opacity = "1";
      ring.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      const target = e.target as HTMLElement;
      const hot = target.closest?.("a,button,input,select,textarea,[role=img]");
      ring.style.width = hot ? "48px" : "28px";
      ring.style.height = hot ? "48px" : "28px";
      ring.style.margin = hot ? "-24px 0 0 -24px" : "-14px 0 0 -14px";
      ring.style.borderColor = hot ? "#C1440E" : "rgba(11,11,10,0.35)";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 28,
        height: 28,
        margin: "-14px 0 0 -14px",
        border: "1px solid rgba(11,11,10,0.35)",
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 200,
        opacity: 0,
        transition:
          "width .3s ease, height .3s ease, margin .3s ease, border-color .3s ease, opacity .3s ease",
        mixBlendMode: "difference",
      }}
    />
  );
}
