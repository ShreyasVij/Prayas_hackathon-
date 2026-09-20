"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Salad, Moon, Dumbbell, Sun, Brain, Utensils, ChevronDown, ChevronUp } from "lucide-react";

// Layout & data hooks
import { useVitals } from "@/hooks/useVitals";

// Bento cell components
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { AIBadge } from "@/components/ui/ai-badge";
import { StreamingText } from "@/components/dashboard/StreamingText";
import { VitalsTrendChart } from "@/components/dashboard/VitalsTrendChart";
import { EmergencyQRBox } from "@/components/dashboard/EmergencyQRBox";
import { RecentDocsList } from "@/components/dashboard/RecentDocsList";
import { ReprocessButton } from "@/components/dashboard/ReprocessButton";
import { DryRunBanner } from "@/components/ui/dry-run-banner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface HealthSummary {
  [key: string]: any;
}

interface LifestylePlan {
  morning_routine?: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  exercise?: string;
  sleep?: string;
  stress_management?: string;
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

// ─── Lifestyle Plan Card ─────────────────────────────────────────────────────

function LifestylePlanCard({ plan }: { plan: LifestylePlan }) {
  const [expanded, setExpanded] = useState(false);
  const items = [
    { icon: <Sun className="h-4 w-4 text-amber-500" />, label: "Morning", value: plan.morning_routine },
    { icon: <Utensils className="h-4 w-4 text-emerald-500" />, label: "Breakfast", value: plan.breakfast },
    { icon: <Salad className="h-4 w-4 text-teal-500" />, label: "Lunch", value: plan.lunch },
    { icon: <Utensils className="h-4 w-4 text-orange-400" />, label: "Dinner", value: plan.dinner },
    { icon: <Dumbbell className="h-4 w-4 text-violet-500" />, label: "Exercise", value: plan.exercise },
    { icon: <Moon className="h-4 w-4 text-indigo-500" />, label: "Sleep", value: plan.sleep },
    { icon: <Brain className="h-4 w-4 text-rose-400" />, label: "Stress", value: plan.stress_management },
  ].filter(item => item.value);

  const visible = expanded ? items : items.slice(0, 3);

  return (
    <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/60 to-emerald-50/40 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-600 mb-0.5">AI Lifestyle Plan</p>
          <h3 className="text-base font-bold text-zinc-900">Personalised Suggestions</h3>
        </div>
        <AIBadge />
      </div>
      <div className="space-y-3">
        {visible.map(item => (
          <div key={item.label} className="flex items-start gap-3 bg-white/70 rounded-xl px-3 py-2.5 border border-white/80 shadow-xs">
            <span className="mt-0.5 shrink-0">{item.icon}</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">{item.label}</p>
              <p className="text-xs text-zinc-700 leading-relaxed">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
      {items.length > 3 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
        >
          {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show all {items.length} suggestions</>}
        </button>
      )}
    </div>
  );
}

// ─── Health Status Hero ───────────────────────────────────────────────────────

function HealthStatusHero({ onLifestylePlan }: { onLifestylePlan?: (plan: LifestylePlan) => void }) {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [statusText, setStatusText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const hydrated = useHydrated();

  useEffect(() => {
    async function fetchSummary() {
      try {
        // 1. Try the new Supabase-backed patient health summary (AI scans + Gemini)
        const supabaseRes = await fetch("/api/patient/health-summary");
        if (supabaseRes.ok) {
          const supabaseData = await supabaseRes.json();
          if (supabaseData.summary) {
            setSummary(supabaseData);
            if (supabaseData.lifestyle_plan && onLifestylePlan) {
              onLifestylePlan(supabaseData.lifestyle_plan);
            }
            const plain = supabaseData.summary;
            if (plain) {
              setIsStreaming(true);
              setStatusText(plain);
              setTimeout(() => setIsStreaming(false), plain.length * 18 + 600);
            }
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fall through to legacy endpoint
      }

      // 2. Fallback to legacy MongoDB health summary
      try {
        const res = await fetch("/api/health-summary");
        if (!res.ok) return;
        const data = await res.json();
        setSummary(data.summary);

        // Extract a readable plain-text paragraph for the Hero Box
        const raw = data.summary;
        let plain = "";

        if (raw) {
          // Try overall_summary → feedback / summary string
          if (typeof raw.overall_summary === "string") plain = raw.overall_summary;
          else if (typeof raw.overall_summary?.feedback === "string") plain = raw.overall_summary.feedback;
          else if (typeof raw.overall_summary?.summary === "string") plain = raw.overall_summary.summary;
          else if (typeof raw.overall_feedback === "string") plain = raw.overall_feedback;
          else if (typeof raw.summary === "string") {
            // Try parsing nested JSON
            try {
              const nested = JSON.parse(raw.summary);
              if (typeof nested.overall_feedback === "string") plain = nested.overall_feedback;
              else if (typeof nested.overall_summary === "string") plain = nested.overall_summary;
            } catch {
              plain = raw.summary;
            }
          }
          // Fallback: first section content
          if (!plain && Array.isArray(raw.sections) && raw.sections[0]?.content) {
            plain = raw.sections[0].content;
          }
        }

        if (plain) {
          setIsStreaming(true);
          setStatusText(plain);
          // Simulate end of stream after text is fully revealed
          setTimeout(() => setIsStreaming(false), plain.length * 18 + 600);
        }
      } catch {
        // Non-fatal — Hero Box shows empty state
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reduce = useReducedMotion();
  const motionEnabled = hydrated && !reduce;

  return (
    <HeroHighlight className="rounded-2xl h-full">
      <div className="flex flex-col h-full p-6 gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-600 mb-1">
              Current Health Status
            </p>
            <h2 className="text-xl font-bold text-zinc-900 leading-snug">
              Your <Highlight>AI Health Brief</Highlight>
            </h2>
          </div>
          <AIBadge />
        </div>

        {/* Content area */}
        <div className="flex-1 min-h-0">
          {loading ? (
            // Skeleton lines matching expected text density
            <div className="flex flex-col gap-2.5 mt-1">
              {[100, 90, 95, 80, 70].map((w, i) => (
                <div
                  key={i}
                  className="h-3.5 rounded-full bg-slate-100 animate-pulse"
                  style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          ) : statusText ? (
            <motion.div
              initial={motionEnabled ? { opacity: 0, y: 8 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <p
                className="text-base text-zinc-700 leading-[1.75] tracking-[-0.01em]"
                aria-live="polite"
                aria-label="AI-generated health status summary"
              >
                <StreamingText
                  text={statusText}
                  isStreaming={isStreaming}
                  charsPerTick={3}
                  intervalMs={14}
                />
              </p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-3 items-start mt-2">
              <p className="text-base text-muted-foreground leading-relaxed">
                Upload your medical documents and click{" "}
                <span className="font-semibold text-teal-600">Refresh Health Data</span> to
                generate a personalised AI health brief.
              </p>
            </div>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <p className="text-[10px] text-muted-foreground">
            Always verify AI summaries with your healthcare provider.
          </p>
          <ReprocessButton />
        </div>
      </div>
    </HeroHighlight>
  );
}

// ─── Bento Grid ───────────────────────────────────────────────────────────────

function BentoGrid({ groupedVitals, vitalsLoading }: {
  groupedVitals: Record<string, any[]>;
  vitalsLoading: boolean;
}) {
  const [lifestylePlan, setLifestylePlan] = useState<LifestylePlan | null>(null);
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const motionEnabled = hydrated && !reduce;

  const containerVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  };
  const cellVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <motion.div
      variants={motionEnabled ? containerVariants : undefined}
      initial={motionEnabled ? "hidden" : false}
      animate="show"
      className="grid gap-4"
      style={{
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gridTemplateAreas:
          '"hero  hero  qr  " ' +
          '"chart chart docs"' +
          (lifestylePlan ? ' "life  life  life"' : ""),
      }}
    >
      {/* ── Cell 1: Health Status Hero (2/3 width, row 1) ── */}
      <motion.div
        variants={motionEnabled ? cellVariants : undefined}
        className="bento-cell"
        style={{ gridArea: "hero" }}
      >
        <HealthStatusHero onLifestylePlan={setLifestylePlan} />
      </motion.div>

      {/* ── Cell 2: Emergency QR (1/3 width, row 1) ── */}
      <motion.div
        variants={motionEnabled ? cellVariants : undefined}
        className="bento-cell"
        style={{ gridArea: "qr" }}
      >
        <EmergencyQRBox />
      </motion.div>

      {/* ── Cell 3: Vitals Trend Chart (2/3 width, row 2) ── */}
      <motion.div
        variants={motionEnabled ? cellVariants : undefined}
        className="bento-cell"
        style={{ gridArea: "chart" }}
      >
        <CardSpotlight className="h-full w-full rounded-none" spotlightColor="rgba(13, 148, 136, 0.05)">
          <div className="px-5 pt-5 pb-2 border-b border-border/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-600 mb-0.5">
                Vitals Trend
              </p>
              <h3 className="text-base font-bold text-zinc-900">Key Readings Over Time</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">Latest 5 categories</span>
          </div>
          <VitalsTrendChart groupedVitals={groupedVitals} loading={vitalsLoading} />
        </CardSpotlight>
      </motion.div>

      {/* ── Cell 4: Recent Documents (1/3 width, row 2) ── */}
      <motion.div
        variants={motionEnabled ? cellVariants : undefined}
        className="bento-cell"
        style={{ gridArea: "docs" }}
      >
        <div className="px-5 pt-5 pb-3 border-b border-border/60">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-600 mb-0.5">
            Documents
          </p>
          <h3 className="text-base font-bold text-zinc-900">Recent Uploads</h3>
        </div>
        <RecentDocsList />
      </motion.div>

      {/* ── Cell 5: Lifestyle Plan (full-width row 3, only if data) ── */}
      {lifestylePlan && (
        <motion.div
          variants={motionEnabled ? cellVariants : undefined}
          className="bento-cell"
          style={{ gridArea: "life" }}
        >
          <LifestylePlanCard plan={lifestylePlan} />
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

function DashboardPageClient() {
  const supabase = createClient();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setSessionUser(user);
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    });
  }, []);
  const router = useRouter();
  const { groupedVitals, loading: vitalsLoading } = useVitals();
  const reduce = useReducedMotion();
  const hydrated = useHydrated();
  const motionEnabled = hydrated && !reduce;

  const isDryRun = process.env.NEXT_PUBLIC_DRY_RUN === 'true';

  useEffect(() => {
    if (status === "unauthenticated" && !isDryRun) {
      router.push("/auth?callbackUrl=/dashboard");
    }
  }, [status, isDryRun, router]);

  const displayName =
    (isDryRun ? "Alex Johnson" : null) ||
    sessionUser?.user_metadata?.name ||
    sessionUser?.email?.split("@")[0] ||
    null;

  const isReturningUser =
    status === "authenticated" && !sessionUser?.user_metadata?.isNewUser;

  const greeting = isReturningUser
    ? displayName
      ? `Welcome back, ${displayName}`
      : "Welcome back"
    : "Welcome to MediLocker";

  return (
    <div className="max-w-[1400px] mx-auto px-0">
      {/* Page header */}
      <DryRunBanner />

      <motion.div
        initial={motionEnabled ? { opacity: 0, y: -8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{greeting}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isReturningUser
            ? "Here's your personalised health overview."
            : "Get started by uploading your medical documents below."}
        </p>
      </motion.div>

      {/* Bento Grid — the main layout */}
      <BentoGrid groupedVitals={groupedVitals} vitalsLoading={vitalsLoading} />
    </div>
  );
}

export default function DashboardPage() {
  return <DashboardPageClient />;
}