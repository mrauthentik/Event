import { db } from "@/db";
import { desc } from "drizzle-orm";
import { orders } from "@/db/schema";
import { createOrderAccessToken } from "@/lib/crypto/ed25519";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  let allOrders: any[] = [];
  try {
    allOrders = await db.query.orders.findMany({
      orderBy: [desc(orders.createdAt)],
      limit: 50,
    });
  } catch (err) {
    console.error("[admin/orders] DB unavailable:", err);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#111320] tracking-tight">Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit of all individual and group registration checkout attempts.
          </p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3.5">Reference</th>
                <th className="px-5 py-3.5">Payer / Church</th>
                <th className="px-5 py-3.5">Phone / Email</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                    No orders recorded yet. Initiate a test checkout from the public registration page.
                  </td>
                </tr>
              ) : (
                allOrders.map(async (o) => {
                  const ticketAccess = o.status === "paid" ? await createOrderAccessToken(o.id) : null;
                  return (
                  <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-black">
                      {o.reference}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#111320]">
                      <div>{o.payerName}</div>
                      {o.groupName && (
                        <div className="text-[10px] text-gray-400 font-normal">{o.groupName}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">
                      <div>{o.payerPhoneE164}</div>
                      {o.payerEmail && (
                        <div className="text-[10px] text-gray-400">{o.payerEmail}</div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-black">
                      {formatMoneyMinor(o.totalMinor, o.currency as SupportedCurrency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                        {o.isGroup ? "Group" : "Individual"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : o.status === "pending_payment"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-[11px]">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {ticketAccess && (
                        <Link
                          href={`/ticket/${o.reference}?access=${encodeURIComponent(ticketAccess)}`}
                          target="_blank"
                          className="text-[#0E7A6E] hover:underline font-semibold text-xs"
                        >
                          View Ticket
                        </Link>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

