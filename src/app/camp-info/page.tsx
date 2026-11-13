import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { MapPin, Phone, AlertTriangle, CheckSquare, Utensils, Home, Compass } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export const metadata = {
  title: "Camp Info & What to Bring | IHGC 2026",
  description: "Venue map, road directions, accommodation guidance, and packing checklist for Holiness Campground, Kwali.",
};

export default function CampInfoPage() {
  const checklist = [
    "Your Holy Bible (KJV / physical copy)",
    "Notebook, pen, and study journal",
    "Warm cardigan or shawl (Abuja harmattan nights and early mornings are chilly)",
    "Personal toiletries and essential medicines",
    "Bedding / blanket (if staying in campground halls or local guesthouses)",
    "Printed ticket QR code or saved offline on your smartphone",
    "Sufficient cash for meals and personal needs (camp network can be intermittent)",
    "Modest Christian apparel reflecting holiness and inward reverence",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-[#0E1020] text-white py-16 sm:py-20 text-center space-y-4">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            Venue & Logistics
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-1">
            Camp Info & What to Bring
          </h1>
          <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base">
            Everything you need to know about arriving, staying, and preparing for IHGC 2026 in Kwali, Abuja.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 sm:py-24 bg-white flex-1">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-16">
          
          {/* CRITICAL NOTICE: Accommodation & Meals */}
          <div className="bg-[#FFFBEB] border-l-4 border-amber-500 rounded-r-[18px] p-6 sm:p-8 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2.5 text-amber-900 font-bold text-base sm:text-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Important Notice: Accommodation & Meals Are Not Included</span>
            </div>
            <p className="text-sm text-amber-900/90 leading-relaxed">
              Your flat registration fee (<strong>₦5,000 / $20 / €20 / £20</strong>) provides full access to all four days of conference ministrations, your printed programme booklet, and attendee badge. 
              <strong> Attendees are responsible for arranging their own accommodation and food.</strong>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-amber-950">
              <div className="flex items-start gap-2">
                <Home className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Lodging:</strong> Attendees are responsible for arranging their own accommodation. No lodging options have been confirmed by the organizers yet.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Utensils className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Meals:</strong> Meals are not included in registration. Attendees should arrange their own food.
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Google Map */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#111320]">Campground Location</h2>
                <p className="text-xs text-gray-500">{SITE_CONFIG.venue.name}, {SITE_CONFIG.venue.landmark}, {SITE_CONFIG.venue.location}</p>
              </div>
              <a
                href="https://maps.google.com/?cid=9603706013222394524"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#0E7A6E] hover:underline hidden sm:block"
              >
                Open in Google Maps →
              </a>
            </div>

            <div className="w-full aspect-[16/9] sm:aspect-[21/9] rounded-[24px] overflow-hidden border border-gray-200 shadow-md">
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

          {/* Road Directions */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-bold text-[#111320]">
              <Compass className="w-5 h-5 text-[#0E7A6E]" />
              <h3>How to Get to Kwali Campground</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-[#6B7280]">
              <div className="bg-[#F8FAFC] p-6 rounded-[18px] border border-gray-100 space-y-2">
                <h4 className="font-bold text-[#111320]">From Abuja City Centre / Airport</h4>
                <p className="leading-relaxed">
                  Take the Abuja-Lokoja Expressway heading south past Giri Junction and Gwagwalada. Continue past the Kwali bridge. Turn off behind the Federal Government College (FGC), Kwali following the Horemow directional signs directly to the Holiness Campground.
                </p>
              </div>
              <div className="bg-[#F8FAFC] p-6 rounded-[18px] border border-gray-100 space-y-2">
                <h4 className="font-bold text-[#111320]">From Southern / Western Nigeria via Lokoja</h4>
                <p className="leading-relaxed">
                  Travelling north along the Lokoja-Abuja highway, approach Kwali town before Gwagwalada. Make a turn at the Kwali town access road heading towards Federal Government College (FGC). Follow the signs to the campground gate.
                </p>
              </div>
            </div>
          </div>

          {/* What to Bring Checklist */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-[#111320]">
              Recommended Packing Checklist
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {checklist.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3.5 rounded-[12px] bg-[#F8FAFC] border border-gray-100">
                  <CheckSquare className="w-4 h-4 text-[#0E7A6E] shrink-0" />
                  <span className="text-xs sm:text-sm text-[#111320] font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Support Helpline */}
          <div className="bg-[#F8FAFC] rounded-[20px] p-6 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-[#111320]">Need Travel or Directions Assistance?</div>
              <div className="text-xs text-gray-500">Contact the Kwali camp protocol and reception helpline</div>
            </div>
            <a
              href={SITE_CONFIG.contact.phoneTel}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0E1020] text-white font-semibold text-xs hover:bg-[#1A1D36] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#8EE3D6]" />
              <span>{SITE_CONFIG.contact.phone}</span>
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}

