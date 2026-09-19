"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean;
}

export function ThemeToggle({ className, showLabels = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "group relative inline-flex items-center gap-2 p-1.5 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40",
        className
      )}
      aria-label={isDark ? "Switch to White Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to White Mode" : "Switch to Dark Mode"}
    >
      {/* Sliding Pill Container */}
      <div className="relative flex items-center justify-between w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-800 p-0.5 transition-colors duration-300">
        {/* Sliding Indicator Knob */}
        <div
          className={cn(
            "absolute top-0.5 w-6 h-6 rounded-full bg-white dark:bg-teal-600 shadow-md flex items-center justify-center transition-all duration-300 ease-in-out transform",
            isDark ? "translate-x-7" : "translate-x-0.5"
          )}
        >
          {isDark ? (
            <Moon className="h-3.5 w-3.5 text-white transition-transform duration-300 rotate-0" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-amber-500 transition-transform duration-300 rotate-0" />
          )}
        </div>

        {/* Static Background Icons for visual feedback */}
        <div className="flex items-center justify-center w-6 h-6 pointer-events-none">
          <Sun className={cn("h-3 w-3 transition-opacity duration-200", isDark ? "opacity-30 text-muted-foreground" : "opacity-0")} />
        </div>
        <div className="flex items-center justify-center w-6 h-6 pointer-events-none">
          <Moon className={cn("h-3 w-3 transition-opacity duration-200", isDark ? "opacity-0" : "opacity-30 text-muted-foreground")} />
        </div>
      </div>

      {showLabels && (
        <span className="text-xs font-semibold select-none pr-1.5">
          {isDark ? "Dark Mode" : "White Mode"}
        </span>
      )}
    </button>
  );
}
