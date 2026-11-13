"use client";

import { useEffect, useRef, ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ParallaxProps = {
  children: ReactNode;
  /** Parallax intensity: 0.1 subtle, 0.3 moderate, 0.5 strong */
  speed?: number;
  className?: string;
};

/**
 * GSAP ScrollTrigger parallax layer.
 * The wrapper is translated vertically as the user scrolls (scrubbed).
 * Give the child extra vertical bleed (e.g. -inset-y) so edges never show.
 * Respects prefers-reduced-motion.
 */
export function Parallax({ children, speed = 0.28, className = "" }: ParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: speed * 190 },
        {
          y: -speed * 190,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [speed]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
