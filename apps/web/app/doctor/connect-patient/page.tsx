"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  KeyRound, 
  ShieldCheck, 
  Lock, 
  Layers, 
  ChevronRight, 
  Smartphone, 
  FileCheck2, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { ConnectionCodeSection } from "../components/ConnectionCodeSection";

export default function ConnectPatientPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-zinc-500">
          <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
          <p className="text-xs font-medium">Loading Patient Handshake...</p>
        </div>
      }
    >
      <div className="space-y-8 max-w-4xl mx-auto py-2">
        
        {/* Navigation Breadcrumb & Back Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <Link 
              href="/doctor" 
              className="hover:text-teal-700 transition-colors flex items-center gap-1 font-semibold"
            >
              Doctor Workspace
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-zinc-900 font-bold">Patient Handshake</span>
          </div>

          <Link
            href="/doctor"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-zinc-700 text-xs font-semibold transition-all shadow-xs active:scale-95 self-start sm:self-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Workspace</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/90 shadow-2xs">
            <KeyRound className="h-3.5 w-3.5" />
            <span>Secure Patient Handshake Protocol</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 tracking-tight">
            Connect a Patient
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-2xl">
            Input the 16-character alphanumeric authorization token provided by the patient to decrypt and stream verified medical history, laboratory tests, and clinical imaging.
          </p>
        </div>

        {/* 3-Step Visual Guided Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start gap-3.5">
            <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700 font-black text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-zinc-900">Obtain Patient Key</h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Patient displays 16-char code from their MediLocker app or taps emergency NFC band.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start gap-3.5">
            <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700 font-black text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-zinc-900">Verify Credentials</h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                System validates alphanumeric key signature and grants time-bounded clinical session.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-start gap-3.5">
            <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-700 font-black text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-zinc-900">Access Patient Records</h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Access full vitals, past diagnoses, radiological studies, and medication orders.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Connection Form Component */}
        <section aria-label="16-Digit Handshake Form">
          <ConnectionCodeSection />
        </section>

        {/* Security & Audit Guarantee */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-center gap-3 text-xs text-zinc-500">
          <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0" />
          <span className="leading-relaxed">
            All clinical handshakes are logged with cryptographic timestamps in compliance with MediLocker HIPAA & ABHA zero-trust access standards.
          </span>
        </div>
      </div>
    </Suspense>
  );
}
