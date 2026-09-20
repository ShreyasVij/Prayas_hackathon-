import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createClient as createServiceRoleClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key";
const supabaseAdmin = createServiceRoleClient(supabaseUrl, supabaseServiceKey);

export const ALL_SUPPORTED_DISEASES = [
  "pneumonia", "covid19", "tuberculosis", "lung_cancer", "melanoma",
  "diabetic_retinopathy", "glaucoma", "brain_tumor", "alzheimers",
  "breast_cancer", "leukemia", "arrhythmia",
];

export const SPECIALTY_DISEASE_MAP: Record<string, string[]> = {
  pulmonology: ["pneumonia", "covid19", "tuberculosis", "lung_cancer"],
  pulmonologist: ["pneumonia", "covid19", "tuberculosis", "lung_cancer"],
  respiratory: ["pneumonia", "covid19", "tuberculosis", "lung_cancer"],
  chest: ["pneumonia", "covid19", "tuberculosis", "lung_cancer"],
  dermatology: ["melanoma"],
  dermatologist: ["melanoma"],
  skin: ["melanoma"],
  ophthalmology: ["diabetic_retinopathy", "glaucoma"],
  ophthalmologist: ["diabetic_retinopathy", "glaucoma"],
  eye: ["diabetic_retinopathy", "glaucoma"],
  neurology: ["brain_tumor", "alzheimers"],
  neurologist: ["brain_tumor", "alzheimers"],
  neurosurgery: ["brain_tumor", "alzheimers"],
  brain: ["brain_tumor", "alzheimers"],
  oncology: ["breast_cancer", "leukemia", "lung_cancer", "melanoma", "brain_tumor"],
  oncologist: ["breast_cancer", "leukemia", "lung_cancer", "melanoma", "brain_tumor"],
  cancer: ["breast_cancer", "leukemia", "lung_cancer", "melanoma", "brain_tumor"],
  cardiology: ["arrhythmia"],
  cardiologist: ["arrhythmia"],
  heart: ["arrhythmia"],
  radiology: ALL_SUPPORTED_DISEASES,
  radiologist: ALL_SUPPORTED_DISEASES,
  general: ALL_SUPPORTED_DISEASES,
  "general physician": ALL_SUPPORTED_DISEASES,
  "internal medicine": ALL_SUPPORTED_DISEASES,
};

export function getAllowedDiseasesForSpecialty(specialty?: string | null): string[] {
  if (!specialty) return ALL_SUPPORTED_DISEASES;
  const normalized = specialty.toLowerCase().trim();
  for (const [key, diseases] of Object.entries(SPECIALTY_DISEASE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return diseases;
    }
  }
  return ALL_SUPPORTED_DISEASES;
}

function calculateAge(dobString?: string): string {
  if (!dobString) return "N/A";
  try {
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return isNaN(age) ? "N/A" : `${age} yrs`;
  } catch {
    return "N/A";
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const requestedSpecialty = url.searchParams.get("specialty");

    // Check if user is a doctor in profiles or doctors table
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

    const activeSpecialty = requestedSpecialty || doctor?.specialty || (profile?.data as any)?.specialty || "Pulmonology";

    // Ensure doctor entry in public.doctors table so foreign keys and specialty are in sync
    await supabaseAdmin.from("doctors").upsert({
      id: authUser.id,
      specialty: activeSpecialty,
      verified: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    // Also ensure role in profiles is doctor
    if (profile && profile.role !== "doctor") {
      await supabaseAdmin.from("profiles").update({ role: "doctor" }).eq("id", authUser.id);
    }

    const allowedDiseases = getAllowedDiseasesForSpecialty(activeSpecialty);
    const status = url.searchParams.get("status") || "pending";

    // Fetch medical records matching status and doctor's specialization
    let query = supabaseAdmin
      .from("medical_records")
      .select(`
        *,
        patient:patient_id(id, data)
      `)
      .eq("status", status);

    if (allowedDiseases.length > 0 && allowedDiseases.length < ALL_SUPPORTED_DISEASES.length) {
      query = query.in("disease_id", allowedDiseases);
    }

    const { data: records, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching medical records:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // SANITIZATION: Protect patient privacy (NO name, NO address, NO email returned)
    // Doctor only sees simple patient ID, age, gender, lifestyle, allergies, scan, and model response
    const sanitizedRecords = (records || []).map((rec: any) => {
      const patientRaw = rec.patient?.data || {};
      const maskedId = `PT-${String(rec.patient_id).slice(0, 8).toUpperCase()}`;
      return {
        id: rec.id,
        patient_id: rec.patient_id,
        patient_masked_id: maskedId,
        document_url: rec.document_url,
        document_type: rec.document_type,
        disease_id: rec.disease_id,
        ai_prediction: rec.ai_prediction,
        status: rec.status,
        created_at: rec.created_at,
        patient: {
          id: maskedId,
          age: patientRaw.age ? `${patientRaw.age} yrs` : (patientRaw.dob ? calculateAge(patientRaw.dob) : "Not specified"),
          gender: patientRaw.gender || patientRaw.sex || "Not specified",
          lifestyle: patientRaw.lifestyle || patientRaw.habits || patientRaw.notes || "None noted",
          allergies: Array.isArray(patientRaw.allergies) 
            ? patientRaw.allergies 
            : (patientRaw.allergies ? [patientRaw.allergies] : ["None reported"]),
          conditions: Array.isArray(patientRaw.conditions) ? patientRaw.conditions : [],
          bloodGroup: patientRaw.bloodGroup || null,
        },
      };
    });

    return NextResponse.json({ 
      records: sanitizedRecords,
      doctorSpecialty: activeSpecialty,
      allowedDiseases
    });
  } catch (error) {
    console.error("GET /api/doctor/verify/records error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
