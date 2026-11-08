"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus, CheckCircle2, AlertCircle, Banknote, CreditCard, QrCode } from "lucide-react";
import { generateRefCode } from "@/lib/crypto/ref-code";
import { createTicketToken } from "@/lib/crypto/ed25519";

export default function WalkInRegistrationPage() {
  const [standId, setStandId] = useState("Gate A");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+234 ");
  const [state, setState] = useState("FCT Abuja");
  const [parish, setParish] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pos">("cash");
  const [tellerOrReceipt, setTellerOrReceipt] = useState("");
  const [loading, setLoading] = useState(false);
  const [completedAttendee, setCompletedAttendee] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/scanner/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standId,
          name,
          phone: phone.trim(),
          state,
          parish: parish || undefined,
          paymentMethod,
          tellerOrReceipt: tellerOrReceipt || "CASH_COLLECTED_AT_GATE",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process walk-in registration.");
      }

      setCompletedAttendee(data.attendee);
    } catch (err: any) {
      setError(err?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("+234 ");
    setParish("");
    setTellerOrReceipt("");
    setCompletedAttendee(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#111320] flex flex-col font-sans">
      <header className="h-14 bg-[#0E1020] text-white px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/staff/scanner" className="text-gray-400 hover:text-white p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-bold text-sm tracking-wide">
            WALK-IN GATE REGISTRATION
          </span>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 bg-white/10 rounded-full text-[#8EE3D6]">
          {standId}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-lg mx-auto w-full">
        {!completedAttendee ? (
          <div className="bg-white rounded-[24px] border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#111320] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0E7A6E]" />
                <span>Register & Check-in Walk-in Attendee</span>
              </h1>
              <p className="text-xs text-gray-500">
                Collect flat fee (₦5,000), issue ticket pass, and record gate arrival in one flow.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Attendee Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Brother / Sister Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[8px] bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8EE3D6]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+234 801 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[8px] bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8EE3D6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">State *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[8px] bg-gray-50 border border-gray-200 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Parish (Optional)</label>
                  <input
                    type="text"
                    placeholder="Chapter / Church"
                    value={parish}
                    onChange={(e) => setParish(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[8px] bg-gray-50 border border-gray-200 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1 pt-2">
                <label className="font-semibold text-gray-700">Payment Collection (₦5,000 NGN) *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer ${
                      paymentMethod === "cash"
                        ? "bg-[#EAF9F7] border-[#0E7A6E] text-[#0E7A6E]"
                        : "bg-white border-gray-200 text-gray-600"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash ₦5,000</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("pos")}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold cursor-pointer ${
                      paymentMethod === "pos"
                        ? "bg-[#EAF9F7] border-[#0E7A6E] text-[#0E7A6E]"
                        : "bg-white border-gray-200 text-gray-600"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>POS Terminal</span>
                  </button>
                </div>
              </div>

              {paymentMethod === "pos" && (
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">POS RRN / Approval Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 000123456789"
                    value={tellerOrReceipt}
                    onChange={(e) => setTellerOrReceipt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-[8px] bg-gray-50 border border-gray-200 text-xs focus:outline-none"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-[#0E1020] hover:bg-[#1A1D36] text-white font-bold text-xs tracking-wide transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Processing Gate Admission..." : "Collect ₦5,000 & Check In Immediately"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-gray-200 p-8 shadow-sm text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#0E7A6E]">
                Admission Confirmed & Checked In
              </span>
              <h2 className="text-2xl font-black text-[#111320]">
                {completedAttendee.name}
              </h2>
              <div className="text-xs text-gray-500 font-mono">
                Ref Code: <strong className="text-black text-sm">{completedAttendee.refCode}</strong>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-left text-xs font-mono space-y-1 max-w-xs mx-auto">
              <div>Stand: <strong>{standId}</strong></div>
              <div>Status: <strong className="text-emerald-700">checked_in</strong></div>
              <div>Payment: <strong>₦5,000 ({paymentMethod.toUpperCase()})</strong></div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={resetForm}
                className="w-full py-3 rounded-full bg-[#0E1020] text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                Register Next Walk-in Attendee
              </button>
              <Link
                href="/staff/scanner"
                className="block text-xs text-gray-500 hover:text-black font-semibold"
              >
                ← Return to Camera Scanner
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
