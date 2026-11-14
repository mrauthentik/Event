"use client";

import { useState } from "react";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { BookOpen, Calendar } from "lucide-react";

export default function ProgrammePage() {
  const [activeTab, setActiveTab] = useState<"tue" | "wed" | "thu" | "fri">("tue");
  const tabs = [
    { id: "tue", date: "Tuesday, 8 Dec", label: "Day 1" },
    { id: "wed", date: "Wednesday, 9 Dec", label: "Day 2" },
    { id: "thu", date: "Thursday, 10 Dec", label: "Day 3" },
    { id: "fri", date: "Friday, 11 Dec", label: "Day 4" },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <section className="bg-[#0E1020] text-white py-16 sm:py-20 text-center">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">Conference Schedule</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-1">Conference Programme</h1>
          <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base">8–11 December 2026 · Holiness Campground, Kwali, Abuja</p>
        </div>
      </section>
      <main className="py-16 sm:py-24 bg-[#FAFAFA] flex-1">
        <div className="max-w-[900px] mx-auto px-6 sm:px-8 space-y-10">
          <div className="flex items-center justify-start sm:justify-center overflow-x-auto gap-2 pb-2">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id}
                className={`px-5 py-3 rounded-full text-xs sm:text-sm font-semibold shrink-0 ${activeTab === tab.id ? "bg-[#0E1020] text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
                <span>{tab.date}</span><span className="opacity-70 text-[11px] block sm:inline sm:ml-1.5">· {tab.label}</span>
              </button>
            ))}
          </div>
          <section className="bg-white rounded-[24px] border border-gray-200 p-8 sm:p-12 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#EAF9F7] text-[#0E7A6E] mx-auto flex items-center justify-center"><BookOpen className="w-7 h-7" /></div>
            <h2 className="text-xl font-bold text-[#111320]">The full programme will be released at the conference</h2>
            <p className="text-sm text-[#6B7280] max-w-lg mx-auto leading-relaxed">The official printed programme booklet will be available on 8 December 2026. No session schedule has been supplied for this day.</p>
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-50 px-4 py-2 rounded-full border border-gray-100"><Calendar className="w-3.5 h-3.5" />{tabs.find((tab) => tab.id === activeTab)?.date}</span>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
