"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, HeartPulse } from "lucide-react";

interface Option {
  label: string;
  value: string;
  hint?: string;
}

interface CascadingSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  icon?: React.ReactNode;
  isBloodGroup?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export function CascadingSelect({
  label,
  name,
  value,
  onChange,
  options,
  icon,
  isBloodGroup = false,
  required = false,
  className,
  placeholder = "Select an option",
}: CascadingSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const hasValue = Boolean(value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "relative flex items-center justify-between w-full rounded-2xl border bg-white dark:bg-card py-3 px-3.5 text-sm transition-all duration-300 ease-out outline-none text-left select-none",
          isOpen
            ? "border-teal-500 shadow-[0_0_18px_rgba(13,148,136,0.40)] ring-2 ring-teal-500/20"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
        )}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {/* Blood Group Easter Egg HeartPulse with heartbeat pulsing */}
          {isBloodGroup ? (
            <motion.div
              animate={
                isOpen
                  ? {
                      scale: [1, 1.35, 1.05, 1.4, 1],
                      color: ["#e11d48", "#f43f5e", "#e11d48"],
                    }
                  : { scale: 1 }
              }
              transition={{
                repeat: isOpen ? Infinity : 0,
                duration: 0.85,
                ease: "easeInOut",
              }}
              className="text-rose-500 flex items-center justify-center shrink-0"
            >
              <HeartPulse className="h-4 w-4" />
            </motion.div>
          ) : icon ? (
            <div
              className={cn(
                "transition-colors duration-200 shrink-0",
                isOpen ? "text-teal-600 dark:text-teal-400" : "text-zinc-400"
              )}
            >
              {icon}
            </div>
          ) : null}

          {/* Selected Value or Placeholder */}
          <span
            className={cn(
              "block truncate text-sm",
              hasValue ? "text-foreground font-medium" : "text-zinc-400 dark:text-zinc-500"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {isBloodGroup && value && (
            <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200/80">
              Rh
            </span>
          )}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </div>

        {/* Floating Label with Spring Animation */}
        <motion.div
          initial={false}
          animate={{
            y: hasValue || isOpen ? -28 : 0,
            scale: hasValue || isOpen ? 0.82 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 450,
            damping: 30,
          }}
          className={cn(
            "pointer-events-none absolute left-3.5 origin-top-left font-medium select-none flex items-center gap-1.5",
            hasValue || isOpen
              ? "px-1.5 rounded-md bg-white dark:bg-card text-teal-700 dark:text-teal-400 font-bold z-10"
              : "hidden"
          )}
        >
          {isOpen && (
            <motion.span
              animate={{ scale: [1, 1.45, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.1 }}
              className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_#0d9488]"
            />
          )}
          <span>{label}</span>
          {required && <span className="text-destructive font-bold">*</span>}
        </motion.div>
      </button>

      {/* Cascading Blur-Reveal Popover Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-card/95 backdrop-blur-xl p-1.5 shadow-2xl shadow-teal-950/15 max-h-64 overflow-y-auto"
          >
            <div className="px-2.5 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center justify-between">
              <span>{label} Options</span>
              {isBloodGroup && (
                <span className="text-rose-500 font-semibold flex items-center gap-1">
                  <HeartPulse className="h-3 w-3 animate-pulse" /> Clinical
                </span>
              )}
            </div>

            <div className="space-y-0.5">
              {options.map((opt, idx) => {
                const isSelected = value === opt.value;
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    initial={{ opacity: 0, filter: "blur(8px)", y: -6 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: idx * 0.035,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left",
                      isSelected
                        ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold border border-teal-200/60 dark:border-teal-800/60"
                        : "text-foreground hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:translate-x-1"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isBloodGroup && (
                        <span className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-600 text-xs font-black flex items-center justify-center border border-rose-200/60">
                          {opt.value}
                        </span>
                      )}
                      <span>{opt.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {opt.hint && (
                        <span className="text-[11px] text-muted-foreground">{opt.hint}</span>
                      )}
                      {isSelected && <Check className="h-4 w-4 text-teal-600 dark:text-teal-400" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
