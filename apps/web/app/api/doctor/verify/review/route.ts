import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";
const supabaseAdmin = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a doctor
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .single();

    if (profile?.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Since doctor id is in profiles, and doctors table shares the same id:
    const doctorId = authUser.id;

    const body = await req.json();
    const { recordId, doctorReview, isAccurate } = body;

    if (!recordId) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    // Update the record
    const { data, error } = await supabase
      .from("medical_records")
      .update({
        status: "reviewed",
        doctor_id: doctorId,
        doctor_review: doctorReview,
        is_accurate: isAccurate,
        updated_at: new Date().toISOString()
      })
      .eq("id", recordId)
      .select()
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
