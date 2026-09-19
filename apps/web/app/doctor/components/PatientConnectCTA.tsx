"use client";

import React from "react";
import Link from "next/link";
import { KeyRound, ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";

export function PatientConnectCTA() {
  return (
    <div className="bg-gradient-to-br from-white via-teal-50/30 to-emerald-50/20 border border-teal-200/90 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-11 w-11 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="h-5 w-5" />
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100/70 text-teal-800 border border-teal-200">
            Dedicated Flow
          </span>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
            Patient Handshake & Connection
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Establish a secure, encrypted clinical session with a patient using their 16-digit authorization token or emergency NFC band.
          </p>
        </div>

        <div className="p-3.5 bg-white/90 border border-teal-100 rounded-xl space-y-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-zinc-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">End-to-end encrypted medical vault stream</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-700">
            <Lock className="h-4 w-4 text-teal-600 shrink-0" />
            <span className="font-medium">Supports temporary emergency & telehealth tokens</span>
          </div>
        </div>
      </div>

      <div className="pt-6">
        <Link
          href="/doctor/connect-patient"
          className="w-full py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all duration-150 bg-teal-600 hover:bg-teal-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          <span>Connect a Patient</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
