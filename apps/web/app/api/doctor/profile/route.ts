import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

import { getCollection } from "@/lib/server/db";
import type { DoctorDocument, DoctorProfile } from "@db/doctors";
import type { UserDocument } from "@db/users";
import { generateDoctorCode } from "@db/utils";
import { ObjectId } from "mongodb";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key";
const supabaseAdmin = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

function toNullIfEmpty<T extends string | undefined | null>(v: T): T | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return (s.length ? (s as any) : null);
}

function normalizeGender(g: string | undefined | null): DoctorProfile["gender"] | null {
  if (!g) return null;
  const s = g.toLowerCase();
  if (s === "prefer not to say" || s === "prefer_not_to_say") return "prefer_not_to_say";
  if (s === "male") return "male";
  if (s === "female") return "female";
  if (s === "other") return "other";
  return null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.email) {
      console.log("[DOCTOR_PROFILE] Unauthorized - no session or email");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[DOCTOR_PROFILE] Fetching profile for: ${authUser.email}`);

    // 1. Check Supabase first for clinical credentials and verified doctor status
    const { data: supaDoctor } = await supabaseAdmin
      .from("doctors")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    const { data: supaProfile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    const isSupabaseDoctor = !!supaDoctor || supaProfile?.role === "doctor";

    // 2. Fetch or sync MongoDB user
    const users = await getCollection<UserDocument>("users");
    let user = await users.findOne({ email: authUser.email });

    if (user && isSupabaseDoctor && !user.roles?.includes("doctor")) {
      await users.updateOne(
        { _id: user._id },
        { $addToSet: { roles: "doctor" }, $set: { updatedAt: new Date() } }
      );
      user.roles = [...(user.roles || []), "doctor"];
    }

    const doctors = await getCollection<DoctorDocument>("doctors");
    let doctor: any = await doctors.findOne({ 
      $or: [
        { email: authUser.email },
        ...(user?._id ? [{ userId: user._id }] : [])
      ]
    });

    const supaData = (supaProfile?.data || {}) as Record<string, any>;
    const resolvedSpecialty = supaDoctor?.specialty || supaData.specialty || supaData.specialization || doctor?.profile?.specialization || "Pulmonology";
    const resolvedHospital = supaData.hospital || doctor?.profile?.hospitalAffiliation || "City Pulmonology & Respiratory Care Center";
    const resolvedLicense = supaData.licenseNumber || doctor?.profile?.licenseNumber || "MED-2024-887";

    // If doctor record is missing in MongoDB but exists in Supabase, auto-create it
    if (!doctor && (isSupabaseDoctor || user?.roles?.includes("doctor"))) {
      let doctorCode = generateDoctorCode().replace(/-/g, '');
      const newDoc: DoctorDocument = {
        _id: new ObjectId(),
        doctorCode,
        userId: user?._id || new ObjectId(),
        email: authUser.email,
        name: supaData.fullName || user?.name || authUser.user_metadata?.name || "Dr. Manav Kohli",
        role: "Doctor",
        status: "active",
        profile: {
          specialization: resolvedSpecialty,
          licenseNumber: resolvedLicense,
          hospitalAffiliation: resolvedHospital,
          department: resolvedSpecialty,
          bio: "Specialist in pulmonology, respiratory medicine, and radiological scan evaluation.",
          experienceYears: 8,
          location: {
            city: "Chandigarh",
            state: "Punjab",
            country: "India"
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await doctors.insertOne(newDoc as any);
      doctor = newDoc;
      console.log(`[DOCTOR_PROFILE] Auto-created MongoDB doctor for: ${authUser.email}`);
    }

    // Ensure doctor code exists
    if (doctor && !doctor.doctorCode) {
      let doctorCode = generateDoctorCode().replace(/-/g, '');
      await doctors.updateOne(
        { _id: doctor._id },
        { $set: { doctorCode, updatedAt: new Date() } }
      );
      doctor.doctorCode = doctorCode;
    }

    // Keep profile specialization populated
    const profile = doctor?.profile || {};
    const finalProfile = {
      ...profile,
      specialization: resolvedSpecialty,
      specialty: resolvedSpecialty,
      licenseNumber: profile.licenseNumber || resolvedLicense,
      hospitalAffiliation: profile.hospitalAffiliation || resolvedHospital,
      department: profile.department || resolvedSpecialty,
      experienceYears: profile.experienceYears ?? 8,
      verified: supaDoctor?.verified ?? true,
    };

    const hasGoogleCalendar = !!doctor?.googleTokens;
    
    return NextResponse.json({ 
      profile: finalProfile, 
      doctor: {
        ...(doctor || {}),
        name: doctor?.name || supaData.fullName || authUser.user_metadata?.name || "Dr. Manav Kohli",
        specialty: resolvedSpecialty,
        specialization: resolvedSpecialty,
        verified: supaDoctor?.verified ?? true,
      },
      googleTokens: hasGoogleCalendar ? { connected: true } : null
    });
  } catch (err) {
    console.error("[DOCTOR_PROFILE] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ 
      error: "Internal Server Error",
      details: process.env.NODE_ENV === "development" ? errorMessage : undefined
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has doctor role
    const users = await getCollection<UserDocument>("users");
    const user = await users.findOne({ email: authUser.email });
    
    if (!user?.roles?.includes("doctor")) {
      return NextResponse.json({ error: "Not a doctor" }, { status: 403 });
    }

    const body = await req.json();
    const {
      phone,
      dob,
      gender,
      address,
      latitude,
      longitude,
      city,
      state,
      country,
      avatarUrl,
      avatarFileName,
      specialization,
      specialty,
      licenseNumber,
      hospitalAffiliation,
      experienceYears,
      bio,
      department,
    } = body ?? {};

    const resolvedSpecialty = specialization || specialty || "Pulmonology";
    const resolvedLicense = licenseNumber || "MED-2024-887";
    const resolvedHospital = hospitalAffiliation || "City Pulmonology & Respiratory Care Center";

    const doctors = await getCollection<DoctorDocument>("doctors");
    const existing = await doctors.findOne({ 
      $or: [
        { email: authUser.email },
        ...(user?._id ? [{ userId: user._id }] : [])
      ]
    });

    const prevAvatar = existing?.profile?.profileImageUrl || undefined;
    const prevAvatarName = existing?.profile?.profileImageName || undefined;

    const profile: DoctorProfile = {
      phone: toNullIfEmpty(phone) as any,
      dob: dob ? new Date(dob) : undefined,
      gender: normalizeGender(gender) || undefined,
      profileImageUrl: (toNullIfEmpty(avatarUrl) as any) || prevAvatar,
      profileImageName: (toNullIfEmpty(avatarFileName) as any) || prevAvatarName,
      specialization: resolvedSpecialty,
      licenseNumber: resolvedLicense,
      hospitalAffiliation: resolvedHospital,
      department: department || resolvedSpecialty,
      bio: bio || "Senior Specialist with clinical focus on pulmonary diagnostics, chest radiography, and patient care.",
      experienceYears: experienceYears ? parseInt(String(experienceYears)) : 8,
      location: {
        hos: toNullIfEmpty(address) as any,
        city: toNullIfEmpty(city) as any,
        state: toNullIfEmpty(state) as any,
        country: toNullIfEmpty(country) || "India",
        latitude: latitude !== undefined && latitude !== null ? parseFloat(String(latitude)) : undefined,
        longitude: longitude !== undefined && longitude !== null ? parseFloat(String(longitude)) : undefined,
      },
    };

    if (existing) {
      // Update existing doctor profile
      await doctors.updateOne(
        { _id: existing._id },
        {
          $set: {
            profile,
            name: (authUser.user_metadata?.name || authUser.user_metadata?.fullName || existing.name),
            status: "active",
            updatedAt: new Date(),
          },
        }
      );
    } else {
      // Create new doctor document with UNIQUE 16-character code
      let doctorCode = generateDoctorCode().replace(/-/g, '');
      await doctors.insertOne({
        _id: new ObjectId(),
        doctorCode,
        userId: user?._id || new ObjectId(),
        email: authUser.email,
        name: (authUser.user_metadata?.name || authUser.user_metadata?.fullName || "Dr. Manav Kohli"),
        profile,
        role: "Doctor",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as DoctorDocument);
    }

    // Sync to Supabase doctors & profiles
    await supabaseAdmin.from("doctors").upsert({
      id: authUser.id,
      specialty: resolvedSpecialty,
      verified: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    await supabaseAdmin.from("profiles").upsert({
      id: authUser.id,
      email: authUser.email,
      role: "doctor",
      data: {
        fullName: authUser.user_metadata?.name || "Dr. Manav Kohli",
        specialty: resolvedSpecialty,
        specialization: resolvedSpecialty,
        hospital: resolvedHospital,
        licenseNumber: resolvedLicense,
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    return NextResponse.json({ success: true, profile });
  } catch (err) {
    console.error("DOCTOR_PROFILE_POST_ERROR", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
