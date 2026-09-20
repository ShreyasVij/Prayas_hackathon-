import { NextRequest, NextResponse } from "next/server";
import { Buffer } from "buffer";
import { callExtract, callExtractMulti } from "@/service/aiClient";

// Ensure Node.js runtime so Buffer and server-side fetch behave consistently
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toBase64 = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
};

async function analyzeWithGeminiDirect(file: File, base64: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/png");
  const prompt = `You are a clinical AI medical laboratory and document analyzer.
Analyze this medical document or blood report carefully.
Extract:
1. patient_name: (string or null)
2. dob: (Date of Birth YYYY-MM-DD or null)
3. doctor_name: (Physician name or null)
4. diagnosis: (Clinical impression or test indication or null)
5. report_date: (YYYY-MM-DD or null)
6. classification: "Lab Report" | "Prescription" | "Discharge Summary" | "Other"
7. vitals: Array of objects:
   - label: analyte / test name (e.g. "Hemoglobin (Hb)", "Total Cholesterol", "Glucose", "Platelet Count", "WBC", "Creatinine", etc.)
   - value: numeric value or qualitative string
   - unit: e.g. "mg/dL", "g/dL", "U/L", "mmol/L", "%"
   - status: "normal" | "high" | "low" | "abnormal"
8. summary: Clear 2-3 paragraph clinical AI explanation of the findings, highlighting any values outside standard reference ranges.
9. raw_text: Transcribed text from the report.

Respond ONLY with valid JSON with these exact keys.`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json",
    },
  };

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn("Gemini Direct API returned error:", res.status, errText);
    return null;
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  return JSON.parse(text);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const files = formData.getAll("files").filter((f) => f instanceof File) as File[];
  const identity = {
    documentId: String(formData.get("documentId") || "") || undefined,
    versionId: String(formData.get("versionId") || "") || undefined,
    storageKey: String(formData.get("storageKey") || "") || undefined,
    userId: String(formData.get("userId") || "") || undefined,
    ownerId: String(formData.get("ownerId") || "") || undefined,
  };

  if (!file && files.length === 0) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  try {
    const targetFile = file || files[0];
    const contentBase64 = await toBase64(targetFile);

    // 1. Try direct Gemini API analysis for instant blood report understanding
    if (process.env.GEMINI_API_KEY) {
      try {
        const geminiResult = await analyzeWithGeminiDirect(targetFile, contentBase64);
        if (geminiResult && typeof geminiResult === "object") {
          return NextResponse.json({
            task_id: identity.documentId || `gemini-${Date.now()}`,
            status: "completed",
            data: geminiResult,
            aiHandler: "gemini_direct",
          }, { status: 200 });
        }
      } catch (geminiErr) {
        console.warn("Gemini Direct analysis fallback to service:", geminiErr);
      }
    }

    // 2. Fallback to local AI backend service
    const aiHandler = process.env.DOCUMENT_AI_HANDLER === "external" ? "external" : "internal";
    if (files.length > 0) {
      const parts = [] as { fileName: string; contentBase64: string }[];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const b64 = await toBase64(f);
        parts.push({ fileName: f.name || `page-${i + 1}`, contentBase64: b64 });
      }
      const result = await callExtractMulti({ files: parts, ...identity });
      return NextResponse.json({ ...result, aiHandler }, { status: 200 });
    } else if (file) {
      const result = await callExtract({ fileName: file.name, contentBase64, ...identity });
      return NextResponse.json({ ...result, aiHandler }, { status: 200 });
    } else {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Document extraction error:", error);
    const message = typeof error?.message === "string" ? error.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
