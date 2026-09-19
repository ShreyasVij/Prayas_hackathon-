"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface StreamingTextProps {
  /** Full text to display. If `isStreaming` is true, it animates letter-by-letter. */
  text: string;
  /** When true, renders the cursor and animates text in. When false, shows text statically. */
  isStreaming?: boolean;
  /** Characters revealed per interval tick. Default: 2 */
  charsPerTick?: number;
  /** Interval in ms between ticks. Default: 18 */
  intervalMs?: number;
  className?: string;
}

/**
 * StreamingText — SSE-ready streaming text component.
 *
 * Renders a blinking cursor while streaming and reveals text progressively.
 * Driven entirely by React state + setInterval — no third-party animation library.
 *
 * Usage with SSE:
 *   - Start with `text=""` and `isStreaming={true}`
 *   - Append characters to `text` as SSE chunks arrive
 *   - Set `isStreaming={false}` when the stream closes
 */
export function StreamingText({
  text,
  isStreaming = false,
  charsPerTick = 2,
  intervalMs = 18,
  className,
}: StreamingTextProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const prevTextRef = useRef(text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // When text changes (new SSE chunk), continue revealing from current position
  useEffect(() => {
    if (text !== prevTextRef.current) {
      prevTextRef.current = text;
    }
  }, [text]);

  // Animate letters in when streaming
  useEffect(() => {
    if (!isStreaming) {
      // Show full text immediately when not streaming
      setDisplayedLength(text.length);
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayedLength((prev) => {
        const next = prev + charsPerTick;
        if (next >= text.length) {
          // Caught up — pause until more text arrives
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return text.length;
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStreaming, text, charsPerTick, intervalMs]);

  // Re-trigger interval when text grows (new SSE chunk pushes length further)
  useEffect(() => {
    if (!isStreaming) return;
    if (displayedLength < text.length && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setDisplayedLength((prev) => {
          const next = prev + charsPerTick;
          if (next >= text.length) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            return text.length;
          }
          return next;
        });
      }, intervalMs);
    }
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text.length]);

  const displayed = text.slice(0, displayedLength);
  const isActive = isStreaming || displayedLength < text.length;

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {displayed}
      {isActive && (
        <span className="ai-stream-cursor" aria-hidden="true" />
      )}
    </span>
  );
}
