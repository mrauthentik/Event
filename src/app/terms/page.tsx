import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { AlertCircle } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export const metadata = {
  title: "Terms & Refund Policy (Draft) | IHGC 2026",
  description: "Terms and conditions, substitution policies, and refund provisions for IHGC 2026.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Header */}
      <section className="bg-[#0E1020] text-white py-14 text-center">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
            [DRAFT — PENDING FINAL OWNER RATIFICATION]
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Terms & Refund Policy
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm">
            Last Updated: November 2026
          </p>
        </div>
      </section>

      {/* Draft Warning Banner */}
      <div className="bg-amber-50 border-b border-amber-200 py-3 px-6 text-center text-xs text-amber-900 font-medium">
        <span className="font-bold">Notice:</span> This policy is an interim operational draft. Final legal ratification will be posted prior to the event.
      </div>

      {/* Content */}
      <section className="py-16 bg-white flex-1">
        <div className="max-w-[800px] mx-auto px-6 sm:px-8 space-y-8 text-sm text-[#6B7280] leading-relaxed">
          
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">1. Registration & Event Attendance</h2>
            <p>
              By completing an individual or group registration for the International Holiness General Conference 2026 (&ldquo;IHGC 2026&rdquo;), you agree to comply with all biblical standards of conduct, camp guidelines, and security procedures established by Holiness Revival Movement Worldwide (&ldquo;Horemow&rdquo;).
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">2. Non-Refundable Fee Policy</h2>
            <p>
              Except as expressly provided below, all registration fees (₦5,000 NGN, $20 USD, €20 EUR, £20 GBP) are <strong>strictly non-refundable</strong> once payment has been confirmed by our payment gateways or approved by administration.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">3. Permitted Refund Exceptions</h2>
            <p>
              Refunds will be issued in full to the original payment method only under the following strictly documented circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Duplicate Payments:</strong> Where a card or bank transaction was charged more than once for the same registration order due to a gateway error.
              </li>
              <li>
                <strong>System Failure:</strong> Where payment was successfully deducted and settled but our system was unable to issue a valid ticket due to an irrecoverable technical defect.
              </li>
              <li>
                <strong>Event Cancellation:</strong> In the unforeseen event that the conference is completely cancelled by the ministry organizers.
              </li>
            </ul>
            <p className="text-xs text-gray-500">
              All refund requests must be verified against official bank or gateway statements, approved by the Finance Director, and logged in our immutable audit trail.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">4. Name Substitutions</h2>
            <p>
              If a registered attendee is unable to attend, name substitution is permitted <strong>free of charge</strong> until <strong>5 December 2026 (23:59 WAT)</strong>. Substitutions can be initiated via the group leader dashboard or by contacting the ministry support desk at <strong>{SITE_CONFIG.contact.phone}</strong>. Upon successful substitution, the previous attendee&apos;s cryptographic QR code is permanently invalidated.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">5. Accommodation & Food Disclaimer</h2>
            <p>
              Registration fees cover admission to the conference sessions, official conference materials, and one conference booklet per confirmed attendee. <strong>Accommodation and meals are explicitly excluded.</strong> Horemow accepts no responsibility or liability for attendees&apos; personal lodging arrangements or private transactions with external vendors.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">6. Contact & Dispute Resolution</h2>
            <p>
              For inquiries regarding registration reconciliation or substitution, please contact the registration committee at:
            </p>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs text-[#111320] font-mono">
              Helpline: {SITE_CONFIG.contact.phone} <br />
              Venue: Holiness Campground, Behind FGC, Kwali, Abuja, Nigeria
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}

