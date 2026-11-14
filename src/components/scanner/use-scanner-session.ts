"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scannerDb, type CachedAttendee } from "@/lib/offline/dexie-db";
import { sounds } from "@/lib/audio/sound-effects";
import { resolveScannedToken } from "@/lib/scanner/token-verifier";
import { recordArrivalCheckIn, recordGroupArrivalCheckIn, issueConferenceBooklet } from "@/lib/scanner/checkin-actions";
import { useQrScanner } from "@/components/scanner/use-qr-scanner";
import type { ScanResult } from "@/components/scanner/scan-result-overlay";

export function useScannerSession() {
  const [standId, setStandId] = useState("Registration Stand");
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult>({ type: "idle" });
  const [busy, setBusy] = useState(false);
  const [issuingBooklet, setIssuingBooklet] = useState(false);
  const syncingRef = useRef(false);
  const scanBusyRef = useRef(false);

  const refreshCounts = useCallback(async () => {
    try {
      const [pendingRows, cached] = await Promise.all([
        scannerDb.pendingScans.toArray(),
        scannerDb.cachedAttendees.count(),
      ]);
      setPendingCount(pendingRows.filter((scan) => !scan.synced).length);
      setCachedCount(cached);
    } catch {
      setSyncMessage("Local scanner storage is unavailable. Keep the paper/manual fallback available and try reloading this device.");
    }
  }, []);

  const handleScanError = useCallback((message: string) => {
    setScanResult({ type: "error", message });
  }, []);

  const processToken = useCallback(async (tokenString: string) => {
    if (scanBusyRef.current) return;
    scanBusyRef.current = true;
    setBusy(true);
    try {
      const outcome = await resolveScannedToken(tokenString);
      if (outcome.status === "group") {
        sounds.playSuccess();
        sounds.vibrate("success");
        setScanResult({ type: "group", orderId: outcome.orderId, orderToken: outcome.token, attendees: outcome.attendees, checkedIn: false });
        return;
      }
      if (outcome.status === "forged") {
        sounds.playError();
        sounds.vibrate("error");
        setScanResult({ type: "forged", error: outcome.error });
        return;
      }
      if (outcome.status === "unknown") {
        sounds.playWarning();
        sounds.vibrate("warning");
        setScanResult({ type: "unknown", message: outcome.error });
        return;
      }

      const attendee = outcome.attendee;
      if (attendee.status === "checked_in" || attendee.status === "booklet_issued" || attendee.checkedInAt) {
        sounds.playWarning();
        sounds.vibrate("warning");
        setScanResult({
          type: "already_checked_in",
          attendee,
          message: `First recorded at ${attendee.checkedInStand || "an assigned stand"} (${attendee.checkedInAt ? new Date(attendee.checkedInAt).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" }) : "time unavailable"}).`,
        });
        return;
      }

      const result = await recordArrivalCheckIn(attendee, standId, tokenString.trim());
      if (result.outcome === "already_checked_in") {
        sounds.playWarning();
        sounds.vibrate("warning");
        setScanResult({
          type: "already_checked_in",
          attendee: result.attendee,
          message: `This ticket was checked in at ${result.attendee.checkedInStand || "another stand"} (${result.attendee.checkedInAt ? new Date(result.attendee.checkedInAt).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit" }) : "time unavailable"}).`,
        });
      } else {
        sounds.playSuccess();
        sounds.vibrate("success");
        setScanResult({
          type: "valid",
          attendee: result.attendee,
          ticketToken: tokenString.trim(),
          message: result.outcome === "queued" ? "Saved on this scanner. It will sync when the connection returns." : "Ticket confirmed and checked in.",
        });
      }
      await refreshCounts();
    } catch (error) {
      sounds.playError();
      sounds.vibrate("error");
      setScanResult({ type: "error", message: error instanceof Error ? error.message : "The scan could not be processed. Try again or use manual lookup." });
    } finally {
      scanBusyRef.current = false;
      setBusy(false);
    }
  }, [refreshCounts, standId]);

  const scanner = useQrScanner(processToken, handleScanError);

  const updateStandId = useCallback((value: string) => {
    const nextValue = value.slice(0, 64);
    setStandId(nextValue);
    void scannerDb.scannerSettings.put({ key: "standId", value: nextValue }).catch(() => {
      setSyncMessage("Stand choice could not be saved on this device.");
    });
  }, []);

  const handleIssueBooklet = useCallback(async (attendee: CachedAttendee, ticketToken: string) => {
    setIssuingBooklet(true);
    try {
      const result = await issueConferenceBooklet(attendee, standId, ticketToken);
      sounds.playSuccess();
      sounds.vibrate("success");
      setScanResult(result.outcome === "already_issued"
        ? { type: "error", message: "This attendee already has a booklet issue recorded." }
        : { type: "valid", attendee: result.attendee, ticketToken, message: result.outcome === "queued" ? "Booklet issue saved offline and queued to sync." : "Conference booklet issue recorded." });
      await refreshCounts();
    } catch (error) {
      setScanResult({ type: "error", message: error instanceof Error ? error.message : "Booklet issue could not be recorded. Try again." });
    } finally {
      setIssuingBooklet(false);
    }
  }, [refreshCounts, standId]);

  const handleGroupCheckIn = useCallback(async (groupAttendees: CachedAttendee[], orderToken: string) => {
    const orderId = groupAttendees[0]?.orderId;
    if (!orderId) {
      setScanResult({ type: "error", message: "This group pass has no order reference. Use manual lookup." });
      return;
    }
    setBusy(true);
    try {
      let updated: CachedAttendee[];
      let message: string;
      if (navigator.onLine) {
        const response = await fetch("/api/scanner/group-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: orderToken, standId }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Group check-in could not be confirmed. Try syncing and rescan the order QR.");
        if (!Array.isArray(data?.roster)) throw new Error("The server returned an incomplete group roster. Sync and scan the group QR again.");
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
        updated = await recordGroupArrivalCheckIn(groupAttendees, standId, orderToken);
        message = "Saved on this scanner. Group arrivals are queued to sync when online.";
      }
      sounds.playSuccess();
      sounds.vibrate("success");
      setScanResult({ type: "group", orderId, orderToken, attendees: updated, checkedIn: true, message });
      await refreshCounts();
    } catch (error) {
      setScanResult({
        type: "group",
        orderId,
        orderToken,
        attendees: groupAttendees,
        checkedIn: false,
        error: error instanceof Error ? error.message : "Group check-in failed. Verify the connection and retry.",
      });
    } finally {
      setBusy(false);
    }
  }, [refreshCounts, standId]);

  const handleFullSync = useCallback(async () => {
    if (syncingRef.current) return;
    if (!navigator.onLine) {
      setSyncMessage("This device is offline. Pending check-ins remain saved on this scanner.");
      setIsOnline(false);
      return;
    }

    syncingRef.current = true;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const pending = await scannerDb.pendingScans.toArray();
      const unsynced = pending.filter((scan) => !scan.synced);
      if (unsynced.length) {
        const syncRes = await fetch("/api/scanner/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scans: unsynced }),
        });
        const syncData = await syncRes.json().catch(() => null);
        if (!syncRes.ok) {
          const retryAfter = syncRes.headers.get("retry-after");
          throw new Error(syncRes.status === 401
            ? "Your staff session has expired. Sign in again, then sync this scanner."
            : syncData?.error || (retryAfter ? `Sync is rate limited. Try again in ${retryAfter} seconds.` : "Pending check-ins could not sync. They remain saved on this device."));
        }
        if (!Array.isArray(syncData?.results)) throw new Error("The sync response was incomplete. Pending scans remain saved on this device.");
        const acknowledgedKeys = new Set<string>(syncData.results
          .filter((result: { idempotencyKey?: unknown }) => typeof result.idempotencyKey === "string")
          .map((result: { idempotencyKey: string }) => result.idempotencyKey));
        const acknowledged = unsynced.filter((scan) => acknowledgedKeys.has(scan.idempotencyKey));
        const acknowledgedIds = acknowledged.flatMap((scan) => scan.id === undefined ? [] : [scan.id]);
        if (acknowledgedIds.length) await scannerDb.pendingScans.bulkDelete(acknowledgedIds);
        setSyncMessage(`Sync complete: ${syncData.processedCount ?? 0} saved, ${syncData.conflictsCount ?? 0} conflicts, ${syncData.rejectedCount ?? 0} rejected. ${unsynced.length - acknowledged.length} still queued.`);
      }

      const savedSync = await scannerDb.scannerSettings.get("lastManifestSyncAt");
      const manifestUrl = new URL("/api/scanner/manifest", window.location.origin);
      if (typeof savedSync?.value === "string") manifestUrl.searchParams.set("since", savedSync.value);
      const manifestResponse = await fetch(manifestUrl, { cache: "no-store" });
      const manifest = await manifestResponse.json().catch(() => null);
      if (!manifestResponse.ok || !Array.isArray(manifest?.attendees) || typeof manifest?.serverTimestamp !== "string") {
        throw new Error(manifest?.error || "The attendee list could not refresh. Keep using the cached roster and retry sync.");
      }
      if (manifest.attendees.length) await scannerDb.cachedAttendees.bulkPut(manifest.attendees);
      await scannerDb.scannerSettings.put({ key: "lastManifestSyncAt", value: manifest.serverTimestamp });
      setSyncMessage((current) => current || `Attendee list refreshed. ${manifest.attendees.length} records updated.`);
      setIsOnline(true);
      await refreshCounts();
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Sync failed. Pending scans remain saved on this device.");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshCounts]);

  const submitManual = useCallback(async () => {
    const code = manualCode.trim();
    if (!code) {
      setScanResult({ type: "unknown", message: "Enter the ticket reference printed below the QR code." });
      return;
    }
    setManualCode("");
    await processToken(code);
  }, [manualCode, processToken]);

  const dismissResult = useCallback(() => setScanResult({ type: "idle" }), []);

  useEffect(() => {
    let active = true;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" })
        .then((registration) => navigator.serviceWorker.ready.then(() => {
          if (active) registration.active?.postMessage({ type: "CACHE_SCANNER_SHELL" });
        }))
        .catch(() => setSyncMessage("Offline app shell is unavailable. Keep the scanner page open while working offline."));
    }
    void scannerDb.scannerSettings.get("standId").then((saved) => {
      if (active && typeof saved?.value === "string" && saved.value) setStandId(saved.value);
    }).catch(() => {});

    let wakeLock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    if (nav.wakeLock) void nav.wakeLock.request("screen").then((lock) => {
      if (active) wakeLock = lock;
      else void lock.release().catch(() => {});
    }).catch(() => {});

    const handleOnline = () => {
      setIsOnline(true);
      void handleFullSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage("Connection lost. Check-ins are being saved on this scanner until it reconnects.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    void refreshCounts();

    const interval = window.setInterval(() => {
      if (navigator.onLine) void handleFullSync();
    }, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
      if (wakeLock) void wakeLock.release().catch(() => {});
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleFullSync, refreshCounts]);

  return {
    standId,
    updateStandId,
    isOnline,
    pendingCount,
    cachedCount,
    syncing,
    syncMessage,
    setSyncMessage,
    manualCode,
    setManualCode,
    scanResult,
    setScanResult,
    busy,
    issuingBooklet,
    refreshCounts,
    handleFullSync,
    submitManual,
    dismissResult,
    handleIssueBooklet,
    handleGroupCheckIn,
    ...scanner,
  };
}
