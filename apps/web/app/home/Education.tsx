"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Sparkles, ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { AIBadge } from "@/components/ui/ai-badge";

export default function Education() {
  return (
    <section className="py-16 md:py-24 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <CardSpotlight
          className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden"
          spotlightColor="rgba(13, 148, 136, 0.08)"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold uppercase tracking-wider mb-4">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Health Literacy &amp; AI Demystification</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                Demystifying Lab Results Into Human English
              </h2>

              <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-relaxed">
                Medical jargon isolates patients from their own bodies. MediLocker’s clinical translation engine breaks down complex CBCs, metabolic panels, and radiology impressions into zero-jargon, actionable explanations.
              </p>

              <div className="mt-6 flex flex-wrap gap-4 text-sm text-zinc-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>Verified against WHO &amp; NIH reference ranges</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />
                  <span>Strict doctor-in-the-loop attribution badges</span>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition-all"
                >
                  <span>See How It Works in Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right Interactive Mockup (Replacing pic3.png) */}
            <div className="lg:col-span-5">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-inner space-y-4">
                
                {/* Raw Lab snippet */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-zinc-500">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[10px] font-sans font-bold text-zinc-400 uppercase tracking-wider">
                    <span>Raw Lab Input (OCR)</span>
                    <span>Blood Count</span>
                  </div>
                  <div>HGB: 14.2 g/dL [13.0 - 17.0] &bull; NORMAL</div>
                  <div>WBC: 6.8 x10^3/uL [4.5 - 11.0] &bull; NORMAL</div>
                  <div>PLT: 245 x10^3/uL [150 - 450] &bull; NORMAL</div>
                </div>

                {/* Arrow indicator */}
                <div className="flex justify-center text-teal-600">
                  <div className="h-6 w-6 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-xs">
                    &darr;
                  </div>
                </div>

                {/* AI Plain-Language Output */}
                <div className="p-4 rounded-xl bg-white border border-teal-200 shadow-sm relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Plain English Breakdown</span>
                    <AIBadge />
                  </div>
                  <p className="text-xs text-zinc-700 leading-relaxed font-sans">
                    Your complete blood count is in healthy balance. Your body is producing adequate oxygen-carrying red cells and protective white blood cells with no signs of infection or anemia.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </CardSpotlight>

      </div>
    </section>
  );
}