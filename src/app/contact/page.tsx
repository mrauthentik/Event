import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { Phone, MessageCircle, MapPin, Mail, Clock } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export const metadata = {
  title: "Contact Us | IHGC 2026",
  description: "Get in touch with the Horemow International Holiness General Conference planning committee.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-[#0E1020] text-white py-16 sm:py-20 text-center space-y-4">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            Get In Touch
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-1">
            Contact Support & Protocol
          </h1>
          <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base">
            Have an inquiry regarding registration, arrival at Kwali Campground, or group bookings?
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 sm:py-24 bg-white flex-1">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Phone Card */}
            <div className="bg-[#F8FAFC] p-6 rounded-[20px] border border-gray-100 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#111320] text-lg">Telephone Helpline</h3>
                <p className="text-xs text-[#6B7280]">
                  For urgent registration assistance and telephone inquiries.
                </p>
              </div>
              <div>
                <a
                  href={SITE_CONFIG.contact.phoneTel}
                  className="font-bold text-[#0E1020] hover:text-[#0E7A6E] text-base"
                >
                  {SITE_CONFIG.contact.phone}
                </a>
              </div>
            </div>

            {/* WhatsApp Card */}
            <div className="bg-[#F8FAFC] p-6 rounded-[20px] border border-gray-100 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#111320] text-lg">WhatsApp Support</h3>
                <p className="text-xs text-[#6B7280]">
                  Send inquiries, receipt reconciliation proofs, or directions questions.
                </p>
              </div>
              <div>
                <a
                  href={SITE_CONFIG.contact.whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-700 text-sm"
                >
                  <span>Chat on WhatsApp</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            {/* Campground Address Card */}
            <div className="bg-[#F8FAFC] p-6 rounded-[20px] border border-gray-100 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#111320] text-lg">Campground Venue</h3>
                <p className="text-xs text-[#6B7280]">
                  Holiness Campground, Behind FGC, Kwali, Abuja, Nigeria.
                </p>
              </div>
              <div className="text-xs text-gray-500">
                WAT Timezone (UTC+1)
              </div>
            </div>

          </div>

          {/* Interactive Map */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[#111320]">Location Map</h3>
            <div className="w-full aspect-[16/8] rounded-[24px] overflow-hidden border border-gray-200 shadow-sm">
              <iframe
                src={SITE_CONFIG.venue.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Horemow Holiness Campground Kwali Google Maps"
              />
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}

