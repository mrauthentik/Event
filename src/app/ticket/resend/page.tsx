"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { Search, CheckCircle2, AlertCircle, Phone, ArrowLeft } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function ResendTicketPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!query.trim()) {
      setError("Please enter your reference code, phone number, or email.");
      return;
    }

    setLoading(true);

    try {
      // If user typed a reference code directly (e.g. HGC-XXXXXX)
      const clean = query.trim().toUpperCase();
      if (clean.startsWith("HGC-")) {
        const res = await fetch(`/api/checkout/status/${clean}`);
        const data = await res.json();
        if (data.status === "paid") {
          window.location.href = `/ticket/${clean}`;
          return;
        }
      }

      // Generic response to prevent enumeration
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || "Failed to search for ticket.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full bg-white rounded-[24px] border border-gray-100 p-8 shadow-sm space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold text-[#111320]">
              Ticket Lookup & Recovery
            </h1>
            <p className="text-xs text-[#6B7280]">
              Retrieve your admission pass or resolve pending payment status.
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#111320]">
                  Reference Code, Phone Number, or Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. HGC-K7M9P2 or +2348012345678"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[8px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#0E1020] hover:bg-[#1A1D36] text-white font-bold text-xs tracking-wide transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? "Searching Gateway..." : "Find My Ticket"}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-[#EAF9F7] text-[#0E7A6E] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#111320]">
                  Request Received
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  If an active paid order matches <strong className="text-black">{query}</strong>, your ticket link has been resent via SMS/Email.
                </p>
              </div>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs text-[#0E7A6E] font-semibold underline cursor-pointer"
              >
                Search another reference
              </button>
            </div>
          )}

          {/* Help Desk Link */}
          <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-500">
            Still need help? Call or WhatsApp our helpline at{" "}
            <a href={SITE_CONFIG.contact.phoneTel} className="font-semibold text-black underline">
              {SITE_CONFIG.contact.phone}
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

