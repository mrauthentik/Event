import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { MinisterCard, MoreMinistersCard } from "@/components/marketing/minister-card";
import { SITE_CONFIG } from "@/config/site";

export const metadata = {
  title: "Featured Ministers | IHGC 2026",
  description: "Meet the anointed ministers preaching the word of holiness at IHGC 2026.",
};

export default function MinistersPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-[#0E1020] text-white py-16 sm:py-20 text-center space-y-4">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            Servants of God
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-1">
            Featured Ministers
          </h1>
          <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base">
            Declared messengers of righteousness and sanctification ministering at IHGC 2026.
          </p>
        </div>
      </section>

      {/* Ministers List */}
      <section className="py-16 sm:py-24 bg-[#FAFAFA] flex-1">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-10">
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

          {/* More ministers card */}
          <MoreMinistersCard />
        </div>
      </section>

      <Footer />
    </div>
  );
}

