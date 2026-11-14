"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Copy, LoaderCircle, ShieldCheck } from "lucide-react";

interface Props {
  reference: string;
  ticketAccess: string;
  amount: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  alreadySubmitted: boolean;
}

export function ManualTransferSubmission(props: Props) {
  const [senderBank, setSenderBank] = useState("");
  const [senderName, setSenderName] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(props.alreadySubmitted);
  const [copied, setCopied] = useState(false);

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(props.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy the account number. Select and copy it manually.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/manual-transfer/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: props.reference,
          ticketAccess: props.ticketAccess,
          senderBank,
          senderName,
          transferReference,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error || "Transfer details could not be submitted.");
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Transfer details could not be submitted. Retry when you have a connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="w-full space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="rounded-2xl border border-[#cdeee7] bg-[#f1fbf8] p-4">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#0E7A6E]">Official account details</div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Bank</dt><dd className="font-bold text-gray-900">{props.bankName}</dd>
          <dt className="text-gray-500">Account name</dt><dd className="font-bold text-gray-900">{props.accountName}</dd>
          <dt className="text-gray-500">Account number</dt><dd className="flex items-center gap-2 font-mono font-bold tracking-wider text-gray-900"><span>{props.accountNumber}</span><button type="button" onClick={() => void copyAccountNumber()} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 text-[10px] font-sans font-bold text-gray-600 hover:bg-gray-50" aria-label="Copy account number"><Copy className="h-3 w-3" />{copied ? "Copied" : "Copy"}</button></dd>
          <dt className="text-gray-500">Amount</dt><dd className="font-extrabold text-[#0E1020]">{props.amount}</dd>
          <dt className="text-gray-500">Payment reference</dt><dd className="font-mono font-bold text-[#0E1020]">{props.reference}</dd>
        </dl>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Finance will verify the cleared payment against the official bank statement. Do not upload or send a receipt screenshot. Your ticket is issued only after staff approval.</p>
      </div>

      {submitted ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div><strong>Transfer details received.</strong><p className="mt-1 text-xs leading-relaxed">Your order remains pending while the finance team checks the bank statement. This page does not confirm payment.</p></div>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          <h2 className="text-sm font-extrabold text-gray-900">Tell us how to find your transfer</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-gray-700">Bank you transferred from<input required minLength={2} maxLength={128} autoComplete="organization" value={senderBank} onChange={(event) => setSenderBank(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-normal text-gray-900 outline-none focus:border-[#0E7A6E] focus:ring-2 focus:ring-[#0E7A6E]/15" /></label>
            <label className="text-xs font-bold text-gray-700">Name on sending account<input required minLength={2} maxLength={128} autoComplete="name" value={senderName} onChange={(event) => setSenderName(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-normal text-gray-900 outline-none focus:border-[#0E7A6E] focus:ring-2 focus:ring-[#0E7A6E]/15" /></label>
          </div>
          <label className="block text-xs font-bold text-gray-700">Transfer reference / teller number<input required minLength={3} maxLength={128} autoComplete="off" value={transferReference} onChange={(event) => setTransferReference(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-normal text-gray-900 outline-none focus:border-[#0E7A6E] focus:ring-2 focus:ring-[#0E7A6E]/15" /></label>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">{error}</p>}
          <button disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0E1020] px-5 text-sm font-extrabold text-white hover:bg-[#252943] disabled:cursor-wait disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{busy ? "Submitting details" : "Submit transfer details"}</button>
        </form>
      )}
    </section>
  );
}
