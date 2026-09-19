"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

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
  const percentage = currentStep * 25;
  const fractionLabel = `${currentStep}/4th Completed`;

  return (
    <div className={cn("w-full max-w-xl mx-auto mb-8", className)}>
      {/* 1. Step text label: "Step X out of 4" */}
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-bold tracking-wider uppercase shadow-xs">
          <span>Step {currentStep} out of 4</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400">
          <span>{fractionLabel}</span>
          <span className="text-muted-foreground font-normal">({percentage}%)</span>
        </div>
      </div>

      {/* 2. Progress Bar: BELOW "Step X out of 4" */}
      <div
        className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner relative"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-gradient-to-r from-teal-500 to-teal-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step description below bar */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium mt-2 px-0.5">
        <span className="flex items-center gap-1">
          {currentStep > 1 && <CheckCircle2 className="h-3 w-3 text-teal-600 dark:text-teal-400 inline" />}
          {STEP_LABELS[currentStep]}
        </span>
        <span>
          {currentStep === 4 ? "Final Step" : `Next: Step ${currentStep + 1}`}
        </span>
      </div>

      {/* Title & Subtitle if provided */}
      {title && (
        <div className="text-center mt-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
