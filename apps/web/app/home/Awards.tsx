"use client";

import React from "react";
import { QrCode, FileCheck, Users, ShieldAlert, Cpu, HeartPulse, CheckCircle2 } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";

export default function Awards() {
  const highlights = [
    {
      title: "Instant Emergency QR & NFC",
      desc: "Paramedics and triage nurses access critical allergies, blood group, and emergency contacts offline within 3 seconds.",
      icon: QrCode,
      tag: "Life-Critical",
      tagColor: "text-rose-700 bg-rose-50 border-rose-200",
    },
    {
      title: "Automated OCR & Vital Normalization",
      desc: "Scanned lab PDFs and prescriptions are automatically extracted, standardized, and translated into non-jargon insights.",
      icon: Cpu,
      tag: "AI Powered",
      tagColor: "text-teal-700 bg-teal-50 border-teal-200",
    },
    {
      title: "Zero-Knowledge Family Sharing",
      desc: "Grant time-limited or read-only access to elder guardians, pediatricians, or emergency contacts with one click.",
      icon: Users,
      tag: "Privacy First",
      tagColor: "text-indigo-700 bg-indigo-50 border-indigo-200",
    },
    {
      title: "Longitudinal Vitals Intelligence",
      desc: "Continuous trend detection across lab reports over months and years. Catch emerging metabolic fluctuations early.",
      icon: HeartPulse,
      tag: "Clinical Grade",
      tagColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white border-y border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200/80 px-3 py-1 rounded-full">
            Clinical Interoperability
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
            Engineered for High-Stakes Healthcare
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-relaxed">
            Eliminating fragmented patient portals and unreadable fax scans. MediLocker bridges clinical rigor with modern consumer simplicity.
          </p>
        </div>

        {/* 2x2 High-End CardSpotlight Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <CardSpotlight
                key={idx}
                className="p-7 bg-slate-50/70 border border-slate-200/90 rounded-2xl hover:border-teal-300/80 transition-all duration-300"
                spotlightColor="rgba(13, 148, 136, 0.09)"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-teal-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${item.tagColor}`}>
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-zinc-900 mb-2.5">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed mb-4">
                  {item.desc}
                </p>

                <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  <span>Clinical standard compliant</span>
                </div>
              </CardSpotlight>
            );
          })}
        </div>

      </div>
    </section>
  );
}
