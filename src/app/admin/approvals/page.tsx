import { db } from "@/db";
import { desc, eq } from "drizzle-orm";
import { orders, manualPayments, attendees } from "@/db/schema";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";
import { CheckCircle2, XCircle, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminApprovalsPage() {
  const pendingManuals = await db.query.orders.findMany({
    where: (o, { eq }) => eq(o.status, "pending_payment"),
    orderBy: [desc(orders.createdAt)],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111320] tracking-tight">Manual Payment Approvals</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Statement-backed review queue for direct bank transfers and offline teller deposits.
          </p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Operational Policy (Section 6.3):</strong> Approve against the official bank statement ONLY (never from screenshots sent via WhatsApp/email). Every approval is permanently logged into the audit trail.
        </span>
      </div>

      {/* Pending Orders Table */}
      <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Reference</th>
                <th className="px-5 py-3.5">Payer / Church</th>
                <th className="px-5 py-3.5">Phone</th>
                <th className="px-5 py-3.5">Expected Amount</th>
                <th className="px-5 py-3.5">Initiated Date</th>
                <th className="px-5 py-3.5 text-right">Statement Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingManuals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    No pending orders awaiting bank statement verification.
                  </td>
                </tr>
              ) : (
                pendingManuals.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-[#111320]">
                      {o.reference}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#111320]">
                      <div>{o.payerName}</div>
                      {o.groupName && (
                        <div className="text-[10px] text-gray-400 font-normal">{o.groupName}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">
                      {o.payerPhoneE164}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-black">
                      {formatMoneyMinor(o.totalMinor, o.currency as SupportedCurrency)}
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-[11px]">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <form action="/api/admin/approvals/verify" method="POST" className="inline-flex gap-2">
                        <input type="hidden" name="orderId" value={o.id} />
                        <button
                          type="submit"
                          name="action"
                          value="approve"
                          className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer"
                        >
                          Approve Payment
                        </button>
                      </form>
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

