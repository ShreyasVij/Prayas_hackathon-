"use client";

import React, { useEffect, useState } from "react";
import { motion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Sparkles } from "lucide-react";

interface OnboardingProgressBarProps {
  currentStep: 1 | 2 | 3 | 4;
  title?: string;
  subtitle?: string;
  className?: string;
}

const STEP_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Account Authentication",
  2: "Patient Profile Details",
  3: "Health & Lifestyle (Optional)",
  4: "Site Customization",
};

export function OnboardingProgressBar({
  currentStep,
  title,
  subtitle,
  className,
}: OnboardingProgressBarProps) {
  const targetPercentage = currentStep * 25;
  const fractionLabel = `${currentStep}/4th Completed`;

  // Animate from 0 to targetPercentage on load using spring physics
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    // Reset to 0 initially, then glide smoothly to targetPercentage
    const timer = setTimeout(() => {
      setAnimatedPct(targetPercentage);
    }, 150);
    return () => clearTimeout(timer);
  }, [targetPercentage]);

  return (
    <div className={cn("w-full max-w-2xl mx-auto mb-8", className)}>
      {/* 1. Step text label with status pill */}
      <div className="flex items-center justify-between mb-2.5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-bold tracking-wider uppercase shadow-xs"
        >
          <Sparkles className="h-3.5 w-3.5 text-teal-600 animate-pulse" />
          <span>Step {currentStep} out of 4</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400"
        >
          <span>{fractionLabel}</span>
          <span className="text-muted-foreground font-medium">({targetPercentage}%)</span>
        </motion.div>
      </div>

      {/* 2. DYNAMIC LIQUID FILL PROGRESS BAR */}
      <div
        className="w-full bg-slate-100 dark:bg-slate-800/80 h-3.5 rounded-full p-0.5 border border-slate-200/80 dark:border-slate-700/80 shadow-inner relative overflow-hidden"
        role="progressbar"
        aria-valuenow={targetPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Background micro grid track */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

        {/* Animated Bar Width */}
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: `${animatedPct}%` }}
          transition={{
            duration: 1.2,
            ease: [0.34, 1.35, 0.64, 1], // bouncy spring-like ease curve
          }}
          className="relative h-full rounded-full overflow-hidden"
        >
          {/* Liquid gradient fill */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-500 shadow-sm" />

          {/* Animated Liquid Wave / Shimmer overlay */}
          <motion.div
            animate={{
              x: ["-100%", "200%"],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.2,
              ease: "linear",
            }}
            className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 pointer-events-none"
          />

          {/* Liquid bubbles micro-effect */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-pulse pointer-events-none" />

          {/* Glowing Light-Trail Comet Head at the front tip */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_15px_3px_rgba(20,184,166,0.9),0_0_30px_6px_rgba(13,148,136,0.6)] animate-pulse" />
        </motion.div>
      </div>

      {/* Step description below bar */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium mt-2 px-0.5">
        <span className="flex items-center gap-1">
          {currentStep > 1 && (
            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 inline animate-bounce" />
          )}
          {STEP_LABELS[currentStep]}
        </span>
        <span className="text-zinc-500 font-semibold">
          {currentStep === 4 ? "Final Completion Step" : `Next: Step ${currentStep + 1}`}
        </span>
      </div>

      {/* Title & Subtitle */}
      {title && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-6"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
