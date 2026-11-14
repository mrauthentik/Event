import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Parallax } from "@/components/ui/parallax";

export function WhyAttend() {
  const points = [
    {
      title: "Conference Theme",
      description: "Man and Satan in Contention Against the Holy God.",
    },
    {
      title: "Four Conference Days",
      description: "Tuesday 8 December through Friday 11 December 2026. The opening is at 4:00 PM WAT.",
    },
    {
      title: "Kwali, Abuja",
      description: "The conference venue is Holiness Campground, behind FGC, Kwali, Abuja, Nigeria.",
    },
  ];

  return (
    <section className="py-20 lg:py-28 bg-white overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Heading, Subtitle, Bullet list, Mint Pill Button */}
          <div className="lg:col-span-6 flex flex-col items-start space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#111320] leading-[1.15] tracking-tight">
              Why Attend This Conference?
            </h2>
            
            <p className="text-base text-[#6B7280] leading-relaxed">
              The International Holiness General Conference 2026 takes place from 8 to 11 December at Holiness Campground, Kwali, Abuja.
            </p>

            {/* Bullet items with mint arrow-chevrons */}
            <div className="space-y-5 pt-2">
              {points.map((pt, idx) => (
                <div key={idx} className="flex items-start gap-3.5">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#EAF9F7] flex items-center justify-center shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-[#0E1020]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[#111320]">
                      {pt.title}
                    </h3>
                    <p className="text-sm text-[#6B7280] leading-relaxed mt-1">
                      {pt.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filled mint pill button */}
            <div className="pt-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#8EE3D6] text-[#0E1020] font-semibold text-sm tracking-wide hover:bg-[#7BD4C7] shadow-sm transition-all duration-200 active:scale-95"
              >
                Register For Conference
              </Link>
            </div>
          </div>

          {/* Right Column: Layered Collage with Chamfered Corner & Mint Frame */}
          <div className="lg:col-span-6 relative flex min-w-0 justify-center lg:justify-end">
            {/* Mint outline frame background */}
            <div className="absolute -top-4 right-0 sm:-right-4 w-72 h-80 sm:w-96 sm:h-[420px] rounded-[32px] border-2 border-[#8EE3D6]/40 -z-0" />

            <div className="relative z-10 grid w-full max-w-[500px] grid-cols-12 items-start gap-3 sm:gap-4">
              {/* Primary Main Image: Official Conference Flyer (parallax layer) */}
              <Parallax speed={0.18} className="col-span-8 col-start-1 relative aspect-[4/5] min-w-0 rounded-[24px] overflow-hidden shadow-xl bg-[#0E1020]">
                <Image
                  src="/images/conference_flyer.png"
                  alt="Official flyer for the International Holiness General Conference 2026"
                  fill
                  className="object-contain"
                  quality={95}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </Parallax>

              {/* Secondary worship photo with a chamfered corner */}
              <Parallax speed={0.28} className="col-span-7 col-start-6 -ml-0 sm:-ml-16 mt-10 sm:mt-24 relative aspect-[3/4] min-w-0 rounded-[20px] overflow-hidden shadow-2xl clip-chamfer-tr bg-[#0E1020]">
                <Image
                  src="/images/crowd-bw_2.jpg"
                  alt="Worshippers gathered for a conference service"
                  fill
                  quality={95}
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </Parallax>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

