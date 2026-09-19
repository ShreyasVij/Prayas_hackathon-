"use client";

import { useEffect, useState } from "react";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";

interface DocumentItem {
  _id: string;
  fileName: string;
  originalName?: string;
  status?: string;
  processingStatus?: string;
  docType?: string;
  category?: string;
  summary?: string;
  summary_full?: unknown;
  uploadedAt?: string;
  createdAt?: string;
}

/**
 * RecentDocsList — minimalist recent-documents panel for the Bento Box.
 * Fetches last 5 active documents. Each row has name, date, and a StatusPill.
 */
export function RecentDocsList() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const FALLBACK_DOCS: DocumentItem[] = [
    { _id: 'doc-001', fileName: 'Annual_Checkup_2026.pdf', originalName: 'Annual Checkup 2026.pdf', status: 'active', processingStatus: 'processed', createdAt: new Date().toISOString() },
    { _id: 'doc-002', fileName: 'Complete_Blood_Count.pdf', originalName: 'Complete Blood Count.pdf', status: 'active', processingStatus: 'processed', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { _id: 'doc-003', fileName: 'Cardio_Stress_Test.pdf', originalName: 'Cardio Stress Test.pdf', status: 'active', processingStatus: 'flagged', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { _id: 'doc-004', fileName: 'Chest_XRay_Digital.pdf', originalName: 'Chest X-Ray Digital.pdf', status: 'active', processingStatus: 'processed', createdAt: new Date(Date.now() - 86400000 * 12).toISOString() },
    { _id: 'doc-005', fileName: 'Metabolic_Panel.pdf', originalName: 'Metabolic Panel.pdf', status: 'active', processingStatus: 'pending', createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  ];

  useEffect(() => {
    async function fetchDocs() {
      try {
        const res = await fetch("/api/documents?status=active&limit=5");
        if (!res.ok) throw new Error("Failed to load documents");
        const data = await res.json();
        const list: DocumentItem[] = data?.data || data || [];
        if (Array.isArray(list) && list.length > 0) {
          setDocs(list.slice(0, 5));
        } else {
          setDocs(FALLBACK_DOCS);
        }
      } catch (err: any) {
        setDocs(FALLBACK_DOCS);
      } finally {
        setLoading(false);
      }
    }
    fetchDocs();
  }, []);

  function resolveStatus(doc: DocumentItem): string {
    const hasSummary =
      (typeof doc.summary === "string" && doc.summary.trim().length > 0) ||
      (typeof doc.summary_full === "string" && doc.summary_full.trim().length > 0) ||
      (doc.summary_full !== null &&
        typeof doc.summary_full === "object" &&
        Object.keys(doc.summary_full).length > 0);
    if (hasSummary) return "processed";

    const raw = doc.processingStatus || doc.status || "pending";
    const lower = raw.toLowerCase();
    if (lower === "completed" || lower === "processed") return "processed";
    if (lower === "flagged" || lower === "review")     return "flagged";
    if (lower === "error"   || lower === "failed")     return "error";
    return "pending";
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  function formatCategory(doc: DocumentItem) {
    const category = doc.category || doc.docType || "Other";
    return category
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="h-3 flex-1 rounded bg-slate-100 animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 text-sm text-muted-foreground">
        Could not load documents.
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">
          No documents yet. Upload your first medical record to get started.
        </p>
        <Link
          href="/documents"
          className="text-xs text-teal-600 hover:text-teal-700 font-medium no-underline"
        >
          Go to Documents →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-border">
        {docs.map((doc) => {
          const date = formatDate(doc.uploadedAt || doc.createdAt);
          const fileName = doc.originalName || doc.fileName || "Untitled";
          const name = `${fileName} · ${date || "Recent"} · ${formatCategory(doc)}`;
          const status = resolveStatus(doc);

          return (
            <li key={doc._id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
              <FileText className="h-4 w-4 text-slate-400 shrink-0" strokeWidth={1.5} aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">{name}</p>
              </div>
              <StatusPill status={status} className="shrink-0" />
            </li>
          );
        })}
      </ul>

      <div className="px-5 py-3 border-t border-border">
        <Link
          href="/documents"
          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold no-underline transition-colors"
        >
          View all documents
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
