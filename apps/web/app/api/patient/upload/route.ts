import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "https://mock-ai-backend.com/predict";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string || "general";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. Upload the file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `medical_reports/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("medilocker")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("medilocker")
      .getPublicUrl(filePath);

    // 2. Hit the external AI backend to get confidence and prediction
    // Note: We use a placeholder logic here if the real backend isn't available
    let aiConfidence = 0.85;
    let predictedSpecialty = "General";
    let aiOutput = { summary: "No major issues found in the general report." };

    try {
      // In reality, you might send the file bytes or the publicUrl to your AI backend
      const formDataForAI = new FormData();
      formDataForAI.append("file_url", publicUrl);
      
      /* 
      // Uncomment when the real AI endpoint is available
      const aiResponse = await fetch(AI_BACKEND_URL, {
        method: "POST",
        body: formDataForAI,
      });
      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiConfidence = aiData.confidence;
        predictedSpecialty = aiData.specialty;
        aiOutput = aiData.output;
      }
      */
      
      // Mocked AI determination based on document type
      if (documentType.toLowerCase().includes("heart") || documentType.toLowerCase().includes("ecg")) {
        predictedSpecialty = "Cardiology";
        aiOutput = { summary: "ECG appears normal, regular sinus rhythm." };
      } else if (documentType.toLowerCase().includes("skin") || documentType.toLowerCase().includes("derma")) {
        predictedSpecialty = "Dermatology";
        aiOutput = { summary: "Mild rash detected, recommend topical ointment." };
      }

    } catch (aiErr) {
      console.warn("AI Backend failed, proceeding with fallback", aiErr);
    }

    // 3. Insert into Supabase medical_reports table
    const { data: reportData, error: dbError } = await supabase
      .from("medical_reports")
      .insert({
        patient_id: user.id,
        document_url: publicUrl,
        document_type: documentType,
        predicted_specialty: predictedSpecialty,
        ai_confidence: aiConfidence,
        ai_output: aiOutput,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB Insert Error:", dbError);
      return NextResponse.json({ error: "Failed to save medical report" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report: reportData,
    });
  } catch (error) {
    console.error("Upload Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
