"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { ChevronDown, HelpCircle, Phone } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How much is the conference registration fee?",
      a: "Registration is a flat rate of ₦5,000 for Nigerian attendees, or $20 USD / €20 EUR / £20 GBP for international attendees. There are no category differences; the same flat price applies to all attendees.",
    },
    {
      q: "Are accommodation and meals included in the registration fee?",
      a: "No. Accommodation and meals are not included. Attendees must arrange their own accommodation and food. The organizers have not provided lodging or meal details.",
    },
    {
      q: "Can I register a whole group, family, or church parish together?",
      a: "Yes! You can choose 'Group Registration'. You can pay for all members in a single payment and either fill in their details immediately or share an invite link so members can claim their seats themselves. The group order also receives an express group QR code for fast gate check-in.",
    },
    {
      q: "Do I need an email address to register?",
      a: "No. Email is completely optional for Nigerian attendees paying in Naira via Paystack. Your phone number (+234 format) and your unique reference code (HGC-XXXXXX) are all that is required. If you pay via PayPal in USD/EUR/GBP, an email address is required by PayPal.",
    },
    {
      q: "How do I receive my ticket and QR code?",
      a: "After payment is confirmed, your ticket and QR code are available on screen. Keep that page or your reference code available. SMS delivery is also attempted; use the ticket recovery page if you need help.",
    },
    {
      q: "What if money was deducted from my account but I didn't see my ticket?",
      a: "Do not pay again immediately. Use the ticket recovery page with your reference code, phone number, or email. The system checks the payment provider and returns a generic response while any matching paid ticket is retried.",
    },
    {
      q: "What is the refund and cancellation policy?",
      a: "The interim refund and substitution policy is still a draft pending organizer review. Read the Terms & Refund Policy (Draft) page for the current draft.",
    },
    {
      q: "When does the conference start and when does registration close?",
      a: "The conference opens on Tuesday, 8 December 2026 at 4:00 PM WAT and runs through Friday, 11 December 2026. Online registration closes on 11 December 2026 at 23:59 WAT.",
    },
    {
      q: "Will the check-in scanner work if network is down at Kwali Campground?",
      a: "Yes. Our check-in scanner PWA is engineered offline-first with Ed25519 cryptographic signatures. Gate attendants can verify ticket authenticity and issue conference booklets even without active cellular network.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Hero Header */}
      <section className="bg-[#0E1020] text-white py-16 sm:py-20 text-center space-y-4">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            Frequently Asked Questions
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-1">
            Questions & Answers
          </h1>
          <p className="text-gray-300 max-w-xl mx-auto text-sm sm:text-base">
            Find confirmed information about registration, event dates, and tickets.
          </p>
        </div>
      </section>

      {/* Accordion FAQ List */}
      <section className="py-16 sm:py-24 bg-[#FAFAFA] flex-1">
        <div className="max-w-[840px] mx-auto px-6 sm:px-8 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-[16px] border border-gray-200/80 overflow-hidden shadow-2xs transition-all"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:bg-gray-50"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-[#111320] text-sm sm:text-base leading-snug">
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-[#EAF9F7] text-[#0E7A6E]" : "text-gray-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-sm text-[#6B7280] leading-relaxed border-t border-gray-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}

          {/* Need help footer card */}
          <div className="bg-[#EAF9F7] rounded-[20px] p-6 sm:p-8 border border-[#CDEFEA] text-center space-y-3 mt-10">
            <h3 className="text-base font-bold text-[#0E1020]">
              Still have a question not answered here?
            </h3>
            <p className="text-xs sm:text-sm text-[#0E7A6E]">
              Our conference registration helpline is available via phone and WhatsApp.
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <a
                href={SITE_CONFIG.contact.phoneTel}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0E1020] text-white font-semibold text-xs hover:bg-[#1A1D36] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#8EE3D6]" />
                <span>Call {SITE_CONFIG.contact.phone}</span>
              </a>
              <a
                href={SITE_CONFIG.contact.whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-semibold text-xs hover:bg-[#7BD4C7] transition-colors"
              >
                <span>WhatsApp Helpline</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

