"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  RefreshCw,
  ArrowLeft,
  Search,
  UserPlus,
} from "lucide-react";
import { scannerDb, CachedAttendee } from "@/lib/offline/dexie-db";
import { sounds } from "@/lib/audio/sound-effects";
import { resolveScannedToken } from "@/lib/scanner/token-verifier";
import { recordArrivalCheckIn, recordGroupArrivalCheckIn, issueConferenceBooklet } from "@/lib/scanner/checkin-actions";
import { useQrScanner } from "@/components/scanner/use-qr-scanner";
import { ScanResultOverlay, ScanResult } from "@/components/scanner/scan-result-overlay";

export default function StaffScannerPage() {
  const [standId, setStandId] = useState("Registration Stand");
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult>({ type: "idle" });

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then((registration) => navigator.serviceWorker.ready.then(() => {
        if (active) registration.active?.postMessage({ type: "CACHE_SCANNER_SHELL" });
      }))
      .catch(() => {
        // Online scanning still works when the browser blocks service workers.
      });
    return () => { active = false; };
  }, []);

  const refreshCounts = useCallback(async () => {
    try {
      const pCount = await scannerDb.pendingScans.where("synced").equals(0 as any).count();
      const cCount = await scannerDb.cachedAttendees.count();
      setPendingCount(pCount);
      setCachedCount(cCount);
    } catch (_) {}
  }, []);

  // Core scan pipeline: resolve token → check status → record check-in
  const processToken = useCallback(
    async (tokenString: string) => {
      const outcome = await resolveScannedToken(tokenString);

      if (outcome.status === "group") {
        sounds.playSuccess();
        sounds.vibrate("success");
        setScanResult({
          type: "group",
          orderId: outcome.orderId,
          orderToken: outcome.token,
          attendees: outcome.attendees,
          checkedIn: false,
        });
        return;
      }

      if (outcome.status !== "found") {
        sounds.playError();
        sounds.vibrate("error");
        setScanResult({ type: "forged", error: outcome.error });
        return;
      }

      const attendee = outcome.attendee;

      if (attendee.status === "checked_in" || attendee.status === "booklet_issued") {
        sounds.playWarning();
        sounds.vibrate("warning");
        setScanResult({
          type: "already_checked_in",
          attendee,
          message: `Already checked in at ${attendee.checkedInStand || "Gate"} (${
            attendee.checkedInAt ? new Date(attendee.checkedInAt).toLocaleTimeString() : "Earlier"
          })`,
        });
        return;
      }

      const updated = await recordArrivalCheckIn(attendee, standId);

      sounds.playSuccess();
      sounds.vibrate("success");
      setScanResult({
        type: "valid",
        attendee: updated,
        message: "Valid Admission Pass • Checked In",
      });

      refreshCounts();
    },
    [standId, refreshCounts]
  );

  const {
    videoRef,
    canvasRef,
    cameraActive,
    cameraError,
    startCamera,
    stopCamera,
  } = useQrScanner(processToken);

  const handleIssueBooklet = useCallback(
    async (attendee: CachedAttendee) => {
      const updated = await issueConferenceBooklet(attendee, standId);
      sounds.playSuccess();
      sounds.vibrate("success");
      setScanResult({
        type: "valid",
        attendee: updated,
        message: "Conference Booklet Issued!",
      });
      refreshCounts();
    },
    [standId, refreshCounts]
  );

  const handleGroupCheckIn = useCallback(async (groupAttendees: CachedAttendee[], orderToken: string) => {
    const orderId = groupAttendees[0]?.orderId;
    if (!orderId) return;
    try {
      let updated: CachedAttendee[];
      let message: string;
      if (navigator.onLine) {
        const response = await fetch("/api/scanner/group-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: orderToken, standId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Group check-in could not be confirmed.");
        const roster = new Map<string, { status: CachedAttendee["status"]; checkedInAt: string | null }>(
          data.roster.map((entry: { attendeeId: string; status: CachedAttendee["status"]; checkedInAt: string | null }) => [
            entry.attendeeId,
            { status: entry.status, checkedInAt: entry.checkedInAt },
          ])
        );
        updated = groupAttendees.map((attendee) => {
          const latest = roster.get(attendee.attendeeId);
          return latest
            ? { ...attendee, status: latest.status, checkedInAt: latest.checkedInAt, checkedInStand: latest.checkedInAt ? standId : null }
            : attendee;
        });
        await scannerDb.cachedAttendees.bulkPut(updated);
        message = `${data.checkedInCount} checked in; ${data.alreadyCheckedInCount} were already checked in.`;
      } else {
        updated = await recordGroupArrivalCheckIn(groupAttendees, standId);
        message = "Saved on this scanner. Group arrivals are queued to sync when online.";
      }
      sounds.playSuccess();
      sounds.vibrate("success");
      setScanResult({ type: "group", orderId, orderToken, attendees: updated, checkedIn: true, message });
      refreshCounts();
    } catch (error) {
      setScanResult({
        type: "group",
        orderId,
        orderToken,
        attendees: groupAttendees,
        checkedIn: false,
        error: error instanceof Error ? error.message : "Group check-in failed. Try again.",
      });
    }
  }, [standId, refreshCounts]);

  // Sync cache with server manifest & flush pending scans
  const handleFullSync = useCallback(async () => {
    if (!navigator.onLine) {
      alert("Device is offline. Connect to internet to sync.");
      return;
    }

    setSyncing(true);
    try {
      const pending = await scannerDb.pendingScans.toArray();
      const unsynced = pending.filter((p) => !p.synced);

      if (unsynced.length > 0) {
        const syncRes = await fetch("/api/scanner/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scans: unsynced }),
        });
        const syncData = await syncRes.json();
        if (!syncRes.ok) throw new Error(syncData.error || "Scanner sync failed.");
        const acknowledgedKeys = new Set<string>(
          Array.isArray(syncData.results) ? syncData.results.map((result: { idempotencyKey: string }) => result.idempotencyKey) : []
        );
        const acknowledged = unsynced.filter((scan) => acknowledgedKeys.has(scan.idempotencyKey));
        const acknowledgedIds = acknowledged.flatMap((scan) => scan.id === undefined ? [] : [scan.id]);
        if (acknowledgedIds.length) await scannerDb.pendingScans.bulkDelete(acknowledgedIds);
        setSyncMessage(
          `Sync acknowledged ${acknowledged.length}/${unsynced.length}: ${syncData.processedCount} accepted, ${syncData.conflictsCount} conflict(s), ${syncData.rejectedCount} rejected.`
        );
      } else {
        setSyncMessage("No pending scans. Refreshing the attendee list.");
      }

      const res = await fetch("/api/scanner/manifest");
      const data = await res.json();

      if (data.attendees && Array.isArray(data.attendees)) {
        await scannerDb.cachedAttendees.bulkPut(data.attendees);
      }

      await refreshCounts();
    } catch (err: any) {
      setSyncMessage(err instanceof Error ? err.message : "Scanner sync failed. Pending scans remain on this device.");
    } finally {
      setSyncing(false);
    }
  }, [refreshCounts]);

  // Keep screen awake + online/offline listeners + initial counts
  useEffect(() => {
    let wakeLock: any = null;
    if ("wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          wakeLock = lock;
        })
        .catch(() => {});
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    refreshCounts();

    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshCounts]);

  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    setManualCode("");
    processToken(code);
  };

  return (
    <div className="min-h-screen bg-[#0B0F1E] text-white flex flex-col font-sans select-none">

      {/* Top bar */}
      <header className="h-14 px-4 flex items-center justify-between border-b border-white/5 shrink-0 bg-[#0B0F1E]">
        <div className="flex items-center gap-2.5">
          <Link href="/admin" className="text-gray-500 hover:text-white p-1 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="font-extrabold text-[15px] tracking-tight">
            Gate Scanner
          </div>
          <label className="sr-only" htmlFor="scanner-stand">Registration stand identifier</label>
          <input
            id="scanner-stand"
            value={standId}
            onChange={(e) => setStandId(e.target.value)}
            maxLength={64}
            className="w-40 bg-white/5 text-[11px] font-bold text-[#5EEAD4] px-2.5 py-1.5 rounded-lg border border-white/10 ml-1 focus:outline-none focus:border-[#5EEAD4]/50"
            aria-label="Registration stand identifier; enter the organizer-assigned name"
          />
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-red-400"}`} />
            {isOnline ? "Online" : "Offline"}
          </div>

          <button
            onClick={handleFullSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-gray-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-[#5EEAD4]" : "text-gray-400"}`} />
            <span className="font-mono">{pendingCount > 0 ? `${pendingCount} queued` : "Sync"}</span>
          </button>
        </div>
      </header>

      {/* Main body */}
      <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full space-y-4">

        {/* Camera / viewfinder card */}
        <div className="relative aspect-[4/3] rounded-[24px] overflow-hidden bg-[#11162B] border border-white/5 shadow-2xl">
          {cameraActive ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Corner-bracket viewfinder */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-56 h-56">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#5EEAD4] rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#5EEAD4] rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#5EEAD4] rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#5EEAD4] rounded-br-lg" />
                  {/* Scan line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-[#5EEAD4]/70 shadow-[0_0_12px_rgba(94,234,212,0.8)] animate-[scanline_2s_ease-in-out_infinite]" />
                </div>
              </div>
              <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none">
                <span className="text-[11px] font-semibold text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                  Align QR code within frame
                </span>
              </div>
              <button
                onClick={stopCamera}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/50 text-white text-[10px] font-bold hover:bg-black/70 backdrop-blur-sm transition-colors"
              >
                Stop
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Camera className="w-7 h-7 text-[#5EEAD4]" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">Camera Scanner</div>
                <div className="text-[11px] text-gray-400 max-w-[220px]">
                  Point at the attendee QR code to verify and check in.
                </div>
              </div>
              {cameraError && (
                <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 max-w-[260px] leading-relaxed">
                  {cameraError}
                </div>
              )}
              <button
                onClick={startCamera}
                className="px-6 py-2.5 rounded-full bg-[#5EEAD4] hover:bg-[#4DD9C2] text-[#0B0F1E] font-extrabold text-xs tracking-wide transition-colors"
              >
                Enable Camera
              </button>
            </div>
          )}
        </div>

        {/* Manual entry */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
            Manual Entry
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="HGC-XXXXXX"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitManual();
              }}
              className="flex-1 px-4 py-3 rounded-2xl bg-[#11162B] border border-white/10 text-white font-mono text-sm tracking-wider uppercase placeholder:text-gray-600 focus:outline-none focus:border-[#5EEAD4]/60 focus:ring-1 focus:ring-[#5EEAD4]/30"
            />
            <button
              onClick={submitManual}
              className="px-5 py-3 rounded-2xl bg-[#5EEAD4] hover:bg-[#4DD9C2] text-[#0B0F1E] font-extrabold text-xs tracking-wide transition-colors shrink-0"
            >
              Verify
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/staff/walk-in"
            className="p-4 rounded-2xl bg-[#11162B] border border-white/5 hover:border-white/15 hover:bg-[#151B36] transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#5EEAD4]/10 flex items-center justify-center mb-2.5 group-hover:bg-[#5EEAD4]/20 transition-colors">
              <UserPlus className="w-4.5 h-4.5 text-[#5EEAD4]" />
            </div>
            <div className="text-[13px] font-bold text-white">Walk-in Register</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Cash / POS gate issue</div>
          </Link>
          <Link
            href="/staff/lookup"
            className="p-4 rounded-2xl bg-[#11162B] border border-white/5 hover:border-white/15 hover:bg-[#151B36] transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#5EEAD4]/10 flex items-center justify-center mb-2.5 group-hover:bg-[#5EEAD4]/20 transition-colors">
              <Search className="w-4.5 h-4.5 text-[#5EEAD4]" />
            </div>
            <div className="text-[13px] font-bold text-white">Supervisor Lookup</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Override / search attendee</div>
          </Link>
        </div>

        {/* Offline stats */}
        <div className="text-center text-[10px] text-gray-600 pt-1 font-mono">
          {cachedCount} attendees cached • {pendingCount} scans pending sync
        </div>
        {syncMessage && <div role="status" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-[11px] text-gray-300">{syncMessage}</div>}

      </main>

      {/* Hidden canvas for jsQR frame decoding */}
      <canvas ref={canvasRef} className="hidden" />

      <ScanResultOverlay
        result={scanResult}
        standId={standId}
        onDismiss={() => setScanResult({ type: "idle" })}
        onIssueBooklet={handleIssueBooklet}
        onCheckInGroup={handleGroupCheckIn}
      />
    </div>
  );
}
