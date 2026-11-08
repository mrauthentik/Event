"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, Share2 } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export function DetailsCard() {
  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: SITE_CONFIG.eventTitle,
          text: `${SITE_CONFIG.eventTitle}. Theme: "${SITE_CONFIG.theme}". ${SITE_CONFIG.datesText}.`,
          url: window.location.href,
        })
        .catch(() => {});
    }
  };

  return (
    <section className="py-20 lg:py-24 bg-[#FAFAFA]">
      <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#111320] tracking-tight">
            Conference Details
          </h2>
          <p className="text-sm text-[#6B7280] mt-2">
            Essential dates, venue location, and session times
          </p>
        </div>

        {/* Wide White Card */}
        <div className="bg-white rounded-[20px] border border-gray-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.05)] overflow-hidden max-w-4xl mx-auto">
          {/* Main Card Body */}
          <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Left Image */}
            <div className="md:col-span-4 relative aspect-[4/3] rounded-[14px] overflow-hidden bg-gray-100">
              <Image
                src="/images/about_us_1.jpg"
                alt="Horemow Holiness Campground"
                fill
                className="object-cover"
              />
            </div>

            {/* Middle: Title & Theme */}
            <div className="md:col-span-4 space-y-2 md:pr-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#0E7A6E]">
                Annual General Convocation
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#111320] leading-snug">
                {SITE_CONFIG.eventTitle}
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280]">
                Theme: <strong className="text-[#111320] font-semibold">&ldquo;{SITE_CONFIG.theme}&rdquo;</strong>
              </p>
              <div className="text-xs text-gray-500 pt-1">
                Flat registration: <strong className="text-[#111320]">₦5,000 / $20</strong> (All attendees)
              </div>
            </div>

            {/* Vertical Divider (desktop only) */}
            <div className="hidden md:block w-px h-36 bg-gray-200" />

            {/* Right Column: Icon Rows */}
            <div className="md:col-span-3 space-y-3.5 text-xs text-[#111320]">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#0E7A6E] shrink-0 mt-0.5" strokeWidth={1.8} />
                <div>
                  <div className="font-bold text-[#111320]">Dec 8 – 11, 2026</div>
                  <div className="text-gray-500 text-[11px]">Tuesday to Friday</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#0E7A6E] shrink-0 mt-0.5" strokeWidth={1.8} />
                <div>
                  <div className="font-bold text-[#111320]">4:00 PM WAT</div>
                  <div className="text-gray-500 text-[11px]">Opening Session</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#0E7A6E] shrink-0 mt-0.5" strokeWidth={1.8} />
                <div>
                  <div className="font-bold text-[#111320]">{SITE_CONFIG.venue.name}</div>
                  <div className="text-gray-500 text-[11px] leading-tight">
                    Behind FGC, Kwali, Abuja
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Light-Grey Strip */}
          <div className="bg-[#F8FAFC] border-t border-gray-100 px-6 sm:px-8 py-3.5 flex items-center justify-between">
            <button
              onClick={handleShare}
              aria-label="Share Conference Details"
              className="w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center transition-colors shadow-2xs"
            >
              <Share2 className="w-4 h-4" strokeWidth={1.6} />
            </button>

            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-[#8EE3D6] text-[#0E1020] font-semibold text-xs tracking-wide hover:bg-[#7BD4C7] transition-colors shadow-sm"
            >
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
