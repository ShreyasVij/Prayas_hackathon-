"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileImage, Info, Printer, Stethoscope } from "lucide-react";

type ExternalResult = {
  fileName: string;
  analyzedAt: string;
  extracted: {
    patient_name?: string;
    doctor_name?: string;
    diagnosis?: string;
    report_date?: string;
    classification?: string;
    summary?: string;
    raw_text?: string;
    medications?: Array<{ name?: string; dose?: string; frequency?: string }>;
    vitals?: Array<{ label?: string; value?: string | number; unit?: string | null }>;
  };
};

function valueOrFallback(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "Not provided";
}

export default function ExternalDocumentResultPage() {
  const [result, setResult] = useState<ExternalResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("externalDocumentResult");
      if (!stored) {
        setMissing(true);
        return;
      }
      setResult(JSON.parse(stored) as ExternalResult);
      setPreviewUrl(sessionStorage.getItem("externalDocumentPreviewUrl"));
    } catch {
      setMissing(true);
    }
  }, []);

  if (missing) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-20">
        <FileImage className="h-10 w-10 text-zinc-300" />
        <p className="text-sm font-bold text-zinc-700">No document analysis found</p>
        <Link href="/documents" className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white">
          <ArrowLeft className="mr-2 inline h-3.5 w-3.5" /> Back to Documents
        </Link>
      </div>
    );
  }

  if (!result) return <div className="min-h-[400px]" />;
  const extracted = result.extracted || {};
  const fields = [
    ["Patient name", extracted.patient_name],
    ["Attending doctor", extracted.doctor_name],
    ["Diagnosis", extracted.diagnosis],
    ["Report date", extracted.report_date],
    ["Classification", extracted.classification],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-7 py-2">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Link href="/documents" className="font-semibold hover:text-teal-700">Documents</Link>
          <span>/</span><span className="font-bold text-zinc-900">AI Analysis Result</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
            <Printer className="mr-1.5 inline h-3.5 w-3.5" /> Print
          </button>
          <Link href="/documents" className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700">
            <ArrowLeft className="mr-1.5 inline h-3.5 w-3.5" /> Documents
          </Link>
        </div>
      </div>

      <header>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <Stethoscope className="h-3.5 w-3.5" /> External AI document analysis
        </div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">Clinical Document Findings</h1>
        <p className="mt-1 text-xs text-zinc-500">{result.fileName} · {new Date(result.analyzedAt).toLocaleString()}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-md">
            {previewUrl ? <img src={previewUrl} alt="Uploaded clinical document" className="h-full w-full object-contain" /> : <FileImage className="h-12 w-12 text-zinc-600" />}
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-zinc-900">Document details</h2>
            <div className="space-y-3">
              {fields.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2 text-xs last:border-0">
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-right font-semibold text-zinc-800">{valueOrFallback(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-3">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-zinc-900">AI summary</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{valueOrFallback(extracted.summary || extracted.raw_text)}</p>
          </section>
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-zinc-900">Medications</h2>
              {extracted.medications?.length ? <ul className="space-y-2 text-xs text-zinc-700">{extracted.medications.map((item, index) => <li key={index} className="rounded-lg bg-slate-50 p-2">{valueOrFallback(item.name)}{item.dose ? ` · ${item.dose}` : ""}{item.frequency ? ` · ${item.frequency}` : ""}</li>)}</ul> : <p className="text-xs text-zinc-500">No medications provided.</p>}
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-zinc-900">Vitals</h2>
              {extracted.vitals?.length ? <ul className="space-y-2 text-xs text-zinc-700">{extracted.vitals.map((item, index) => <li key={index} className="flex justify-between rounded-lg bg-slate-50 p-2"><span>{valueOrFallback(item.label)}</span><strong>{String(item.value ?? "—")} {item.unit || ""}</strong></li>)}</ul> : <p className="text-xs text-zinc-500">No vitals provided.</p>}
            </div>
          </section>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <span>AI-generated document analysis is intended to assist healthcare professionals and does not replace professional medical diagnosis or clinical judgment.</span>
      </div>
    </div>
  );
}
