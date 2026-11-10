"use client";

import { CheckCircle2, XCircle, AlertTriangle, BookOpen } from "lucide-react";
import { CachedAttendee } from "@/lib/offline/dexie-db";

export type ScanResult =
  | { type: "idle" }
  | { type: "valid"; attendee: CachedAttendee; message: string }
  | { type: "already_checked_in"; attendee: CachedAttendee; message: string }
  | { type: "forged"; error: string };

interface ScanResultOverlayProps {
  result: ScanResult;
  standId: string;
  onDismiss: () => void;
  onIssueBooklet: (attendee: CachedAttendee) => void;
}

export function ScanResultOverlay({
  result,
  standId,
  onDismiss,
  onIssueBooklet,
}: ScanResultOverlayProps) {
  if (result.type === "idle") return null;

  if (result.type === "valid") {
    return (
      <div className="fixed inset-0 z-50 bg-[#064E3B] text-white p-6 flex flex-col justify-between animate-in zoom-in-95 duration-150">
        <div className="pt-8 text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-emerald-400/20 text-emerald-300 mx-auto flex items-center justify-center border-4 border-emerald-400">
            <CheckCircle2 className="w-14 h-14" />
          </div>

          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-widest text-emerald-200">
              {result.message}
            </span>
            <h2 className="text-3xl font-black tracking-tight pt-2">
              {result.attendee.name}
            </h2>
            {result.attendee.parish && (
              <div className="text-sm text-emerald-200">{result.attendee.parish}</div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-black/20 text-left space-y-1 max-w-sm mx-auto text-xs font-mono">
            <div>Ref: <strong className="text-white">{result.attendee.refCode}</strong></div>
            <div>Gate: <strong className="text-white">{standId}</strong></div>
            <div>Booklet Status: <strong className={result.attendee.bookletIssuedAt ? "text-emerald-300" : "text-amber-300"}>
              {result.attendee.bookletIssuedAt ? "Issued" : "Not Yet Issued"}
            </strong></div>
          </div>
        </div>

        <div className="pb-8 space-y-3 max-w-sm mx-auto w-full">
          {!result.attendee.bookletIssuedAt && (
            <button
              onClick={() => onIssueBooklet(result.attendee)}
              className="w-full py-4 rounded-full bg-emerald-300 hover:bg-emerald-200 text-[#064E3B] font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-xl active:scale-98"
            >
              <BookOpen className="w-5 h-5" />
              <span>Issue Conference Booklet</span>
            </button>
          )}

          <button
            onClick={onDismiss}
            className="w-full py-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-sm"
          >
            Next Scan (Dismiss)
          </button>
        </div>
      </div>
    );
  }

  if (result.type === "already_checked_in") {
    return (
      <div className="fixed inset-0 z-50 bg-[#78350F] text-white p-6 flex flex-col justify-between animate-in zoom-in-95 duration-150">
        <div className="pt-8 text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-amber-400/20 text-amber-300 mx-auto flex items-center justify-center border-4 border-amber-400">
            <AlertTriangle className="w-14 h-14" />
          </div>

          <div className="space-y-1">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-widest text-amber-200">
              Already Checked In
            </span>
            <h2 className="text-3xl font-black tracking-tight pt-2">
              {result.attendee.name}
            </h2>
            <p className="text-sm text-amber-200 leading-relaxed max-w-xs mx-auto">
              {result.message}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-black/20 text-left space-y-1 max-w-sm mx-auto text-xs font-mono">
            <div>Ref: <strong className="text-white">{result.attendee.refCode}</strong></div>
            <div>Checked In At: <strong className="text-white">
              {result.attendee.checkedInAt ? new Date(result.attendee.checkedInAt).toLocaleString() : "Earlier"}
            </strong></div>
          </div>
        </div>

        <div className="pb-8 space-y-3 max-w-sm mx-auto w-full">
          <button
            onClick={onDismiss}
            className="w-full py-4 rounded-full bg-white text-black font-black text-sm tracking-wide"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // forged
  return (
    <div className="fixed inset-0 z-50 bg-[#7F1D1D] text-white p-6 flex flex-col justify-between animate-in zoom-in-95 duration-150">
      <div className="pt-8 text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-red-400/20 text-red-300 mx-auto flex items-center justify-center border-4 border-red-400">
          <XCircle className="w-14 h-14" />
        </div>

        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-widest text-red-200">
            Invalid / Forged Ticket
          </span>
          <h2 className="text-2xl font-black tracking-tight pt-2">
            Ticket Rejected
          </h2>
          <p className="text-sm text-red-200 leading-relaxed max-w-xs mx-auto">
            {result.error}
          </p>
        </div>
      </div>

      <div className="pb-8 space-y-3 max-w-sm mx-auto w-full">
        <button
          onClick={onDismiss}
          className="w-full py-4 rounded-full bg-white text-black font-black text-sm tracking-wide"
        >
          Dismiss (Scan Next)
        </button>
      </div>
    </div>
  );
}
