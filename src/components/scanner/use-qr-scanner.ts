"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

const DEDUPE_WINDOW_MS = 3000;
const MAX_TOKEN_LENGTH = 4096;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FRAME_INTERVAL_MS = 120;

type ScanHandler = (value: string) => void | Promise<void>;
type BarcodeDetectorInstance = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

export function useQrScanner(onDecoded: ScanHandler, onError?: (message: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const detectorFailedRef = useRef(false);
  const frameBusyRef = useRef(false);
  const lastFrameAtRef = useRef(0);
  const lastDecodedRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const processingRef = useRef(false);
  const startRequestRef = useRef(0);
  const cameraStartingRef = useRef(false);
  const onDecodedRef = useRef(onDecoded);
  const onErrorRef = useRef(onError);
  onDecodedRef.current = onDecoded;
  onErrorRef.current = onError;

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const handleDecoded = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_TOKEN_LENGTH) {
      onErrorRef.current?.("This QR is too large to process. Use the printed ticket reference instead.");
      return;
    }
    const now = Date.now();
    if (processingRef.current || (
      trimmed === lastDecodedRef.current.value && now - lastDecodedRef.current.at < DEDUPE_WINDOW_MS
    )) return;

    lastDecodedRef.current = { value: trimmed, at: now };
    processingRef.current = true;
    Promise.resolve(onDecodedRef.current(trimmed))
      .catch(() => onErrorRef.current?.("The scan could not be processed. Try again or enter the reference code."))
      .finally(() => { processingRef.current = false; });
  }, []);

  const detectFrame = useCallback(async () => {
    if (frameBusyRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    frameBusyRef.current = true;
    try {
      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (Detector && !detectorFailedRef.current) {
        try {
          detectorRef.current ||= new Detector({ formats: ["qr_code"] });
          const codes = await detectorRef.current.detect(video);
          if (codes[0]?.rawValue) handleDecoded(codes[0].rawValue);
          return;
        } catch {
          detectorFailedRef.current = true;
          detectorRef.current = null;
        }
      }

      const canvas = canvasRef.current;
      if (!canvas || !video.videoWidth || !video.videoHeight) return;
      const scale = Math.min(1, 960 / video.videoWidth);
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(video, 0, 0, width, height);
      const frame = context.getImageData(0, 0, width, height);
      const result = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "attemptBoth" });
      if (result?.data) handleDecoded(result.data);
    } catch {
      // A transient bad frame should not stop the camera loop or expose camera data.
    } finally {
      frameBusyRef.current = false;
    }
  }, [handleDecoded]);

  const scanLoop = useCallback(() => {
    const now = performance.now();
    if (now - lastFrameAtRef.current >= FRAME_INTERVAL_MS) {
      lastFrameAtRef.current = now;
      void detectFrame();
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [detectFrame]);

  const stopCamera = useCallback(() => {
    startRequestRef.current++;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setCameraStarting(false);
    cameraStartingRef.current = false;
    setTorchEnabled(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current || cameraStartingRef.current || cameraStarting) return;
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access needs HTTPS or localhost. Enter the printed ticket reference below if this device cannot open the camera.");
      return;
    }

    const requestId = ++startRequestRef.current;
    cameraStartingRef.current = true;
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (requestId !== startRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Camera preview is unavailable. Reload the scanner and try again.");
      }
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setCameraActive(true);
      detectorFailedRef.current = false;
      lastFrameAtRef.current = 0;
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      const message = name === "NotAllowedError" || name === "SecurityError"
        ? "Camera permission is blocked. Allow camera access in your browser settings, or use manual reference entry."
        : name === "NotFoundError"
          ? "No camera was found on this device. Use manual reference entry."
          : name === "NotReadableError"
            ? "The camera is being used by another app. Close it and try again."
            : error instanceof Error && error.message
              ? error.message
              : "The camera could not start. Check permissions and try again.";
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
      setCameraError(message);
    } finally {
      if (requestId === startRequestRef.current) {
        cameraStartingRef.current = false;
        setCameraStarting(false);
      }
    }
  }, [cameraStarting, scanLoop]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) {
      setCameraError("Start the camera before using the flashlight.");
      return;
    }
    try {
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      if (!capabilities.torch) {
        setCameraError("This camera does not support its flashlight control.");
        return;
      }
      const nextValue = !torchEnabled;
      await track.applyConstraints({ advanced: [{ torch: nextValue } as unknown as MediaTrackConstraintSet] });
      setTorchEnabled(nextValue);
      setCameraError(null);
    } catch {
      setCameraError("The flashlight could not be changed. Check your device camera settings.");
    }
  }, [torchEnabled]);

  const scanImageFile = useCallback(async (file: File) => {
    setCameraError(null);
    if (!file.type.startsWith("image/")) {
      setCameraError("Choose an image file containing the attendee QR code.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setCameraError("That image is too large. Choose an image under 8 MB.");
      return;
    }
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / bitmap.width);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Image processing is unavailable in this browser.");
      context.drawImage(bitmap, 0, 0, width, height);
      const frame = context.getImageData(0, 0, width, height);
      const result = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "attemptBoth" });
      if (!result?.data) {
        setCameraError("No QR code was found in this image. Try a clearer photo or enter the ticket reference.");
        return;
      }
      handleDecoded(result.data);
    } catch {
      setCameraError("This image could not be opened. Choose another image or enter the ticket reference.");
    } finally {
      bitmap?.close();
    }
  }, [handleDecoded]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return {
    videoRef,
    canvasRef,
    cameraActive,
    cameraStarting,
    cameraError,
    torchEnabled,
    startCamera,
    stopCamera,
    toggleTorch,
    scanImageFile,
    clearCameraError: () => setCameraError(null),
  };
}
