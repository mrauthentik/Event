"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { SITE_CONFIG } from "@/config/site";

export default function StaffLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed.");
      }

      if (data.requiresTotp) {
        setChallenge(data.challenge);
        setLoading(false);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Login failed.");
      setLoading(false);
    }
  };

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, token: totpToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Verification failed.");
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-[8px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0E1020] p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-[24px] p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-block bg-white p-2 rounded-xl shadow-sm border border-gray-100">
              <Image
                src={SITE_CONFIG.logo.src}
                alt={SITE_CONFIG.logo.alt}
                width={120}
                height={40}
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[#0E7A6E]">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Staff Portal</span>
            </div>
            <h1 className="text-xl font-bold text-[#111320]">
              {challenge ? "Two-Factor Verification" : "Staff Login"}
            </h1>
            <p className="text-xs text-gray-500">
              {challenge
                ? "Enter the 6-digit code from your authenticator app."
                : "IHGC 2026 operations console — authorized personnel only."}
            </p>
          </div>

          {!challenge ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#111320]">Username</label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputCls}
                  placeholder="staff username"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#111320]">Password</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#0E1020] hover:bg-[#1A1D36] text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleTotp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#111320]">Authenticator Code</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ""))}
                  className={`${inputCls} text-center text-lg font-mono tracking-[0.5em]`}
                  placeholder="000000"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || totpToken.length !== 6}
                className="w-full py-3 rounded-full bg-[#0E1020] hover:bg-[#1A1D36] text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify & Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setChallenge(null);
                  setTotpToken("");
                  setError(null);
                }}
                className="w-full text-xs text-gray-500 hover:text-black transition-colors"
              >
                ← Back to login
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-500 mt-6">
          {SITE_CONFIG.copyright}
        </p>
      </div>
    </div>
  );
}
