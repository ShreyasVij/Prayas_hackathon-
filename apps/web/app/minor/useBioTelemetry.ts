"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PatientProfile,
  PhysiologicalMetrics,
  PPGSample,
  ECGSample,
  TimebaseScale,
  FilterMode,
} from "./types";

export const PATIENT_PROFILES: PatientProfile[] = [
  {
    id: "PT-8802",
    name: "Johnathan Doe (Adult Male, 45y)",
    age: 45,
    gender: "Male",
    baselineHr: 72,
    baselineSpo2: 98.2,
    baselineTemp: 36.5,
    baselinetHb: 14.2,
    conditionNotes: "Post-op vitals monitoring · Normal Sinus Rhythm",
  },
  {
    id: "PT-8803",
    name: "Eleanor Vance (Adult Female, 32y)",
    age: 32,
    gender: "Female",
    baselineHr: 78,
    baselineSpo2: 99.0,
    baselineTemp: 36.7,
    baselinetHb: 13.6,
    conditionNotes: "Normative physiological screening · High signal clarity",
  },
  {
    id: "PT-8804",
    name: "Lucas Miller (Pediatric Male, 12y)",
    age: 12,
    gender: "Male",
    baselineHr: 88,
    baselineSpo2: 98.6,
    baselineTemp: 36.8,
    baselinetHb: 12.8,
    conditionNotes: "Athletic youth protocol · Elevated baseline HR",
  },
  {
    id: "PT-8801",
    name: "Margaret Chen (Geriatric Female, 68y)",
    age: 68,
    gender: "Female",
    baselineHr: 63,
    baselineSpo2: 96.8,
    baselineTemp: 36.3,
    baselinetHb: 12.1,
    conditionNotes: "Mild resting bradycardia · Compensated hemodynamic status",
  },
];

// Helper to generate a realistic static physiological signal trace of length 10.0 seconds
function generateStaticWaveforms(hr: number) {
  const period = 60 / hr; // e.g. 0.833 s for 72 BPM
  const duration = 10.0; // 10 second buffer
  const sampleRate = 30; // 30 Hz gives 300 clean points
  const totalPoints = Math.round(duration * sampleRate);

  const ppg: PPGSample[] = [];
  const ecg: ECGSample[] = [];

  for (let i = 0; i <= totalPoints; i++) {
    const t = Number((i / sampleRate).toFixed(2));
    const cyclePhase = (t % period) / period;

    // ─── 1. ECG AD8232 Static Waveform ────────────────────
    let ecgSignal = 0;

    // P wave
    const pPhase = (cyclePhase - 0.12) / 0.035;
    ecgSignal += 0.18 * Math.exp(-0.5 * pPhase * pPhase);

    // Q wave
    const qPhase = (cyclePhase - 0.185) / 0.012;
    ecgSignal -= 0.16 * Math.exp(-0.5 * qPhase * qPhase);

    // R wave (sharp peak)
    const rPhase = (cyclePhase - 0.205) / 0.015;
    ecgSignal += 1.35 * Math.exp(-0.5 * rPhase * rPhase);

    // S wave
    const sPhase = (cyclePhase - 0.235) / 0.016;
    ecgSignal -= 0.32 * Math.exp(-0.5 * sPhase * sPhase);

    // T wave
    const tPhase = (cyclePhase - 0.42) / 0.075;
    ecgSignal += 0.35 * Math.exp(-0.5 * tPhase * tPhase);

    // Raw mode noise & baseline drift
    const hum = 0.07 * Math.sin(2 * Math.PI * 50 * t);
    const drift = 0.12 * Math.sin(2 * Math.PI * 0.25 * t);
    const ecgRaw = ecgSignal + hum + drift;

    // ─── 2. PPG MAX30102 Static Waveform ──────────────────
    const ppgPhase = ((t - 0.21 * (70 / hr)) % period) / period;
    const normPpgPhase = ppgPhase < 0 ? ppgPhase + 1 : ppgPhase;

    let ppgShape = 0;
    if (normPpgPhase < 0.32) {
      const sysPhase = (normPpgPhase - 0.18) / 0.07;
      ppgShape = 0.95 * Math.exp(-0.5 * sysPhase * sysPhase);
    } else if (normPpgPhase < 0.52) {
      const notchPhase = (normPpgPhase - 0.35) / 0.035;
      const diaPhase = (normPpgPhase - 0.44) / 0.055;
      ppgShape =
        0.38 * Math.exp(-0.5 * notchPhase * notchPhase) +
        0.52 * Math.exp(-0.5 * diaPhase * diaPhase);
    } else {
      const decay = Math.exp(-(normPpgPhase - 0.52) * 5.2);
      ppgShape = 0.35 * decay;
    }

    const ppgIr = ppgShape * 1.15;
    const ppgRed = ppgShape * 0.92;

    const optDrift = 0.15 * Math.sin(2 * Math.PI * 0.2 * t);
    const ppgIrRaw = ppgIr + optDrift;
    const ppgRedRaw = ppgRed + optDrift * 0.9;

    const label = `${t.toFixed(1)}s`;

    ppg.push({
      time: t,
      label,
      red: Number(ppgRed.toFixed(3)),
      ir: Number(ppgIr.toFixed(3)),
      redRaw: Number(ppgRedRaw.toFixed(3)),
      irRaw: Number(ppgIrRaw.toFixed(3)),
    });

    ecg.push({
      time: t,
      label,
      ecg: Number(ecgSignal.toFixed(3)),
      ecgRaw: Number(ecgRaw.toFixed(3)),
    });
  }

  return { ppg, ecg };
}

