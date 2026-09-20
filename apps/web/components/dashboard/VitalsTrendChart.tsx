"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Minus,
} from "lucide-react";

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

const TEAL = "#0d9488";

function toNumeric(value: string | number): number | null {
  const parsed = parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCategory(category: string) {
  return category
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return dateStr;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string) {
  try {
    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return dateStr;
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatValue(value: number | null) {
  if (value === null) return "—";

  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(1).replace(/\.0$/, "");
}

function formatDelta(delta: number | null) {
  if (delta === null) return "—";

  const rounded = Math.round(delta * 10) / 10;
  const absolute = Math.abs(rounded);

  return Number.isInteger(absolute)
    ? absolute.toString()
    : absolute.toFixed(1).replace(/\.0$/, "");
}

function getStatusLabel(status?: string) {
  if (!status) return null;

  return status
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

interface ChartPoint {
  rawDate: string;
  displayDate: string;
  value: number;
  unit?: string;
  status?: string;
}

export function VitalsTrendChart({
  groupedVitals,
  loading,
}: VitalsTrendChartProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<string>("");

  /**
   * Only expose categories that actually contain numeric
   * readings. The category with the most readings is selected
   * automatically when possible.
   */
  const seriesCategories = useMemo(() => {
    return Object.entries(groupedVitals)
      .map(([category, vitals]) => {
        const numericCount = vitals.filter(
          (vital) => toNumeric(vital.value) !== null,
        ).length;

        return {
          category,
          numericCount,
        };
      })
      .filter((item) => item.numericCount > 0)
      .sort((a, b) => b.numericCount - a.numericCount)
      .map((item) => item.category);
  }, [groupedVitals]);

  useEffect(() => {
    if (seriesCategories.length === 0) {
      setSelectedCategory("");
      return;
    }

    if (!seriesCategories.includes(selectedCategory)) {
      setSelectedCategory(seriesCategories[0]);
    }
  }, [selectedCategory, seriesCategories]);

  /**
   * Build chronological chart readings.
   *
   * One actual medical reading = one chart point.
   * We intentionally do NOT duplicate a single point to
   * manufacture a visual line.
   */
  const readings = useMemo<ChartPoint[]>(() => {
    if (!selectedCategory) return [];

    const source = groupedVitals[selectedCategory] ?? [];

    const mapped: Array<ChartPoint | null> = source.map(
      (vital): ChartPoint | null => {
        const numericValue = toNumeric(vital.value);

        if (numericValue === null) {
          return null;
        }

        return {
          rawDate: vital.documentDate,
          displayDate: formatDate(vital.documentDate),
          value: numericValue,
          unit: vital.unit,
          status: vital.status,
        };
      },
    );

    const validReadings: ChartPoint[] = [];

    for (const point of mapped) {
      if (point !== null) {
        validReadings.push(point);
      }
    }

    return validReadings.sort(
      (a, b) =>
        new Date(a.rawDate).getTime() -
        new Date(b.rawDate).getTime(),
    );
  }, [groupedVitals, selectedCategory]);

  const latest = readings[readings.length - 1];

  const previous =
    readings.length >= 2
      ? readings[readings.length - 2]
      : undefined;

  const delta =
    latest && previous
      ? latest.value - previous.value
      : null;

  const statusLabel = getStatusLabel(latest?.status);

  if (loading) {
    return (
      <div className="p-5">
        <div className="grid grid-cols-[1fr_auto] gap-4 mb-5">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
            <div className="h-7 w-36 rounded bg-slate-100 animate-pulse" />
          </div>

          <div className="h-10 w-32 rounded-xl bg-slate-100 animate-pulse" />
        </div>

        <div className="h-[220px] rounded-2xl bg-slate-50 animate-pulse" />
      </div>
    );
  }

  if (readings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3 min-h-[250px]">
        <div className="h-11 w-11 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center">
          <Activity
            className="h-5 w-5 text-teal-600"
            strokeWidth={1.7}
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-zinc-800">
            No vitals data yet
          </p>

          <p className="mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed">
            Upload a medical report containing measurable
            vitals to start tracking them over time.
          </p>
        </div>
      </div>
    );
  }

  const categoryLabel = formatCategory(
    selectedCategory,
  );

  return (
    <div className="p-4 sm:p-5">
      {/* Summary Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-600">
            Selected Vital
          </p>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h4 className="text-xl font-bold tracking-tight text-zinc-900">
              {categoryLabel}
            </h4>

            {latest && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-teal-700">
                  {formatValue(latest.value)}
                </span>

                {latest.unit && (
                  <span className="text-xs text-muted-foreground">
                    {latest.unit}
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="mt-1 text-[11px] text-muted-foreground">
            {latest
              ? `Latest reading · ${formatDateTime(
                  latest.rawDate,
                )}`
              : "No numeric readings available"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {previous && delta !== null ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700">
              {delta > 0 ? (
                <ArrowUp
                  className="h-3.5 w-3.5 text-zinc-500"
                  strokeWidth={2}
                />
              ) : delta < 0 ? (
                <ArrowDown
                  className="h-3.5 w-3.5 text-zinc-500"
                  strokeWidth={2}
                />
              ) : (
                <Minus
                  className="h-3.5 w-3.5 text-zinc-400"
                  strokeWidth={2}
                />
              )}

              <span>
                {delta === 0
                  ? "No change"
                  : `${formatDelta(delta)} ${
                      latest?.unit ?? ""
                    } vs previous`}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-zinc-500">
              1 reading
            </div>
          )}

          <select
            id="vitals-trend-select"
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
            aria-label="Select vital to show"
            className="min-w-[150px] max-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 outline-none shadow-sm transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
          >
            {seriesCategories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {formatCategory(category)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-teal-700 border border-teal-100">
          {readings.length}{" "}
          {readings.length === 1
            ? "record"
            : "records"}
        </span>

        {statusLabel && (
          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-zinc-600 border border-slate-200">
            Latest status: {statusLabel}
          </span>
        )}

        {readings.length < 2 && (
          <span className="text-[10px] text-muted-foreground">
            More readings are needed to establish a trend.
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-1 py-3">
        {readings.length === 1 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
            <div className="relative flex h-24 w-full max-w-[520px] items-center justify-center">
              <div className="absolute left-6 right-6 top-1/2 border-t border-dashed border-slate-200" />

              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-teal-600 shadow-lg shadow-teal-600/20">
                <div className="h-3 w-3 rounded-full bg-white" />
              </div>
            </div>

            <p className="mt-2 text-sm font-semibold text-zinc-800">
              {formatValue(latest?.value ?? null)}
              {latest?.unit
                ? ` ${latest.unit}`
                : ""}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {latest
                ? formatDateTime(latest.rawDate)
                : "Latest reading"}
            </p>

            <p className="mt-3 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
              This is the only recorded reading for{" "}
              {categoryLabel}. A trend will appear once
              another reading is available.
            </p>
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={240}
          >
            <LineChart
              data={readings}
              margin={{
                top: 12,
                right: 18,
                left: 0,
                bottom: 6,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 5"
                stroke="#e8eef0"
                vertical={false}
              />

              <XAxis
                dataKey="rawDate"
                type="category"
                tickFormatter={formatDate}
                tick={{
                  fontSize: 11,
                  fill: "#7b8794",
                }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                  fill: "#7b8794",
                }}
                axisLine={false}
                tickLine={false}
                width={42}
                domain={["auto", "auto"]}
              />

              <Tooltip
                cursor={{
                  stroke: TEAL,
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                content={({ active, payload }) => {
                  if (
                    !active ||
                    !payload ||
                    payload.length === 0
                  ) {
                    return null;
                  }

                  const point =
                    payload[0]?.payload as
                      | ChartPoint
                      | undefined;

                  if (!point) return null;

                  const pointStatus =
                    getStatusLabel(point.status);

                  return (
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xl">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600">
                        {categoryLabel}
                      </p>

                      <p className="mt-1 text-sm font-bold text-zinc-900">
                        {formatValue(point.value)}
                        {point.unit
                          ? ` ${point.unit}`
                          : ""}
                      </p>

                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDateTime(
                          point.rawDate,
                        )}
                      </p>

                      {pointStatus && (
                        <p className="mt-1.5 text-[10px] text-zinc-500">
                          Status: {pointStatus}
                        </p>
                      )}
                    </div>
                  );
                }}
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke={TEAL}
                strokeWidth={2.5}
                dot={{
                  r: 4,
                  fill: TEAL,
                  strokeWidth: 2,
                  stroke: "#ffffff",
                }}
                activeDot={{
                  r: 6,
                  fill: TEAL,
                  strokeWidth: 3,
                  stroke: "#ffffff",
                }}
                connectNulls={false}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Previous / Latest summary */}
      {previous && latest && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Previous
            </p>

            <p className="mt-1 text-sm font-bold text-zinc-800">
              {formatValue(previous.value)}
              {previous.unit
                ? ` ${previous.unit}`
                : ""}
            </p>

            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {formatDate(previous.rawDate)}
            </p>
          </div>

          <div className="rounded-xl border border-teal-100 bg-teal-50/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">
              Latest
            </p>

            <p className="mt-1 text-sm font-bold text-zinc-900">
              {formatValue(latest.value)}
              {latest.unit
                ? ` ${latest.unit}`
                : ""}
            </p>

            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {formatDate(latest.rawDate)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}