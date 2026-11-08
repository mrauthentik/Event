"use client";

import { useEffect, useState } from "react";
import { SITE_CONFIG } from "@/config/site";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
  isEnded: boolean;
}

export function Countdown() {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false,
    isEnded: false,
  });

  useEffect(() => {
    setMounted(true);

    const calculateTime = () => {
      const targetTime = new Date(SITE_CONFIG.startsAt).getTime();
      const endTime = new Date(SITE_CONFIG.endsAt).getTime();
      const now = new Date().getTime();

      if (now >= endTime) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isLive: false,
          isEnded: true,
        };
      }

      if (now >= targetTime) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isLive: true,
          isEnded: false,
        };
      }

      const diff = Math.max(0, targetTime - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      return {
        days,
        hours,
        minutes,
        seconds,
        isLive: false,
        isEnded: false,
      };
    };

    setTimeLeft(calculateTime());
    const interval = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    // Hydration-safe initial placeholder
    return (
      <div className="flex items-center gap-4 text-white opacity-90 py-2">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">--</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-300 font-medium">Days</div>
        </div>
        <span className="text-2xl text-gray-400 font-light">:</span>
        <div className="text-center">
          <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">--</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-300 font-medium">Hours</div>
        </div>
        <span className="text-2xl text-gray-400 font-light">:</span>
        <div className="text-center">
          <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">--</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-300 font-medium">Minutes</div>
        </div>
        <span className="text-2xl text-gray-400 font-light">:</span>
        <div className="text-center">
          <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">--</div>
          <div className="text-[10px] uppercase tracking-widest text-gray-300 font-medium">Seconds</div>
        </div>
      </div>
    );
  }

  if (timeLeft.isEnded) {
    return (
      <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 text-white font-medium text-sm backdrop-blur-sm">
        Conference Concluded • Thank you for attending
      </div>
    );
  }

  if (timeLeft.isLive) {
    return (
      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#8EE3D6] text-[#0E1020] font-bold text-sm tracking-wide animate-pulse">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
        CONFERENCE IS LIVE NOW
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 sm:gap-6 text-white py-2">
      <div className="text-center min-w-[50px] sm:min-w-[60px]">
        <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">
          {String(timeLeft.days).padStart(2, "0")}
        </div>
        <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-gray-300 font-medium mt-1">
          Days
        </div>
      </div>
      <span className="text-2xl text-gray-400/80 font-light -mt-3">:</span>
      <div className="text-center min-w-[50px] sm:min-w-[60px]">
        <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">
          {String(timeLeft.hours).padStart(2, "0")}
        </div>
        <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-gray-300 font-medium mt-1">
          Hours
        </div>
      </div>
      <span className="text-2xl text-gray-400/80 font-light -mt-3">:</span>
      <div className="text-center min-w-[50px] sm:min-w-[60px]">
        <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">
          {String(timeLeft.minutes).padStart(2, "0")}
        </div>
        <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-gray-300 font-medium mt-1">
          Minutes
        </div>
      </div>
      <span className="text-2xl text-gray-400/80 font-light -mt-3">:</span>
      <div className="text-center min-w-[50px] sm:min-w-[60px]">
        <div className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums">
          {String(timeLeft.seconds).padStart(2, "0")}
        </div>
        <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-gray-300 font-medium mt-1">
          Seconds
        </div>
      </div>
    </div>
  );
}

