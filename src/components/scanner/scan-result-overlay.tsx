"use client";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CircleHelp,
  LoaderCircle,
  ShieldAlert,
  X,
} from "lucide-react";
import type { CachedAttendee } from "@/lib/offline/dexie-db";

export type ScanResult =
  | { type: "idle" }
  | { type: "valid"; attendee: CachedAttendee; ticketToken: string; message: string }
  | { type: "group"; orderId: string; orderToken: string; attendees: CachedAttendee[]; checkedIn: boolean; message?: string; error?: string }
  | { type: "already_checked_in"; attendee: CachedAttendee; message: string }
  | { type: "unknown"; message: string }
  | { type: "forged"; error: string }
  | { type: "error"; message: string };

interface ScanResultOverlayProps {
  result: ScanResult;
  standId: string;
  busy?: boolean;
  issuingBooklet?: boolean;
  onDismiss: () => void;
  onIssueBooklet: (attendee: CachedAttendee, ticketToken: string) => void;
  onCheckInGroup: (attendees: CachedAttendee[], orderToken: string) => void;
}

function StatusIcon({ type }: { type: ScanResult["type"] }) {
  if (type === "valid" || type === "group") return <CheckCircle2 className="h-6 w-6" aria-hidden="true" />;
  if (type === "forged") return <ShieldAlert className="h-6 w-6" aria-hidden="true" />;
  if (type === "already_checked_in") return <AlertTriangle className="h-6 w-6" aria-hidden="true" />;
  if (type === "unknown") return <CircleHelp className="h-6 w-6" aria-hidden="true" />;
  return <AlertTriangle className="h-6 w-6" aria-hidden="true" />;
}

function resultStyle(type: ScanResult["type"]) {
  if (type === "valid" || type === "group") return {
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    pill: "bg-emerald-100 text-emerald-800",
    title: type === "group" ? "Group ticket found" : "Entry confirmed",
  };
  if (type === "forged") return {
    tone: "border-red-200 bg-red-50 text-red-800",
    pill: "bg-red-100 text-red-800",
    title: "Ticket rejected",
  };
  if (type === "already_checked_in") return {
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    pill: "bg-amber-100 text-amber-900",
    title: "Already checked in",
  };
  return {
    tone: "border-sky-200 bg-sky-50 text-sky-900",
    pill: "bg-sky-100 text-sky-900",
    title: type === "unknown" ? "Ticket not in this roster" : "Scan needs attention",
  };
}

