"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileImage, Info, Printer, Stethoscope } from "lucide-react";

type StoredResult = {
  diseaseId: string;
  response: unknown;
  analyzedAt: string;
  fileName: string;
};

function formatLabel(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function findValue(value: unknown, names: string[]): unknown {
  if (!value || typeof value !== "object") return undefined;
  const object = value as Record<string, unknown>;
  for (const name of names) {
    const key = Object.keys(object).find((candidate) => candidate.toLowerCase() === name);
    if (key) return object[key];
  }
  for (const nested of Object.values(object)) {
    const match = findValue(nested, names);
    if (match !== undefined) return match;
  }
  return undefined;
}

function renderValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value, null, 2);
}

export default function DiagnosticResultPage() {
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

  if (notFound) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 py-20 text-zinc-500">
        <FileImage className="h-10 w-10 text-zinc-300" />
        <p className="text-sm font-bold text-zinc-700">No diagnostic result found</p>
        <Link href="/doctor" className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white">
          <ArrowLeft className="mr-2 inline h-3.5 w-3.5" /> Back to Workspace
        </Link>
      </div>
    );
  }

  if (!result) return <div className="min-h-[400px]" />;

  const predictedDisease = findValue(result.response, ["predicted_disease", "prediction", "disease", "label", "class"]);
  const confidence = findValue(result.response, ["confidence", "confidence_score", "probability", "score"]);

  return (
    <div className="mx-auto max-w-5xl space-y-7 py-2">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/doctor" className="font-semibold hover:text-teal-700">Doctor Workspace</Link>
          <span>/</span><span className="font-bold text-zinc-900">AI Prediction Result</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
            <Printer className="mr-1.5 inline h-3.5 w-3.5" /> Print
          </button>
          <Link href="/doctor" className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700">
            <ArrowLeft className="mr-1.5 inline h-3.5 w-3.5" /> New Analysis
          </Link>
        </div>
      </div>

      <header className="space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <Stethoscope className="h-3.5 w-3.5" /> AI-assisted diagnostic report
        </div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">Prediction for {formatLabel(result.diseaseId)}</h1>
        <p className="text-xs text-zinc-500">Image: {result.fileName} · {new Date(result.analyzedAt).toLocaleString()}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-md">
            {previewUrl ? <img src={previewUrl} alt="Analyzed medical image" className="h-full w-full object-contain" /> : <FileImage className="h-12 w-12 text-zinc-600" />}
          </div>
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-800">Predicted disease</p>
            <p className="mt-2 text-xl font-black text-teal-950">{renderValue(predictedDisease)}</p>
            {confidence !== undefined && <p className="mt-2 text-sm font-semibold text-teal-800">Confidence: {renderValue(confidence)}</p>}
          </div>
        </div>

        <section className="space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-zinc-900">Complete prediction response</h2>
            <pre className="max-h-[32rem] overflow-auto rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-zinc-700">{renderValue(result.response)}</pre>
          </div>
        </section>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <span>This AI prediction is for clinical assistance only and does not replace professional medical diagnosis, examination, or treatment decisions.</span>
      </div>
    </div>
  );
}
