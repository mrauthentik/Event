import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { ShieldCheck } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export const metadata = {
  title: "Privacy Policy | IHGC 2026",
  description: "Data protection and privacy practices complying with the Nigeria Data Protection Act (NDPA).",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Header */}
      <section className="bg-[#0E1020] text-white py-14 text-center">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">
            Data Governance & NDPA Compliance
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm">
            Last Updated: November 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white flex-1">
        <div className="max-w-[800px] mx-auto px-6 sm:px-8 space-y-8 text-sm text-[#6B7280] leading-relaxed">
          
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">1. Introduction & Scope</h2>
            <p>
              Holiness Revival Movement Worldwide (&ldquo;Horemow&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is committed to protecting the personal data of all conference registrants and attendees in compliance with the Nigeria Data Protection Act 2023 (NDPA) and applicable international data privacy standards.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">2. Personal Data We Collect</h2>
            <p>
              We adhere strictly to the principle of <strong>data minimisation</strong>. We collect only what is strictly necessary to register you, process payments securely, issue tickets, and coordinate safe check-in at Kwali Campground:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Contact Information:</strong> Full name, telephone number (E.164 format), country of residence, state of origin/residence (Nigeria only), and parish/church name (optional).</li>
              <li><strong>Email Address:</strong> Optional for Nigerian registrants; required only when paying in international currencies via PayPal.</li>
              <li><strong>Protection of Minors:</strong> If an attendee is under 18 years of age, we collect the guardian&apos;s name and contact number for safety and parental consent.</li>
              <li><strong>Payment Information:</strong> We do NOT store card numbers, CVVs, or bank login credentials on our servers. All financial transactions are tokenised and processed directly by certified PCI-DSS compliant providers (Paystack and PayPal).</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">3. Cryptographic QR Security & PII Protection</h2>
            <p>
              Your conference ticket QR code contains <strong>zero Personally Identifiable Information (PII)</strong>. Each QR code encodes an opaque, cryptographically signed token generated via Ed25519 asymmetric cryptography. Even if a ticket is viewed by an unauthorized party, your phone number, email, and personal records cannot be extracted from the code.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">4. Data Retention & Post-Event Disposal</h2>
            <p>
              Personal data collected for IHGC 2026 is maintained only for the duration required to administer the conference, satisfy statutory accounting obligations, and resolve reconciliation queries. Data retention policies include an archival and secure deletion protocol following the conclusion of the event.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">5. Your Rights as a Data Subject</h2>
            <p>
              Under the NDPA, you have the right to request access to your personal data, request correction of inaccurate records, or object to specific processing. For data privacy inquiries, please contact our data team at {SITE_CONFIG.contact.phone}.
            </p>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}

