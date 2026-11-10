import Link from "next/link";
import { Calendar } from "lucide-react";
import { Countdown } from "@/components/ui/countdown";
import { HeroBackground } from "@/components/marketing/hero-background";
import { SITE_CONFIG } from "@/config/site";

export function Hero() {
  return (
    <section className="relative w-full min-h-[640px] lg:min-h-[720px] flex items-center bg-[#0E1020] overflow-hidden">
      {/* Background Image with GSAP Parallax + Deep Navy Gradient Overlay */}
      <HeroBackground />

      {/* Content Container */}
      <div className="relative z-10 max-w-[1240px] mx-auto px-6 sm:px-8 py-20 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column (Empty spacer on desktop to push text block to the RIGHT half, as in KILO inspiration) */}
        <div className="hidden lg:block lg:col-span-5" />

        {/* Right Column: Date, H1, Countdown, Pill Button */}
        <div className="lg:col-span-7 flex flex-col items-start space-y-6 sm:space-y-8 text-left">
          
          {/* Calendar Badge */}
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold tracking-wider uppercase text-gray-300 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-sm">
            <Calendar className="w-3.5 h-3.5 text-[#8EE3D6]" strokeWidth={1.8} />
            <span>December 8 – 11, 2026</span>
          </div>

          {/* Bold White H1 (max 3 lines) */}
          <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-white leading-[1.08] tracking-[-0.03em] max-w-2xl">
            International Holiness General Conference 2026
          </h1>

          {/* Theme text */}
          <p className="text-base sm:text-lg text-gray-300 font-medium max-w-xl">
            Theme: <span className="text-[#8EE3D6] font-semibold">&ldquo;{SITE_CONFIG.theme}&rdquo;</span>
          </p>

          {/* Live Countdown */}
          <div className="pt-2 pb-2">
            <Countdown />
          </div>

          {/* Outlined Pill Button (1px white border, transparent, white text) */}
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 rounded-full border border-white/80 bg-transparent text-white font-semibold text-sm tracking-wide hover:bg-white hover:text-[#0E1020] hover:border-white transition-all duration-200 active:scale-95 shadow-sm"
            >
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

