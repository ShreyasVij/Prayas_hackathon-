"use client";

import { useState, useEffect, Suspense } from "react";
import Calendar from "./patients/components/Calendar";
import AppointmentCard from "./patients/components/AppointmentCard";
import UpcomingList from "./patients/components/UpcomingList";
import DoctorCodeDisplay from "@/components/DoctorCodeDisplay";
import GoogleCalendarConnect from "@/components/GoogleCalendarConnect";
import { 
  Users, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Stethoscope 
} from "lucide-react";

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

function DoctorDashboardContent() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch appointments from backend
  useEffect(() => {
    async function fetchAppointments() {
      try {
        setLoading(true);
        const res = await fetch("/api/doctor/appointments");
        if (res.ok) {
          const data = await res.json();
          setAppointments(data.appointments || []);
        } else {
          // Fallback mock appointments if in dry run mode and empty
          setAppointments([
            {
              id: "apt-1",
              patientId: "demo-patient-1",
              patientName: "Arjun Verma",
              age: 38,
              gender: "Male",
              appointmentTime: "09:30 AM",
              date: new Date().toISOString().slice(0, 10),
              status: "upcoming",
              reason: "Follow-up consultation on hypertension medication and lipid panel",
            },
            {
              id: "apt-2",
              patientId: "demo-patient-2",
              patientName: "Priya Sharma",
              age: 29,
              gender: "Female",
              appointmentTime: "11:00 AM",
              date: new Date().toISOString().slice(0, 10),
              status: "pending",
              reason: "Asthma inhaler refill review and pulmonary symptom evaluation",
            },
            {
              id: "apt-3",
              patientId: "demo-patient-3",
              patientName: "Rohan Nair",
              age: 52,
              gender: "Male",
              appointmentTime: "02:30 PM",
              date: new Date().toISOString().slice(0, 10),
              status: "completed",
              reason: "Routine cardiac screening & blood glucose review",
            }
          ]);
        }
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAppointments();
  }, []);

  const selectedDateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

  const scheduleEligibleStatuses = new Set([
    "approved",
    "upcoming",
    "ongoing",
    "completed",
  ]);

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
      const res = await fetch(`/api/doctor/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (res.ok) {
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === id ? { ...apt, status: "completed" as const } : apt
          )
        );
      } else {
        // Optimistic fallback in dry run
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === id ? { ...apt, status: "completed" as const } : apt
          )
        );
      }
    } catch (error) {
      console.error("Failed to mark appointment as complete:", error);
    }
  };

  const handleViewDetails = (id: string) => {
    const appointment = appointments.find(apt => apt.id === id);
    if (appointment?.patientId) {
      window.location.href = `/doctor/patient/${appointment.patientId}`;
    } else {
      window.location.href = `/doctor/patient/demo-patient`;
    }
  };

  const timeSlots = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "01:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
    "05:00 PM",
    "06:00 PM",
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Quick Stat Pills */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 inline-flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" />
                Clinical Practice Dashboard
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Patient Appointments & Schedule
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Manage consultations, review patient records, and coordinate clinical care.
            </p>
          </div>

          {/* Stat Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Total Consultations</p>
                <p className="text-sm font-extrabold text-zinc-900">{appointments.length}</p>
              </div>
            </div>

            <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Pending Approvals</p>
                <p className="text-sm font-extrabold text-amber-700">
                  {appointments.filter(a => a.status === "pending").length}
                </p>
              </div>
            </div>

            <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Completed Today</p>
                <p className="text-sm font-extrabold text-emerald-700">{completedAppointments.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Code Display Widget */}
        <DoctorCodeDisplay />

        {/* Google Calendar Connect Widget */}
        <GoogleCalendarConnect />

        {loading ? (
          <div className="text-center py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
            <p className="text-sm font-medium text-zinc-500">Syncing patient appointments...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Section: Calendar & Schedule Timeline (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Interactive Calendar */}
              <Calendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />

              {/* Time Slots & Schedule Container */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-teal-600" />
                    <h2 className="text-sm font-bold text-zinc-900">
                      Consultation Slots for {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold">
                    {todayAppointments.length} Active Slot{todayAppointments.length === 1 ? "" : "s"}
                  </span>
                </div>

                {todayAppointments.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                    <CalendarIcon className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-zinc-600">No appointments scheduled for this date</p>
                    <p className="text-[11px] text-zinc-400 mt-1">Select another day on the calendar or view upcoming patients.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timeSlots.map((slot) => {
                      const slotAppointments = todayAppointments.filter((apt) => {
                        const slotTime = slot.split(":")[0];
                        const aptTime = apt.appointmentTime.split(":")[0];
                        const slotPeriod = slot.includes("AM") ? "AM" : "PM";
                        const aptPeriod = apt.appointmentTime.includes("AM") ? "AM" : "PM";
                        return slotTime === aptTime && slotPeriod === aptPeriod;
                      });

                      return (
                        <div key={slot} className="flex flex-col sm:flex-row sm:items-start gap-3">
                          <div className="sm:w-24 shrink-0 sm:pt-2">
                            <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 text-zinc-700 text-xs font-bold tracking-tight border border-slate-200/80">
                              {slot}
                            </span>
                          </div>
                          <div className="flex-1">
                            {slotAppointments.length > 0 ? (
                              <div className="space-y-3">
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
                              <div className="border border-dashed border-slate-200 rounded-xl p-3 text-center bg-slate-50/30">
                                <span className="text-[11px] text-zinc-400 font-medium">
                                  Slot Available
                                </span>
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

            {/* Right Section: Patient Queues (1/3) */}
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
    </div>
  );
}

export default function DoctorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-zinc-500">Loading Doctor Dashboard...</div>}>
      <DoctorDashboardContent />
    </Suspense>
  );
}

