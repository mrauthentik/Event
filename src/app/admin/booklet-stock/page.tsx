import { db } from "@/db";
import { count, eq, isNotNull } from "drizzle-orm";
import { attendees } from "@/db/schema";
import { BookOpen, Layers, CheckCircle2, PackageCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminBookletStockPage() {
  const [issuedTotal] = await db
    .select({ value: count() })
    .from(attendees)
    .where(isNotNull(attendees.bookletIssuedAt));

  const totalAllocatedBooklets = 12000;
  const currentIssued = issuedTotal?.value || 0;
  const remaining = totalAllocatedBooklets - currentIssued;

  const defaultStands = [
    { name: "Gate A (Main Gate)", allocated: 3000, issued: Math.round(currentIssued * 0.35) },
    { name: "Gate B (North Gate)", allocated: 2500, issued: Math.round(currentIssued * 0.25) },
    { name: "Men Gate", allocated: 2000, issued: Math.round(currentIssued * 0.15) },
    { name: "Women Gate", allocated: 2500, issued: Math.round(currentIssued * 0.15) },
    { name: "Express Groups Stand", allocated: 2000, issued: Math.round(currentIssued * 0.10) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#111320] tracking-tight">Booklet Stock Management</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Daily conference programme booklet allocations and gate inventory tracking.
        </p>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Total Printed & Allocated</span>
            <Layers className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-3xl font-black text-[#111320]">
            {totalAllocatedBooklets.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400">Total physical print run</div>
        </div>

        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Issued at Gates</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-700">
            {currentIssued.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400">Confirmed attendee scans</div>
        </div>

        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Remaining in Stock</span>
            <BookOpen className="w-4 h-4 text-[#0E7A6E]" />
          </div>
          <div className="text-3xl font-black text-[#0E7A6E]">
            {remaining.toLocaleString()}
          </div>
          <div className="text-[11px] text-gray-400">Available across all stands</div>
        </div>
      </div>

      {/* Stand Allocation Table */}
      <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#111320]">Stand Breakdown (Daily Inventory)</h2>
          <span className="text-xs text-gray-500 font-mono">Date: 8 – 11 Dec 2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Stand / Gate Name</th>
                <th className="px-5 py-3.5">Allocated Stock</th>
                <th className="px-5 py-3.5">Issued to Attendees</th>
                <th className="px-5 py-3.5">Remaining Stock</th>
                <th className="px-5 py-3.5">Depletion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {defaultStands.map((stand, idx) => {
                const rem = stand.allocated - stand.issued;
                const pct = Math.round((stand.issued / stand.allocated) * 100);
                return (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#111320]">{stand.name}</td>
                    <td className="px-5 py-3.5 font-mono">{stand.allocated.toLocaleString()}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-700">{stand.issued.toLocaleString()}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-[#0E7A6E]">{rem.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[120px] overflow-hidden">
                          <div className="bg-[#0E7A6E] h-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-gray-500">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
