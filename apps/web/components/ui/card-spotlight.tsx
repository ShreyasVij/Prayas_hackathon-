"use client";

import { useRef, MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface CardSpotlightProps {
  children: React.ReactNode;
  className?: string;
  /** Spotlight colour — defaults to teal-600 */
  spotlightColor?: string;
}

/**
 * CardSpotlight — radial spotlight that follows the cursor inside the card.
 * Colours tuned to the Clinical Trust teal palette.
 * Original concept adapted; spotlight hue updated from blue → teal-600.
 */
export function CardSpotlight({
  children,
  className,
  spotlightColor = "rgba(13, 148, 136, 0.08)", // teal-600 / 8%
}: CardSpotlightProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty("--spotlight-x", `${x}%`);
    cardRef.current.style.setProperty("--spotlight-y", `${y}%`);
  }

  function handleMouseLeave() {
    if (!cardRef.current) return;
    // Reset to centre on leave
    cardRef.current.style.setProperty("--spotlight-x", `50%`);
    cardRef.current.style.setProperty("--spotlight-y", `50%`);
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-white",
        "transition-shadow duration-200",
        "hover:shadow-[0_8px_32px_0_rgba(13,148,136,0.10)]",
        className
      )}
      style={
        {
          "--spotlight-x": "50%",
          "--spotlight-y": "50%",
        } as React.CSSProperties
      }
    >
      {/* Spotlight radial overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(400px circle at var(--spotlight-x) var(--spotlight-y), ${spotlightColor}, transparent 70%)`,
        }}
      />
      {/* Content lives above the spotlight */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
