"use client";

import React, { useState, useRef, ChangeEvent, DragEvent } from "react";
import { 
  UploadCloud, 
  FileImage, 
  X, 
  Sparkles, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  Activity, 
  Eye, 
  ChevronRight,
  ShieldAlert,
  Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface DiagnosticResult {
  scanId: string;
  modality: string;
  status: "completed" | "flagged" | "inconclusive";
  primaryFinding: string;
  confidenceScore: number; // e.g. 94.6%
  riskLevel: "Normal / Low" | "Moderate" | "Critical / Immediate Attention";
  abnormalities: {
    label: string;
    probability: number;
    severity: "low" | "medium" | "high";
    location?: string;
  }[];
  clinicalRecommendations: string[];
  analyzedAt: string;
}

export type ScanModality = 
  | "chest-xray" 
  | "brain-mri" 
  | "ct-abdomen" 
  | "skin-dermoscopy" 
  | "general-radiology";

export function MedicalImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modality, setModality] = useState<ScanModality>("chest-xray");
  const [isDragging, setIsDragging] = useState(false);
  
  // Inference execution states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<DiagnosticResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accepted medical image types
  const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/dicom", "application/dicom"];
  const maxSizeBytes = 50 * 1024 * 1024; // 50MB

  const handleFile = (file: File) => {
    setErrorMessage(null);
    setAnalysisResult(null);

    // Validate size
    if (file.size > maxSizeBytes) {
      setErrorMessage("File exceeds the 50MB clinical imaging threshold.");
      return;
    }

    setSelectedFile(file);

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setProgressPercent(0);
    setAnalysisStep("");
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================================================================
  // PLUG IN YOUR ML MODEL API ENDPOINT HERE
  // =========================================================================
  // This asynchronous function simulates sending the image payload to your
  // ML diagnostic service (e.g. FastAPI /diagnose/{disease_id} or Next.js /api/ocr/analyze).
  // Replace the setTimeout steps below with your real fetch / axios request:
  //
  // Example real implementation:
  //
  // const formData = new FormData();
  // formData.append("image", selectedFile);
  // formData.append("modality", modality);
  // const response = await fetch("/api/ai/diagnostics/infer", {
  //   method: "POST",
  //   body: formData,
  // });
  // const data = await response.json();
  // =========================================================================
  const handleTriggerMLModel = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    setAnalysisResult(null);
    setProgressPercent(15);
    setAnalysisStep("Initializing tensor preprocessing pipeline...");

    try {
      // Step 1: Simulated preprocessing
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProgressPercent(45);
      setAnalysisStep("Normalizing DICOM/Pixel channels & feature extraction...");

      // Step 2: Simulated model inference
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setProgressPercent(75);
      setAnalysisStep(`Running deep convolutional diagnostic model (${modality})...`);

      // Step 3: Simulated clinical report generation
      await new Promise((resolve) => setTimeout(resolve, 900));
      setProgressPercent(100);
      setAnalysisStep("Generating structured radiological telemetry report...");

      await new Promise((resolve) => setTimeout(resolve, 400));

      // Mock ML model diagnostic output based on modality
      const mockResult: DiagnosticResult = {
        scanId: `SCN-${Math.floor(100000 + Math.random() * 900000)}`,
        modality: modality.toUpperCase().replace("-", " "),
        status: "completed",
        primaryFinding: 
          modality === "chest-xray" 
            ? "Mild right-basilar consolidative density with elevated peri-bronchial markings."
            : modality === "brain-mri"
            ? "No evidence of acute intracranial hemorrhage or midline shift; benign focal white-matter hyperintensity."
            : modality === "ct-abdomen"
            ? "Normal solid visceral perfusion; no acute appendiceal enlargement or free fluid."
            : "Atypical melanocytic pattern with low border irregularity index; recommend routine monitoring.",
        confidenceScore: 94.6,
        riskLevel: modality === "chest-xray" ? "Moderate" : "Normal / Low",
        abnormalities: [
          {
            label: modality === "chest-xray" ? "Lower Lobe Infiltration" : "Signal Variance",
            probability: 88.4,
            severity: modality === "chest-xray" ? "medium" : "low",
            location: modality === "chest-xray" ? "Right lower lobe" : "Frontal lobe"
          },
          {
            label: "Pleural Effusion",
            probability: 6.2,
            severity: "low",
            location: "Bilateral bases"
          },
          {
            label: "Cardiomegaly",
            probability: 11.5,
            severity: "low",
            location: "Cardiothoracic ratio 0.48"
          }
        ],
        clinicalRecommendations: [
          "Correlate findings with patient auscultation and SpO2 trends.",
          "Consider repeat radiograph in 10-14 days post antimicrobial therapy if symptoms persist.",
          "Archive diagnostic DICOM slice to patient's verified MediLocker health record."
        ],
        analyzedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      };

      setAnalysisResult(mockResult);
    } catch (err: any) {
      console.error("ML Inference error:", err);
      setErrorMessage(err.message || "Failed to complete ML inference. Check server connectivity.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shrink-0 shadow-xs">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                Medical Image Upload & ML Diagnostics
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100/70 text-teal-800 border border-teal-200">
                AI Vision
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Upload radiological scans or clinical imagery for computer-vision assisted diagnostic inference.
            </p>
          </div>
        </div>

        {/* Modality Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="modality" className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-zinc-400" />
            Modality:
          </label>
          <select
            id="modality"
            value={modality}
            onChange={(e) => setModality(e.target.value as ScanModality)}
            disabled={isAnalyzing}
            className="text-xs font-semibold bg-slate-50/80 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-1.5 text-zinc-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:outline-none transition-all shadow-2xs"
          >
            <option value="chest-xray">Chest X-Ray / Radiograph</option>
            <option value="brain-mri">Brain MRI (T1/T2 Axial)</option>
            <option value="ct-abdomen">Abdominal CT Scan</option>
            <option value="skin-dermoscopy">Dermatology / Skin Lesion</option>
            <option value="general-radiology">General Radiograph</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="ml-auto text-rose-600 hover:text-rose-900 font-bold"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Upload & Dropzone Area */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "group relative border-2 border-dashed rounded-2xl p-8 sm:p-10 transition-all duration-200 text-center flex flex-col items-center justify-center gap-4 cursor-pointer",
            isDragging 
              ? "border-teal-500 bg-teal-50/70 scale-[0.99] ring-4 ring-teal-500/10" 
              : "border-slate-300 hover:border-teal-500 bg-gradient-to-b from-slate-50/80 via-slate-50/40 to-teal-50/20 hover:from-teal-50/30 hover:to-teal-50/50 shadow-2xs hover:shadow-sm"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.dcm,.dicom"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="h-14 w-14 rounded-2xl bg-teal-50/90 text-teal-600 border border-teal-100 shadow-xs group-hover:scale-110 group-hover:bg-teal-100/80 transition-all duration-200 flex items-center justify-center">
            <UploadCloud className="h-7 w-7" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <p className="text-sm font-bold text-zinc-800">
              Drag & drop medical image, or <span className="text-teal-600 hover:underline">browse file</span>
            </p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Supports high-resolution DICOM, PNG, JPEG, WebP (up to 50MB)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-zinc-600 font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 shadow-2xs">X-Ray</span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 shadow-2xs">CT Slices</span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 shadow-2xs">MRI Neuro</span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 shadow-2xs">Dermoscopy</span>
          </div>
        </div>
      ) : (
        /* Image Preview & Model Trigger Workspace */
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Visual Scan Preview Box */}
            <div className="md:col-span-5 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 relative group aspect-square flex items-center justify-center shadow-md">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Medical scan preview"
                  className="w-full h-full object-contain filter contrast-110"
                />
              )}

              {/* Scanning visual overlay during analysis */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-teal-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-4">
                  <div className="w-full absolute top-0 left-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse" />
                  <Loader2 className="h-8 w-8 text-teal-400 animate-spin mb-2" />
                  <span className="text-xs font-semibold text-teal-100 tracking-wider">
                    SCANNING TENSORS
                  </span>
                </div>
              )}

              {/* Image metadata overlay pill */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-zinc-900/85 backdrop-blur-md border border-zinc-700/60 flex items-center justify-between text-[11px] text-zinc-300 font-medium">
                <span className="truncate max-w-[140px]">{selectedFile.name}</span>
                <span className="tabular-nums">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            </div>

            {/* Scan Controls & Pipeline Trigger */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    Selected Image Pipeline
                  </span>
                  <button
                    onClick={handleReset}
                    disabled={isAnalyzing}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-rose-600 transition-colors focus:outline-none"
                  >
                    <X className="h-3.5 w-3.5" />
                    Replace Image
                  </button>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/90 space-y-2.5 text-xs shadow-2xs">
                  <div className="flex items-center justify-between text-zinc-600">
                    <span className="text-zinc-500">Target Modality:</span>
                    <span className="font-bold text-zinc-900 uppercase tracking-tight">{modality}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-600">
                    <span className="text-zinc-500">File Type:</span>
                    <span className="font-mono text-zinc-900 font-semibold">{selectedFile.type || "DICOM / Custom"}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-600">
                    <span className="text-zinc-500">Pipeline State:</span>
                    <span className="font-bold text-teal-700">
                      {isAnalyzing ? "Processing..." : analysisResult ? "Inference Complete" : "Ready for ML Inference"}
                    </span>
                  </div>
                </div>

                {/* Processing status bar */}
                {isAnalyzing && (
                  <div className="space-y-2.5 p-4 bg-teal-50/80 border border-teal-200 rounded-xl shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-950">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="h-3.5 w-3.5 text-teal-600 animate-spin" />
                        {analysisStep}
                      </span>
                      <span className="tabular-nums font-mono">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-teal-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleTriggerMLModel}
                  disabled={isAnalyzing}
                  className={cn(
                    "w-full sm:flex-1 py-3 px-5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all duration-150",
                    isAnalyzing
                      ? "bg-slate-200 text-zinc-400 cursor-not-allowed"
                      : "bg-teal-600 hover:bg-teal-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing Image...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Run Diagnostic ML Model
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isAnalyzing}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-zinc-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Inference Output Report Card */}
          {analysisResult && (
            <div className="mt-5 p-6 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <h3 className="text-sm font-extrabold text-zinc-900">
                      Inference Telemetry Result
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      Report Ref: {analysisResult.scanId} • {analysisResult.analyzedAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs",
                    analysisResult.riskLevel.includes("Critical") 
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : analysisResult.riskLevel.includes("Moderate")
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}>
                    {analysisResult.riskLevel}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs tabular-nums">
                    Confidence: {analysisResult.confidenceScore}%
                  </span>
                </div>
              </div>

              {/* Primary Finding */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Primary Radiographic Finding
                </span>
                <p className="text-xs font-medium text-zinc-800 mt-1.5 bg-white p-3.5 rounded-xl border border-slate-200/90 leading-relaxed shadow-xs">
                  {analysisResult.primaryFinding}
                </p>
              </div>

              {/* Detected Probabilities Table */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Feature Probability Distribution
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
                  {analysisResult.abnormalities.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200/90 rounded-xl space-y-1 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-800">{item.label}</span>
                        <span className="font-bold text-teal-700 tabular-nums">{item.probability}%</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">{item.location}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Clinical Action Recommendations
                </span>
                <ul className="mt-1.5 space-y-1.5 text-xs text-zinc-600 leading-relaxed">
                  {analysisResult.clinicalRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
