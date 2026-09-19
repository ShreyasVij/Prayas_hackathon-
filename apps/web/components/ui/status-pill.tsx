import { cn } from "@/lib/utils";

type StatusVariant = "processed" | "flagged" | "pending" | "error" | "normal" | "warning" | "alert";

const variantMap: Record<StatusVariant, string> = {
  processed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  normal:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  flagged:   "bg-amber-50  text-amber-700  border-amber-200",
  warning:   "bg-amber-50  text-amber-700  border-amber-200",
  pending:   "bg-slate-100 text-slate-600  border-slate-200",
  error:     "bg-rose-50   text-rose-700   border-rose-200",
  alert:     "bg-rose-50   text-rose-700   border-rose-200",
};

const dotMap: Record<StatusVariant, string> = {
  processed: "bg-emerald-500",
  normal:    "bg-emerald-500",
  flagged:   "bg-amber-500",
  warning:   "bg-amber-500",
  pending:   "bg-slate-400",
  error:     "bg-rose-500",
  alert:     "bg-rose-500",
};

interface StatusPillProps {
  status: StatusVariant | string;
  className?: string;
}

/**
 * StatusPill — semantic status chip with coloured dot and border.
 * Covers: processed, flagged, pending, error (and legacy: normal, warning, alert).
 */
export function StatusPill({ status, className }: StatusPillProps) {
  const key = status?.toLowerCase() as StatusVariant;
  const variantClass = variantMap[key] ?? "bg-slate-100 text-slate-600 border-slate-200";
  const dotClass    = dotMap[key]     ?? "bg-slate-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        variantClass,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} aria-hidden="true" />
      {status}
    </span>
  );
}
