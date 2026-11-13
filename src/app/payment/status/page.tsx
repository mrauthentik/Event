"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, Phone } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

function StatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get("ref");
  const paypalToken = searchParams.get("token");
  const ticketAccess = searchParams.get("ticket_access");
  const isCancelled = searchParams.get("cancelled") === "true";

  const [status, setStatus] = useState<"polling" | "paid" | "pending" | "failed">("polling");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!ref || !ticketAccess) {
      setStatus("failed");
      setErrorMessage("Payment session details are missing. Use the ticket recovery form if you completed payment.");
      return;
    }

    if (isCancelled) {
      setStatus("failed");
      setErrorMessage("Payment was cancelled by the user.");
      return;
    }

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        const statusUrl = new URL(`/api/checkout/status/${encodeURIComponent(ref)}`, window.location.origin);
        if (paypalToken) statusUrl.searchParams.set("paypal_token", paypalToken);
        statusUrl.searchParams.set("ticket_access", ticketAccess);
        const url = statusUrl.toString();
        const res = await fetch(url);
        const data = await res.json();

        if (!isMounted) return;

        if (data.status === "paid") {
          setStatus("paid");
          // Redirect to ticket page immediately
          setTimeout(() => {
            router.push(`/ticket/${ref}?access=${encodeURIComponent(ticketAccess)}`);
          }, 1500);
          return;
        }

        if (data.status === "failed") {
          setStatus("failed");
          setErrorMessage(data.error || "Payment was declined by your bank or gateway.");
          return;
        }

        // Still pending
        setPollCount((prev) => prev + 1);
        timer = setTimeout(checkStatus, 2500);
      } catch (err: any) {
        if (!isMounted) return;
        setPollCount((prev) => prev + 1);
        timer = setTimeout(checkStatus, 3000);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [ref, paypalToken, ticketAccess, isCancelled, router]);

  const handleManualRecheck = async () => {
    if (!ref || !ticketAccess) return;
    setStatus("polling");
    try {
      const statusUrl = new URL(`/api/checkout/status/${encodeURIComponent(ref)}`, window.location.origin);
      if (paypalToken) statusUrl.searchParams.set("paypal_token", paypalToken);
      statusUrl.searchParams.set("ticket_access", ticketAccess);
      const res = await fetch(statusUrl.toString());
      const data = await res.json();
      if (data.status === "paid") {
        setStatus("paid");
        router.push(`/ticket/${ref}?access=${encodeURIComponent(ticketAccess)}`);
      } else {
        setStatus("pending");
      }
    } catch (_) {
      setStatus("pending");
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-[24px] border border-gray-100 p-8 shadow-sm text-center space-y-6">
      {status === "polling" && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#EAF9F7] text-[#0E7A6E] mx-auto flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#111320]">
              Verifying Payment...
            </h2>
            <p className="text-xs text-[#6B7280]">
              Connecting with payment gateway for reference{" "}
              <strong className="text-black font-mono">{ref}</strong>
            </p>
          </div>
          <div className="text-[11px] text-gray-400">
            Please do not close this window. Confirmation takes a few seconds.
          </div>
        </div>
      )}

      {status === "paid" && (
        <div className="space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#111320]">
              Payment Confirmed!
            </h2>
            <p className="text-xs text-gray-600">
              Generating your cryptographic ticket QR code now...
            </p>
          </div>
          <div className="pt-2">
            <Link
              href={`/ticket/${ref}?access=${encodeURIComponent(ticketAccess || "")}`}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-bold text-xs shadow-sm"
            >
              View Ticket Now →
            </Link>
          </div>
        </div>
      )}

      {status === "pending" && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
            <RefreshCw className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#111320]">
              Payment Pending Confirmation
            </h2>
            <p className="text-xs text-[#6B7280]">
              Your bank or gateway is finalizing processing for order{" "}
              <strong className="text-black font-mono">{ref}</strong>.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={handleManualRecheck}
              className="w-full py-2.5 px-4 rounded-full bg-[#0E1020] text-white font-semibold text-xs hover:bg-[#1A1D36] transition-colors"
            >
              Re-check Status Now
            </button>
            <div className="text-[11px] text-gray-500 pt-2">
              If your account was debited, do not pay twice. You can also look up your ticket later at{" "}
              <Link href="/ticket/resend" className="text-[#0E7A6E] underline font-semibold">
                Resend Ticket
              </Link>
              .
            </div>
          </div>
        </div>
      )}

      {status === "failed" && (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[#111320]">
              Payment Incomplete
            </h2>
            <p className="text-xs text-red-600 leading-relaxed">
              {errorMessage || "The transaction could not be completed."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#0E1020] text-white font-semibold text-xs"
            >
              Return to Registration
            </Link>
          </div>
        </div>
      )}

      {/* Help Line */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-xs text-gray-500">
        <Phone className="w-3.5 h-3.5 text-gray-400" />
        <span>Help desk: {SITE_CONFIG.contact.phone}</span>
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <Suspense fallback={<div className="text-sm text-gray-500">Loading payment status...</div>}>
          <StatusContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

