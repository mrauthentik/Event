"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#8EE3D6] text-[#0E1020] font-heading font-bold text-xs hover:bg-[#7BD4C7] shadow-sm transition-all cursor-pointer active:scale-95"
    >
      <Printer className="w-3.5 h-3.5" />
      <span>Print / Save as PDF</span>
    </button>
  );
}

