"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileImage,
  ChevronRight,
  ClipboardList,
  Clock,
  Activity,
  RefreshCw,
  Printer,
  Stethoscope,
  BarChart2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Re-use the DiagnosticResult interface shape
interface AbnormalityItem {
  label: string;
  probability: number;
  severity: "low" | "medium" | "high";
  location?: string;
}

interface DiagnosticResult {
  scanId: string;
  modality: string;
  status: "completed" | "flagged" | "inconclusive";
  primaryFinding: string;
  confidenceScore: number;
  riskLevel: "Normal / Low" | "Moderate" | "Critical / Immediate Attention";
  abnormalities: AbnormalityItem[];
  clinicalRecommendations: string[];
  analyzedAt: string;
}

function getRiskColors(riskLevel: string) {
  if (riskLevel.includes("Critical")) {
    return {
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      bar: "bg-rose-500",
    };
  }
  if (riskLevel.includes("Moderate")) {
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      bar: "bg-amber-500",
    };
  }
  return {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
  };
}

function getSeverityBadge(severity: "low" | "medium" | "high") {
  switch (severity) {
    case "high":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "medium":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-zinc-600 border-slate-200";
  }
}

export default function DiagnosticResultPage() {
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("diagnosticResult");
      const storedPreview = sessionStorage.getItem("diagnosticPreviewUrl");
      if (stored) {
        setResult(JSON.parse(stored));
      } else {
        setNotFound(true);
      }
      if (storedPreview) {
        setPreviewUrl(storedPreview);
      }
    } catch {
      setNotFound(true);
    }
  }, []);

  if (notFound) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 text-zinc-500 py-20">
        <FileImage className="h-10 w-10 text-zinc-300" />
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-zinc-700">No diagnostic result found</p>
          <p className="text-xs text-zinc-400">Upload and analyze a medical image first.</p>
        </div>
        <Link
          href="/doctor"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-all shadow-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Workspace
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Activity className="h-7 w-7 text-teal-600 animate-spin" />
      </div>
    );
  }

  const riskColors = getRiskColors(result.riskLevel);

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">

      {/* ─── Breadcrumb & Actions ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
          <Link
            href="/doctor"
            className="hover:text-teal-700 transition-colors font-semibold"
          >
            Doctor Workspace
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-900 font-bold">Diagnostic Report</span>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-semibold transition-all shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Report
          </button>
          <Link
            href="/doctor"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-zinc-700 text-xs font-semibold transition-all shadow-xs active:scale-95"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Workspace
          </Link>
        </div>
      </div>

      {/* ─── Report Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/90 shadow-2xs">
            <Stethoscope className="h-3.5 w-3.5" />
            Diagnostic Report
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            {result.modality} Analysis
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5 text-zinc-400" />
              Report ID: <span className="font-mono font-bold text-zinc-700 ml-1">{result.scanId}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              Analyzed at <span className="font-medium text-zinc-700 ml-1">{result.analyzedAt}</span>
            </span>
          </div>
        </div>

        {/* Status & Risk badges */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-2xs",
            riskColors.badge
          )}>
            {result.riskLevel.includes("Normal") ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5" />
            )}
            {result.riskLevel}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs tabular-nums">
            <BarChart2 className="h-3.5 w-3.5" />
            {result.confidenceScore}% confidence
          </span>
        </div>
      </div>

      {/* ─── Main Content Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Image Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 aspect-square flex items-center justify-center shadow-md relative">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={`${result.modality} scan`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-zinc-600">
                <FileImage className="h-10 w-10" />
                <span className="text-xs font-medium">Image preview unavailable</span>
              </div>
            )}
            {/* Modality label */}
            <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-lg bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/60 flex items-center justify-between text-[11px] text-zinc-300 font-medium">
              <span>{result.modality}</span>
              <span className="text-zinc-500 font-mono">{result.scanId}</span>
            </div>
          </div>

          {/* Confidence Indicator */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Diagnostic Confidence</span>
              <span className="text-sm font-black tabular-nums text-teal-700">{result.confidenceScore}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={cn("h-2.5 rounded-full transition-all", riskColors.bar)}
                style={{ width: `${result.confidenceScore}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Confidence reflects the model&apos;s certainty in the primary finding. Clinical correlation is always recommended.
            </p>
          </div>
        </div>

        {/* Right: Findings & Recommendations */}
        <div className="lg:col-span-7 space-y-5">

          {/* Primary Finding */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ClipboardList className="h-4 w-4 text-teal-600 shrink-0" />
              <h2 className="text-sm font-bold text-zinc-900">Primary Finding</h2>
            </div>
            <p className="text-sm text-zinc-700 leading-relaxed font-medium">
              {result.primaryFinding}
            </p>
          </div>

          {/* Detected Features / Abnormalities */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <BarChart2 className="h-4 w-4 text-teal-600 shrink-0" />
              <h2 className="text-sm font-bold text-zinc-900">Detected Features</h2>
            </div>
            <div className="space-y-3">
              {result.abnormalities.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1.5 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-800">{item.label}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                        getSeverityBadge(item.severity)
                      )}>
                        {item.severity}
                      </span>
                    </div>
                    <span className="text-sm font-black tabular-nums text-teal-700 shrink-0">{item.probability}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-teal-500 transition-all"
                      style={{ width: `${item.probability}%` }}
                    />
                  </div>
                  {item.location && (
                    <span className="text-[11px] text-zinc-400">{item.location}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Recommendations */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ChevronRight className="h-4 w-4 text-teal-600 shrink-0" />
              <h2 className="text-sm font-bold text-zinc-900">Recommended Next Actions</h2>
            </div>
            <ul className="space-y-2.5">
              {result.clinicalRecommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs text-zinc-700 leading-relaxed">
                  <div className="h-5 w-5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ─── Disclaimer ─────────────────────────────────────────────── */}
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-start gap-3 text-xs text-zinc-500">
        <Info className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          This report is generated by an automated diagnostic tool and is intended to support — not replace — clinical judgment. All findings should be correlated with patient history, physical examination, and additional investigations as appropriate.
        </span>
      </div>

      {/* ─── Footer Actions ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200/80">
        <Link
          href="/doctor"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-semibold transition-all shadow-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Workspace
        </Link>
        <Link
          href="/doctor"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs"
          onClick={() => {
            sessionStorage.removeItem("diagnosticResult");
            sessionStorage.removeItem("diagnosticPreviewUrl");
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          New Analysis
        </Link>
      </div>

    </div>
  );
}
