"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ShieldAlert, CheckCircle2, BookOpen, RotateCcw, AlertCircle } from "lucide-react";

export default function StaffLookupPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [attendee, setAttendee] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Supervisor Override Modal
  const [overrideAction, setOverrideAction] = useState<"force_check_in" | "issue_booklet" | "undo_check_in" | null>(null);
  const [supervisorPin, setSupervisorPin] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [submittingOverride, setSubmittingOverride] = useState(false);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setNotFound(false);
    setAttendee(null);
    setOverrideSuccess(null);

    try {
      const res = await fetch(`/api/scanner/lookup?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.attendee) {
        setAttendee(data.attendee);
      } else {
        setNotFound(true);
      }
    } catch (_) {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  const handleExecuteOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideAction || !attendee) return;

    setSubmittingOverride(true);
    setOverrideError(null);

    try {
      const res = await fetch("/api/scanner/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendeeId: attendee.id,
          action: overrideAction,
          supervisorPin,
          reason: overrideReason,
          standId: "Supervisor Station",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Override failed.");
      }

      setOverrideSuccess(`Successfully performed ${overrideAction.replace(/_/g, " ")}.`);
      setAttendee({
        ...attendee,
        status: data.status,
        bookletIssuedAt: overrideAction === "issue_booklet" ? new Date().toISOString() : attendee.bookletIssuedAt,
      });
      setOverrideAction(null);
      setSupervisorPin("");
      setOverrideReason("");
    } catch (err: any) {
      setOverrideError(err?.message || "Failed to execute override.");
    } finally {
      setSubmittingOverride(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#111320] flex flex-col font-body">
      <header className="h-14 bg-[#0E1020] text-white px-4 flex items-center justify-between font-heading">
        <div className="flex items-center gap-2">
          <Link href="/staff/scanner" className="text-gray-400 hover:text-white p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-extrabold text-sm tracking-wide">
            SUPERVISOR LOOKUP & OVERRIDE
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-xl mx-auto w-full space-y-6">
        
        {/* Search Box */}
        <div className="bg-white rounded-[20px] border border-gray-200 p-6 shadow-2xs space-y-4">
          <div className="space-y-1">
            <h1 className="text-base font-heading font-extrabold text-[#111320]">
              Manual Attendee Lookup
            </h1>
            <p className="text-xs text-gray-500">
              Lookup by reference code (HGC-XXXXXX), phone number, or attendee name.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. HGC-K7M9P2 or +234..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-[10px] bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-[#8EE3D6]"
            />
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2.5 rounded-[10px] bg-[#0E1020] text-white font-bold text-xs hover:bg-[#1A1D36] shrink-0 cursor-pointer disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>
        </div>

        {notFound && (
          <div className="p-6 bg-white rounded-[20px] border border-gray-200 text-center text-xs text-gray-500">
            No matching registered attendee found for &ldquo;{query}&rdquo;.
          </div>
        )}

        {overrideSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-[16px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{overrideSuccess}</span>
          </div>
        )}

        {/* Found Attendee Card */}
        {attendee && (
          <div className="bg-white rounded-[24px] border border-gray-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Attendee File
                </span>
                <h2 className="text-xl font-bold text-[#111320]">{attendee.name}</h2>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{attendee.phoneE164}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-[#0E7A6E]">{attendee.refCode}</div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                  {attendee.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block text-[10px]">Location:</span>
                <span className="font-bold">{attendee.state || attendee.country}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block text-[10px]">Parish:</span>
                <span className="font-bold">{attendee.parish || "General"}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block text-[10px]">Checked In:</span>
                <span className="font-bold">
                  {attendee.checkedInAt ? new Date(attendee.checkedInAt).toLocaleTimeString() : "No"}
                </span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block text-[10px]">Booklet:</span>
                <span className="font-bold">
                  {attendee.bookletIssuedAt ? "Issued" : "Pending"}
                </span>
              </div>
            </div>

            {/* Supervisor Actions */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Supervisor Override Controls (PIN Required)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setOverrideAction("force_check_in")}
                  className="py-2.5 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-[#111320] cursor-pointer"
                >
                  Force Check-In
                </button>

                <button
                  onClick={() => setOverrideAction("issue_booklet")}
                  className="py-2.5 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-[#111320] cursor-pointer"
                >
                  Issue Booklet
                </button>

                <button
                  onClick={() => setOverrideAction("undo_check_in")}
                  className="py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 cursor-pointer"
                >
                  Undo Check-in
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Supervisor PIN & Reason Modal Dialog */}
        {overrideAction && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[24px] p-6 sm:p-8 max-w-sm w-full space-y-5 shadow-2xl">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  Supervisor PIN Authorization
                </span>
                <h3 className="text-lg font-bold text-[#111320]">
                  Execute {overrideAction.replace(/_/g, " ")}
                </h3>
                <p className="text-xs text-gray-500">
                  This action will be recorded in the audit log with your reason and stand identifier.
                </p>
              </div>

              <form onSubmit={handleExecuteOverride} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Supervisor PIN (4 Digits) *</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="••••"
                    value={supervisorPin}
                    onChange={(e) => setSupervisorPin(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[8px] bg-gray-50 border border-gray-200 font-mono text-center text-lg tracking-widest focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-gray-700">Operational Reason *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Phone battery died / damaged paper ticket"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-[8px] bg-gray-50 border border-gray-200 text-xs focus:outline-none"
                  />
                </div>

                {overrideError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{overrideError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOverrideAction(null)}
                    className="py-2.5 rounded-full border border-gray-200 bg-white text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOverride}
                    className="py-2.5 rounded-full bg-[#0E1020] text-white text-xs font-bold hover:bg-[#1A1D36] cursor-pointer disabled:opacity-50"
                  >
                    {submittingOverride ? "Authorizing..." : "Authorize"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

