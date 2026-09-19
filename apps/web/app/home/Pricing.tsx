"use client";

import React from "react";
import Link from "next/link";
import { Check, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";

export default function Pricing() {
  const plans = [
    {
      name: "Individual Vault",
      badge: "Most Popular",
      price: "₹300",
      period: "/ month",
      storage: "250 GB Cloud Storage",
      desc: "For individuals managing prescriptions, blood tests, and life-critical emergency access.",
      features: [
        "Instant Offline Emergency QR & NFC",
        "Unlimited PDF/Image OCR Extraction",
        "AI Health Brief & Doctor Attribution Badges",
        "Longitudinal Vitals & Tremor Trend Charts",
        "Zero-Knowledge Client-Side Encryption",
      ],
      ctaText: "Start Free Trial",
      href: "/auth",
      highlighted: true,
    },
    {
      name: "Family Care Pack",
      badge: "Best Value &bull; 5 Profiles",
      price: "₹250",
      period: "/ member / month",
      storage: "1 TB Shared Storage",
      desc: "Comprehensive health vault for couples, children, and elderly parents in one unified hub.",
      features: [
        "Up to 5 Compartmentalized Profiles",
        "Granular Guardian & Caregiver Delegation",
        "Emergency Broadcast Alerts to Guardians",
        "Pediatric & Geriatric Metric Normalization",
        "Priority OCR Processing Pipeline",
      ],
      ctaText: "Setup Family Vault",
      href: "/auth",
      highlighted: false,
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-white border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            Transparent Pricing
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
            Clear, Predictable Health Security
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600">
            No hidden tiers, no surge fees, and no monetizing patient records. Simple, ethical subscriptions.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, idx) => (
            <CardSpotlight
              key={idx}
              className={`p-8 rounded-3xl transition-all duration-300 flex flex-col justify-between ${
                plan.highlighted
                  ? "border-2 border-teal-600 bg-white shadow-xl shadow-teal-600/5 relative"
                  : "border border-slate-200 bg-slate-50/50"
              }`}
              spotlightColor={plan.highlighted ? "rgba(13, 148, 136, 0.12)" : "rgba(13, 148, 136, 0.05)"}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200">
                    {plan.badge}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 bg-slate-100 px-3 py-1 rounded-full">
                    {plan.storage}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-zinc-900">
                  {plan.name}
                </h3>
                <p className="text-sm text-zinc-600 mt-2 min-h-[40px]">
                  {plan.desc}
                </p>

                <div className="mt-6 mb-6 flex items-baseline gap-1">
                  <span className="text-4xl sm:text-5xl font-extrabold text-zinc-900 tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-zinc-500 font-medium">
                    {plan.period}
                  </span>
                </div>

                {/* Features List */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2.5 text-sm text-zinc-700">
                      <div className="h-5 w-5 rounded-full bg-teal-100/70 text-teal-700 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 stroke-[2.5]" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4">
                <Link
                  href={plan.href}
                  className={`w-full py-3.5 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    plan.highlighted
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20"
                      : "bg-white hover:bg-slate-100 text-zinc-900 border border-slate-300 shadow-sm"
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardSpotlight>
          ))}
        </div>

      </div>
    </section>
  );
}