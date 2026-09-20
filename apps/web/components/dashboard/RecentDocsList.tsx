"use client";

import { useEffect, useState } from "react";
import { FileText, Activity, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

interface DocItem {
  id: string;
  name: string;
  date?: string;
  status: "processed" | "pending" | "flagged" | "error";
  category: string;
  href: string;
}

const STATUS_STYLES = {
  processed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:   "bg-amber-50  text-amber-700  border-amber-200",
  flagged:   "bg-orange-50 text-orange-700 border-orange-200",
  error:     "bg-rose-50   text-rose-700   border-rose-200",
};

const STATUS_LABELS = {
  processed: "Verified",
  pending:   "Pending",
  flagged:   "Flagged",
  error:     "Error",
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

/**
 * RecentDocsList — recent-documents panel for the Bento Box.
 * Combines latest Supabase AI scans and MongoDB medical documents.
 */
export function RecentDocsList() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDocs() {
      setLoading(true);
      setError(null);
      const results: DocItem[] = [];

      // 1. Fetch Supabase-backed medical scans (AI diagnostics)
      try {
        const res = await fetch("/api/patient/diagnostics", {
          method: "GET",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const records: any[] = data?.records || [];
          for (const rec of records.slice(0, 5)) {
            const aiPred = rec.ai_prediction;
            const prediction =
              (typeof aiPred?.primary_prediction === "string" ? aiPred.primary_prediction : null) ||
              (typeof aiPred?.prediction === "string" ? aiPred.prediction : null) ||
              null;
            const status: DocItem["status"] =
              rec.status === "verified" ? "processed" :
              rec.status === "pending"  ? "pending"   : "flagged";
            results.push({
              id: rec.id,
              name: prediction
                ? `${(rec.disease_id || "Scan").replace(/_/g, " ")} · ${prediction}`
                : (rec.disease_id || "Medical Scan").replace(/_/g, " "),
              date: rec.created_at,
              status,
              category: "AI Scan",
              href: "/documents",
            });
          }
        }
      } catch {
        /* non-fatal fallback */
      }

      // 2. Fetch MongoDB documents (uploaded PDFs / reports)
      try {
        const res = await fetch("/api/documents?status=active&limit=5", {
          method: "GET",
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          const list: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
          for (const doc of list.slice(0, 5)) {
            const hasSummary =
              (typeof doc.summary === "string" && doc.summary.trim().length > 0) ||
              (doc.summary_full && typeof doc.summary_full === "object" && Object.keys(doc.summary_full).length > 0);
            const rawStatus = (doc.processingStatus || doc.status || "pending").toLowerCase();
            const status: DocItem["status"] =
              hasSummary || rawStatus === "processed" || rawStatus === "completed" ? "processed" :
              rawStatus === "flagged" || rawStatus === "review" ? "flagged" :
              rawStatus === "error" || rawStatus === "failed" ? "error" : "pending";
            results.push({
              id: doc.id || doc._id || Math.random().toString(),
              name: doc.originalName || doc.fileName || "Untitled Document",
              date: doc.createdAt || doc.uploadedAt,
              status,
              category: (doc.docType || doc.category || "Document").replace(/[-_]+/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
              href: "/documents",
            });
          }
        }
      } catch (err) {
        console.error("[RecentDocsList] Error loading docs:", err);
      }

      if (cancelled) return;

      // Sort by date desc, take 5
      results.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setDocs(results.slice(0, 5));
      setLoading(false);
    }

    fetchDocs();

    return () => {
      cancelled = true;
    };
  }, []);

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
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <FileText className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">Could not load documents.</p>
        <Link href="/documents" className="text-xs text-teal-600 hover:text-teal-700 font-medium no-underline">
          Go to Documents →
        </Link>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-medium text-zinc-700">No recent uploads</p>
          <p className="mt-1 text-xs text-muted-foreground">Your uploaded medical documents and scans will appear here.</p>
        </div>
        <Link href="/documents" className="text-xs text-teal-600 hover:text-teal-700 font-medium no-underline">
          Go to Documents →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-border">
        {docs.map((doc) => (
          <li key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
            {doc.category === "AI Scan"
              ? <Activity className="h-4 w-4 text-teal-500 shrink-0" strokeWidth={1.5} aria-hidden />
              : <FileText className="h-4 w-4 text-slate-400 shrink-0" strokeWidth={1.5} aria-hidden />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-800 truncate capitalize">{doc.name}</p>
              {doc.date && (
                <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDate(doc.date)} · {doc.category}
                </p>
              )}
            </div>
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[doc.status]}`}>
              {STATUS_LABELS[doc.status]}
            </span>
          </li>
        ))}
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