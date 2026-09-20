import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key";
const supabaseAdmin = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

async function callGeminiSummary(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // 1. Get patient profile (allergies, lifestyle, etc.)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("data, email")
      .eq("id", userId)
      .single();

    const profileData = profile?.data || {};
    const allergies: string[] = profileData.allergies || [];
    const conditions: string[] = profileData.conditions || profileData.medicalConditions || [];
    const lifestyle = profileData.lifestyle || profileData.lifestyleNotes || "";
    const age = profileData.age || profileData.dateOfBirth || "";
    const gender = profileData.gender || "";

    // 2. Get medical records (AI scans + doctor reviews)
    const { data: records } = await supabaseAdmin
      .from("medical_records")
      .select("*")
      .eq("patient_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!records || records.length === 0) {
      return NextResponse.json({
        summary: null,
        lifestyle_plan: null,
        message: "No medical records found. Upload scans to generate your health summary.",
      });
    }

    // 3. Build prompt context
    const scanSummaries = records.map((rec: any, i: number) => {
      const pred = rec.ai_prediction;
      const disease = rec.disease_id || "unknown";
      const result = pred?.primary_prediction || pred?.prediction || "N/A";
      const conf = pred?.confidence ? `${(pred.confidence * 100).toFixed(1)}%` : "N/A";
      const doctorReview = rec.doctor_notes
        ? `Doctor's review: ${rec.doctor_notes}`
        : rec.status === "verified"
        ? "Verified by doctor."
        : "Pending doctor review.";
      return `Scan ${i + 1}: ${disease.replace(/_/g, " ")} — AI result: ${result} (${conf} confidence). ${doctorReview}`;
    }).join("\n");

    const prompt = `You are an expert medical AI assistant for MediLocker. Based on the following patient data, provide:
1. A concise, empathetic overall health summary (2-3 sentences) based on their scan results and doctor reviews.
2. A lifestyle plan with specific suggestions for:
   - Morning routine
   - Breakfast
   - Lunch
   - Dinner
   - Exercise recommendations
   - Sleep advice
   - Stress management
Tailor the advice based on their allergies and medical findings. Be specific and actionable.

Patient profile:
- Age: ${age || "not specified"}
- Gender: ${gender || "not specified"}
- Known allergies: ${allergies.length > 0 ? allergies.join(", ") : "none reported"}
- Known conditions: ${conditions.length > 0 ? conditions.join(", ") : "none reported"}
- Lifestyle notes: ${lifestyle || "none"}

Recent medical scans & reviews:
${scanSummaries}

Respond in this JSON format only, no markdown:
{
  "overall_summary": "...",
  "lifestyle_plan": {
    "morning_routine": "...",
    "breakfast": "...",
    "lunch": "...",
    "dinner": "...",
    "exercise": "...",
    "sleep": "...",
    "stress_management": "..."
  }
}`;

    let geminiResult: any = null;
    try {
      const raw = await callGeminiSummary(prompt);
      // Strip markdown code block if present
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      geminiResult = JSON.parse(cleaned);
    } catch (e) {
      console.error("Gemini health summary error:", e);
      // Fallback: derive a basic summary from records
      const positives = records.filter((r: any) => {
        const pred = r.ai_prediction?.primary_prediction || r.ai_prediction?.prediction || "";
        return pred.toLowerCase() !== "normal" && pred.toLowerCase() !== "negative" && pred !== "";
      });
      const overallSummary = positives.length > 0
        ? `Your recent AI scans flagged findings in ${positives.map((r: any) => (r.disease_id || "").replace(/_/g, " ")).join(", ")}. ${positives.length} scan(s) are pending or verified by your doctor.`
        : `Your recent AI scans appear within normal ranges. Continue routine health monitoring and follow your doctor's guidance.`;
      geminiResult = {
        overall_summary: overallSummary,
        lifestyle_plan: null,
      };
    }

    return NextResponse.json({
      summary: geminiResult.overall_summary || null,
      lifestyle_plan: geminiResult.lifestyle_plan || null,
      records_count: records.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("GET /api/patient/health-summary error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
