"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, CheckCircle2, AlertCircle } from "lucide-react";

type Settings = {
  eventName?: string;
  theme?: string;
  startsAt?: string;
  endsAt?: string;
  registrationDeadline?: string;
  venueName?: string;
  venueAddress?: string;
  venueMapUrl?: string;
  contactPhone?: string;
  contactEmail?: string | null;
  capacityLimit?: number | null;
  capacityAlertThresholds?: string;
};

type Route = {
  currency: string;
  primaryProvider: string;
  isEnabled: boolean;
  feePolicy: string;
};

type Price = { currency: string; amountMinor: number };

const CURRENCIES = ["NGN", "USD", "EUR", "GBP"] as const;
const PROVIDERS = ["paystack", "paypal", "manual_transfer"] as const;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [routes, setRoutes] = useState<Route[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          const s = d.settings;
          setSettings({
            eventName: s.eventName,
            theme: s.theme,
            startsAt: s.startsAt ? new Date(s.startsAt).toISOString().slice(0, 16) : "",
            endsAt: s.endsAt ? new Date(s.endsAt).toISOString().slice(0, 16) : "",
            registrationDeadline: s.registrationDeadline
              ? new Date(s.registrationDeadline).toISOString().slice(0, 16)
              : "",
            venueName: s.venueName,
            venueAddress: s.venueAddress,
            venueMapUrl: s.venueMapUrl || "",
            contactPhone: s.contactPhone,
            contactEmail: s.contactEmail || "",
            capacityLimit: s.capacityLimit,
            capacityAlertThresholds: s.capacityAlertThresholds,
          });
        }
        if (d.routes) setRoutes(d.routes);
        if (d.prices) setPrices(d.prices);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load settings." }))
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = (key: keyof Settings, value: any) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const updateRoute = (currency: string, field: keyof Route, value: any) =>
    setRoutes((prev) => {
      const existing = prev.find((r) => r.currency === currency);
      if (existing) {
        return prev.map((r) => (r.currency === currency ? { ...r, [field]: value } : r));
      }
      return [
        ...prev,
        {
          currency,
          primaryProvider: "paystack",
          isEnabled: true,
          feePolicy: "organizer_absorbs",
          [field]: value,
        } as Route,
      ];
    });

  const updatePrice = (currency: string, amountMajor: number) =>
    setPrices((prev) => {
      const existing = prev.find((p) => p.currency === currency);
      const amountMinor = Math.round(amountMajor * 100);
      if (existing) {
        return prev.map((p) => (p.currency === currency ? { ...p, amountMinor } : p));
      }
      return [...prev, { currency, amountMinor }];
    });

  const getPriceMajor = (currency: string) => {
    const p = prices.find((x) => x.currency === currency);
    return p ? p.amountMinor / 100 : 0;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            ...settings,
            capacityLimit: settings.capacityLimit === null || settings.capacityLimit === undefined || settings.capacityLimit === ("" as any)
              ? null
              : Number(settings.capacityLimit),
          },
          routes,
          prices,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMessage({ type: "success", text: "Settings saved successfully." });
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-[8px] bg-[#F3F4F6] border border-transparent focus:border-gray-300 focus:bg-white text-sm focus:outline-none";
  const labelCls = "text-xs font-semibold text-[#111320] block mb-1";

  if (loading) {
    return <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center text-sm text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <header className="h-14 bg-[#0E1020] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-bold text-white text-sm">Admin — Settings</span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#8EE3D6] text-[#0E1020] text-xs font-bold hover:bg-[#7BD4C7] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </header>

      <main className="max-w-[900px] mx-auto px-6 py-10 space-y-8">
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-2 text-sm ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Event Settings */}
        <section className="bg-white rounded-[20px] border border-gray-100 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-[#111320]">Event Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Event Name</label>
              <input className={inputCls} value={settings.eventName || ""} onChange={(e) => updateSetting("eventName", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Theme</label>
              <input className={inputCls} value={settings.theme || ""} onChange={(e) => updateSetting("theme", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Starts At</label>
              <input type="datetime-local" className={inputCls} value={settings.startsAt || ""} onChange={(e) => updateSetting("startsAt", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Ends At</label>
              <input type="datetime-local" className={inputCls} value={settings.endsAt || ""} onChange={(e) => updateSetting("endsAt", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Registration Deadline</label>
              <input type="datetime-local" className={inputCls} value={settings.registrationDeadline || ""} onChange={(e) => updateSetting("registrationDeadline", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Capacity Limit (blank = uncapped)</label>
              <input type="number" className={inputCls} value={settings.capacityLimit ?? ""} onChange={(e) => updateSetting("capacityLimit", e.target.value === "" ? null : Number(e.target.value))} />
            </div>
          </div>
        </section>

        {/* Venue & Contact */}
        <section className="bg-white rounded-[20px] border border-gray-100 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-[#111320]">Venue & Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Venue Name</label>
              <input className={inputCls} value={settings.venueName || ""} onChange={(e) => updateSetting("venueName", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Venue Address</label>
              <input className={inputCls} value={settings.venueAddress || ""} onChange={(e) => updateSetting("venueAddress", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contact Phone</label>
              <input className={inputCls} value={settings.contactPhone || ""} onChange={(e) => updateSetting("contactPhone", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contact Email (optional)</label>
              <input type="email" className={inputCls} value={settings.contactEmail || ""} onChange={(e) => updateSetting("contactEmail", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Venue Map Embed URL</label>
              <input className={inputCls} value={settings.venueMapUrl || ""} onChange={(e) => updateSetting("venueMapUrl", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Prices */}
        <section className="bg-white rounded-[20px] border border-gray-100 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-[#111320]">Registration Prices</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CURRENCIES.map((c) => (
              <div key={c}>
                <label className={labelCls}>{c}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputCls}
                  value={getPriceMajor(c) || ""}
                  onChange={(e) => updatePrice(c, parseFloat(e.target.value) || 0)}
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">Amounts are per attendee, flat rate. Stored in minor units (kobo/cents/pence).</p>
        </section>

        {/* Provider Routing */}
        <section className="bg-white rounded-[20px] border border-gray-100 p-6 sm:p-8 space-y-5">
          <h2 className="text-lg font-bold text-[#111320]">Payment Provider Routing</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-3 pr-4">Currency</th>
                  <th className="pb-3 pr-4">Provider</th>
                  <th className="pb-3 pr-4">Enabled</th>
                  <th className="pb-3">Fee Policy</th>
                </tr>
              </thead>
              <tbody>
                {CURRENCIES.map((c) => {
                  const route = routes.find((r) => r.currency === c) || {
                    currency: c,
                    primaryProvider: c === "NGN" ? "paystack" : "paypal",
                    isEnabled: true,
                    feePolicy: "organizer_absorbs",
                  };
                  return (
                    <tr key={c} className="border-b border-gray-50">
                      <td className="py-3 pr-4 font-bold text-[#111320]">{c}</td>
                      <td className="py-3 pr-4">
                        <select
                          className={inputCls}
                          value={route.primaryProvider}
                          onChange={(e) => updateRoute(c, "primaryProvider", e.target.value)}
                        >
                          {PROVIDERS.map((p) => (
                            <option key={p} value={p}>{p.replace("_", " ")}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          checked={route.isEnabled}
                          onChange={(e) => updateRoute(c, "isEnabled", e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="py-3">
                        <select
                          className={inputCls}
                          value={route.feePolicy}
                          onChange={(e) => updateRoute(c, "feePolicy", e.target.value)}
                        >
                          <option value="organizer_absorbs">Organizer absorbs</option>
                          <option value="pass_to_customer">Pass to customer</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
