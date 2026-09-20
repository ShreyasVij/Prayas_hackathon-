"use client";

import { useEffect, useState } from "react";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";

interface DocumentItem {
  _id?: string;
  id?: string;
  fileName?: string;
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
 * Fetches the latest 5 active documents from the real documents API.
 *
 * Important behavior:
 * - Never uses mock/fallback documents.
 * - Empty API response -> empty state.
 * - API error -> error state.
 */
export function RecentDocsList() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDocs() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          "/api/documents?status=active&limit=5",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!res.ok) {
          throw new Error("Failed to load documents");
        }

        const data = await res.json();

        const list: DocumentItem[] =
          Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];

        if (cancelled) return;

        setDocs(list.slice(0, 5));
      } catch (err) {
        if (cancelled) return;

        console.error(
          "[RecentDocsList] Failed to load documents:",
          err,
        );

        setDocs([]);
        setError("Could not load documents.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDocs();

    return () => {
      cancelled = true;
    };
  }, []);

  function resolveStatus(doc: DocumentItem): string {
    const hasSummary =
      (typeof doc.summary === "string" &&
        doc.summary.trim().length > 0) ||
      (typeof doc.summary_full === "string" &&
        doc.summary_full.trim().length > 0) ||
      (doc.summary_full !== null &&
        typeof doc.summary_full === "object" &&
        Object.keys(doc.summary_full).length > 0);

    if (hasSummary) return "processed";

    const raw =
      doc.processingStatus ||
      doc.status ||
      "pending";

    const lower = raw.toLowerCase();

    if (
      lower === "completed" ||
      lower === "processed"
    ) {
      return "processed";
    }

    if (
      lower === "flagged" ||
      lower === "review"
    ) {
      return "flagged";
    }

    if (
      lower === "error" ||
      lower === "failed"
    ) {
      return "error";
    }

    return "pending";
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return "";

    try {
      const date = new Date(dateStr);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  function formatCategory(doc: DocumentItem) {
    const category =
      doc.category ||
      doc.docType ||
      "Other";

    return category
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3"
          >
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
        <FileText
          className="h-8 w-8 text-slate-300"
          strokeWidth={1.5}
        />

        <p className="text-sm text-muted-foreground">
          Could not load documents.
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

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText
          className="h-8 w-8 text-slate-300"
          strokeWidth={1.5}
        />

        <div>
          <p className="text-sm font-medium text-zinc-700">
            No recent uploads
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Your uploaded medical documents will appear here.
          </p>
        </div>

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
        {docs.map((doc, index) => {
          const date = formatDate(
            doc.uploadedAt || doc.createdAt,
          );

          const fileName =
            doc.originalName ||
            doc.fileName ||
            "Untitled";

          const name = `${fileName} · ${
            date || "Recent"
          } · ${formatCategory(doc)}`;

          const status = resolveStatus(doc);

          const key =
            doc._id ||
            doc.id ||
            `${fileName}-${index}`;

          return (
            <li
              key={key}
              className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <FileText
                className="h-4 w-4 text-slate-400 shrink-0"
                strokeWidth={1.5}
                aria-hidden
              />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 truncate">
                  {name}
                </p>
              </div>

              <StatusPill
                status={status}
                className="shrink-0"
              />
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