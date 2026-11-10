"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { Users, Copy, CheckCircle2, Clock, ExternalLink, Ticket } from "lucide-react";

type Seat = {
  inviteCode: string;
  isClaimed: boolean;
  claimedAt: string | null;
  inviteUrl: string;
  attendee: { id: string; name: string; phone: string; refCode: string; status: string } | null;
};

type DashboardData = {
  group: { id: string; name: string; leaderName: string; totalSeats: number; claimedSeats: number };
  order: { reference: string; status: string; currency: string; ticketUrl: string } | null;
  seats: Seat[];
};

export default function GroupDashboardPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/group/dashboard/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, [token]);

  const copyLink = (url: string, code: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <Header />

      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="max-w-[900px] mx-auto space-y-6">
          {loading && <div className="text-center text-sm text-gray-500 py-20">Loading group dashboard...</div>}
          {error && <div className="text-center text-sm text-red-600 py-20">{error}</div>}

          {data && (
            <>
              {/* Header Card */}
              <div className="bg-[#0E1020] text-white rounded-[24px] p-8 space-y-3">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-[#8EE3D6]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#8EE3D6]">Group Leader Dashboard</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black">{data.group.name}</h1>
                <p className="text-sm text-gray-300">Leader: {data.group.leaderName}</p>
                <div className="flex flex-wrap gap-6 pt-2 text-sm">
                  <div>
                    <span className="text-gray-400">Seats:</span>{" "}
                    <strong>{data.group.claimedSeats} / {data.group.totalSeats} claimed</strong>
                  </div>
                  {data.order && (
                    <div>
                      <span className="text-gray-400">Order:</span>{" "}
                      <span className="font-mono">{data.order.reference}</span>{" "}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{data.order.status}</span>
                    </div>
                  )}
                </div>
                {data.order?.status === "paid" && (
                  <Link
                    href={data.order.ticketUrl}
                    className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-full bg-[#8EE3D6] text-[#0E1020] text-xs font-bold hover:bg-[#7BD4C7] transition-colors"
                  >
                    <Ticket className="w-4 h-4" /> View All Tickets
                  </Link>
                )}
              </div>

              {/* Seats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.seats.map((seat, idx) => (
                  <div
                    key={seat.inviteCode}
                    className="bg-white rounded-[18px] border border-gray-100 p-5 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Seat {idx + 1}
                      </span>
                      {seat.isClaimed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600">
                          <Clock className="w-3.5 h-3.5" /> Open
                        </span>
                      )}
                    </div>

                    {seat.isClaimed && seat.attendee ? (
                      <div className="space-y-1">
                        <div className="font-bold text-[#111320] text-sm">{seat.attendee.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{seat.attendee.refCode}</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500">Share this invite link with a member:</div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-[11px] font-mono bg-[#F3F4F6] px-2.5 py-1.5 rounded-lg truncate">
                            {seat.inviteUrl}
                          </code>
                          <button
                            onClick={() => copyLink(seat.inviteUrl, seat.inviteCode)}
                            className="p-2 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors cursor-pointer"
                            title="Copy invite link"
                          >
                            {copied === seat.inviteCode ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                          <a
                            href={seat.inviteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors"
                            title="Open invite page"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-600" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
