"use client";

import Image from "next/image";
import { Parallax } from "@/components/ui/parallax";

/**
 * Hero background with GSAP parallax layer.
 * The image layer is taller than the section (-inset-y bleed) so the
 * scrubbed translate never reveals edges.
 */
export function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <Parallax speed={0.22} className="absolute -inset-y-[18%] inset-x-0">
        <Image
          src="/images/crowd-bw.jpg"
          alt="Horemow International Holiness General Conference Congregation"
          fill
          priority
          className="object-cover object-center opacity-40 mix-blend-luminosity"
        />
      </Parallax>
      {/* Multilayer gradient matching KILO desktop reference */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0E1020]/95 via-[#0E1020]/80 to-[#0E1020]/95 lg:from-[#0E1020]/75 lg:via-[#0E1020]/70 lg:to-[#0E1020]/95" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0E1020] via-transparent to-black/30" />
    </div>
  );
}
