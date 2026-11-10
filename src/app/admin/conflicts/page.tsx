import { db } from "@/db";
import { desc, or, eq } from "drizzle-orm";
import { scanEvents, attendees } from "@/db/schema";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminConflictsPage() {
  let conflictScans: any[] = [];
  try {
    conflictScans = await db.query.scanEvents.findMany({
      where: or(
        eq(scanEvents.result, "conflict"),
        eq(scanEvents.result, "already_checked_in"),
        eq(scanEvents.result, "invalid_signature")
      ),
      orderBy: [desc(scanEvents.serverTimestamp)],
    });
  } catch (err) {
    console.error("[admin/conflicts] DB unavailable:", err);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#111320] tracking-tight">Offline Sync Conflicts & Audit</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Quarantine queue for dual offline scans, duplicate gate entries, and rejected cryptographic tickets.
        </p>
      </div>

      <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Conflict Type</th>
                <th className="px-5 py-3.5">Stand / Gate</th>
                <th className="px-5 py-3.5">Client Timestamp</th>
                <th className="px-5 py-3.5">Server Sync Time</th>
                <th className="px-5 py-3.5">Incident Notes</th>
                <th className="px-5 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conflictScans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldCheck className="w-8 h-8 text-emerald-500" />
                      <span>Zero offline sync conflicts recorded. All gate scans reconciled cleanly.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                conflictScans.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                        {c.result}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-[#111320]">{c.standId}</td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-gray-500">
                      {new Date(c.clientTimestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-gray-400">
                      {new Date(c.serverTimestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">
                      {c.notes || "Duplicate scan detected across gates"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[10px] font-semibold text-gray-400">Quarantined</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

