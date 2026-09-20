import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";
import { getAllowedDiseasesForSpecialty } from "../records/route";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key";
const supabaseAdmin = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a doctor
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, data")
      .eq("id", authUser.id)
      .single();

    const { data: doctor } = await supabaseAdmin
      .from("doctors")
      .select("specialty, verified")
      .eq("id", authUser.id)
      .single();

    const isDoctor = profile?.role === "doctor" || !!doctor;
    if (!isDoctor) {
      return NextResponse.json({ error: "Forbidden: Doctor role required" }, { status: 403 });
    }

    const body = await req.json();
    const { recordId, doctorReview, isAccurate, specialty } = body;

    if (!recordId) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    const doctorId = authUser.id;
    const activeSpecialty = specialty || doctor?.specialty || (profile?.data as any)?.specialty || (profile?.data as any)?.specialization || "Pulmonology";
    const allowedDiseases = getAllowedDiseasesForSpecialty(activeSpecialty);

    // Ensure doctor entry in public.doctors table so foreign keys are satisfied
    await supabaseAdmin.from("doctors").upsert({
      id: authUser.id,
      specialty: activeSpecialty,
      verified: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    // Fetch the target record to verify specialization
    const { data: targetRecord, error: fetchErr } = await supabaseAdmin
      .from("medical_records")
      .select("id, disease_id, status")
      .eq("id", recordId)
      .single();

    if (fetchErr || !targetRecord) {
      return NextResponse.json({ error: "Medical record not found" }, { status: 404 });
    }

    // Check specialization permission
    if (allowedDiseases.length > 0 && !allowedDiseases.includes(targetRecord.disease_id)) {
      return NextResponse.json({ 
        error: `Only specialists in this field can review ${targetRecord.disease_id} scans. Your recorded specialty is: ${activeSpecialty || "unmatched"}` 
      }, { status: 403 });
    }

    // Update the record to reviewed
    const { data, error } = await supabaseAdmin
      .from("medical_records")
      .update({
        status: "reviewed",
        doctor_id: doctorId,
        doctor_review: doctorReview,
        is_accurate: isAccurate,
        updated_at: new Date().toISOString()
      })
      .eq("id", recordId)
      .select(`
        *,
        doctor:doctor_id(id, specialty)
      `)
      .single();

    if (error) {
      console.error("Error updating medical record:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, record: data });
  } catch (error) {
    console.error("POST /api/doctor/verify/review error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
