"use client";

import { useState } from "react";
import { Appointment } from "../data";
import { Clock, User2, Check, X, ArrowRight, CheckCircle2 } from "lucide-react";

interface UpcomingListProps {
  title: string;
  appointments: Appointment[];
  onViewDetails?: (id: string) => void;
  onMarkComplete?: (id: string) => void;
}

export default function UpcomingList({ title, appointments, onViewDetails, onMarkComplete }: UpcomingListProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [localAppointments, setLocalAppointments] = useState(appointments);

  const statusStyles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    upcoming: "bg-teal-50 text-teal-700 border-teal-200",
    ongoing: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-slate-100 text-zinc-600 border-slate-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const handleStatusUpdate = async (appointmentId: string, status: "approved" | "rejected") => {
    setLoadingStates((prev) => ({ ...prev, [appointmentId]: true }));

    try {
      const response = await fetch("/api/appointments/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, status }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to update appointment status");
        return;
      }

      setLocalAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: status as any } : apt
        )
      );

      const message = status === "approved" 
        ? "Appointment approved. Patient has been notified."
        : "Appointment rejected. Patient has been notified.";
      
      alert(message);

    } catch (error) {
      console.error("Failed to update appointment:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  // Sync if prop changes
  if (appointments.length !== localAppointments.length) {
    setLocalAppointments(appointments);
  }

  if (localAppointments.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-zinc-500 text-[11px] font-semibold">
            0
          </span>
        </div>
        <p className="text-xs text-zinc-400 text-center py-6">No records in this queue</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[11px] font-bold">
          {localAppointments.length}
        </span>
      </div>

      <div className="space-y-3">
        {localAppointments.map((appointment) => {
          const isLoading = loadingStates[appointment.id];
          const isPending = appointment.status === "pending";
          const isApproved = appointment.status === "approved";

          return (
            <div
              key={appointment.id}
              className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/70 hover:border-teal-200 hover:bg-slate-50 transition-all space-y-2.5"
            >
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center flex-shrink-0 text-teal-700">
                  <User2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-zinc-900 truncate">
                    {appointment.patientName}
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    {appointment.age && appointment.age > 0 ? `${appointment.age} yrs` : "Age N/A"} &bull; {appointment.gender || "N/A"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                  <Clock className="h-3 w-3 text-teal-600" />
                  <span>{appointment.appointmentTime}</span>
                </div>
                <span
                  className={`
                    px-2 py-0.5 rounded-full text-[10px] font-semibold border
                    ${statusStyles[appointment.status] || "bg-slate-100 text-zinc-600 border-slate-200"}
                  `}
                >
                  {isPending && "Pending"}
                  {isApproved && "Approved"}
                  {appointment.status === "rejected" && "Rejected"}
                  {appointment.status === "upcoming" && "Upcoming"}
                  {appointment.status === "ongoing" && "Ongoing"}
                  {appointment.status === "completed" && "Completed"}
                </span>
              </div>

              {/* Action Buttons for Pending Appointments */}
              {isPending && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleStatusUpdate(appointment.id, "approved")}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-all shadow-xs"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{isLoading ? "..." : "Approve"}</span>
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(appointment.id, "rejected")}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 disabled:opacity-50 transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>{isLoading ? "..." : "Deny"}</span>
                  </button>
                </div>
              )}
              
              {/* Action Buttons for Approved / Ongoing Appointments */}
              {(isApproved || appointment.status === "upcoming" || appointment.status === "ongoing") && (
                <div className="flex gap-2 pt-1">
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(appointment.id)}
                      className="flex-1 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-slate-200 rounded-xl hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-all flex items-center justify-center gap-1"
                    >
                      <span>Details</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  {onMarkComplete && appointment.status !== "completed" && (
                    <button
                      onClick={() => onMarkComplete(appointment.id)}
                      className="py-1.5 px-3 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Done</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

