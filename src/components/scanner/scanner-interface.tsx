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
    <main className="min-h-[100svh] bg-[#1d252b] font-sans text-white selection:bg-[#8EE3D6] selection:text-[#0b2f50]">
      <div className="relative mx-auto flex h-[100svh] min-h-[620px] w-full max-w-[480px] flex-col overflow-hidden bg-[#777774] shadow-[0_0_80px_rgba(0,0,0,0.28)] sm:min-h-[700px]">
        <section className="relative min-h-0 flex-1 overflow-hidden bg-[#797976]">
          {session.cameraActive ? (
            <video ref={session.videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted aria-label="Live ticket scanner camera" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,rgba(231,231,225,0.32),transparent_60%),linear-gradient(145deg,#777774_0%,#5e6160_100%)]" aria-hidden="true" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/30" aria-hidden="true" />

          <header className="absolute inset-x-0 top-0 z-20 flex h-[68px] items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
            <Link href="/" aria-label="Back to Horemow home" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/15 text-white backdrop-blur-md transition hover:bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex flex-col items-center text-center drop-shadow-sm">
              <span className="text-[11px] font-extrabold tracking-[0.13em] text-white">IHGC 2026</span>
              <span className="mt-0.5 text-[9px] font-medium text-white/75">GATE SCANNER</span>
            </div>
            <button onClick={() => setSettingsOpen((value) => !value)} aria-expanded={settingsOpen} aria-label="Scanner settings" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/15 text-white backdrop-blur-md transition hover:bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <Settings2 className="h-4 w-4" />
            </button>
          </header>

          {settingsOpen && (
            <section aria-label="Scanner settings" className="absolute right-3 top-[72px] z-30 w-[min(88vw,340px)] rounded-2xl border border-white/70 bg-white p-4 text-[#172431] shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-extrabold">Scanner setup</h2>
                <button onClick={() => setSettingsOpen(false)} aria-label="Close scanner settings" className="rounded-full p-1 text-gray-500 hover:bg-gray-100"><ChevronDown className="h-4 w-4" /></button>
              </div>
              <label htmlFor="scanner-stand" className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Assigned stand</label>
              <input id="scanner-stand" value={session.standId} onChange={(event) => session.updateStandId(event.target.value)} maxLength={64} className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-[13px] font-semibold text-[#172431] outline-none focus:border-[#0E7A6E] focus:ring-2 focus:ring-[#0E7A6E]/15" />
              <p className="mt-2 text-[10px] leading-relaxed text-gray-500">Use the stand name assigned by the organizer. It is saved on this device.</p>
            </section>
          )}

          <div className="absolute inset-x-0 top-[25%] z-10 px-6 text-center" aria-hidden="true">
            <span className="inline-flex rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/90 backdrop-blur-md">
              {session.cameraActive ? "Align ticket QR inside the frame" : "Scan attendee pass"}
            </span>
          </div>

          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center pb-7">
            <div className={`relative aspect-square w-[min(64vw,290px)] rounded-[28px] border border-white/10 transition-all duration-300 ${session.cameraActive ? "scale-100" : "scale-[0.84] opacity-50"}`}>
              <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-[18px] border-l-[3px] border-t-[3px] border-[#b9fff2] shadow-[0_0_14px_rgba(142,227,214,0.48)]" />
              <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-[18px] border-r-[3px] border-t-[3px] border-[#b9fff2] shadow-[0_0_14px_rgba(142,227,214,0.48)]" />
              <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-[18px] border-b-[3px] border-l-[3px] border-[#b9fff2] shadow-[0_0_14px_rgba(142,227,214,0.48)]" />
              <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-[18px] border-b-[3px] border-r-[3px] border-[#b9fff2] shadow-[0_0_14px_rgba(142,227,214,0.48)]" />
              {session.cameraActive && <span className="absolute inset-x-5 top-1/2 h-px animate-[scanline_2s_ease-in-out_infinite] bg-[#a4fff0] shadow-[0_0_14px_3px_rgba(142,227,214,0.42)]" />}
            </div>
          </div>

          {!session.cameraActive && (
            <div className="absolute inset-x-8 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-md"><Camera className="h-6 w-6 text-white" /></div>
              <p className="mt-3 text-[13px] font-extrabold text-white drop-shadow">Camera is ready when you are</p>
              <p className="mt-1 max-w-[250px] text-[10px] leading-relaxed text-white/75">Keep the QR steady in the frame. You can also enter the short ticket reference below.</p>
              <button onClick={() => void session.startCamera()} disabled={session.cameraStarting} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[11px] font-extrabold text-[#172431] shadow-lg transition hover:bg-[#eaf9f7] disabled:cursor-wait disabled:opacity-70">
                {session.cameraStarting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {session.cameraStarting ? "Opening camera…" : "Start scanning"}
              </button>
            </div>
          )}

          {session.cameraActive && (
            <button onClick={session.stopCamera} className="absolute right-4 top-[78px] z-20 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[9px] font-bold text-white backdrop-blur-md hover:bg-black/50">Pause camera</button>
          )}

          <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-between px-5">
            <button onClick={() => photoInputRef.current?.click()} aria-label="Choose a ticket QR image" className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white shadow-lg backdrop-blur-md transition hover:bg-black/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <ImageIcon className="h-5 w-5" />
            </button>
            <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-bold text-white/85 backdrop-blur-md">Camera scans stay on this device</div>
            <button onClick={() => void session.toggleTorch()} aria-pressed={session.torchEnabled} aria-label={session.torchEnabled ? "Turn flashlight off" : "Turn flashlight on"} className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${session.torchEnabled ? "border-[#b9fff2] bg-[#b9fff2] text-[#123a47]" : "border-white/20 bg-black/25 text-white hover:bg-black/45"}`}>
              <Flashlight className="h-5 w-5" />
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Select QR code image" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void session.scanImageFile(file);
              event.currentTarget.value = "";
            }} />
          </div>

          {(session.cameraError) && (
            <div className="absolute inset-x-3 bottom-[76px] z-30 rounded-xl border border-amber-200/70 bg-[#fff9e9]/95 px-3 py-2.5 text-[10px] font-semibold leading-relaxed text-amber-950 shadow-lg" role="alert">
              {session.cameraError}
              <button onClick={session.clearCameraError} className="ml-2 font-extrabold underline underline-offset-2">Dismiss</button>
            </div>
          )}
        </section>

        <section className="relative z-20 shrink-0 rounded-t-[28px] bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 text-[#172431] shadow-[0_-16px_42px_rgba(0,0,0,0.16)] sm:px-5">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-gray-200" aria-hidden="true" />
          <div className="flex items-center justify-between gap-2">
            <div className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-[9px] font-extrabold ${session.isOnline ? "bg-[#e8f8f2] text-[#14765a]" : "bg-amber-50 text-amber-800"}`} role="status" aria-live="polite">
              {session.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {session.isOnline ? "Scanner online" : "Offline · saved on device"}
            </div>
            <button onClick={() => void session.handleFullSync()} disabled={session.syncing || !session.isOnline} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-gray-100 px-3 text-[9px] font-extrabold text-gray-700 transition hover:bg-gray-200 disabled:cursor-wait disabled:opacity-55" aria-label={`Sync scanner, ${session.pendingCount} check-ins waiting`}>
              {session.syncing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {session.syncing ? "Syncing" : session.pendingCount ? `${session.pendingCount} queued · Sync` : "Sync roster"}
            </button>
          </div>

          <div className="mt-3 rounded-xl bg-[#f3f7f6] px-3 py-2.5" role="status" aria-live="polite">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#176b5e]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dff4ed]"><Check className="h-3 w-3" /></span>
              {session.busy ? "Verifying ticket…" : session.cachedCount ? `${session.cachedCount.toLocaleString()} attendees ready for lookup` : "Sync the attendee list before the gate opens"}
            </div>
            <p className="mt-1 pl-7 text-[9px] leading-relaxed text-gray-500">Assigned stand: <strong className="text-gray-700">{session.standId || "Not set"}</strong>. Pending scans: {session.pendingCount}.</p>
          </div>

          <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void session.submitManual(); }}>
            <label className="sr-only" htmlFor="manual-ticket-reference">Ticket reference code</label>
            <input id="manual-ticket-reference" type="text" placeholder="Enter ticket ref · HGC-XXXXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} value={session.manualCode} onChange={(event) => session.setManualCode(event.target.value.toUpperCase())} className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#172431] outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:border-[#0E7A6E] focus:ring-2 focus:ring-[#0E7A6E]/15" />
            <button type="submit" disabled={session.busy} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#172d3d] px-3.5 text-[10px] font-extrabold text-white transition hover:bg-[#0b2f50] disabled:cursor-wait disabled:opacity-60"><Search className="h-3.5 w-3.5" />Verify</button>
          </form>

          {session.syncMessage && <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-[9px] leading-relaxed text-gray-600" role="status">{session.syncMessage}</div>}

          <nav className="mt-3 grid grid-cols-2 gap-2" aria-label="More scanner actions">
            <Link href="/staff/walk-in" className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-[9px] font-bold text-gray-700 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A6E]"><UserRoundPlus className="h-3.5 w-3.5" />Walk-in registration</Link>
            <Link href="/staff/lookup" className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-[9px] font-bold text-gray-700 transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E7A6E]"><Search className="h-3.5 w-3.5" />Find attendee</Link>
          </nav>
        </section>

        <canvas ref={session.canvasRef} className="hidden" aria-hidden="true" />
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
