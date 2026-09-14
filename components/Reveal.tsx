"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps a block in the scroll-reveal treatment defined in globals.css
 * ([data-reveal] / [data-revealed="true"]). `index` staggers the delay
 * (60ms per step) to match the original mockup's cascading reveal.
 */
export default function Reveal({
  children,
  index = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No IntersectionObserver support — reveal immediately rather than
      // never. Same external-system-sync justification as LangProvider.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          window.setTimeout(() => setShown(true), index * 60);
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [index]);

  return (
    <div ref={ref} data-reveal data-revealed={shown} className={className} style={style}>
      {children}
    </div>
  );
}
