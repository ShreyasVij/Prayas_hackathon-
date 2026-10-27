import { NextRequest, NextResponse } from "next/server";

// In-memory store for the latest static/cached ESP32 telemetry reading
let latestEsp32Data = {
  timestamp: new Date().toISOString(),
  deviceId: "ESP32-BIO-01",
  status: "ready",
  patientId: "PT-8802",
  metrics: {
    heartRate: 72,
    spo2: 98.2,
    tempObject: 36.5,
    tempAmbient: 24.1,
    thb: 14.2,
    thbCiLow: 13.8,
    thbCiHigh: 14.6,
    rrInterval: 833,
    pat: 210,
    acDcRatioRed: 0.042,
    acDcRatioIr: 0.051,
    modulationRatio: 0.824,
    snr: 28.4,
    perfusionIndex: 4.8,
    mlConfidence: 94.6,
    rSquared: 0.92,
    mae: 0.38,
  },
  calibration: {
    max30102: true,
    ad8232: true,
    mlx90614: true,
  },
};

export async function GET() {
  return NextResponse.json({
    success: true,
    data: latestEsp32Data,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Update in-memory ESP32 data with incoming values from ESP32 microcontroller
    latestEsp32Data = {
      ...latestEsp32Data,
      timestamp: new Date().toISOString(),
      status: "received",
      metrics: {
        ...latestEsp32Data.metrics,
        ...(body.heartRate !== undefined && { heartRate: Number(body.heartRate) }),
        ...(body.hr !== undefined && { heartRate: Number(body.hr) }),
        ...(body.spo2 !== undefined && { spo2: Number(body.spo2) }),
        ...(body.tempObject !== undefined && { tempObject: Number(body.tempObject) }),
        ...(body.temp !== undefined && { tempObject: Number(body.temp) }),
        ...(body.tempAmbient !== undefined && { tempAmbient: Number(body.tempAmbient) }),
        ...(body.thb !== undefined && { thb: Number(body.thb) }),
        ...(body.rrInterval !== undefined && { rrInterval: Number(body.rrInterval) }),
        ...(body.pat !== undefined && { pat: Number(body.pat) }),
      },
    };

    return NextResponse.json({
      success: true,
      message: "ESP32 telemetry received and reflected successfully.",
      data: latestEsp32Data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process ESP32 packet" },
      { status: 400 }
    );
  }
}
