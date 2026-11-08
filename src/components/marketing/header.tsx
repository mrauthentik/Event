"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, Menu, X, MessageCircle, Share2 } from "lucide-react";
import { FacebookIcon, YoutubeIcon } from "@/components/icons/social-icons";
import { SITE_CONFIG } from "@/config/site";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Conference", href: "/conference" },
    { label: "Programme", href: "/programme" },
    { label: "Ministers", href: "/ministers" },
    { label: "Camp Info", href: "/camp-info" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-[55px]">
      <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        
        {/* Left: 4 small circular light-grey social/share icon buttons */}
        <div className="flex items-center gap-2">
          <a
            href={SITE_CONFIG.socials.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-[#CDEFEA] hover:text-[#0E1020] text-gray-600 flex items-center justify-center transition-colors"
          >
            <FacebookIcon className="w-3.5 h-3.5" />
          </a>
          <a
            href={SITE_CONFIG.socials.youtube}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-[#CDEFEA] hover:text-[#0E1020] text-gray-600 flex items-center justify-center transition-colors"
          >
            <YoutubeIcon className="w-3.5 h-3.5" />
          </a>
          <a
            href={SITE_CONFIG.contact.whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-[#CDEFEA] hover:text-[#0E1020] text-gray-600 flex items-center justify-center transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
          </a>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: SITE_CONFIG.eventTitle,
                  text: `${SITE_CONFIG.eventTitle} — Theme: "${SITE_CONFIG.theme}"`,
                  url: window.location.href,
                }).catch(() => {});
              }
            }}
            aria-label="Share"
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-[#CDEFEA] hover:text-[#0E1020] text-gray-600 flex items-center justify-center transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Center: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={SITE_CONFIG.logo.src}
              alt={SITE_CONFIG.logo.alt}
              width={SITE_CONFIG.logo.width}
              height={SITE_CONFIG.logo.height}
              className="h-8 sm:h-9 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Right: Phone, Mail (conditional), Register CTA button, Mobile hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={SITE_CONFIG.contact.phoneTel}
            aria-label={`Call ${SITE_CONFIG.contact.phone}`}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-[#CDEFEA] hover:text-[#0E1020] text-gray-600 flex items-center justify-center transition-colors"
            title={SITE_CONFIG.contact.phone}
          >
            <Phone className="w-3.5 h-3.5" strokeWidth={1.5} />
          </a>

          {SITE_CONFIG.contact.email && (
            <a
              href={`mailto:${SITE_CONFIG.contact.email}`}
              aria-label="Email"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-[#CDEFEA] hover:text-[#0E1020] text-gray-600 flex items-center justify-center transition-colors"
            >
              <Mail className="w-3.5 h-3.5" strokeWidth={1.5} />
            </a>
          )}

          <Link
            href="/register"
            className="hidden md:inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-semibold text-xs tracking-wide hover:bg-[#7BD4C7] transition-colors ml-1"
          >
            Register Now
          </Link>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[55px] bottom-0 bg-white z-40 p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-lg font-semibold text-[#111320] hover:text-[#0E1020] py-2 border-b border-gray-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          
          <div className="pt-6 space-y-3">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#8EE3D6] text-[#0E1020] font-bold text-sm tracking-wide shadow-sm"
            >
              Register Now (Individual / Group)
            </Link>
            <div className="text-center text-xs text-gray-500 pt-2">
              Help desk: {SITE_CONFIG.contact.phone}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
