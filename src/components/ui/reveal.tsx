"use client";

import { useEffect, useRef, ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type RevealProps = {
  children: ReactNode;
  /** Stagger delay in ms */
  delay?: number;
  /** Direction of entrance */
  direction?: "up" | "left" | "right" | "none";
  className?: string;
};

const DIR_OFFSET: Record<string, { x?: number; y: number }> = {
  up: { y: 48 },
  left: { x: 48, y: 0 },
  right: { x: -48, y: 0 },
  none: { y: 0 },
};

export function Reveal({ children, delay = 0, direction = "up", className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion: render fully visible, no animation
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const offset = DIR_OFFSET[direction] ?? DIR_OFFSET.up;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        {
          opacity: 0,
          x: offset.x ?? 0,
          y: offset.y,
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          ease: "none",
          delay: delay / 1000,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            end: "top 45%",
            scrub: 0.6,
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [delay, direction]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
