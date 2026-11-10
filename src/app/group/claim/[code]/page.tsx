"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { Users, CheckCircle2, AlertCircle } from "lucide-react";

export default function GroupClaimPage() {
  const params = useParams();
  const inviteCode = params?.code as string;

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    state: "",
    parish: "",
    isMinor: false,
    guardianName: "",
    guardianPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/group/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode,
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          state: form.state || undefined,
          parish: form.parish || undefined,
          isMinor: form.isMinor,
          guardianName: form.isMinor ? form.guardianName : undefined,
          guardianPhone: form.isMinor ? form.guardianPhone : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to claim seat.");
      }

      setSuccess(data.message || "Seat claimed successfully!");
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-[6px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none";

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-md w-full bg-white rounded-[24px] border border-gray-100 p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#EAF9F7] text-[#0E7A6E] mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#111320]">Claim Your Group Seat</h1>
            <p className="text-xs text-[#6B7280]">
              Invite code: <span className="font-mono font-bold text-black">{inviteCode}</span>
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4 animate-in fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm text-gray-700">{success}</p>
              <Link
                href="/"
                className="inline-block px-6 py-2.5 rounded-full bg-[#0E1020] text-white text-xs font-bold"
              >
                Return Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#111320]">Full Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Your full name" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#111320]">Phone (E.164) *</label>
                <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+234 801 234 5678" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#111320]">Email (optional)</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="name@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#111320]">State</label>
                  <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputCls} placeholder="e.g. FCT" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#111320]">Parish</label>
                  <input value={form.parish} onChange={(e) => setForm({ ...form, parish: e.target.value })} className={inputCls} placeholder="Optional" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.isMinor} onChange={(e) => setForm({ ...form, isMinor: e.target.checked })} className="rounded border-gray-300" />
                Under 18 (guardian details required)
              </label>

              {form.isMinor && (
                <div className="grid grid-cols-2 gap-3">
                  <input required placeholder="Guardian name *" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} className={inputCls} />
                  <input required type="tel" placeholder="Guardian phone *" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} className={inputCls} />
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#0E1020] hover:bg-[#1A1D36] text-white font-bold text-xs tracking-wide transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Claiming Seat..." : "Claim My Seat"}
              </button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
