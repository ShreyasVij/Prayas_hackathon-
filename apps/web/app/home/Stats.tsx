"use client";

import React from "react";
import { ShieldCheck, Lock, Zap, FileSpreadsheet, KeyRound, DatabaseZap, Clock } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";

export default function Stats() {
  const metrics = [
    { value: "< 3s", label: "Emergency Scan Speed", subtext: "Zero-login offline triage QR" },
    { value: "256-bit", label: "AES Client-Side Encryption", subtext: "Zero-knowledge health storage" },
    { value: "100%", label: "AI Verification Badges", subtext: "Doctor attribution on all claims" },
    { value: "99.99%", label: "Platform Uptime", subtext: "Continuous critical record access" },
  ];

  const pillars = [
    {
      title: "Patient-Owned Cryptographic Keys",
      description: "You hold the keys. Not your hospital, not your insurer, and not our servers. Your medical records are encrypted on-device before sync.",
      icon: KeyRound,
    },
    {
      title: "Zero Dark Patterns & Zero Spam",
      description: "Healthcare is sacred. No intrusive push notifications, gamification, or ad tracking. Pure, calming, distraction-free utility.",
      icon: ShieldCheck,
    },
    {
      title: "Offline-First Emergency Redundancy",
      description: "When cell towers fail in remote accidents, MediLocker NFC tokens and cached QR payloads keep your blood group and allergies readable.",
      icon: Zap,
    },
    {
      title: "Cross-Hospital Lab Normalization",
      description: "Metabolic panels from Dr. Lal PathLabs, Apollo, or Mayo Clinic are unified into consistent, comparable clinical time-series.",
      icon: FileSpreadsheet,
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-700 bg-teal-100/60 border border-teal-200 px-3 py-1 rounded-full">
            Clinical Trust &amp; Integrity
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
            Built on Rigorous Security Standards
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600">
            We operate with the strict conviction that your medical history is the most sensitive data in your life.
          </p>
        </div>

        {/* Stats Counter Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center flex flex-col items-center justify-center"
            >
              <div className="text-3xl sm:text-4xl font-extrabold text-teal-700 tracking-tight">
                {m.value}
              </div>
              <div className="text-sm font-semibold text-zinc-900 mt-2">
                {m.label}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {m.subtext}
              </div>
            </div>
          ))}
        </div>

        {/* 4 Pillars CardSpotlight Grid (Replacing pic2.png) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <CardSpotlight
                key={i}
                className="p-6 sm:p-8 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:border-teal-300 transition-all"
                spotlightColor="rgba(13, 148, 136, 0.08)"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 shrink-0">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-2">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </CardSpotlight>
            );
          })}
        </div>

      </div>
    </section>
  );
}
