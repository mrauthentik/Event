import { db } from "@/db";
import { count, isNotNull } from "drizzle-orm";
import { attendees } from "@/db/schema";
import { BookOpen, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminBookletStockPage() {
  let currentIssued = 0;
  try {
    const [issuedTotal] = await db.select({ value: count() }).from(attendees)
      .where(isNotNull(attendees.bookletIssuedAt));
    currentIssued = issuedTotal?.value || 0;
  } catch {
    console.error("[admin/booklet-stock] DB unavailable.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#111320] tracking-tight">Booklet Stock Management</h1>
        <p className="text-xs text-gray-500 mt-0.5">Actual booklet issuance records. Stand allocations require organizer-provided names and counts.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-[16px] border border-gray-200 space-y-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Issued to Attendees</span><CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-700">{currentIssued.toLocaleString()}</div>
          <div className="text-[11px] text-gray-400">Counted from attendee booklet issue records</div>
        </div>
        <div className="bg-white p-5 rounded-[16px] border border-amber-200 space-y-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Allocated / Remaining</span><BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-800">Organizer setup needed</div>
          <div className="text-[11px] text-gray-500">No print-run or stand quantity is assumed.</div>
        </div>
      </div>
      <section className="bg-white rounded-[20px] border border-gray-200 p-6 space-y-2">
        <h2 className="text-sm font-bold text-[#111320]">Stand and day allocations</h2>
        <p className="text-sm text-gray-600">No stand names or daily booklet counts are configured. Organizers need to provide these before allocation and remaining-stock reports can be used.</p>
      </section>
    </div>
  );
}
