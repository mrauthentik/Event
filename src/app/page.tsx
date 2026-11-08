import { SITE_CONFIG } from "@/config/site";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-white">
      <div className="max-w-xl text-center space-y-4">
        <span className="text-xs font-semibold tracking-wider uppercase text-[#6B7280]">
          {SITE_CONFIG.ministry}
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-[#0E1020]">
          {SITE_CONFIG.eventTitle}
        </h1>
        <p className="text-lg text-[#6B7280]">
          Theme: &ldquo;{SITE_CONFIG.theme}&rdquo;
        </p>
        <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-semibold text-sm">
          Phase 0 Initialized
        </div>
      </div>
    </main>
  );
}

