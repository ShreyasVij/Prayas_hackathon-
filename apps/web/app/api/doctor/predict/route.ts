import { NextResponse } from "next/server";

const SUPPORTED_DISEASES = new Set([
  "pneumonia", "covid19", "tuberculosis", "lung_cancer", "melanoma",
  "diabetic_retinopathy", "glaucoma", "brain_tumor", "alzheimers",
  "breast_cancer", "leukemia", "arrhythmia",
]);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const diseaseId = incoming.get("disease_id");
    const file = incoming.get("file");

    if (typeof diseaseId !== "string" || !SUPPORTED_DISEASES.has(diseaseId)) {
      return NextResponse.json({ error: "Select a supported disease." }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "A medical image is required." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "The image must be smaller than 50MB." }, { status: 413 });
    }

    const apiBase = (process.env.AI_PREDICTION_API_URL || "").replace(/\/+$/, "");
    if (!apiBase) {
      return NextResponse.json({ error: "The prediction service is not configured." }, { status: 503 });
    }

    const body = new FormData();
    body.append("disease_id", diseaseId);
    body.append("file", file, file.name);
    const response = await fetch(`${apiBase}/predict`, { method: "POST", body });
    const text = await response.text();
    let payload: unknown;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { detail: text || "Prediction service returned an invalid response." };
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    console.error("Disease prediction proxy failed:", error);
    return NextResponse.json({ error: "Unable to reach the prediction service. Please try again." }, { status: 502 });
  }
}
