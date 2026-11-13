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
  animateOnMount?: boolean;
  className?: string;
};

const DIR_OFFSET: Record<string, { x?: number; y: number }> = {
  up: { y: 72 },
  left: { x: 80, y: 0 },
  right: { x: -80, y: 0 },
  none: { y: 0 },
};

export function Reveal({ children, delay = 0, direction = "up", animateOnMount = false, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion: render fully visible, no animation
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const offset = DIR_OFFSET[direction] ?? DIR_OFFSET.up;

    const ctx = gsap.context(() => {
      const trigger = {
        trigger: el,
        start: "top 92%",
        end: "top 48%",
        scrub: 0.65,
        invalidateOnRefresh: true,
      };
      const entrance = animateOnMount
        ? { duration: 0.9, ease: "power3.out", delay: delay / 1000 }
        : { ease: "power2.out", scrollTrigger: trigger };

      gsap.fromTo(
        el,
        {
          opacity: 0,
          x: offset.x ?? 0,
          y: offset.y,
          scale: 0.97,
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          ...entrance,
        }
      );

      const copy = el.querySelectorAll<HTMLElement>("h1, h2, h3, p");
      if (copy.length) {
        gsap.fromTo(
          copy,
          { opacity: 0.15, y: 28, filter: "blur(4px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            stagger: animateOnMount ? 0.13 : 0.055,
            delay: animateOnMount ? delay / 1000 + 0.12 : 0,
            ...(animateOnMount ? { duration: 0.75 } : { ease: "power2.out", scrollTrigger: trigger }),
          }
        );
      }

      const images = el.querySelectorAll<HTMLImageElement>("img");
      if (images.length) {
        gsap.fromTo(
          images,
          { opacity: 0.65, scale: 1.14, y: 34 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            stagger: animateOnMount ? 0.14 : 0.07,
            delay: animateOnMount ? delay / 1000 + 0.2 : 0,
            ...(animateOnMount ? { duration: 1.1, ease: "power3.out" } : { ease: "power2.out", scrollTrigger: trigger }),
          }
        );
      }
    }, el);

    return () => ctx.revert();
  }, [animateOnMount, delay, direction]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
