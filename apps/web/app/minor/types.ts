export interface PPGSample {
  time: number; // relative second, e.g. 1.24s
  label: string; // display label e.g. "1.2s"
  red: number; // Red channel photoplethysmogram
  ir: number; // Infrared channel photoplethysmogram
  redRaw: number;
  irRaw: number;
}

export interface ECGSample {
  time: number;
  label: string;
  ecg: number; // Filtered ECG mV
  ecgRaw: number; // Raw ECG mV with noise/drift
}

export interface PhysiologicalMetrics {
  heartRate: number; // BPM
  spo2: number; // %
  tempObject: number; // °C
  tempAmbient: number; // °C
  thb: number; // g/dL
  thbCiLow: number;
  thbCiHigh: number;
  rrInterval: number; // ms
  pat: number; // Pulse Arrival Time (ms)
  acDcRatioRed: number;
  acDcRatioIr: number;
  modulationRatio: number;
  snr: number; // dB
  perfusionIndex: number; // %
  mlConfidence: number; // %
  rSquared: number;
  mae: number;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  baselineHr: number;
  baselineSpo2: number;
  baselineTemp: number;
  baselinetHb: number;
  conditionNotes: string;
}

export type TimebaseScale = "1s" | "5s" | "10s";
export type FilterMode = "bandpass" | "raw";
export type DataSource = "esp32_live" | "simulated";
