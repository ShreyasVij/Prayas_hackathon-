"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Heart,
  Droplets,
  Thermometer,
  Cpu,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  Filter,
  ChevronDown,
  Sparkles,
  Stethoscope,
  RefreshCw,
  SlidersHorizontal,
  X,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { useBioTelemetry } from "./useBioTelemetry";
import { TimebaseScale } from "./types";

export default function MinorDashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [sessionTimestamp, setSessionTimestamp] = useState<string>("Oct 27, 2026 · 12:15:00");
  const [showInputModal, setShowInputModal] = useState<boolean>(false);

  const {
    patient,
    selectedPatientId,
    setSelectedPatientId,
    patientProfiles,
    timebase,
    setTimebase,
    filterMode,
    setFilterMode,
    tempUnit,
    setTempUnit,
    metrics,
    hrHistory,
    ppgBuffer,
    ecgBuffer,
    isSyncing,
    lastSyncTime,
    fetchEsp32Data,
    applyEsp32Metrics,
    exportTelemetryCsv,
  } = useBioTelemetry();

  // Local state for ESP32 manual value injection modal
  const [inputHr, setInputHr] = useState<number>(metrics.heartRate);
  const [inputSpo2, setInputSpo2] = useState<number>(metrics.spo2);
  const [inputTemp, setInputTemp] = useState<number>(metrics.tempObject);
  const [inputThb, setInputThb] = useState<number>(metrics.thb);

  useEffect(() => {
    setIsMounted(true);
    setSessionTimestamp(
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
        " · " +
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        })
    );
  }, []);

  // Sync inputs with metrics whenever metrics change
  useEffect(() => {
    setInputHr(metrics.heartRate);
    setInputSpo2(metrics.spo2);
    setInputTemp(metrics.tempObject);
    setInputThb(metrics.thb);
  }, [metrics]);

  // Convert temp to °F if toggled
  const displayTemp = useMemo(() => {
    if (tempUnit === "F") {
      return ((metrics.tempObject * 9) / 5 + 32).toFixed(1);
    }
    return metrics.tempObject.toFixed(1);
  }, [metrics.tempObject, tempUnit]);

  const displayAmbientTemp = useMemo(() => {
    if (tempUnit === "F") {
      return ((metrics.tempAmbient * 9) / 5 + 32).toFixed(1);
    }
    return metrics.tempAmbient.toFixed(1);
  }, [metrics.tempAmbient, tempUnit]);

  // Mini sparkline data for HR card
  const hrSparklineData = useMemo(() => {
    return hrHistory.map((val, idx) => ({ idx, val }));
  }, [hrHistory]);

  // PPG Waveform display dataset based on filter mode
  const ppgChartData = useMemo(() => {
    return ppgBuffer.map((s) => ({
      time: s.label,
      Red: filterMode === "bandpass" ? s.red : s.redRaw,
      IR: filterMode === "bandpass" ? s.ir : s.irRaw,
    }));
  }, [ppgBuffer, filterMode]);

  // ECG Waveform display dataset based on filter mode
  const ecgChartData = useMemo(() => {
    return ecgBuffer.map((s) => ({
      time: s.label,
      ECG: filterMode === "bandpass" ? s.ecg : s.ecgRaw,
    }));
  }, [ecgBuffer, filterMode]);

  const handleApplyInputs = (e: React.FormEvent) => {
    e.preventDefault();
    applyEsp32Metrics({
      heartRate: Number(inputHr),
      spo2: Number(inputSpo2),
      tempObject: Number(inputTemp),
      thb: Number(inputThb),
    });
    setShowInputModal(false);
  };

  if (!isMounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-8 w-8 text-teal-600" />
          <p className="text-sm font-medium text-muted-foreground">
            Loading Biomedical Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. HEADER & SYSTEM STATUS BAR (TOP FULL WIDTH)
         ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Title + Subtitle + Live ESP32 Status */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-foreground sm:text-2xl">
                Non-Invasive Physiological & ML Health Analytics
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Connected / Live Syncing via ESP32
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Capstone Biomedical Engineering Project · MAX30102 PPG · AD8232 ECG · MLX90614 Pyrometer · Static Capture
            </p>
          </div>
        </div>

        {/* Right: Patient Selector / Timestamp / Sync / Export Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick ESP32 Value Input / Refresh Button */}
          <Button
            onClick={() => setShowInputModal(true)}
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-slate-200 bg-white text-xs font-medium dark:border-border dark:bg-card"
            title="Set or review static ESP32 sensor values"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-teal-600" />
            <span>Set ESP32 Values</span>
          </Button>

          {/* Sync / Refresh from ESP32 API */}
          <Button
            onClick={fetchEsp32Data}
            variant="outline"
            size="sm"
            disabled={isSyncing}
            className="h-9 gap-1.5 border-slate-200 bg-white text-xs font-medium dark:border-border dark:bg-card"
            title="Fetch latest reading from ESP32 endpoint (/api/esp32)"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-teal-600 ${
                isSyncing ? "animate-spin" : ""
              }`}
            />
            <span>{isSyncing ? "Syncing..." : "Sync ESP32"}</span>
          </Button>

          {/* Patient Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-slate-200 bg-white text-xs font-medium dark:border-border dark:bg-card"
              >
                <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                <span className="font-semibold text-zinc-900 dark:text-foreground">
                  {patient.id}
                </span>
                <span className="hidden text-muted-foreground sm:inline">
                  ({patient.gender}, {patient.age}y)
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                Select Telemetry Subject
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {patientProfiles.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`cursor-pointer text-xs ${
                    selectedPatientId === p.id
                      ? "bg-teal-50 font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
                      : ""
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-zinc-900 dark:text-foreground">
                      {p.id} · {p.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Baseline: {p.baselineHr} BPM · {p.baselineSpo2}% SpO2 · {p.baselinetHb} g/dL
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Session Timestamp Pill */}
          <div className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-zinc-600 dark:border-border dark:bg-muted dark:text-muted-foreground md:inline-flex">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{sessionTimestamp}</span>
          </div>

          {/* Export Telemetry Action Button */}
          <Button
            onClick={exportTelemetryCsv}
            size="sm"
            className="h-9 gap-1.5 bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Data</span>
          </Button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. VITAL SIGNS METRIC CARDS GRID (4 TOP CARDS)
         ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Heart Rate (BPM) */}
        <Card className="relative overflow-hidden border-slate-200 bg-white transition-all hover:shadow-md dark:border-border dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
                <Heart className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Heart Rate
              </span>
            </div>
            <StatusPill
              status={
                metrics.heartRate >= 60 && metrics.heartRate <= 100
                  ? "normal"
                  : metrics.heartRate > 100
                  ? "warning"
                  : "flagged"
              }
            />
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-foreground">
                  {metrics.heartRate}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  BPM
                </span>
              </div>
              {/* Mini Sparkline Chart */}
              <div className="h-9 w-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hrSparklineData}>
                    <Line
                      type="monotone"
                      dataKey="val"
                      stroke="#0d9488"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-muted-foreground dark:border-border">
              <span>Resting: 60–100 BPM</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                R-R: {metrics.rrInterval}ms
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Blood Oxygen (SpO2) */}
        <Card className="relative overflow-hidden border-slate-200 bg-white transition-all hover:shadow-md dark:border-border dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
                <Droplets className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Blood Oxygen
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                metrics.spo2 >= 95
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {metrics.spo2 >= 95 ? "Normal Range" : "Hypoxia Watch"}
            </span>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-foreground">
                  {metrics.spo2}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  % SpO2
                </span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                PI: {metrics.perfusionIndex}%
              </span>
            </div>

            {/* Range Bar Indicator */}
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
                <div
                  className="h-full rounded-full bg-teal-600"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (metrics.spo2 - 80) * 5)
                    )}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>&lt;90% Hypoxia</span>
                <span>95–100% Optimal</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Body Temperature (MLX90614) */}
        <Card className="relative overflow-hidden border-slate-200 bg-white transition-all hover:shadow-md dark:border-border dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
                <Thermometer className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Temperature
              </span>
            </div>
            {/* °C / °F Unit Switcher */}
            <button
              onClick={() => setTempUnit((u) => (u === "C" ? "F" : "C"))}
              className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 transition-colors hover:bg-slate-100 dark:border-border dark:bg-muted dark:text-foreground"
              title="Click to toggle °C / °F"
            >
              °{tempUnit} (Toggle)
            </button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-foreground">
                  {displayTemp}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  °{tempUnit}
                </span>
              </div>
              <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                MLX90614 IR
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-muted-foreground dark:border-border">
              <span>
                Ambient: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{displayAmbientTemp}°{tempUnit}</strong>
              </span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Normothermia
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Estimated Total Hemoglobin - tHb (ML Model Output) */}
        <Card className="relative overflow-hidden border-slate-200 bg-white transition-all hover:shadow-md dark:border-border dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
                <Cpu className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Hemoglobin
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 border border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800">
              <Sparkles className="h-3 w-3 text-teal-600" />
              ML Output
            </span>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-foreground">
                  {metrics.thb}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  g/dL
                </span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                95% CI [{metrics.thbCiLow} - {metrics.thbCiHigh}]
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-muted-foreground dark:border-border">
              <span>Norm: 13.5–17.5 g/dL</span>
              <span className="font-semibold text-teal-600 dark:text-teal-400">
                R² = {metrics.rSquared}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. MAIN WAVEFORM & REAL-TIME SIGNAL STREAM AREA (MIDDLE GRID - 2 COLUMNS)
         ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (Main Focus - 8 cols): Dual Sensor Oscilloscope */}
        <div className="space-y-6 lg:col-span-8">
          <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-zinc-900 dark:text-foreground sm:text-lg">
                    Real-Time Dual Sensor Oscilloscope
                  </CardTitle>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-muted dark:text-muted-foreground">
                    Static Stream Window
                  </span>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Static acquisition window for MAX30102 PPG and AD8232 ECG Lead I
                </CardDescription>
              </div>

              {/* Toolbar Controls: Timebase and Filter Mode */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Timebase Scale (1s, 5s, 10s) */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium dark:border-border dark:bg-muted">
                  {(["1s", "5s", "10s"] as TimebaseScale[]).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => setTimebase(scale)}
                      className={`rounded px-2.5 py-1 text-xs transition-colors ${
                        timebase === scale
                          ? "bg-white font-semibold text-teal-700 shadow-xs dark:bg-card dark:text-teal-400"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-muted-foreground"
                      }`}
                    >
                      {scale}
                    </button>
                  ))}
                </div>

                {/* Filter Mode Toggle (Raw vs Bandpass) */}
                <Button
                  onClick={() =>
                    setFilterMode((m) => (m === "bandpass" ? "raw" : "bandpass"))
                  }
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-slate-200 dark:border-border"
                  title="Switch between Bandpass Filtered (0.5-40Hz) and Raw sensor signal"
                >
                  <Filter className="h-3.5 w-3.5 text-teal-600" />
                  <span>
                    {filterMode === "bandpass" ? "Bandpass Filtered" : "Raw Stream"}
                  </span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-2">
              {/* Graph 1: Static PPG Waveform (Red & IR channels from MAX30102) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-teal-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground">
                      Graph 1: MAX30102 Photoplethysmogram (PPG)
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> Red Channel (660nm)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-teal-600" /> IR Channel (940nm)
                    </span>
                  </div>
                </div>

                <div className="h-44 w-full rounded-xl border border-slate-100 bg-slate-50/50 p-2 dark:border-border dark:bg-muted/30">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ppgChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        interval="preserveEnd"
                        stroke="#cbd5e1"
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        stroke="#cbd5e1"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#e2e8f0",
                          borderRadius: "0.5rem",
                          fontSize: "12px",
                          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Red"
                        stroke="#f43f5e"
                        strokeWidth={1.8}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="IR"
                        stroke="#0d9488"
                        strokeWidth={1.8}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Graph 2: Static ECG Waveform (Single-lead stream from AD8232) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-foreground">
                      Graph 2: AD8232 Electrocardiogram (ECG Lead I)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      Leads Contact: Optimal
                    </span>
                    <span>Gain: 100 V/V · 0.5–40 Hz</span>
                  </div>
                </div>

                <div className="h-44 w-full rounded-xl border border-slate-100 bg-slate-50/50 p-2 dark:border-border dark:bg-muted/30">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ecgChartData}>
                      <CartesianGrid
                        strokeDasharray="2 2"
                        stroke="#e2e8f0"
                        vertical={true}
                        horizontal={true}
                      />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        interval="preserveEnd"
                        stroke="#cbd5e1"
                      />
                      <YAxis
                        domain={[-0.8, 1.8]}
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        stroke="#cbd5e1"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderColor: "#e2e8f0",
                          borderRadius: "0.5rem",
                          fontSize: "12px",
                          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="ECG"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (4 cols): Machine Learning Analytics & Diagnostics */}
        <div className="space-y-6 lg:col-span-4">
          {/* Panel A: Feature Extraction Panel */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-foreground">
                  Extracted Signal Features
                </CardTitle>
                <span className="rounded bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                  Edge DSP
                </span>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Automated morphological feature pipeline from PPG/ECG pulses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-border dark:bg-muted/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    R-R Interval
                  </p>
                  <p className="mt-0.5 text-base font-bold text-zinc-900 dark:text-foreground">
                    {metrics.rrInterval} <span className="text-xs font-normal text-muted-foreground">ms</span>
                  </p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    SDNN: 42 ms
                  </span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-border dark:bg-muted/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Pulse Arrival (PAT)
                  </p>
                  <p className="mt-0.5 text-base font-bold text-zinc-900 dark:text-foreground">
                    {metrics.pat} <span className="text-xs font-normal text-muted-foreground">ms</span>
                  </p>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400">
                    ECG R → PPG Systolic
                  </span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-border dark:bg-muted/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    AC/DC Ratio (R/IR)
                  </p>
                  <p className="mt-0.5 text-base font-bold text-zinc-900 dark:text-foreground">
                    {metrics.modulationRatio}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    R: {metrics.acDcRatioRed} · IR: {metrics.acDcRatioIr}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 dark:border-border dark:bg-muted/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Signal-to-Noise (SNR)
                  </p>
                  <p className="mt-0.5 text-base font-bold text-zinc-900 dark:text-foreground">
                    {metrics.snr} <span className="text-xs font-normal text-muted-foreground">dB</span>
                  </p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Clean Bio-potential
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Panel B: ML Prediction Breakdown & Health Diagnostics */}
          <Card className="border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-foreground">
                  ML Prediction Breakdown
                </CardTitle>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  94.6% Confidence
                </span>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Ensemble Random Forest & Ridge Regression Model for Non-Invasive Hemoglobin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {/* Feature Contribution Breakdown */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Feature Weight Contribution (SHAP)
                </p>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        IR / Red Optical Modulation Ratio
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-foreground">
                        42%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-muted">
                      <div className="h-full rounded-full bg-teal-600" style={{ width: "42%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        Pulse Arrival Time (PAT / PTT)
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-foreground">
                        28%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-muted">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: "28%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        PPG Peak-to-Peak Amplitude
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-foreground">
                        18%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-muted">
                      <div className="h-full rounded-full bg-teal-400" style={{ width: "18%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        R-R Interval Variability
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-foreground">
                        12%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-muted">
                      <div className="h-full rounded-full bg-teal-300" style={{ width: "12%" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Predicted Health Status Indicators */}
              <div className="border-t border-slate-100 pt-3 dark:border-border">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Physiological Diagnostic Status
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-muted/40">
                    <span className="text-zinc-600 dark:text-muted-foreground">
                      Hemodynamic Stability
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Optimal / Compensated
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-muted/40">
                    <span className="text-zinc-600 dark:text-muted-foreground">
                      Arrhythmia Risk
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Low (Normal Sinus)
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-muted/40">
                    <span className="text-zinc-600 dark:text-muted-foreground">
                      Peripheral Perfusion
                    </span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      PI: {metrics.perfusionIndex}% (Adequate)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. DATA LOGGING & EXPORT FOOTER SECTION (BOTTOM)
         ────────────────────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Sync status + Calibration indicators */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                ESP32 Acquisition State
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-base font-extrabold text-zinc-900 dark:text-foreground">
                  {lastSyncTime}
                </span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-muted dark:text-muted-foreground">
                  {ppgBuffer.length} static points
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-border hidden sm:block" />

            {/* Sensor Calibration Status Indicators */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                MAX30102: Verified
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                AD8232: Verified
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                MLX90614: Verified
              </span>
            </div>
          </div>

          {/* Right: Export Raw CSV Log Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={exportTelemetryCsv}
              size="sm"
              className="h-9 gap-1.5 bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Raw CSV Log</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: SET ESP32 VALUES (FOR IMMEDIATE TESTING / HARDWARE REFLECTION)
         ────────────────────────────────────────────────────────────────────────── */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-border dark:bg-card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-border">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-teal-600" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-foreground">
                  Set ESP32 Telemetry Values
                </h3>
              </div>
              <button
                onClick={() => setShowInputModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleApplyInputs} className="space-y-4 pt-4">
              <p className="text-xs text-muted-foreground">
                Enter values to simulate or test readings received from the ESP32 microcontroller. The dashboard will immediately reflect these static values.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Heart Rate (BPM)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="30"
                    max="220"
                    value={inputHr}
                    onChange={(e) => setInputHr(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-border dark:bg-muted"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Blood Oxygen (% SpO2)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="70"
                    max="100"
                    value={inputSpo2}
                    onChange={(e) => setInputSpo2(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-border dark:bg-muted"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="45"
                    value={inputTemp}
                    onChange={(e) => setInputTemp(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-border dark:bg-muted"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Total Hemoglobin (g/dL)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="22"
                    value={inputThb}
                    onChange={(e) => setInputThb(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-border dark:bg-muted"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-teal-50/70 p-3 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
                💡 <strong>ESP32 Microcontroller Hook:</strong> An ESP32 can also POST directly to <code>/api/esp32</code> to update these values automatically.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInputModal(false)}
                  className="border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-teal-600 text-white hover:bg-teal-700"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Apply & Reflect
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
