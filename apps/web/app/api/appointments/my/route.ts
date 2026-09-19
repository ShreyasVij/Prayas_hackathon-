import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";


import { getCollection } from "@/lib/server/db";
import type { AppointmentDocument } from "@db/doctors";
import type { UserDocument } from "@db/users";

/**
 * GET /api/appointments/my
 * Fetch all appointments for the logged-in patient
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get patient user
    const users = await getCollection<UserDocument>("users");
    const patient = await users.findOne({ email: authUser.email });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Fetch all appointments for this patient
    const appointments = await getCollection<AppointmentDocument>("appointments");
    const results = await appointments
      .find({ patientId: patient._id })
      .sort({ date: 1, appointmentTime: 1 })
      .toArray();

    // Transform to frontend format
    const formattedAppointments = results.map((apt) => ({
      id: apt._id.toString(),
      doctorId: apt.doctorId.toString(),
      patientName: apt.patientName,
      age: apt.patientAge,
      gender: apt.patientGender,
      appointmentTime: apt.appointmentTime,
      date: apt.date,
      status: apt.status,
      reason: apt.reason,
      notes: apt.notes,
      diagnosis: apt.diagnosis,
      prescription: apt.prescription,
      createdAt: apt.createdAt,
    }));

    return NextResponse.json({ appointments: formattedAppointments });
  } catch (err) {
    console.error("PATIENT_APPOINTMENTS_GET_ERROR", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
