"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { Lock, Users, User, CheckCircle2, AlertCircle, ChevronRight, Globe } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";
import { CURRENCIES, SupportedCurrency, formatMoneyMinor } from "@/config/currencies";

export default function RegisterPage() {
  const router = useRouter();

  // Mode: Individual vs Group
  const [isGroup, setIsGroup] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>("NGN");

  // Form State
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("+234 ");
  const [payerEmail, setPayerEmail] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [state, setState] = useState("");
  const [parish, setParish] = useState("");
  const [groupName, setGroupName] = useState("");
  const [seatsCount, setSeatsCount] = useState(5);
  const [isMinor, setIsMinor] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Cloudflare Turnstile script and render widget
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) return;

    const renderWidget = () => {
      const w = (window as any).turnstile;
      if (w && turnstileRef.current && !turnstileRef.current.hasChildNodes()) {
        w.render(turnstileRef.current, {
          sitekey: siteKey,
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
          theme: "light",
        });
      }
    };

    if ((window as any).turnstile) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);
  }, []);

  // Restore draft state from localStorage to prevent loss on dropped connection
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ihgc_draft_registration");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.payerName) setPayerName(parsed.payerName);
        if (parsed.payerPhone) setPayerPhone(parsed.payerPhone);
        if (parsed.payerEmail) setPayerEmail(parsed.payerEmail);
        if (parsed.country) setCountry(parsed.country);
        if (parsed.state) setState(parsed.state);
        if (parsed.parish) setParish(parsed.parish);
      }
    } catch (_) {}
  }, []);

  // Save draft state
  const updateDraft = (key: string, val: any) => {
    try {
      const current = JSON.parse(localStorage.getItem("ihgc_draft_registration") || "{}");
      localStorage.setItem("ihgc_draft_registration", JSON.stringify({ ...current, [key]: val }));
    } catch (_) {}
  };

  const currentCurrencyConfig = CURRENCIES[currency];
  const effectiveSeats = isGroup ? seatsCount : 1;
  const totalMinor = effectiveSeats * currentCurrencyConfig.standardPriceMinor;
  const formattedTotal = formatMoneyMinor(totalMinor, currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("Please accept the terms and consent checkbox to proceed.");
      return;
    }

    if (currency !== "NGN" && (!payerEmail || !payerEmail.includes("@"))) {
      setError("A valid email address is required for international currency payments via PayPal.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/checkout/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          isGroup,
          payerName,
          payerPhone: payerPhone.trim(),
          payerEmail: payerEmail.trim() || undefined,
          country,
          state: country === "Nigeria" ? state : undefined,
          parish: parish || undefined,
          isMinor,
          guardianName: isMinor ? guardianName : undefined,
          guardianPhone: isMinor ? guardianPhone : undefined,
          groupName: isGroup ? groupName : undefined,
          groupSeatsCount: isGroup ? seatsCount : 1,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize registration session.");
      }

      // Clear draft on successful initiation
      localStorage.removeItem("ihgc_draft_registration");

      // Redirect to hosted payment checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.push(`/payment/status?ref=${data.reference}`);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <Header />

      {/* Hero with Overlapping Registration Card matching KILO Screenshot 5 */}
      <section className="relative w-full bg-[#0E1020] text-white pt-14 pb-28 lg:pb-36 px-6 sm:px-8 overflow-hidden">
        {/* Background Image with Dark Navy Gradient */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/crowd-bw.jpg"
            alt="Horemow Congregation"
            fill
            className="object-cover opacity-25 mix-blend-overlay"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0E1020]/90 via-[#0E1020]/80 to-[#0E1020]" />
        </div>

        <div className="relative z-10 max-w-[1240px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text */}
          <div className="lg:col-span-6 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8EE3D6] bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
              <span>IHGC 2026 Registration</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Register For The 2026 General Conference
            </h1>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-lg">
              Secure your 4-day all-access attendee badge and printed conference booklet. Register as an individual or purchase seats for your church parish.
            </p>
            <div className="pt-2 flex items-center gap-6 text-xs text-gray-400">
              <div>• 8 – 11 Dec 2026</div>
              <div>• Kwali, Abuja</div>
              <div>• Instant QR Ticket</div>
            </div>
          </div>
        </div>
      </section>

      {/* Overlapping Form Section (Positioned like KILO Screenshot 5) */}
      <section className="relative z-20 max-w-[800px] mx-auto px-4 sm:px-6 -mt-20 lg:-mt-24 pb-20 w-full">
        <div className="bg-white rounded-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
          
          {/* Card Top Brand Header */}
          <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src={SITE_CONFIG.logo.src}
                alt="Horemow"
                width={120}
                height={38}
                className="h-8 w-auto object-contain"
              />
              <div className="h-6 w-px bg-gray-200" />
              <div className="text-xs font-bold text-[#111320] uppercase tracking-wider">
                Registration Portal
              </div>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-1.5 bg-[#F3F4F6] p-1 rounded-full self-start sm:self-auto">
              {(["NGN", "USD", "EUR", "GBP"] as SupportedCurrency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    currency === c
                      ? "bg-white text-[#0E1020] shadow-xs"
                      : "text-gray-500 hover:text-black"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            
            {/* Mode Toggle: Individual vs Group */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-[#F3F4F6] rounded-xl">
              <button
                type="button"
                onClick={() => setIsGroup(false)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  !isGroup
                    ? "bg-white text-[#0E1020] shadow-2xs"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Individual Attendee</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGroup(true)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isGroup
                    ? "bg-white text-[#0E1020] shadow-2xs"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Group / Parish Pass</span>
              </button>
            </div>

            {/* Group Extra Fields */}
            {isGroup && (
              <div className="p-5 bg-[#EAF9F7] rounded-[16px] border border-[#CDEFEA] space-y-4 animate-in fade-in duration-200">
                <div className="text-xs font-bold uppercase tracking-wider text-[#0E7A6E]">
                  Group Configuration
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#111320]">
                      Church / Parish Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Horemow Lagos Central / Grace Assembly"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-[8px] bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8EE3D6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#111320]">
                      Number of Attendees (Seats) *
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={500}
                      required
                      value={seatsCount}
                      onChange={(e) => setSeatsCount(parseInt(e.target.value) || 2)}
                      className="w-full px-3.5 py-2.5 rounded-[8px] bg-white border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#8EE3D6]"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#0E7A6E]">
                  Leader receives an express group QR code and management link to invite members or distribute tickets.
                </p>
              </div>
            )}

            {/* Contact Information Fields (~6px radius inputs matching KILO Screenshot 5) */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {isGroup ? "Group Leader Details" : "Personal Information"}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#111320]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Brother / Sister Full Name"
                    value={payerName}
                    onChange={(e) => {
                      setPayerName(e.target.value);
                      updateDraft("payerName", e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-[6px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#111320]">
                    Phone Number (E.164) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 801 234 5678"
                    value={payerPhone}
                    onChange={(e) => {
                      setPayerPhone(e.target.value);
                      updateDraft("payerPhone", e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-[6px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#111320]">
                    Email Address {currency === "NGN" ? "(Optional)" : "(Required for PayPal) *"}
                  </label>
                  <input
                    type="email"
                    required={currency !== "NGN"}
                    placeholder={currency === "NGN" ? "Optional for SMS-only tickets" : "name@example.com"}
                    value={payerEmail}
                    onChange={(e) => {
                      setPayerEmail(e.target.value);
                      updateDraft("payerEmail", e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-[6px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#111320]">
                    Country of Residence *
                  </label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      updateDraft("country", e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-[6px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              {country.toLowerCase() === "nigeria" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#111320]">
                      State of Residence (Nigeria) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FCT Abuja, Lagos, Kaduna, etc."
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        updateDraft("state", e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-[6px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#111320]">
                      Local Parish / Church Branch (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Horemow Kwali Chapter"
                      value={parish}
                      onChange={(e) => {
                        setParish(e.target.value);
                        updateDraft("parish", e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-[6px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Minor Checkbox */}
            {!isGroup && (
              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={isMinor}
                    onChange={(e) => setIsMinor(e.target.checked)}
                    className="rounded border-gray-300 text-[#0E1020] focus:ring-[#8EE3D6]"
                  />
                  <span>Attendee is under 18 years of age (Parent / Guardian consent required)</span>
                </label>

                {isMinor && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 pl-6">
                    <input
                      type="text"
                      required={isMinor}
                      placeholder="Parent / Guardian Name *"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      className="px-3.5 py-2 rounded-[6px] bg-[#F3F4F6] text-xs focus:outline-none"
                    />
                    <input
                      type="tel"
                      required={isMinor}
                      placeholder="Parent / Guardian Phone *"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      className="px-3.5 py-2 rounded-[6px] bg-[#F3F4F6] text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Consent & Terms */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-600 leading-snug">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="rounded border-gray-300 text-[#0E1020] focus:ring-[#8EE3D6] mt-0.5"
                />
                <span>
                  I understand that registration fees are non-refundable and that accommodation & meals are arranged independently. I consent to personal data processing under the{" "}
                  <Link href="/privacy" className="underline text-black font-semibold">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms" className="underline text-black font-semibold">
                    Terms (Draft)
                  </Link>
                  .
                </span>
              </label>
            </div>

            {/* Cloudflare Turnstile Bot Protection */}
            <div className="pt-2">
              <div ref={turnstileRef} className="min-h-[65px]" />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Total Summary & Pay Button */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {effectiveSeats} {effectiveSeats === 1 ? "Attendee Pass" : "Attendee Seats"} ({currency}):
                </span>
                <span className="text-2xl font-black text-[#111320] tracking-tight">
                  {formattedTotal}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-full bg-[#0E1020] hover:bg-[#1A1D36] text-white font-bold text-sm tracking-wide transition-all duration-200 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md"
              >
                <Lock className="w-4 h-4 text-[#8EE3D6]" />
                <span>
                  {loading
                    ? "Initializing Secure Checkout..."
                    : `Pay ${formattedTotal} via ${currency === "NGN" ? "Paystack" : "PayPal"}`}
                </span>
              </button>

            </div>

          </form>

        </div>
      </section>

      <Footer />
    </div>
  );
}

