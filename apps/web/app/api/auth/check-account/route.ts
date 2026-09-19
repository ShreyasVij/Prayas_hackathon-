import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    const { data, error } = await supabaseAdmin().from("profiles").select("id").eq("email", String(email).toLowerCase().trim()).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ exists: Boolean(data) });
  } catch (error) {
    console.error("CHECK_ACCOUNT_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
