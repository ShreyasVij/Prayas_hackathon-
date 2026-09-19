"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface FloatingFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
  placeholder?: string;
  className?: string;
  min?: string | number;
  max?: string | number;
  disabled?: boolean;
}

export function FloatingField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  icon,
  placeholder,
  className,
  min,
  max,
  disabled = false,
}: FloatingFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== "" && value !== undefined && value !== null;
  const isFloating = isFocused || hasValue;

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className={cn(
          "relative flex items-center rounded-2xl border bg-white dark:bg-card transition-all duration-300 ease-out",
          isFocused
            ? "border-teal-500 shadow-[0_0_18px_rgba(13,148,136,0.40)] ring-2 ring-teal-500/20"
            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
        )}
      >
        {/* Left Icon with color shift on focus */}
        {icon && (
          <div
            className={cn(
              "pl-3.5 pr-1 flex items-center justify-center transition-colors duration-200",
              isFocused ? "text-teal-600 dark:text-teal-400" : "text-zinc-400"
            )}
          >
            {icon}
          </div>
        )}

        {/* Input element */}
        <input
          id={`field-${name}`}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          required={required}
          min={min}
          max={max}
          disabled={disabled}
          placeholder={isFloating ? placeholder : ""}
          className={cn(
            "w-full bg-transparent py-3 text-sm text-foreground outline-none transition-all duration-200",
            icon ? "pl-2 pr-3.5" : "px-3.5",
            isFloating ? "pt-4 pb-2" : "py-3"
          )}
        />

        {/* Floating Label with Spring Animation */}
        <motion.label
          htmlFor={`field-${name}`}
          initial={false}
          animate={{
            y: isFloating ? -19 : 0,
            scale: isFloating ? 0.82 : 1,
            x: isFloating ? (icon ? -8 : 0) : (icon ? 0 : 0),
          }}
          transition={{
            type: "spring",
            stiffness: 450,
            damping: 30,
          }}
          className={cn(
            "pointer-events-none absolute origin-top-left font-medium transition-colors select-none flex items-center gap-1.5",
            icon ? "left-10" : "left-3.5",
            isFloating
              ? "px-1.5 rounded-md bg-white dark:bg-card text-teal-700 dark:text-teal-400 font-bold z-10"
              : "text-zinc-400 dark:text-zinc-500 top-1/2 -translate-y-1/2 text-sm"
          )}
        >
          {/* Active Field Pulsing Dot Easter Egg / Indicator */}
          {isFocused && (
            <motion.span
              animate={{ scale: [1, 1.45, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.1 }}
              className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_#0d9488]"
            />
          )}

          <span>{label}</span>
          {required && <span className="text-destructive font-bold">*</span>}
        </motion.label>
      </div>
    </div>
  );
}
