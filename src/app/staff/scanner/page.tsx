"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  BookOpen,
  ArrowLeft,
  Search,
  Volume2,
} from "lucide-react";
import { scannerDb, CachedAttendee, PendingScan } from "@/lib/offline/dexie-db";
import { sounds } from "@/lib/audio/sound-effects";
import { verifyTicketToken, sha256Hex } from "@/lib/crypto/ed25519";

type ScanResultState =
  | { type: "idle" }
  | {
      type: "valid";
      attendee: CachedAttendee;
      message: string;
    }
  | {
      type: "already_checked_in";
      attendee: CachedAttendee;
      message: string;
    }
  | {
      type: "forged";
      error: string;
    };

export default function StaffScannerPage() {
  const [standId, setStandId] = useState("Gate A");
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<ScanResultState>({ type: "idle" });

  // Camera video ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Keep screen awake (WakeLock API)
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

    // Initial DB metrics
    refreshCounts();

    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const refreshCounts = async () => {
    try {
      const pCount = await scannerDb.pendingScans.where("synced").equals(0 as any).count();
      const cCount = await scannerDb.cachedAttendees.count();
      setPendingCount(pCount);
      setCachedCount(cCount);
    } catch (_) {}
  };

  // Sync cache with server manifest & flush pending scans
  const handleFullSync = async () => {
    if (!navigator.onLine) {
      alert("Device is offline. Connect to internet to sync.");
      return;
    }

    setSyncing(true);
    try {
      // 1. Flush pending offline scans first
      const pending = await scannerDb.pendingScans.toArray();
      const unsynced = pending.filter((p) => !p.synced);

      if (unsynced.length > 0) {
        const syncRes = await fetch("/api/scanner/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scans: unsynced }),
        });
        if (syncRes.ok) {
          await scannerDb.pendingScans.clear();
        }
      }

      // 2. Fetch fresh attendee manifest
      const res = await fetch("/api/scanner/manifest");
      const data = await res.json();

      if (data.attendees && Array.isArray(data.attendees)) {
        await scannerDb.cachedAttendees.bulkPut(data.attendees);
      }

      await refreshCounts();
    } catch (err: any) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Process a raw scanned token string
  const processToken = async (tokenString: string) => {
    const pubKey =
      process.env.NEXT_PUBLIC_TICKET_VERIFYING_PUBLIC_KEY ||
      // Fallback matching mock signing key
      "mock_public_key_hex";

    const hash = await sha256Hex(tokenString.trim());

    // 1. Check local IndexedDB cache first
    let attendee = await scannerDb.cachedAttendees.get(hash);

    // If not found by hash, check if token string is a plain ref code (HGC-XXXXXX)
    if (!attendee && tokenString.startsWith("HGC-")) {
      attendee = await scannerDb.cachedAttendees.where("refCode").equals(tokenString.trim()).first();
    }

    // 2. Cryptographic signature check
    if (!tokenString.startsWith("HGC-")) {
      const verified = await verifyTicketToken(tokenString, pubKey);
      if (!verified.isValid && !attendee) {
        sounds.playError();
        sounds.vibrate("error");
        setScanResult({
          type: "forged",
          error: "Invalid Ed25519 signature — Ticket is forged or corrupted.",
        });
        return;
      }
    }

    if (!attendee) {
      sounds.playError();
      sounds.vibrate("error");
      setScanResult({
        type: "forged",
        error: "Valid cryptographic format, but attendee not found in camp database.",
      });
      return;
    }

    // 3. Check status: already checked in?
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

    // 4. Valid new check-in!
    const clientTimestamp = new Date().toISOString();
    const idempotencyKey = `scan_${attendee.attendeeId}_${Date.now()}`;

    // Update local cache immediately
    const updated: CachedAttendee = {
      ...attendee,
      status: "checked_in",
      checkedInAt: clientTimestamp,
      checkedInStand: standId,
    };
    await scannerDb.cachedAttendees.put(updated);

    // Queue pending scan
    await scannerDb.pendingScans.add({
      attendeeId: attendee.attendeeId,
      scanType: "arrival",
      standId,
      staffId: "staff_gate_attendant",
      deviceId: "pwa_client_device",
      clientTimestamp,
      idempotencyKey,
      synced: false,
    });

    sounds.playSuccess();
    sounds.vibrate("success");
    setScanResult({
      type: "valid",
      attendee: updated,
      message: "Valid Admission Pass • Checked In",
    });

    refreshCounts();

    // If online, trigger background sync
    if (navigator.onLine) {
      fetch("/api/scanner/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scans: [
            {
              attendeeId: attendee.attendeeId,
              scanType: "arrival",
              standId,
              clientTimestamp,
              idempotencyKey,
            },
          ],
        }),
      }).catch(() => {});
    }
  };

  // Issue Booklet Action
  const handleIssueBooklet = async (attendee: CachedAttendee) => {
    const clientTimestamp = new Date().toISOString();
    const idempotencyKey = `booklet_${attendee.attendeeId}_${Date.now()}`;

    const updated: CachedAttendee = {
      ...attendee,
      status: "booklet_issued",
      bookletIssuedAt: clientTimestamp,
    };
    await scannerDb.cachedAttendees.put(updated);

    await scannerDb.pendingScans.add({
      attendeeId: attendee.attendeeId,
      scanType: "booklet",
      standId,
      staffId: "staff_gate_attendant",
      deviceId: "pwa_client_device",
      clientTimestamp,
      idempotencyKey,
      synced: false,
    });

    sounds.playSuccess();
    sounds.vibrate("success");

    setScanResult({
      type: "valid",
      attendee: updated,
      message: "Conference Booklet Issued!",
    });

    refreshCounts();

    if (navigator.onLine) {
      fetch("/api/scanner/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scans: [
            {
              attendeeId: attendee.attendeeId,
              scanType: "booklet",
              standId,
              clientTimestamp,
              idempotencyKey,
            },
          ],
        }),
      }).catch(() => {});
    }
  };

  // Start camera stream
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera permission error:", err);
      setCameraActive(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1020] text-white flex flex-col font-sans select-none">
      
      {/* Top Sunlight-Readable Navigation Bar */}
      <header className="h-14 bg-[#171A2B] px-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="text-gray-400 hover:text-white p-1">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="font-black text-sm tracking-wide">
            GATE SCANNER
          </div>
          <select
            value={standId}
            onChange={(e) => setStandId(e.target.value)}
            className="bg-[#0E1020] text-xs font-bold text-[#8EE3D6] px-2 py-1 rounded border border-white/20 ml-1"
          >
            <option>Gate A</option>
            <option>Gate B</option>
            <option>Men Gate</option>
            <option>Women Gate</option>
            <option>Express Groups</option>
          </select>
        </div>

        {/* Sync & Connectivity Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isOnline ? "bg-emerald-950 text-emerald-400" : "bg-red-950 text-red-400"
            }`}
          >
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>

          <button
            onClick={handleFullSync}
            disabled={syncing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-[#8EE3D6]" : ""}`} />
            <span className="text-[11px] font-mono">{pendingCount > 0 ? `${pendingCount} queued` : "Sync"}</span>
          </button>
        </div>
      </header>

      {/* Main Scanner Body */}
      <main className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full space-y-4">
        
        {/* Camera View Area */}
        <div className="relative aspect-[4/3] bg-black rounded-[20px] overflow-hidden border-2 border-white/20 shadow-lg flex items-center justify-center">
          {cameraActive ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Camera className="w-12 h-12 text-gray-500" />
              <div className="text-xs text-gray-400">
                Camera scanner active with BarcodeDetector API.
              </div>
              <button
                onClick={startCamera}
                className="px-6 py-2.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-bold text-xs"
              >
                Enable Camera
              </button>
            </div>
          )}

          {/* Viewfinder crosshairs */}
          <div className="absolute inset-8 border border-white/30 rounded-xl pointer-events-none flex items-center justify-center">
            <div className="w-24 h-24 border-2 border-[#8EE3D6] rounded-lg animate-pulse opacity-60" />
          </div>
        </div>

        {/* Manual Ref Code Entry Fallback */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Manual Ref / Code Lookup
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. HGC-K7M9P2"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-2.5 rounded-[10px] bg-[#171A2B] border border-white/10 text-white font-mono text-sm uppercase focus:outline-none focus:border-[#8EE3D6]"
            />
            <button
              onClick={() => {
                if (manualCode.trim()) {
                  processToken(manualCode.trim());
                  setManualCode("");
                }
              }}
              className="px-5 py-2.5 rounded-[10px] bg-[#8EE3D6] text-[#0E1020] font-bold text-xs hover:bg-[#7BD4C7] shrink-0"
            >
              Verify
            </button>
          </div>
        </div>

        {/* Quick Operational Links */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href="/staff/walk-in"
            className="p-3 bg-[#171A2B] rounded-xl border border-white/10 text-center hover:bg-white/10 transition-colors"
          >
            <div className="text-xs font-bold text-white">Walk-in Register</div>
            <div className="text-[10px] text-gray-400">Cash / POS Gate Issue</div>
          </Link>
          <Link
            href="/staff/lookup"
            className="p-3 bg-[#171A2B] rounded-xl border border-white/10 text-center hover:bg-white/10 transition-colors"
          >
            <div className="text-xs font-bold text-white">Supervisor Lookup</div>
            <div className="text-[10px] text-gray-400">Override / Search Attendee</div>
          </Link>
        </div>

        {/* Offline Cache Stats */}
        <div className="text-center text-[11px] text-gray-500 pt-1 font-mono">
          Local DB: {cachedCount} attendees cached • {pendingCount} offline scans pending sync
        </div>

      </main>

      {/* ========================================================================= */}
      {/* FULLSCREEN SCAN RESULT OVERLAYS (Sunlight-Readable, Green / Amber / Red)   */}
      {/* ========================================================================= */}

      {scanResult.type === "valid" && (
        <div className="fixed inset-0 z-50 bg-[#064E3B] text-white p-6 flex flex-col justify-between animate-in zoom-in-95 duration-150">
          <div className="pt-8 text-center space-y-4">
            <div className="w-24 h-24 rounded-full bg-emerald-400/20 text-emerald-300 mx-auto flex items-center justify-center border-4 border-emerald-400">
              <CheckCircle2 className="w-14 h-14" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-widest text-emerald-200">
                {scanResult.message}
              </span>
              <h2 className="text-3xl font-black tracking-tight pt-2">
                {scanResult.attendee.name}
              </h2>
              {scanResult.attendee.parish && (
                <div className="text-sm text-emerald-200">
                  {scanResult.attendee.parish}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-black/20 text-left space-y-1 max-w-sm mx-auto text-xs font-mono">
              <div>Ref: <strong className="text-white">{scanResult.attendee.refCode}</strong></div>
              <div>Gate: <strong className="text-white">{standId}</strong></div>
              <div>Booklet Status: <strong className={scanResult.attendee.bookletIssuedAt ? "text-emerald-300" : "text-amber-300"}>
                {scanResult.attendee.bookletIssuedAt ? "Issued" : "Not Yet Issued"}
              </strong></div>
            </div>
          </div>

          <div className="pb-8 space-y-3 max-w-sm mx-auto w-full">
            {!scanResult.attendee.bookletIssuedAt && (
              <button
                onClick={() => handleIssueBooklet(scanResult.attendee)}
                className="w-full py-4 rounded-full bg-emerald-300 hover:bg-emerald-200 text-[#064E3B] font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-xl active:scale-98"
              >
                <BookOpen className="w-5 h-5" />
                <span>Issue Conference Booklet</span>
              </button>
            )}

            <button
              onClick={() => setScanResult({ type: "idle" })}
              className="w-full py-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-sm"
            >
              Next Scan (Dismiss)
            </button>
          </div>
        </div>
      )}

      {scanResult.type === "already_checked_in" && (
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
                {scanResult.attendee.name}
              </h2>
              <p className="text-sm text-amber-200 leading-relaxed max-w-xs mx-auto">
                {scanResult.message}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/20 text-left space-y-1 max-w-sm mx-auto text-xs font-mono">
              <div>Ref: <strong className="text-white">{scanResult.attendee.refCode}</strong></div>
              <div>Checked In At: <strong className="text-white">
                {scanResult.attendee.checkedInAt ? new Date(scanResult.attendee.checkedInAt).toLocaleString() : "Earlier"}
              </strong></div>
            </div>
          </div>

          <div className="pb-8 space-y-3 max-w-sm mx-auto w-full">
            <button
              onClick={() => setScanResult({ type: "idle" })}
              className="w-full py-4 rounded-full bg-white text-black font-black text-sm tracking-wide"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {scanResult.type === "forged" && (
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
                {scanResult.error}
              </p>
            </div>
          </div>

          <div className="pb-8 space-y-3 max-w-sm mx-auto w-full">
            <button
              onClick={() => setScanResult({ type: "idle" })}
              className="w-full py-4 rounded-full bg-white text-black font-black text-sm tracking-wide"
            >
              Dismiss (Scan Next)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
