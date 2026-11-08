"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Check } from "lucide-react";

interface QrViewProps {
  value: string;
  refCode: string;
  attendeeName: string;
}

export function QrView({ value, refCode, attendeeName }: QrViewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: 400,
      margin: 2,
      color: {
        dark: "#0E1020",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("QR generation error:", err));
  }, [value]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `IHGC-2026-Ticket-${refCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="p-3 bg-white rounded-[16px] border border-gray-200 shadow-sm inline-block">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`Cryptographic ticket QR code for ${attendeeName}`}
            className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-[8px]"
          />
        ) : (
          <div className="w-56 h-56 sm:w-64 sm:h-64 bg-gray-100 animate-pulse rounded-[8px] flex items-center justify-center text-xs text-gray-400">
            Rendering QR...
          </div>
        )}
      </div>

      <button
        onClick={handleDownload}
        disabled={!dataUrl}
        className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gray-300 hover:border-[#0E1020] bg-white text-xs font-bold text-[#0E1020] hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
      >
        {downloaded ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Saved to Device</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>Download Ticket PNG</span>
          </>
        )}
      </button>
    </div>
  );
}
