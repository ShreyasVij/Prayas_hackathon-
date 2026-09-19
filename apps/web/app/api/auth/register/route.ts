import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase Auth environment is not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    const cleanEmail = String(email).toLowerCase().trim();
    const cleanName = String(name || "New Patient").trim();
    const { data, error } = await authClient().auth.signUp({
      email: cleanEmail,
      password: String(password),
      options: { data: { name: cleanName, role: "patient" } },
    });
    if (error) {
      const status = /already registered|already exists/i.test(error.message) ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({
      success: true,
      message: data.session ? "Account created successfully. Proceed to onboarding." : "Account created. Check your email to confirm it.",
      user: { id: data.user?.id, email: cleanEmail, name: cleanName, isNewUser: true, onboardingCompleted: false },
    });
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
