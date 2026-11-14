import { ScannerInterface } from "@/components/scanner/scanner-interface";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function StaffScannerPage() {
  const user = await requireRole("attendant");
  if (!user) redirect("/staff/login");
  return <ScannerInterface />;
}
