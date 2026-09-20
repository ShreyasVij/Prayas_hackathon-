import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { uploadFile } from "@/services/storageClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key";
const supabaseAdmin = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: records, error } = await supabaseAdmin
      .from("medical_records")
      .select(`
        *,
        doctor:doctor_id(id, specialty)
      `)
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching patient medical records:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also enrich with doctor profiles if doctor_id is present
    const enrichedRecords = await Promise.all((records || []).map(async (rec: any) => {
      if (rec.doctor_id) {
        const { data: docProfile } = await supabaseAdmin
          .from("profiles")
          .select("email, data")
          .eq("id", rec.doctor_id)
          .single();
        return {
          ...rec,
          doctorName: docProfile?.data?.fullName || docProfile?.data?.name || docProfile?.email || "Attending Specialist",
          doctorSpecialty: rec.doctor?.specialty || docProfile?.data?.specialty || "Specialist",
        };
      }
      return rec;
    }));

    return NextResponse.json({ records: enrichedRecords });
  } catch (error) {
    console.error("GET /api/patient/diagnostics error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const diseaseId = (formData.get("disease_id") as string) || "pneumonia";
    const file = formData.get("file") as File | null;
    const predictionRaw = formData.get("ai_prediction") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Medical scan image file is required." }, { status: 400 });
    }

    // 1. Upload to Supabase Storage bucket
    const fileExt = file.name.split(".").pop() || "png";
    const storageKey = `scans/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    let documentUrl = "";
    try {
      const uploadRes = await uploadFile({
        bucket: "medilocker",
        storageKey,
        file,
        contentType: file.type || "image/png",
      });
      documentUrl = uploadRes?.publicUrl || "";
      if (!documentUrl) {
        const { data: pubUrl } = supabaseAdmin.storage.from("medilocker").getPublicUrl(storageKey);
        documentUrl = pubUrl.publicUrl;
      }
    } catch (storageErr) {
      console.warn("Storage upload failed, attempting fallback:", storageErr);
      const { data: pubUrl } = supabaseAdmin.storage.from("medilocker").getPublicUrl(storageKey);
      documentUrl = pubUrl.publicUrl;
    }

    let aiPrediction: any = null;
    if (predictionRaw) {
      try {
        aiPrediction = JSON.parse(predictionRaw);
      } catch {
        aiPrediction = { raw: predictionRaw };
      }
    }

    // Ensure patient profile exists in profiles table
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      await supabaseAdmin.from("profiles").insert({
        id: user.id,
        email: user.email,
        role: "patient",
        data: user.user_metadata || {},
      });
    }

    // 2. Insert into medical_records with status 'pending'
    const { data: newRecord, error: insertError } = await supabaseAdmin
      .from("medical_records")
      .insert({
        patient_id: user.id,
        document_url: documentUrl,
        document_type: "scan",
        disease_id: diseaseId,
        ai_prediction: aiPrediction,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting medical record:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/patient/diagnostics error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
