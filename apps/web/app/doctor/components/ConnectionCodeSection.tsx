"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Lock, 
  Unplug, 
  ExternalLink,
  Info,
  Copy
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface ConnectedSession {
  connectionCode: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  connectedAt: string;
  accessTier: "Emergency Full" | "Clinical Shared" | "Telehealth Consult";
  expiryMinutes: number;
}

export function ConnectionCodeSection() {
  // Raw 16-character alphanumeric string
  const [rawCode, setRawCode] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectedSession, setConnectedSession] = useState<ConnectedSession | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Maximum allowed alphanumeric length
  const CODE_LENGTH = 16;

  /**
   * Strictly enforces alphanumeric characters and a 16-character cap.
   * Strips out spaces, dashes, and special characters automatically.
   */
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const inputVal = e.target.value;
    
    // Clean string: keep only alphanumeric characters and force uppercase
    const cleaned = inputVal.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    if (cleaned.length <= CODE_LENGTH) {
      setRawCode(cleaned);
    }
  };

  /**
   * Helper to format code into 4-character blocks for readability
   * e.g. "ABCD-EFGH-1234-5678"
   */
  const getFormattedCode = (code: string) => {
    const parts = code.match(/.{1,4}/g);
    return parts ? parts.join("-") : code;
  };

  // =========================================================================
  // PLUG IN YOUR PATIENT CONNECTION / SESSION VERIFICATION API ENDPOINT HERE
  // =========================================================================
  // This asynchronous function validates the 16-digit code and establishes
  // a secure doctor-patient session.
  // Replace the simulated logic below with your backend verification route:
  //
  // Example real implementation:
  //
  // const res = await fetch("/api/emergency/nfc/authorize-doctor", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ connectionCode: rawCode }),
  // });
  // const data = await res.json();
  // =========================================================================
  const handleConnect = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    // Basic Validation Logic
    if (rawCode.length !== CODE_LENGTH) {
      setErrorMessage(`Please enter a complete ${CODE_LENGTH}-character alphanumeric code.`);
      return;
    }

    if (!/^[A-Z0-9]{16}$/.test(rawCode)) {
      setErrorMessage("Code must strictly contain alphanumeric characters (A-Z, 0-9).");
      return;
    }

    setIsConnecting(true);

    try {
      // Simulate backend API network roundtrip
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Simulate a successful verification response
      const mockSession: ConnectedSession = {
        connectionCode: rawCode,
        patientId: `PT-${rawCode.slice(0, 4)}-${rawCode.slice(-4)}`,
        patientName: "Aarav S. Mehta",
        age: 42,
        gender: "Male",
        connectedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        accessTier: "Clinical Shared",
        expiryMinutes: 60
      };

      setConnectedSession(mockSession);
    } catch (err: any) {
      console.error("Connection failed:", err);
      setErrorMessage(err.message || "Failed to establish secure patient handshake.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setConnectedSession(null);
    setRawCode("");
    setErrorMessage(null);
  };

  const handleCopyCode = () => {
    if (rawCode) {
      navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fillDemoCode = () => {
    setRawCode("MED99824ABCD1024");
    setErrorMessage(null);
  };

  const isComplete = rawCode.length === CODE_LENGTH;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-200">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                16-Digit Connection Code
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-100/70 text-teal-800 border border-teal-200">
                Secure Handshake
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              Enter the patient&apos;s 16-character access token to decrypt and stream verified clinical records.
            </p>
          </div>
        </div>

        {/* Demo Code Helper */}
        {!connectedSession && (
          <button
            type="button"
            onClick={fillDemoCode}
            className="text-[11px] font-semibold text-teal-600 hover:text-teal-800 hover:underline self-start sm:self-auto transition-colors"
          >
            Insert Demo 16-Char Key
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {!connectedSession ? (
        /* Connection Input Form */
        <form onSubmit={handleConnect} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="connection-code-input"
                className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5"
              >
                <Lock className="h-3.5 w-3.5 text-zinc-400" />
                Connection Code (16 Alphanumeric Chars)
              </label>

              {/* Strict length counter badge with refined empty-state style */}
              <span className={cn(
                "px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all tabular-nums",
                rawCode.length === 0
                  ? "bg-slate-100/90 text-zinc-400 border border-slate-200/80"
                  : isComplete 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs" 
                  : "bg-teal-50 text-teal-700 border border-teal-200/80"
              )}>
                {rawCode.length} / {CODE_LENGTH}
              </span>
            </div>

            <div className="relative">
              <input
                id="connection-code-input"
                type="text"
                maxLength={CODE_LENGTH}
                value={rawCode}
                onChange={handleInputChange}
                placeholder="e.g. ABCD1234EFGH5678"
                autoComplete="off"
                spellCheck="false"
                disabled={isConnecting}
                className={cn(
                  "w-full px-4 py-3.5 bg-slate-50/80 border rounded-xl font-mono text-base sm:text-lg tracking-widest tabular-nums text-zinc-900 placeholder:text-zinc-400 placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:ring-2 transition-all uppercase shadow-2xs",
                  isComplete
                    ? "border-emerald-400 focus:ring-emerald-400/30 bg-emerald-50/10"
                    : "border-slate-200 hover:border-slate-300 focus:border-teal-500 focus:ring-teal-500/20"
                )}
              />

              {/* Status icon inside input */}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isComplete && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </div>
            </div>

            {/* Readability preview if user has started typing */}
            {rawCode.length > 0 && (
              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 pt-0.5">
                <span>Formatted Key: <span className="font-mono font-bold text-zinc-900 tracking-wider">{getFormattedCode(rawCode)}</span></span>
                <span className="text-zinc-400 font-medium">Alphanumeric strictly enforced</span>
              </div>
            )}
          </div>

          {/* Submission and Helper Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 pt-2">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Info className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="leading-relaxed">Patient generates this token from MediLocker Vault or NFC band.</span>
            </div>

            <button
              type="submit"
              disabled={!isComplete || isConnecting}
              className={cn(
                "w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all duration-150",
                !isComplete || isConnecting
                  ? "bg-slate-100 text-zinc-400 border border-slate-200 cursor-not-allowed"
                  : "bg-teal-600 hover:bg-teal-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              )}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying Handshake...
                </>
              ) : (
                <>
                  <span>Connect</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Connected Patient Active Session State */
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-200/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Secure Clinical Session Active
                  </h3>
                  <p className="text-xs font-semibold text-emerald-800">
                    {connectedSession.patientName} ({connectedSession.gender}, {connectedSession.age}y)
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                {connectedSession.accessTier}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Patient Ref</span>
                <p className="font-mono font-bold text-zinc-800 truncate">{connectedSession.patientId}</p>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Connected At</span>
                <p className="font-medium text-zinc-800">{connectedSession.connectedAt}</p>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Session TTL</span>
                <p className="font-medium text-zinc-800">{connectedSession.expiryMinutes} mins</p>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Handshake</span>
                <p className="font-mono text-emerald-700 font-bold">{getFormattedCode(connectedSession.connectionCode)}</p>
              </div>
            </div>
          </div>

          {/* Action buttons for connected session */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleDisconnect}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-zinc-600 hover:text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect Session
            </button>

            <a
              href={`/doctor/patient/${connectedSession.patientId}`}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <span>View Patient Records</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
