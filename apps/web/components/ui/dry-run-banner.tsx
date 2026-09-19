"use client";

import { FlaskConical, X } from "lucide-react";
import { useState } from "react";

/**
 * DryRunBanner — visible only when NEXT_PUBLIC_DRY_RUN=true.
 * Warns the user they're in mock data mode. Dismissible per session.
 */
export function DryRunBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (process.env.NEXT_PUBLIC_DRY_RUN !== 'true') return null;
  if (dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 mb-4 text-amber-800"
    >
      <div className="flex items-center gap-2 text-sm">
        <FlaskConical className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <span>
          <span className="font-semibold">Dry Run Mode</span>
          {" — "}All data shown is mock. No backend calls are made. Set{" "}
          <code className="rounded bg-amber-100 px-1 font-mono text-xs">NEXT_PUBLIC_DRY_RUN=false</code>
          {" "}to restore live connections.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 hover:bg-amber-100 transition-colors"
        aria-label="Dismiss dry run banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
