"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

const DEDUPE_WINDOW_MS = 3000;

/**
 * Camera + QR decode loop hook.
 * Uses native BarcodeDetector when available, falls back to jsQR on canvas.
 * Dedupes repeated reads of the same code and single-flights processing.
 */
export function useQrScanner(onDecoded: (value: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const detectorFailedRef = useRef(false);
  const lastDecodedRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const processingRef = useRef(false);
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleDecoded = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (
      trimmed === lastDecodedRef.current.value &&
      now - lastDecodedRef.current.at < DEDUPE_WINDOW_MS
    ) {
      return;
    }
    lastDecodedRef.current = { value: trimmed, at: now };
    if (processingRef.current) return;
    processingRef.current = true;
    Promise.resolve(onDecodedRef.current(trimmed)).finally(() => {
      processingRef.current = false;
    });
  }, []);

  const detectFrame = useCallback(async () => {
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
  }, [handleDecoded]);

  const scanLoop = useCallback(() => {
    void detectFrame();
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [detectFrame]);

  const stopCamera = useCallback(() => {
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
  }, []);

  const startCamera = useCallback(async () => {
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
  }, [scanLoop]);

  // Stop camera on unmount
  useEffect(() => stopCamera, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    cameraActive,
    cameraError,
    startCamera,
    stopCamera,
  };
}
