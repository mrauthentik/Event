import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";
import { Header } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { WhyAttend } from "@/components/marketing/why-attend";
import { MinisterCard, MoreMinistersCard } from "@/components/marketing/minister-card";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { DetailsCard } from "@/components/marketing/details-card";
import { AboutPreview } from "@/components/marketing/about-preview";
import { Footer } from "@/components/marketing/footer";
import { Reveal } from "@/components/ui/reveal";
import { Parallax } from "@/components/ui/parallax";
import { SITE_CONFIG } from "@/config/site";

export default function HomePage() {
  const eventStructuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: SITE_CONFIG.eventTitle,
    description: "Theme: " + SITE_CONFIG.theme,
    startDate: SITE_CONFIG.startsAt,
    endDate: "2026-12-11",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: SITE_CONFIG.venue.name,
      address: SITE_CONFIG.venue.landmark + ", " + SITE_CONFIG.venue.location,
    },
    organizer: {
      "@type": "Organization",
      name: SITE_CONFIG.ministry,
    },
  };
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventStructuredData) }} />
      {/* 55px Slim Header */}
      <Header />

      {/* Hero with live countdown */}
      <Hero />

      {/* Why Attend Section with chamfered collage */}
      <Reveal>
        <WhyAttend />
      </Reveal>

      {/* Featured Ministers Section matching KILO instructor card layout */}
      <Reveal>
      <section className="py-20 lg:py-24 bg-[#F8FAFC]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0E7A6E]">
              Featured Ministers
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#111320] tracking-tight">
              Featured Ministers
            </h2>
            <p className="text-sm text-[#6B7280]">
              Pastor Paul Rika and Evang. Linda Paul Rika are featured at IHGC 2026.
            </p>
          </div>

          <div className="space-y-10">
            {SITE_CONFIG.ministersInitial.map((minister) => (
              <MinisterCard
                key={minister.id}
                name={minister.name}
                role={minister.role}
                bio={minister.bio}
                image={minister.image}
                socials={{
                  youtube: SITE_CONFIG.socials.youtube,
                  facebook: SITE_CONFIG.socials.facebook,
                  x: SITE_CONFIG.socials.x,
                }}
              />
            ))}

            {/* Designed "More ministers to be announced" card */}
            <MoreMinistersCard />
          </div>
        </div>
      </section>
      </Reveal>

      {/* CTA Banner with diagonal triangles */}
      <Reveal>
        <CtaBanner />
      </Reveal>

      {/* Conference Details Card */}
      <Reveal>
        <DetailsCard />
      </Reveal>

      {/* About Horemow Preview with layered video thumbnail */}
      <Reveal>
        <AboutPreview />
      </Reveal>

      {/* Official Conference Flyer */}
      <Reveal>
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <div className="bg-[#F8FAFC] rounded-[24px] border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
              <Parallax speed={0.15} className="relative aspect-[3/4] lg:aspect-auto lg:h-[480px] bg-[#0E1020]">
                <Image
                  src="/images/conference_flyer.png"
                  alt="Official flyer for the International Holiness General Conference 2026"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </Parallax>
              <div className="p-8 sm:p-12 space-y-5">
                <span className="text-xs font-bold uppercase tracking-widest text-[#0E7A6E]">
                  Official Flyer
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#111320] tracking-tight">
                  Spread the Word — Share the Flyer
                </h2>
                <p className="text-sm text-[#6B7280] leading-relaxed">
                  Download the official International Holiness General Conference 2026 flyer and share it with your parish, cell groups, and social media. Registration is open now at ₦5,000 / $20 / €20 / £20.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <a
                    href="/images/conference_flyer.png"
                    download="IHGC-2026-Flyer.png"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0E1020] text-white font-bold text-sm hover:bg-[#1A1D36] transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#8EE3D6]" />
                    Download Flyer
                  </a>
                  <Link
                    href="/conference"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[#0E1020] text-[#0E1020] font-bold text-sm hover:bg-[#0E1020] hover:text-white transition-colors"
                  >
                    Conference Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </Reveal>

      {/* Deep Navy Footer */}
      <Footer />
    </div>
  );
}
