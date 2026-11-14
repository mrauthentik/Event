import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function FinanceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole("finance");
  if (!user) redirect("/staff/login");
  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#111320]">
      <header className="flex items-center justify-between bg-[#0E1020] px-5 py-4 text-white">
        <div>
          <div className="text-sm font-bold">IHGC 2026 Finance</div>
          <div className="text-[11px] text-gray-400">Signed in as {user.fullName}</div>
        </div>
        <Link href="/finance/approvals" className="text-xs font-semibold text-[#8EE3D6] hover:text-white">
          Approvals
        </Link>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
    </div>
  );
}
