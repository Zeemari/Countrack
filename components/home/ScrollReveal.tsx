"use client";

import { useEffect, useRef, useState } from "react";

/** Words fade from faint to full ink as the paragraph scrolls through the viewport. */
export function ScrollReveal({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(0);
  const words = text.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when the top enters the lower 85% of the screen, 1 when the bottom reaches 45%.
      const p = (vh * 0.85 - r.top) / (r.height + vh * 0.4);
      setProgress(reduced ? 1 : Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const lit = progress * words.length;
  return (
    <p ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span
          key={i}
          aria-hidden
          className="transition-opacity duration-300"
          style={{ opacity: i < lit ? 1 : 0.16 }}
        >
          {w}{" "}
        </span>
      ))}
    </p>
  );
}
