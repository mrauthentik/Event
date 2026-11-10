"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  BookOpen,
  ArrowLeft,
  Search,
  UserPlus,
} from "lucide-react";
import { scannerDb, CachedAttendee, PendingScan } from "@/lib/offline/dexie-db";
import { sounds } from "@/lib/audio/sound-effects";
import { verifyTicketToken, sha256Hex } from "@/lib/crypto/ed25519";
import jsQR from "jsqr";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const detectorFailedRef = useRef(false);
  const lastDecodedRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const processingRef = useRef(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      process.env.NEXT_PUBLIC_TICKET_VERIFYING_SECRET ||
      "";

    const trimmed = tokenString.trim();
    const hash = await sha256Hex(trimmed);

    // 1. Check local IndexedDB cache by token hash (fast path)
    let attendee = await scannerDb.cachedAttendees.get(hash);

    // If not found by hash, check if token string is a plain ref code (HGC-XXXXXX)
    if (!attendee && trimmed.startsWith("HGC-")) {
      attendee = await scannerDb.cachedAttendees.where("refCode").equals(trimmed).first();
    }

    // 2. Signed token path: verify HMAC signature, resolve attendee by payload.attendeeId
    if (!attendee && trimmed.includes(".") && pubKey) {
      const verified = await verifyTicketToken(trimmed, pubKey);
      if (verified.isValid && verified.payload?.attendeeId) {
        attendee = await scannerDb.cachedAttendees
          .where("attendeeId")
          .equals(verified.payload.attendeeId)
          .first();
      } else if (!verified.isValid) {
        sounds.playError();
        sounds.vibrate("error");
        setScanResult({
          type: "forged",
          error: `Invalid ticket signature — ${verified.error || "ticket rejected"}.`,
        });
        return;
      }
    }

    // 3. Cryptographic signature check for non-ref tokens not resolved above
    if (!attendee && !trimmed.startsWith("HGC-")) {
      if (!pubKey) {
        sounds.playError();
        sounds.vibrate("error");
        setScanResult({
          type: "forged",
          error: "Verifier secret not configured (NEXT_PUBLIC_TICKET_VERIFYING_SECRET).",
        });
        return;
      }
      const verified = await verifyTicketToken(trimmed, pubKey);
      if (!verified.isValid) {
        sounds.playError();
        sounds.vibrate("error");
        setScanResult({
          type: "forged",
          error: "Invalid ticket signature — Ticket is forged or corrupted.",
        });
        return;
      }
      // Valid signature but unknown attendee
      if (verified.payload?.attendeeId) {
        attendee = await scannerDb.cachedAttendees
          .where("attendeeId")
          .equals(verified.payload.attendeeId)
          .first();
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

  // Handle a decoded QR value — dedupe + single-flight processing
  const handleDecoded = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (
      trimmed === lastDecodedRef.current.value &&
      now - lastDecodedRef.current.at < 3000
    ) {
      return;
    }
    lastDecodedRef.current = { value: trimmed, at: now };
    if (processingRef.current) return;
    processingRef.current = true;
    processToken(trimmed).finally(() => {
      processingRef.current = false;
    });
  };

  // Decode one video frame: native BarcodeDetector first, jsQR fallback
  const detectFrame = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    try {
      const Detector = (window as any).BarcodeDetector;
      if (Detector && !detectorFailedRef.current) {
        if (!detectorRef.current) {
          detectorRef.current = new Detector({ formats: ["qr_code"] });
        }
        const codes = await detectorRef.current.detect(video);
        const value = codes?.[0]?.rawValue;
        if (value) handleDecoded(value);
        return;
      }
    } catch (_) {
      detectorFailedRef.current = true;
      detectorRef.current = null;
    }

    // jsQR fallback via canvas
    const canvas = canvasRef.current;
    if (!canvas || !video.videoWidth || !video.videoHeight) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(img.data, img.width, img.height, {
      inversionAttempts: "attemptBoth",
    });
    if (result?.data) handleDecoded(result.data);
  };

  const scanLoop = () => {
    void detectFrame();
    rafRef.current = requestAnimationFrame(scanLoop);
  };

  // Start camera stream + QR decode loop
  const startCamera = async () => {
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Camera unavailable — this page must be served over HTTPS or localhost. Use manual ref entry below, or open via an HTTPS tunnel."
      );
      return;
    }

    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      console.error("Camera permission error:", err);
      setCameraActive(false);
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera permission denied — allow camera access in browser settings."
          : "Could not start camera. Check permissions and try again."
      );
    }
  };

  const stopCamera = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
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
          <select
            value={standId}
            onChange={(e) => setStandId(e.target.value)}
            className="bg-white/5 text-[11px] font-bold text-[#5EEAD4] px-2.5 py-1.5 rounded-lg border border-white/10 ml-1 focus:outline-none focus:border-[#5EEAD4]/50"
          >
            <option>Gate A</option>
            <option>Gate B</option>
            <option>Men Gate</option>
            <option>Women Gate</option>
            <option>Express Groups</option>
          </select>
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
                if (e.key === "Enter" && manualCode.trim()) {
                  processToken(manualCode.trim());
                  setManualCode("");
                }
              }}
              className="flex-1 px-4 py-3 rounded-2xl bg-[#11162B] border border-white/10 text-white font-mono text-sm tracking-wider uppercase placeholder:text-gray-600 focus:outline-none focus:border-[#5EEAD4]/60 focus:ring-1 focus:ring-[#5EEAD4]/30"
            />
            <button
              onClick={() => {
                if (manualCode.trim()) {
                  processToken(manualCode.trim());
                  setManualCode("");
                }
              }}
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

      </main>

      {/* Hidden canvas for jsQR frame decoding */}
      <canvas ref={canvasRef} className="hidden" />

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

