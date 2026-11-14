import { db } from "@/db";
import { attendees, orders } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Printer, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function AdminRosterPrintPage() {
  const user = await requireRole("admin");
  if (!user) {
    redirect("/staff/login");
  }

  let confirmedAttendees: Array<{
    id: string;
    refCode: string;
    name: string;
    phoneE164: string;
    state: string | null;
    country: string;
    parish: string | null;
    isMinor: boolean;
    guardianName: string | null;
    status: string;
    checkedInAt: Date | null;
    bookletIssuedAt: Date | null;
  }> = [];

  try {
    const records = await db
      .select({ attendee: attendees })
      .from(attendees)
      .innerJoin(orders, eq(attendees.orderId, orders.id))
      .where(and(eq(orders.status, "paid"), isNull(attendees.deletedAt)))
      .orderBy(asc(attendees.state), asc(attendees.name));

    confirmedAttendees = records.map((r) => ({
      id: r.attendee.id,
      refCode: r.attendee.refCode,
      name: r.attendee.name,
      phoneE164: r.attendee.phoneE164,
      state: r.attendee.state || "FCT Abuja",
      country: r.attendee.country,
      parish: r.attendee.parish,
      isMinor: r.attendee.isMinor,
      guardianName: r.attendee.guardianName,
      status: r.attendee.status,
      checkedInAt: r.attendee.checkedInAt,
      bookletIssuedAt: r.attendee.bookletIssuedAt,
    }));
  } catch (err) {
    console.error("[admin/roster-print] Query error:", err);
  }

  // Group by State
  const byState = new Map<string, typeof confirmedAttendees>();
  for (const a of confirmedAttendees) {
    const key = a.state || "Other States";
    const list = byState.get(key) || [];
    list.push(a);
    byState.set(key, list);
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans p-4 sm:p-8">
      {/* Non-printable Screen Controls */}
      <div className="print:hidden max-w-5xl mx-auto mb-8 p-4 bg-[#0E1020] text-white rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/export"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-heading text-sm font-extrabold tracking-wide">
              PHYSICAL PLAN B MASTER ROSTER
            </h1>
            <p className="text-xs text-gray-400">
              {confirmedAttendees.length.toLocaleString()} confirmed attendees ready for binder printing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PrintButton />
        </div>
      </div>

      {/* Printable Master Document */}
      <main className="max-w-5xl mx-auto space-y-12">
        {/* Document Header on every print batch */}
        <header className="border-b-2 border-black pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight uppercase">
                Holiness Revival Movement Worldwide (HOREMOW)
              </h1>
              <h2 className="text-sm font-semibold tracking-wide text-gray-800">
                International Holiness General Conference 2026 · Holiness Campground, Kwali, Abuja
              </h2>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold border border-black px-2 py-1 uppercase">PLAN B GATE MANIFEST</div>
              <div className="text-[10px] text-gray-600 mt-1">Printed: {new Date().toLocaleDateString("en-NG", { dateStyle: "medium" })}</div>
            </div>
          </div>
          <div className="bg-gray-100 p-2.5 rounded border border-gray-300 text-[11px] leading-relaxed">
            <strong>EMERGENCY GATE PROTOCOL:</strong> Use this binder when gate scanner devices, power, or networks are unavailable. Verify the attendee&apos;s printed pass or SMS ref code against this directory, mark <strong>[✓] ARRIVED</strong> and <strong>[✓] BOOKLET</strong>, and record their gate stand. Synchronize back into the admin system once power/connectivity is restored.
          </div>
        </header>

        {confirmedAttendees.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No confirmed attendees found in the system yet.
          </div>
        ) : (
          Array.from(byState.entries()).map(([stateName, attendeeList]) => (
            <section key={stateName} className="break-before-page space-y-3 pt-4">
              <div className="flex items-center justify-between border-b border-black pb-1">
                <h3 className="font-bold text-base uppercase tracking-wider">
                  Region / State: {stateName}
                </h3>
                <span className="text-xs font-semibold">
                  {attendeeList.length} {attendeeList.length === 1 ? "Attendee" : "Attendees"}
                </span>
              </div>

              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-gray-100 text-[10px] font-bold uppercase">
                    <th className="py-1.5 px-2 w-8">#</th>
                    <th className="py-1.5 px-2 w-28">Ref Code</th>
                    <th className="py-1.5 px-2">Full Name</th>
                    <th className="py-1.5 px-2 w-32">Phone</th>
                    <th className="py-1.5 px-2 w-36">Parish / Locality</th>
                    <th className="py-1.5 px-2 text-center w-16">Arrived</th>
                    <th className="py-1.5 px-2 text-center w-16">Booklet</th>
                    <th className="py-1.5 px-2 w-28">Stand / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {attendeeList.map((a, idx) => (
                    <tr key={a.id} className="leading-tight">
                      <td className="py-2 px-2 text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-2 font-mono font-bold">{a.refCode}</td>
                      <td className="py-2 px-2 font-semibold">
                        {a.name}
                        {a.isMinor && (
                          <span className="ml-1 text-[9px] font-normal text-gray-600">
                            (Minor · {a.guardianName || "Guardian"})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-gray-700 font-mono">{a.phoneE164}</td>
                      <td className="py-2 px-2 text-gray-700 truncate max-w-[140px]">{a.parish || "—"}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="inline-block w-4 h-4 border border-black align-middle text-center text-[10px] leading-3 font-bold">
                          {a.checkedInAt ? "✓" : ""}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="inline-block w-4 h-4 border border-black align-middle text-center text-[10px] leading-3 font-bold">
                          {a.bookletIssuedAt ? "✓" : ""}
                        </span>
                      </td>
                      <td className="py-2 px-2 border-b border-gray-200">
                        <div className="h-4 border-b border-dotted border-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-gray-200">
                <span>Gate Stand: ___________________</span>
                <span>Supervisor Signature: ___________________</span>
                <span>Date: ___/12/2026</span>
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}

