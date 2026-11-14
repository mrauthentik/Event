import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { SITE_CONFIG } from "@/config/site";

export const metadata = {
  title: "Terms & Refund Policy (Draft) | IHGC 2026",
  description: "Interim draft terms and refund policy for IHGC 2026, pending organizer and legal review.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <section className="bg-[#0E1020] text-white py-14 text-center">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Draft — organizer and legal review required</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Terms & Refund Policy</h1>
        </div>
      </section>
      <div className="bg-amber-50 border-b border-amber-200 py-3 px-6 text-center text-xs text-amber-950">
        This is an interim draft, not a finalized policy. Confirm the TBD items and obtain legal review before registration launch.
      </div>
      <main className="flex-1 py-14">
        <div className="max-w-[800px] mx-auto px-6 sm:px-8 space-y-8 text-sm text-gray-700 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">Registration and event facts</h2>
            <p>{SITE_CONFIG.eventTitle} is scheduled for 8–11 December 2026 at {SITE_CONFIG.venue.name}, {SITE_CONFIG.venue.landmark}, {SITE_CONFIG.venue.location}. Accommodation and meals are not included in the registration fee.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">Interim refund terms</h2>
            <p>Registration fees are non-refundable after payment confirmation, except for these cases in the current draft:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Duplicate payments for the same registration.</li>
              <li>Payment taken but no ticket issued because of a system error.</li>
              <li>Cancellation of the event by the organizers.</li>
            </ul>
            <p>Approved exceptions are intended to be refunded in full to the original payment method. Each refund requires organizer approval and an audit record. Processing timeline: <strong>[TBD by organizers]</strong>.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">Name substitution</h2>
            <p>The draft allows free name substitution until <strong>[DATE TBD by organizers; 5 December 2026 was suggested]</strong>. The supported process and contact instructions must be confirmed before this is presented as a final policy.</p>
          </section>
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-bold text-amber-950">Items still requiring owner review</h2>
            <p className="mt-2 text-amber-950">Final policy wording, substitution date and process, refund processing timeline, and legal approval.</p>
            <p className="mt-3 text-amber-950">Conference helpline: <a className="underline" href={SITE_CONFIG.contact.phoneTel}>{SITE_CONFIG.contact.phone}</a></p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
