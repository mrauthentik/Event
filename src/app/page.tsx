import { Header } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { WhyAttend } from "@/components/marketing/why-attend";
import { MinisterCard, MoreMinistersCard } from "@/components/marketing/minister-card";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { DetailsCard } from "@/components/marketing/details-card";
import { AboutPreview } from "@/components/marketing/about-preview";
import { Footer } from "@/components/marketing/footer";
import { SITE_CONFIG } from "@/config/site";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 55px Slim Header */}
      <Header />

      {/* Hero with live countdown */}
      <Hero />

      {/* Why Attend Section with chamfered collage */}
      <WhyAttend />

      {/* Featured Ministers Section matching KILO instructor card layout */}
      <section className="py-20 lg:py-24 bg-[#F8FAFC]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0E7A6E]">
              Anointed Ministry
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#111320] tracking-tight">
              Featured Ministers
            </h2>
            <p className="text-sm text-[#6B7280]">
              Ministers called by God to declare the unadulterated word of holiness and truth
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
                }}
              />
            ))}

            {/* Designed "More ministers to be announced" card */}
            <MoreMinistersCard />
          </div>
        </div>
      </section>

      {/* CTA Banner with diagonal triangles */}
      <CtaBanner />

      {/* Conference Details Card */}
      <DetailsCard />

      {/* About Horemow Preview with layered video thumbnail */}
      <AboutPreview />

      {/* Deep Navy Footer */}
      <Footer />
    </div>
  );
}
