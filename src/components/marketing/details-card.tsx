"use client";

import Link from "next/link";
import Image from "next/image";
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
    <section className="bg-[#FAFAFA] py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#111320] sm:text-4xl">
            Conference Details
          </h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Essential dates, venue location, and session times
          </p>
        </div>

        <div className="mx-auto max-w-4xl overflow-hidden rounded-[20px] border border-gray-200/80 bg-white shadow-[0_4px_25px_rgba(0,0,0,0.05)]">
          <div className="grid grid-cols-1 items-center gap-6 p-6 sm:p-8 md:grid-cols-12">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[14px] border border-[#CDEFEA] bg-[#EAF9F7] md:col-span-4">
              <Image
                src="/images/campground.jpg"
                alt="Holiness Campground, Kwali, Abuja, during the 2025 conference"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
              />
            </div>

            <div className="space-y-2 md:col-span-4 md:pr-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#0E7A6E]">
                International Holiness General Conference 2026
              </span>
              <h3 className="text-lg font-bold leading-snug text-[#111320] sm:text-xl">
                {SITE_CONFIG.eventTitle}
              </h3>
              <p className="text-xs text-[#6B7280] sm:text-sm">
                Theme: <strong className="font-semibold text-[#111320]">&ldquo;{SITE_CONFIG.theme}&rdquo;</strong>
              </p>
              <p className="pt-1 text-xs text-gray-500">
                Registration: <strong className="text-[#111320]">₦5,000 / $20 / €20 / £20</strong> per attendee
              </p>
            </div>

            <div className="hidden h-36 w-px bg-gray-200 md:col-span-1 md:block" />

            <div className="space-y-3.5 text-xs text-[#111320] md:col-span-3">
              <div className="flex items-start gap-2.5">
                <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#0E7A6E]" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <div className="font-bold text-[#111320]">Dec 8–11, 2026</div>
                  <div className="text-[11px] text-gray-500">Tuesday to Friday</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#0E7A6E]" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <div className="font-bold text-[#111320]">4:00 PM WAT</div>
                  <div className="text-[11px] text-gray-500">Opening session</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0E7A6E]" strokeWidth={1.8} aria-hidden="true" />
                <div>
                  <div className="font-bold text-[#111320]">{SITE_CONFIG.venue.name}</div>
                  <div className="text-[11px] leading-tight text-gray-500">Behind FGC, Kwali, Abuja</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 bg-[#F8FAFC] px-6 py-3.5 sm:px-8">
            <button
              onClick={handleShare}
              aria-label="Share Conference Details"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-2xs transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A6E]"
            >
              <Share2 className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
            </button>

            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-[#8EE3D6] px-6 py-2 text-xs font-semibold tracking-wide text-[#0E1020] shadow-sm transition-colors hover:bg-[#7BD4C7]"
            >
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
