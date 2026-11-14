"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Flashlight,
  Image as ImageIcon,
  LoaderCircle,
  Search,
  Settings2,
  UserRoundPlus,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ScanResultOverlay } from "@/components/scanner/scan-result-overlay";
import { useScannerSession } from "@/components/scanner/use-scanner-session";

export function ScannerInterface() {
  const session = useScannerSession();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="min-h-[100svh] bg-[#0A0D18] font-body text-white selection:bg-[#8EE3D6] selection:text-[#0E1020]">
      <div className="relative mx-auto flex h-[100svh] min-h-[640px] w-full max-w-[480px] flex-col overflow-hidden bg-[#0E1020] shadow-[0_0_80px_rgba(0,0,0,0.5)] sm:min-h-[720px] sm:border-x sm:border-white/10">

        {/* Top Viewfinder Area */}
        <section className="relative min-h-0 flex-1 overflow-hidden bg-[#0A0D18]">
          {/* Video preview: MUST remain mounted at all times to prevent videoRef.current === null during startCamera() */}
          <video
            ref={session.videoRef}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${session.cameraActive ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            playsInline
            muted
            aria-label="Live ticket scanner camera"
          />

          {/* Idle Camera Backdrop (when camera is not active) */}
          {!session.cameraActive && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#0E1020] via-[#121528] to-[#0A0D18]" aria-hidden="true">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(142,227,214,0.12),transparent_65%)]" />
              {/* Subtle grid pattern */}
              <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>
          )}

          {/* Subtle vignette */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/35" aria-hidden="true" />

          {/* Top Bar Header */}
          <header className="absolute inset-x-0 top-0 z-20 flex h-[68px] items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
            <Link
              href="/"
              aria-label="Back to Horemow home"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex flex-col items-center text-center">
              <span className="font-heading text-xs font-extrabold tracking-[0.14em] text-white">
                IHGC 2026
              </span>
              <span className="font-heading text-[10px] font-bold tracking-wider text-[#8EE3D6]">
                GATE SCANNER
              </span>
            </div>

            <button
              onClick={() => setSettingsOpen((value) => !value)}
              aria-expanded={settingsOpen}
              aria-label="Scanner settings"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white backdrop-blur-md transition hover:bg-black/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </header>

          {/* Settings Popover */}
          {settingsOpen && (
            <section
              aria-label="Scanner settings"
              className="absolute right-3 top-[72px] z-30 w-[min(88vw,340px)] rounded-2xl border border-gray-100 bg-white p-5 text-[#111320] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[#111320]">
                  Scanner Setup
                </h2>
                <button
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Close scanner settings"
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <label htmlFor="scanner-stand" className="mt-3 block font-heading text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Assigned Stand Name
              </label>
              <input
                id="scanner-stand"
                value={session.standId}
                onChange={(event) => session.updateStandId(event.target.value)}
                maxLength={64}
                placeholder="e.g. Gate A - Stand 1"
                className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 font-body text-[13px] font-semibold text-[#111320] outline-none focus:border-[#0E7A6E] focus:ring-2 focus:ring-[#0E7A6E]/15"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                Saved on this device. Scans and booklet distributions will be recorded with this gate stand identifier.
              </p>
            </section>
          )}

          {/* Scanner Guidance Pill */}
          <div className="absolute inset-x-0 top-[22%] z-10 px-6 text-center" aria-hidden="true">
            <span className="inline-flex rounded-full border border-white/15 bg-black/35 px-4 py-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-[#8EE3D6] backdrop-blur-md shadow-sm">
              {session.cameraActive ? "Align ticket QR inside the frame" : "Scan Attendee Pass"}
            </span>
          </div>

          {/* Viewfinder Target Reticle */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pb-8">
            <div
              className={`relative aspect-square w-[min(66vw,290px)] rounded-[28px] border border-white/15 transition-all duration-300 ${
                session.cameraActive ? "scale-100 border-white/20" : "scale-[0.88] opacity-60"
              }`}
            >
              {/* Corner Accents in Mint Brand Color */}
              <span className="absolute -left-0.5 -top-0.5 h-10 w-10 rounded-tl-[24px] border-l-[3.5px] border-t-[3.5px] border-[#8EE3D6] shadow-[0_0_16px_rgba(142,227,214,0.6)]" />
              <span className="absolute -right-0.5 -top-0.5 h-10 w-10 rounded-tr-[24px] border-r-[3.5px] border-t-[3.5px] border-[#8EE3D6] shadow-[0_0_16px_rgba(142,227,214,0.6)]" />
              <span className="absolute -bottom-0.5 -left-0.5 h-10 w-10 rounded-bl-[24px] border-b-[3.5px] border-l-[3.5px] border-[#8EE3D6] shadow-[0_0_16px_rgba(142,227,214,0.6)]" />
              <span className="absolute -bottom-0.5 -right-0.5 h-10 w-10 rounded-br-[24px] border-b-[3.5px] border-r-[3.5px] border-[#8EE3D6] shadow-[0_0_16px_rgba(142,227,214,0.6)]" />

              {/* Animated Laser Scanline */}
              {session.cameraActive && (
                <span className="absolute inset-x-4 top-1/2 h-[2px] animate-[scanline_2.2s_ease-in-out_infinite] bg-[#8EE3D6] shadow-[0_0_16px_4px_rgba(142,227,214,0.7)]" />
              )}
            </div>
          </div>

          {/* Start Camera Hero Button (when inactive) */}
          {!session.cameraActive && (
            <div className="absolute inset-x-8 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-md">
                <Camera className="h-7 w-7 text-[#8EE3D6]" />
              </div>
              <p className="mt-4 font-heading text-sm font-bold text-white drop-shadow">
                Gate Camera Ready
              </p>
              <p className="mt-1 max-w-[260px] font-body text-xs leading-relaxed text-gray-300">
                Keep the QR ticket steady in the frame. You can also enter the short ticket reference below.
              </p>
              <button
                onClick={() => void session.startCamera()}
                disabled={session.cameraStarting}
                className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#8EE3D6] px-6 font-heading text-xs font-bold text-[#0E1020] shadow-[0_4px_20px_rgba(142,227,214,0.35)] transition-all hover:bg-[#7BD4C7] active:scale-95 disabled:cursor-wait disabled:opacity-70"
              >
                {session.cameraStarting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-[#0E1020]" />
                ) : (
                  <Camera className="h-4 w-4 text-[#0E1020]" />
                )}
                {session.cameraStarting ? "Opening camera…" : "Start Scanning"}
              </button>
            </div>
          )}

          {/* Pause Camera Button (when active) */}
          {session.cameraActive && (
            <button
              onClick={session.stopCamera}
              className="absolute right-4 top-[78px] z-20 rounded-full border border-white/20 bg-black/45 px-3.5 py-1.5 font-heading text-[10px] font-bold text-white backdrop-blur-md hover:bg-black/65 transition-colors"
            >
              Pause camera
            </button>
          )}

          {/* Bottom Camera Toolbar (Flashlight & Photo Upload) */}
          <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-between px-5">
            <button
              onClick={() => photoInputRef.current?.click()}
              aria-label="Choose a ticket QR image from gallery"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-lg backdrop-blur-md transition hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <ImageIcon className="h-5 w-5" />
            </button>

            <div className="rounded-full border border-white/10 bg-black/30 px-3.5 py-1.5 font-body text-[10px] font-medium text-white/85 backdrop-blur-md">
              Scans verified on-device
            </div>

            <button
              onClick={() => void session.toggleTorch()}
              aria-pressed={session.torchEnabled}
              aria-label={session.torchEnabled ? "Turn flashlight off" : "Turn flashlight on"}
              className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${
                session.torchEnabled
                  ? "border-[#8EE3D6] bg-[#8EE3D6] text-[#0E1020]"
                  : "border-white/20 bg-black/35 text-white hover:bg-black/55"
              }`}
            >
              <Flashlight className="h-5 w-5" />
            </button>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              aria-label="Select QR code image"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void session.scanImageFile(file);
                event.currentTarget.value = "";
              }}
            />
          </div>

          {/* Error Banner */}
          {session.cameraError && (
            <div
              className="absolute inset-x-3 bottom-[78px] z-30 rounded-xl border border-amber-200 bg-[#fff9e9]/95 px-3.5 py-2.5 font-body text-[11px] font-semibold leading-relaxed text-amber-950 shadow-xl"
              role="alert"
            >
              <span>{session.cameraError}</span>
              <button
                onClick={session.clearCameraError}
                className="ml-2 font-heading font-bold text-amber-900 underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          )}
        </section>

        {/* Bottom Operations Sheet */}
        <section className="relative z-20 shrink-0 rounded-t-[32px] bg-white px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-3.5 text-[#111320] shadow-[0_-16px_45px_rgba(0,0,0,0.25)]">
          {/* Grab handle */}
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" aria-hidden="true" />

          {/* Connectivity Status & Sync Bar */}
          <div className="flex items-center justify-between gap-2">
            <div
              className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 py-0.5 font-heading text-[10px] font-bold ${
                session.isOnline ? "bg-[#EAF9F7] text-[#0E7A6E]" : "bg-amber-50 text-amber-800"
              }`}
              role="status"
              aria-live="polite"
            >
              {session.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{session.isOnline ? "Scanner Online" : "Offline · Kwali Campground"}</span>
            </div>

            <button
              onClick={() => void session.handleFullSync()}
              disabled={session.syncing || !session.isOnline}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-gray-100 px-3.5 font-heading text-[10px] font-bold text-gray-700 transition hover:bg-gray-200 disabled:cursor-wait disabled:opacity-55"
              aria-label={`Sync scanner, ${session.pendingCount} check-ins waiting`}
            >
              {session.syncing ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#0E7A6E]" />
              ) : (
                <Check className="h-3.5 w-3.5 text-[#0E7A6E]" />
              )}
              <span>
                {session.syncing
                  ? "Syncing…"
                  : session.pendingCount
                  ? `${session.pendingCount} queued · Sync`
                  : "Sync Roster"}
              </span>
            </button>
          </div>

          {/* Stand Status Callout */}
          <div className="mt-3 rounded-2xl bg-[#F8FAFC] border border-gray-100 px-3.5 py-2.5" role="status" aria-live="polite">
            <div className="flex items-center gap-2 font-heading text-[11px] font-bold text-[#0E7A6E]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF9F7]">
                <Check className="h-3 w-3 text-[#0E7A6E]" />
              </span>
              <span>
                {session.busy
                  ? "Verifying ticket signature…"
                  : session.cachedCount
                  ? `${session.cachedCount.toLocaleString()} attendees cached for offline lookup`
                  : "Sync attendee roster before gates open"}
              </span>
            </div>
            <p className="mt-1 pl-7 font-body text-[10px] leading-relaxed text-gray-500">
              Assigned Stand: <strong className="font-semibold text-gray-800">{session.standId || "Not set (set in gear icon)"}</strong> · Queue: {session.pendingCount} pending
            </p>
          </div>

          {/* Manual Reference Entry Form */}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void session.submitManual();
            }}
          >
            <label className="sr-only" htmlFor="manual-ticket-reference">
              Ticket reference code
            </label>
            <input
              id="manual-ticket-reference"
              type="text"
              placeholder="Enter ticket ref · HGC-XXXXXX"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={session.manualCode}
              onChange={(event) => session.setManualCode(event.target.value.toUpperCase())}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.06em] text-[#111320] outline-none placeholder:font-body placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:border-[#0E7A6E] focus:ring-2 focus:ring-[#0E7A6E]/15"
            />
            <button
              type="submit"
              disabled={session.busy}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0E1020] px-4 font-heading text-[11px] font-bold text-white transition hover:bg-[#1A1D36] active:scale-95 disabled:cursor-wait disabled:opacity-60"
            >
              <Search className="h-3.5 w-3.5 text-[#8EE3D6]" />
              <span>Verify</span>
            </button>
          </form>

          {session.syncMessage && (
            <div className="mt-2 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2 font-body text-[10px] leading-relaxed text-gray-600" role="status">
              {session.syncMessage}
            </div>
          )}

          {/* Fast Staff Action Shortcuts */}
          <nav className="mt-3 grid grid-cols-2 gap-2" aria-label="Staff gate actions">
            <Link
              href="/staff/walk-in"
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white font-heading text-[10px] font-bold text-[#111320] transition hover:bg-gray-50 hover:border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0E7A6E]"
            >
              <UserRoundPlus className="h-3.5 w-3.5 text-[#0E7A6E]" />
              <span>Walk-in Gate Sale</span>
            </Link>
            <Link
              href="/staff/lookup"
              className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white font-heading text-[10px] font-bold text-[#111320] transition hover:bg-gray-50 hover:border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0E7A6E]"
            >
              <Search className="h-3.5 w-3.5 text-[#0E7A6E]" />
              <span>Lookup Attendee</span>
            </Link>
          </nav>
        </section>

        {/* Hidden Canvas for QR Extraction */}
        <canvas ref={session.canvasRef} className="hidden" aria-hidden="true" />

        {/* Result Overlay Sheet */}
        <ScanResultOverlay
          result={session.scanResult}
          standId={session.standId}
          busy={session.busy}
          issuingBooklet={session.issuingBooklet}
          onDismiss={session.dismissResult}
          onIssueBooklet={(attendee, ticketToken) => void session.handleIssueBooklet(attendee, ticketToken)}
          onCheckInGroup={(attendees, token) => void session.handleGroupCheckIn(attendees, token)}
        />
      </div>
    </main>
  );
}
