"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

interface InteractiveTiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // default teal-600
}

/**
 * InteractiveTiltCard
 * - 3D tilt effect on mouse hover using Framer Motion spring physics
 * - Dynamic glowing teal border that tracks the user's cursor position in real time
 */
export function InteractiveTiltCard({
  children,
  className,
  glowColor = "rgba(13, 148, 136, 0.45)", // clinical teal
}: InteractiveTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Normalized mouse coordinates: -0.5 to 0.5 from center
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Exact pixel mouse coordinates for cursor tracking glow
  const mouseX = useMotionValue(200);
  const mouseY = useMotionValue(200);

  // Spring physics for buttery smooth tilt return
  const mouseXSpring = useSpring(x, { stiffness: 220, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 220, damping: 25 });

  // 3D rotation angles (subtle 5deg for clinical elegance)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const pxX = e.clientX - rect.left;
    const pxY = e.clientY - rect.top;

    mouseX.set(pxX);
    mouseY.set(pxY);

    const xPct = pxX / width - 0.5;
    const yPct = pxY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <div
      style={{ perspective: 1200 }}
      className="relative w-full transition-all duration-300"
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "relative group rounded-3xl p-[1.5px] transition-shadow duration-300",
          isHovered
            ? "shadow-[0_20px_50px_-15px_rgba(13,148,136,0.18)]"
            : "shadow-lg shadow-slate-200/60 dark:shadow-none",
          className
        )}
      >
        {/* Dynamic Glowing Border tracking cursor */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[1px] rounded-3xl z-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0.35,
            background: `radial-gradient(380px circle at ${mouseX.get()}px ${mouseY.get()}px, ${glowColor}, transparent 70%)`,
          }}
        />

        {/* Ambient base border */}
        <div className="absolute inset-0 rounded-3xl border border-slate-200/80 dark:border-slate-800 pointer-events-none z-0" />

        {/* Card Inner Surface */}
        <div className="relative z-10 w-full rounded-[23px] bg-white dark:bg-card border border-slate-100 dark:border-border p-6 sm:p-8 backdrop-blur-xl overflow-hidden">
          {/* Subtle cursor-following inner spotlight */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
            style={{
              opacity: isHovered ? 1 : 0,
              background: `radial-gradient(500px circle at ${mouseX.get()}px ${mouseY.get()}px, rgba(13, 148, 136, 0.05), transparent 75%)`,
            }}
          />
          <div className="relative z-10">{children}</div>
        </div>
      </motion.div>
    </div>
  );
}
