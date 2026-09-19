import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";
const supabaseAdmin = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending";

    // Fetch medical records
    const { data: records, error } = await supabase
      .from("medical_records")
      .select(`
        *,
        patient:patient_id(id, email, data)
      `)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching medical records:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ records });
  } catch (error) {
    console.error("GET /api/doctor/verify/records error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
