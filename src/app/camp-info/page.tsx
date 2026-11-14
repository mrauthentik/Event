import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { AlertTriangle, MapPin, Phone, Ticket } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export const metadata = {
  title: "Camp Info & What to Bring | IHGC 2026",
  description: "Confirmed venue and attendee planning information for IHGC 2026.",
};

export default function CampInfoPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <section className="bg-[#0E1020] text-white py-16 sm:py-20 text-center">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">Venue & Planning</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Camp Info & What to Bring</h1>
          <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base">Confirmed attendee information for IHGC 2026.</p>
        </div>
      </section>
      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-8">
          <section className="rounded-[18px] border border-amber-200 bg-amber-50 p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <AlertTriangle className="w-5 h-5" /> Accommodation and meals are not included
            </div>
            <p className="text-sm leading-relaxed text-amber-950">
              Attendees must arrange their own accommodation and food. The organizers have not provided lodging or meal details.
            </p>
          </section>

          <section className="rounded-[18px] border border-gray-200 bg-white p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2 text-[#111320] font-bold">
              <MapPin className="w-5 h-5 text-[#0E7A6E]" /> Conference venue
            </div>
            <p className="text-sm text-gray-600">{SITE_CONFIG.venue.name}, {SITE_CONFIG.venue.landmark}, {SITE_CONFIG.venue.location}.</p>
          </section>

          <section className="rounded-[18px] border border-gray-200 bg-white p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-[#111320] font-bold">
              <MapPin className="w-5 h-5 text-[#0E7A6E]" /> Confirmed Venue Location & Map
            </div>
            <p className="text-sm text-gray-600">
              {SITE_CONFIG.venue.name}, {SITE_CONFIG.venue.landmark}, {SITE_CONFIG.venue.location}.
            </p>
            <div className="overflow-hidden rounded-[14px] border border-gray-200 bg-gray-50">
              <div className="aspect-[16/9] w-full min-h-[320px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4096.546839279105!2d7.057758310743839!3d8.829087291188033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x104e8a458c737ff9%3A0x8547b10178d75a9c!2sHoliness%20Camp%20Ground%2C%20Kwali%20Abuja!5e1!3m2!1sen!2sng!4v1794127232959!5m2!1sen!2sng"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Holiness Camp Ground, Kwali, Abuja Map"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[18px] border border-gray-200 bg-[#F8FAFC] p-6 sm:p-8 space-y-3">
            <h2 className="text-lg font-bold text-[#111320]">Before you travel</h2>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2"><Ticket className="mt-0.5 h-4 w-4 text-[#0E7A6E]" />Keep your ticket QR code or reference code available at arrival.</li>
              <li className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 text-[#0E7A6E]" />Arrange your own accommodation and food.</li>
            </ul>
            <p className="text-xs text-gray-500">The official programme booklet will be available at the conference on 8 December 2026.</p>
          </section>

          <section className="rounded-[18px] border border-gray-200 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#111320]">Conference helpline</h2>
              <p className="text-xs text-gray-500">Call for event information.</p>
            </div>
            <a href={SITE_CONFIG.contact.phoneTel} className="inline-flex items-center gap-2 rounded-full bg-[#0E1020] px-6 py-2.5 text-xs font-semibold text-white">
              <Phone className="w-4 h-4 text-[#8EE3D6]" />{SITE_CONFIG.contact.phone}
            </a>
          </section>
          <div className="text-center"><Link href="/contact" className="text-sm font-semibold text-[#0E7A6E] underline">Contact information</Link></div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
