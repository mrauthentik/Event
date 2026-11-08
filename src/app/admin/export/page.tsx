import { Download, ShieldCheck, FileSpreadsheet, Lock } from "lucide-react";

export default function AdminExportPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#111320] tracking-tight">Reports & Export</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Generate audit-logged CSV exports for physical check-in rosters, finance reconciliation, and camp protocol.
        </p>
      </div>

      <div className="bg-white rounded-[20px] border border-gray-200 p-6 sm:p-8 space-y-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EAF9F7] text-[#0E7A6E] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#111320]">
              Full Attendee Master Roster (CSV)
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Includes all registered and confirmed attendees, reference codes, phone numbers, state/country, guardian contacts for minors, and check-in statuses.
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" />
            <span>Export action is recorded with operator IP into the immutable audit log.</span>
          </div>
          <a
            href="/api/admin/export"
            download
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0E1020] text-white font-bold text-xs hover:bg-[#1A1D36] transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#8EE3D6]" />
            <span>Download CSV</span>
          </a>
        </div>
      </div>
    </div>
  );
}

