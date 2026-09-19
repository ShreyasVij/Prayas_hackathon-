"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ShieldCheck, QrCode, Activity, Sparkles, FileText, Lock, ChevronRight } from "lucide-react";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { AIBadge } from "@/components/ui/ai-badge";

export default function Hero({ isAuthed }: { isAuthed: boolean }) {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24">
      <HeroHighlight className="w-full">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Trust Pill */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold tracking-wide mb-6 shadow-sm"
          >
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <span>Next-Gen Healthtech &bull; Clinical Trust Architecture</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          </motion.div>

          {/* Main Headline with HeroHighlight motion */}
          <motion.h1
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: [20, -5, 0],
            }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0.0, 0.2, 1],
            }}
            className="text-3xl px-4 sm:text-5xl md:text-6xl font-bold text-neutral-800 dark:text-white max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto tracking-tight"
          >
            Your Health Records, Everything in One Place.{" "}
            <Highlight className="text-zinc-950 dark:text-white">
              Your Absolute Control.
            </Highlight>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed"
          >
            Transform scattered lab reports and prescriptions into verified clinical intelligence. 
            Instant emergency QR access, longitudinal vitals analysis, and doctor-grade AI summaries.
          </motion.p>

          {/* CTA Group */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3.5"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:shadow-teal-600/20 transition-all duration-200"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/emergency/nfc"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-sm shadow-sm hover:border-rose-300 transition-all duration-200"
            >
              <QrCode className="h-4 w-4 text-rose-600" />
              <span>Emergency QR &amp; NFC Demo</span>
            </Link>

            <Link
              href="/documents"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-zinc-700 font-medium text-sm transition-all duration-200"
            >
              <FileText className="h-4 w-4 text-zinc-500" />
              <span>Upload Records</span>
            </Link>
          </motion.div>

          {/* Live Bento Interactive Demonstration Mockup (Replacing old static home.png) */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-14 max-w-5xl mx-auto"
          >
            <CardSpotlight className="p-6 md:p-8 bg-white/90 backdrop-blur border border-slate-200/90 shadow-2xl rounded-3xl text-left" spotlightColor="rgba(13, 148, 136, 0.08)">
              {/* Window Bar */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs font-mono text-zinc-400">medilocker.app/dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
                  <span>Clinical Trust V2 Active</span>
                </div>
              </div>

              {/* Bento Preview Grid */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Mini Hero Status */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Live AI Health Brief</span>
                      <AIBadge />
                    </div>
                    <p className="text-zinc-800 font-medium text-sm leading-relaxed">
                      Cardiovascular biomarkers show healthy recovery. Resting heart rate is stable at <span className="font-bold text-teal-700">72 bpm</span> with blood pressure well within optimal limits (<span className="font-bold text-teal-700">118/76 mmHg</span>). Fasting blood glucose improved by 7% post dietary adjustment.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-teal-600" /> Zero-knowledge encrypted</span>
                    <span className="text-teal-600 font-semibold">Updated 2h ago</span>
                  </div>
                </div>

                {/* Mini Emergency QR */}
                <div className="p-5 rounded-2xl bg-white border border-rose-200 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden">
                  <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-rose-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600">Offline Triage</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">LIVE</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-rose-100 my-1">
                    <svg className="w-24 h-24 text-rose-600" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="10" y="10" width="25" height="25" fill="#e11d48"/>
                      <rect x="65" y="10" width="25" height="25" fill="#e11d48"/>
                      <rect x="10" y="65" width="25" height="25" fill="#e11d48"/>
                      <rect x="15" y="15" width="15" height="15" fill="white"/>
                      <rect x="70" y="15" width="15" height="15" fill="white"/>
                      <rect x="15" y="70" width="15" height="15" fill="white"/>
                      <rect x="18" y="18" width="9" height="9" fill="#e11d48"/>
                      <rect x="73" y="18" width="9" height="9" fill="#e11d48"/>
                      <rect x="18" y="73" width="9" height="9" fill="#e11d48"/>
                      <rect x="42" y="15" width="10" height="10" fill="#0f172a"/>
                      <rect x="42" y="35" width="10" height="10" fill="#0f172a"/>
                      <rect x="42" y="55" width="10" height="10" fill="#0f172a"/>
                      <rect x="42" y="75" width="10" height="10" fill="#0f172a"/>
                      <rect x="25" y="45" width="10" height="10" fill="#0f172a"/>
                      <rect x="65" y="45" width="10" height="10" fill="#0f172a"/>
                      <rect x="65" y="65" width="15" height="15" fill="#e11d48"/>
                      <rect x="65" y="85" width="25" height="5" fill="#0f172a"/>
                    </svg>
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-900 mt-1">EMERGENCY ACCESS</p>
                  <p className="text-[10px] text-zinc-500">Scan for Blood Type, Allergies &amp; ER Contacts</p>
                </div>

                {/* Mini Vitals Pulse */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Vitals Pulse</span>
                    <Activity className="h-4 w-4 text-teal-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-900">72 <span className="text-xs font-normal text-zinc-500">bpm</span></div>
                    <div className="text-xs text-emerald-600 font-semibold mt-0.5">&darr; 4 bpm vs last month &bull; Optimal</div>
                  </div>
                  <div className="h-10 mt-3 flex items-end gap-1.5">
                    {[40, 65, 55, 80, 60, 75, 70, 85, 72].map((val, idx) => (
                      <div
                        key={idx}
                        className="flex-1 rounded-t bg-teal-500/80 hover:bg-teal-600 transition-all"
                        style={{ height: `${val}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Mini Documents Status */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Verified Health Documents</span>
                    <span className="text-xs text-zinc-400">5 records synced</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: "Annual_Checkup_2026.pdf", type: "General Lab", status: "PROCESSED", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                      { name: "Cardiology_Stress_Test.pdf", type: "Specialist", status: "FLAGGED", color: "bg-amber-50 text-amber-700 border-amber-200" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-teal-600" />
                          <span className="font-semibold text-zinc-800">{item.name}</span>
                          <span className="text-zinc-400 hidden sm:inline">&bull; {item.type}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.color}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </CardSpotlight>
          </motion.div>

        </div>
      </HeroHighlight>
    </section>
  );
}
