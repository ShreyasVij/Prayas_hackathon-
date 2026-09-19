"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { 
  Stethoscope, 
  Calendar as CalendarIcon, 
  Layers, 
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// MODULAR PORTAL COMPONENTS
// ============================================================================
import { MedicalImageUpload } from "./components/MedicalImageUpload";
import { DoctorProfileSection } from "./components/DoctorProfileSection";

// Existing clinical widgets
import GoogleCalendarConnect from "@/components/GoogleCalendarConnect";
import Calendar from "./patients/components/Calendar";
import AppointmentCard from "./patients/components/AppointmentCard";
import UpcomingList from "./patients/components/UpcomingList";

interface Appointment {
  id: string;
  patientId?: string;
  patientName: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  appointmentTime: string;
  date: string;
  status: "pending" | "approved" | "rejected" | "upcoming" | "ongoing" | "completed";
  reason?: string;
  notes?: string;
}

function DoctorPortalContent() {
  // Navigation tab switcher: defaults to the Doctor Workspace & Diagnostics
  const [activeTab, setActiveTab] = useState<"portal" | "schedule">("portal");

  // State for appointments in case doctor views the Schedule tab
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        setLoadingSchedule(true);
        const res = await fetch("/api/doctor/appointments");
        if (res.ok) {
          const data = await res.json();
          setAppointments(data.appointments || []);
        } else {
          setAppointments([]);
        }
      } catch {
        setAppointments([]);
      } finally {
        setLoadingSchedule(false);
      }
    }

    if (activeTab === "schedule") {
      fetchAppointments();
    }
  }, [activeTab]);

  const selectedDateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const scheduleEligibleStatuses = new Set(["approved", "upcoming", "ongoing", "completed"]);
  const todayAppointments = appointments.filter(
    (apt) => apt.date === selectedDateString && scheduleEligibleStatuses.has(apt.status)
  );
  const allUpcomingAppointments = appointments.filter(
    (apt) => apt.status === "pending" || apt.status === "approved" || apt.status === "upcoming" || apt.status === "ongoing"
  );
  const completedAppointments = todayAppointments.filter(
    (apt) => apt.status === "completed"
  );

  const handleMarkComplete = async (id: string) => {
    try {
      await fetch(`/api/doctor/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, status: "completed" as const } : apt))
      );
    } catch {
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, status: "completed" as const } : apt))
      );
    }
  };

  const handleViewDetails = (id: string) => {
    const appointment = appointments.find((apt) => apt.id === id);
    if (appointment?.patientId) {
      window.location.href = `/doctor/patient/${appointment.patientId}`;
    } else {
      window.location.href = `/doctor/patient/demo-patient`;
    }
  };

  const timeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"
  ];

  return (
    <div className="space-y-8">
      
      {/* ─── Hero Header & View Mode Switcher ─────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200/90 inline-flex items-center gap-1.5 shadow-2xs">
              <Stethoscope className="h-3.5 w-3.5" />
              Clinical Provider Portal
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-100 text-zinc-600 border border-slate-200/90 shadow-2xs">
              Route: /doctor
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-900 tracking-tight">
            Doctor Workspace & Diagnostic Portal
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 leading-relaxed max-w-2xl">
            Centralized hub for medical imaging diagnostics and provider profile.
          </p>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/90 shadow-2xs self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("portal")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === "portal"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/90"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            <Layers className="h-3.5 w-3.5 text-teal-600" />
            <span>Doctor Portal (Core)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
              activeTab === "schedule"
                ? "bg-white text-teal-800 shadow-xs border border-slate-200/90"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 text-teal-600" />
            <span>Appointments &amp; Schedule</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: CORE DOCTOR PORTAL ──────────────────────────────────── */}
      {activeTab === "portal" && (
        <div className="space-y-8">
          
          {/* ZONE 1: PROVIDER OVERVIEW */}
          <section aria-label="Doctor Profile Section">
            <DoctorProfileSection />
          </section>

          {/* ZONE 2: DIAGNOSTIC WORKSTATION */}
          <section aria-label="Medical Image Upload Diagnostics Section">
            <MedicalImageUpload />
          </section>
        </div>
      )}

      {/* ─── TAB 2: CLINICAL SCHEDULE & APPOINTMENTS (PRESERVED VIEW) ──── */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          {/* Calendar Connect Widget */}
          <GoogleCalendarConnect />

          {loadingSchedule ? (
            <div className="text-center py-16 flex flex-col items-center justify-center gap-2 text-zinc-500">
              <Loader2 className="h-7 w-7 text-teal-600 animate-spin" />
              <p className="text-xs font-medium">Syncing consultation schedule...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-teal-600" />
                      Slots for {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold">
                      {todayAppointments.length} Active
                    </span>
                  </div>

                  {todayAppointments.length === 0 ? (
                    <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                      <CalendarIcon className="h-7 w-7 text-zinc-300 mx-auto mb-1.5" />
                      <p className="text-xs font-medium text-zinc-600">No consultations scheduled for this date</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {timeSlots.map((slot) => {
                        const slotAppointments = todayAppointments.filter((apt) => {
                          const slotHour = slot.split(":")[0];
                          const aptHour = apt.appointmentTime.split(":")[0];
                          const slotPeriod = slot.includes("AM") ? "AM" : "PM";
                          const aptPeriod = apt.appointmentTime.includes("AM") ? "AM" : "PM";
                          return slotHour === aptHour && slotPeriod === aptPeriod;
                        });

                        return (
                          <div key={slot} className="flex flex-col sm:flex-row sm:items-start gap-2.5">
                            <div className="sm:w-20 shrink-0 sm:pt-2">
                              <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-100 text-zinc-700 text-xs font-bold border border-slate-200">
                                {slot}
                              </span>
                            </div>
                            <div className="flex-1">
                              {slotAppointments.length > 0 ? (
                                <div className="space-y-2">
                                  {slotAppointments.map((apt) => (
                                    <AppointmentCard
                                      key={apt.id}
                                      appointment={apt}
                                      onMarkComplete={handleMarkComplete}
                                      onViewDetails={handleViewDetails}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="border border-dashed border-slate-200 rounded-lg p-2 text-center bg-slate-50/30">
                                  <span className="text-[11px] text-zinc-400">Available</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <UpcomingList
                  title="Upcoming Patients Queue"
                  appointments={allUpcomingAppointments}
                  onViewDetails={handleViewDetails}
                  onMarkComplete={handleMarkComplete}
                />
                <UpcomingList
                  title="Consultations Completed"
                  appointments={completedAppointments}
                  onViewDetails={handleViewDetails}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DoctorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-zinc-500">
          <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
          <p className="text-xs font-medium">Loading Doctor Portal...</p>
        </div>
      }
    >
      <DoctorPortalContent />
    </Suspense>
  );
}
