"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

interface MagneticButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function MagneticButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Magnetic coordinates
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Spring physics for buttery responsiveness and snap-back
  const springConfig = { stiffness: 280, damping: 14, mass: 0.12 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Ripples state
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !buttonRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    // Subtly pulls the button towards the cursor
    x.set((clientX - centerX) * 0.32);
    y.set((clientY - centerY) * 0.32);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !buttonRef.current) return;

    // Spawn expanding ripple
    const rect = buttonRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const newRipple = { id: Date.now(), x: clickX, y: clickY };

    setRipples((prev) => [...prev, newRipple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 750);

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        x: springX,
        y: springY,
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.88, y: 3 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 20,
      }}
      className={cn(
        "relative overflow-hidden inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl",
        "bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 text-white font-bold text-sm",
        "shadow-lg shadow-teal-700/25 hover:shadow-xl hover:shadow-teal-700/35",
        "border border-teal-500/40 select-none outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        className
      )}
    >
      {/* Light sheen on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/20 pointer-events-none" />

      {/* Ripples layer */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 4.5, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ left: ripple.x, top: ripple.y }}
          className="pointer-events-none absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40"
        />
      ))}

      {/* Button content */}
      <span className="relative z-10 flex items-center gap-2 tracking-wide">
        {children}
      </span>
    </motion.button>
  );
}
