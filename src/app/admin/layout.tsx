import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Download,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Orders", href: "/admin/orders", icon: Receipt },
    { label: "Attendees", href: "/admin/attendees", icon: Users },
    { label: "Reports & Export", href: "/admin/export", icon: Download },
  ];

  return (
    <div className="min-h-screen flex bg-[#F4F5F7] text-[#111320]">
      {/* Dense Operational Sidebar */}
      <aside className="w-64 bg-[#0E1020] text-gray-300 flex flex-col justify-between shrink-0 hidden md:flex border-r border-white/5">
        <div>
          {/* Top Admin Brand */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white tracking-wide">
                IHGC 2026
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#8EE3D6] text-[#0E1020]">
                ADMIN
              </span>
            </div>
            <ShieldCheck className="w-4 h-4 text-[#8EE3D6]" />
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <item.icon className="w-4 h-4 text-gray-400" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer in Sidebar */}
        <div className="p-4 border-t border-white/10 text-[11px] text-gray-400 space-y-1">
          <div className="text-white font-semibold">Camp Operations Desk</div>
          <div>Kwali, Abuja • Africa/Lagos</div>
          <div className="pt-2">
            <Link href="/" className="text-[#8EE3D6] hover:underline text-[10px]">
              ← Public Site
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Operational Bar */}
        <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {SITE_CONFIG.eventTitle} • Management Console
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Gateways Active
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
