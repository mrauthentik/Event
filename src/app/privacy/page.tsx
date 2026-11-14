import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { SITE_CONFIG } from "@/config/site";

export const metadata = {
  title: "Privacy Notice (Draft) | IHGC 2026",
  description: "Privacy information for IHGC 2026, pending organizer and legal review.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <section className="bg-[#0E1020] text-white py-14 text-center">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">Draft — legal review required</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Privacy Notice</h1>
        </div>
      </section>
      <main className="flex-1 py-14">
        <div className="max-w-[800px] mx-auto px-6 sm:px-8 space-y-8 text-sm text-gray-700 leading-relaxed">
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-bold text-amber-950">Organizer and legal review required</h2>
            <p className="mt-2 text-amber-950">The final privacy text, data retention period, data-subject request process, and approved privacy contact have not been supplied. This draft must be reviewed before public registration.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">Information used for registration</h2>
            <p>The registration flow asks for attendee names and phone numbers, country, optional state/parish and email, and guardian contact details when an attendee is marked as a minor. Payment is initiated with Paystack or PayPal; this application does not ask for card security codes or bank login credentials.</p>
          </section>
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#111320]">Ticket and check-in</h2>
            <p>Tickets use signed QR tokens. Staff check-in uses a limited offline roster and records arrival and booklet issuance. The organizers must confirm the retention period and deletion process for registration, payment, and check-in records.</p>
          </section>
          <section className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-6">
            <h2 className="font-bold text-[#111320]">Privacy contact</h2>
            <p className="mt-2">The approved privacy contact has not been supplied. The conference helpline is {SITE_CONFIG.contact.phone}; organizers must confirm whether it should receive privacy requests.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
