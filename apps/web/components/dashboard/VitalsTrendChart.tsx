"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Activity } from "lucide-react";

interface Vital {
  label: string;
  value: string | number;
  unit?: string;
  documentDate: string;
  vitalType?: string;
  status?: string;
}

interface VitalsTrendChartProps {
  groupedVitals: Record<string, Vital[]>;
  loading?: boolean;
}

// Teal-anchored palette for multi-series lines
const LINE_COLORS = [
  "#0d9488", // teal-600
  "#0891b2", // cyan-600
  "#7c3aed", // violet-600
  "#059669", // emerald-600
  "#d97706", // amber-600
];

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function toNumeric(val: string | number): number | null {
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

/**
 * VitalsTrendChart — time-series line chart built with Recharts.
 * Takes the grouped vitals from the vitals API and plots the 5 most-populated
 * categories over time. Each data-point is one document date.
 */
export function VitalsTrendChart({ groupedVitals, loading }: VitalsTrendChartProps) {
  // Pick top 5 categories by data density
  const seriesCategories = useMemo(() => {
    return Object.entries(groupedVitals)
      .filter(([, vitals]) => vitals.length > 0)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5)
      .map(([cat]) => cat);
  }, [groupedVitals]);

  // Build unified time-series data across all dates
  const chartData = useMemo(() => {
    if (seriesCategories.length === 0) return [];

    // Collect all unique dates
    const allDates = new Set<string>();
    for (const cat of seriesCategories) {
      for (const v of groupedVitals[cat] ?? []) {
        allDates.add(v.documentDate);
      }
    }

    const sortedDates = Array.from(allDates).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return sortedDates.map((date) => {
      const point: Record<string, string | number | null> = {
        date: formatDate(date),
      };
      for (const cat of seriesCategories) {
        const match = groupedVitals[cat]?.find((v) => v.documentDate === date);
        const first = match ?? groupedVitals[cat]?.[0];
        point[cat] = first ? toNumeric(first.value) : null;
      }
      return point;
    });
  }, [groupedVitals, seriesCategories]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-6">
        {/* Skeleton bars */}
        {[80, 55, 70, 45, 60].map((w, i) => (
          <div
            key={i}
            className="h-3 rounded-full bg-slate-100 animate-pulse"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
        <Activity className="h-8 w-8 text-slate-300" strokeWidth={1.5} />
        <p className="text-sm text-muted-foreground">
          No vitals data yet — upload medical documents to see trends here.
        </p>
      </div>
    );
  }

  // If only one data point, duplicate it so Recharts renders a line
  const plotData = chartData.length === 1 ? [chartData[0], chartData[0]] : chartData;

  return (
    <div className="p-2 pr-4">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={plotData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(214 20% 92%)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(215 14% 52%)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(215 14% 52%)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "white",
              border: "1px solid hsl(214 20% 90%)",
              borderRadius: "12px",
              fontSize: "12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}
            cursor={{ stroke: "hsl(175 84% 32%)", strokeWidth: 1, strokeDasharray: "4 2" }}
          />
          {seriesCategories.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              iconType="circle"
              iconSize={8}
            />
          )}
          {seriesCategories.map((cat, i) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: LINE_COLORS[i % LINE_COLORS.length], strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
