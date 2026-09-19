"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface InteractiveDatePickerProps {
  label: string;
  name: string;
  value: string; // YYYY-MM-DD
  onChange: (e: { target: { name: string; value: string } }) => void;
  className?: string;
  required?: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function InteractiveDatePicker({
  label,
  name,
  value,
  onChange,
  className,
  required = false,
}: InteractiveDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse existing date or default to 2000-01-01 for DOB
  const parsedDate = value ? new Date(value) : null;
  const [displayYear, setDisplayYear] = useState(
    parsedDate ? parsedDate.getFullYear() : 2000
  );
  const [displayMonth, setDisplayMonth] = useState(
    parsedDate ? parsedDate.getMonth() : 0
  );
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);

  // Synchronize when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setDisplayYear(d.getFullYear());
        setDisplayMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsYearPickerOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Format date display
  const formattedDisplay = parsedDate && !isNaN(parsedDate.getTime())
    ? `${MONTHS[parsedDate.getMonth()]} ${parsedDate.getDate()}, ${parsedDate.getFullYear()}`
    : "";

  // Days calculations
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(displayYear, displayMonth, 1).getDay();

  const handleSelectDay = (day: number) => {
    const mm = String(displayMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const formatted = `${displayYear}-${mm}-${dd}`;
    onChange({ target: { name, value: formatted } });
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear((prev) => prev - 1);
    } else {
      setDisplayMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear((prev) => prev + 1);
    } else {
      setDisplayMonth((prev) => prev + 1);
    }
  };

  // Generate years list (from 1920 to current year)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
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
          <div
            className={cn(
              "transition-colors duration-200 shrink-0",
              isOpen ? "text-teal-600 dark:text-teal-400" : "text-zinc-400"
            )}
          >
            <CalendarIcon className="h-4 w-4" />
          </div>

          <span
            className={cn(
              "block truncate text-sm",
              formattedDisplay ? "text-foreground font-medium" : "text-zinc-400 dark:text-zinc-500"
            )}
          >
            {formattedDisplay || "Select Date of Birth"}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
            isOpen && "rotate-180 text-teal-600"
          )}
        />

        {/* Floating Label with Spring Animation */}
        <motion.div
          initial={false}
          animate={{
            y: formattedDisplay || isOpen ? -28 : 0,
            scale: formattedDisplay || isOpen ? 0.82 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 450,
            damping: 30,
          }}
          className={cn(
            "pointer-events-none absolute left-3.5 origin-top-left font-medium select-none flex items-center gap-1.5",
            formattedDisplay || isOpen
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

      {/* Popover Calendar with Blur Reveal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-card/95 backdrop-blur-xl p-4 shadow-2xl shadow-teal-950/20"
          >
            {/* Calendar Header: Month + Year Navigator */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-zinc-600 dark:text-zinc-300 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-foreground">
                  {MONTHS[displayMonth]}
                </span>
                <button
                  type="button"
                  onClick={() => setIsYearPickerOpen((prev) => !prev)}
                  className="px-2 py-0.5 rounded-md hover:bg-teal-50 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-sm flex items-center gap-1 transition-colors"
                >
                  {displayYear}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-zinc-600 dark:text-zinc-300 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Year Quick Picker (Scrollable overlay) */}
            {isYearPickerOpen ? (
              <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto py-2">
                {years.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setDisplayYear(yr);
                      setIsYearPickerOpen(false);
                    }}
                    className={cn(
                      "py-1.5 text-xs font-semibold rounded-lg transition-colors",
                      yr === displayYear
                        ? "bg-teal-600 text-white shadow-xs"
                        : "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            ) : (
              <>
                {/* Day Names */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {DAYS_OF_WEEK.map((d) => (
                    <span key={d} className="text-[11px] font-semibold text-zinc-400">
                      {d}
                    </span>
                  ))}
                </div>

                {/* Day Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells before month start */}
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {/* Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const isSelected =
                      parsedDate &&
                      parsedDate.getFullYear() === displayYear &&
                      parsedDate.getMonth() === displayMonth &&
                      parsedDate.getDate() === dayNum;

                    return (
                      <motion.button
                        key={dayNum}
                        type="button"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelectDay(dayNum)}
                        className={cn(
                          "h-8 w-8 rounded-xl text-xs font-medium flex items-center justify-center transition-all",
                          isSelected
                            ? "bg-teal-600 text-white font-bold shadow-md shadow-teal-600/30"
                            : "text-foreground hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700"
                        )}
                      >
                        {dayNum}
                      </motion.button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Quick Helper Button */}
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Auto-calculates age</span>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setDisplayYear(now.getFullYear());
                  setDisplayMonth(now.getMonth());
                  handleSelectDay(now.getDate());
                }}
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
