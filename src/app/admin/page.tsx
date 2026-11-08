import Link from "next/link";
import { db } from "@/db";
import { orders, attendees } from "@/db/schema";
import { count, eq, sum } from "drizzle-orm";
import { Users, Receipt, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { formatMoneyMinor, SupportedCurrency } from "@/config/currencies";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Aggregate attendee counts
  const [totalAttendees] = await db.select({ value: count() }).from(attendees);
  const [confirmedAttendees] = await db
    .select({ value: count() })
    .from(attendees)
    .where(eq(attendees.status, "confirmed"));
  const [checkedInAttendees] = await db
    .select({ value: count() })
    .from(attendees)
    .where(eq(attendees.status, "checked_in"));

  // Aggregate orders counts
  const [totalOrders] = await db.select({ value: count() }).from(orders);
  const [paidOrders] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.status, "paid"));
  const [pendingOrders] = await db
    .select({ value: count() })
    .from(orders)
    .where(eq(orders.status, "pending_payment"));

  // Revenue PER CURRENCY (Never sum different currencies!)
  const paidOrdersList = await db.query.orders.findMany({
    where: (o, { eq }) => eq(o.status, "paid"),
  });

  const revenueByCurrency: Record<SupportedCurrency, number> = {
    NGN: 0,
    USD: 0,
    EUR: 0,
    GBP: 0,
  };

  for (const o of paidOrdersList) {
    if (revenueByCurrency[o.currency as SupportedCurrency] !== undefined) {
      revenueByCurrency[o.currency as SupportedCurrency] += o.totalMinor;
    }
  }

  const attendanceTarget = 10000;
  const currentTotal = confirmedAttendees?.value || 0;
  const percentage = Math.min(100, Math.round((currentTotal / attendanceTarget) * 100));

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-[#111320] tracking-tight">
          Conference Operations Dashboard
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Real-time metrics for IHGC 2026 registration, revenue per currency, and gate capacity.
        </p>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Confirmed Attendees</span>
            <Users className="w-4 h-4 text-[#0E7A6E]" />
          </div>
          <div className="text-3xl font-black text-[#111320]">
            {confirmedAttendees?.value || 0}
          </div>
          <div className="text-[11px] text-gray-400">
            Total registered: {totalAttendees?.value || 0}
          </div>
        </div>

        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Paid Orders</span>
            <Receipt className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-[#111320]">
            {paidOrders?.value || 0}
          </div>
          <div className="text-[11px] text-gray-400">
            Pending checkout: {pendingOrders?.value || 0}
          </div>
        </div>

        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Gate Checked In</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-[#111320]">
            {checkedInAttendees?.value || 0}
          </div>
          <div className="text-[11px] text-gray-400">
            Awaiting arrival: {(confirmedAttendees?.value || 0) - (checkedInAttendees?.value || 0)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-[16px] border border-gray-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
            <span>Capacity Progress</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-[#111320]">
            {percentage}%
          </div>
          <div className="text-[11px] text-gray-400">
            Target planning: ~10,000 attendees
          </div>
        </div>
      </div>

      {/* Revenue PER CURRENCY Section (Non-negotiable: Never sum different currencies) */}
      <div className="bg-white rounded-[20px] border border-gray-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-[#111320]">
              Gross Settled Revenue (Per Currency)
            </h2>
            <p className="text-xs text-gray-400">
              Amounts in minor units converted to standard display; never mixed across currencies.
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1 bg-gray-100 rounded-full text-gray-600">
            Live Settlement
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-xs font-bold text-gray-500">Nigerian Naira (NGN)</div>
            <div className="text-xl font-extrabold text-[#111320] mt-1">
              {formatMoneyMinor(revenueByCurrency.NGN, "NGN")}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">via Paystack</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-xs font-bold text-gray-500">US Dollar (USD)</div>
            <div className="text-xl font-extrabold text-[#111320] mt-1">
              {formatMoneyMinor(revenueByCurrency.USD, "USD")}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">via PayPal</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-xs font-bold text-gray-500">Euro (EUR)</div>
            <div className="text-xl font-extrabold text-[#111320] mt-1">
              {formatMoneyMinor(revenueByCurrency.EUR, "EUR")}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">via PayPal</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-xs font-bold text-gray-500">British Pound (GBP)</div>
            <div className="text-xl font-extrabold text-[#111320] mt-1">
              {formatMoneyMinor(revenueByCurrency.GBP, "GBP")}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">via PayPal</div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/admin/orders"
          className="p-5 rounded-[16px] bg-white border border-gray-200 hover:border-gray-300 transition-colors shadow-2xs block space-y-1"
        >
          <div className="text-sm font-bold text-[#111320]">Manage Orders →</div>
          <div className="text-xs text-gray-500">View payment references, retry verifications, and inspectpayer records.</div>
        </Link>

        <Link
          href="/admin/attendees"
          className="p-5 rounded-[16px] bg-white border border-gray-200 hover:border-gray-300 transition-colors shadow-2xs block space-y-1"
        >
          <div className="text-sm font-bold text-[#111320]">Manage Attendees →</div>
          <div className="text-xs text-gray-500">Search attendee reference codes, process name substitutions, and inspect check-ins.</div>
        </Link>
      </div>
    </div>
  );
}
