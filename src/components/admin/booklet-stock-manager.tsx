"use client";

import { FormEvent, useState } from "react";
import { ArrowDownToLine, LoaderCircle, PackageCheck, Save } from "lucide-react";

export interface BookletAllocation {
  id: string;
  standId: string;
  allocatedDate: string;
  allocatedQuantity: number;
  issuedCount: number;
  returnedCount: number;
}

function remaining(stock: BookletAllocation) {
  return stock.allocatedQuantity - stock.issuedCount - stock.returnedCount;
}

export function BookletStockManager({ initialStock }: { initialStock: BookletAllocation[] }) {
  const [stockRows, setStockRows] = useState(initialStock);
  const [standId, setStandId] = useState("");
  const [allocatedDate, setAllocatedDate] = useState("2026-12-08");
  const [allocatedQuantity, setAllocatedQuantity] = useState("");
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function saveAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/booklet-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standId, allocatedDate, allocatedQuantity: Number(allocatedQuantity) }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.stock) throw new Error(payload?.error || "Stock allocation could not be saved.");
      setStockRows((current) => [payload.stock, ...current.filter((item) => item.id !== payload.stock.id)]
        .sort((left, right) => left.allocatedDate.localeCompare(right.allocatedDate) || left.standId.localeCompare(right.standId)));
      setNotice({ type: "success", message: "Stand allocation saved and added to the audit log." });
      setAllocatedQuantity("");
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Stock allocation could not be saved." });
    } finally {
      setBusy(false);
    }
  }

  async function recordReturn(event: FormEvent<HTMLFormElement>, item: BookletAllocation) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/booklet-stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, quantity: Number(returnQuantity), reason: returnReason }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.stock) throw new Error(payload?.error || "Booklet return could not be recorded.");
      setStockRows((current) => current.map((row) => row.id === payload.stock.id ? payload.stock : row));
      setReturningId(null);
      setReturnQuantity("");
      setReturnReason("");
      setNotice({ type: "success", message: "Returned stock was recorded and added to the audit log." });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Booklet return could not be recorded." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {notice && <div role={notice.type === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{notice.message}</div>}

      <form onSubmit={saveAllocation} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="stock-stand" className="mb-1 block text-xs font-bold text-gray-600">Stand name</label>
          <input id="stock-stand" required minLength={2} maxLength={64} value={standId} onChange={(event) => setStandId(event.target.value)} placeholder="e.g. Gate A" className="min-h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none focus:border-[#0E7A6E] focus:ring-2 focus:ring-[#0E7A6E]/15" />
        </div>
        <div>
          <label htmlFor="stock-date" className="mb-1 block text-xs font-bold text-gray-600">Conference day</label>
          <input id="stock-date" type="date" required value={allocatedDate} onChange={(event) => setAllocatedDate(event.target.value)} className="min-h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none focus:border-[#0E7A6E] focus:ring-2 focus:ring-[#0E7A6E]/15" />
        </div>
        <div>
          <label htmlFor="stock-quantity" className="mb-1 block text-xs font-bold text-gray-600">Total assigned</label>
          <input id="stock-quantity" type="number" inputMode="numeric" required min="0" max="100000" value={allocatedQuantity} onChange={(event) => setAllocatedQuantity(event.target.value)} placeholder="Number of booklets" className="min-h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none focus:border-[#0E7A6E] focus:ring-2 focus:ring-[#0E7A6E]/15" />
        </div>
        <button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0E1020] px-4 text-sm font-bold text-white hover:bg-[#252943] disabled:cursor-wait disabled:opacity-60"><Save className="h-4 w-4" />{busy ? "Saving" : "Save allocation"}</button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm font-bold text-gray-800"><PackageCheck className="h-4 w-4 text-[#0E7A6E]" />Stand allocations by event day</div>
        {stockRows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">No stock is allocated. Add organizer-confirmed stand quantities before issuing booklets.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stockRows.map((item) => (
              <div key={item.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr_auto] sm:items-center">
                <div><div className="text-sm font-bold text-gray-900">{item.standId}</div><div className="text-xs text-gray-500">{new Date(`${item.allocatedDate}T12:00:00`).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium" })}</div></div>
                <div className="text-xs text-gray-600">Assigned <strong className="text-gray-900">{item.allocatedQuantity.toLocaleString()}</strong></div>
                <div className="text-xs text-gray-600">Issued <strong className="text-gray-900">{item.issuedCount.toLocaleString()}</strong></div>
                <div className="text-xs text-gray-600">Returned <strong className="text-gray-900">{item.returnedCount.toLocaleString()}</strong></div>
                <div className="text-xs text-gray-600">At stand <strong className={remaining(item) ? "text-emerald-700" : "text-amber-800"}>{remaining(item).toLocaleString()}</strong></div>
                <button onClick={() => { setReturningId(returningId === item.id ? null : item.id); setNotice(null); }} disabled={busy || remaining(item) === 0} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><ArrowDownToLine className="h-3.5 w-3.5" />Record return</button>
                {returningId === item.id && (
                  <form onSubmit={(event) => void recordReturn(event, item)} className="col-span-full grid gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-[0.7fr_2fr_auto] sm:items-end">
                    <div><label htmlFor={`return-qty-${item.id}`} className="mb-1 block text-xs font-bold text-gray-600">Quantity returned</label><input id={`return-qty-${item.id}`} type="number" min="1" max={remaining(item)} required value={returnQuantity} onChange={(event) => setReturnQuantity(event.target.value)} className="min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm" /></div>
                    <div><label htmlFor={`return-reason-${item.id}`} className="mb-1 block text-xs font-bold text-gray-600">Reason / handover note</label><input id={`return-reason-${item.id}`} minLength={3} maxLength={300} required value={returnReason} onChange={(event) => setReturnReason(event.target.value)} className="min-h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm" /></div>
                    <button disabled={busy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0E7A6E] px-4 text-xs font-bold text-white disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}Confirm return</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
