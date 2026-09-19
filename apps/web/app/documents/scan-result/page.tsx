"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  FileImage,
  Info,
  Printer,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StoredResult = {
  diseaseId: string;
  response: unknown;
  analyzedAt: string;
  fileName: string;
};

type Prediction = { label: string; score: number };

function formatLabel(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function findValue(value: unknown, names: string[]): unknown {
  if (!value || typeof value !== "object") return undefined;
  const object = value as Record<string, unknown>;
  const key = Object.keys(object).find((candidate) =>
    names.includes(candidate.toLowerCase()),
  );
  if (key) return object[key];
  for (const nested of Object.values(object)) {
    const match = findValue(nested, names);
    if (match !== undefined) return match;
  }
  return undefined;
}

function toPercentage(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value <= 1 ? value * 100 : value));
}

function scoreText(score: number) {
  return `${score.toFixed(2)}%`;
}

function extractPredictions(value: unknown): Prediction[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const object = item as Record<string, unknown>;
      const label = object.label ?? object.name ?? object.class ?? object.disease ?? object.prediction;
      const rawScore = object.score ?? object.confidence ?? object.probability ?? object.value;
      const score = toPercentage(rawScore);
      return typeof label === "string" && score !== null ? { label, score } : null;
    })
    .filter((item): item is Prediction => item !== null)
    .sort((a, b) => b.score - a.score);
}

export default function DocumentScanResultPage() {
  const [result, setResult] = useState<StoredResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("diagnosticResult");
      if (!stored) {
        setNotFound(true);
        return;
      }
      setResult(JSON.parse(stored) as StoredResult);
      setPreviewUrl(sessionStorage.getItem("diagnosticPreviewUrl"));
    } catch {
      setNotFound(true);
    }
  }, []);

  const view = useMemo(() => {
    if (!result) return null;
    const response = result.response;
    const prediction = findValue(response, ["prediction", "predicted_disease", "predicted_label", "label", "class"]);
    const confidence = toPercentage(findValue(response, ["confidence", "confidence_score", "probability", "score"]));
    const modality = findValue(response, ["modality", "image_type", "imaging_type", "scan_type"]);
    const allPredictions = extractPredictions(findValue(response, ["all_predictions", "predictions", "class_probabilities"]));
    return {
      prediction: typeof prediction === "string" ? prediction : null,
      confidence,
      modality: typeof modality === "string" ? modality : null,
      allPredictions,
    };
  }, [result]);

  if (notFound) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-20 text-zinc-500">
        <FileImage className="h-10 w-10 text-zinc-300" />
        <p className="text-sm font-bold text-zinc-700">No diagnostic scan result found</p>
        <Link href="/documents" className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white">
          <ArrowLeft className="mr-2 inline h-3.5 w-3.5" /> Back to Documents
        </Link>
      </div>
    );
  }

  if (!result || !view) return <div className="min-h-[400px]" />;

  const primaryLabel = view.prediction ? formatLabel(view.prediction) : "Prediction unavailable";
  const isPositive = view.prediction?.toLowerCase() !== "normal" && view.prediction?.toLowerCase() !== "negative";

  return (
    <div className="mx-auto max-w-6xl space-y-7 py-2">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/documents" className="font-semibold hover:text-teal-700">Documents</Link>
          <span>/</span><span className="font-bold text-zinc-900">AI Scan Diagnostic Result</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
            <Printer className="mr-1.5 inline h-3.5 w-3.5" /> Print
          </button>
          <Link href="/documents" className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700">
            <ArrowLeft className="mr-1.5 inline h-3.5 w-3.5" /> Back to Documents
          </Link>
        </div>
      </div>

      <header className="space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <Stethoscope className="h-3.5 w-3.5" /> AI-assisted medical scan analysis
        </div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">{formatLabel(result.diseaseId)} Detection</h1>
        <p className="text-xs text-zinc-500">Image: {result.fileName} · {new Date(result.analyzedAt).toLocaleString()}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-5">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-md">
            {previewUrl ? <img src={previewUrl} alt="Analyzed medical image" className="h-full w-full object-contain" /> : <FileImage className="h-12 w-12 text-zinc-600" />}
            <span className="absolute bottom-3 left-3 rounded-lg bg-zinc-900/80 px-3 py-1.5 text-[11px] font-semibold text-zinc-200">
              {view.modality ? formatLabel(view.modality) : "Medical image"}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Model confidence</span>
              <Activity className="h-4 w-4 text-teal-600" />
            </div>
            {view.confidence !== null ? (
              <>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black tabular-nums text-teal-700">{scoreText(view.confidence)}</span>
                  <span className="pb-1 text-xs text-zinc-400">confidence score</span>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${view.confidence}%` }} />
                </div>
              </>
            ) : <p className="text-sm text-zinc-500">Confidence was not provided by the prediction service.</p>}
          </div>
        </div>

        <div className="space-y-5 lg:col-span-7">
          <div className={cn("rounded-2xl border p-6 shadow-sm", isPositive ? "border-amber-200 bg-amber-50/70" : "border-emerald-200 bg-emerald-50/70")}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={cn("text-xs font-bold uppercase tracking-wider", isPositive ? "text-amber-800" : "text-emerald-800")}>Primary prediction</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">{primaryLabel}</h2>
              </div>
              {isPositive ? <ShieldAlert className="h-9 w-9 text-amber-600" /> : <CheckCircle2 className="h-9 w-9 text-emerald-600" />}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-zinc-600">
              This is a model-generated result for clinical review. It should be interpreted alongside patient history and professional assessment.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-900">All predictions</h2>
                <p className="mt-1 text-xs text-zinc-500">Relative model scores across detected classes</p>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-zinc-600">{view.allPredictions.length} classes</span>
            </div>
            {view.allPredictions.length > 0 ? (
              <div className="space-y-4">
                {view.allPredictions.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-zinc-700">{formatLabel(item.label)}</span>
                      <span className="font-bold tabular-nums text-teal-700">{scoreText(item.score)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={cn("h-full rounded-full", item.label.toLowerCase() === view.prediction?.toLowerCase() ? "bg-teal-600" : "bg-teal-300")} style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="rounded-xl bg-slate-50 p-4 text-xs text-zinc-500">Detailed class scores were not provided by the prediction service.</p>}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <span>AI-generated predictions are intended to assist healthcare professionals and do not replace professional medical diagnosis, examination, or treatment decisions.</span>
      </div>
    </div>
  );
}
