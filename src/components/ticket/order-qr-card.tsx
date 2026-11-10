"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Users } from "lucide-react";

interface OrderQrCardProps {
  orderReference: string;
  isGroup: boolean;
}

/** Order-level QR encoding `IHGC-ORDER:{ref}` for express group check-in. */
export function OrderQrCard({ orderReference, isGroup }: OrderQrCardProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const payload = `IHGC-ORDER:${orderReference}`;

  useEffect(() => {
    QRCode.toDataURL(payload, {
      width: 200,
      margin: 1,
      color: { dark: "#0E1020", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    })
      .then(setDataUrl)
      .catch(() => {});
  }, [payload]);

  return (
    <div className="bg-white rounded-[20px] border border-gray-200 p-5 flex items-center gap-5">
      <div className="p-2 bg-white rounded-[12px] border border-gray-200 shrink-0">
        {dataUrl ? (
          <img src={dataUrl} alt={`Order QR for ${orderReference}`} className="w-20 h-20 object-contain" />
        ) : (
          <div className="w-20 h-20 bg-gray-100 animate-pulse rounded-[8px]" />
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-sm font-bold text-[#111320]">
          <Users className="w-4 h-4 text-[#0E7A6E]" />
          {isGroup ? "Group Order QR" : "Order QR"}
        </div>
        <div className="text-xs text-gray-500 leading-relaxed">
          {isGroup
            ? "Scan this at the group check-in desk to process all seats on this order at once."
            : "Scan this at the gate for express lookup of your order."}
        </div>
        <div className="text-[11px] font-mono text-gray-400">{orderReference}</div>
      </div>
    </div>
  );
}
