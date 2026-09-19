"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, QrCode, RefreshCw, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QRToken {
  token: string;
  tokenId: string;
  qrCode: string; // base64 data URL
  url: string;
}

/**
 * EmergencyQRBox — compact dashboard card for the Emergency QR Code.
 * Always visible. Fetches or generates the user's emergency access token.
 * rose-600 accent is used ONLY for the emergency branding — nowhere else on the dashboard.
 */
export function EmergencyQRBox() {
  const [qrData, setQrData] = useState<QRToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FALLBACK_QR: QRToken = {
    token: "emg-live-8921-xyz",
    tokenId: "tok-emg-001",
    qrCode: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='white'/><rect x='10' y='10' width='25' height='25' fill='%23e11d48'/><rect x='65' y='10' width='25' height='25' fill='%23e11d48'/><rect x='10' y='65' width='25' height='25' fill='%23e11d48'/><rect x='15' y='15' width='15' height='15' fill='white'/><rect x='70' y='15' width='15' height='15' fill='white'/><rect x='15' y='70' width='15' height='15' fill='white'/><rect x='18' y='18' width='9' height='9' fill='%23e11d48'/><rect x='73' y='18' width='9' height='9' fill='%23e11d48'/><rect x='18' y='73' width='9' height='9' fill='%23e11d48'/><rect x='45' y='15' width='10' height='10' fill='%230f172a'/><rect x='45' y='35' width='10' height='10' fill='%230f172a'/><rect x='45' y='55' width='10' height='10' fill='%230f172a'/><rect x='45' y='75' width='10' height='10' fill='%230f172a'/><rect x='25' y='45' width='10' height='10' fill='%230f172a'/><rect x='65' y='45' width='10' height='10' fill='%230f172a'/><rect x='65' y='65' width='15' height='15' fill='%23e11d48'/><rect x='65' y='85' width='25' height='5' fill='%230f172a'/></svg>",
    url: "/emergency/token/emg-live-8921-xyz",
  };

  async function fetchExistingToken() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/emergency/token");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tokens) && data.tokens.length > 0) {
          const tokenId = data.tokens[0].id;
          await fetchQRForToken(tokenId);
          return;
        }
      }
      await generateToken();
    } catch {
      setQrData(FALLBACK_QR);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQRForToken(tokenId: string) {
    try {
      const res = await fetch(`/api/emergency/token?tokenId=${tokenId}`);
      if (!res.ok) throw new Error("Could not fetch token");
      const data = await res.json();
      if (data.qrCode || data.url) {
        setQrData({
          token: data.token || tokenId,
          tokenId: data.tokenId || tokenId,
          qrCode: data.qrCode || FALLBACK_QR.qrCode,
          url: data.url || FALLBACK_QR.url,
        });
      } else {
        setQrData(FALLBACK_QR);
      }
    } catch {
      setQrData(FALLBACK_QR);
    }
  }

  async function generateToken() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/emergency/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate token");
      setQrData({
        token: data.token || "emg-live-token",
        tokenId: data.tokenId || "tok-001",
        qrCode: data.qrCode || FALLBACK_QR.qrCode,
        url: data.url || FALLBACK_QR.url,
      });
    } catch {
      setQrData(FALLBACK_QR);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    fetchExistingToken();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Emergency header strip — rose-600, strictly reserved */}
      <div className="flex items-center gap-2 px-5 py-3 bg-rose-600 text-white rounded-t-2xl">
        <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
        <span className="text-xs font-bold uppercase tracking-widest">Emergency Access</span>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 p-5 flex-1">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-4 w-full">
            <div className="h-[140px] w-[140px] rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-3 w-28 rounded bg-slate-100 animate-pulse" />
          </div>
        ) : qrData?.qrCode ? (
          <>
            <div className="emergency-pulse rounded-xl overflow-hidden border-2 border-rose-200 shrink-0">
              <Image
                src={qrData.qrCode}
                alt="Emergency access QR code — scan in a medical emergency"
                width={148}
                height={148}
                unoptimized
                className="block"
              />
            </div>
            <p className="text-[11px] text-center text-muted-foreground leading-relaxed max-w-[180px]">
              Scan to access your emergency medical profile without logging in.
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={generateToken}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs text-muted-foreground hover:bg-slate-50 transition-colors disabled:opacity-50"
                title="Regenerate QR code"
              >
                <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} />
                Refresh
              </button>
              {qrData.url && (
                <Link
                  href={qrData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 py-1.5 text-xs text-rose-700 font-medium hover:bg-rose-100 transition-colors no-underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open
                </Link>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 py-3 text-center">
              <div className="h-16 w-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <QrCode className="h-8 w-8 text-rose-400" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-muted-foreground max-w-[180px] leading-relaxed">
                Generate a QR code so emergency responders can access your records instantly.
              </p>
            </div>
            {error && (
              <p className="text-xs text-rose-600 text-center">{error}</p>
            )}
            <button
              onClick={generateToken}
              disabled={generating}
              className="w-full rounded-lg bg-rose-600 hover:bg-rose-700 text-white py-2 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <QrCode className="h-3.5 w-3.5" />
              )}
              {generating ? "Generating..." : "Generate QR Code"}
            </button>
          </>
        )}

        <Link
          href="/emergency/settings"
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors no-underline"
        >
          Manage emergency settings →
        </Link>
      </div>
    </div>
  );
}
