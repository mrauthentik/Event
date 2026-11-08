import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { QrView } from "@/components/ticket/qr-view";
import { db } from "@/db";
import { SITE_CONFIG } from "@/config/site";
import { Calendar, MapPin, Printer, ShieldCheck, Share2 } from "lucide-react";
import { createTicketToken } from "@/lib/crypto/ed25519";

export const metadata = {
  title: "My Conference Ticket | IHGC 2026",
  description: "Official attendee admission ticket and cryptographic QR pass.",
};

export default async function TicketPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;

  // Lookup order
  const order = await db.query.orders.findFirst({
    where: (o, { eq }) => eq(o.reference, ref),
  });

  if (!order) {
    notFound();
  }

  // Lookup attendees
  const orderAttendees = await db.query.attendees.findMany({
    where: (a, { eq }) => eq(a.orderId, order.id),
  });

  const signingKey =
    process.env.TICKET_SIGNING_PRIVATE_KEY ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  // Pre-generate tokens for display
  const ticketsWithTokens = await Promise.all(
    orderAttendees.map(async (att) => {
      const { tokenString } = await createTicketToken(att.id, signingKey);
      return {
        ...att,
        tokenString,
      };
    })
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="max-w-[800px] mx-auto space-y-8">
          
          {/* Top Banner Alert */}
          <div className="bg-[#EAF9F7] border border-[#CDEFEA] rounded-[18px] p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#8EE3D6] text-[#0E1020] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs sm:text-sm text-[#0E7A6E]">
                <strong>Admission Ticket Confirmed</strong> — Showing this screen at the gate is your primary admission pass.
              </div>
            </div>
          </div>

          {/* Render Tickets */}
          {ticketsWithTokens.map((ticket, index) => (
            <div
              key={ticket.id}
              className="bg-white rounded-[24px] shadow-[0_4px_25px_rgba(0,0,0,0.06)] border border-gray-200/80 overflow-hidden print:shadow-none print:border-black"
            >
              {/* Ticket Top Dark Header */}
              <div className="bg-[#0E1020] text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8EE3D6]">
                    Official Admission Pass • {order.isGroup ? `Seat ${index + 1} of ${orderAttendees.length}` : "Individual"}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                    {SITE_CONFIG.eventTitle}
                  </h1>
                  <p className="text-xs text-gray-300">
                    Theme: &ldquo;{SITE_CONFIG.theme}&rdquo;
                  </p>
                </div>

                <div className="inline-block bg-white/10 px-3 py-1.5 rounded-lg border border-white/20 text-center shrink-0 self-start sm:self-auto">
                  <div className="text-[9px] uppercase tracking-widest text-gray-300">Ref Code</div>
                  <div className="text-base font-black tracking-wider text-white font-mono">
                    {ticket.refCode}
                  </div>
                </div>
              </div>

              {/* Ticket Center: QR & Details */}
              <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* QR Section */}
                <div className="md:col-span-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-6">
                  <QrView
                    value={ticket.tokenString}
                    refCode={ticket.refCode}
                    attendeeName={ticket.name}
                  />
                  <div className="text-[11px] text-gray-400 text-center mt-2 font-mono">
                    ID: {ticket.refCode} • Ed25519 Cryptographically Signed
                  </div>
                </div>

                {/* Attendee & Event Metadata */}
                <div className="md:col-span-6 space-y-5 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      Attendee Name
                    </div>
                    <div className="text-xl font-bold text-[#111320] mt-0.5">
                      {ticket.name}
                    </div>
                    {ticket.parish && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {ticket.parish}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-gray-100 text-xs">
                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-[#0E7A6E] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-[#111320]">{SITE_CONFIG.datesText}</div>
                        <div className="text-gray-500">Opens Tuesday 4:00 PM WAT</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-[#0E7A6E] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-[#111320]">{SITE_CONFIG.venue.name}</div>
                        <div className="text-gray-500">{SITE_CONFIG.venue.landmark}, {SITE_CONFIG.venue.location}</div>
                      </div>
                    </div>
                  </div>

                  {/* Stand instructions */}
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-600 leading-relaxed">
                    <strong>Check-in Procedure:</strong> Present this QR code at the Kwali Campground registration stand upon arrival to receive your printed conference booklet and physical badge.
                  </div>
                </div>
              </div>

              {/* Ticket Footer Bar */}
              <div className="bg-[#F8FAFC] border-t border-gray-100 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
                <div>Order Ref: <span className="font-mono text-black font-semibold">{order.reference}</span></div>
                <div className="text-[#0E7A6E] font-semibold">Status: Confirmed</div>
              </div>
            </div>
          ))}

          {/* Bottom Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 print:hidden">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-full border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Return to Home
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

