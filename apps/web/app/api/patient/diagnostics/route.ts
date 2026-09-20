import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { uploadFile } from "@/services/storageClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key";
const supabaseAdmin = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

/** Convert a base64 data URI to a Blob / Buffer and upload to Supabase Storage.
 *  Returns the public URL on success, or null on failure. */
async function uploadHeatmapToStorage(
  base64DataUri: string,
  userId: string,
): Promise<string | null> {
  try {
    if (!base64DataUri) return null;
    // Already an HTTP URL
    if (base64DataUri.startsWith("http://") || base64DataUri.startsWith("https://")) {
      return base64DataUri;
    }

    let mimeType = "image/jpeg";
    let ext = "jpg";
    let base64Data = base64DataUri;

    const matches = base64DataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      ext = mimeType.includes("svg") ? "svg" : mimeType.split("/")[1] || "jpg";
      base64Data = matches[2];
    } else if (base64DataUri.startsWith("data:image/svg+xml")) {
      // SVG without base64 encoding (e.g. data:image/svg+xml;utf8,<svg...)
      const svgContent = decodeURIComponent(base64DataUri.replace(/^data:image\/svg\+xml;?(utf8)?,/, ""));
      const buffer = Buffer.from(svgContent, "utf8");
      const storageKey = `heatmaps/${userId}/${Date.now()}-heatmap.svg`;
      const { error } = await supabaseAdmin.storage
        .from("medilocker")
        .upload(storageKey, buffer, { contentType: "image/svg+xml", upsert: false });
      if (error) {
        console.warn("SVG Heatmap upload error:", error.message);
        return null;
      }
      const { data: pubUrl } = supabaseAdmin.storage.from("medilocker").getPublicUrl(storageKey);
      return pubUrl.publicUrl || null;
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(base64Data, "base64");
    const storageKey = `heatmaps/${userId}/${Date.now()}-heatmap.${ext}`;

    // Upload buffer to Supabase storage
    const { error } = await supabaseAdmin.storage
      .from("medilocker")
      .upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.warn("Heatmap upload error:", error.message);
      return null;
    }

    const { data: pubUrl } = supabaseAdmin.storage
      .from("medilocker")
      .getPublicUrl(storageKey);

    return pubUrl.publicUrl || null;
  } catch (e) {
    console.warn("uploadHeatmapToStorage failed:", e);
    return null;
  }
}

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

    // 1. Upload scan to Supabase Storage bucket
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
    let heatmapUrl: string | null = null;

    if (predictionRaw) {
      try {
        aiPrediction = JSON.parse(predictionRaw);

        // 2. Extract and upload heatmap_image to storage
        const rawHeatmap = aiPrediction?.heatmap_image || aiPrediction?.heatmap_url || null;
        if (rawHeatmap && typeof rawHeatmap === "string") {
          heatmapUrl = await uploadHeatmapToStorage(rawHeatmap, user.id);
          if (heatmapUrl) {
            // Upload succeeded: store URL in JSON and column, remove raw base64 to keep DB lean
            const { heatmap_image: _stripped, ...predWithoutHeatmap } = aiPrediction;
            aiPrediction = {
              ...predWithoutHeatmap,
              heatmap_url: heatmapUrl,
            };
          } else {
            // Fallback: keep heatmap in JSON if storage upload fails
            aiPrediction = {
              ...aiPrediction,
              heatmap_url: rawHeatmap,
              heatmap_image: rawHeatmap,
            };
            heatmapUrl = rawHeatmap.length < 2000 ? rawHeatmap : null;
          }
        }
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

    // 3. Insert into medical_records with status 'pending'
    const { data: newRecord, error: insertError } = await supabaseAdmin
      .from("medical_records")
      .insert({
        patient_id: user.id,
        document_url: documentUrl,
        document_type: "scan",
        disease_id: diseaseId,
        ai_prediction: aiPrediction,
        heatmap_url: heatmapUrl,          // dedicated column
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // heatmap_url column might not exist yet — retry without it
      console.warn("Insert with heatmap_url failed, retrying without:", insertError.message);
      const { data: fallbackRecord, error: fallbackError } = await supabaseAdmin
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

      if (fallbackError) {
        console.error("Error inserting medical record:", fallbackError);
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, record: fallbackRecord, heatmap_url: heatmapUrl }, { status: 201 });
    }

    return NextResponse.json({ success: true, record: newRecord, heatmap_url: heatmapUrl }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/patient/diagnostics error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