export function useBioTelemetry() {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("PT-8802");
  const [timebase, setTimebase] = useState<TimebaseScale>("5s");
  const [filterMode, setFilterMode] = useState<FilterMode>("bandpass");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Static Capture");

  const patient =
    PATIENT_PROFILES.find((p) => p.id === selectedPatientId) ??
    PATIENT_PROFILES[0];

  // Static Metrics State (sourced from ESP32 default capture)
  const [metrics, setMetrics] = useState<PhysiologicalMetrics>({
    heartRate: patient.baselineHr,
    spo2: patient.baselineSpo2,
    tempObject: patient.baselineTemp,
    tempAmbient: 24.1,
    thb: patient.baselinetHb,
    thbCiLow: Number((patient.baselinetHb - 0.4).toFixed(1)),
    thbCiHigh: Number((patient.baselinetHb + 0.4).toFixed(1)),
    rrInterval: Math.round(60000 / patient.baselineHr),
    pat: 210,
    acDcRatioRed: 0.042,
    acDcRatioIr: 0.051,
    modulationRatio: 0.824,
    snr: 28.4,
    perfusionIndex: 4.8,
    mlConfidence: 94.6,
    rSquared: 0.92,
    mae: 0.38,
  });

  // Static Sparkline History
  const [hrHistory, setHrHistory] = useState<number[]>([
    71, 72, 72, 73, 72, 72, 71, 73, 72, 72, 73, 72, 72,
  ]);

  // Synchronize when patient is selected
  useEffect(() => {
    setMetrics((prev) => ({
      ...prev,
      heartRate: patient.baselineHr,
      spo2: patient.baselineSpo2,
      tempObject: patient.baselineTemp,
      thb: patient.baselinetHb,
      thbCiLow: Number((patient.baselinetHb - 0.4).toFixed(1)),
      thbCiHigh: Number((patient.baselinetHb + 0.4).toFixed(1)),
      rrInterval: Math.round(60000 / patient.baselineHr),
    }));
  }, [patient]);

  // Generate static waveforms based on the current static HR
  const staticBuffers = useMemo(() => {
    return generateStaticWaveforms(metrics.heartRate);
  }, [metrics.heartRate]);

  // Sliced buffers based on timebase scale (1s, 5s, 10s)
  const windowLength = useMemo(() => {
    switch (timebase) {
      case "1s":
        return 1.0;
      case "5s":
        return 5.0;
      case "10s":
        return 10.0;
      default:
        return 5.0;
    }
  }, [timebase]);

  const ppgBuffer = useMemo(() => {
    return staticBuffers.ppg.filter((s) => s.time <= windowLength);
  }, [staticBuffers.ppg, windowLength]);

  const ecgBuffer = useMemo(() => {
    return staticBuffers.ecg.filter((s) => s.time <= windowLength);
  }, [staticBuffers.ecg, windowLength]);

  // Fetch or sync values from ESP32 API endpoint
  const fetchEsp32Data = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/esp32");
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.metrics) {
          const m = json.data.metrics;
          setMetrics((prev) => ({
            ...prev,
            heartRate: m.heartRate ?? prev.heartRate,
            spo2: m.spo2 ?? prev.spo2,
            tempObject: m.tempObject ?? prev.tempObject,
            tempAmbient: m.tempAmbient ?? prev.tempAmbient,
            thb: m.thb ?? prev.thb,
            thbCiLow: Number(((m.thb ?? prev.thb) - 0.4).toFixed(1)),
            thbCiHigh: Number(((m.thb ?? prev.thb) + 0.4).toFixed(1)),
            rrInterval: m.rrInterval ?? Math.round(60000 / (m.heartRate ?? prev.heartRate)),
            pat: m.pat ?? prev.pat,
          }));
          setLastSyncTime(new Date().toLocaleTimeString());
        }
      }
    } catch {
      // Keep static values intact on network failure
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Update ESP32 metrics directly (for manual test or local ESP32 push)
  const applyEsp32Metrics = useCallback(
    (newValues: Partial<PhysiologicalMetrics>) => {
      setMetrics((prev) => {
        const next = { ...prev, ...newValues };
        if (newValues.heartRate) {
          next.rrInterval = Math.round(60000 / newValues.heartRate);
        }
        if (newValues.thb) {
          next.thbCiLow = Number((newValues.thb - 0.4).toFixed(1));
          next.thbCiHigh = Number((newValues.thb + 0.4).toFixed(1));
        }
        return next;
      });
      setLastSyncTime(new Date().toLocaleTimeString());
    },
    []
  );

  // CSV Export for the static session
  const exportTelemetryCsv = useCallback(() => {
    const timestampStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `esp32_static_telemetry_${patient.id}_${timestampStr}.csv`;

    const headers = [
      "time_seconds",
      "patient_id",
      "ecg_filtered_mv",
      "ecg_raw_mv",
      "ppg_red_filtered",
      "ppg_ir_filtered",
      "ppg_red_raw",
      "ppg_ir_raw",
      "heart_rate_bpm",
      "spo2_percent",
      "temp_object_c",
      "temp_ambient_c",
      "thb_estimated_g_dl",
      "rr_interval_ms",
      "pat_ms",
      "snr_db",
    ];

    const rows = ecgBuffer.map((ecg, i) => {
      const ppg = ppgBuffer[i] || { red: 0, ir: 0, redRaw: 0, irRaw: 0 };
      return [
        ecg.time,
        patient.id,
        ecg.ecg,
        ecg.ecgRaw,
        ppg.red,
        ppg.ir,
        ppg.redRaw,
        ppg.irRaw,
        metrics.heartRate,
        metrics.spo2,
        metrics.tempObject,
        metrics.tempAmbient,
        metrics.thb,
        metrics.rrInterval,
        metrics.pat,
        metrics.snr,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [ecgBuffer, ppgBuffer, metrics, patient.id]);

  return {
    patient,
    selectedPatientId,
    setSelectedPatientId,
    patientProfiles: PATIENT_PROFILES,
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
  };
}