export function ScanResultOverlay({
  result,
  standId,
  busy = false,
  issuingBooklet = false,
  onDismiss,
  onIssueBooklet,
  onCheckInGroup,
}: ScanResultOverlayProps) {
  if (result.type === "idle") return null;

  const style = resultStyle(result.type);
  const eligibleGroupCount = result.type === "group"
    ? result.attendees.filter((attendee) => attendee.status === "confirmed").length
    : 0;
  const description = result.type === "forged" ? result.error
    : result.type === "unknown" || result.type === "error" ? result.message
      : result.type === "group" ? result.error || result.message
        : result.type === "already_checked_in" ? result.message
          : result.type === "valid" ? result.message : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#08111b]/45 p-2 backdrop-blur-[2px] sm:items-center sm:p-5" onClick={onDismiss}>
      <section
        aria-labelledby="scan-result-title"
        aria-modal="true"
        className="max-h-[88svh] w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white text-[#172431] shadow-[0_28px_90px_rgba(8,17,27,0.32)] animate-in slide-in-from-bottom-4 duration-300 sm:max-h-[82svh]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-center pt-3 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <header className="flex items-center justify-between px-5 pb-3 pt-4 sm:px-6 sm:pt-5">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-gray-400">Ticket scan</span>
          <button onClick={onDismiss} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A6E]" aria-label="Close scan details">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">
          <div className={`flex items-center gap-3 rounded-2xl border p-3.5 ${style.tone}`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm">
              {busy ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : <StatusIcon type={result.type} />}
            </div>
            <div className="min-w-0">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] ${style.pill}`}>
                {busy ? "Working" : result.type === "valid" ? "Ready at gate" : result.type === "already_checked_in" ? "Review entry" : result.type === "forged" ? "Invalid signature" : result.type === "unknown" ? "Roster lookup" : result.type === "group" ? "Group pass" : "Action needed"}
              </span>
              <h2 id="scan-result-title" className="mt-1 truncate text-[16px] font-extrabold leading-tight text-[#172431]">{style.title}</h2>
            </div>
          </div>

          {description && <p className="mt-3 rounded-xl bg-gray-50 px-3.5 py-3 text-[12px] leading-relaxed text-gray-600" role={result.type === "error" || result.type === "forged" ? "alert" : "status"}>{description}</p>}

          {result.type === "valid" && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eaf9f7] text-sm font-black text-[#0E7A6E]">{result.attendee.name.trim().charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-extrabold text-[#172431]">{result.attendee.name}</div>
                <div className="mt-0.5 truncate font-mono text-[10px] text-gray-500">{result.attendee.refCode} <span className="font-sans">· {standId}</span></div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase text-emerald-700">Checked in</span>
            </div>
          )}

          {result.type === "already_checked_in" && (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <div className="text-[14px] font-extrabold text-[#172431]">{result.attendee.name}</div>
              <div className="mt-1 font-mono text-[10px] text-gray-600">{result.attendee.refCode}</div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
                <div><span className="block text-gray-500">Checked in</span><strong className="mt-1 block text-gray-800">{result.attendee.checkedInAt ? new Date(result.attendee.checkedInAt).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" }) : "Earlier"}</strong></div>
                <div><span className="block text-gray-500">Stand</span><strong className="mt-1 block truncate text-gray-800">{result.attendee.checkedInStand || "Not recorded"}</strong></div>
              </div>
            </div>
          )}

          {result.type === "group" && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 text-[10px]">
                <span className="font-bold uppercase tracking-wider text-gray-500">Paid seats</span>
                <span className="font-extrabold text-gray-800">{result.attendees.length} attendees</span>
              </div>
              <ul className="max-h-[34svh] divide-y divide-gray-100 overflow-y-auto">
                {result.attendees.map((attendee) => {
                  const checkedIn = attendee.checkedInAt || attendee.status === "checked_in" || attendee.status === "booklet_issued";
                  return (
                    <li key={attendee.attendeeId} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-bold text-gray-800">{attendee.name}</div>
                        <div className="mt-0.5 font-mono text-[9px] text-gray-500">{attendee.refCode}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold uppercase ${checkedIn ? "bg-amber-50 text-amber-800" : attendee.status === "confirmed" ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                        {checkedIn ? "Already in" : attendee.status === "confirmed" ? "Ready" : "Review"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {result.type === "valid" && !result.attendee.bookletIssuedAt && (
              <button onClick={() => onIssueBooklet(result.attendee, result.ticketToken)} disabled={busy || issuingBooklet} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#0e7a6e]/20 bg-[#eaf9f7] text-[12px] font-extrabold text-[#0e6f64] hover:bg-[#dcf5f1] disabled:cursor-wait disabled:opacity-60">
              {issuingBooklet ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              {issuingBooklet ? "Recording issue…" : "Issue conference booklet"}
            </button>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {result.type === "group" && !result.checkedIn && eligibleGroupCount > 0 && (
              <button onClick={() => onCheckInGroup(result.attendees, result.orderToken)} disabled={busy} className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0e7a6e] px-4 text-[12px] font-extrabold text-white shadow-sm hover:bg-[#0a655c] disabled:cursor-wait disabled:opacity-60">
                {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Check in {eligibleGroupCount} {eligibleGroupCount === 1 ? "attendee" : "attendees"}
              </button>
            )}
            <button onClick={onDismiss} className="col-span-2 min-h-11 rounded-xl bg-[#0b2f50] px-4 text-[12px] font-extrabold text-white hover:bg-[#12476d]">
              {result.type === "valid" || result.type === "group" && result.checkedIn ? "Next scan" : "Close and scan again"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
