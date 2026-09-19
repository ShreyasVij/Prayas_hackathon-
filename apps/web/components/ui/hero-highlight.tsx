"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface HeroHighlightProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

interface HighlightProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * HeroHighlight — dot-grid pattern background container
 */
export function HeroHighlight({ children, className, containerClassName }: HeroHighlightProps) {
  return (
    <div
      className={cn(
        "relative w-full py-4 flex items-center justify-center",
        containerClassName
      )}
      style={{
        backgroundImage: `radial-gradient(circle, hsl(175 84% 32% / 0.12) 1.2px, transparent 1.2px)`,
        backgroundSize: "24px 24px",
      }}
    >
      <div className={cn("relative z-20 w-full", className)}>{children}</div>
    </div>
  );
}

/**
 * Highlight — animated text marker background highlight with clinical teal gradient
 */
export function Highlight({ children, className }: HighlightProps) {
  return (
    <motion.span
      initial={{
        backgroundSize: "0% 100%",
      }}
      animate={{
        backgroundSize: "100% 100%",
      }}
      transition={{
        duration: 1.5,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.25,
      }}
      style={{
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        display: "inline",
      }}
      className={cn(
        "relative inline-block pb-1 px-2.5 rounded-xl bg-gradient-to-r from-teal-200 via-teal-300 to-teal-200 text-teal-950 font-extrabold",
        className
      )}
    >
      {children}
    </motion.span>
  );
}
