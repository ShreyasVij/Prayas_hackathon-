"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIBadgeProps {
  className?: string;
  compact?: boolean;
}

/**
 * AIBadge — Reusable attribution badge for any AI-generated claim.
 * Use anywhere the AI makes a health assertion.
 * `compact` variant is icon-only for tight spaces.
 */
export function AIBadge({ className, compact = false }: AIBadgeProps) {
  return (
    <div
      className={cn(
        "ai-badge-shimmer relative inline-flex items-center gap-1.5 overflow-hidden",
        "rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1",
        "text-teal-700 select-none",
        className
      )}
      role="note"
      aria-label="AI generated content — verify with your doctor"
    >
      <Sparkles
        className="h-3 w-3 text-teal-600 shrink-0"
        strokeWidth={2}
        aria-hidden="true"
      />
      {!compact && (
        <span className="text-[10px] font-semibold tracking-wide uppercase whitespace-nowrap">
          AI Generated — Verify with Doctor
        </span>
      )}
    </div>
  );
}
