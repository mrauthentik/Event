"use client";

import { useState } from "react";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { BookOpen, Calendar, Clock, AlertCircle } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function ProgrammePage() {
  const [activeTab, setActiveTab] = useState<"tue" | "wed" | "thu" | "fri">("tue");

  const tabs = [
    { id: "tue", date: "Tuesday, 8 Dec", label: "Day 1 (Opening)" },
    { id: "wed", date: "Wednesday, 9 Dec", label: "Day 2" },
    { id: "thu", date: "Thursday, 10 Dec", label: "Day 3" },
    { id: "fri", date: "Friday, 11 Dec", label: "Day 4 (Closing)" },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-[#0E1020] text-white py-16 sm:py-20 text-center space-y-4">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            Conference Schedule
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-1">
            Conference Programme
          </h1>
          <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base">
            December 8 – 11, 2026 • Holiness Campground, Kwali, Abuja
          </p>
        </div>
      </section>

      {/* Main Tabbed Container */}
      <section className="py-16 sm:py-24 bg-[#FAFAFA] flex-1">
        <div className="max-w-[900px] mx-auto px-6 sm:px-8 space-y-10">
          
          {/* Day Tabs */}
          <div className="flex items-center justify-start sm:justify-center overflow-x-auto gap-2 pb-2 scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 rounded-full text-xs sm:text-sm font-semibold transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#0E1020] text-white shadow-sm"
                    : "bg-white text-gray-600 hover:text-black border border-gray-200"
                }`}
              >
                <span>{tab.date}</span>
                <span className="opacity-70 text-[11px] block sm:inline sm:ml-1.5">
                  • {tab.label}
                </span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-[24px] border border-gray-200/80 p-8 sm:p-12 shadow-sm">
            {activeTab === "tue" && (
              <div className="space-y-8">
                {/* Tuesday Confirmed Opening Slot */}
                <div className="p-6 rounded-[18px] bg-[#EAF9F7] border border-[#CDEFEA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0E7A6E]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>4:00 PM WAT</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#0E1020]">
                      Official Conference Opening Ministration
                    </h3>
                    <p className="text-sm text-gray-600">
                      Opening prayer, keynote ministration by Pastor Paul Rika, and welcome charge.
                    </p>
                  </div>
                  <div className="text-xs font-semibold px-4 py-2 rounded-full bg-white text-[#0E7A6E] shrink-0 self-start sm:self-center shadow-2xs">
                    Confirmed
                  </div>
                </div>

                {/* Designed Empty State */}
                <div className="text-center py-10 space-y-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 mx-auto flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-[#111320]">
                      The full programme will be released at the conference
                    </h4>
                    <p className="text-sm text-[#6B7280] max-w-md mx-auto">
                      Printed programme booklets will be issued to registered attendees at the registration stand upon arrival on 8 December 2026.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== "tue" && (
              <div className="text-center py-16 space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#EAF9F7] text-[#0E7A6E] mx-auto flex items-center justify-center">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-[#111320]">
                    The full programme will be released at the conference
                  </h4>
                  <p className="text-sm text-[#6B7280] max-w-lg mx-auto leading-relaxed">
                    Session schedules, ministers, and choir presentations for this day are currently being finalized by the organizing committee. The official printed programme booklet will be distributed at Kwali Campground.
                  </p>
                </div>
                <div className="pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 font-medium bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                    <Calendar className="w-3.5 h-3.5" />
                    Booklet arrival: 8 December 2026
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}

