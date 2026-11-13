import { and, desc, eq } from "drizzle-orm";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import { db } from "@/db";
import { manualPayments, orders } from "@/db/schema";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";

export const dynamic = "force-dynamic";

export default async function AdminApprovalsPage() {
  let pendingManuals: Array<{ order: typeof orders.$inferSelect; manual: typeof manualPayments.$inferSelect }> = [];
  try {
    pendingManuals = await db.select({ order: orders, manual: manualPayments })
      .from(manualPayments)
      .innerJoin(orders, eq(manualPayments.orderId, orders.id))
      .where(and(eq(manualPayments.status, "pending"), eq(orders.status, "pending_payment")))
      .orderBy(desc(manualPayments.createdAt));
  } catch (error) {
    console.error("[admin/approvals] Unable to load manual payment queue.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#111320]">Manual Payment Approvals</h1>
        <p className="mt-0.5 text-xs text-gray-500">Review transfer submissions against the official bank statement.</p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <span><strong>Finance policy:</strong> approve only after matching the transfer on the official bank statement. Never approve from screenshots or an attendee-submitted receipt alone.</span>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-gray-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Payer</th>
                <th className="px-5 py-3.5">Transfer details</th>
                <th className="px-5 py-3.5">Submitted / expected</th>
                <th className="px-5 py-3.5 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pendingManuals.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No pending bank transfer submissions.</td></tr>
              ) : pendingManuals.map(({ order, manual }) => {
                const amountMatches = manual.amountMinor === order.totalMinor && order.currency === "NGN";
                const expired = Boolean(order.expiresAt && order.expiresAt.getTime() < Date.now());
                return (
                  <tr key={manual.id} className="align-top transition-colors hover:bg-gray-50/80">
                    <td className="px-5 py-3.5 font-mono font-bold text-[#111320]">
                      {order.reference}
                      {order.groupName && <div className="mt-1 font-sans text-[10px] font-normal text-gray-400">{order.groupName}</div>}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#111320]">
                      {order.payerName}<div className="mt-1 font-mono text-[11px] font-normal text-gray-500">{order.payerPhoneE164}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>{manual.bankName}</div>
                      <div className="mt-1">{manual.accountName}</div>
                      <div className="mt-1 font-mono text-[11px]">Ref: {manual.referenceOrTellerId}</div>
                      <div className="mt-1 text-[10px] text-gray-400">Submitted {manual.createdAt.toLocaleString()}</div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#111320]">
                      <div>Received claim: {formatMoneyMinor(manual.amountMinor, order.currency as SupportedCurrency)}</div>
                      <div className="mt-1 text-gray-500">Order: {formatMoneyMinor(order.totalMinor, order.currency as SupportedCurrency)}</div>
                      {!amountMatches && <div className="mt-1 font-bold text-red-700">Amount or currency mismatch</div>}
                      {expired && <div className="mt-1 font-bold text-red-700">Order expired: escalate before issuing</div>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex flex-col gap-2">
                        <form action="/api/admin/approvals/verify" method="POST">
                          <input type="hidden" name="manualPaymentId" value={manual.id} />
                          <button type="submit" name="action" value="approve" disabled={!amountMatches || expired}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs enabled:cursor-pointer enabled:hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Approve
                          </button>
                        </form>
                        <form action="/api/admin/approvals/verify" method="POST">
                          <input type="hidden" name="manualPaymentId" value={manual.id} />
                          <button type="submit" name="action" value="reject"
                            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Reject
                          </button>
                        </form>
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
