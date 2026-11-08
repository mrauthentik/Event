import { db } from "@/db";
import { desc } from "drizzle-orm";
import { attendees } from "@/db/schema";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAttendeesPage() {
  const allAttendees = await db.query.attendees.findMany({
    orderBy: [desc(attendees.createdAt)],
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111320] tracking-tight">Attendees</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Confirmed and registered attendees with admission reference codes and check-in statuses.
          </p>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Ref Code</th>
                <th className="px-5 py-3.5">Full Name</th>
                <th className="px-5 py-3.5">Phone</th>
                <th className="px-5 py-3.5">Location / Parish</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Booklet</th>
                <th className="px-5 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allAttendees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                    No attendees registered yet.
                  </td>
                </tr>
              ) : (
                allAttendees.map((att) => (
                  <tr key={att.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-[#0E7A6E]">
                      {att.refCode}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#111320]">
                      <div>{att.name}</div>
                      {att.isMinor && (
                        <span className="text-[10px] text-amber-600 font-normal">Minor (Guardian: {att.guardianName})</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">
                      {att.phoneE164}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-[11px]">
                      <div>{att.state || att.country}</div>
                      {att.parish && <div className="text-[10px] text-gray-400">{att.parish}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === "checked_in"
                            ? "bg-blue-50 text-blue-700"
                            : att.status === "confirmed"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          att.bookletIssuedAt
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {att.bookletIssuedAt ? "Issued" : "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-[11px]">
                      {new Date(att.createdAt).toLocaleDateString()}
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
