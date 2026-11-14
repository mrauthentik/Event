import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { Phone, MessageCircle, MapPin } from "lucide-react";
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
            Contact the Conference
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
                  For conference registration and venue information.
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
                  Send conference inquiries by WhatsApp.
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
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#111320]">Location Map & Travel Directions</h3>
            <div className="overflow-hidden rounded-[20px] border border-gray-200 shadow-sm bg-white">
              <div className="aspect-[16/9] w-full min-h-[350px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4096.546839279105!2d7.057758310743839!3d8.829087291188033!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x104e8a458c737ff9%3A0x8547b10178d75a9c!2sHoliness%20Camp%20Ground%2C%20Kwali%20Abuja!5e1!3m2!1sen!2sng!4v1794127232959!5m2!1sen!2sng"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  title="Google Maps - Holiness Campground Kwali Abuja"
                />
              </div>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}

