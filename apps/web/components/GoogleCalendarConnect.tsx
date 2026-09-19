"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function GoogleCalendarConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function checkConnection() {
      try {
        const res = await fetch("/api/doctor/profile");
        if (res.ok) {
          const data = await res.json();
          setIsConnected(!!data.profile?.googleTokens);
        }
      } catch (error) {
        console.error("Failed to check Google Calendar status:", error);
      } finally {
        setLoading(false);
      }
    }

    checkConnection();

    const calendarConnected = searchParams.get("calendar_connected");
    const calendarError = searchParams.get("calendar_error");

    if (calendarConnected === "true") {
      setIsConnected(true);
      window.history.replaceState({}, "", "/doctor");
    }

    if (calendarError) {
      alert(`Google Calendar connection failed: ${calendarError}`);
      window.history.replaceState({}, "", "/doctor");
    }
  }, [searchParams]);

  const handleConnect = () => {
    window.location.href = "/api/google/connect";
  };

  if (loading || isConnected) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700 shrink-0">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-900">Google Calendar Synchronization</h3>
          <p className="text-xs text-zinc-500">
            Automatically sync incoming patient bookings directly with your personal practice calendar.
          </p>
        </div>
      </div>

      <button
        onClick={handleConnect}
        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
      >
        <span>Connect Calendar</span>
        <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

