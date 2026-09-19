"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Copy, CheckCircle2, AlertCircle, KeyRound, Stethoscope, Loader2 } from "lucide-react";

export default function DoctorCodeDisplay() {
  const supabase = createClient();
  const [doctorCode, setDoctorCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDoctorCode() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/doctor/profile");
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const errorMessage = errorData.error || "Failed to fetch doctor profile";
          const errorDetails = errorData.details ? ` - ${errorData.details}` : "";
          console.error(`Doctor profile error (${res.status}):`, errorMessage, errorDetails);
          throw new Error(`${errorMessage}${errorDetails}`);
        }
        
        const data = await res.json();
        
        if (data.doctor?.doctorCode) {
          setDoctorCode(data.doctor.doctorCode);
        } else if (data.profile?.doctorCode) {
          setDoctorCode(data.profile.doctorCode);
        } else {
          setDoctorCode(null);
        }
      } catch (err) {
        setDoctorCode(null);
      } finally {
        setLoading(false);
      }
    }
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        fetchDoctorCode();
      } else {
        setDoctorCode(null);
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleCopy = () => {
    if (doctorCode) {
      navigator.clipboard.writeText(doctorCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-teal-50/50 via-slate-50 to-white border border-slate-200/80 rounded-2xl p-6 shadow-xs animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-teal-100/60 shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-44 bg-slate-200 rounded-md" />
              <div className="h-3 w-72 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="h-11 w-48 bg-slate-200/70 rounded-xl shrink-0" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs flex items-center gap-2.5 text-amber-800">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="text-xs font-medium">{error}</span>
      </div>
    );
  }

  const effectiveCode = doctorCode || "NOT ASSIGNED";

  return (
    <div className="bg-gradient-to-r from-teal-50/90 via-emerald-50/40 to-white border border-teal-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-teal-100/80 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Unique Provider Access Code
              </h3>
            </div>
            <p className="text-xs text-zinc-500 max-w-lg leading-relaxed">
              Share this code with patients to permit appointment bookings and direct document vault sharing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
          <div className="px-4 py-2.5 bg-white rounded-xl border border-teal-200/90 shadow-xs">
            <span className={`text-xl sm:text-2xl font-mono font-black tracking-widest tabular-nums ${doctorCode ? 'text-teal-700' : 'text-zinc-400'}`}>
              {effectiveCode}
            </span>
          </div>
          {doctorCode && (
            <button
              onClick={handleCopy}
              className="p-2.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl transition-all shadow-xs hover:shadow text-zinc-600 hover:text-teal-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              title="Copy provider code"
            >
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

